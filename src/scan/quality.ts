// Pure image-quality checks used by the live camera guide (testable without a DOM).
export interface Quality { brightness: number; glare: number; sharpness: number; warnings: string[] }

/** `rgba` is ImageData-style RGBA bytes for a w×h frame. */
export function assessQuality(rgba: ArrayLike<number>, w: number, h: number): Quality {
  const n = w * h;
  const grey = new Float32Array(n);
  let sum = 0, hot = 0;
  for (let i = 0; i < n; i++) {
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    const v = 0.299 * r + 0.587 * g + 0.114 * b;
    grey[i] = v; sum += v;
    if (r > 248 && g > 248 && b > 248) hot++;
  }
  const brightness = sum / n;
  const glare = hot / n;
  // Variance of the Laplacian: low = blurry.
  let lsum = 0, lsq = 0, cnt = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const l = grey[i - 1] + grey[i + 1] + grey[i - w] + grey[i + w] - 4 * grey[i];
    lsum += l; lsq += l * l; cnt++;
  }
  const mean = cnt ? lsum / cnt : 0;
  const sharpness = cnt ? lsq / cnt - mean * mean : 0;
  const warnings: string[] = [];
  if (brightness < 60) warnings.push('Too dark – add light');
  if (glare > 0.03) warnings.push('Glare – tilt the phone or move the light');
  if (sharpness < 60) warnings.push('Blurry – hold steady / tap to focus');
  return { brightness, glare, sharpness, warnings };
}
