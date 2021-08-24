import { Root, Content, Image } from 'mdast';
import { generateAvater } from './lib/generate';
import { decodeOptions } from './lib/options';
import { selectTarget } from './lib/select';
import {
  getFileNameFromURL,
  stripMakerProtocol,
  updateImageUrl
} from './lib/util';

const AvaterSourcKindValues = [
  '',
  'image-alt',
  'image-scheme',
  'image-file'
] as const;
export type AvaterSourcKind = typeof AvaterSourcKindValues[number];
export type MdAvaterOptions = {
  avater?: {
    position?: 'center' | 'right-bottom';
    fillstyle?: string;
    fillshape?: 'rect' | 'circle';
    margin?: number;
    padding?: number;
    fit?: number;
    query?: string;
  };
  format?: {
    type?: 'png' | 'jpeg';
    quality?: number;
  };
};
export const mdAvaterOptionsDefaults: Required<MdAvaterOptions> & {
  avater: Required<MdAvaterOptions['avater']>;
} = {
  avater: {
    position: 'center',
    fillshape: 'circle',
    fillstyle: '#FFFFFFFF',
    margin: 12,
    padding: 4,
    fit: 25,
    query: ''
  },
  format: {
    type: 'png',
    quality: 0.92
  }
};

export async function byImageAlt(tree: Content[], options?: MdAvaterOptions) {
  const image = tree[0] as Image;
  const url: string = image.url || '';
  const alt: string = stripMakerProtocol(image.alt || '');
  // as scheme
  const base = tree.length > 1 ? (tree[1] as Image).url || '' : '';
  const d = await generateAvater(
    url,
    base,
    decodeOptions(options || { avater: {} }, [alt])
  );
  if (base) {
    updateImageUrl(tree[1], d);
  } else {
    image.alt = alt;
    image.url = d;
  }
}

export async function byImageScheme(
  tree: Content[],
  options?: MdAvaterOptions
) {
  const image = tree[0] as Image;
  const url: string = image.url || '';
  const alt: string = image.alt || '';
  // as scheme
  const text = stripMakerProtocol(url);
  const base = tree.length > 1 ? (tree[1] as Image).url || '' : '';
  const d = await generateAvater(
    text,
    base,
    decodeOptions(options || { avater: {} }, [alt])
  );
  if (base) {
    updateImageUrl(tree[1], d);
  } else {
    image.url = d;
  }
}

export async function byImageFile(tree: Content[], options?: MdAvaterOptions) {
  const image = tree[0] as Image;
  const url: string = image.url || '';
  const alt: string = image.alt || '';
  const fileName = getFileNameFromURL(image.url);
  const base = tree.length > 1 ? (tree[1] as Image).url || '' : '';
  const d = await generateAvater(
    url,
    base,
    decodeOptions(options || { avater: {} }, [fileName, alt])
  );
  if (base) {
    updateImageUrl(tree[1], d);
  } else {
    image.url = d;
  }
}
export function addRemoveIdxs(r: number[], a: number[]) {
  a.forEach((i) => {
    if (!r.includes(i)) {
      r.push(i);
    }
  });
}

export async function toImageDataURL(
  tree: Root,
  options: MdAvaterOptions = { avater: {}, format: {} }
): Promise<Root> {
  if (tree.type === 'root') {
    const l = tree.children.length;
    for (let i = 0; i < l; i++) {
      const c = tree.children[i];
      if (c.type === 'paragraph') {
        const removeIdxs: number[] = [];
        const ll = c.children.length;
        for (let ii = 0; ii < ll; ii = ii + 1) {
          //const cc: Content[] = [c.children[ii]];
          const targetInfo = selectTarget(c.children, ii);

          if (targetInfo.kind === 'image-alt') {
            await byImageAlt(targetInfo.avaterContent, options);
            addRemoveIdxs(removeIdxs, targetInfo.removeIdxs);
          } else if (targetInfo.kind === 'image-scheme') {
            await byImageScheme(targetInfo.avaterContent, options);
            addRemoveIdxs(removeIdxs, targetInfo.removeIdxs);
          } else if (targetInfo.kind === 'image-file') {
            await byImageFile(targetInfo.avaterContent, options);
            addRemoveIdxs(removeIdxs, targetInfo.removeIdxs);
          }
        }
        if (removeIdxs.length > 0) {
          c.children = c.children.filter((t, i) => !removeIdxs.includes(i));
        }
      }
    }
  }
  return tree;
}
