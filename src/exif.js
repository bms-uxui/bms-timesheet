import exifr from 'exifr';

export async function readPhoto(file) {
  let exif = null;
  try { exif = await exifr.parse(file, { gps: true }); } catch {}
  const taken = exif?.DateTimeOriginal || exif?.CreateDate || new Date(file.lastModified);
  return {
    id: `${file.name}-${file.lastModified}-${file.size}`,
    file,
    name: file.name,
    url: URL.createObjectURL(file),
    takenAt: taken instanceof Date ? taken : new Date(taken),
    latitude: exif?.latitude ?? null,
    longitude: exif?.longitude ?? null,
    orientation: exif?.Orientation || 1,
    scannerScore: 0,
  };
}

export async function readPhotos(files, onProgress) {
  const out = [];
  for (let i = 0; i < files.length; i++) {
    out.push(await readPhoto(files[i]));
    onProgress?.(i + 1, files.length);
  }
  return out;
}
