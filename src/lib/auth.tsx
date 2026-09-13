import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { db } from "./firebase";
import { doc, setDoc, deleteDoc, collection, onSnapshot } from "firebase/firestore";
import {
  type AppRole,
  type AppUser,
  ROLE_LABEL,
  ROLES,
  RANK,
  isStaffOrAbove,
  isSuperAdmin,
  isAdminOrSuperAdmin,
  isChairman,
  canManageRoles,
} from "./auth-types";
import {
  authenticateLocalUser,
  registerLocalUser,
  getCurrentLocalSession,
  setCurrentLocalSession,
  getStoredUsers,
  saveStoredUsers,
  updateUserRoleInStorage,
  deleteUserFromStorage,
  recordPasswordResetRequest,
  resetLocalUserPassword,
  INITIAL_SUPER_ADMINS,
} from "./auth-storage";
import {
  serverGetUsers,
  serverAuthenticateUser,
  serverRegisterUser,
  serverUpdateUserRole,
  serverDeleteUser,
  serverResetPassword,
} from "./auth-server";

export {
  type AppRole,
  type AppUser,
  ROLE_LABEL,
  ROLES,
  RANK,
  isStaffOrAbove,
  isSuperAdmin,
  isAdminOrSuperAdmin,
  isChairman,
  canManageRoles,
};

type AuthContextType = {
  session: Session | null;
  user: AppUser | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    pass: string,
    displayName: string,
    requestedRole?: AppRole,
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; token?: string; error?: string }>;
  confirmPasswordReset: (
    email: string,
    pass: string,
  ) => Promise<{ success: boolean; error?: string }>;
  updateUserRole: (
    userId: string,
    newRole: AppRole,
  ) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  createUser: (
    email: string,
    pass: string,
    displayName: string,
    requestedRole?: AppRole,
  ) => Promise<{ success: boolean; error?: string }>;
  allUsers: AppUser[];
  refreshUsers: () => void;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  signOut: async () => {},
  resetPassword: async () => ({ success: false }),
  confirmPasswordReset: async () => ({ success: false }),
  updateUserRole: async () => ({ success: false }),
  deleteUser: async () => ({ success: false }),
  createUser: async () => ({ success: false }),
  allUsers: [],
  refreshUsers: () => {},
});

function isSupabaseConfigured(): boolean {
  if (typeof window === "undefined") return false;
  const url = import.meta.env["VITE_SUPABASE_URL"];
  return Boolean(
    url && typeof url === "string" && !url.includes("placeholder") && url.startsWith("http"),
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);

  const userRef = useRef(user);
  userRef.current = user;
  const roleRef = useRef(role);
  roleRef.current = role;

  // Function to broadcast updates to other tabs in real-time
  const broadcastSync = useCallback(() => {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const channel = new BroadcastChannel("vs_auth_sync_channel");
        channel.postMessage({ type: "SYNC_USERS", timestamp: Date.now() });
        channel.close();
      } catch {
        // Ignored
      }
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    if (typeof window === "undefined") return;

    // Fast local memory/storage load
    const stored = getStoredUsers().map(({ passwordHash: _, ...u }) => u);
    setAllUsers((prev) => {
      if (
        prev.length === stored.length &&
        prev.every(
          (p, i) =>
            p.id === stored[i]?.id &&
            p.role === stored[i]?.role &&
            p.display_name === stored[i]?.display_name,
        )
      ) {
        return prev;
      }
      return stored;
    });

    // Live Server Synchronization (works across all browsers, devices, and sessions)
    try {
      const serverUsers = await serverGetUsers();
      if (Array.isArray(serverUsers) && serverUsers.length > 0) {
        setAllUsers((prev) => {
          if (
            prev.length === serverUsers.length &&
            prev.every(
              (p, i) =>
                p.id === serverUsers[i]?.id &&
                p.role === serverUsers[i]?.role &&
                p.display_name === serverUsers[i]?.display_name,
            )
          ) {
            return prev;
          }
          return serverUsers;
        });

        // Keep local cache up to date with server state (including deletions)
        const localList = getStoredUsers();
        const updatedLocalList = serverUsers.map((su) => {
          const match = localList.find(
            (lu) => lu.id === su.id || lu.email.toLowerCase() === su.email.toLowerCase(),
          );
          return {
            ...su,
            passwordHash: match ? match.passwordHash : "",
          };
        });
        saveStoredUsers(updatedLocalList);

        // If currently logged-in user had their role or details changed remotely, update them live!
        const activeLocal = getCurrentLocalSession();
        const currentUser = userRef.current || activeLocal;
        const currentEmail = (currentUser?.email || "").toLowerCase();
        if (currentEmail) {
          const matchedMe = serverUsers.find((u) => u.email.toLowerCase() === currentEmail);
          if (matchedMe) {
            if (
              matchedMe.role !== roleRef.current ||
              matchedMe.display_name !== currentUser?.display_name
            ) {
              setUser(matchedMe);
              setRole(matchedMe.role);
              setCurrentLocalSession(matchedMe);
            }
          }
        }
      }
    } catch (err) {
      console.warn("[Auth] Background server users sync notice:", err);
    }
  }, []);

  useEffect(() => {
    let active = true;

    // Load initial users
    void refreshUsers();

    // Check existing local session first on mount
    const localSession = getCurrentLocalSession();
    if (localSession) {
      setUser(localSession);
      setRole(localSession.role);
    }
    setLoading(false);

    // Instant real-time polling every 3 seconds to immediately reflect registrations & updates
    const pollInterval = setInterval(() => {
      if (active) {
        void refreshUsers();
      }
    }, 3000);

    // Refetch when tab becomes focused or visible
    const onFocus = () => {
      if (active) void refreshUsers();
    };
    const onVisibility = () => {
      if (active && !document.hidden) void refreshUsers();
    };
    const onStorage = (e: StorageEvent) => {
      if (active && e.key?.startsWith("vs_")) void refreshUsers();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("storage", onStorage);

    // Multi-tab BroadcastChannel listener
    let channel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        channel = new BroadcastChannel("vs_auth_sync_channel");
        channel.onmessage = () => {
          if (active) void refreshUsers();
        };
      } catch {
        // Ignored
      }
    }

    // Firestore live users collection listener
    let unsubFirestoreUsers = () => {};
    try {
      unsubFirestoreUsers = onSnapshot(
        collection(db, "users"),
        (snapshot) => {
          if (!active) return;
          if (!snapshot.empty) {
            void refreshUsers();
          }
        },
        (err) => {
          console.warn("[Auth] Firestore users listener notice:", err);
        },
      );
    } catch {
      // Ignored
    }

    // Only attempt remote Supabase auth if actually configured with a real URL
    if (isSupabaseConfigured()) {
      const checkSupabase = async () => {
        try {
          const { data } = await supabase.auth.getSession();
          if (!active) return;
          if (data.session) {
            setSession(data.session);
            const email = data.session.user.email?.toLowerCase();
            const matched = email
              ? getStoredUsers().find((u) => u.email.toLowerCase() === email)
              : null;
            if (matched) {
              setUser(matched);
              setRole(matched.role);
              setCurrentLocalSession(matched);
            }
          }
        } catch (e) {
          console.warn("[Auth] Supabase session check fallback to local state", e);
        }
      };

      void checkSupabase();

      const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!active) return;
        setSession(nextSession ?? null);
        if (nextSession?.user.email) {
          const email = nextSession.user.email.toLowerCase();
          const matched = getStoredUsers().find((u) => u.email.toLowerCase() === email);
          if (matched) {
            setUser(matched);
            setRole(matched.role);
            setCurrentLocalSession(matched);
          }
        }
      });

      return () => {
        active = false;
        clearInterval(pollInterval);
        window.removeEventListener("focus", onFocus);
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("storage", onStorage);
        if (channel) {
          try {
            channel.close();
          } catch {
            // Cleanup error ignored
          }
        }
        sub.subscription.unsubscribe();
      };
    }

    return () => {
      active = false;
      clearInterval(pollInterval);
      unsubFirestoreUsers();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("storage", onStorage);
      if (channel) {
        try {
          channel.close();
        } catch {
          // Cleanup error ignored
        }
      }
    };
  }, [refreshUsers]);

  const signIn = async (
    email: string,
    pass: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !pass) {
      return { success: false, error: "Please enter both email and password." };
    }

    // 1. Authenticate with Central Server (authoritative across all devices and browsers)
    try {
      const serverRes = await serverAuthenticateUser({
        data: { email: normalized, password: pass },
      });

      if (serverRes.success && serverRes.user) {
        setUser(serverRes.user);
        setRole(serverRes.user.role);
        setCurrentLocalSession(serverRes.user);

        // Ensure user is also saved locally
        registerLocalUser(normalized, pass, serverRes.user.display_name, serverRes.user.role);

        const syntheticSession: Partial<Session> = {
          access_token: `token-${serverRes.user.id}`,
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: `refresh-${serverRes.user.id}`,
          user: {
            id: serverRes.user.id,
            app_metadata: {},
            user_metadata: { display_name: serverRes.user.display_name },
            aud: "authenticated",
            created_at: serverRes.user.created_at,
            email: serverRes.user.email,
          } as unknown as Session["user"],
        };
        setSession(syntheticSession as Session);

        broadcastSync();
        void refreshUsers();
        return { success: true };
      }

      if (serverRes.error && serverRes.error.includes("Invalid password")) {
        return { success: false, error: serverRes.error };
      }
    } catch (serverErr) {
      console.warn("[Auth] Server auth encountered issue, trying local cache:", serverErr);
    }

    // 2. Check local stored accounts and designated super admins as robust fallback
    const localAuth = authenticateLocalUser(normalized, pass);
    if (localAuth.user) {
      setUser(localAuth.user);
      setRole(localAuth.user.role);
      setCurrentLocalSession(localAuth.user);

      // Create a compatible synthetic session object
      const syntheticSession: Partial<Session> = {
        access_token: `token-${localAuth.user.id}`,
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: `refresh-${localAuth.user.id}`,
        user: {
          id: localAuth.user.id,
          app_metadata: {},
          user_metadata: { display_name: localAuth.user.display_name },
          aud: "authenticated",
          created_at: localAuth.user.created_at,
          email: localAuth.user.email,
        } as unknown as Session["user"],
      };
      setSession(syntheticSession as Session);

      if (isSupabaseConfigured()) {
        try {
          void supabase.auth.signInWithPassword({ email: normalized, password: pass });
        } catch {
          // Ignored
        }
      }

      broadcastSync();
      void refreshUsers();
      return { success: true };
    }

    // 3. If Supabase is not configured, return clear error immediately
    if (!isSupabaseConfigured()) {
      return { success: false, error: localAuth.error || "Invalid email or password." };
    }

    // 4. Attempt remote Supabase auth if local match failed
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalized,
        password: pass,
      });
      if (error) {
        return { success: false, error: error.message };
      }
      if (data.session) {
        setSession(data.session);
        const resolvedUser: AppUser = {
          id: data.session.user.id,
          email: normalized,
          display_name:
            data.session.user.user_metadata?.["display_name"] || normalized.split("@")[0],
          role: "user",
          created_at: new Date().toISOString(),
        };
        setUser(resolvedUser);
        setRole(resolvedUser.role);
        setCurrentLocalSession(resolvedUser);
        broadcastSync();
        void refreshUsers();
        return { success: true };
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to sign in.";
      return { success: false, error: msg };
    }

    return { success: false, error: localAuth.error || "Invalid email or password." };
  };

  const signUp = async (
    email: string,
    pass: string,
    displayName: string,
    requestedRole: AppRole = "user",
  ): Promise<{ success: boolean; error?: string }> => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !pass) {
      return { success: false, error: "Please enter both email and password." };
    }
    if (pass.length < 6) {
      return { success: false, error: "Password must be at least 6 characters." };
    }

    // 1. Register on Server (persisted in data/users.json for all devices)
    try {
      const serverRes = await serverRegisterUser({
        data: {
          email: normalized,
          password: pass,
          displayName: displayName.trim(),
          role: requestedRole,
        },
      });

      if (!serverRes.success || !serverRes.user) {
        return { success: false, error: serverRes.error || "Registration failed." };
      }

      // Also cache in local storage
      registerLocalUser(normalized, pass, serverRes.user.display_name, serverRes.user.role);

      // Automatically sign in the newly registered user
      setUser(serverRes.user);
      setRole(serverRes.user.role);
      setCurrentLocalSession(serverRes.user);

      const syntheticSession: Partial<Session> = {
        access_token: `token-${serverRes.user.id}`,
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: `refresh-${serverRes.user.id}`,
        user: {
          id: serverRes.user.id,
          app_metadata: {},
          user_metadata: { display_name: serverRes.user.display_name },
          aud: "authenticated",
          created_at: serverRes.user.created_at,
          email: serverRes.user.email,
        } as unknown as Session["user"],
      };
      setSession(syntheticSession as Session);

      try {
        void setDoc(doc(db, "users", serverRes.user.id), {
          id: serverRes.user.id,
          email: serverRes.user.email,
          display_name: serverRes.user.display_name,
          role: serverRes.user.role,
          created_at: serverRes.user.created_at,
        }).catch((e) => console.warn("[Auth] Firestore user sync notice:", e));
      } catch {
        // Ignored
      }

      broadcastSync();
      void refreshUsers();
      return { success: true };
    } catch (serverErr) {
      console.warn("[Auth] Server registration error, falling back locally:", serverErr);
      const res = registerLocalUser(normalized, pass, displayName, requestedRole);
      if (!res.user) {
        return { success: false, error: res.error || "Registration failed" };
      }

      setUser(res.user);
      setRole(res.user.role);
      setCurrentLocalSession(res.user);

      const syntheticSession: Partial<Session> = {
        access_token: `token-${res.user.id}`,
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: `refresh-${res.user.id}`,
        user: {
          id: res.user.id,
          app_metadata: {},
          user_metadata: { display_name: res.user.display_name },
          aud: "authenticated",
          created_at: res.user.created_at,
          email: res.user.email,
        } as unknown as Session["user"],
      };
      setSession(syntheticSession as Session);

      broadcastSync();
      void refreshUsers();
      return { success: true };
    }
  };

  const createUser = async (
    email: string,
    pass: string,
    displayName: string,
    requestedRole: AppRole = "user",
  ): Promise<{ success: boolean; error?: string }> => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !pass) {
      return { success: false, error: "Please enter both email and password." };
    }
    if (pass.length < 6) {
      return { success: false, error: "Password must be at least 6 characters." };
    }

    // Always create account on Server so user can log in immediately from ANY device or browser!
    try {
      const serverRes = await serverRegisterUser({
        data: {
          email: normalized,
          password: pass,
          displayName: displayName.trim(),
          role: requestedRole,
        },
      });

      if (!serverRes.success) {
        return { success: false, error: serverRes.error || "Account creation failed." };
      }

      // Also register locally without changing the Founder's current login session
      registerLocalUser(normalized, pass, displayName, requestedRole);

      if (serverRes.user) {
        try {
          void setDoc(doc(db, "users", serverRes.user.id), {
            id: serverRes.user.id,
            email: serverRes.user.email,
            display_name: serverRes.user.display_name,
            role: serverRes.user.role,
            created_at: serverRes.user.created_at,
          }).catch((e) => console.warn("[Auth] Firestore user create sync notice:", e));
        } catch {
          // Ignored
        }
      }

      broadcastSync();
      void refreshUsers();
      return { success: true };
    } catch (serverErr) {
      console.warn("[Auth] Server user creation error, falling back locally:", serverErr);
      const res = registerLocalUser(normalized, pass, displayName, requestedRole);
      if (!res.user) {
        return { success: false, error: res.error || "Account creation failed" };
      }

      broadcastSync();
      void refreshUsers();
      return { success: true };
    }
  };

  const signOut = async () => {
    setCurrentLocalSession(null);
    setUser(null);
    setRole(null);
    setSession(null);
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignored
      }
    }
    broadcastSync();
  };

  const resetPassword = async (
    email: string,
  ): Promise<{ success: boolean; token?: string; error?: string }> => {
    const normalized = email.trim().toLowerCase();
    const result = recordPasswordResetRequest(normalized);

    // Also trigger Supabase reset in parallel
    try {
      void supabase.auth.resetPasswordForEmail(normalized, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch {
      // Ignored
    }

    return { success: true, token: result.token };
  };

  const confirmPasswordReset = async (
    email: string,
    newPass: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const normalized = email.trim().toLowerCase();
    const res = resetLocalUserPassword(normalized, newPass);

    try {
      await serverResetPassword({
        data: { email: normalized, newPassword: newPass },
      });
    } catch (serverErr) {
      console.warn("[Auth] Server password reset error:", serverErr);
    }

    if (!res.success) {
      return { success: false, error: res.error || "Password reset failed" };
    }

    try {
      void supabase.auth.updateUser({ password: newPass });
    } catch {
      // Ignored
    }

    broadcastSync();
    void refreshUsers();
    return { success: true };
  };

  const updateUserRole = async (
    userId: string,
    newRole: AppRole,
  ): Promise<{ success: boolean; error?: string }> => {
    // 1. Update locally
    const res = updateUserRoleInStorage(userId, newRole);

    // If active user is updated, update active state
    if (user && (user.id === userId || user.email.toLowerCase() === userId.toLowerCase())) {
      const updated = { ...user, role: newRole };
      setUser(updated);
      setRole(newRole);
      setCurrentLocalSession(updated);
    }

    // 2. Update on Server (persists for all devices and clients)
    try {
      await serverUpdateUserRole({
        data: { userId, role: newRole },
      });
    } catch (serverErr) {
      console.warn("[Auth] Server role update error:", serverErr);
    }

    // 3. Update in Firestore users collection
    try {
      void setDoc(
        doc(db, "users", userId),
        { role: newRole, updated_at: new Date().toISOString() },
        { merge: true },
      ).catch((e) => console.warn("[Auth] Firestore role sync notice:", e));
    } catch {
      // Ignored
    }

    // Try Supabase user_roles table if connected
    try {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    } catch {
      // Handled locally
    }

    broadcastSync();
    void refreshUsers();
    return res;
  };

  const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    const normalized = userId.trim().toLowerCase();
    // Immediate optimistic state update to prevent UI flicker
    setAllUsers((prev) =>
      prev.filter((u) => u.id !== userId && u.email.toLowerCase() !== normalized),
    );

    const res = deleteUserFromStorage(userId);

    try {
      await serverDeleteUser({
        data: { userId },
      });
    } catch (serverErr) {
      console.warn("[Auth] Server delete user error:", serverErr);
    }

    // Delete in Firestore
    try {
      void deleteDoc(doc(db, "users", userId)).catch((e) =>
        console.warn("[Auth] Firestore delete user notice:", e),
      );
    } catch {
      // Ignored
    }

    broadcastSync();
    void refreshUsers();
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        role,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        confirmPasswordReset,
        updateUserRole,
        deleteUser,
        createUser,
        allUsers,
        refreshUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
