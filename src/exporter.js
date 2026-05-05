import { jsPDF } from 'jspdf';
import sarabunRegularUrl from './assets/fonts/Sarabun-Regular.ttf?url';
import sarabunBoldUrl from './assets/fonts/Sarabun-Bold.ttf?url';

const REASON_LABELS = {
  'scanner-broken': 'เครื่องสแกนใบหน้าไม่ทำงาน',
  'offsite': 'ทำงานนอก Office / พบลูกค้า',
  'wfh': 'ทำงานที่บ้าน (ได้รับอนุมัติ)',
  'forgot': 'ลืมสแกน',
  'overtime': 'ทำงานล่วงเวลา / กลับดึก',
  'medical': 'ลาป่วย / ลากิจ',
  'other': 'อื่นๆ',
};

const STATUS_BADGES = {
  absent: 'ขาดงาน',
  'single-scan': 'สแกนไม่ครบ',
  offsite: 'ทำงานนอก Office',
  partial: 'ข้อมูลไม่ครบ',
  missing: 'ข้อมูลขาด',
};

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;
const PHOTO_W = 70;
const PHOTO_H = 70;
const FONT = 'Sarabun';

function fmtDate(d) {
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtDateTime(d) {
  const date = fmtDate(d);
  const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

let fontsCache = null;
async function loadFontBase64(url) {
  const buf = await fetch(url).then((r) => r.arrayBuffer());
  const bytes = new Uint8Array(buf);
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}
async function ensureFonts() {
  if (!fontsCache) {
    fontsCache = Promise.all([
      loadFontBase64(sarabunRegularUrl),
      loadFontBase64(sarabunBoldUrl),
    ]).then(([reg, bold]) => ({ reg, bold }));
  }
  return fontsCache;
}
async function registerFonts(doc) {
  const { reg, bold } = await ensureFonts();
  doc.addFileToVFS('Sarabun-Regular.ttf', reg);
  doc.addFont('Sarabun-Regular.ttf', FONT, 'normal');
  doc.addFileToVFS('Sarabun-Bold.ttf', bold);
  doc.addFont('Sarabun-Bold.ttf', FONT, 'bold');
  doc.setFont(FONT, 'normal');
}

async function orientedDataURL(file, orientation = 1, maxDim = 1200) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight, 1);
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const swap = orientation >= 5 && orientation <= 8;
    const canvas = document.createElement('canvas');
    canvas.width = swap ? h : w;
    canvas.height = swap ? w : h;
    const ctx = canvas.getContext('2d');
    switch (orientation) {
      case 2: ctx.transform(-1, 0, 0, 1, w, 0); break;
      case 3: ctx.transform(-1, 0, 0, -1, w, h); break;
      case 4: ctx.transform(1, 0, 0, -1, 0, h); break;
      case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
      case 6: ctx.transform(0, 1, -1, 0, h, 0); break;
      case 7: ctx.transform(0, -1, -1, 0, h, w); break;
      case 8: ctx.transform(0, -1, 1, 0, 0, w); break;
    }
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function setColor(doc, hex) {
  doc.setTextColor(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16));
}
function fillColor(doc, hex) {
  doc.setFillColor(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16));
}
function drawColor(doc, hex) {
  doc.setDrawColor(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16));
}

function header(doc, state) {
  fillColor(doc, '#0ea5e9');
  doc.rect(0, 0, PAGE_W, 30, 'F');
  setColor(doc, '#ffffff');
  doc.setFont(FONT, 'bold').setFontSize(16);
  doc.text('ใบชี้แจงเวลาทำงาน', MARGIN, 13);
  doc.setFont(FONT, 'normal').setFontSize(10);
  const period = state.timesheet?.period
    ? `${fmtDate(state.timesheet.period.start)}  —  ${fmtDate(state.timesheet.period.end)}`
    : '';
  doc.text(period, MARGIN, 20);
  doc.text(`มีวันที่ต้องชี้แจง ${state.missingDays.length} วัน`, MARGIN, 26);
  setColor(doc, '#000000');
}

function badge(doc, label, x, y) {
  doc.setFontSize(8).setFont(FONT, 'bold');
  const w = doc.getTextWidth(label) + 4;
  fillColor(doc, '#fee2e2');
  doc.roundedRect(x, y - 3.5, w, 5, 1, 1, 'F');
  setColor(doc, '#991b1b');
  doc.text(label, x + 2, y);
  setColor(doc, '#000000');
  doc.setFont(FONT, 'normal');
  return w;
}

function ensureSpace(doc, y, needed, state) {
  if (y + needed > PAGE_H - MARGIN) {
    doc.addPage();
    header(doc, state);
    return 36;
  }
  return y;
}

async function embedPhoto(doc, photo, label, x, y) {
  drawColor(doc, '#e2e8f0');
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, PHOTO_W, PHOTO_H + 14, 2, 2);
  fillColor(doc, '#f1f5f9');
  doc.roundedRect(x, y, PHOTO_W, 6, 2, 2, 'F');
  doc.rect(x, y + 4, PHOTO_W, 2, 'F');
  doc.setFontSize(8).setFont(FONT, 'bold');
  setColor(doc, '#475569');
  doc.text(label, x + 2, y + 4.2);
  setColor(doc, '#000000');
  doc.setFont(FONT, 'normal');
  if (photo) {
    try {
      const data = await orientedDataURL(photo.file, photo.orientation);
      doc.addImage(data, 'JPEG', x + 1, y + 7, PHOTO_W - 2, PHOTO_H);
    } catch {
      doc.setFontSize(8); setColor(doc, '#94a3b8');
      doc.text('(ไม่สามารถแสดงรูปได้)', x + 4, y + 30);
      setColor(doc, '#000000');
    }
  } else {
    doc.setFontSize(8); setColor(doc, '#94a3b8');
    doc.text('(ไม่มีรูป)', x + 4, y + 30);
    setColor(doc, '#000000');
  }
  doc.setFontSize(7); setColor(doc, '#64748b');
  if (photo) {
    doc.text(fmtDateTime(photo.takenAt), x + 2, y + PHOTO_H + 11);
  }
  setColor(doc, '#000000');
}

function footer(doc, page, totalPages) {
  doc.setFontSize(8); setColor(doc, '#94a3b8');
  doc.setFont(FONT, 'normal');
  doc.text(`หน้า ${page} / ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 6, { align: 'right' });
  doc.text('สร้างจาก BMS Timesheet App', MARGIN, PAGE_H - 6);
  setColor(doc, '#000000');
}

export async function exportPDF(state) {
  const doc = new jsPDF();
  await registerFonts(doc);
  header(doc, state);
  let y = 38;

  const PHOTO_BLOCK_H = PHOTO_H + 14; // photo + label band
  const HEADER_BLOCK_H = 36;          // date row + HR/staff comparison + reason
  const CARD_PAD = 6;                 // bottom padding inside card
  const CARD_GAP = 4;                 // space between cards

  for (const day of state.missingDays) {
    const key = day.date.toISOString().slice(0, 10);
    const res = state.resolutions[key] || {};
    const hasPhoto = res.photoIn || res.photoOut;

    // Pre-compute remark line count so card height fits exactly.
    doc.setFontSize(8).setFont(FONT, 'normal');
    const remarkLines = res.remark ? doc.splitTextToSize(`หมายเหตุ: ${res.remark}`, CONTENT_W - 8) : [];
    const remarkH = remarkLines.length * 4.5 + (remarkLines.length ? 4 : 0);
    const cardHeight = HEADER_BLOCK_H + (hasPhoto ? PHOTO_BLOCK_H + 4 : 0) + remarkH + CARD_PAD;

    y = ensureSpace(doc, y, cardHeight + CARD_GAP, state);

    drawColor(doc, '#e2e8f0');
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, CONTENT_W, cardHeight, 2, 2);

    doc.setFontSize(13).setFont(FONT, 'bold');
    setColor(doc, '#0f172a');
    doc.text(fmtDate(day.date), MARGIN + 4, y + 8);
    const badgeLabel = STATUS_BADGES[day.justificationReason] || day.justificationReason || '';
    if (badgeLabel) {
      const dateW = doc.getTextWidth(fmtDate(day.date));
      badge(doc, badgeLabel, MARGIN + 4 + dateW + 4, y + 7.5);
    }

    doc.setFontSize(8).setFont(FONT, 'normal');
    setColor(doc, '#64748b');
    doc.text('บันทึกของ HR', MARGIN + 4, y + 15);
    doc.text('รายงานของพนักงาน', MARGIN + 70, y + 15);
    setColor(doc, '#0f172a');
    doc.setFontSize(10).setFont(FONT, 'bold');
    doc.text(`เข้า: ${day.checkIn || '—'}    ออก: ${day.checkOut || '—'}`, MARGIN + 4, y + 21);
    doc.text(`เข้า: ${res.actualTimeIn || '—'}    ออก: ${res.actualTimeOut || '—'}`, MARGIN + 70, y + 21);
    doc.setFont(FONT, 'normal');

    setColor(doc, '#64748b');
    doc.setFontSize(8);
    doc.text('เหตุผล', MARGIN + 4, y + 27);
    setColor(doc, '#0f172a');
    doc.setFontSize(10);
    doc.text(REASON_LABELS[res.reason] || res.reason || '—', MARGIN + 4, y + 32);

    let curY = y + HEADER_BLOCK_H;

    if (hasPhoto) {
      const slotsX = MARGIN + 4;
      const gap = 6;
      const photosArr = [];
      if (day.needsIn) photosArr.push({ label: 'รูปเข้างาน', photo: res.photoIn });
      if (day.needsOut) photosArr.push({ label: 'รูปเลิกงาน', photo: res.photoOut });
      for (let pi = 0; pi < photosArr.length; pi++) {
        const px = slotsX + pi * (PHOTO_W + gap);
        await embedPhoto(doc, photosArr[pi].photo, photosArr[pi].label, px, curY);
      }
      curY += PHOTO_BLOCK_H + 4;
    }

    if (remarkLines.length) {
      setColor(doc, '#475569');
      doc.setFontSize(8).setFont(FONT, 'normal');
      doc.text(remarkLines, MARGIN + 4, curY + 3);
    }

    setColor(doc, '#000000');
    y += cardHeight + CARD_GAP;
  }

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    footer(doc, p, total);
  }

  return doc;
}
