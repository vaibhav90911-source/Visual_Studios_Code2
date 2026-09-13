import ExcelJS from "exceljs";
import { supabase } from "@/integrations/supabase/client";
import { db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

export type RecordingStatus = "completed" | "pending" | "cancelled" | "rescheduled";

export type Recording = {
  id: string;
  session_date: string;
  creator: string;
  start_time: string;
  end_time: string;
  players: string;
  players_needed?: number | string | null;
  assigned_to: string;
  status: RecordingStatus;
  notes: string;
  review: string;
  screenshot_path: string | null;
  created_at: string;
  updated_at: string;
};

export type RecordingInput = Omit<Recording, "id" | "created_at" | "updated_at">;

const RECORDINGS_STORAGE_KEY = "vs_recordings_store_v3";
const PROOF_BUCKET = "recording-proofs";
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

export const STATUSES: RecordingStatus[] = ["pending", "completed", "rescheduled", "cancelled"];

export const STATUS_LABEL: Record<RecordingStatus, string> = {
  pending: "Pending",
  completed: "Completed",
  cancelled: "Cancelled",
  rescheduled: "Rescheduled",
};

export const INITIAL_RECORDINGS: Recording[] = [];

function broadcastRecordingsChange() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("vs_recordings_updated"));
    if ("BroadcastChannel" in window) {
      const bc = new BroadcastChannel("vs_recordings_channel");
      bc.postMessage({ type: "RECORDINGS_UPDATED", timestamp: Date.now() });
      bc.close();
    }
  } catch {
    // Ignored
  }
}

export function getLocalRecordings(): Recording[] {
  if (typeof window === "undefined") return INITIAL_RECORDINGS;
  try {
    const raw = localStorage.getItem(RECORDINGS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(RECORDINGS_STORAGE_KEY, JSON.stringify(INITIAL_RECORDINGS));
      return INITIAL_RECORDINGS;
    }
    const list = JSON.parse(raw) as Recording[];
    // Remove any mock demo recordings
    const cleaned = list.filter(
      (r) =>
        r.id !== "rec-cinematic-01" &&
        r.id !== "rec-raid-02" &&
        r.id !== "rec-community-03" &&
        r.id !== "rec-stream-04",
    );
    if (cleaned.length !== list.length) {
      localStorage.setItem(RECORDINGS_STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return INITIAL_RECORDINGS;
  }
}

function saveLocalRecordings(recordings: Recording[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RECORDINGS_STORAGE_KEY, JSON.stringify(recordings));
    broadcastRecordingsChange();
  } catch (err) {
    console.error("Failed to save recordings locally", err);
  }
}

export function subscribeToRecordings(callback: (recordings: Recording[]) => void): () => void {
  let active = true;

  const handleLocalUpdate = () => {
    if (active) callback(getLocalRecordings());
  };

  if (typeof window !== "undefined") {
    window.addEventListener("vs_recordings_updated", handleLocalUpdate);
  }

  let channel: BroadcastChannel | null = null;
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      channel = new BroadcastChannel("vs_recordings_channel");
      channel.onmessage = () => {
        if (active) callback(getLocalRecordings());
      };
    } catch {
      // Ignored
    }
  }

  let unsubFirestore = () => {};
  try {
    const q = query(collection(db, "recordings"), orderBy("session_date", "desc"));
    unsubFirestore = onSnapshot(
      q,
      (snapshot) => {
        if (!active) return;
        if (!snapshot.empty) {
          const recs: Recording[] = [];
          snapshot.forEach((docSnap) => {
            recs.push(docSnap.data() as Recording);
          });
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(RECORDINGS_STORAGE_KEY, JSON.stringify(recs));
            } catch {
              // Ignored
            }
          }
          callback(recs);
        }
      },
      (err) => {
        console.warn("[Recordings] Firestore listener notice:", err);
      },
    );
  } catch {
    // Ignored
  }

  return () => {
    active = false;
    if (typeof window !== "undefined") {
      window.removeEventListener("vs_recordings_updated", handleLocalUpdate);
    }
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

export const emptyRecording = (): RecordingInput => ({
  session_date: new Date().toISOString().slice(0, 10),
  creator: "",
  start_time: "18:00",
  end_time: "19:30",
  players: "",
  players_needed: "",
  assigned_to: "",
  status: "pending",
  notes: "",
  review: "",
  screenshot_path: null,
});

export async function fetchRecordings(): Promise<Recording[]> {
  try {
    const q = query(collection(db, "recordings"), orderBy("session_date", "desc"));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const recs: Recording[] = [];
      snap.forEach((docSnap) => {
        recs.push(docSnap.data() as Recording);
      });
      saveLocalRecordings(recs);
      return recs;
    }
  } catch (err) {
    console.warn("Firestore fetch recordings skipped or offline:", err);
  }

  try {
    const { data, error } = await supabase
      .from("recordings")
      .select("*")
      .order("session_date", { ascending: false })
      .order("start_time", { ascending: true });

    if (!error && data && data.length > 0) {
      return data as Recording[];
    }
  } catch {
    // Supabase fallback
  }

  return getLocalRecordings();
}

export async function createRecording(input: RecordingInput): Promise<Recording> {
  const newRec: Recording = {
    id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ...input,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const list = getLocalRecordings();
  list.unshift(newRec);
  saveLocalRecordings(list);

  try {
    await setDoc(doc(db, "recordings", newRec.id), newRec);
  } catch (err) {
    console.warn("Firestore setDoc recording skipped:", err);
  }

  try {
    const { players_needed: _, ...dbRecord } = input;
    await supabase.from("recordings").insert(dbRecord as never);
  } catch (err) {
    console.warn("Supabase insert recording skipped:", err);
  }

  return newRec;
}

export async function updateRecording(id: string, input: RecordingInput): Promise<void> {
  const list = getLocalRecordings();
  const index = list.findIndex((r) => r.id === id);
  let updatedRec: Recording | null = null;
  if (index !== -1) {
    const current = list[index];
    if (current) {
      updatedRec = {
        ...current,
        ...input,
        updated_at: new Date().toISOString(),
      };
      list[index] = updatedRec;
      saveLocalRecordings(list);
    }
  }

  if (updatedRec) {
    try {
      await setDoc(doc(db, "recordings", id), updatedRec, { merge: true });
    } catch (err) {
      console.warn("Firestore update recording skipped:", err);
    }
  }

  try {
    const { players_needed: _, ...dbRecord } = input;
    await supabase
      .from("recordings")
      .update(dbRecord as never)
      .eq("id", id);
  } catch (err) {
    console.warn("Supabase update recording skipped:", err);
  }
}

export async function deleteRecording(id: string): Promise<void> {
  const list = getLocalRecordings().filter((r) => r.id !== id);
  saveLocalRecordings(list);

  try {
    await deleteDoc(doc(db, "recordings", id));
  } catch (err) {
    console.warn("Firestore delete recording skipped:", err);
  }

  try {
    await supabase.from("recordings").delete().eq("id", id);
  } catch (err) {
    console.warn("Supabase delete recording skipped:", err);
  }
}

export async function clearAllRecordings(): Promise<void> {
  saveLocalRecordings([]);

  try {
    const snap = await getDocs(collection(db, "recordings"));
    const deletePromises = snap.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);
  } catch (err) {
    console.warn("Firestore clearAllRecordings skipped:", err);
  }

  try {
    await supabase.from("recordings").delete().neq("id", "");
  } catch (err) {
    console.warn("Supabase clear recordings skipped:", err);
  }
}

export async function uploadRecordingScreenshot(file: File): Promise<string> {
  if (file.size > MAX_SCREENSHOT_BYTES) {
    throw new Error("Proof screenshot must be 5 MB or smaller");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Upload an image file (PNG, JPG, WebP)");
  }

  // Try Supabase Storage upload
  try {
    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "png";
    const path = `proofs/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from(PROOF_BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
    if (!error) return path;
  } catch {
    // Local fallback
  }

  // Fallback to Data URL for in-browser review proof
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function fetchProofUrls(paths: string[]): Promise<Record<string, string>> {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  if (uniquePaths.length === 0) return {};

  const result: Record<string, string> = {};

  // For data URLs or external URLs, pass through directly
  for (const p of uniquePaths) {
    if (p.startsWith("http://") || p.startsWith("https://") || p.startsWith("data:")) {
      result[p] = p;
    }
  }

  try {
    const storagePaths = uniquePaths.filter((p) => !result[p]);
    if (storagePaths.length > 0) {
      const { data, error } = await supabase.storage
        .from(PROOF_BUCKET)
        .createSignedUrls(storagePaths, 60 * 60);

      if (!error && data) {
        for (const item of data) {
          if (item.path && item.signedUrl) {
            result[item.path] = item.signedUrl;
          }
        }
      }
    }
  } catch {
    // Ignore storage lookup error
  }

  return result;
}

/**
 * Professional, colorful Excel export of recordings using ExcelJS
 * Features rich visual themes, status KPI badges, auto-filtering, and frozen headers
 */
export async function exportRecordingsToExcel(
  recordings: Recording[],
  filenamePrefix = "Visual_Studios_Recordings",
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Visual Studios Production Management";
  workbook.lastModifiedBy = "Visual Studios System";
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet("Recordings Roster", {
    views: [{ state: "frozen", ySplit: 6, activeCell: "A7", showGridLines: true }],
    properties: { tabColor: { argb: "FF4338CA" }, defaultRowHeight: 22 },
  });

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const currentTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Calculate status counts for the top KPI summary bar
  const totalCount = recordings.length;
  const completedCount = recordings.filter((r) => r.status === "completed").length;
  const pendingCount = recordings.filter((r) => r.status === "pending").length;
  const rescheduledCount = recordings.filter((r) => r.status === "rescheduled").length;
  const cancelledCount = recordings.filter((r) => r.status === "cancelled").length;

  // Set explicit column configurations with generous widths
  worksheet.columns = [
    { key: "index", width: 7 },
    { key: "date", width: 16 },
    { key: "creator", width: 32 },
    { key: "start_time", width: 14 },
    { key: "end_time", width: 14 },
    { key: "players_needed", width: 18 },
    { key: "assigned_to", width: 26 },
    { key: "status", width: 18 },
  ];

  // ==========================================
  // ROW 1: Brand Title Banner
  // ==========================================
  worksheet.mergeCells("A1:H1");
  const titleRow = worksheet.getRow(1);
  titleRow.height = 36;
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "VISUAL STUDIOS  —  PRODUCTION RECORDINGS ROSTER";
  titleCell.font = { name: "Segoe UI", size: 15, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E1B4B" }, // Deep Midnight Indigo
  };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };

  // ==========================================
  // ROW 2: Subtitle & Timestamp
  // ==========================================
  worksheet.mergeCells("A2:H2");
  const subRow = worksheet.getRow(2);
  subRow.height = 20;
  const subCell = worksheet.getCell("A2");
  subCell.value = `Exported: ${currentDate} at ${currentTime}  •  Total Sessions Logged: ${totalCount}`;
  subCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FFC7D2FE" } };
  subCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF312E81" }, // Royal Indigo
  };
  subCell.alignment = { vertical: "middle", horizontal: "center" };

  // ==========================================
  // ROW 3: Spacer
  // ==========================================
  const spacerRow = worksheet.getRow(3);
  spacerRow.height = 8;

  // ==========================================
  // ROW 4: KPI Summary Cards Bar
  // ==========================================
  const kpiRow = worksheet.getRow(4);
  kpiRow.height = 26;

  // Format KPI helper
  const styleKpiCell = (
    cellRef: string,
    label: string,
    val: number,
    bgArgb: string,
    textArgb: string,
    borderArgb: string,
  ) => {
    const c = worksheet.getCell(cellRef);
    c.value = `${label}: ${val}`;
    c.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: textArgb } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };
    c.alignment = { vertical: "middle", horizontal: "center" };
    c.border = {
      top: { style: "thin", color: { argb: borderArgb } },
      bottom: { style: "thin", color: { argb: borderArgb } },
      left: { style: "thin", color: { argb: borderArgb } },
      right: { style: "thin", color: { argb: borderArgb } },
    };
  };

  worksheet.mergeCells("A4:B4");
  styleKpiCell("A4", "Total Sessions", totalCount, "FFEEF2FF", "FF3730A3", "FFC7D2FE");
  styleKpiCell("C4", "Completed", completedCount, "FFDCFCE7", "FF166534", "FF86EFAC");
  styleKpiCell("D4", "Pending", pendingCount, "FFFEF3C7", "FF92400E", "FFFDE68A");
  styleKpiCell("E4", "Rescheduled", rescheduledCount, "FFEDE9FE", "FF5B21B6", "FFDDD6FE");
  worksheet.mergeCells("F4:H4");
  styleKpiCell("F4", "Cancelled / Skipped", cancelledCount, "FFFFE4E6", "FF9F1239", "FFFECDD3");

  // ==========================================
  // ROW 5: Spacer
  // ==========================================
  const spacerRow2 = worksheet.getRow(5);
  spacerRow2.height = 8;

  // ==========================================
  // ROW 6: Table Headers
  // ==========================================
  const headerRow = worksheet.getRow(6);
  headerRow.height = 28;

  const headers = [
    { col: "A6", title: "#", align: "center" as const },
    { col: "B6", title: "SESSION DATE", align: "center" as const },
    { col: "C6", title: "CREATOR", align: "left" as const },
    { col: "D6", title: "START TIME", align: "center" as const },
    { col: "E6", title: "END TIME", align: "center" as const },
    { col: "F6", title: "PLAYERS NEEDED", align: "center" as const },
    { col: "G6", title: "ASSIGNED STAFF", align: "left" as const },
    { col: "H6", title: "STATUS", align: "center" as const },
  ];

  headers.forEach((h) => {
    const c = worksheet.getCell(h.col);
    c.value = h.title;
    c.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4338CA" }, // Vibrant Indigo Header
    };
    c.alignment = { vertical: "middle", horizontal: h.align };
    c.border = {
      top: { style: "medium", color: { argb: "FF312E81" } },
      bottom: { style: "medium", color: { argb: "FF1E1B4B" } },
      left: { style: "thin", color: { argb: "FF6366F1" } },
      right: { style: "thin", color: { argb: "FF6366F1" } },
    };
  });

  // Enable AutoFilter on row 6 across columns A to H
  worksheet.autoFilter = {
    from: { row: 6, column: 1 },
    to: { row: 6 + Math.max(recordings.length, 1), column: 8 },
  };

  // Thin border for data cells
  const dataCellBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    left: { style: "thin", color: { argb: "FFE2E8F0" } },
    right: { style: "thin", color: { argb: "FFE2E8F0" } },
  };

  // Status color palettes (matching app design system)
  const statusStyles: Record<string, { bg: string; text: string; border: string; label: string }> =
    {
      completed: {
        bg: "FFDCFCE7", // Mint Green
        text: "FF166534",
        border: "FF86EFAC",
        label: "COMPLETED",
      },
      pending: {
        bg: "FFFEF3C7", // Warm Amber
        text: "FF92400E",
        border: "FFFDE68A",
        label: "PENDING",
      },
      rescheduled: {
        bg: "FFEDE9FE", // Soft Purple
        text: "FF5B21B6",
        border: "FFDDD6FE",
        label: "RESCHEDULED",
      },
      cancelled: {
        bg: "FFFFE4E6", // Soft Rose
        text: "FF9F1239",
        border: "FFFECDD3",
        label: "CANCELLED",
      },
    };

  // ==========================================
  // DATA ROWS (Row 7 onwards)
  // ==========================================
  recordings.forEach((r, idx) => {
    const rowNum = 7 + idx;
    const row = worksheet.getRow(rowNum);
    row.height = 24;

    const isEven = idx % 2 === 0;
    const zebraBg = isEven ? "FFFFFFFF" : "FFF8FAFC";

    // 1. Index
    const cIdx = worksheet.getCell(`A${rowNum}`);
    cIdx.value = idx + 1;
    cIdx.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF64748B" } };
    cIdx.alignment = { vertical: "middle", horizontal: "center" };
    cIdx.fill = { type: "pattern", pattern: "solid", fgColor: { argb: zebraBg } };
    cIdx.border = dataCellBorder;

    // 2. Session Date
    const cDate = worksheet.getCell(`B${rowNum}`);
    cDate.value = r.session_date;
    cDate.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF1E293B" } };
    cDate.alignment = { vertical: "middle", horizontal: "center" };
    cDate.fill = { type: "pattern", pattern: "solid", fgColor: { argb: zebraBg } };
    cDate.border = dataCellBorder;

    // 3. Creator
    const cCreator = worksheet.getCell(`C${rowNum}`);
    cCreator.value = r.creator;
    cCreator.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FF0F172A" } };
    cCreator.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    cCreator.fill = { type: "pattern", pattern: "solid", fgColor: { argb: zebraBg } };
    cCreator.border = dataCellBorder;

    // 4. Start Time
    const cStart = worksheet.getCell(`D${rowNum}`);
    cStart.value = r.start_time;
    cStart.font = { name: "Segoe UI", size: 10, color: { argb: "FF334155" } };
    cStart.alignment = { vertical: "middle", horizontal: "center" };
    cStart.fill = { type: "pattern", pattern: "solid", fgColor: { argb: zebraBg } };
    cStart.border = dataCellBorder;

    // 5. End Time
    const cEnd = worksheet.getCell(`E${rowNum}`);
    cEnd.value = r.end_time;
    cEnd.font = { name: "Segoe UI", size: 10, color: { argb: "FF334155" } };
    cEnd.alignment = { vertical: "middle", horizontal: "center" };
    cEnd.fill = { type: "pattern", pattern: "solid", fgColor: { argb: zebraBg } };
    cEnd.border = dataCellBorder;

    // 6. Players Needed
    const cPlayers = worksheet.getCell(`F${rowNum}`);
    const hasPlayers =
      r.players_needed !== undefined && r.players_needed !== null && r.players_needed !== "";
    cPlayers.value = hasPlayers ? Number(r.players_needed) || String(r.players_needed) : "—";
    cPlayers.font = {
      name: "Segoe UI",
      size: 10,
      bold: hasPlayers,
      color: { argb: hasPlayers ? "FF1E293B" : "FF94A3B8" },
    };
    cPlayers.alignment = { vertical: "middle", horizontal: "center" };
    cPlayers.fill = { type: "pattern", pattern: "solid", fgColor: { argb: zebraBg } };
    cPlayers.border = dataCellBorder;

    // 7. Assigned Staff
    const cStaff = worksheet.getCell(`G${rowNum}`);
    cStaff.value = r.assigned_to || "Unassigned";
    cStaff.font = {
      name: "Segoe UI",
      size: 10,
      italic: !r.assigned_to,
      color: { argb: r.assigned_to ? "FF334155" : "FF94A3B8" },
    };
    cStaff.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    cStaff.fill = { type: "pattern", pattern: "solid", fgColor: { argb: zebraBg } };
    cStaff.border = dataCellBorder;

    // 8. Status Badge (Full-color pill styling)
    const cStatus = worksheet.getCell(`H${rowNum}`);
    const stConfig = statusStyles[r.status] || {
      bg: "FFF1F5F9",
      text: "FF475569",
      border: "FFE2E8F0",
      label: STATUS_LABEL[r.status] || r.status.toUpperCase(),
    };
    cStatus.value = stConfig.label;
    cStatus.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: stConfig.text } };
    cStatus.alignment = { vertical: "middle", horizontal: "center" };
    cStatus.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: stConfig.bg },
    };
    cStatus.border = {
      top: { style: "thin", color: { argb: stConfig.border } },
      bottom: { style: "thin", color: { argb: stConfig.border } },
      left: { style: "thin", color: { argb: stConfig.border } },
      right: { style: "thin", color: { argb: stConfig.border } },
    };
  });

  // Generate binary XLSX buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const todayStr = new Date().toISOString().slice(0, 10);
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `${filenamePrefix}_${todayStr}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
