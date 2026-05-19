export const isAdmin = (email?: string | null) => {
  const list = (import.meta.env.VITE_ADMIN_EMAILS as string | undefined)?.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) ?? [];
  if (!email) return false;
  return list.includes(email.toLowerCase());
};
