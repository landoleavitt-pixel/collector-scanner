// The print run in a listing title ("/25", "#12/25", "12 / 25"), or null.
// When several appear, the smallest wins (the card's own serial run, not a
// set size). `allowed` optionally limits which runs count.
export function printRunOf(title, allowed = null) {
  const t = String(title || '');
  const found = [];
  for (const m of t.matchAll(/(?:^|[^\d])\/\s*(\d{1,4})\b/g)) found.push(Number(m[1]));
  for (const m of t.matchAll(/\b(\d{1,4})\s*\/\s*(\d{1,4})\b/g)) {
    if (Number(m[1]) <= Number(m[2])) found.push(Number(m[2]));
  }
  const ok = found.filter((n) => n > 0 && n < 10000 && (!allowed || allowed.has(n)));
  return ok.length ? Math.min(...ok) : null;
}
