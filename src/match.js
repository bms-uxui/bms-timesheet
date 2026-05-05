export function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
}

// Classify a photo's capture time as clock-in (≤ 08:30) or clock-out (> 17:30).
// Outside those windows we don't assume it's a scanner photo.
export function classifyPhotoType(date, opts = {}) {
  const inCutoff = opts.clockInBefore ?? 8.5;
  const outCutoff = opts.clockOutAfter ?? 17.5;
  const h = date.getHours() + date.getMinutes() / 60;
  if (h <= inCutoff) return 'clock-in';
  if (h > outCutoff) return 'clock-out';
  return 'unknown';
}

export function fmtTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// For each missing day, find the best clock-in photo (taken ≤ 08:30) and the
// best clock-out photo (taken > 17:30). A day can have one, both, or neither.
// If neither window matches but a photo exists on that day, fall back to it
// as the clock-in slot so the user can review it manually.
export function matchPhotos(missingDays, photos) {
  const used = new Set();
  const matches = {};
  for (const day of missingDays) {
    const k = day.date.toISOString().slice(0, 10);
    const dayPhotos = photos.filter((p) => sameDay(p.takenAt, day.date) && !used.has(p.id));
    const clockIn = dayPhotos
      .filter((p) => classifyPhotoType(p.takenAt) === 'clock-in')
      .sort((a, b) => a.takenAt - b.takenAt)[0];
    const clockOut = dayPhotos
      .filter((p) => classifyPhotoType(p.takenAt) === 'clock-out')
      .sort((a, b) => b.takenAt - a.takenAt)[0];
    const m = {};
    if (clockIn) { m.photoIn = clockIn; used.add(clockIn.id); }
    if (clockOut) { m.photoOut = clockOut; used.add(clockOut.id); }
    if (!clockIn && !clockOut && dayPhotos.length > 0) {
      m.photoIn = dayPhotos[0];
      used.add(dayPhotos[0].id);
    }
    if (m.photoIn || m.photoOut) matches[k] = m;
  }
  return matches;
}
