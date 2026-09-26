export type AppRole = "chairman" | "super_admin" | "admin" | "staff" | "user";

export const ROLE_LABEL: Record<AppRole, string> = {
  chairman: "Chairman",
  super_admin: "Founder",
  admin: "Manager",
  staff: "Recording Team",
  user: "Player",
};

export const ROLES: AppRole[] = ["chairman", "super_admin", "admin", "staff", "user"];

export const RANK: Record<AppRole, number> = {
  chairman: 5,
  super_admin: 4,
  admin: 3,
  staff: 2,
  user: 1,
};

export const isStaffOrAbove = (role: AppRole | null | undefined): boolean =>
  Boolean(role && RANK[role] >= 2);

export const isSuperAdmin = (role: AppRole | null | undefined): boolean =>
  Boolean(role && RANK[role] >= 4);

export const isAdminOrSuperAdmin = (role: AppRole | null | undefined): boolean =>
  Boolean(role && RANK[role] >= 3);

export const isChairman = (role: AppRole | null | undefined): boolean => role === "chairman";

export const canManageRoles = (role: AppRole | null | undefined): boolean =>
  Boolean(role && RANK[role] >= 4);

export type AppUser = {
  id: string;
  email: string;
  display_name: string;
  role: AppRole;
  created_at: string;
  avatar_url?: string;
};
