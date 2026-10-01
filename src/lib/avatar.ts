import { createAvatar } from '@dicebear/core';
import { personas } from '@dicebear/collection';

const cache = new Map<string, string>();

/** Friendly illustrated avatar generated locally with DiceBear "Personas". */
export function avatarUri(seed: string): string {
  let uri = cache.get(seed);
  if (!uri) {
    uri = createAvatar(personas, {
      seed,
      backgroundColor: ['c8f5dd', 'd8f3e8', 'fde8c8', 'dbeafe', 'fce7f3'],
      backgroundType: ['solid'],
    }).toDataUri();
    cache.set(seed, uri);
  }
  return uri;
}
