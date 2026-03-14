// Auth module: imports from session
import type { Session } from "./session.js";

type Role = "admin" | "user" | "guest";

const rolePermissions: Record<Role, readonly string[]> = {
  admin: ["read", "write", "delete", "manage"],
  user: ["read", "write"],
  guest: ["read"],
};

export function hasPermission(
  _session: Session,
  role: Role,
  permission: string,
): boolean {
  return rolePermissions[role].includes(permission);
}

export function getRolePermissions(role: Role): readonly string[] {
  return rolePermissions[role];
}
