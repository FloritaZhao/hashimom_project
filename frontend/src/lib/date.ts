export function toYmd(d: string | Date): string {
  let dt: Date | null = null;
  if (d instanceof Date) {
    if (!isNaN(d.getTime())) dt = d;
  } else if (typeof d === 'string') {
    const s = d.trim();
    // Fast path: YYYY-MM-DD
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const [, y, mo, da] = m;
      dt = new Date(Number(y), Number(mo) - 1, Number(da));
    } else {
      // Try ISO or space-separated
      let t = new Date(s);
      if (isNaN(t.getTime())) t = new Date(s.replace(' ', 'T'));
      if (!isNaN(t.getTime())) dt = t;
    }
  }
  if (!dt) dt = new Date();
  const local = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, '0');
  const day = String(local.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function lastNDays(n: number): string[] {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(start);
    d.setDate(start.getDate() - i);
    days.push(toYmd(d));
  }
  return days;
}


