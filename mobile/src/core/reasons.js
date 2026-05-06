export const REASONS = [
  ['scanner-broken', 'เครื่องสแกนใบหน้าไม่ทำงาน'],
  ['offsite', 'ทำงานนอก Office / พบลูกค้า'],
  ['wfh', 'ทำงานที่บ้าน (ได้รับอนุมัติ)'],
  ['forgot', 'ลืมสแกน'],
  ['overtime', 'ทำงานล่วงเวลา / กลับดึก'],
  ['medical', 'ลาป่วย / ลากิจ'],
  ['other', 'อื่นๆ'],
];

export const REASON_LABEL_MAP = Object.fromEntries(REASONS);

export const STATUS_BADGES = {
  absent: 'ขาดงาน',
  'single-scan': 'สแกนไม่ครบ',
  offsite: 'ทำงานนอก Office',
  partial: 'ข้อมูลไม่ครบ',
  missing: 'ข้อมูลขาด',
};
