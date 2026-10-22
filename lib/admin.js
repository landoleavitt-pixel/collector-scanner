// Admin gate shared by admin API routes: comma-separated Supabase user UUIDs
// in the ADMIN_USER_IDS env var.
export function isAdminUser(userId) {
  if (!userId) return false;
  return (process.env.ADMIN_USER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(userId);
}
