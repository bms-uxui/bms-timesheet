import * as MediaLibrary from 'expo-media-library';

export async function ensurePermission() {
  const current = await MediaLibrary.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await MediaLibrary.requestPermissionsAsync();
  return requested.granted;
}

// Returns photo metadata for the given date range, sorted by creation time.
// `from` and `to` are JS Date objects (inclusive start, exclusive end).
export async function scanGallery({ from, to }) {
  const granted = await ensurePermission();
  if (!granted) throw new Error('ไม่ได้รับอนุญาตให้เข้าถึงคลังรูปภาพ');

  const fromMs = from instanceof Date ? from.getTime() : from;
  const toMs = to instanceof Date ? to.getTime() : to;

  // expo-media-library paginates; pull pages until we cross the from-date
  // (sorted desc by creationTime for predictable pagination).
  const photos = [];
  let after;
  while (true) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: 'photo',
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      first: 200,
      ...(after ? { after } : {}),
    });
    let stop = false;
    for (const a of page.assets) {
      const t = a.creationTime;
      if (t >= toMs) continue;
      if (t < fromMs) { stop = true; break; }
      photos.push(toPhoto(a));
    }
    if (stop || !page.hasNextPage || !page.endCursor) break;
    after = page.endCursor;
  }
  return photos;
}

function toPhoto(asset) {
  return {
    id: asset.id,
    name: asset.filename || 'photo',
    uri: asset.uri,
    takenAt: new Date(asset.creationTime),
    latitude: asset.location?.latitude ?? null,
    longitude: asset.location?.longitude ?? null,
    width: asset.width,
    height: asset.height,
  };
}
