import { useState, useEffect, useMemo } from "react";
import {
  ArrowRight,
  Award,
  Check,
  Copy,
  Edit3,
  Headphones,
  Info,
  MessageSquare,
  Mic,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  Video,
  Volume2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import logo from "@/assets/vs-logo.png.asset.json";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type StaffMember,
  type StaffRole,
  type NewStaffInput,
  getStaffList,
  addStaffMember,
  updateStaffMember,
  deleteStaffMember,
  addVcSessionToStaff,
  logStaffWork,
  resetStaffToDefault,
} from "@/lib/staff-analytics";
import { isSuperAdmin, useAuth } from "@/lib/auth";

interface StaffAnalyticsManagerProps {
  embedded?: boolean;
}

export function StaffAnalyticsManager({ embedded = false }: StaffAnalyticsManagerProps) {
  const { role } = useAuth();
  const superAdmin = isSuperAdmin(role);

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"vc" | "messages" | "recordings" | "score">("vc");

  // Modals state
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLogVcModal, setShowLogVcModal] = useState<StaffMember | null>(null);
  const [showLogWorkModal, setShowLogWorkModal] = useState<StaffMember | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New staff form state
  const [newStaff, setNewStaff] = useState<NewStaffInput>({
    discordUserId: "",
    displayName: "",
    discordTag: "",
    role: "Recording Team",
    primaryVcName: "🎙️ Recording Booth #1",
    initialVcHours: 12,
    initialMessages: 450,
    recordingsHosted: 4,
    takesSupervised: 12,
    ticketsResolved: 8,
    notes: "",
  });

  // Log VC state
  const [vcInputChannel, setVcInputChannel] = useState("🎙️ Recording Booth #1");
  const [vcInputHours, setVcInputHours] = useState(2.5);
  const [vcInputNotes, setVcInputNotes] = useState("");

  // Log Work state
  const [workTask, setWorkTask] = useState("");
  const [workDetails, setWorkDetails] = useState("");
  const [workRecordings, setWorkRecordings] = useState(1);
  const [workTakes, setWorkTakes] = useState(3);
  const [workTickets, setWorkTickets] = useState(0);
  const [workHours, setWorkHours] = useState(2);

  const loadData = () => {
    setStaffList(getStaffList());
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener("vs_staff_analytics_updated", handleUpdate);
    return () => window.removeEventListener("vs_staff_analytics_updated", handleUpdate);
  }, []);

  // Filter and sort staff
  const filteredStaff = useMemo(() => {
    return staffList
      .filter((staff) => {
        const matchesQuery =
          staff.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          staff.discordTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
          staff.discordUserId.includes(searchQuery.trim());

        const matchesRole = roleFilter === "ALL" || staff.role === roleFilter;

        return matchesQuery && matchesRole;
      })
      .sort((a, b) => {
        if (sortBy === "vc") return b.totalVcHours - a.totalVcHours;
        if (sortBy === "messages") return b.totalMessages - a.totalMessages;
        if (sortBy === "recordings") return b.work.recordingsHosted - a.work.recordingsHosted;
        if (sortBy === "score") return b.work.activityScore - a.work.activityScore;
        return 0;
      });
  }, [staffList, searchQuery, roleFilter, sortBy]);

  // Server totals
  const totalVcHoursAll = useMemo(
    () => staffList.reduce((acc, s) => acc + s.totalVcHours, 0).toFixed(1),
    [staffList],
  );
  const totalMessagesAll = useMemo(
    () => staffList.reduce((acc, s) => acc + s.totalMessages, 0).toLocaleString(),
    [staffList],
  );
  const totalRecordingsAll = useMemo(
    () => staffList.reduce((acc, s) => acc + s.work.recordingsHosted, 0),
    [staffList],
  );

  const handleCopyDiscordId = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.discordUserId.trim() || !newStaff.displayName.trim()) {
      alert("Please provide both Discord User ID and Staff Name.");
      return;
    }

    const created = addStaffMember(newStaff);
    setShowAddModal(false);
    setSelectedStaff(created);
    setNewStaff({
      discordUserId: "",
      displayName: "",
      discordTag: "",
      role: "Recording Team",
      primaryVcName: "🎙️ Recording Booth #1",
      initialVcHours: 10,
      initialMessages: 250,
      recordingsHosted: 2,
      takesSupervised: 6,
      ticketsResolved: 4,
      notes: "",
    });
  };

  const handleAddVc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showLogVcModal) return;
    addVcSessionToStaff(showLogVcModal.id, vcInputChannel, vcInputHours, vcInputNotes);
    setShowLogVcModal(null);
    setVcInputNotes("");
  };

  const handleAddWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showLogWorkModal || !workTask.trim()) return;
    logStaffWork(
      showLogWorkModal.id,
      workTask,
      workDetails,
      workRecordings,
      workTakes,
      workTickets,
      workHours,
    );
    setShowLogWorkModal(null);
    setWorkTask("");
    setWorkDetails("");
  };

  const handleDeleteStaff = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} from staff analytics?`)) {
      deleteStaffMember(id);
      if (selectedStaff?.id === id) setSelectedStaff(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header Card - Deep Black Theme */}
      <section className="glass-panel relative overflow-hidden rounded-3xl p-6 sm:p-8 border border-zinc-800 bg-black/95">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-purple-300">
            <Award className="h-3.5 w-3.5 text-purple-400" />
            <span>CONFIDENTIAL STAFF ACTIVITY AUDIT</span>
          </div>

          <div className="flex items-center gap-2">
            {superAdmin && (
              <Button
                onClick={() => setShowAddModal(true)}
                className="rounded-full bg-purple-600 px-4 text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Add Staff Member
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={resetStaffToDefault}
              className="rounded-full border-zinc-800 bg-zinc-900/50 text-xs text-zinc-400 hover:text-white"
              title="Reset sample data"
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" /> Reset Default Data
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <img
            src={logo.url}
            alt="Visual Studios Logo"
            referrerPolicy="no-referrer"
            className="h-14 sm:h-16 w-auto aspect-[16/9] rounded-2xl border border-zinc-800 bg-black object-contain shadow-lg shadow-black shrink-0 self-start sm:self-center"
          />
          <div>
            <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-white sm:text-4xl">
              Staff Analytics & Server Contribution
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-zinc-400">
              Track individual staff presence, voice channel hours (with specific VC room
              breakdown), messages sent, and see exactly how much work each staff member has
              performed in Visual Studios.
            </p>
          </div>
        </div>

        {/* Founder Clearance Notice */}
        {superAdmin ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
            <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              <strong>Founder Clearance:</strong> You can add verified staff with their Discord User
              ID, record VC hours, and log official server work contributions.
            </span>
          </div>
        ) : (
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-xs text-zinc-400">
            <Info className="h-4 w-4 shrink-0 text-purple-400" />
            <span>
              Staff activity metrics are maintained and verified by Founders & Managers. Sign in as
              Founder to input or log data.
            </span>
          </div>
        )}

        {/* Top Server Stats Grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <Users className="h-4 w-4 text-purple-400" />
              <span>Real Staff</span>
            </div>
            <div className="mt-2 text-3xl font-extrabold text-white">{staffList.length}</div>
            <div className="mt-1 text-[11px] text-zinc-500">Verified crew members</div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <Headphones className="h-4 w-4 text-purple-400" />
              <span>Logged VC Time</span>
            </div>
            <div className="mt-2 text-3xl font-extrabold text-white">{totalVcHoursAll}h</div>
            <div className="mt-1 text-[11px] text-emerald-400">Across studio voice rooms</div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <MessageSquare className="h-4 w-4 text-purple-400" />
              <span>Messages Sent</span>
            </div>
            <div className="mt-2 text-3xl font-extrabold text-white">{totalMessagesAll}</div>
            <div className="mt-1 text-[11px] text-zinc-500">Server communications</div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <Video className="h-4 w-4 text-purple-400" />
              <span>Sessions Hosted</span>
            </div>
            <div className="mt-2 text-3xl font-extrabold text-white">{totalRecordingsAll}</div>
            <div className="mt-1 text-[11px] text-purple-400">Creator studio takes</div>
          </div>
        </div>
      </section>

      {/* Filter, Search and Sorting Bar */}
      <section className="glass-card flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between border border-zinc-800 bg-zinc-950/90">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Staff Name, Discord Tag, or Discord User ID (Snowflake)..."
            className="pl-10 rounded-xl border-zinc-800 bg-black/60 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role filter */}
          <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-zinc-800 bg-black/50 p-1">
            {(
              [
                "ALL",
                "Founder",
                "Manager",
                "Recording Manager",
                "Recording Team",
                "Recording Support",
              ] as const
            ).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  roleFilter === r
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Sort by */}
          <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-black/50 p-1 text-xs text-zinc-400">
            <span className="px-2 text-zinc-500">Sort:</span>
            <button
              onClick={() => setSortBy("vc")}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                sortBy === "vc" ? "bg-zinc-800 text-white" : "hover:text-white"
              }`}
            >
              VC Hours
            </button>
            <button
              onClick={() => setSortBy("messages")}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                sortBy === "messages" ? "bg-zinc-800 text-white" : "hover:text-white"
              }`}
            >
              Messages
            </button>
            <button
              onClick={() => setSortBy("recordings")}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                sortBy === "recordings" ? "bg-zinc-800 text-white" : "hover:text-white"
              }`}
            >
              Recordings
            </button>
            <button
              onClick={() => setSortBy("score")}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                sortBy === "score" ? "bg-zinc-800 text-white" : "hover:text-white"
              }`}
            >
              Score
            </button>
          </div>
        </div>
      </section>

      {/* Staff Members Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold uppercase tracking-wider text-white">
            Staff Team Dossiers ({filteredStaff.length})
          </h2>
          <span className="text-xs text-zinc-500">
            Click any staff to inspect full voice channel & contribution logs
          </span>
        </div>

        {filteredStaff.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/40 p-12 text-center">
            <Users className="mx-auto h-8 w-8 text-zinc-600" />
            <h3 className="mt-3 text-base font-bold text-white">No staff members listed yet</h3>
            <p className="mt-1 text-xs text-zinc-400 max-w-md mx-auto">
              Register verified staff members with their Discord User ID to track voice channel
              hours and server contributions.
            </p>
            {superAdmin && (
              <Button
                onClick={() => setShowAddModal(true)}
                className="mt-4 rounded-full bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-600/20 text-xs"
              >
                <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Register First Staff Member
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStaff.map((staff) => (
              <div
                key={staff.id}
                onClick={() => setSelectedStaff(staff)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/90 p-5 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-purple-500/50 hover:bg-black hover:shadow-xl hover:shadow-purple-950/20"
              >
                {/* Top Bar: Avatar, Names, Role */}
                <div className="flex items-start gap-3.5">
                  <div className="relative">
                    <img
                      src={staff.avatarUrl}
                      alt={staff.displayName}
                      className="h-12 w-12 rounded-xl border border-zinc-800 object-cover"
                    />
                    {staff.status === "In Voice" && (
                      <span
                        className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-black"
                        title="In Voice"
                      >
                        <Radio className="h-2.5 w-2.5 text-white animate-pulse" />
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="truncate font-display text-base font-bold text-white group-hover:text-purple-300 transition">
                        {staff.displayName}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          staff.role === "Founder"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : staff.role === "Manager"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : staff.role === "Recording Manager"
                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                : staff.role === "Recording Team"
                                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                  : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                        }`}
                      >
                        {staff.role}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-400 truncate">@{staff.discordTag}</div>

                    {/* Discord Snowflake ID with 1-click copy */}
                    <button
                      onClick={(e) => handleCopyDiscordId(staff.discordUserId, e)}
                      className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[11px] font-mono text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                      title="Click to copy Discord User ID"
                    >
                      <span>ID: {staff.discordUserId}</span>
                      {copiedId === staff.discordUserId ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3 opacity-60" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Primary Stats Grid */}
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-black/60 border border-zinc-800/80 p-2.5 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-semibold text-zinc-400">
                      <Headphones className="h-3 w-3 text-purple-400" />
                      <span>VC Hours</span>
                    </div>
                    <div className="mt-1 text-sm font-extrabold text-white">
                      {staff.totalVcHours}h
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-semibold text-zinc-400">
                      <MessageSquare className="h-3 w-3 text-purple-400" />
                      <span>Messages</span>
                    </div>
                    <div className="mt-1 text-sm font-extrabold text-white">
                      {staff.totalMessages.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-semibold text-zinc-400">
                      <Video className="h-3 w-3 text-purple-400" />
                      <span>Sessions</span>
                    </div>
                    <div className="mt-1 text-sm font-extrabold text-white">
                      {staff.work.recordingsHosted}
                    </div>
                  </div>
                </div>

                {/* Voice Channels Breakdown preview */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Volume2 className="h-3 w-3 text-purple-400" />
                      <span>Top Voice Channels:</span>
                    </span>
                    <span className="text-[10px] text-purple-400/80">
                      {staff.vcBreakdown.length} rooms
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {staff.vcBreakdown.slice(0, 2).map((vc, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-300"
                      >
                        <span className="truncate max-w-[120px]">{vc.channelName}</span>
                        <strong className="text-white font-mono">{vc.hours}h</strong>
                      </span>
                    ))}
                    {staff.vcBreakdown.length > 2 && (
                      <span className="text-[10px] text-zinc-500 self-center">
                        +{staff.vcBreakdown.length - 2} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Work Rating & Summary line */}
                <div className="mt-3.5 flex items-center justify-between border-t border-zinc-800 pt-3 text-xs">
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                    <Sparkles className="h-3 w-3" />
                    {staff.work.performanceRating} ({staff.work.activityScore}%)
                  </span>

                  <span className="inline-flex items-center gap-1 text-purple-400 group-hover:translate-x-0.5 transition font-medium">
                    Inspect Work <ArrowRight className="h-3 w-3" />
                  </span>
                </div>

                {/* Quick Founder Actions */}
                {superAdmin && (
                  <div
                    className="mt-3 flex items-center gap-1.5 border-t border-zinc-800 pt-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] rounded-lg border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 flex-1"
                      onClick={() => setShowLogVcModal(staff)}
                    >
                      <Mic className="mr-1 h-3 w-3" /> + Log VC
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] rounded-lg border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 flex-1"
                      onClick={() => setShowLogWorkModal(staff)}
                    >
                      <Video className="mr-1 h-3 w-3" /> + Log Work
                    </Button>
                    <button
                      onClick={() => handleDeleteStaff(staff.id, staff.displayName)}
                      className="rounded-lg p-1.5 text-zinc-500 hover:bg-rose-500/20 hover:text-rose-400 transition"
                      title="Remove staff record"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Detailed Staff Inspection Modal */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fade-in">
          <div
            className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-zinc-800 bg-black p-6 sm:p-8 text-foreground shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedStaff(null)}
              className="absolute right-5 top-5 rounded-full border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
            >
              ✕
            </button>

            {/* Profile Header */}
            <div className="flex flex-wrap items-center gap-4">
              <img
                src={selectedStaff.avatarUrl}
                alt={selectedStaff.displayName}
                className="h-16 w-16 rounded-2xl border border-zinc-800 object-cover"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-2xl font-bold text-white">
                    {selectedStaff.displayName}
                  </h2>
                  <span className="rounded-full border border-purple-500/30 bg-purple-500/20 px-3 py-0.5 text-xs font-semibold text-purple-300">
                    {selectedStaff.role}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                  <span>@{selectedStaff.discordTag}</span>
                  <span>•</span>
                  <span>Joined Studio: {selectedStaff.joinedAt}</span>
                  <span>•</span>
                  <span className="text-emerald-400">Status: {selectedStaff.status}</span>
                </div>

                {/* Copyable Discord Snowflake User ID */}
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Discord User ID:
                  </span>
                  <button
                    onClick={() => handleCopyDiscordId(selectedStaff.discordUserId)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-mono text-xs text-purple-300 hover:border-purple-500/40 hover:bg-zinc-800 transition"
                    title="Copy Discord User ID"
                  >
                    <span>{selectedStaff.discordUserId}</span>
                    {copiedId === selectedStaff.discordUserId ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-zinc-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Work & Contribution Spotlight */}
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-purple-300">
                  <Award className="h-4 w-4" />
                  <span>Server Work & Contribution Summary</span>
                </div>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-0.5 text-xs font-bold text-emerald-300">
                  {selectedStaff.work.performanceRating} ({selectedStaff.work.activityScore}%)
                </span>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                {selectedStaff.work.notes}
              </p>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl bg-black p-3 text-center border border-zinc-800">
                  <div className="text-[11px] uppercase font-semibold text-zinc-400">
                    Recordings Hosted
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-white">
                    {selectedStaff.work.recordingsHosted}
                  </div>
                </div>
                <div className="rounded-xl bg-black p-3 text-center border border-zinc-800">
                  <div className="text-[11px] uppercase font-semibold text-zinc-400">
                    Takes Supervised
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-white">
                    {selectedStaff.work.takesSupervised}
                  </div>
                </div>
                <div className="rounded-xl bg-black p-3 text-center border border-zinc-800">
                  <div className="text-[11px] uppercase font-semibold text-zinc-400">
                    Tickets Resolved
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-white">
                    {selectedStaff.work.ticketsResolved}
                  </div>
                </div>
                <div className="rounded-xl bg-black p-3 text-center border border-zinc-800">
                  <div className="text-[11px] uppercase font-semibold text-zinc-400">
                    Total Voice Logged
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-white">
                    {selectedStaff.totalVcHours}h
                  </div>
                </div>
              </div>
            </div>

            {/* Voice Channel (VC) Breakdown Table with VC Names */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
                  <Headphones className="h-4 w-4 text-purple-400" />
                  <span>Voice Channel (VC) Presence & Duration</span>
                </div>
                <span className="text-xs font-mono text-zinc-400">
                  Total: {selectedStaff.totalVcHours} Hours
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-800 bg-black/60 text-[11px] uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th className="p-3.5 font-semibold">Voice Channel Name</th>
                      <th className="p-3.5 font-semibold">Hours Logged</th>
                      <th className="p-3.5 font-semibold">Sessions</th>
                      <th className="p-3.5 font-semibold">Voice Share</th>
                      <th className="p-3.5 font-semibold">Last Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {selectedStaff.vcBreakdown.map((vc, idx) => {
                      const pct =
                        selectedStaff.totalVcHours > 0
                          ? Math.round((vc.hours / selectedStaff.totalVcHours) * 100)
                          : 0;
                      return (
                        <tr key={idx} className="hover:bg-zinc-900/50 transition">
                          <td className="p-3.5 font-medium text-white flex items-center gap-2">
                            <Volume2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                            <span>{vc.channelName}</span>
                          </td>
                          <td className="p-3.5 font-mono font-bold text-purple-300">{vc.hours}h</td>
                          <td className="p-3.5 font-mono text-zinc-400">{vc.sessionsCount}</td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-800">
                                <div
                                  className="h-full rounded-full bg-purple-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="font-mono text-zinc-400">{pct}%</span>
                            </div>
                          </td>
                          <td className="p-3.5 text-zinc-400">{vc.lastActive}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Work Logs List */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
                  <Video className="h-4 w-4 text-purple-400" />
                  <span>Recent Work Logs & Takes Completed</span>
                </div>
                {superAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowLogWorkModal(selectedStaff)}
                    className="h-7 text-xs rounded-full border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
                  >
                    + Record New Work
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {selectedStaff.work.recentWorkLogs.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic p-3">No work logged yet.</p>
                ) : (
                  selectedStaff.work.recentWorkLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3.5"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-xs">{log.task}</span>
                          <span className="rounded-full bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                            {log.date}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-400">{log.details}</p>
                      </div>
                      {log.hoursSpent && (
                        <span className="shrink-0 font-mono text-xs font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-md px-2 py-1">
                          {log.hoursSpent}h
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal (Founder / Manager) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fade-in">
          <div
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-zinc-800 bg-black p-6 sm:p-8 text-foreground shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="font-display text-xl font-bold uppercase text-white">
                  Add Staff Member
                </h3>
                <p className="text-xs text-zinc-400">
                  Enter their verified Discord Snowflake ID and initial server contributions.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-full p-2 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-zinc-300">
                  Discord User ID (Snowflake) *
                </label>
                <Input
                  required
                  placeholder="e.g. 694201948271049281"
                  value={newStaff.discordUserId}
                  onChange={(e) => setNewStaff({ ...newStaff, discordUserId: e.target.value })}
                  className="mt-1 rounded-xl border-zinc-800 bg-zinc-950 font-mono"
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  Right-click user on Discord → "Copy User ID" (requires Developer Mode).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-zinc-300">
                    Display Name *
                  </label>
                  <Input
                    required
                    placeholder="Staff member name"
                    value={newStaff.displayName}
                    onChange={(e) => setNewStaff({ ...newStaff, displayName: e.target.value })}
                    className="mt-1 rounded-xl border-zinc-800 bg-zinc-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-zinc-300">
                    Discord Username/Tag
                  </label>
                  <Input
                    placeholder="e.g. username#0000"
                    value={newStaff.discordTag}
                    onChange={(e) => setNewStaff({ ...newStaff, discordTag: e.target.value })}
                    className="mt-1 rounded-xl border-zinc-800 bg-zinc-950"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-zinc-300">
                  Staff Role
                </label>
                <select
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as StaffRole })}
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white"
                >
                  <option value="Recording Team">Recording Team</option>
                  <option value="Recording Support">Recording Support</option>
                  <option value="Recording Manager">Recording Manager</option>
                  <option value="Manager">Manager</option>
                  <option value="Founder">Founder</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-zinc-300">
                    Primary Voice Channel
                  </label>
                  <Input
                    placeholder="🎙️ Recording Booth #1"
                    value={newStaff.primaryVcName}
                    onChange={(e) => setNewStaff({ ...newStaff, primaryVcName: e.target.value })}
                    className="mt-1 rounded-xl border-zinc-800 bg-zinc-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-zinc-300">
                    Initial VC Hours
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={newStaff.initialVcHours}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, initialVcHours: Number(e.target.value) })
                    }
                    className="mt-1 rounded-xl border-zinc-800 bg-zinc-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-zinc-300">
                    Messages
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={newStaff.initialMessages}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, initialMessages: Number(e.target.value) })
                    }
                    className="mt-1 rounded-xl border-zinc-800 bg-zinc-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-zinc-300">
                    Takes Supervised
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={newStaff.takesSupervised}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, takesSupervised: Number(e.target.value) })
                    }
                    className="mt-1 rounded-xl border-zinc-800 bg-zinc-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-zinc-300">
                    Tickets Resolved
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={newStaff.ticketsResolved}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, ticketsResolved: Number(e.target.value) })
                    }
                    className="mt-1 rounded-xl border-zinc-800 bg-zinc-950"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-zinc-300">
                  Work Notes & Performance Summary
                </label>
                <Textarea
                  placeholder="Summarize their primary duties, recording booth responsibilities, and studio performance..."
                  value={newStaff.notes}
                  onChange={(e) => setNewStaff({ ...newStaff, notes: e.target.value })}
                  rows={2}
                  className="mt-1 rounded-xl border-zinc-800 bg-zinc-950"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-zinc-800"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-full bg-purple-600 px-6 text-white hover:bg-purple-500"
                >
                  Add Staff Member
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log VC Modal */}
      {showLogVcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fade-in">
          <div
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-zinc-800 bg-black p-6 sm:p-7 text-foreground shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  Log Voice Channel Duration
                </h3>
                <p className="text-xs text-zinc-400">for {showLogVcModal.displayName}</p>
              </div>
              <button
                onClick={() => setShowLogVcModal(null)}
                className="rounded-full p-2 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVc} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-zinc-300">
                  Voice Channel (VC) Name
                </label>
                <select
                  value={vcInputChannel}
                  onChange={(e) => setVcInputChannel(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white"
                >
                  <option value="🎙️ Recording Booth #1">🎙️ Recording Booth #1</option>
                  <option value="🎙️ Recording Booth #2">🎙️ Recording Booth #2</option>
                  <option value="🎬 Studio Main Stage">🎬 Studio Main Stage</option>
                  <option value="☕ Staff Meeting Room">☕ Staff Meeting Room</option>
                  <option value="🔊 Director Control VC">🔊 Director Control VC</option>
                  <option value="🎧 Lounge VC">🎧 Lounge VC</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-zinc-300">
                  Duration (Hours)
                </label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={vcInputHours}
                  onChange={(e) => setVcInputHours(Number(e.target.value))}
                  className="mt-1 rounded-xl border-zinc-800 bg-zinc-950"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-zinc-300">
                  Session Notes (Optional)
                </label>
                <Input
                  placeholder="e.g. Supervised Saturday SMP Recording take #4"
                  value={vcInputNotes}
                  onChange={(e) => setVcInputNotes(e.target.value)}
                  className="mt-1 rounded-xl border-zinc-800 bg-zinc-950"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-zinc-800"
                  onClick={() => setShowLogVcModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-full bg-purple-600 px-6 text-white hover:bg-purple-500"
                >
                  Log Voice Hours
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Work Modal */}
      {showLogWorkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fade-in">
          <div
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-zinc-800 bg-black p-6 sm:p-7 text-foreground shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-white">Log Server Work</h3>
                <p className="text-xs text-zinc-400">for {showLogWorkModal.displayName}</p>
              </div>
              <button
                onClick={() => setShowLogWorkModal(null)}
                className="rounded-full p-2 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddWork} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-zinc-300">
                  Task Title *
                </label>
                <Input
                  required
                  placeholder="e.g. Hosted Creator Audition Batch"
                  value={workTask}
                  onChange={(e) => setWorkTask(e.target.value)}
                  className="mt-1 rounded-xl border-zinc-800 bg-zinc-950"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-zinc-300">
                  Details & Execution Notes
                </label>
                <Textarea
                  placeholder="Details of what was achieved in this server shift..."
                  value={workDetails}
                  onChange={(e) => setWorkDetails(e.target.value)}
                  rows={2}
                  className="mt-1 rounded-xl border-zinc-800 bg-zinc-950"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-zinc-300">
                    Sessions
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={workRecordings}
                    onChange={(e) => setWorkRecordings(Number(e.target.value))}
                    className="mt-1 rounded-xl border-zinc-800 bg-zinc-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-zinc-300">
                    Takes
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={workTakes}
                    onChange={(e) => setWorkTakes(Number(e.target.value))}
                    className="mt-1 rounded-xl border-zinc-800 bg-zinc-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-zinc-300">
                    Hours Spent
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={workHours}
                    onChange={(e) => setWorkHours(Number(e.target.value))}
                    className="mt-1 rounded-xl border-zinc-800 bg-zinc-950"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-zinc-800"
                  onClick={() => setShowLogWorkModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-full bg-emerald-600 px-6 text-white hover:bg-emerald-500"
                >
                  Record Work
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
