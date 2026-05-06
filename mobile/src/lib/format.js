export function fmtDate(d) {
  if (!d) return '';
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function fmtMonthYear(d) {
  if (!d) return '';
  return d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
}

export function fmtDateTime(d) {
  if (!d) return '';
  return `${fmtDate(d)} ${d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;
}
