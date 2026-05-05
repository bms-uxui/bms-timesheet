// Bottom-sheet tutorial. Auto-shows on first visit; recallable via the
// header help button. Each step pairs a CSS-only skeleton mock-up of the
// real screen with a Thai explanation.

const TUTORIAL_KEY = 'bms-timesheet:tutorial-seen';

const STEPS = [
  {
    title: 'ยินดีต้อนรับ',
    skeleton: `
      <div class="sk-stage sk-welcome">
        <div class="sk-emoji">📋</div>
        <div class="sk-bar sk-h2" style="width:60%"></div>
        <div class="sk-bar sk-line" style="width:80%"></div>
        <div class="sk-flow">
          <span>1</span><i>→</i><span>2</span><i>→</i><span>3</span><i>→</i><span>4</span>
        </div>
      </div>`,
    body: `
      <p>แอปนี้ช่วยคุณสร้าง<strong>ใบชี้แจงเวลาทำงาน</strong>สำหรับวันที่เครื่องสแกนใบหน้าไม่ทำงาน
      เพื่อส่งให้ HR ในรูปแบบ PDF</p>
      <ul>
        <li>ใช้งานได้บนมือถือและคอมพิวเตอร์</li>
        <li>ไม่มีการเก็บข้อมูลบนเซิร์ฟเวอร์ — ทุกอย่างอยู่บนเครื่องของคุณ</li>
        <li>ใช้เวลาประมาณ 2-3 นาที</li>
      </ul>`,
  },
  {
    title: 'ขั้นตอนที่ 1: ใส่ชื่อและอัปโหลด PDF',
    skeleton: `
      <div class="sk-stage">
        <div class="sk-card">
          <div class="sk-bar sk-h2" style="width:70%"></div>
          <div class="sk-label">ชื่อพนักงาน</div>
          <div class="sk-input"></div>
          <div class="sk-upload">
            <div class="sk-emoji-sm">📄</div>
            <div class="sk-bar sk-line" style="width:60%;margin:6px auto;background:#cbd5e1"></div>
          </div>
        </div>
      </div>`,
    body: `
      <ol>
        <li>กรอก<strong>ชื่อ-นามสกุล</strong>ของคุณ (ระบบจะจำไว้ครั้งต่อไป)</li>
        <li>อัปโหลดไฟล์ PDF ตารางเวลาประจำเดือนที่ HR ส่งให้</li>
      </ol>
      <p class="muted">แอปจะอ่านไฟล์ทันทีและบอกว่ามีวันที่ต้องชี้แจงกี่วัน
      เช่น วันขาดงาน, สแกนไม่ครบ, หรือทำงานนอก Office</p>`,
  },
  {
    title: 'ขั้นตอนที่ 2: เลือกรูปจากคลังภาพ',
    skeleton: `
      <div class="sk-stage">
        <div class="sk-card">
          <div class="sk-bar sk-h2" style="width:55%"></div>
          <div class="sk-upload">
            <div class="sk-emoji-sm">📷</div>
          </div>
          <div class="sk-grid sk-grid-3">
            <div class="sk-photo"></div>
            <div class="sk-photo"></div>
            <div class="sk-photo"></div>
            <div class="sk-photo"></div>
            <div class="sk-photo"></div>
            <div class="sk-photo"></div>
          </div>
        </div>
      </div>`,
    body: `
      <p>เลือก<strong>รูปสแกนใบหน้า</strong>ที่คุณถ่ายเก็บไว้ในเดือนนี้</p>
      <ul>
        <li>รูปที่ถ่ายก่อน <strong>8:30 น.</strong> = เข้างาน</li>
        <li>รูปที่ถ่ายหลัง <strong>17:30 น.</strong> = เลิกงาน</li>
      </ul>
      <p class="muted">แอปจะใช้เวลาในรูป (EXIF) จับคู่กับวันที่ขาดข้อมูลให้อัตโนมัติ
      ไม่ต้องเลือกทีละวัน</p>`,
  },
  {
    title: 'ขั้นตอนที่ 3: ตรวจสอบและแก้ไข',
    skeleton: `
      <div class="sk-stage">
        <div class="sk-card sk-day">
          <div class="sk-row">
            <div class="sk-bar sk-h3" style="width:45%"></div>
            <div class="sk-badge"></div>
          </div>
          <div class="sk-grid sk-grid-2">
            <div>
              <div class="sk-label">⏰ เข้างาน</div>
              <div class="sk-photo"></div>
            </div>
            <div>
              <div class="sk-label">🌙 เลิกงาน</div>
              <div class="sk-photo"></div>
            </div>
          </div>
          <div class="sk-label">เหตุผล</div>
          <div class="sk-input sk-select"></div>
          <div class="sk-label">หมายเหตุ</div>
          <div class="sk-input" style="height:48px"></div>
        </div>
      </div>`,
    body: `
      <p>ตรวจสอบรูปและเวลาในแต่ละวัน:</p>
      <ul>
        <li><strong>เปลี่ยนรูป</strong>ได้ถ้าจับคู่ผิด</li>
        <li>เลือก<strong>เหตุผล</strong> (เช่น เครื่องสแกนไม่ทำงาน, ทำงานนอก Office)</li>
        <li>เพิ่ม<strong>หมายเหตุ</strong>ถ้าจำเป็น</li>
      </ul>
      <p class="muted">ถ้าวันไหนต้องการแค่รูปเดียว เช่น ตอนเช้าสแกนไม่ได้แต่ตอนเย็นปกติ
      จะมีช่องเดียวให้กรอก ไม่ต้องอัปโหลดทั้งสองรูป</p>`,
  },
  {
    title: 'ขั้นตอนที่ 4: ส่งออกและส่งให้ HR',
    skeleton: `
      <div class="sk-stage">
        <div class="sk-card sk-pdf">
          <div class="sk-pdf-header"></div>
          <div class="sk-bar sk-line" style="width:90%"></div>
          <div class="sk-bar sk-line" style="width:60%"></div>
          <div class="sk-grid sk-grid-2" style="margin-top:8px">
            <div class="sk-photo"></div>
            <div class="sk-photo"></div>
          </div>
        </div>
        <div class="sk-row sk-row-end">
          <div class="sk-btn sk-btn-ghost">ย้อนกลับ</div>
          <div class="sk-btn">ดาวน์โหลด</div>
          <div class="sk-btn">แชร์</div>
        </div>
      </div>`,
    body: `
      <p>แอปจะแสดง<strong>ตัวอย่าง PDF</strong>ก่อนส่ง — ตรวจสอบความถูกต้องได้ทันที</p>
      <ul>
        <li>กด <strong>ดาวน์โหลด</strong> เพื่อบันทึกไฟล์ลงเครื่อง</li>
        <li>กด <strong>แชร์</strong> เพื่อส่งให้ HR ผ่านอีเมลหรือแชทโดยตรง</li>
      </ul>
      <p class="muted">ชื่อไฟล์จะเป็นรูปแบบ
      <code>{ชื่อ}-รายงานการเข้าออกงาน-{เดือน}-{ปี}.pdf</code></p>`,
  },
];

let backdrop, sheet, currentStep = 0;

function build() {
  backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.addEventListener('click', close);
  document.body.appendChild(backdrop);

  sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.innerHTML = `
    <div class="sheet-header">
      <div class="sheet-handle"></div>
      <div class="sheet-title-row">
        <h3 class="sheet-title"></h3>
        <button class="sheet-close" aria-label="ปิด">✕</button>
      </div>
    </div>
    <div class="sheet-body"></div>
    <div class="sheet-footer">
      <button class="ghost sheet-prev">←</button>
      <div class="sheet-dots"></div>
      <button class="sheet-next">ถัดไป</button>
    </div>
  `;
  document.body.appendChild(sheet);

  sheet.querySelector('.sheet-close').addEventListener('click', close);
  sheet.querySelector('.sheet-prev').addEventListener('click', () => {
    if (currentStep > 0) { currentStep--; render(); }
  });
  sheet.querySelector('.sheet-next').addEventListener('click', () => {
    if (currentStep < STEPS.length - 1) { currentStep++; render(); }
    else close();
  });
}

function render() {
  const step = STEPS[currentStep];
  sheet.querySelector('.sheet-title').textContent = step.title;
  sheet.querySelector('.sheet-body').innerHTML = step.skeleton + step.body;
  sheet.querySelector('.sheet-dots').innerHTML = STEPS
    .map((_, i) => `<span class="${i === currentStep ? 'active' : ''}"></span>`)
    .join('');
  sheet.querySelector('.sheet-prev').disabled = currentStep === 0;
  sheet.querySelector('.sheet-next').textContent = currentStep === STEPS.length - 1 ? 'เสร็จสิ้น' : 'ถัดไป →';
  sheet.querySelector('.sheet-body').scrollTop = 0;
}

function open() {
  if (!sheet) build();
  currentStep = 0;
  render();
  requestAnimationFrame(() => {
    backdrop.classList.add('open');
    sheet.classList.add('open');
  });
}

function close() {
  backdrop.classList.remove('open');
  sheet.classList.remove('open');
  localStorage.setItem(TUTORIAL_KEY, '1');
}

export function showTutorial() { open(); }
export function showTutorialFirstTime() {
  if (localStorage.getItem(TUTORIAL_KEY)) return;
  setTimeout(open, 700);
}
