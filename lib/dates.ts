export function todayISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysBetween(earlier: string, later: string) {
  const [ay, am, ad] = earlier.split("-").map(Number);
  const [by, bm, bd] = later.split("-").map(Number);
  const a = Date.UTC(ay, (am ?? 1) - 1, ad ?? 1);
  const b = Date.UTC(by, (bm ?? 1) - 1, bd ?? 1);
  return Math.round((b - a) / 86400000);
}

export function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + n);
  return todayISO(dt);
}

export function lastNDates(n: number, end = new Date()) {
  const endISO = todayISO(end);
  return Array.from({ length: n }, (_, i) => addDays(endISO, i - (n - 1)));
}

export function datesEndingDaysAgo(daysAgo: number, count: number) {
  const end = addDays(todayISO(), -daysAgo);
  return Array.from({ length: count }, (_, i) => addDays(end, i - (count - 1)));
}

export function isFriday(d = new Date()) {
  return d.getDay() === 5;
}

export function greeting(name: string, d = new Date()) {
  const h = d.getHours();
  const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const trimmed = name.trim();
  return trimmed ? `${part}, ${trimmed}` : part;
}

export function weekdayShort(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString("en", {
    weekday: "narrow",
  });
}

export function formatWhen(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

export function elapsed(iso: string, now = Date.now()) {
  const ms = Math.max(0, now - new Date(iso).getTime());
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr} hr`;
  return `${Math.round(hr / 24)} days`;
}

export function uid() {
  return `${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;
}

export function hashString(value: string) {
  let n = 0;
  for (const c of value) n = (n * 33 + c.charCodeAt(0)) >>> 0;
  return n;
}
