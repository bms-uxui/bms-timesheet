// Parser for BMS-format Thai monthly timesheet PDFs.
// Pure functions (classifyStatus, classifyRows) are testable in isolation.
// parseTimesheet/extractRows lazy-load pdfjs so unit tests don't need it.

// The BMS timesheet PDFs use a custom font with no ToUnicode map. Every Latin
// glyph is offset −31 from its ASCII codepoint, and Thai glyphs come through
// as Latin-1 mojibake. We restore Latin via decodeAscii(); for Thai we match
// the mojibake substrings directly.
const STATUS_PATTERNS = {
  normal:   ['เวลาทำงานปกติ', 'đüúćìĈÜćîðÖêĉ'],
  absent:   ['ขาดงาน', '×ćéÜćî'],
  late:     ['เข้าทำงานสาย', 'đ×Ěć'],
  offsite:  ['ทำงานนอก Office', 'นอก Office', 'Office'],
  holiday:  ['วันหยุด', 'üĆîĀ÷čé'],
  vacation: ['ลาพักร้อน', 'úćóĆÖøĚĂî'],
  personal: ['ลากิจ', 'úćÖĉÝ'],
  sick:     ['ลาป่วย', 'úćðęü÷'],
};

export function decodeAscii(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out += (c >= 0x01 && c <= 0x5F) ? String.fromCharCode(c + 31) : s[i];
  }
  return out;
}

export function classifyStatus(text) {
  if (!text) return 'unknown';
  for (const [key, patterns] of Object.entries(STATUS_PATTERNS)) {
    if (patterns.some((p) => text.includes(p))) return key;
  }
  return 'unknown';
}

export function classifyRows(rows) {
  return rows.map((r) => {
    const status = classifyStatus(r.statusText);
    const hasIn = !!r.checkIn;
    const hasOut = !!r.checkOut;
    const sameTime = hasIn && hasOut && r.checkIn === r.checkOut;
    let needsJustification = false;
    let reason = null;
    let needsIn = false, needsOut = false;
    if (status === 'absent') {
      needsJustification = true;
      reason = 'absent';
      needsIn = true;
      needsOut = true;
    } else if (status === 'late' || sameTime) {
      // Single-scan rows: HR only recorded one timestamp, so the other is what
      // staff need to justify. If checkIn is present and equals checkOut, the
      // missing one is most likely the morning (late arrival pattern).
      needsJustification = true;
      reason = 'single-scan';
      if (sameTime) needsIn = true;
      else { needsIn = !hasIn; needsOut = !hasOut; }
    } else if (status === 'offsite') {
      needsJustification = true;
      reason = 'offsite';
      needsIn = !hasIn;
      needsOut = !hasOut;
      if (!needsIn && !needsOut) needsIn = true; // single proof photo
    } else if (!hasIn && !hasOut && status === 'unknown') {
      needsJustification = true;
      reason = 'missing';
      needsIn = true;
      needsOut = true;
    } else if (needsJustification === false && (!hasIn || !hasOut) && status !== 'holiday' && status !== 'vacation' && status !== 'personal' && status !== 'sick') {
      // Catch-all: a working day where one timestamp is missing.
      needsJustification = true;
      reason = 'partial';
      needsIn = !hasIn;
      needsOut = !hasOut;
    }
    return { ...r, status, needsJustification, justificationReason: reason, needsIn, needsOut };
  });
}

let pdfjsCache = null;
export async function getPdfjs() {
  if (pdfjsCache) return pdfjsCache;
  // The legacy build targets older browsers (no Promise.withResolvers etc.)
  // — required for iOS Safari < 17.4.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const worker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  pdfjsCache = pdfjs;
  return pdfjs;
}

const DATE_RE = /(\d{2})\/(\d{2})\/(\d{4})/;
const TIME_RE_G = /(\d{2}):(\d{2}):(\d{2})/g;

// pdf.js often splits a row into many text items (sometimes per character),
// so we group items by Y position, join their strings, then regex against
// the joined row text. This is robust to fragmented dates like "01" "/" "04".
export async function extractRows(pdf) {
  const rowsOut = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = content.items
      .map((i) => ({ str: i.str || '', x: i.transform[4], y: i.transform[5] }))
      .filter((i) => i.str.trim());

    // Group by integer Y, then merge near-identical rows (Y diff ≤ 2).
    const buckets = new Map();
    for (const i of items) {
      const k = Math.round(i.y);
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(i);
    }
    const ordered = [...buckets.keys()].sort((a, b) => b - a);
    const merged = [];
    for (const k of ordered) {
      const last = merged[merged.length - 1];
      if (last && Math.abs(last.y - k) <= 2) {
        last.items.push(...buckets.get(k));
      } else {
        merged.push({ y: k, items: buckets.get(k) });
      }
    }

    for (const row of merged) {
      row.items.sort((a, b) => a.x - b.x);
      const text = row.items.map((i) => decodeAscii(i.str)).join(' ');
      const dm = text.match(DATE_RE);
      if (!dm) continue;
      const year = +dm[3] - 543; // Buddhist Era → CE
      const date = new Date(year, +dm[2] - 1, +dm[1]);
      const times = [...text.matchAll(TIME_RE_G)].map((m) => m[0]);
      const statusText = text
        .replace(new RegExp(DATE_RE.source, 'g'), '')
        .replace(TIME_RE_G, '')
        .replace(/[-−]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      rowsOut.push({
        date,
        dateKey: dm[0],
        checkIn: times[0] || null,
        checkOut: times[1] || null,
        statusText,
      });
    }
  }
  rowsOut.sort((a, b) => a.date - b.date);
  return rowsOut;
}

export async function dumpRawText(pdf) {
  const pages = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const lines = [];
    let lastY = null;
    let buf = [];
    for (const i of content.items) {
      const y = Math.round(i.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        if (buf.length) lines.push(buf.join(''));
        buf = [];
      }
      buf.push(decodeAscii(i.str));
      lastY = y;
    }
    if (buf.length) lines.push(buf.join(''));
    pages.push(lines.join('\n'));
  }
  return pages.join('\n--- page break ---\n');
}

export async function parseTimesheet(file) {
  const pdfjs = await getPdfjs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const rawRows = await extractRows(pdf);
  const entries = classifyRows(rawRows);
  const missingDays = entries.filter((e) => e.needsJustification);
  const period = entries.length
    ? { start: entries[0].date, end: entries[entries.length - 1].date }
    : null;
  let rawText = null;
  if (entries.length === 0) rawText = await dumpRawText(pdf);
  return { entries, missingDays, period, rawText };
}
