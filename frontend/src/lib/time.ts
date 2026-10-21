// Dates and times are always shown in Indian time, 12-hour, like 18 Oct 2026 · 4:35 PM.
// The phone's own time zone is ignored on purpose.
const formatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function parts(date: Date) {
  const map: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) map[part.type] = part.value;
  return map;
}

export function formatDateTime(iso: string): string {
  const p = parts(new Date(iso));
  return `${p.day} ${p.month} ${p.year} · ${p.hour}:${p.minute} ${p.dayPeriod?.toUpperCase()}`;
}

export function formatDate(iso: string): string {
  const p = parts(new Date(iso));
  return `${p.day} ${p.month} ${p.year}`;
}
