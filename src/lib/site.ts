import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/auth-types";
import { getStoredUsers, updateUserRoleInStorage } from "@/lib/auth-storage";

export type SiteContent = { key: string; title: string; body: string };

const SITE_CONTENT_STORAGE_KEY = "vs_site_content_v2";

const DEFAULT_SITE_CONTENT: Record<string, SiteContent> = {
  rules: {
    key: "rules",
    title: "Visual Studios Community & Recording Rules",
    body: `1. Respect & Professionalism: Treat all creators, staff, and players with respect. Zero tolerance for harassment, toxicity, or hate speech.
2. Session Punctuality: Arrive 5 minutes before your scheduled recording session. Notify staff at least 2 hours in advance if you cannot make it.
3. Audio & Studio Etiquette: Ensure clean microphone audio, minimize background noise, and respect recording director cues.
4. Content Privacy: Do not leak unreleased gameplay, raw footage, or private studio links without Founder approval.
5. In-Game Coordination: Adhere strictly to the session script and server rules. No unauthorized disruptions.
6. Review & Proof Compliance: Session proof (screenshots or video links) is recommended for verification by Recording Team and Managers.
7. Decisions: Recording Team and Founder decisions are final. Obey recording guidelines at all times.`,
  },
  about: {
    key: "about",
    title: "About Visual Studios",
    body: `Visual Studios is a premier recording and production collective built around clean production, high-caliber creator collaboration, and reliable scheduling.

We plan competitive sessions, log every recording take, maintain proof of finished work, and coordinate creators so the whole team stays synced on upcoming projects.

Join our Discord to meet the crew, get invited to recording sessions, and stay up to date with everything happening in the studio.`,
  },
  home: {
    key: "home",
    title: "Visual Studios Production Network",
    body: "The official recording hub for Visual Studios. Join our Discord community to participate in upcoming recording sessions, collaborate with creators, and stay up to date with all studio releases.",
  },
};

function getLocalSiteContent(): Record<string, SiteContent> {
  if (typeof window === "undefined") return DEFAULT_SITE_CONTENT;
  try {
    const raw = localStorage.getItem(SITE_CONTENT_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SITE_CONTENT_STORAGE_KEY, JSON.stringify(DEFAULT_SITE_CONTENT));
      return DEFAULT_SITE_CONTENT;
    }
    return { ...DEFAULT_SITE_CONTENT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SITE_CONTENT;
  }
}

function saveLocalSiteContent(key: string, entry: SiteContent) {
  if (typeof window === "undefined") return;
  try {
    const current = getLocalSiteContent();
    current[key] = entry;
    localStorage.setItem(SITE_CONTENT_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.error("Failed to save site content locally", err);
  }
}

export async function fetchSiteContent(key: string): Promise<SiteContent> {
  const local = getLocalSiteContent();
  try {
    const { data, error } = await supabase
      .from("site_content")
      .select("key, title, body")
      .eq("key", key)
      .maybeSingle();

    if (!error && data?.title) {
      return data;
    }
  } catch {
    // Supabase fallback
  }

  return local[key] ?? DEFAULT_SITE_CONTENT[key] ?? { key, title: "", body: "" };
}

export async function fetchAllSiteContent(): Promise<SiteContent[]> {
  const local = getLocalSiteContent();
  try {
    const { data, error } = await supabase
      .from("site_content")
      .select("key, title, body")
      .order("key");

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch {
    // Supabase fallback
  }

  return Object.values(local);
}

export async function saveSiteContent(entry: SiteContent) {
  // Save locally first so UI updates immediately
  saveLocalSiteContent(entry.key, entry);

  try {
    const { error } = await supabase.from("site_content").upsert({
      key: entry.key,
      title: entry.title,
      body: entry.body,
      updated_at: new Date().toISOString(),
    });
    if (error) console.warn("Remote site content update skipped:", error.message);
  } catch (err) {
    console.warn("Remote site content sync error:", err);
  }
}

export type Member = {
  id: string;
  email: string;
  display_name: string;
  role: AppRole;
};

export async function fetchMembers(): Promise<Member[]> {
  try {
    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      supabase.from("profiles").select("id, email, display_name").order("email"),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    if (!pErr && !rErr && profiles && profiles.length > 0) {
      const roleMap = new Map<string, AppRole>();
      for (const row of roles ?? []) roleMap.set(row.user_id, row.role as AppRole);

      return profiles.map((p) => ({
        id: p.id,
        email: p.email,
        display_name: p.display_name,
        role: roleMap.get(p.id) ?? "user",
      }));
    }
  } catch {
    // Fallback to local
  }

  // Fallback to local storage users
  const localUsers = getStoredUsers();
  return localUsers.map((u) => ({
    id: u.id,
    email: u.email,
    display_name: u.display_name,
    role: u.role,
  }));
}

export async function setMemberRole(userId: string, role: AppRole) {
  updateUserRoleInStorage(userId, role);

  try {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    await supabase.from("user_roles").insert({ user_id: userId, role });
  } catch (err) {
    console.warn("Supabase user_roles sync skipped:", err);
  }
}
