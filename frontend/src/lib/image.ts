// Shrinks a photo to a small WebP (under about 100 KB) before it is uploaded.
export async function compressPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 600 / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  let quality = 0.82;
  let blob = await toBlob(canvas, quality);
  while (blob.size > 100_000 && quality > 0.4) {
    quality -= 0.1;
    blob = await toBlob(canvas, quality);
  }
  return blob;
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Photo could not be read."))), "image/webp", quality),
  );
}
