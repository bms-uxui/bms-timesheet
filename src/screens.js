import { state, setUserName } from './state.js';
import { parseTimesheet } from './parser.js';
import { readPhotos } from './exif.js';
import { matchPhotos, sameDay, classifyPhotoType, fmtTime } from './match.js';
import { exportPDF } from './exporter.js';
import { renderPDFPreview } from './pdfPreview.js';

const STEPS = [
  { id: 'import', label: '1. นำเข้า' },
  { id: 'select', label: '2. รูปภาพ' },
  { id: 'review', label: '3. ตรวจสอบ' },
  { id: 'export', label: '4. ส่งออก' },
];

const REASONS = [
  ['scanner-broken', 'เครื่องสแกนใบหน้าไม่ทำงาน'],
  ['offsite', 'ทำงานนอก Office / พบลูกค้า'],
  ['wfh', 'ทำงานที่บ้าน (ได้รับอนุมัติ)'],
  ['forgot', 'ลืมสแกน'],
  ['overtime', 'ทำงานล่วงเวลา / กลับดึก'],
  ['medical', 'ลาป่วย / ลากิจ'],
  ['other', 'อื่นๆ'],
];

const REASON_LABELS = {
  'absent': 'ขาดงาน',
  'single-scan': 'สแกนไม่ครบ',
  'offsite': 'ทำงานนอก Office',
  'missing': 'ข้อมูลขาด',
};

const fmtDate = (d) => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });

function buildFilename(state) {
  const start = state.timesheet?.period?.start;
  const month = start ? start.toLocaleDateString('th-TH', { month: 'long' }) : '';
  const year = start ? start.toLocaleDateString('th-TH', { year: 'numeric' }) : '';
  const name = (state.userName || 'unnamed').replace(/[\\/:*?"<>|]/g, '').trim() || 'unnamed';
  const parts = [name, 'รายงานการเข้าออกงาน', month, year].filter(Boolean);
  return parts.join('-') + '.pdf';
}
const dateKey = (d) => d.toISOString().slice(0, 10);

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstChild;
}

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderSteps() {
  const nav = document.getElementById('steps');
  const idx = STEPS.findIndex((s) => s.id === state.step);
  nav.innerHTML = STEPS.map((s, i) => {
    const cls = i < idx ? 'done' : i === idx ? 'active' : '';
    return `<span class="${cls}">${s.label}</span>`;
  }).join('');
}

function importScreen() {
  const root = el(`
    <div>
      <div class="card">
        <h2>นำเข้าตารางเวลาจาก HR</h2>
        <label for="userName">ชื่อพนักงาน</label>
        <input type="text" id="userName" placeholder="ชื่อ-นามสกุล" value="${escape(state.userName || '')}">
        <p class="muted small" style="margin-top:.35rem;margin-bottom:1rem">ใช้สำหรับชื่อไฟล์ PDF ที่ส่งให้ HR</p>
        <label class="upload">
          <input type="file" accept="application/pdf" id="pdfInput">
          <div class="icon">📄</div>
          <div class="primary">แตะเพื่อเลือกไฟล์ PDF</div>
          <div class="secondary">PDF ตารางเวลาประจำเดือนที่ได้รับจาก HR</div>
        </label>
        <div id="parseStatus" class="muted" style="margin-top:1rem"></div>
      </div>
    </div>
  `);
  async function handlePDF(file, root) {
    const status = root.querySelector('#parseStatus');
    status.textContent = 'กำลังอ่านไฟล์ PDF…';
    try {
      const ts = await parseTimesheet(file);
      if (ts.entries.length === 0) {
        const raw = ts.rawText || '(ไม่มีข้อความที่อ่านได้)';
        status.innerHTML = `
          <div style="color:var(--danger);margin-bottom:.5rem">ไม่พบข้อมูลตารางในไฟล์ PDF นี้ ข้อความที่อ่านได้แสดงด้านล่าง:</div>
          <textarea readonly style="width:100%;height:280px;font-family:ui-monospace,Menlo,monospace;font-size:.75rem">${escape(raw)}</textarea>`;
        console.log('[parser] raw text:\n', raw);
        return;
      }
      state.timesheet = ts;
      state.missingDays = ts.missingDays;
      state.resolutions = {};
      renderSummary(root, ts);
    } catch (err) {
      status.innerHTML = `<span style="color:var(--danger)">อ่านไฟล์ไม่สำเร็จ: ${escape(err.message)}</span>`;
    }
  }

  root.querySelector('#pdfInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handlePDF(file, root);
  });
  root.querySelector('#userName').addEventListener('input', (e) => {
    setUserName(e.target.value.trim());
  });

  // If a PDF was shared into the app from another app, auto-load it now.
  if (state.sharedFile) {
    const f = state.sharedFile;
    state.sharedFile = null;
    handlePDF(f, root);
  }

  return root;
}

function renderSummary(root, ts) {
  const status = root.querySelector('#parseStatus');
  status.innerHTML = '';
  const period = ts.period ? `${fmtDate(ts.period.start)} – ${fmtDate(ts.period.end)}` : '—';
  // Per-status breakdown helps diagnose extraction issues at a glance.
  const counts = ts.entries.reduce((m, e) => ((m[e.status] = (m[e.status] || 0) + 1), m), {});
  const breakdown = Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(' · ');
  const summary = el(`
    <div>
      <div class="summary">
        <div><strong>${ts.entries.length}</strong>รายการ</div>
        <div><strong>${ts.missingDays.length}</strong>ต้องชี้แจง</div>
        <div><strong style="font-size:.95rem">${period}</strong>ช่วงเวลา</div>
      </div>
      <div class="card">
        <h3>วันที่ต้องชี้แจง</h3>
        <p class="muted small">สรุปสถานะ: ${escape(breakdown)}</p>
        ${ts.missingDays.length === 0
          ? '<p class="muted">ไม่มี — ตารางเวลาของคุณครบถ้วน</p>'
          : `<ul class="day-list">${ts.missingDays.map((d) => `
            <li>
              <strong>${fmtDate(d.date)}</strong>
              <span class="badge miss">${REASON_LABELS[d.justificationReason] || d.justificationReason}</span>
              <span class="muted">${d.checkIn || '—'} / ${d.checkOut || '—'}</span>
            </li>`).join('')}</ul>`}
      </div>
      <div class="actions sticky">
        <button id="next" class="full" ${ts.missingDays.length === 0 ? 'disabled' : ''}>ถัดไป → เลือกรูปภาพ</button>
      </div>
    </div>
  `);
  summary.querySelector('#next').addEventListener('click', () => state.go('select'));
  status.appendChild(summary);
}

function selectScreen() {
  const root = el(`
    <div>
      <div class="card">
        <h2>เลือกรูปภาพ</h2>
        <p class="muted">เลือกรูปภาพจากคลังที่ถ่ายในช่วงเวลานี้ — แอปจะจับคู่รูปกับวันที่ขาดให้อัตโนมัติ</p>
        <label class="upload">
          <input type="file" accept="image/*" multiple id="photoInput">
          <div class="icon">📷</div>
          <div class="primary">แตะเพื่อเลือกรูปภาพ</div>
          <div class="secondary">เลือกได้หลายรูปในครั้งเดียว</div>
        </label>
        <div id="photoStatus" style="margin-top:1rem"></div>
      </div>
      <div class="actions sticky">
        <button class="ghost" id="back">← ย้อนกลับ</button>
        <button id="next" disabled>ถัดไป → ตรวจสอบ</button>
      </div>
    </div>
  `);
  root.querySelector('#back').addEventListener('click', () => state.go('import'));

  async function processPhotos(photos) {
    const status = root.querySelector('#photoStatus');
    state.photos = photos;
    const matched = matchPhotos(state.missingDays, photos);
    let inCount = 0, outCount = 0;
    for (const day of state.missingDays) {
      const k = dateKey(day.date);
      state.resolutions[k] = state.resolutions[k] || {};
      const m = matched[k];
      if (!m) continue;
      if (m.photoIn && day.needsIn) {
        state.resolutions[k].photoIn = m.photoIn;
        if (!state.resolutions[k].actualTimeIn) {
          state.resolutions[k].actualTimeIn = fmtTime(m.photoIn.takenAt);
        }
        if (classifyPhotoType(m.photoIn.takenAt) === 'clock-in') inCount++;
      }
      if (m.photoOut && day.needsOut) {
        state.resolutions[k].photoOut = m.photoOut;
        if (!state.resolutions[k].actualTimeOut) {
          state.resolutions[k].actualTimeOut = fmtTime(m.photoOut.takenAt);
        }
        if (classifyPhotoType(m.photoOut.takenAt) === 'clock-out') outCount++;
      }
      if (!state.resolutions[k].reason && (inCount || outCount)) {
        state.resolutions[k].reason = 'scanner-broken';
      }
    }
    const matchCount = Object.keys(matched).length;
    status.innerHTML = `<p>โหลดรูปภาพ <strong>${photos.length}</strong> รูป · จับคู่ <strong>${matchCount}/${state.missingDays.length}</strong> วัน · พบรูปเข้างาน <strong>${inCount}</strong> · เลิกงาน <strong>${outCount}</strong></p>`;
    root.querySelector('#next').disabled = false;
  }

  root.querySelector('#photoInput').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    const status = root.querySelector('#photoStatus');
    status.innerHTML = '<div>กำลังอ่านข้อมูล EXIF…</div><div class="progress"><div></div></div>';
    const bar = status.querySelector('.progress > div');
    const photos = await readPhotos(files, (done, total) => {
      bar.style.width = `${(done / total) * 100}%`;
    });
    await processPhotos(photos);
  });
  root.querySelector('#next').addEventListener('click', () => state.go('review'));
  return root;
}

function photoSlotMarkup(slot, key, field, photo, allPhotos) {
  const opts = allPhotos
    .map((p) => `<option value="${p.id}" ${photo?.id === p.id ? 'selected' : ''}>${escape(p.name)} · ${p.takenAt.toLocaleString('en-GB')}</option>`)
    .join('');
  return `
    <div class="slot">
      <div class="slot-label">${slot}</div>
      <div class="photo-slot" data-slot="${field}">${photo ? `<img src="${photo.url}" alt="">` : 'ไม่มีรูป'}</div>
      <select data-key="${key}" data-field="${field}">
        <option value="">— ไม่ระบุ —</option>
        ${opts}
      </select>
    </div>
  `;
}

function reviewScreen() {
  const root = el('<div></div>');
  for (const day of state.missingDays) {
    const k = dateKey(day.date);
    const res = state.resolutions[k] || {};
    const reasonOpts = REASONS
      .map(([v, l]) => `<option value="${v}" ${res.reason === v ? 'selected' : ''}>${l}</option>`)
      .join('');
    const card = el(`
      <div class="day-card-v">
        <div class="day-head">
          <strong>${fmtDate(day.date)}</strong>
          <span class="badge miss">${REASON_LABELS[day.justificationReason] || day.justificationReason}</span>
          <span class="muted small">HR: ${day.checkIn || '—'} / ${day.checkOut || '—'}</span>
        </div>
        <div class="slots ${day.needsIn && day.needsOut ? 'two' : 'one'}">
          ${day.needsIn ? photoSlotMarkup('⏰ เข้างาน', k, 'photoIn', res.photoIn, state.photos) : ''}
          ${day.needsOut ? photoSlotMarkup('🌙 เลิกงาน', k, 'photoOut', res.photoOut, state.photos) : ''}
        </div>
        <div class="time-row ${day.needsIn && day.needsOut ? 'two' : 'one'}">
          ${day.needsIn ? `<div>
            <label>เวลาเข้าจริง</label>
            <input type="text" placeholder="08:15" data-key="${k}" data-field="actualTimeIn" value="${escape(res.actualTimeIn || '')}">
          </div>` : ''}
          ${day.needsOut ? `<div>
            <label>เวลาออกจริง</label>
            <input type="text" placeholder="17:30" data-key="${k}" data-field="actualTimeOut" value="${escape(res.actualTimeOut || '')}">
          </div>` : ''}
        </div>
        <label>เหตุผล</label>
        <select data-key="${k}" data-field="reason">
          <option value="">— เลือก —</option>
          ${reasonOpts}
        </select>
        <label>หมายเหตุ</label>
        <textarea data-key="${k}" data-field="remark" placeholder="รายละเอียดเพิ่มเติมสำหรับ HR">${escape(res.remark || '')}</textarea>
      </div>
    `);
    root.appendChild(card);
  }
  root.addEventListener('input', (e) => {
    const t = e.target;
    const k = t.dataset.key, f = t.dataset.field;
    if (!k || !f) return;
    state.resolutions[k] = state.resolutions[k] || {};
    if (f === 'photoIn' || f === 'photoOut') {
      const photo = state.photos.find((p) => p.id === t.value) || null;
      state.resolutions[k][f] = photo;
      const card = t.closest('.day-card-v');
      const slot = card.querySelector(`.photo-slot[data-slot="${f}"]`);
      slot.innerHTML = photo ? `<img src="${photo.url}" alt="">` : 'ไม่มีรูป';
    } else {
      state.resolutions[k][f] = t.value;
    }
  });
  const actions = el(`
    <div class="actions sticky">
      <button class="ghost" id="back">← ย้อนกลับ</button>
      <button id="next">ถัดไป → ส่งออก</button>
    </div>
  `);
  actions.querySelector('#back').addEventListener('click', () => state.go('select'));
  actions.querySelector('#next').addEventListener('click', () => state.go('export'));
  root.appendChild(actions);
  return root;
}

function exportScreen() {
  const root = el(`
    <div>
      <div class="card">
        <h2>ตรวจสอบและส่งออก</h2>
        <p class="muted">ดูตัวอย่างเอกสารก่อนส่งให้ HR</p>
        <div id="exportStatus" class="callout">⏳ กำลังสร้างตัวอย่าง…</div>
        <div id="pdfPreview" class="pdf-preview" hidden></div>
      </div>
      <div class="actions sticky">
        <button class="ghost" id="back">← ย้อนกลับ</button>
        <button id="download" disabled>ดาวน์โหลด</button>
        <button id="share" disabled>แชร์</button>
      </div>
    </div>
  `);
  let blob = null;
  let filename = 'justification.pdf';

  async function generate() {
    const status = root.querySelector('#exportStatus');
    const preview = root.querySelector('#pdfPreview');
    status.className = 'callout';
    status.textContent = '⏳ กำลังสร้างตัวอย่าง…';
    try {
      const doc = await exportPDF(state);
      blob = doc.output('blob');
      filename = buildFilename(state);
      const buf = await blob.arrayBuffer();
      preview.hidden = false;
      await renderPDFPreview(buf, preview);
      status.textContent = '✅ พร้อมดาวน์โหลด ตรวจสอบความถูกต้องด้านบน';
      root.querySelector('#download').disabled = false;
      if (navigator.canShare?.({ files: [new File([blob], filename, { type: 'application/pdf' })] })) {
        root.querySelector('#share').disabled = false;
      }
    } catch (err) {
      status.className = 'callout error';
      status.textContent = `❌ ล้มเหลว: ${err.message}`;
    }
  }

  root.querySelector('#back').addEventListener('click', () => state.go('review'));
  root.querySelector('#download').addEventListener('click', () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  root.querySelector('#share').addEventListener('click', async () => {
    if (!blob) return;
    const file = new File([blob], filename, { type: 'application/pdf' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'ใบชี้แจงเวลาทำงาน' }); } catch {}
    } else {
      alert('อุปกรณ์นี้ไม่รองรับการแชร์ กรุณาใช้ปุ่มดาวน์โหลด');
    }
  });

  // Auto-generate on screen entry
  setTimeout(generate, 0);

  return root;
}

const SCREENS = { import: importScreen, select: selectScreen, review: reviewScreen, export: exportScreen };

export function render() {
  renderSteps();
  const main = document.getElementById('app');
  main.innerHTML = '';
  main.appendChild(SCREENS[state.step]());
}
