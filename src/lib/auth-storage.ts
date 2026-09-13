import type { AppRole, AppUser } from "./auth-types";

const USERS_STORAGE_KEY = "vs_app_users_v7";
const ROLES_OVERRIDE_KEY = "vs_roles_override_v7";
const CURRENT_SESSION_KEY = "vs_current_session_v7";
const RESET_REQUESTS_KEY = "vs_reset_requests_v7";

export interface StoredUser extends AppUser {
  passwordHash: string;
}

// Official Founder account
export const FOUNDER_EMAIL = "ksfittnesssingh@gmail.com";
export const BACKUP_FOUNDER_EMAIL = "fluxruinmc@gmail.com";

export const INITIAL_SUPER_ADMINS: StoredUser[] = [
  {
    id: "founder-fluxruin",
    email: FOUNDER_EMAIL,
    display_name: "Kabir",
    role: "super_admin",
    passwordHash: "asusrog69",
    created_at: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "founder-backup",
    email: BACKUP_FOUNDER_EMAIL,
    display_name: "FluxRuin",
    role: "super_admin",
    passwordHash: "gamingpowerisop23",
    created_at: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "founder-supremen",
    email: "aryanabhi2016@gmail.com",
    display_name: "Supremen",
    role: "super_admin",
    passwordHash: "SUPREMENADMIN@4091",
    created_at: "2026-09-12T00:00:00.000Z",
  },
  {
    id: "manager-vishnu",
    email: "mr.lamonpro@gmail.com",
    display_name: "Vishnu",
    role: "admin",
    passwordHash: "mrlemon1234",
    created_at: "2026-09-12T00:00:00.000Z",
  },
];

export function getStoredUsers(): StoredUser[] {
  if (typeof window === "undefined") return INITIAL_SUPER_ADMINS;
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_SUPER_ADMINS));
      return INITIAL_SUPER_ADMINS;
    }
    const parsed = JSON.parse(raw) as StoredUser[];
    let list = Array.isArray(parsed) ? parsed : [...INITIAL_SUPER_ADMINS];

    // Purge any account named 'admin' or with email 'admin'
    list = list.filter((u) => {
      const email = (u.email || "").toLowerCase().trim();
      const name = (u.display_name || "").toLowerCase().trim();
      if (
        name === "admin" ||
        email === "admin" ||
        email === "admin@visualstudios.net" ||
        email.startsWith("admin@")
      ) {
        return false;
      }
      return true;
    });

    return list;
  } catch {
    return INITIAL_SUPER_ADMINS;
  }
}

export function saveStoredUsers(users: StoredUser[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error("Failed to save users to localStorage", err);
  }
}

export function getStoredUserByEmail(email: string): StoredUser | undefined {
  const users = getStoredUsers();
  const normalized = email.trim().toLowerCase();
  return users.find((u) => u.email.toLowerCase() === normalized);
}

export function getStoredUserById(id: string): StoredUser | undefined {
  const users = getStoredUsers();
  return users.find((u) => u.id === id);
}

export function authenticateLocalUser(
  email: string,
  password: string,
): { user: AppUser; error?: string } {
  const normalized = email.trim().toLowerCase();
  const users = getStoredUsers();
  const found = users.find((u) => u.email.toLowerCase() === normalized);

  if (!found) {
    return { user: null as unknown as AppUser, error: "No account found with this email address." };
  }

  if (found.passwordHash !== password) {
    return {
      user: null as unknown as AppUser,
      error: "Invalid password. Please try again or reset your password.",
    };
  }

  const { passwordHash: _, ...safeUser } = found;
  return { user: safeUser };
}

export function registerLocalUser(
  email: string,
  password: string,
  displayName: string,
  role: AppRole = "user",
): { user: AppUser; error?: string } {
  const normalized = email.trim().toLowerCase();
  const users = getStoredUsers();
  const existing = users.find((u) => u.email.toLowerCase() === normalized);

  if (existing) {
    return {
      user: null as unknown as AppUser,
      error: "An account with this email already exists. Please sign in instead.",
    };
  }

  const fallbackName = normalized.split("@")[0] ?? normalized;
  const isFounder = normalized === FOUNDER_EMAIL.toLowerCase();
  const newUser: StoredUser = {
    id: isFounder
      ? "founder-fluxruin"
      : `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    email: normalized,
    display_name: displayName.trim() || (isFounder ? "FluxRuin" : fallbackName),
    role: isFounder ? "super_admin" : role,
    passwordHash: password,
    created_at: new Date().toISOString(),
  };

  users.push(newUser);
  saveStoredUsers(users);

  const { passwordHash: _, ...safeUser } = newUser;
  return { user: safeUser };
}

export function updateUserRoleInStorage(
  userId: string,
  newRole: AppRole,
): { success: boolean; error?: string } {
  const users = getStoredUsers();
  const target = users.find(
    (u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase(),
  );

  if (!target) {
    return { success: false, error: "User not found." };
  }

  target.role = newRole;
  saveStoredUsers(users);

  // If this user is currently logged in, update their active session
  const currentSession = getCurrentLocalSession();
  if (
    currentSession &&
    (currentSession.id === target.id ||
      currentSession.email.toLowerCase() === target.email.toLowerCase())
  ) {
    currentSession.role = newRole;
    setCurrentLocalSession(currentSession);
  }

  return { success: true };
}

export function deleteUserFromStorage(userId: string): { success: boolean; error?: string } {
  let users = getStoredUsers();
  const normalized = userId.trim().toLowerCase();
  const target = users.find((u) => u.id === userId || u.email.toLowerCase() === normalized);
  if (!target) return { success: false, error: "User not found" };

  users = users.filter((u) => u.id !== userId && u.email.toLowerCase() !== normalized);
  saveStoredUsers(users);
  return { success: true };
}

export function getCurrentLocalSession(): AppUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CURRENT_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AppUser;
    return session;
  } catch {
    return null;
  }
}

export function setCurrentLocalSession(user: AppUser | null) {
  if (typeof window === "undefined") return;
  try {
    if (!user) {
      localStorage.removeItem(CURRENT_SESSION_KEY);
    } else {
      localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(user));
    }
  } catch (err) {
    console.error("Failed to update current session in localStorage", err);
  }
}

export function recordPasswordResetRequest(email: string): { success: boolean; token: string } {
  const normalized = email.trim().toLowerCase();
  const token = `rst-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  if (typeof window === "undefined") return { success: true, token };

  try {
    const raw = localStorage.getItem(RESET_REQUESTS_KEY);
    const requests = raw
      ? (JSON.parse(raw) as Record<string, { email: string; timestamp: number }>)
      : {};
    requests[token] = { email: normalized, timestamp: Date.now() };
    localStorage.setItem(RESET_REQUESTS_KEY, JSON.stringify(requests));
  } catch (e) {
    console.error(e);
  }

  return { success: true, token };
}

export function resetLocalUserPassword(
  email: string,
  newPassword: string,
): { success: boolean; error?: string } {
  const normalized = email.trim().toLowerCase();
  const users = getStoredUsers();
  const user = users.find((u) => u.email.toLowerCase() === normalized);

  if (!user) {
    return { success: false, error: "No account found matching this email." };
  }

  user.passwordHash = newPassword;
  saveStoredUsers(users);
  return { success: true };
}
