import { describe, it, expect } from 'vitest';
import { classifyStatus, classifyRows } from '../src/parser.js';

describe('classifyStatus', () => {
  it('recognises the BMS status values', () => {
    expect(classifyStatus('เวลาทำงานปกติ')).toBe('normal');
    expect(classifyStatus('ขาดงาน')).toBe('absent');
    expect(classifyStatus('เข้าทำงานสาย')).toBe('late');
    expect(classifyStatus('ทำงานนอก Office')).toBe('offsite');
    expect(classifyStatus('วันหยุด')).toBe('holiday');
    expect(classifyStatus('ลาพักร้อน')).toBe('vacation');
    expect(classifyStatus('')).toBe('unknown');
  });
});

describe('classifyRows — April 2026 sample', () => {
  // Mirrors the real PDF: 03/04 absent, 07/04 late single-scan, 17/04 absent.
  const rows = [
    { date: new Date(2026, 3, 1),  checkIn: '08:26:41', checkOut: '17:44:20', statusText: 'เวลาทำงานปกติ' },
    { date: new Date(2026, 3, 3),  checkIn: null,       checkOut: null,       statusText: 'ขาดงาน' },
    { date: new Date(2026, 3, 4),  checkIn: null,       checkOut: null,       statusText: 'วันหยุด' },
    { date: new Date(2026, 3, 7),  checkIn: '17:38:33', checkOut: '17:38:33', statusText: 'เข้าทำงานสาย' },
    { date: new Date(2026, 3, 16), checkIn: null,       checkOut: null,       statusText: 'ลาพักร้อน' },
    { date: new Date(2026, 3, 17), checkIn: null,       checkOut: null,       statusText: 'ขาดงาน' },
    { date: new Date(2026, 3, 20), checkIn: null,       checkOut: null,       statusText: 'ทำงานนอก Office' },
  ];

  it('flags absent, single-scan late, and off-site as needing justification', () => {
    const result = classifyRows(rows);
    const flagged = result.filter((r) => r.needsJustification).map((r) => r.date.getDate());
    expect(flagged).toEqual([3, 7, 17, 20]);
  });

  it('does not flag holidays, vacation, or normal days', () => {
    const result = classifyRows(rows);
    const ok = result.filter((r) => !r.needsJustification).map((r) => r.status);
    expect(ok).toContain('holiday');
    expect(ok).toContain('vacation');
    expect(ok).toContain('normal');
    expect(ok).not.toContain('offsite');
  });

  it('tags late single-scan with "single-scan" reason', () => {
    const result = classifyRows(rows);
    const apr7 = result.find((r) => r.date.getDate() === 7);
    expect(apr7.justificationReason).toBe('single-scan');
  });

  it('absent days need both clock-in and clock-out photos', () => {
    const result = classifyRows(rows);
    const apr3 = result.find((r) => r.date.getDate() === 3);
    expect(apr3.needsIn).toBe(true);
    expect(apr3.needsOut).toBe(true);
  });

  it('late single-scan needs only clock-in photo', () => {
    const result = classifyRows(rows);
    const apr7 = result.find((r) => r.date.getDate() === 7);
    expect(apr7.needsIn).toBe(true);
    expect(apr7.needsOut).toBe(false);
  });
});
