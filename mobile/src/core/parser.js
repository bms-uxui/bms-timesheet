// Status patterns for the BMS Thai timesheet PDF. Includes the encoded
// (mojibake) Latin-1 forms because the PDF's custom font has no ToUnicode
// map — these strings are what pdf.js returns when extracting text.

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
      needsJustification = true; reason = 'absent';
      needsIn = true; needsOut = true;
    } else if (status === 'late' || sameTime) {
      needsJustification = true; reason = 'single-scan';
      if (sameTime) needsIn = true;
      else { needsIn = !hasIn; needsOut = !hasOut; }
    } else if (status === 'offsite') {
      needsJustification = true; reason = 'offsite';
      needsIn = !hasIn; needsOut = !hasOut;
      if (!needsIn && !needsOut) needsIn = true;
    } else if (!hasIn && !hasOut && status === 'unknown') {
      needsJustification = true; reason = 'missing';
      needsIn = true; needsOut = true;
    } else if ((!hasIn || !hasOut) && status !== 'holiday' && status !== 'vacation' && status !== 'personal' && status !== 'sick') {
      needsJustification = true; reason = 'partial';
      needsIn = !hasIn; needsOut = !hasOut;
    }
    return { ...r, status, needsJustification, justificationReason: reason, needsIn, needsOut };
  });
}

// Restore Latin chars from the BMS custom-font shifted encoding.
export function decodeAscii(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out += (c >= 0x01 && c <= 0x5F) ? String.fromCharCode(c + 31) : s[i];
  }
  return out;
}

export function buildTimesheetFromRows(rawRows) {
  const entries = classifyRows(rawRows).map((r) => ({
    ...r,
    date: typeof r.date === 'string' ? new Date(r.date) : r.date,
  }));
  entries.sort((a, b) => a.date - b.date);
  const missingDays = entries.filter((e) => e.needsJustification);
  const period = entries.length
    ? { start: entries[0].date, end: entries[entries.length - 1].date }
    : null;
  return { entries, missingDays, period };
}
