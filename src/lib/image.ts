export async function compressImage(file: Blob, maxWidth = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  return out && out.size < file.size ? out : file;
}

export async function uploadTradeImage(id: number, file: Blob) {
  const body = new FormData();
  const small = await compressImage(file);
  body.append("image", small, `trade-${id}.${small.type.split("/")[1] || "jpg"}`);
  const res = await fetch(`/api/trades/${id}/image`, { method: "POST", body });
  if (!res.ok) throw new Error((await res.json()).error);
}
