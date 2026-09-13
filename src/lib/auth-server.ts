import { createServerFn } from "@tanstack/react-start";
import type { AppRole, AppUser } from "./auth-types";

export interface ServerStoredUser extends AppUser {
  passwordHash: string;
}

export const FOUNDER_EMAIL = "ksfittnesssingh@gmail.com";
export const BACKUP_FOUNDER_EMAIL = "fluxruinmc@gmail.com";

export const DEFAULT_USERS: ServerStoredUser[] = [
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

// Helper to safely access server file persistence without leaking node:fs into client bundle
async function readUsersFromDisk(): Promise<ServerStoredUser[]> {
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const dir = path.join(process.cwd(), "data");
    const filePath = path.join(dir, "users.json");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(DEFAULT_USERS, null, 2), "utf8");
      return [...DEFAULT_USERS];
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as ServerStoredUser[];
    let list = Array.isArray(parsed) ? parsed : [...DEFAULT_USERS];

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
  } catch (err) {
    console.error("[ServerAuth] Error reading users from disk:", err);
    return [...DEFAULT_USERS];
  }
}

async function writeUsersToDisk(users: ServerStoredUser[]): Promise<void> {
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const dir = path.join(process.cwd(), "data");
    const filePath = path.join(dir, "users.json");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(users, null, 2), "utf8");
  } catch (err) {
    console.error("[ServerAuth] Error writing users to disk:", err);
  }
}

export type RegisterServerInput = {
  email: string;
  password: string;
  displayName: string;
  role?: AppRole;
};

export type AuthenticateServerInput = {
  email: string;
  password: string;
};

export type UpdateRoleServerInput = {
  userId: string;
  role: AppRole;
};

export type DeleteUserServerInput = {
  userId: string;
};

export type ResetPassServerInput = {
  email: string;
  newPassword: string;
};

// 1. Fetch all users (sanitized for client)
export const serverGetUsers = createServerFn({ method: "GET" }).handler(
  async (): Promise<AppUser[]> => {
    const users = await readUsersFromDisk();
    return users.map(({ passwordHash: _, ...safe }) => safe);
  },
);

// 2. Register new user
export const serverRegisterUser = createServerFn({ method: "POST" })
  .validator((data: RegisterServerInput) => data)
  .handler(async ({ data }): Promise<{ success: boolean; user?: AppUser; error?: string }> => {
    const normalized = data.email.trim().toLowerCase();
    if (!normalized || !data.password) {
      return { success: false, error: "Email and password are required." };
    }
    if (data.password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters." };
    }

    const users = await readUsersFromDisk();
    const existing = users.find((u) => u.email.toLowerCase() === normalized);
    if (existing) {
      return {
        success: false,
        error: "An account with this email already exists. Please sign in instead.",
      };
    }

    const isFounder = normalized === FOUNDER_EMAIL.toLowerCase();
    const isBackup = normalized === BACKUP_FOUNDER_EMAIL.toLowerCase();
    const assignedRole: AppRole = isFounder || isBackup ? "super_admin" : data.role || "user";
    const displayName =
      data.displayName.trim() ||
      (isFounder || isBackup ? "FluxRuin" : normalized.split("@")[0] || "Player");

    const newUser: ServerStoredUser = {
      id: isFounder
        ? "founder-fluxruin"
        : `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      email: normalized,
      display_name: displayName,
      role: assignedRole,
      passwordHash: data.password,
      created_at: new Date().toISOString(),
    };

    users.push(newUser);
    await writeUsersToDisk(users);

    const { passwordHash: _, ...safeUser } = newUser;
    return { success: true, user: safeUser };
  });

// 3. Authenticate user credentials
export const serverAuthenticateUser = createServerFn({ method: "POST" })
  .validator((data: AuthenticateServerInput) => data)
  .handler(async ({ data }): Promise<{ success: boolean; user?: AppUser; error?: string }> => {
    const normalized = data.email.trim().toLowerCase();
    if (!normalized || !data.password) {
      return { success: false, error: "Please enter both email and password." };
    }

    const users = await readUsersFromDisk();
    const found = users.find((u) => u.email.toLowerCase() === normalized);

    if (!found) {
      return { success: false, error: "No account found with this email address." };
    }

    if (found.passwordHash !== data.password) {
      return { success: false, error: "Invalid password. Please try again." };
    }

    const { passwordHash: _, ...safeUser } = found;
    return { success: true, user: safeUser };
  });

// 4. Update user role
export const serverUpdateUserRole = createServerFn({ method: "POST" })
  .validator((data: UpdateRoleServerInput) => data)
  .handler(async ({ data }): Promise<{ success: boolean; user?: AppUser; error?: string }> => {
    const users = await readUsersFromDisk();
    const target = users.find(
      (u) => u.id === data.userId || u.email.toLowerCase() === data.userId.toLowerCase(),
    );

    if (!target) {
      return { success: false, error: "User not found." };
    }

    target.role = data.role;
    await writeUsersToDisk(users);

    const { passwordHash: _, ...safeUser } = target;
    return { success: true, user: safeUser };
  });

// 5. Delete user
export const serverDeleteUser = createServerFn({ method: "POST" })
  .validator((data: DeleteUserServerInput) => data)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    let users = await readUsersFromDisk();
    const normalized = data.userId.trim().toLowerCase();
    const target = users.find((u) => u.id === data.userId || u.email.toLowerCase() === normalized);
    if (!target) {
      return { success: false, error: "User not found" };
    }

    if (target.email.toLowerCase() === FOUNDER_EMAIL.toLowerCase()) {
      return { success: false, error: "Cannot delete the primary Founder account." };
    }

    users = users.filter((u) => u.id !== data.userId && u.email.toLowerCase() !== normalized);
    await writeUsersToDisk(users);
    return { success: true };
  });

// 6. Reset password
export const serverResetPassword = createServerFn({ method: "POST" })
  .validator((data: ResetPassServerInput) => data)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const normalized = data.email.trim().toLowerCase();
    const users = await readUsersFromDisk();
    const target = users.find((u) => u.email.toLowerCase() === normalized);

    if (!target) {
      return { success: false, error: "No account found matching this email." };
    }

    target.passwordHash = data.newPassword;
    await writeUsersToDisk(users);
    return { success: true };
  });
