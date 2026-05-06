// Builds a styled HTML document of the justification, then asks expo-print
// to render it to a PDF file. The HTML uses Sarabun (web font) and embeds
// each photo as a base64 data URL so the print engine can render it.

import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { REASON_LABEL_MAP, STATUS_BADGES } from '../core/reasons';

function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtDate(d) {
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtMonthYear(d) {
  return d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
}

async function imageToDataURL(uri) {
  if (!uri) return null;
  try {
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    return `data:image/jpeg;base64,${b64}`;
  } catch { return null; }
}

export async function buildPdfHtml(state) {
  const { userName, timesheet, missingDays, resolutions } = state;
  const periodTitle = timesheet?.period?.start ? fmtMonthYear(timesheet.period.start) : '';

  const dayCards = await Promise.all(
    missingDays.map(async (day) => {
      const k = day.date.toISOString().slice(0, 10);
      const res = resolutions[k] || {};
      const inUri = day.needsIn ? await imageToDataURL(res.photoIn?.uri) : null;
      const outUri = day.needsOut ? await imageToDataURL(res.photoOut?.uri) : null;
      const badge = STATUS_BADGES[day.justificationReason] || day.justificationReason || '';
      const reason = REASON_LABEL_MAP[res.reason] || res.reason || '—';
      const cells = [];
      if (day.needsIn) {
        cells.push(`
          <div class="slot">
            <div class="slot-label">รูปเข้างาน</div>
            ${inUri ? `<img src="${inUri}" alt="">` : '<div class="no-photo">(ไม่มีรูป)</div>'}
          </div>`);
      }
      if (day.needsOut) {
        cells.push(`
          <div class="slot">
            <div class="slot-label">รูปเลิกงาน</div>
            ${outUri ? `<img src="${outUri}" alt="">` : '<div class="no-photo">(ไม่มีรูป)</div>'}
          </div>`);
      }
      return `
        <section class="day">
          <header>
            <h2>${escapeHTML(fmtDate(day.date))}</h2>
            <span class="badge">${escapeHTML(badge)}</span>
          </header>
          <div class="grid-2">
            <div class="block">
              <div class="block-label">บันทึกของ HR</div>
              <div class="block-value">เข้า: ${escapeHTML(day.checkIn || '—')}    ออก: ${escapeHTML(day.checkOut || '—')}</div>
            </div>
            <div class="block">
              <div class="block-label">รายงานของพนักงาน</div>
              <div class="block-value">เข้า: ${escapeHTML(res.actualTimeIn || '—')}    ออก: ${escapeHTML(res.actualTimeOut || '—')}</div>
            </div>
          </div>
          <div class="block reason">
            <div class="block-label">เหตุผล</div>
            <div class="block-value">${escapeHTML(reason)}</div>
          </div>
          ${cells.length ? `<div class="slots">${cells.join('')}</div>` : ''}
          ${res.remark ? `<div class="remark">หมายเหตุ: ${escapeHTML(res.remark)}</div>` : ''}
        </section>`;
    })
  );

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>รายงานสรุปการเข้า-ออกงาน</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Sarabun', -apple-system, sans-serif; margin: 0; color: #0f172a; font-size: 11pt; }
    .header { background: #0ea5e9; color: white; padding: 18px 24px; }
    .header h1 { margin: 0 0 6px; font-size: 18pt; font-weight: 700; }
    .header .sub { font-size: 12pt; }
    .header .meta { font-size: 9.5pt; margin-top: 4px; opacity: .9; }
    main { padding: 16px 24px; }
    .day { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; page-break-inside: avoid; }
    .day header { display: flex; align-items: center; gap: 10px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; margin-bottom: 8px; }
    .day h2 { margin: 0; font-size: 13pt; font-weight: 700; }
    .badge { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 999px; font-size: 9pt; font-weight: 600; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 6px; }
    .block-label { font-size: 8.5pt; color: #64748b; }
    .block-value { font-size: 10pt; font-weight: 700; color: #0f172a; }
    .reason .block-value { font-weight: 400; }
    .slots { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-top: 10px; }
    .slot { border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; }
    .slot-label { font-size: 8.5pt; font-weight: 700; color: #475569; margin-bottom: 6px; }
    .slot img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 4px; display: block; }
    .no-photo { aspect-ratio: 1; background: #f1f5f9; color: #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 9pt; border-radius: 4px; }
    .remark { margin-top: 8px; font-size: 9.5pt; color: #475569; }
    footer { margin-top: 16px; text-align: center; font-size: 8pt; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="header">
    <h1>รายงานสรุปการเข้า-ออกงาน</h1>
    <div class="sub">ประจำเดือน ${escapeHTML(periodTitle)}</div>
    <div class="meta">${userName ? `พนักงาน: ${escapeHTML(userName)} · ` : ''}มีวันที่ต้องชี้แจง ${missingDays.length} วัน</div>
  </div>
  <main>
    ${dayCards.join('')}
  </main>
  <footer>สร้างจาก BMS Timesheet App</footer>
</body>
</html>`;
}

export function buildFilename(state) {
  const start = state.timesheet?.period?.start;
  const month = start ? start.toLocaleDateString('th-TH', { month: 'long' }) : '';
  const year = start ? start.toLocaleDateString('th-TH', { year: 'numeric' }) : '';
  const name = (state.userName || 'unnamed').replace(/[\\/:*?"<>|]/g, '').trim() || 'unnamed';
  return [name, 'รายงานการเข้าออกงาน', month, year].filter(Boolean).join('-') + '.pdf';
}

export async function generatePDF(state) {
  const html = await buildPdfHtml(state);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  // Move to a stable, named file so sharing shows the right filename.
  const filename = buildFilename(state);
  const target = `${FileSystem.documentDirectory}${filename}`;
  try { await FileSystem.deleteAsync(target, { idempotent: true }); } catch {}
  await FileSystem.copyAsync({ from: uri, to: target });
  return { uri: target, filename };
}
