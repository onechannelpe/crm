// Sales, hr, admin, etc. define their own permission strings inline.
export type CapacityPermission =
  | "search:use"
  | "capacity:read:self"
  | "lead:work"
  | "capacity:approve"
  | "capacity:manage"
  | "capacity:request:self"
  | "capacity:read:team"
  | "capacity:policy:manage"
  | "capacity:audit:read";
