import { createRecording } from "./recordings";
import { db } from "./firebase";
import { collection, doc, setDoc, deleteDoc, getDocs, onSnapshot } from "firebase/firestore";

export type BookingStatus = "pending" | "accepted" | "rejected" | "completed";
export type BookingTier = "free" | "paid";
export type ServerType = "player_server" | "studio_hosted";

export const MAX_FREE_DURATION_HOURS = 1.5;
export const MAX_FREE_PLAYERS = 12;

export interface BookingRequest {
  id: string;
  created_at: string;
  playerName: string;
  discordTag: string;
  contactEmail?: string;
  sessionType: string;
  preferredDate: string;
  preferredTime: string;
  durationHours: number;
  playersCount: number;
  serverType: ServerType;
  serverIp?: string;
  tier: BookingTier;
  hasDiscordTicket?: boolean;
  ticketNumber?: string;
  description: string;
  status: BookingStatus;
  adminNotes?: string;
  assignedStaff?: string;
  acceptedAt?: string;
  recordingId?: string;
}

const STORAGE_KEY = "vs_player_bookings_v1";

// Helper to broadcast bookings update to all open tabs and windows
function broadcastBookingsSync() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("vs_bookings_updated"));
    if ("BroadcastChannel" in window) {
      try {
        const channel = new BroadcastChannel("vs_bookings_channel");
        channel.postMessage({ type: "SYNC_BOOKINGS", timestamp: Date.now() });
        channel.close();
      } catch {
        // Ignored
      }
    }
  }
}

// Ensure object has no undefined keys that could trigger Firestore errors
function sanitizeBooking(b: BookingRequest): BookingRequest {
  return {
    id: b.id,
    created_at: b.created_at || new Date().toISOString(),
    playerName: b.playerName || "",
    discordTag: b.discordTag || "",
    contactEmail: b.contactEmail || "",
    sessionType: b.sessionType || "SMP Episode",
    preferredDate: b.preferredDate || "",
    preferredTime: b.preferredTime || "Flexible",
    durationHours: Number(b.durationHours) || 1,
    playersCount: Number(b.playersCount) || 1,
    serverType: b.serverType || "player_server",
    serverIp: b.serverIp || "",
    tier: b.tier || "free",
    hasDiscordTicket: Boolean(b.hasDiscordTicket),
    ticketNumber: b.ticketNumber || "",
    description: b.description || "",
    status: b.status || "pending",
    adminNotes: b.adminNotes || "",
    assignedStaff: b.assignedStaff || "",
    acceptedAt: b.acceptedAt || "",
    recordingId: b.recordingId || "",
  };
}

export function calculateBookingTier(
  durationHours: number,
  playersCount: number,
  serverType: ServerType,
): BookingTier {
  if (
    durationHours > MAX_FREE_DURATION_HOURS ||
    playersCount > MAX_FREE_PLAYERS ||
    serverType === "studio_hosted"
  ) {
    return "paid";
  }
  return "free";
}

export function getBookings(): BookingRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => {
      const duration = Number(item.durationHours) || 1;
      const players = Number(item.playersCount) || 1;
      const serverType = item.serverType || "player_server";
      return {
        ...item,
        durationHours: duration,
        playersCount: players,
        serverType: serverType,
        tier: item.tier || calculateBookingTier(duration, players, serverType),
      };
    });
  } catch (err) {
    console.error("Failed to load bookings:", err);
    return [];
  }
}

function saveBookings(bookings: BookingRequest[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
    broadcastBookingsSync();
  } catch (err) {
    console.error("Failed to save bookings:", err);
  }
}

export function createBooking(input: {
  playerName: string;
  discordTag: string;
  contactEmail?: string;
  sessionType: string;
  preferredDate: string;
  preferredTime: string;
  durationHours: number;
  playersCount: number;
  serverType?: ServerType;
  serverIp?: string;
  hasDiscordTicket?: boolean;
  ticketNumber?: string;
  description: string;
}): BookingRequest {
  const code = Math.floor(1000 + Math.random() * 9000);
  const id = `VS-BK-${code}`;

  const durationHours = Number(input.durationHours) || 1;
  const playersCount = Number(input.playersCount) || 1;
  const serverType: ServerType = input.serverType || "player_server";
  const tier = calculateBookingTier(durationHours, playersCount, serverType);

  const rawBooking: BookingRequest = {
    id,
    created_at: new Date().toISOString(),
    playerName: input.playerName.trim(),
    discordTag: input.discordTag.trim(),
    contactEmail: input.contactEmail?.trim() || "",
    sessionType: input.sessionType || "SMP Episode",
    preferredDate: input.preferredDate,
    preferredTime: input.preferredTime || "Flexible / Custom Time",
    durationHours,
    playersCount,
    serverType,
    serverIp: input.serverIp?.trim() || "",
    tier,
    hasDiscordTicket: input.hasDiscordTicket ?? Boolean(input.ticketNumber?.trim()),
    ticketNumber: input.ticketNumber?.trim() || "",
    description: input.description.trim(),
    status: "pending",
  };

  const newBooking = sanitizeBooking(rawBooking);

  // 1. Immediately save to local state
  const list = getBookings();
  const existingIdx = list.findIndex((b) => b.id === newBooking.id);
  if (existingIdx !== -1) {
    list[existingIdx] = newBooking;
  } else {
    list.unshift(newBooking);
  }
  saveBookings(list);

  // 2. Sync to Real-Time Cloud Firestore
  try {
    void setDoc(doc(db, "bookings", newBooking.id), newBooking).catch((e) =>
      console.warn("Firestore save booking notice:", e),
    );
  } catch (err) {
    console.warn("Firestore booking sync error:", err);
  }

  // NOTE: Recording is intentionally NOT created here upon submission.
  // Recording entry is only created when staff/admin accepts & schedules the booking.

  return newBooking;
}

export function updateBookingStatus(
  id: string,
  status: BookingStatus,
  adminNotes?: string,
  assignedStaff?: string,
): BookingRequest | null {
  const list = getBookings();
  const idx = list.findIndex((b) => b.id === id);
  if (idx === -1) return null;

  const current = list[idx]!;
  const updated: BookingRequest = sanitizeBooking({
    ...current,
    status,
    adminNotes: adminNotes !== undefined ? adminNotes : current.adminNotes,
    assignedStaff: assignedStaff !== undefined ? assignedStaff : current.assignedStaff,
    acceptedAt: status === "accepted" ? new Date().toISOString() : current.acceptedAt,
  });

  // If status is changed to accepted and it doesn't have a recordingId yet, create the recording entry!
  if (status === "accepted" && !updated.recordingId) {
    const serverInfoText =
      updated.serverType === "player_server"
        ? `Server (Player): ${updated.serverIp || "Provided in Discord"}`
        : "Server: Visual Studios Dedicated Hosted";

    const notesText = `Booking #${updated.id} [${updated.tier.toUpperCase()} TIER] (${updated.sessionType}) | Creator: ${updated.playerName} | Discord: ${updated.discordTag}${updated.ticketNumber ? ` | Ticket: ${updated.ticketNumber}` : ""} | Players: ${updated.playersCount} | Duration: ${updated.durationHours}h | ${serverInfoText} | Time: ${updated.preferredTime}. ${updated.description ? `Notes: ${updated.description}` : ""}`;

    void createRecording({
      session_date: updated.preferredDate || new Date().toISOString().split("T")[0]!,
      creator: updated.playerName,
      assigned_to: assignedStaff || "Visual Studios Recording Team",
      players: `${updated.playerName} + ${Math.max(0, updated.playersCount - 1)} others (${updated.discordTag})`,
      status: "pending",
      notes: notesText,
      proof_type: "none",
      proof_url: "",
    })
      .then((rec) => {
        if (rec?.id) {
          updated.recordingId = rec.id;
          const freshList = getBookings();
          const fIdx = freshList.findIndex((b) => b.id === id);
          if (fIdx !== -1) {
            freshList[fIdx] = updated;
            saveBookings(freshList);
          }
          setDoc(doc(db, "bookings", id), { recordingId: rec.id }, { merge: true }).catch(() => {});
        }
      })
      .catch((e) => {
        console.warn("[Bookings] Create recording on accept error:", e);
      });
  }

  list[idx] = updated;
  saveBookings(list);

  // Sync to Firestore
  try {
    setDoc(doc(db, "bookings", id), updated, { merge: true }).catch((e) =>
      console.warn("Firestore update booking status notice:", e),
    );
  } catch (err) {
    console.warn("Firestore update booking error:", err);
  }

  return updated;
}

export async function acceptBookingAndCreateRecording(
  bookingId: string,
  staffName: string,
  adminNotes?: string,
): Promise<{ booking: BookingRequest; recordingId: string } | null> {
  const list = getBookings();
  const idx = list.findIndex((b) => b.id === bookingId);
  if (idx === -1) return null;

  const booking = list[idx]!;

  const serverInfoText =
    booking.serverType === "player_server"
      ? `Server (Player): ${booking.serverIp || "Provided in Discord"}`
      : "Server: Visual Studios Dedicated Hosted";

  const notesText = `Booking #${booking.id} [${booking.tier.toUpperCase()} TIER] (${booking.sessionType}) | Creator: ${booking.playerName} | Discord: ${booking.discordTag}${booking.ticketNumber ? ` | Ticket: ${booking.ticketNumber}` : ""} | Players: ${booking.playersCount} | Duration: ${booking.durationHours}h | ${serverInfoText} | Time: ${booking.preferredTime}. ${booking.description ? `Notes: ${booking.description}` : ""}`;

  let createdRecId = booking.recordingId || "";
  try {
    const rec = await createRecording({
      session_date: booking.preferredDate || new Date().toISOString().split("T")[0]!,
      creator: booking.playerName,
      assigned_to: staffName || "Kabir (Founder)",
      players: `${booking.playerName} + ${Math.max(0, booking.playersCount - 1)} others (${booking.discordTag})`,
      status: "pending",
      notes: notesText,
      proof_type: "none",
      proof_url: "",
    });
    createdRecId = rec.id;
  } catch (e) {
    console.error("Failed to auto-create recording entry:", e);
  }

  const updatedBooking: BookingRequest = sanitizeBooking({
    ...booking,
    status: "accepted",
    adminNotes:
      adminNotes ||
      `Accepted by ${staffName}. Scheduled for ${booking.preferredDate} at ${booking.preferredTime}.`,
    assignedStaff: staffName,
    acceptedAt: new Date().toISOString(),
    recordingId: createdRecId || undefined,
  });

  list[idx] = updatedBooking;
  saveBookings(list);

  // Sync to Firestore
  try {
    setDoc(doc(db, "bookings", bookingId), updatedBooking, { merge: true }).catch((e) =>
      console.warn("Firestore accept booking notice:", e),
    );
  } catch (err) {
    console.warn("Firestore accept booking sync error:", err);
  }

  return { booking: updatedBooking, recordingId: createdRecId };
}

export function deleteBooking(id: string): boolean {
  const list = getBookings();
  const filtered = list.filter((b) => b.id !== id);
  if (filtered.length !== list.length) {
    saveBookings(filtered);

    // Delete on Firestore
    try {
      deleteDoc(doc(db, "bookings", id)).catch((e) =>
        console.warn("Firestore delete booking notice:", e),
      );
    } catch (err) {
      console.warn("Firestore delete booking error:", err);
    }
    return true;
  }
  return false;
}

export async function clearAllBookings(): Promise<void> {
  saveBookings([]);

  try {
    const snap = await getDocs(collection(db, "bookings"));
    const deletePromises = snap.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);
  } catch (err) {
    console.warn("Firestore clearAllBookings skipped:", err);
  }
}

// Live listener for real-time synchronization across all devices
export function subscribeToBookings(callback: (bookings: BookingRequest[]) => void): () => void {
  let active = true;

  // 1. Instantly deliver local cache
  callback(getBookings());

  // 2. Initial fetch from Firestore
  getDocs(collection(db, "bookings"))
    .then((snapshot) => {
      if (!active) return;
      if (!snapshot.empty) {
        const list: BookingRequest[] = [];
        snapshot.forEach((d) => list.push(sanitizeBooking(d.data() as BookingRequest)));
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        saveBookings(list);
        callback(list);
      }
    })
    .catch((err) => {
      console.warn("Firestore bookings fetch notice:", err);
    });

  // 3. Multi-tab BroadcastChannel listener
  let channel: BroadcastChannel | null = null;
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      channel = new BroadcastChannel("vs_bookings_channel");
      channel.onmessage = () => {
        if (active) {
          callback(getBookings());
        }
      };
    } catch {
      // Ignored
    }
  }

  // 4. Firestore real-time onSnapshot listener
  let unsubFirestore = () => {};
  try {
    unsubFirestore = onSnapshot(
      collection(db, "bookings"),
      (snapshot) => {
        if (!active) return;
        if (!snapshot.empty) {
          const list: BookingRequest[] = [];
          snapshot.forEach((d) => list.push(sanitizeBooking(d.data() as BookingRequest)));
          list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          saveBookings(list);
          callback(list);
        }
      },
      (err) => {
        console.warn("Firestore bookings listener notice:", err);
      },
    );
  } catch {
    // Ignored
  }

  return () => {
    active = false;
    unsubFirestore();
    if (channel) {
      try {
        channel.close();
      } catch {
        // Ignored
      }
    }
  };
}

export function searchBookings(query: string): BookingRequest[] {
  const list = getBookings();
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (b) =>
      b.id.toLowerCase().includes(q) ||
      b.playerName.toLowerCase().includes(q) ||
      b.discordTag.toLowerCase().includes(q) ||
      (b.ticketNumber && b.ticketNumber.toLowerCase().includes(q)) ||
      (b.contactEmail && b.contactEmail.toLowerCase().includes(q)) ||
      b.sessionType.toLowerCase().includes(q) ||
      b.description.toLowerCase().includes(q),
  );
}
