/** True when a trade-docs storage path sits directly inside the user's own folder. */
export function isOwnTradeDocPath(path: string, userId: string): boolean {
  if (!userId || !path) return false;
  const prefix = `${userId}/`;
  if (!path.startsWith(prefix)) return false;
  const rest = path.slice(prefix.length);
  return rest.length > 0 && !rest.includes("/") && !rest.includes("\\") && !rest.includes("..");
}
