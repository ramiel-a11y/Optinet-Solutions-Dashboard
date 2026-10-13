// Derive a human display name from an email address: the local part (before "@"),
// split on separators and title-cased. e.g. "guest@optinetsolutions.com" -> "Guest",
// "jane@..." -> "Jane", "sam.lee@..." -> "Sam Lee". Falls back to "there".
export function displayNameFromEmail(email: string | null | undefined): string {
  const local = email?.split('@')[0]?.trim();
  if (!local) return 'there';
  const name = local
    .split(/[._+-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
  return name || 'there';
}
