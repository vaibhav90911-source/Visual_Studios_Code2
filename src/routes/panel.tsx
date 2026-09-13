import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Crown,
  Download,
  Edit,
  Eye,
  FileSpreadsheet,
  Film,
  Globe,
  Inbox,
  KeyRound,
  Lock,
  MessageSquare,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Send,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  Video,
  Volume2,
  VolumeX,
  Bell,
  X,
  XCircle,
} from "lucide-react";

import logo from "@/assets/vs-logo.png.asset.json";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  useAuth,
  isStaffOrAbove,
  isSuperAdmin,
  isAdminOrSuperAdmin,
  ROLE_LABEL,
  ROLES,
  RANK,
  canManageRoles,
  isChairman,
  type AppRole,
  type AppUser,
} from "@/lib/auth";
import {
  fetchRecordings,
  createRecording,
  updateRecording,
  deleteRecording,
  uploadRecordingScreenshot,
  exportRecordingsToExcel,
  emptyRecording,
  subscribeToRecordings,
  STATUS_LABEL,
  STATUSES,
  type Recording,
  type RecordingInput,
  type RecordingStatus,
} from "@/lib/recordings";
import { fetchAllSiteContent, saveSiteContent, type SiteContent } from "@/lib/site";
import { DISCORD_INVITE } from "@/lib/discord.functions";
import { StaffAnalyticsManager } from "@/components/StaffAnalyticsManager";
import { StaffSelector } from "@/components/StaffSelector";
import {
  isAssignedToUser,
  triggerAssignmentNotification,
  EVERYONE_STAFF_VALUE,
} from "@/lib/staff-assignment";
import { playAssignmentChime, isSoundMuted, toggleSoundMute } from "@/lib/sound";
import {
  getBookings,
  updateBookingStatus,
  deleteBooking,
  acceptBookingAndCreateRecording,
  subscribeToBookings,
  type BookingRequest,
  type BookingStatus,
} from "@/lib/bookings";

export const Route = createFileRoute("/panel")({
  head: () => ({
    meta: [
      { title: "Control Panel — Visual Studios" },
      {
        name: "description",
        content: "Visual Studios staff and admin control panel for recordings, roles, and content.",
      },
    ],
  }),
  component: ControlPanelPage,
});

function ControlPanelPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, role, allUsers, loading, updateUserRole, deleteUser, createUser, refreshUsers } =
    useAuth();

  const [activeTab, setActiveTab] = useState<
    "recordings" | "bookings" | "roles" | "content" | "analytics"
  >("recordings");

  // Sound notification mute status
  const [isAudioMuted, setIsAudioMuted] = useState(() => isSoundMuted());

  const handleToggleMute = () => {
    const next = toggleSoundMute();
    setIsAudioMuted(next);
    toast.info(next ? "Audio alerts muted." : "Audio alerts enabled! (Chime active)");
  };

  const handleTestChime = () => {
    playAssignmentChime();
    toast.success("🔔 Tested recording assignment sound chime!");
  };

  // Recordings states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecordingId, setEditingRecordingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<RecordingInput>(emptyRecording());
  const [isSavingRecording, setIsSavingRecording] = useState(false);
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);

  // Bookings state
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>("all");
  const [selectedBookingForAction, setSelectedBookingForAction] = useState<BookingRequest | null>(
    null,
  );
  const [bookingStaffToAssign, setBookingStaffToAssign] = useState<string>("");
  const [actionModalType, setActionModalType] = useState<
    "accept_and_record" | "accept" | "reject" | null
  >(null);
  const [adminNoteInput, setAdminNoteInput] = useState("");
  const [isProcessingBooking, setIsProcessingBooking] = useState(false);

  // Sync Bookings
  const refreshBookings = useCallback(() => {
    setBookings(getBookings());
  }, []);

  // Listen to bookings and recordings update events and real-time Firestore synchronization
  useEffect(() => {
    refreshBookings();
    const handleUpdate = () => refreshBookings();
    window.addEventListener("vs_bookings_updated", handleUpdate);
    const unsubBookings = subscribeToBookings((liveList) => {
      setBookings(liveList);
    });

    const unsubRecordings = subscribeToRecordings((liveRecordings) => {
      queryClient.setQueryData(["recordings"], liveRecordings);
    });

    return () => {
      window.removeEventListener("vs_bookings_updated", handleUpdate);
      unsubBookings();
      unsubRecordings();
    };
  }, [refreshBookings, queryClient]);

  // Content editing state
  const [rulesTitle, setRulesTitle] = useState("");
  const [rulesBody, setRulesBody] = useState("");
  const [aboutTitle, setAboutTitle] = useState("");
  const [aboutBody, setAboutBody] = useState("");
  const [homeTitle, setHomeTitle] = useState("");
  const [homeBody, setHomeBody] = useState("");
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);

  // New Player state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPass, setNewUserPass] = useState("");
  const [newUserRole, setNewUserRole] = useState<AppRole>("user");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false);

  // Filtered users for real-time control panel management
  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
      const q = userSearch.toLowerCase().trim();
      const matchesQuery =
        !q ||
        u.email.toLowerCase().includes(q) ||
        u.display_name.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q);
      return matchesRole && matchesQuery;
    });
  }, [allUsers, userRoleFilter, userSearch]);

  // Data Queries
  const { data: recordings = [], isLoading: isLoadingRecordings } = useQuery({
    queryKey: ["recordings"],
    queryFn: () => fetchRecordings(),
  });

  const { data: siteContents = [] } = useQuery({
    queryKey: ["all-site-content"],
    queryFn: async () => {
      const data = await fetchAllSiteContent();
      return data;
    },
  });

  // Populate site content form safely inside useEffect
  useEffect(() => {
    if (siteContents.length > 0 && !contentLoaded) {
      const rules = siteContents.find((c) => c.key === "rules");
      const about = siteContents.find((c) => c.key === "about");
      const home = siteContents.find((c) => c.key === "home");
      if (rules) {
        setRulesTitle(rules.title);
        setRulesBody(rules.body);
      }
      if (about) {
        setAboutTitle(about.title);
        setAboutBody(about.body);
      }
      if (home) {
        setHomeTitle(home.title);
        setHomeBody(home.body);
      }
      setContentLoaded(true);
    }
  }, [siteContents, contentLoaded]);

  // My assigned recordings
  const myAssignedRecordings = useMemo(() => {
    if (!user) return [];
    return recordings.filter((r) => isAssignedToUser(r.assigned_to, user));
  }, [recordings, user]);

  const myActiveAssignedCount = useMemo(() => {
    return myAssignedRecordings.filter((r) => r.status === "pending" || r.status === "rescheduled")
      .length;
  }, [myAssignedRecordings]);

  // Filtered recordings
  const filteredRecordings = useMemo(() => {
    return recordings.filter((r) => {
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      const matchAssigned = !assignedToMeOnly || isAssignedToUser(r.assigned_to, user);
      const search = searchTerm.toLowerCase();
      const matchSearch =
        !search ||
        r.creator.toLowerCase().includes(search) ||
        r.players.toLowerCase().includes(search) ||
        r.assigned_to.toLowerCase().includes(search) ||
        r.notes.toLowerCase().includes(search);
      return matchStatus && matchAssigned && matchSearch;
    });
  }, [recordings, statusFilter, assignedToMeOnly, searchTerm, user]);

  // Handle Export to Excel
  const handleExportExcel = async () => {
    if (recordings.length === 0) {
      toast.info("No recordings to export yet.");
      return;
    }
    try {
      await exportRecordingsToExcel(recordings);
      toast.success("Recordings spreadsheet exported successfully!");
    } catch (err) {
      console.error("Excel export error:", err);
      toast.error("Failed to export Excel file. Please try again.");
    }
  };

  // Open modal to create recording
  const handleOpenCreateModal = () => {
    setEditingRecordingId(null);
    setFormState({
      ...emptyRecording(),
      assigned_to: user?.display_name
        ? `${user.display_name} (${ROLE_LABEL[user.role]})`
        : EVERYONE_STAFF_VALUE,
    });
    setIsModalOpen(true);
  };

  // Open modal to edit recording
  const handleOpenEditModal = (rec: Recording) => {
    setEditingRecordingId(rec.id);
    setFormState({
      session_date: rec.session_date,
      creator: rec.creator,
      start_time: rec.start_time,
      end_time: rec.end_time,
      players: rec.players,
      players_needed: rec.players_needed ?? "",
      assigned_to: rec.assigned_to,
      status: rec.status,
      notes: rec.notes,
      review: rec.review,
      screenshot_path: rec.screenshot_path,
    });
    setIsModalOpen(true);
  };

  // Handle screenshot upload (optional proof)
  const handleProofFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.loading("Attaching review proof…", { id: "proof-upload" });
      const pathOrData = await uploadRecordingScreenshot(file);
      setFormState((prev) => ({ ...prev, screenshot_path: pathOrData }));
      toast.success("Review proof attached!", { id: "proof-upload" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload proof";
      toast.error(msg, { id: "proof-upload" });
    }
  };

  // Save recording
  const handleSaveRecording = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.creator || !formState.session_date) {
      toast.error("Please fill in the creator and date.");
      return;
    }

    setIsSavingRecording(true);
    try {
      let savedId = editingRecordingId;
      if (editingRecordingId) {
        await updateRecording(editingRecordingId, formState);
        toast.success("Recording updated!");
      } else {
        const created = await createRecording(formState);
        savedId = created.id;
        toast.success("New recording added!");
      }

      // If assigned to current user, trigger chime notification immediately
      if (isAssignedToUser(formState.assigned_to, user)) {
        triggerAssignmentNotification(
          {
            id: savedId || "rec-" + Date.now(),
            creator: formState.creator,
            session_date: formState.session_date,
            start_time: formState.start_time,
          },
          true,
        );
      }

      await queryClient.invalidateQueries({ queryKey: ["recordings"] });
      await queryClient.invalidateQueries({ queryKey: ["recordings-preview"] });
      setIsModalOpen(false);
    } catch {
      toast.error("Failed to save recording.");
    } finally {
      setIsSavingRecording(false);
    }
  };

  // Delete recording
  const handleDeleteRecording = async (id: string) => {
    if (!confirm("Are you sure you want to delete this recording?")) return;
    try {
      await deleteRecording(id);
      await queryClient.invalidateQueries({ queryKey: ["recordings"] });
      await queryClient.invalidateQueries({ queryKey: ["recordings-preview"] });
      toast.success("Recording deleted.");
    } catch {
      toast.error("Failed to delete recording.");
    }
  };

  // Handle Role Change (Chairman / Founder capability)
  const handleRoleChange = async (targetUser: AppUser, newRole: AppRole) => {
    if (targetUser.role === newRole) return;

    if (!canManageRoles(role)) {
      toast.error("Only Founder and Chairman accounts can grant or change roles.");
      return;
    }

    const myRank = role ? RANK[role] : 0;
    const targetRank = RANK[targetUser.role];
    if (targetRank >= myRank && role !== "chairman") {
      toast.error("You cannot modify the role of an account with equal or higher clearance.");
      return;
    }

    const res = await updateUserRole(targetUser.id, newRole);
    if (res.success) {
      toast.success(`Updated ${targetUser.display_name}'s role to ${ROLE_LABEL[newRole]}!`);
    } else {
      toast.error(res.error || "Failed to update role.");
    }
  };

  // Handle Add New User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPass) {
      toast.error("Email and password are required.");
      return;
    }

    setIsAddingUser(true);
    const res = await createUser(newUserEmail, newUserPass, newUserName, newUserRole);
    setIsAddingUser(false);

    if (res.success) {
      toast.success(
        `Player account ${newUserEmail} created as ${ROLE_LABEL[newUserRole]}! Ready to login immediately.`,
      );
      setIsAddUserOpen(false);
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPass("");
      setNewUserRole("user");
    } else {
      toast.error(res.error || "Failed to create user.");
    }
  };

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchStatus = bookingStatusFilter === "all" || b.status === bookingStatusFilter;
      const q = bookingSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        b.id.toLowerCase().includes(q) ||
        b.playerName.toLowerCase().includes(q) ||
        b.discordTag.toLowerCase().includes(q) ||
        b.sessionType.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [bookings, bookingStatusFilter, bookingSearch]);

  const pendingBookingsCount = useMemo(() => {
    return bookings.filter((b) => b.status === "pending").length;
  }, [bookings]);

  // Open action modal for booking
  const handleOpenBookingAction = (
    booking: BookingRequest,
    type: "accept_and_record" | "accept" | "reject",
  ) => {
    setSelectedBookingForAction(booking);
    setActionModalType(type);
    const defaultStaff = user?.display_name
      ? `${user.display_name} (${ROLE_LABEL[user.role]})`
      : EVERYONE_STAFF_VALUE;
    setBookingStaffToAssign(defaultStaff);
    if (type === "accept_and_record" || type === "accept") {
      setAdminNoteInput(
        `Session confirmed by ${user?.display_name || "Recording Staff"}. Scheduled for ${booking.preferredDate} at ${booking.preferredTime}. Please join Discord VC 10 mins prior.`,
      );
    } else {
      setAdminNoteInput(
        "Thank you for your request. Currently, this time slot or recording type requires adjustments. Please reach out to staff on Discord.",
      );
    }
  };

  // Execute booking action
  const handleExecuteBookingAction = async () => {
    if (!selectedBookingForAction || !actionModalType) return;
    setIsProcessingBooking(true);

    const staffName =
      bookingStaffToAssign.trim() ||
      (user?.display_name
        ? `${user.display_name} (${ROLE_LABEL[user.role]})`
        : "Visual Studios Recording Team");

    try {
      if (actionModalType === "accept_and_record") {
        await acceptBookingAndCreateRecording(
          selectedBookingForAction.id,
          staffName,
          adminNoteInput.trim(),
        );
        refreshBookings();
        await queryClient.invalidateQueries({ queryKey: ["recordings"] });
        await queryClient.invalidateQueries({ queryKey: ["recordings-preview"] });
        toast.success(
          `Booking #${selectedBookingForAction.id} accepted! Added to official Recordings schedule.`,
        );
        // Automatically switch to recordings tab as requested
        setActiveTab("recordings");
      } else if (actionModalType === "accept") {
        updateBookingStatus(
          selectedBookingForAction.id,
          "accepted",
          adminNoteInput.trim(),
          staffName,
        );
        refreshBookings();
        toast.success(`Booking #${selectedBookingForAction.id} marked as accepted!`);
      } else if (actionModalType === "reject") {
        updateBookingStatus(
          selectedBookingForAction.id,
          "rejected",
          adminNoteInput.trim(),
          staffName,
        );
        refreshBookings();
        toast.info(`Booking #${selectedBookingForAction.id} marked as requiring revision.`);
      }

      setActionModalType(null);
      setSelectedBookingForAction(null);
      setAdminNoteInput("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update booking status.");
    } finally {
      setIsProcessingBooking(false);
    }
  };

  // Delete booking
  const handleDeleteBookingItem = (id: string) => {
    if (!confirm("Are you sure you want to delete this booking request?")) return;
    deleteBooking(id);
    refreshBookings();
    toast.success("Booking request removed.");
  };

  // Save Site Content (Rules, About, Home)
  const handleSaveSiteContent = async () => {
    if (!isSuperAdmin(role)) {
      toast.error("Only Founders can edit site content.");
      return;
    }

    setIsSavingContent(true);
    try {
      await Promise.all([
        saveSiteContent({ key: "rules", title: rulesTitle, body: rulesBody }),
        saveSiteContent({ key: "about", title: aboutTitle, body: aboutBody }),
        saveSiteContent({ key: "home", title: homeTitle, body: homeBody }),
      ]);
      await queryClient.invalidateQueries({ queryKey: ["site"] });
      await queryClient.invalidateQueries({ queryKey: ["all-site-content"] });
      toast.success("Rules, About, and Home content saved and updated across all pages!");
    } catch {
      toast.error("Failed to update site content.");
    } finally {
      setIsSavingContent(false);
    }
  };

  // Loading state while verifying clearance
  if (loading) {
    return (
      <SiteLayout>
        <main className="animate-fade-up mx-auto flex max-w-xl flex-col items-center justify-center px-4 py-24 sm:px-6">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Verifying clearance...</span>
          </div>
        </main>
      </SiteLayout>
    );
  }

  // If user is not signed in or not staff or above
  if (!isStaffOrAbove(role)) {
    return (
      <SiteLayout>
        <main className="animate-fade-up-late mx-auto flex max-w-xl flex-col px-4 py-16 sm:px-6">
          <div className="glass-panel purple-glow rounded-3xl p-8 text-center sm:p-10 border-purple-500/30">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-950/40 text-purple-400">
              <Lock className="h-7 w-7" />
            </div>

            <h1 className="mt-5 font-display text-2xl font-bold uppercase tracking-widest text-foreground sm:text-3xl">
              Staff Access Required
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              This Control Panel is strictly restricted to <strong>Recording Team</strong>,{" "}
              <strong>Managers</strong>, <strong>Founders</strong>, and <strong>Chairman</strong>{" "}
              for session recordings, proof review, and management.
            </p>

            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 text-xs text-muted-foreground">
              {user ? (
                <p>
                  You are currently signed in as{" "}
                  <strong className="text-foreground">{user.email}</strong> with the{" "}
                  <span
                    className={`font-semibold ${
                      user.role === "chairman"
                        ? "text-amber-400"
                        : user.role === "super_admin"
                          ? "text-red-400"
                          : user.role === "admin"
                            ? "text-purple-400"
                            : user.role === "staff"
                              ? "text-orange-400"
                              : "text-zinc-300"
                    }`}
                  >
                    {ROLE_LABEL[user.role]}
                  </span>{" "}
                  role. Contact a Founder or Chairman to upgrade your clearance.
                </p>
              ) : (
                <p>
                  Please sign in with your Staff, Manager, Founder, or Chairman account to access
                  this area.
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {!user ? (
                <Button
                  asChild
                  className="rounded-full shadow-lg shadow-red-600/30 bg-red-600 hover:bg-red-500 text-white"
                >
                  <Link to="/auth">Sign In as Staff / Founder</Link>
                </Button>
              ) : (
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  <Link to="/auth">Switch Account</Link>
                </Button>
              )}
              <Button asChild variant="ghost" className="rounded-full">
                <Link to="/">Return to Homepage</Link>
              </Button>
            </div>
          </div>
        </main>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <main className="animate-fade-up-late mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        {/* Top Control Panel Header */}
        <div className="glass-panel flex flex-col justify-between gap-4 rounded-3xl p-6 sm:flex-row sm:items-center sm:p-8 border-zinc-800">
          <div className="flex items-center gap-4">
            <img
              src={logo.url}
              alt="Visual Studios Logo"
              referrerPolicy="no-referrer"
              className="h-12 sm:h-14 w-auto aspect-[16/9] rounded-2xl border border-zinc-800 bg-black object-contain shadow-lg shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
                <ShieldAlert className="h-4 w-4 text-red-400" /> Visual Studios Command Center
              </div>
              <h1 className="mt-1 font-display text-3xl font-bold uppercase tracking-wider text-foreground">
                Control Panel
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Logged in as{" "}
                <span className="font-semibold text-foreground">
                  {user?.display_name || user?.email}
                </span>{" "}
                (
                <span
                  className={`font-semibold ${
                    role === "chairman"
                      ? "text-amber-400"
                      : role === "super_admin"
                        ? "text-red-400"
                        : role === "admin"
                          ? "text-purple-400"
                          : role === "staff"
                            ? "text-orange-400"
                            : "text-zinc-300"
                  }`}
                >
                  {role ? ROLE_LABEL[role] : "Staff"}
                </span>
                )
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sound alert test and mute controls */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleMute}
              className={`rounded-full border-zinc-700 bg-zinc-900/50 text-xs ${
                isAudioMuted
                  ? "text-zinc-500 hover:text-zinc-300"
                  : "text-amber-300 hover:text-amber-200"
              }`}
              title={
                isAudioMuted
                  ? "Audio alerts are currently muted"
                  : "Audio alerts are active (Chime enabled)"
              }
            >
              {isAudioMuted ? (
                <>
                  <VolumeX className="mr-1.5 h-3.5 w-3.5 text-zinc-500" /> Sound: Muted
                </>
              ) : (
                <>
                  <Volume2 className="mr-1.5 h-3.5 w-3.5 text-amber-400 animate-pulse" /> Sound:
                  Active
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleTestChime}
              className="rounded-full border-zinc-700 bg-zinc-900/50 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800"
              title="Test notification sound chime"
            >
              <Bell className="mr-1.5 h-3.5 w-3.5 text-amber-400" /> Test Chime
            </Button>

            <Button
              asChild
              variant="outline"
              className="rounded-full border-zinc-700 bg-zinc-900/50 text-zinc-300 hover:text-white hover:bg-zinc-800"
            >
              <Link to="/analytics">
                <BarChart3 className="mr-2 h-4 w-4 text-zinc-300" /> Staff Analytics & VC
              </Link>
            </Button>

            <Button
              onClick={handleExportExcel}
              className="rounded-full border-emerald-500/30 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-950/40"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-400" /> Export Excel Sheet
              (.xlsx)
            </Button>

            <Button
              onClick={handleOpenCreateModal}
              className="rounded-full bg-white text-zinc-900 hover:bg-zinc-100 font-medium shadow-lg"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add Recording
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) =>
            setActiveTab(v as "recordings" | "bookings" | "roles" | "content" | "analytics")
          }
          className="space-y-6"
        >
          <TabsList className="glass-pill h-auto p-1.5 flex flex-wrap border-zinc-800 bg-zinc-950/80">
            <TabsTrigger
              value="recordings"
              className="gap-2 rounded-full px-5 py-2 text-zinc-400 data-[state=active]:bg-white data-[state=active]:text-zinc-900"
            >
              <Film className="h-4 w-4" /> Recordings & Schedule ({recordings.length})
              {myActiveAssignedCount > 0 && (
                <span className="ml-1 rounded-full bg-amber-500/25 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/40">
                  {myActiveAssignedCount} Assigned to You
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="bookings"
              className="gap-2 rounded-full px-5 py-2 text-zinc-400 data-[state=active]:bg-white data-[state=active]:text-zinc-900"
            >
              <Calendar className="h-4 w-4" /> Player Bookings ({bookings.length})
              {pendingBookingsCount > 0 && (
                <span className="ml-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 animate-pulse border border-amber-500/30">
                  {pendingBookingsCount} New
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="analytics"
              className="gap-2 rounded-full px-5 py-2 text-zinc-400 data-[state=active]:bg-white data-[state=active]:text-zinc-900"
            >
              <BarChart3 className="h-4 w-4" /> Staff Analytics & VC
            </TabsTrigger>

            {isAdminOrSuperAdmin(role) && (
              <TabsTrigger
                value="roles"
                className="gap-2 rounded-full px-5 py-2 text-zinc-400 data-[state=active]:bg-white data-[state=active]:text-zinc-900"
              >
                <Users className="h-4 w-4" /> Player Roles & Permissions ({allUsers.length})
              </TabsTrigger>
            )}

            {isSuperAdmin(role) && (
              <TabsTrigger
                value="content"
                className="gap-2 rounded-full px-5 py-2 text-zinc-400 data-[state=active]:bg-white data-[state=active]:text-zinc-900"
              >
                <Globe className="h-4 w-4" /> Site Content (Rules & About)
              </TabsTrigger>
            )}
          </TabsList>

          {/* TAB 1: RECORDINGS & EXCEL EXPORT */}
          <TabsContent value="recordings" className="space-y-6">
            {/* Assigned to You banner if active */}
            {myActiveAssignedCount > 0 && !assignedToMeOnly && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent p-4 shadow-lg shadow-amber-500/5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/20 p-2 text-amber-300">
                    <Sparkles className="h-5 w-5 animate-spin-slow" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-200">
                      You have {myActiveAssignedCount} active recording session
                      {myActiveAssignedCount > 1 ? "s" : ""} assigned to you!
                    </h4>
                    <p className="text-xs text-amber-300/80">
                      Stay synced with your schedule, coordinate players, and upload review proofs.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setAssignedToMeOnly(true)}
                  className="rounded-xl bg-amber-500 text-black font-semibold hover:bg-amber-400 shadow-md self-start sm:self-auto shrink-0"
                >
                  <UserCheck className="mr-1.5 h-3.5 w-3.5" /> View My Assigned (
                  {myAssignedRecordings.length})
                </Button>
              </div>
            )}

            {/* Filters Bar */}
            <div className="glass-card flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search recordings by creator, date, notes, staff…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="rounded-xl pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Assigned to Me Filter Toggle */}
                <Button
                  variant={assignedToMeOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAssignedToMeOnly(!assignedToMeOnly)}
                  className={`rounded-xl text-xs font-semibold ${
                    assignedToMeOnly
                      ? "bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/20"
                      : "border-zinc-800 hover:border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                  }`}
                >
                  <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                  {assignedToMeOnly
                    ? "Showing: My Assigned"
                    : `Assigned to Me (${myAssignedRecordings.length})`}
                </Button>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Status:</span>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] rounded-xl">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="rescheduled">Rescheduled</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Recordings List */}
            {filteredRecordings.length === 0 ? (
              <div className="glass-panel rounded-3xl p-12 text-center">
                <Film className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-3 font-display text-lg font-semibold uppercase">
                  No Recordings Found
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {assignedToMeOnly
                    ? "You currently have no recordings assigned to you."
                    : searchTerm
                      ? "No recordings match your filter."
                      : "Add your first recording to start tracking."}
                </p>
                {assignedToMeOnly ? (
                  <Button
                    variant="outline"
                    onClick={() => setAssignedToMeOnly(false)}
                    className="mt-4 rounded-full"
                  >
                    View All Recordings
                  </Button>
                ) : (
                  <Button onClick={handleOpenCreateModal} className="mt-4 rounded-full">
                    <Plus className="mr-1.5 h-4 w-4" /> Add Recording
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredRecordings.map((rec) => {
                  const recIsAssignedToMe = isAssignedToUser(rec.assigned_to, user);
                  const isBroadcast =
                    rec.assigned_to?.includes("Everyone") ||
                    rec.assigned_to?.includes("All Recording Staff") ||
                    rec.assigned_to === EVERYONE_STAFF_VALUE;

                  return (
                    <div
                      key={rec.id}
                      className={`glass-card rounded-2xl p-5 transition hover:border-primary/40 ${
                        recIsAssignedToMe
                          ? "border-amber-500/40 bg-gradient-to-r from-amber-500/[0.04] via-transparent to-transparent shadow-lg shadow-amber-500/5"
                          : ""
                      }`}
                    >
                      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`status-pill ${
                                rec.status === "completed"
                                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                  : rec.status === "rescheduled"
                                    ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                                    : rec.status === "cancelled"
                                      ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                                      : "border-sky-500/40 bg-sky-500/10 text-sky-300"
                              }`}
                            >
                              {STATUS_LABEL[rec.status]}
                            </span>

                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5 text-primary" /> {rec.session_date} (
                              {rec.start_time} - {rec.end_time})
                            </span>

                            {/* Staff Tag */}
                            {rec.assigned_to ? (
                              isBroadcast ? (
                                <span className="flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/15 px-2.5 py-0.5 text-xs text-indigo-300 font-semibold">
                                  <Users className="h-3 w-3 text-indigo-400" /> {rec.assigned_to}
                                </span>
                              ) : (
                                <span
                                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${
                                    recIsAssignedToMe
                                      ? "border-amber-500/40 bg-amber-500/15 text-amber-200 font-semibold"
                                      : "border-glass-border bg-glass-highlight text-muted-foreground"
                                  }`}
                                >
                                  <UserCheck className="h-3 w-3 text-primary" /> Staff:{" "}
                                  <strong className="text-foreground">{rec.assigned_to}</strong>
                                  {recIsAssignedToMe && (
                                    <span className="text-[10px] text-amber-400 font-bold ml-1">
                                      (You)
                                    </span>
                                  )}
                                </span>
                              )
                            ) : null}

                            {/* Assigned to You Pill */}
                            {recIsAssignedToMe && (
                              <span className="flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/20 px-3 py-0.5 text-[11px] font-bold text-amber-300 shadow-sm animate-pulse">
                                <Sparkles className="h-3 w-3 text-amber-400" /> Assigned to You
                              </span>
                            )}
                          </div>

                          <h3 className="font-display text-xl font-bold text-foreground">
                            {rec.creator}
                          </h3>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                            {rec.players_needed !== undefined &&
                              rec.players_needed !== null &&
                              rec.players_needed !== "" && (
                                <div className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-primary">
                                  <strong className="text-foreground">Players Needed:</strong>{" "}
                                  <span className="font-semibold">{rec.players_needed}</span>
                                </div>
                              )}
                          </div>

                          {rec.notes && (
                            <p className="text-xs leading-relaxed text-muted-foreground max-w-3xl">
                              {rec.notes}
                            </p>
                          )}
                        </div>

                        {/* Right actions and proof preview */}
                        <div className="flex flex-col items-end gap-3 self-stretch md:self-auto shrink-0">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl"
                              onClick={() => handleOpenEditModal(rec)}
                            >
                              <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                              onClick={() => handleDeleteRecording(rec.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          {/* Review Proof Badge / Action */}
                          {rec.screenshot_path ? (
                            <button
                              type="button"
                              onClick={() => setPreviewProofUrl(rec.screenshot_path)}
                              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
                            >
                              <Eye className="h-3.5 w-3.5" /> View Review Proof
                            </button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              No review proof (optional)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* TAB: PLAYER BOOKINGS & REQUESTS */}
          <TabsContent value="bookings" className="space-y-6">
            {/* Stat Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass-card rounded-2xl p-4 border-zinc-800">
                <div className="text-xs text-muted-foreground uppercase font-semibold">
                  Total Bookings
                </div>
                <div className="mt-1 font-display text-2xl font-bold text-white">
                  {bookings.length}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-4 border-amber-500/30 bg-amber-500/5">
                <div className="text-xs text-amber-400 uppercase font-semibold flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Pending Review
                </div>
                <div className="mt-1 font-display text-2xl font-bold text-amber-300">
                  {pendingBookingsCount}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-4 border-emerald-500/30 bg-emerald-500/5">
                <div className="text-xs text-emerald-400 uppercase font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Accepted & Scheduled
                </div>
                <div className="mt-1 font-display text-2xl font-bold text-emerald-300">
                  {bookings.filter((b) => b.status === "accepted").length}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-4 border-zinc-800">
                <div className="text-xs text-muted-foreground uppercase font-semibold">
                  Revision / Declined
                </div>
                <div className="mt-1 font-display text-2xl font-bold text-zinc-400">
                  {bookings.filter((b) => b.status === "rejected").length}
                </div>
              </div>
            </div>

            {/* Filters & Navigation Bar */}
            <div className="glass-card flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search player name, Discord handle, booking ID, concept…"
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  className="rounded-xl pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Status:</span>
                <Select value={bookingStatusFilter} onValueChange={setBookingStatusFilter}>
                  <SelectTrigger className="w-[150px] rounded-xl">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Declined / Revision</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-purple-500/30 text-purple-300 hover:bg-purple-950/30"
                >
                  <Link to="/booking">
                    <ArrowRight className="mr-1.5 h-3.5 w-3.5" /> Open Booking Page
                  </Link>
                </Button>
              </div>
            </div>

            {/* Bookings List */}
            {filteredBookings.length === 0 ? (
              <div className="glass-panel rounded-3xl p-12 text-center">
                <Inbox className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-3 font-display text-lg font-semibold uppercase text-white">
                  No Booking Requests Found
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {bookingSearch || bookingStatusFilter !== "all"
                    ? "No bookings match your current filter settings."
                    : "No player booking requests submitted yet. Players can submit booking requests at /booking."}
                </p>
                <Button
                  asChild
                  className="mt-4 rounded-full bg-purple-600 hover:bg-purple-500 text-white"
                >
                  <Link to="/booking">Go to Booking Page</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredBookings.map((b) => {
                  const isAccepted = b.status === "accepted";
                  const isPending = b.status === "pending";
                  const isRejected = b.status === "rejected";

                  return (
                    <div
                      key={b.id}
                      className={`glass-panel relative rounded-3xl p-6 transition hover:border-zinc-700 ${
                        isAccepted
                          ? "border-emerald-500/40 bg-emerald-950/10"
                          : isPending
                            ? "border-amber-500/30 bg-amber-950/10"
                            : "border-zinc-800"
                      }`}
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-3 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-purple-400 bg-purple-950/60 border border-purple-800/60 px-2.5 py-0.5 rounded-lg">
                              #{b.id}
                            </span>
                            <h4 className="font-display text-base font-bold text-white uppercase tracking-wide">
                              {b.sessionType}
                            </h4>

                            {b.tier === "paid" ? (
                              <Badge className="border-purple-500/40 bg-purple-500/20 text-purple-300 gap-1 px-2.5 py-0.5 text-xs">
                                <Crown className="h-3 w-3 text-purple-400" /> VIP Plan
                              </Badge>
                            ) : (
                              <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 gap-1 px-2.5 py-0.5 text-xs">
                                Free Tier
                              </Badge>
                            )}

                            {isAccepted && (
                              <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 gap-1 px-2.5 py-0.5 text-xs">
                                <CheckCircle2 className="h-3 w-3" /> Accepted & Scheduled
                              </Badge>
                            )}
                            {isPending && (
                              <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300 gap-1 px-2.5 py-0.5 text-xs animate-pulse">
                                <Clock className="h-3 w-3" /> Pending Review
                              </Badge>
                            )}
                            {isRejected && (
                              <Badge className="border-rose-500/30 bg-rose-500/10 text-rose-400 gap-1 px-2.5 py-0.5 text-xs">
                                <AlertTriangle className="h-3 w-3" /> Needs Revision
                              </Badge>
                            )}
                            {b.ticketNumber && (
                              <Badge className="border-purple-500/40 bg-purple-950/60 text-purple-300 font-mono gap-1 px-2.5 py-0.5 text-[11px]">
                                <Crown className="h-3 w-3 text-purple-400" /> Ticket:{" "}
                                {b.ticketNumber}
                              </Badge>
                            )}
                            {b.hasDiscordTicket && !b.ticketNumber && (
                              <Badge className="border-purple-500/30 bg-purple-950/40 text-purple-300 gap-1 px-2.5 py-0.5 text-[11px]">
                                <MessageSquare className="h-3 w-3" /> Ticket Attached
                              </Badge>
                            )}
                          </div>

                          {/* Player & Schedule info grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-2.5">
                              <span className="text-zinc-500 block text-[10px] uppercase font-semibold">
                                Creator Handle
                              </span>
                              <strong className="text-white">{b.playerName}</strong>
                              <span className="block text-zinc-400 text-[11px]">
                                {b.discordTag}
                              </span>
                            </div>

                            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-2.5">
                              <span className="text-zinc-500 block text-[10px] uppercase font-semibold">
                                Requested Date
                              </span>
                              <strong className="text-white">{b.preferredDate}</strong>
                              <span className="block text-purple-300 text-[11px]">
                                {b.preferredTime}
                              </span>
                            </div>

                            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-2.5">
                              <span className="text-zinc-500 block text-[10px] uppercase font-semibold">
                                Scale & Duration
                              </span>
                              <strong className="text-white">{b.durationHours} Hours</strong>
                              <span className="block text-zinc-400 text-[11px]">
                                {b.playersCount} Players
                              </span>
                            </div>

                            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-2.5">
                              <span className="text-zinc-500 block text-[10px] uppercase font-semibold">
                                Server Hosting
                              </span>
                              {b.serverType === "studio_hosted" ? (
                                <strong className="text-purple-300 text-[11px] flex items-center gap-1">
                                  <Server className="h-3 w-3 text-purple-400" />
                                  Studio Hosted
                                </strong>
                              ) : (
                                <div className="truncate">
                                  <strong className="text-emerald-300 text-[11px] flex items-center gap-1">
                                    <Server className="h-3 w-3 text-emerald-400" />
                                    Player Server
                                  </strong>
                                  <span className="text-[10px] text-zinc-400 font-mono block truncate">
                                    {b.serverIp || "Not specified"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Notes */}
                          {b.description && (
                            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-3 text-xs text-zinc-300">
                              <span className="font-semibold text-zinc-400 text-[10px] uppercase tracking-wider block mb-0.5">
                                Player Note:
                              </span>
                              {b.description}
                            </div>
                          )}

                          {/* Admin Notes */}
                          {b.adminNotes && (
                            <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-3 text-xs text-purple-200">
                              <span className="font-semibold text-purple-300 text-[10px] uppercase tracking-wider block mb-0.5">
                                Staff Response Note:
                              </span>
                              {b.adminNotes}
                              {b.assignedStaff && (
                                <span className="block mt-1 text-[11px] text-purple-300/70">
                                  Handled by: {b.assignedStaff}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons Column */}
                        <div className="flex flex-col gap-2 shrink-0 md:min-w-[200px]">
                          {isPending && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleOpenBookingAction(b, "accept_and_record")}
                                className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-lg shadow-purple-600/30 text-xs py-2"
                              >
                                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-300" />
                                Accept & Add to Schedule
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenBookingAction(b, "accept")}
                                className="rounded-xl border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/30 text-xs"
                              >
                                <Check className="mr-1.5 h-3.5 w-3.5" /> Accept Only
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenBookingAction(b, "reject")}
                                className="rounded-xl border-rose-500/40 text-rose-300 hover:bg-rose-950/30 text-xs"
                              >
                                <XCircle className="mr-1.5 h-3.5 w-3.5" /> Request Revision
                              </Button>
                            </>
                          )}

                          {isAccepted && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => setActiveTab("recordings")}
                                className="rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs"
                              >
                                <Film className="mr-1.5 h-3.5 w-3.5 text-purple-400" />
                                View in Recordings Tab
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenBookingAction(b, "accept")}
                                className="rounded-xl border-zinc-800 text-zinc-300 text-xs"
                              >
                                <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit Note
                              </Button>
                            </>
                          )}

                          {isRejected && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenBookingAction(b, "accept_and_record")}
                              className="rounded-xl border-purple-500/40 text-purple-300 hover:bg-purple-950/30 text-xs"
                            >
                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Re-Approve Booking
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteBookingItem(b.id)}
                            className="rounded-xl text-rose-400 hover:bg-rose-500/10 text-xs mt-1"
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete Booking
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: ROLES & PLAYERS */}
          {isAdminOrSuperAdmin(role) && (
            <TabsContent value="roles" className="space-y-6">
              <div className="glass-card flex flex-col justify-between gap-4 rounded-2xl p-5 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-xl font-bold uppercase">
                      Role & Player Permissions
                    </h3>
                    <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Sync Active
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Founders and Chairmen can grant or modify roles (Chairman, Founder, Manager,
                    Recording Team, Player) with instant real-time synchronization.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setIsRefreshingUsers(true);
                      await refreshUsers();
                      setIsRefreshingUsers(false);
                      toast.success("User directory updated from central database!");
                    }}
                    className="rounded-full gap-1.5 border-glass-border hover:bg-glass-highlight"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${isRefreshingUsers ? "animate-spin" : ""}`}
                    />
                    Refresh Directory
                  </Button>

                  {canManageRoles(role) && (
                    <Button
                      onClick={() => setIsAddUserOpen(!isAddUserOpen)}
                      className="rounded-full shadow-lg shadow-purple-600/25 bg-purple-600 hover:bg-purple-500 text-white gap-1.5"
                    >
                      <UserPlus className="h-4 w-4" /> Provision Staff / User Account
                    </Button>
                  )}
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-card rounded-2xl p-3">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or role…"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-9 rounded-xl border-glass-border bg-background/40 text-sm"
                  />
                  {userSearch && (
                    <button
                      type="button"
                      onClick={() => setUserSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    Filter Role:
                  </span>
                  <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                    <SelectTrigger className="w-[160px] rounded-xl text-xs h-9 border-glass-border bg-background/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles ({allUsers.length})</SelectItem>
                      {ROLES.map((r) => {
                        const count = allUsers.filter((u) => u.role === r).length;
                        return (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABEL[r]} ({count})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  <span className="text-xs text-muted-foreground font-medium px-2 py-1 rounded-lg bg-glass-highlight border border-glass-border">
                    {filteredUsers.length} shown
                  </span>
                </div>
              </div>

              {/* Add User Form Drawer */}
              {isAddUserOpen && (
                <div className="glass-panel animate-fade-up rounded-3xl p-6 sm:p-8 border-purple-500/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-display text-lg font-bold uppercase text-white">
                        Provision New Account
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Enter staff/player email, password, display name, and role. The account is
                        saved to the central database and can log in immediately.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddUserOpen(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <form onSubmit={handleAddUser} className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="new-email">Email Address</Label>
                      <Input
                        id="new-email"
                        type="email"
                        required
                        placeholder="staff@visualstudios.club"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="new-name">Display / Staff Name</Label>
                      <Input
                        id="new-name"
                        placeholder="Staff Name / Handle"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="new-pass">Password</Label>
                      <Input
                        id="new-pass"
                        type="password"
                        required
                        placeholder="At least 6 characters"
                        value={newUserPass}
                        onChange={(e) => setNewUserPass(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="new-role">Assigned Role</Label>
                      <Select
                        value={newUserRole}
                        onValueChange={(val) => setNewUserRole(val as AppRole)}
                      >
                        <SelectTrigger id="new-role" className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-full"
                        onClick={() => setIsAddUserOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="rounded-full shadow-lg shadow-purple-600/25 bg-purple-600 hover:bg-purple-500 text-white"
                        disabled={isAddingUser}
                      >
                        {isAddingUser ? "Creating Account…" : "Create & Provision Account"}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Members Table */}
              <div className="glass-panel overflow-hidden rounded-3xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-glass-border bg-glass-highlight text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-6 py-4">Player / Staff Account</th>
                        <th className="px-6 py-4">Current Role</th>
                        <th className="px-6 py-4">Role Management</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-glass-border">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                            No accounts match your current search or role filter.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => {
                          const isTargetChairman = u.role === "chairman";
                          const isTargetFounder = u.role === "super_admin";
                          const myRank = role ? RANK[role] : 0;
                          const targetRank = RANK[u.role];
                          const canEditTarget =
                            canManageRoles(role) && (myRank > targetRank || role === "chairman");
                          const canDeleteTarget =
                            canManageRoles(role) &&
                            u.id !== user?.id &&
                            (myRank > targetRank || role === "chairman") &&
                            !isTargetChairman;

                          return (
                            <tr key={u.id} className="transition hover:bg-glass-highlight">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`flex h-10 w-10 items-center justify-center rounded-xl border font-bold uppercase ${
                                      isTargetChairman
                                        ? "border-amber-500/50 bg-amber-500/15 text-amber-400"
                                        : isTargetFounder
                                          ? "border-red-500/50 bg-red-500/15 text-red-400"
                                          : u.role === "admin"
                                            ? "border-purple-500/50 bg-purple-500/15 text-purple-400"
                                            : u.role === "staff"
                                              ? "border-orange-500/50 bg-orange-500/15 text-orange-400"
                                              : "border-glass-border bg-background/50 text-zinc-400"
                                    }`}
                                  >
                                    {isTargetChairman || isTargetFounder ? (
                                      <Crown
                                        className={`h-5 w-5 ${
                                          isTargetChairman ? "text-amber-400" : "text-red-400"
                                        }`}
                                      />
                                    ) : (
                                      u.display_name.slice(0, 2)
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-foreground">
                                        {u.display_name}
                                      </span>
                                      {isTargetChairman && (
                                        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.2 text-[10px] font-bold uppercase text-amber-400">
                                          Chairman
                                        </span>
                                      )}
                                      {isTargetFounder && (
                                        <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.2 text-[10px] font-bold uppercase text-red-400">
                                          Founder
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">{u.email}</span>
                                  </div>
                                </div>
                              </td>

                              <td className="px-6 py-4">
                                <span
                                  className={`status-pill ${
                                    isTargetChairman
                                      ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                                      : isTargetFounder
                                        ? "border-red-500/40 bg-red-500/10 text-red-400"
                                        : u.role === "admin"
                                          ? "border-purple-500/40 bg-purple-500/10 text-purple-400"
                                          : u.role === "staff"
                                            ? "border-orange-500/40 bg-orange-500/10 text-orange-400"
                                            : "border-muted-foreground/30 bg-muted/20 text-muted-foreground"
                                  }`}
                                >
                                  {ROLE_LABEL[u.role]}
                                </span>
                              </td>

                              <td className="px-6 py-4">
                                {canEditTarget ? (
                                  <Select
                                    value={u.role}
                                    onValueChange={(newRole) =>
                                      handleRoleChange(u, newRole as AppRole)
                                    }
                                  >
                                    <SelectTrigger className="w-[170px] rounded-xl border-glass-border bg-background/50">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {ROLES.map((r) => (
                                        <SelectItem key={r} value={r}>
                                          {ROLE_LABEL[r]}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    {canManageRoles(role)
                                      ? "Higher Rank Protection"
                                      : "Founder/Chairman Clearance Required to Edit"}
                                  </span>
                                )}
                              </td>

                              <td className="px-6 py-4 text-right">
                                {canDeleteTarget && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-xl text-rose-400 hover:bg-rose-500/10"
                                    onClick={async () => {
                                      if (confirm(`Remove user ${u.email}?`)) {
                                        const res = await deleteUser(u.id);
                                        if (res.success) toast.success("User removed");
                                        else toast.error(res.error || "Failed");
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          )}

          {/* TAB 3: SITE CONTENT (RULES & ABOUT EDITOR) */}
          {isSuperAdmin(role) && (
            <TabsContent value="content" className="space-y-6">
              <div className="glass-card flex flex-col justify-between gap-4 rounded-2xl p-5 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-display text-xl font-bold uppercase">
                    Dynamic Site Content Editor
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Founders can edit the Rules, About, and Homepage content. Changes apply
                    instantly across the site.
                  </p>
                </div>

                <Button
                  onClick={handleSaveSiteContent}
                  disabled={isSavingContent}
                  className="rounded-full shadow-lg shadow-primary/20"
                >
                  <Check className="mr-1.5 h-4 w-4" />
                  {isSavingContent ? "Saving Changes…" : "Save All Site Content"}
                </Button>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Rules Editor */}
                <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                    <ShieldAlert className="h-4 w-4" /> Rules Page Content (/rules)
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="rules-title">Rules Page Title</Label>
                    <Input
                      id="rules-title"
                      value={rulesTitle}
                      onChange={(e) => setRulesTitle(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="rules-body">Rules Guidelines (1 per line or numbered)</Label>
                    <Textarea
                      id="rules-body"
                      rows={10}
                      value={rulesBody}
                      onChange={(e) => setRulesBody(e.target.value)}
                      className="rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                {/* About Editor */}
                <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                    <Globe className="h-4 w-4" /> About Page Content (/about)
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="about-title">About Page Title</Label>
                    <Input
                      id="about-title"
                      value={aboutTitle}
                      onChange={(e) => setAboutTitle(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="about-body">About Description & Philosophy</Label>
                    <Textarea
                      id="about-body"
                      rows={10}
                      value={aboutBody}
                      onChange={(e) => setAboutBody(e.target.value)}
                      className="rounded-xl text-xs"
                    />
                  </div>
                </div>

                {/* Homepage Hero Editor */}
                <div className="glass-panel sm:col-span-2 rounded-3xl p-6 sm:p-8 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                    <Sparkles className="h-4 w-4" /> Homepage Hero Message (/)
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="home-title">Home Hero Headline</Label>
                      <Input
                        id="home-title"
                        value={homeTitle}
                        onChange={(e) => setHomeTitle(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="home-body">Home Hero Subtext</Label>
                      <Input
                        id="home-body"
                        value={homeBody}
                        onChange={(e) => setHomeBody(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveSiteContent}
                  disabled={isSavingContent}
                  className="rounded-full shadow-lg shadow-primary/20 px-8"
                >
                  <Check className="mr-1.5 h-4 w-4" />
                  {isSavingContent ? "Saving Changes…" : "Save All Site Content"}
                </Button>
              </div>
            </TabsContent>
          )}

          {/* TAB 4: STAFF ANALYTICS & VC */}
          <TabsContent value="analytics" className="space-y-6">
            <StaffAnalyticsManager embedded />
          </TabsContent>
        </Tabs>

        {/* MODAL: ADD / EDIT RECORDING */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
            <div className="glass-panel my-8 w-full max-w-2xl rounded-3xl p-6 sm:p-8 animate-fade-up">
              <div className="flex items-center justify-between border-b border-glass-border pb-4">
                <div>
                  <h3 className="font-display text-xl font-bold uppercase">
                    {editingRecordingId ? "Edit Recording" : "New Recording"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Record session details, creator, and player requirements
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-glass-highlight hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveRecording} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="rec-creator">Creator</Label>
                    <Input
                      id="rec-creator"
                      required
                      placeholder="Creator name or handle"
                      value={formState.creator}
                      onChange={(e) => setFormState({ ...formState, creator: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="rec-date">Date</Label>
                    <Input
                      id="rec-date"
                      type="date"
                      required
                      value={formState.session_date}
                      onChange={(e) => setFormState({ ...formState, session_date: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="rec-start">Start Time</Label>
                    <Input
                      id="rec-start"
                      type="time"
                      value={formState.start_time}
                      onChange={(e) => setFormState({ ...formState, start_time: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="rec-end">End Time</Label>
                    <Input
                      id="rec-end"
                      type="time"
                      value={formState.end_time}
                      onChange={(e) => setFormState({ ...formState, end_time: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="rec-status">Status</Label>
                    <Select
                      value={formState.status}
                      onValueChange={(val) =>
                        setFormState({ ...formState, status: val as RecordingStatus })
                      }
                    >
                      <SelectTrigger id="rec-status" className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((st) => (
                          <SelectItem key={st} value={st}>
                            {STATUS_LABEL[st]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="rec-players-needed">Players Needed</Label>
                    <Input
                      id="rec-players-needed"
                      type="number"
                      min="0"
                      placeholder="Amount of players needed (e.g. 4)"
                      value={formState.players_needed ?? ""}
                      onChange={(e) =>
                        setFormState({ ...formState, players_needed: e.target.value })
                      }
                      className="rounded-xl"
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="rec-staff" className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-primary" /> Assigned Staff / Director
                      </Label>
                      <span className="text-[11px] text-muted-foreground">Staff role or above</span>
                    </div>
                    <StaffSelector
                      value={formState.assigned_to}
                      onChange={(val) => setFormState({ ...formState, assigned_to: val })}
                      users={allUsers}
                      currentUser={user}
                      placeholder="Select staff member or broadcast…"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="rec-notes">Recording Notes</Label>
                  <Textarea
                    id="rec-notes"
                    rows={2}
                    placeholder="Session guidelines, camera angles, audio sync details…"
                    value={formState.notes}
                    onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                    className="rounded-xl text-xs"
                  />
                </div>

                {/* Review Proof (Optional) */}
                <div className="rounded-2xl border border-glass-border bg-glass-highlight p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 font-semibold text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Review Proof (Optional)
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      Screenshot URL or Upload
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="proof-url" className="text-xs text-muted-foreground">
                        Proof Screenshot / Video URL
                      </Label>
                      <Input
                        id="proof-url"
                        placeholder="https://..."
                        value={formState.screenshot_path || ""}
                        onChange={(e) =>
                          setFormState({ ...formState, screenshot_path: e.target.value || null })
                        }
                        className="rounded-xl text-xs"
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Or Upload Screenshot File
                      </Label>
                      <label className="flex h-9 cursor-pointer items-center justify-center rounded-xl border border-dashed border-glass-border bg-background/50 px-3 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground">
                        <Upload className="mr-1.5 h-3.5 w-3.5" /> Choose Image File
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProofFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {formState.screenshot_path && (
                    <div className="flex items-center justify-between rounded-xl border border-glass-border bg-background/50 px-3 py-2 text-xs">
                      <span className="truncate max-w-sm text-foreground">
                        Proof attached: {formState.screenshot_path.slice(0, 45)}…
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormState({ ...formState, screenshot_path: null })}
                        className="text-rose-400 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 border-t border-glass-border pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-full shadow-lg shadow-primary/20 px-6"
                    disabled={isSavingRecording}
                  >
                    {isSavingRecording ? "Saving…" : "Save Recording"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: BOOKING ACTION CONFIRMATION & NOTES */}
        {actionModalType && selectedBookingForAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
            <div className="glass-panel my-8 w-full max-w-xl rounded-3xl p-6 sm:p-8 animate-fade-up border-purple-500/40">
              <div className="flex items-center justify-between border-b border-glass-border pb-4">
                <div>
                  <h3 className="font-display text-xl font-bold uppercase text-white">
                    {actionModalType === "accept_and_record"
                      ? "Accept & Add to Recordings"
                      : actionModalType === "accept"
                        ? "Accept Player Booking"
                        : "Request Booking Revision"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Booking #{selectedBookingForAction.id} — {selectedBookingForAction.playerName} (
                    {selectedBookingForAction.sessionType})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActionModalType(null);
                    setSelectedBookingForAction(null);
                  }}
                  className="rounded-full p-1 text-muted-foreground hover:bg-glass-highlight hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 space-y-4 text-xs">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Player:</span>
                    <strong className="text-white">
                      {selectedBookingForAction.playerName} ({selectedBookingForAction.discordTag})
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Requested Schedule:</span>
                    <strong className="text-purple-300">
                      {selectedBookingForAction.preferredDate} at{" "}
                      {selectedBookingForAction.preferredTime}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Duration & Players:</span>
                    <strong className="text-zinc-200">
                      {selectedBookingForAction.durationHours} hrs •{" "}
                      {selectedBookingForAction.playersCount} players
                    </strong>
                  </div>
                </div>

                {actionModalType === "accept_and_record" && (
                  <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 text-purple-200 text-xs flex items-start gap-2.5">
                    <Sparkles className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-purple-300">Automatic Schedule Sync</strong>
                      This booking will automatically generate an active entry in your official{" "}
                      <strong>Recordings Schedule</strong> with assigned staff tracking and notify
                      the player on their status lookup page.
                    </div>
                  </div>
                )}

                {/* Assigned Staff Selection for Booking */}
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-purple-400" /> Assign Host / Recording
                      Staff:
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      Recording team role or above
                    </span>
                  </div>
                  <StaffSelector
                    value={bookingStaffToAssign}
                    onChange={setBookingStaffToAssign}
                    users={allUsers}
                    currentUser={user}
                    placeholder="Select who will host this recording…"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="admin-note" className="text-xs font-semibold text-zinc-300">
                    Staff Response / Message to Player:
                  </Label>
                  <Textarea
                    id="admin-note"
                    rows={4}
                    value={adminNoteInput}
                    onChange={(e) => setAdminNoteInput(e.target.value)}
                    placeholder="Instructions, Discord VC room, or required adjustments…"
                    className="rounded-xl text-xs"
                  />
                  <span className="text-[11px] text-zinc-500">
                    The player will see this note when they check their booking status at /booking.
                  </span>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-xl text-xs"
                  onClick={() => {
                    setActionModalType(null);
                    setSelectedBookingForAction(null);
                  }}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  disabled={isProcessingBooking}
                  onClick={handleExecuteBookingAction}
                  className={`rounded-xl text-xs font-semibold px-5 ${
                    actionModalType === "reject"
                      ? "bg-rose-600 hover:bg-rose-500 text-white"
                      : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30"
                  }`}
                >
                  {isProcessingBooking ? (
                    "Processing…"
                  ) : actionModalType === "accept_and_record" ? (
                    <>
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Accept & Add to Schedule
                    </>
                  ) : actionModalType === "accept" ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5" /> Mark Accepted
                    </>
                  ) : (
                    <>
                      <Send className="mr-1.5 h-3.5 w-3.5" /> Send Revision Note
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: PREVIEW REVIEW PROOF */}
        {previewProofUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
            <div className="glass-panel max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl p-6 animate-fade-up">
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> Review Proof Document
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewProofUrl(null)}
                  className="rounded-full p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-3 overflow-hidden rounded-2xl border border-glass-border bg-black">
                <img
                  src={previewProofUrl}
                  alt="Review Proof"
                  referrerPolicy="no-referrer"
                  className="max-h-[60vh] w-full object-contain"
                  onError={(e) => {
                    // In case image URL fails to load
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <a
                  href={previewProofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  Open Original in New Window
                </a>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setPreviewProofUrl(null)}
                >
                  Close Proof
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </SiteLayout>
  );
}
