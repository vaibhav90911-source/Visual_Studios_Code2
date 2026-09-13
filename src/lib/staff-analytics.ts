export interface VoiceChannelActivity {
  channelName: string;
  hours: number;
  sessionsCount: number;
  lastActive?: string;
}

export interface TextChannelActivity {
  channelName: string;
  count: number;
}

export interface WorkLogEntry {
  id: string;
  date: string;
  task: string;
  details: string;
  hoursSpent?: number;
}

export interface StaffWorkSummary {
  recordingsHosted: number;
  takesSupervised: number;
  ticketsResolved: number;
  activityScore: number; // 0-100
  performanceRating: "Legendary" | "Elite" | "Very Active" | "Solid" | "Needs Improvement";
  notes: string;
  recentWorkLogs: WorkLogEntry[];
}

export type StaffRole =
  | "Founder"
  | "Manager"
  | "Recording Manager"
  | "Recording Team"
  | "Recording Support"
  | "Trial Staff";

export function normalizeStaffRole(role: string): StaffRole {
  if (role === "Super Admin" || role === "Founder") return "Founder";
  if (role === "Admin" || role === "Manager") return "Manager";
  if (role === "Lead Staff" || role === "Recording Manager") return "Recording Manager";
  if (role === "Recording Staff" || role === "Recording Team") return "Recording Team";
  if (role === "Moderator" || role === "Recording Support") return "Recording Support";
  if (role === "Trial Staff") return "Trial Staff";
  return "Recording Team";
}

export interface StaffMember {
  id: string;
  discordUserId: string; // Required Discord Snowflake ID
  displayName: string;
  discordTag: string;
  role: StaffRole;
  avatarUrl?: string;
  joinedAt: string;
  status: "In Voice" | "Active" | "Idle" | "Offline";
  currentVc: string | null;
  totalVcHours: number;
  vcBreakdown: VoiceChannelActivity[];
  totalMessages: number;
  messagesThisWeek: number;
  topTextChannels: TextChannelActivity[];
  work: StaffWorkSummary;
  lastSeen: string;
}

const STORAGE_KEY = "vs_staff_analytics_v5";

// Empty initial staff roster - no fake players or mock users
const DEFAULT_STAFF: StaffMember[] = [];

// Disallowed fake user identifiers
const FAKE_USER_IDS = new Set([
  "staff-aryan",
  "staff-vaibhav",
  "staff-1",
  "staff-2",
  "staff-3",
  "staff-4",
  "staff-5",
  "694201948271049281",
  "782910481920394812",
  "829104918204910293",
  "918204918201948201",
  "930192039481920394",
  "610294819203948102",
  "892109481920394810",
  "aryan",
  "vaibhav",
  "kairo",
  "zelux sound",
  "maya (production)",
  "maya (audits)",
  "apex moderator",
]);

export function getStaffList(): StaffMember[] {
  if (typeof window === "undefined") return DEFAULT_STAFF;
  try {
    // Clear out old v1/v2/v3/v4 storage keys if they contained test users
    if (localStorage.getItem("vs_staff_analytics_v4")) {
      localStorage.removeItem("vs_staff_analytics_v4");
    }
    if (localStorage.getItem("vs_staff_analytics_v3")) {
      localStorage.removeItem("vs_staff_analytics_v3");
    }
    if (localStorage.getItem("vs_staff_analytics_v2")) {
      localStorage.removeItem("vs_staff_analytics_v2");
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STAFF));
      return DEFAULT_STAFF;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_STAFF;
    }
    const sanitized: StaffMember[] = (parsed as StaffMember[])
      .filter((m) => {
        return (
          !FAKE_USER_IDS.has(m.id) &&
          !FAKE_USER_IDS.has(m.discordUserId) &&
          !FAKE_USER_IDS.has((m.displayName || "").toLowerCase().trim())
        );
      })
      .map((m) => ({
        ...m,
        role: normalizeStaffRole(m.role),
      }));

    if (sanitized.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    }
    return sanitized;
  } catch {
    return DEFAULT_STAFF;
  }
}

function saveStaffList(list: StaffMember[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("vs_staff_analytics_updated"));
  } catch (err) {
    console.error("Failed to save staff analytics:", err);
  }
}

export function getStaffMember(id: string): StaffMember | undefined {
  const list = getStaffList();
  return list.find((m) => m.id === id || m.discordUserId === id);
}

export interface NewStaffInput {
  discordUserId: string;
  displayName: string;
  discordTag: string;
  role: StaffRole;
  avatarUrl?: string;
  primaryVcName?: string;
  initialVcHours?: number;
  initialMessages?: number;
  recordingsHosted?: number;
  takesSupervised?: number;
  ticketsResolved?: number;
  notes?: string;
}

export function addStaffMember(input: NewStaffInput): StaffMember {
  const list = getStaffList();

  // Validate Discord User ID: ensure digits
  const cleanDiscordId = input.discordUserId.trim().replace(/[^0-9]/g, "");
  const primaryVc = input.primaryVcName?.trim() || "🎙️ Recording Booth #1";
  const vcHours = Number(input.initialVcHours) || 0;
  const messages = Number(input.initialMessages) || 0;
  const recordings = Number(input.recordingsHosted) || 0;
  const takes = Number(input.takesSupervised) || 0;
  const tickets = Number(input.ticketsResolved) || 0;

  // Calculate rating based on work done
  const totalPoints = vcHours * 2 + messages * 0.05 + recordings * 10 + takes * 5;
  let performanceRating: StaffWorkSummary["performanceRating"] = "Solid";
  let activityScore = 75;
  if (totalPoints > 250) {
    performanceRating = "Legendary";
    activityScore = 98;
  } else if (totalPoints > 150) {
    performanceRating = "Elite";
    activityScore = 93;
  } else if (totalPoints > 80) {
    performanceRating = "Very Active";
    activityScore = 88;
  }

  const newStaff: StaffMember = {
    id: `staff-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    discordUserId: cleanDiscordId || input.discordUserId.trim(),
    displayName: input.displayName.trim(),
    discordTag:
      input.discordTag.trim() || `${input.displayName.toLowerCase().replace(/\s+/g, "_")}#0001`,
    role: input.role,
    avatarUrl:
      input.avatarUrl?.trim() ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanDiscordId || input.displayName}`,
    joinedAt: new Date().toISOString().split("T")[0] ?? "2026-01-01",
    status: "Active",
    currentVc: null,
    totalVcHours: vcHours,
    vcBreakdown: [
      {
        channelName: primaryVc,
        hours: vcHours,
        sessionsCount: Math.max(1, Math.round(vcHours / 2)),
        lastActive: "Recent",
      },
    ],
    totalMessages: messages,
    messagesThisWeek: Math.round(messages * 0.15),
    topTextChannels: [
      { channelName: "#general", count: Math.round(messages * 0.5) },
      { channelName: "#staff-coordination", count: Math.round(messages * 0.3) },
      { channelName: "#recording-schedule", count: Math.round(messages * 0.2) },
    ],
    work: {
      recordingsHosted: recordings,
      takesSupervised: takes,
      ticketsResolved: tickets,
      activityScore,
      performanceRating,
      notes:
        input.notes?.trim() ||
        `Registered by Founder with Discord User ID ${cleanDiscordId}. Active studio staff member.`,
      recentWorkLogs: [
        {
          id: `log-${Date.now()}`,
          date: "Today",
          task: "Staff Member Profile Initialized",
          details: `Registered with Discord User ID ${cleanDiscordId}. Initial work baseline recorded.`,
          hoursSpent: 1,
        },
      ],
    },
    lastSeen: "Just added",
  };

  const updated = [newStaff, ...list];
  saveStaffList(updated);
  return newStaff;
}

export function updateStaffMember(
  id: string,
  updates: Partial<StaffMember>,
): StaffMember | undefined {
  const list = getStaffList();
  const index = list.findIndex((m) => m.id === id);
  if (index === -1) return undefined;

  const current = list[index];
  if (!current) return undefined;

  const updatedMember: StaffMember = {
    ...current,
    ...updates,
    work: {
      ...current.work,
      ...(updates.work || {}),
    },
  };

  // Recalculate totalVcHours if vcBreakdown was updated
  if (updates.vcBreakdown) {
    updatedMember.totalVcHours = updates.vcBreakdown.reduce(
      (acc, vc) => acc + (Number(vc.hours) || 0),
      0,
    );
  }

  list[index] = updatedMember;
  saveStaffList(list);
  return updatedMember;
}

export function deleteStaffMember(id: string): void {
  const list = getStaffList();
  const filtered = list.filter((m) => m.id !== id);
  saveStaffList(filtered);
}

export function addVcSessionToStaff(
  staffId: string,
  vcName: string,
  hours: number,
  notes?: string,
): void {
  const staff = getStaffMember(staffId);
  if (!staff) return;

  const cleanVcName = vcName.trim();
  const addedHours = Number(hours) || 0;
  if (addedHours <= 0 || !cleanVcName) return;

  const breakdown = [...staff.vcBreakdown];
  const existingIndex = breakdown.findIndex(
    (b) => b.channelName.toLowerCase() === cleanVcName.toLowerCase(),
  );

  const existing = breakdown[existingIndex];
  if (existing) {
    breakdown[existingIndex] = {
      channelName: existing.channelName,
      hours: Number((existing.hours + addedHours).toFixed(1)),
      sessionsCount: existing.sessionsCount + 1,
      lastActive: "Just now",
    };
  } else {
    breakdown.push({
      channelName: cleanVcName,
      hours: addedHours,
      sessionsCount: 1,
      lastActive: "Just now",
    });
  }

  const newTotalHours = breakdown.reduce((acc, b) => acc + b.hours, 0);

  const logs = [...staff.work.recentWorkLogs];
  logs.unshift({
    id: `log-${Date.now()}`,
    date: "Today",
    task: `Voice Session in ${cleanVcName}`,
    details: notes || `Logged ${addedHours}h active voice time in ${cleanVcName}.`,
    hoursSpent: addedHours,
  });

  updateStaffMember(staff.id, {
    totalVcHours: Number(newTotalHours.toFixed(1)),
    vcBreakdown: breakdown,
    work: {
      ...staff.work,
      recentWorkLogs: logs.slice(0, 15),
    },
  });
}

export function logStaffWork(
  staffId: string,
  task: string,
  details: string,
  recordingsCount = 0,
  takesCount = 0,
  ticketsCount = 0,
  hoursSpent = 0,
): void {
  const staff = getStaffMember(staffId);
  if (!staff) return;

  const logs = [...staff.work.recentWorkLogs];
  const newLog: WorkLogEntry = {
    id: `log-${Date.now()}`,
    date: "Today",
    task,
    details,
  };
  if (hoursSpent > 0) {
    newLog.hoursSpent = hoursSpent;
  }
  logs.unshift(newLog);

  const updatedRecordings = staff.work.recordingsHosted + (Number(recordingsCount) || 0);
  const updatedTakes = staff.work.takesSupervised + (Number(takesCount) || 0);
  const updatedTickets = staff.work.ticketsResolved + (Number(ticketsCount) || 0);

  updateStaffMember(staff.id, {
    work: {
      ...staff.work,
      recordingsHosted: updatedRecordings,
      takesSupervised: updatedTakes,
      ticketsResolved: updatedTickets,
      recentWorkLogs: logs.slice(0, 20),
    },
  });
}

export function resetStaffToDefault(): void {
  saveStaffList(DEFAULT_STAFF);
}
