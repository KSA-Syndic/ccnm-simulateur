import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export interface ComparePngResult {
  width: number;
  height: number;
  diffPixels: number;
  totalPixels: number;
  ratio: number;
}

/**
 * Compare deux captures PNG **mêmes dimensions** (ex. même `clip` Playwright).
 * `threshold` pixelmatch : 0–1 (plus haut = moins sensible aux antialiasing).
 */
export function comparePngBuffers(
  bufA: Buffer,
  bufB: Buffer,
  options?: { threshold?: number },
): ComparePngResult {
  const imgA = PNG.sync.read(bufA);
  const imgB = PNG.sync.read(bufB);
  if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
    throw new Error(
      `Dimensions PNG différentes: ${imgA.width}×${imgA.height} vs ${imgB.width}×${imgB.height}`,
    );
  }
  const { width, height } = imgA;
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(imgA.data, imgB.data, diff.data, width, height, {
    threshold: options?.threshold ?? 0.22,
    includeAA: false,
  });
  const totalPixels = width * height;
  return { width, height, diffPixels, totalPixels, ratio: diffPixels / totalPixels };
}
