import type { AppRole, AppUser } from "./auth-types";
import { isStaffOrAbove, ROLE_LABEL } from "./auth-types";
import { playAssignmentChime } from "./sound";
import { toast } from "sonner";

export const EVERYONE_STAFF_VALUE = "👥 All Recording Staff (Everyone)";

export interface StaffOption {
  id: string;
  name: string;
  role: AppRole;
  roleLabel: string;
  avatarUrl?: string;
  isEveryone?: boolean;
}

/**
 * Returns a clean, deduplicated list of staff options who have role "Recording Team" (staff) or above.
 */
export function getEligibleStaffOptions(users: AppUser[]): StaffOption[] {
  const options: StaffOption[] = [
    {
      id: "all_staff",
      name: EVERYONE_STAFF_VALUE,
      role: "staff",
      roleLabel: "Recording Team & Above",
      isEveryone: true,
    },
  ];

  const seen = new Set<string>();

  // Filter users with role staff or above
  const staffUsers = users.filter((u) => isStaffOrAbove(u.role));

  // Sort by rank: super_admin first, then admin, then staff
  const rankOrder: Record<AppRole, number> = {
    chairman: 4,
    super_admin: 3,
    admin: 2,
    staff: 1,
    user: 0,
  };

  staffUsers.sort((a, b) => {
    const diff = rankOrder[b.role] - rankOrder[a.role];
    if (diff !== 0) return diff;
    return a.display_name.localeCompare(b.display_name);
  });

  for (const u of staffUsers) {
    const key = u.display_name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      options.push({
        id: u.id,
        name: `${u.display_name} (${ROLE_LABEL[u.role]})`,
        role: u.role,
        roleLabel: ROLE_LABEL[u.role],
      });
    }
  }

  // If no staff found from users yet (e.g. initial setup), provide default Founder / Lead options
  if (options.length === 1) {
    options.push(
      {
        id: "kabir-founder",
        name: "Kabir (Founder)",
        role: "super_admin",
        roleLabel: "Founder",
      },
      {
        id: "recording-team-general",
        name: "Visual Studios Recording Team",
        role: "staff",
        roleLabel: "Recording Team",
      },
    );
  }

  return options;
}

/**
 * Check if a recording is assigned to the given user.
 */
export function isAssignedToUser(
  assignedTo: string | undefined | null,
  user: AppUser | null,
): boolean {
  if (!assignedTo || !user) return false;

  const assignedLower = assignedTo.toLowerCase();
  const userNameLower = (user.display_name || "").toLowerCase().trim();
  const userEmailLower = (user.email || "").toLowerCase().trim();

  // If assigned to "Everyone" or "All Recording Staff"
  if (
    assignedLower.includes("all recording staff") ||
    assignedLower.includes("everyone") ||
    assignedLower.includes("all staff")
  ) {
    return isStaffOrAbove(user.role);
  }

  if (userNameLower && assignedLower.includes(userNameLower)) {
    return true;
  }

  if (userEmailLower && assignedLower.includes(userEmailLower)) {
    return true;
  }

  return false;
}

const ACKNOWLEDGED_ASSIGNMENTS_KEY = "vs_acknowledged_assignments_v1";

function getAcknowledgedAssignmentIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(ACKNOWLEDGED_ASSIGNMENTS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function acknowledgeAssignment(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const set = getAcknowledgedAssignmentIds();
    set.add(id);
    localStorage.setItem(ACKNOWLEDGED_ASSIGNMENTS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Ignored
  }
}

/**
 * Notify user of new assignment with sound chime and toast
 */
export function triggerAssignmentNotification(
  recording: { id: string; creator: string; session_date: string; start_time?: string },
  isImmediate = false,
): void {
  const ackSet = getAcknowledgedAssignmentIds();
  if (ackSet.has(recording.id) && !isImmediate) return;

  acknowledgeAssignment(recording.id);

  // Play crisp studio chime
  playAssignmentChime();

  // Show Toast
  toast.info(`🔔 New Recording Assigned to You!`, {
    description: `Session with ${recording.creator} on ${recording.session_date}${
      recording.start_time ? ` at ${recording.start_time}` : ""
    }`,
    duration: 7000,
    action: {
      label: "View Schedule",
      onClick: () => {
        if (typeof window !== "undefined") {
          window.location.href = "/panel";
        }
      },
    },
  });
}
