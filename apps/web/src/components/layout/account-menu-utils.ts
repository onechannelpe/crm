export function getUserInitials(fullName: string): string {
  const [first = "", second = ""] = fullName.trim().split(/\s+/);
  return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase() || "ME";
}
