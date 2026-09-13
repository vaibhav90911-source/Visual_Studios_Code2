import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Copy,
  Search,
  Film,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Send,
  Radio,
  FileText,
  Server,
  ExternalLink,
  MessageSquare,
  Gift,
  HelpCircle,
  Crown,
  Zap,
} from "lucide-react";

import logo from "@/assets/vs-logo.png.asset.json";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, isStaffOrAbove } from "@/lib/auth";
import {
  createBooking,
  getBookings,
  subscribeToBookings,
  BookingRequest,
  BookingStatus,
  BookingTier,
  ServerType,
  MAX_FREE_DURATION_HOURS,
  MAX_FREE_PLAYERS,
  calculateBookingTier,
} from "@/lib/bookings";
import { DISCORD_INVITE } from "@/lib/discord.functions";

export const Route = createFileRoute("/booking")({
  head: () => ({
    meta: [
      { title: "Book a Recording Session — Visual Studios" },
      {
        name: "description",
        content:
          "Schedule an official Minecraft SMP recording, cinematic trailer, or voiceover take with the Visual Studios production crew.",
      },
      { property: "og:title", content: "Book a Recording Session — Visual Studios" },
      {
        property: "og:description",
        content:
          "Schedule an official Minecraft SMP recording, cinematic trailer, or voiceover take with the Visual Studios production crew.",
      },
    ],
  }),
  component: BookingPage,
});

const SESSION_TYPES = [
  {
    id: "smp",
    label: "SMP Series Episode",
    desc: "Multiplayer lore, base tour, or survival storyline recording with multi-camera angles.",
    icon: "🎬",
  },
  {
    id: "cinematic",
    label: "Cinematic Trailer / Promo",
    desc: "High-framerate replay mod capture, shader passes, and custom scene staging.",
    icon: "🎥",
  },
  {
    id: "event",
    label: "Minigame / PvP Tournament",
    desc: "Live tournament coverage, referee observation, and spectator multicams.",
    icon: "⚔️",
  },
  {
    id: "voice",
    label: "Voiceover & Audio Take",
    desc: "Dedicated audio booth session with high-bitrate multitrack VC monitoring.",
    icon: "🎙️",
  },
  {
    id: "custom",
    label: "Custom Production Session",
    desc: "Specialized shoot, builder showcase, or custom studio collaboration.",
    icon: "✨",
  },
];

const TIME_SLOTS = [
  "02:00 PM IST",
  "04:00 PM IST",
  "06:00 PM IST",
  "08:00 PM IST",
  "10:00 PM IST",
  "11:30 PM IST",
  "Custom / Flexible Time",
];

function BookingPage() {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState<"book" | "status">("book");

  // Form State
  const [playerName, setPlayerName] = useState(user?.display_name || "");
  const [discordTag, setDiscordTag] = useState("");
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [sessionType, setSessionType] = useState("SMP Series Episode");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("06:00 PM IST");
  const [durationHours, setDurationHours] = useState(1);
  const [playersCount, setPlayersCount] = useState(4);
  const [serverType, setServerType] = useState<ServerType>("player_server");
  const [serverIp, setServerIp] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [hasDiscordTicket, setHasDiscordTicket] = useState(false);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedBooking, setSubmittedBooking] = useState<BookingRequest | null>(null);
  const [allBookings, setAllBookings] = useState<BookingRequest[]>([]);

  // Computed Tier
  const isDurationOverFree = durationHours > MAX_FREE_DURATION_HOURS;
  const isPlayersOverFree = playersCount > MAX_FREE_PLAYERS;
  const isStudioServer = serverType === "studio_hosted";
  const currentTier: BookingTier = calculateBookingTier(durationHours, playersCount, serverType);
  const isPaidTier = currentTier === "paid";

  useEffect(() => {
    setAllBookings(getBookings());
    const handleUpdate = () => {
      setAllBookings(getBookings());
    };
    window.addEventListener("vs_bookings_updated", handleUpdate);
    const unsub = subscribeToBookings((liveList) => {
      setAllBookings(liveList);
    });
    return () => {
      window.removeEventListener("vs_bookings_updated", handleUpdate);
      unsub();
    };
  }, []);

  // Pre-fill user data if logged in
  useEffect(() => {
    if (user) {
      setPlayerName((prev) => prev || user.display_name);
      setContactEmail((prev) => prev || user.email);
    }
  }, [user]);

  // Set default date to tomorrow
  useEffect(() => {
    if (!preferredDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setPreferredDate(tomorrow.toISOString().split("T")[0]!);
    }
  }, [preferredDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      toast.error("Please enter your Creator Handle.");
      return;
    }
    if (!discordTag.trim()) {
      toast.error("Please enter your Discord Handle (e.g. @username).");
      return;
    }
    if (!preferredDate) {
      toast.error("Please select a preferred recording date.");
      return;
    }
    if (!preferredTime.trim()) {
      toast.error("Please specify your preferred recording time (e.g. 06:00 PM IST).");
      return;
    }

    // Check server IP requirement for Free tier
    if (serverType === "player_server" && !serverIp.trim()) {
      toast.error(
        "Please enter your Minecraft Server IP/Address (Required for Free Tier sessions).",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const newBooking = createBooking({
        playerName: playerName.trim(),
        discordTag: discordTag.trim(),
        contactEmail: contactEmail.trim() || undefined,
        sessionType,
        preferredDate,
        preferredTime: preferredTime.trim() || "06:00 PM IST",
        durationHours: Number(durationHours) || 1,
        playersCount: Number(playersCount) || 1,
        serverType,
        serverIp: serverIp.trim() || undefined,
        hasDiscordTicket: hasDiscordTicket || Boolean(ticketNumber.trim()),
        ticketNumber: ticketNumber.trim() || undefined,
        description: description.trim(),
      });

      setSubmittedBooking(newBooking);
      setActiveTab("status");
      setSearchQuery(newBooking.id);
      toast.success(`Booking request ${newBooking.id} submitted successfully!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit booking request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyId = (id: string) => {
    void navigator.clipboard.writeText(id);
    toast.success(`Booking code ${id} copied to clipboard!`);
  };

  // Filter bookings for the Status Lookup tab
  const displayedBookings = searchQuery.trim()
    ? allBookings.filter(
        (b) =>
          b.id.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          b.playerName.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          b.discordTag.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          (b.serverIp && b.serverIp.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
          (b.contactEmail &&
            b.contactEmail.toLowerCase().includes(searchQuery.toLowerCase().trim())),
      )
    : submittedBooking
      ? [submittedBooking]
      : allBookings.slice(0, 5);

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case "accepted":
        return (
          <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 gap-1.5 px-3 py-1 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Accepted & Scheduled
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="border-rose-500/30 bg-rose-500/10 text-rose-400 gap-1.5 px-3 py-1 text-xs">
            <AlertCircle className="h-3.5 w-3.5" />
            Needs Revision / Declined
          </Badge>
        );
      case "completed":
        return (
          <Badge className="border-blue-500/30 bg-blue-500/10 text-blue-400 gap-1.5 px-3 py-1 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Completed Session
          </Badge>
        );
      default:
        return (
          <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300 gap-1.5 px-3 py-1 text-xs animate-pulse">
            <Clock3 className="h-3.5 w-3.5" />
            Pending Studio Review
          </Badge>
        );
    }
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        {/* Clean Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Booking
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Schedule your recording session with the Visual Studios crew.
            </p>
          </div>

          {isStaffOrAbove(role) && (
            <div className="flex items-center gap-3">
              <Button
                asChild
                size="sm"
                className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs shadow-md shadow-purple-600/20"
              >
                <Link to="/panel">
                  <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-emerald-300" />
                  Control Panel
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Tab Toggle Navigation */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "book" | "status")}
          className="space-y-6"
        >
          <div className="flex justify-center">
            <TabsList className="glass-pill h-auto p-1.5 flex gap-2">
              <TabsTrigger
                value="book"
                className="gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                <Calendar className="h-4 w-4" />
                Submit Session Request
              </TabsTrigger>
              <TabsTrigger
                value="status"
                className="gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                <Clock className="h-4 w-4" />
                Check Booking Status {allBookings.length > 0 && `(${allBookings.length})`}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: SUBMIT NEW BOOKING */}
          {activeTab === "book" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Booking Form */}
              <div className="lg:col-span-2">
                <form
                  onSubmit={handleSubmit}
                  className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                        <Film className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-display text-lg font-bold text-white uppercase tracking-wide">
                          Session Details & Preferences
                        </h2>
                        <p className="text-xs text-zinc-400">
                          Configure your recording scale, server, and schedule
                        </p>
                      </div>
                    </div>

                    {/* Live Tier Badge */}
                    <div>
                      {isPaidTier ? (
                        <Badge className="border-purple-500/40 bg-purple-500/20 text-purple-300 gap-1 px-3 py-1 text-xs">
                          <Crown className="h-3.5 w-3.5 text-purple-400" />
                          Studio VIP Plan (Discord Ticket)
                        </Badge>
                      ) : (
                        <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 gap-1 px-3 py-1 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Free Community Plan
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Player & Discord Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="playerName"
                        className="text-xs font-semibold uppercase text-zinc-300"
                      >
                        Creator Handle <span className="text-purple-400">*</span>
                      </Label>
                      <Input
                        id="playerName"
                        required
                        placeholder="e.g. ApexCrafter"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        className="rounded-xl border-zinc-800 bg-zinc-900/90 text-white placeholder:text-zinc-600"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="discordTag"
                        className="text-xs font-semibold uppercase text-zinc-300"
                      >
                        Discord Handle <span className="text-purple-400">*</span>
                      </Label>
                      <Input
                        id="discordTag"
                        required
                        placeholder="e.g. @username"
                        value={discordTag}
                        onChange={(e) => setDiscordTag(e.target.value)}
                        className="rounded-xl border-zinc-800 bg-zinc-900/90 text-white placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  {/* Contact Email (Optional) */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="contactEmail"
                      className="text-xs font-semibold uppercase text-zinc-300"
                    >
                      Contact Email (Optional for updates)
                    </Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      placeholder="e.g. creator@domain.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="rounded-xl border-zinc-800 bg-zinc-900/90 text-white placeholder:text-zinc-600"
                    />
                  </div>

                  {/* Session Type Select Cards */}
                  <div className="space-y-2.5">
                    <Label className="text-xs font-semibold uppercase text-zinc-300">
                      Production Session Type <span className="text-purple-400">*</span>
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {SESSION_TYPES.map((type) => {
                        const isSelected = sessionType === type.label;
                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setSessionType(type.label)}
                            className={`flex flex-col text-left p-3.5 rounded-2xl border transition ${
                              isSelected
                                ? "border-purple-500 bg-purple-950/40 shadow-md shadow-purple-500/10"
                                : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{type.icon}</span>
                              <span className="text-sm font-semibold text-white">{type.label}</span>
                            </div>
                            <p className="mt-1.5 text-[11px] text-zinc-400 leading-snug">
                              {type.desc}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Duration & Player Count with Rule Indicators */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Duration Selection */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold uppercase text-zinc-300">
                          Session Duration
                        </Label>
                        <span className="text-[11px] text-zinc-400">
                          Free: &le; 1.5h | Paid: &gt; 1.5h
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[0.5, 1, 1.5, 2, 3].map((hrs) => {
                          const isPaid = hrs > MAX_FREE_DURATION_HOURS;
                          const isSelected = durationHours === hrs;
                          return (
                            <button
                              key={hrs}
                              type="button"
                              onClick={() => setDurationHours(hrs)}
                              className={`flex flex-col items-center justify-center py-2 px-1 text-xs rounded-xl border transition ${
                                isSelected
                                  ? isPaid
                                    ? "border-purple-500 bg-purple-600 text-white font-bold"
                                    : "border-emerald-500 bg-emerald-600 text-white font-bold"
                                  : isPaid
                                    ? "border-purple-900/40 bg-purple-950/20 text-purple-300 hover:border-purple-700"
                                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                              }`}
                            >
                              <span>{hrs}h</span>
                              <span className="text-[9px] opacity-75 font-normal">
                                {isPaid ? "Paid" : "Free"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {isDurationOverFree && (
                        <p className="text-[11px] text-purple-300 flex items-center gap-1 mt-1">
                          <Crown className="h-3 w-3 text-purple-400 shrink-0" />
                          Durations over 1.5 hours require Studio VIP (Paid / Discord Ticket).
                        </p>
                      )}
                    </div>

                    {/* Player Count Input */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="playersCount"
                          className="text-xs font-semibold uppercase text-zinc-300"
                        >
                          Cast Size (Players)
                        </Label>
                        <span className="text-[11px] text-zinc-400">
                          Free: &le; 12 | Paid: &gt; 12
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          id="playersCount"
                          type="number"
                          min={1}
                          max={35}
                          value={playersCount}
                          onChange={(e) => setPlayersCount(Number(e.target.value))}
                          className={`rounded-xl border bg-zinc-900/90 text-white ${
                            isPlayersOverFree
                              ? "border-purple-500/60 focus:ring-purple-500"
                              : "border-zinc-800"
                          }`}
                        />
                        <span className="text-xs text-zinc-500 whitespace-nowrap">players</span>
                      </div>
                      {isPlayersOverFree ? (
                        <p className="text-[11px] text-purple-300 flex items-center gap-1 mt-1">
                          <Crown className="h-3 w-3 text-purple-400 shrink-0" />
                          More than 12 players requires Studio VIP (Paid / Discord Ticket).
                        </p>
                      ) : (
                        <p className="text-[11px] text-zinc-500">
                          Free tier covers up to 12 active players.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Server Type & Server IP (Free requires own server) */}
                  <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold uppercase text-zinc-300 flex items-center gap-1.5">
                        <Server className="h-4 w-4 text-purple-400" />
                        Minecraft Server Hosting <span className="text-purple-400">*</span>
                      </Label>
                      <span className="text-[11px] text-zinc-400">
                        Free tier requires your own server
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setServerType("player_server")}
                        className={`p-3 text-left rounded-xl border transition ${
                          serverType === "player_server"
                            ? "border-emerald-500/60 bg-emerald-950/20 text-white"
                            : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-xs font-semibold text-white">
                            My Own Server
                          </strong>
                          <span className="text-[10px] font-bold text-emerald-400 uppercase">
                            Free Tier
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                          You host the server and provide the IP address for the recording team.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setServerType("studio_hosted")}
                        className={`p-3 text-left rounded-xl border transition ${
                          serverType === "studio_hosted"
                            ? "border-purple-500/60 bg-purple-950/30 text-white"
                            : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-xs font-semibold text-white">
                            Studio Hosted Server
                          </strong>
                          <span className="text-[10px] font-bold text-purple-300 uppercase">
                            VIP Plan
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                          Visual Studios provisions a high-performance dedicated server for your
                          cast.
                        </p>
                      </button>
                    </div>

                    {/* If Player Server selected: Server IP is required */}
                    {serverType === "player_server" ? (
                      <div className="space-y-1.5 pt-2">
                        <Label
                          htmlFor="serverIp"
                          className="text-xs font-semibold text-zinc-300 flex items-center justify-between"
                        >
                          <span>
                            Your Minecraft Server IP / Domain{" "}
                            <span className="text-emerald-400">*</span>
                          </span>
                          <span className="text-[10px] text-zinc-500 font-normal">
                            (Required for Free Tier)
                          </span>
                        </Label>
                        <Input
                          id="serverIp"
                          required
                          placeholder="e.g. play.mysmp.net or 123.45.67.89:25565"
                          value={serverIp}
                          onChange={(e) => setServerIp(e.target.value)}
                          className="rounded-xl border-zinc-800 bg-zinc-950 text-white placeholder:text-zinc-600"
                        />
                        <p className="text-[11px] text-zinc-500">
                          Our staff and camera operators will join this server IP at the scheduled
                          session time.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-3 text-xs text-purple-200">
                        <p className="font-semibold text-purple-300 flex items-center gap-1">
                          <Crown className="h-3.5 w-3.5 text-purple-400" />
                          Visual Studios Dedicated Host Provisioning
                        </p>
                        <p className="mt-1 text-purple-300/80 leading-relaxed text-[11px]">
                          We will configure a private paper/fabric server instance with replay mods
                          and whitelist your players prior to the recording.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Date & Custom Timing Slot */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="preferredDate"
                        className="text-xs font-semibold uppercase text-zinc-300"
                      >
                        Preferred Date <span className="text-purple-400">*</span>
                      </Label>
                      <Input
                        id="preferredDate"
                        type="date"
                        required
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        className="rounded-xl border-zinc-800 bg-zinc-900/90 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="preferredTime"
                        className="text-xs font-semibold uppercase text-zinc-300 flex items-center justify-between"
                      >
                        <span>
                          Preferred Time (IST / Custom) <span className="text-purple-400">*</span>
                        </span>
                      </Label>
                      <Input
                        id="preferredTime"
                        required
                        placeholder="e.g. 06:00 PM IST or Flexible"
                        value={preferredTime}
                        onChange={(e) => setPreferredTime(e.target.value)}
                        className="rounded-xl border-zinc-800 bg-zinc-900/90 text-white placeholder:text-zinc-600"
                      />
                      {/* Quick timing slot suggestions */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[
                          "02:00 PM IST",
                          "06:00 PM IST",
                          "08:00 PM IST",
                          "10:00 PM IST",
                          "Flexible",
                        ].map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setPreferredTime(slot)}
                            className={`text-[10px] px-2 py-0.5 rounded-lg border transition ${
                              preferredTime === slot
                                ? "border-purple-500 bg-purple-950/60 text-purple-200 font-semibold"
                                : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Note (optional) */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="description"
                      className="text-xs font-semibold uppercase text-zinc-300"
                    >
                      Note (optional)
                    </Label>
                    <Textarea
                      id="description"
                      rows={3}
                      placeholder="Add any notes or requirements (optional)..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="rounded-xl border-zinc-800 bg-zinc-900/90 text-white placeholder:text-zinc-600"
                    />
                  </div>

                  {/* Paid Plan / Ticket Number Box */}
                  {isPaidTier ? (
                    <div className="rounded-2xl border border-purple-500/40 bg-purple-950/30 p-4 text-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-300 flex items-center gap-1.5">
                          <Crown className="h-4 w-4 text-purple-400" />
                          Studio VIP Plan Selected
                        </span>
                        <Badge className="bg-purple-600 text-white">VIP Plan</Badge>
                      </div>

                      <div className="space-y-1 text-purple-200/90 text-[11px]">
                        <p>
                          Your request includes:{" "}
                          <strong>
                            {[
                              isDurationOverFree && `${durationHours}h Duration (>1.5h)`,
                              isPlayersOverFree && `${playersCount} Players (>12)`,
                              isStudioServer && "Visual Studios Hosted Server",
                            ]
                              .filter(Boolean)
                              .join(" • ")}
                          </strong>
                        </p>
                      </div>

                      {/* Ticket Number Input Box */}
                      <div className="space-y-1.5 pt-1">
                        <Label
                          htmlFor="ticketNumber"
                          className="text-xs font-semibold uppercase text-purple-200 flex items-center gap-1.5"
                        >
                          <Crown className="h-3.5 w-3.5 text-purple-400" />
                          Ticket Number
                        </Label>
                        <Input
                          id="ticketNumber"
                          placeholder="e.g. #ticket-1042 or 1042"
                          value={ticketNumber}
                          onChange={(e) => setTicketNumber(e.target.value)}
                          className="rounded-xl border-purple-500/40 bg-zinc-950 text-white placeholder:text-zinc-600 focus:border-purple-400"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-xs text-emerald-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <div>
                          <strong className="block text-emerald-300">
                            Eligible for 100% Free Community Plan
                          </strong>
                          <span className="text-[11px] text-emerald-200/80">
                            Duration &le; 1.5h • Players &le; 12 • Own Server provided
                          </span>
                        </div>
                      </div>
                      <Badge className="bg-emerald-600/80 text-white text-[11px]">Free Tier</Badge>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-2xl bg-purple-600 hover:bg-purple-500 py-6 text-base font-bold uppercase tracking-wider text-white shadow-xl shadow-purple-600/30"
                  >
                    {isSubmitting ? (
                      "Submitting Request…"
                    ) : (
                      <>
                        <Send className="mr-2 h-5 w-5" />
                        Submit Recording Booking Request
                      </>
                    )}
                  </Button>
                </form>
              </div>

              {/* Sidebar Info & Booking Workflow */}
              <div className="space-y-6">
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400">
                    <Radio className="h-4 w-4 animate-pulse" />
                    How Studio Bookings Work
                  </div>

                  <div className="space-y-4 text-xs text-zinc-400 leading-relaxed">
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 font-bold text-[11px]">
                        1
                      </div>
                      <div>
                        <p className="font-semibold text-white">Submit Request</p>
                        <p>
                          Fill in your preferred date, session scale, and server IP to generate a
                          unique booking reference code.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 font-bold text-[11px]">
                        2
                      </div>
                      <div>
                        <p className="font-semibold text-white">Director Review & Approval</p>
                        <p>
                          Our Studio Founders & Staff review and accept the booking directly via the
                          Control Panel.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 font-bold text-[11px]">
                        3
                      </div>
                      <div>
                        <p className="font-semibold text-white">Live Recording Session</p>
                        <p>
                          Once accepted, your session is officially scheduled in the recordings
                          roster with a dedicated Voice Channel booth.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHECK BOOKING STATUS */}
          {activeTab === "status" && (
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="glass-card flex flex-col sm:flex-row items-center gap-3 rounded-2xl p-4">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-500" />
                  <Input
                    placeholder="Search by Booking ID (e.g. VS-BK-1234), player name, Discord tag, or server IP…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-xl pl-9 border-zinc-800 bg-zinc-950 text-white"
                  />
                </div>
                {searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="rounded-xl border-zinc-800 text-xs text-zinc-400 hover:text-white"
                  >
                    Clear Filter
                  </Button>
                )}
              </div>

              {/* Status List */}
              {displayedBookings.length === 0 ? (
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-12 text-center space-y-3">
                  <FileText className="mx-auto h-12 w-12 text-zinc-600" />
                  <h3 className="font-display text-lg font-bold uppercase text-zinc-300">
                    No Bookings Found
                  </h3>
                  <p className="max-w-md mx-auto text-xs text-zinc-500">
                    No matching booking requests found. You can submit a new booking using the
                    &quot;Submit Session Request&quot; tab above.
                  </p>
                  <Button
                    onClick={() => setActiveTab("book")}
                    variant="outline"
                    className="mt-2 rounded-full border-purple-500/40 text-purple-300 hover:bg-purple-950/30"
                  >
                    Create New Booking
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {displayedBookings.map((booking) => {
                    const isAccepted = booking.status === "accepted";
                    const isRejected = booking.status === "rejected";
                    const isPaid = booking.tier === "paid";

                    return (
                      <div
                        key={booking.id}
                        className={`rounded-3xl border p-6 transition shadow-xl ${
                          isAccepted
                            ? "border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 via-zinc-950 to-zinc-950"
                            : isRejected
                              ? "border-rose-500/30 bg-zinc-950/90"
                              : "border-zinc-800 bg-zinc-950/90 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-purple-400 bg-purple-950/60 border border-purple-800/60 px-2.5 py-0.5 rounded-lg">
                                #{booking.id}
                              </span>
                              <h3 className="text-base font-bold text-white">
                                {booking.sessionType}
                              </h3>

                              {isPaid ? (
                                <Badge className="border-purple-500/40 bg-purple-500/20 text-purple-300 gap-1 px-2.5 py-0.5 text-xs">
                                  <Crown className="h-3 w-3" /> VIP Plan
                                </Badge>
                              ) : (
                                <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 gap-1 px-2.5 py-0.5 text-xs">
                                  Free Tier
                                </Badge>
                              )}

                              {booking.ticketNumber && (
                                <Badge className="border-purple-500/30 bg-purple-950/60 text-purple-300 font-mono gap-1 px-2.5 py-0.5 text-xs">
                                  <Crown className="h-3 w-3" /> Ticket: {booking.ticketNumber}
                                </Badge>
                              )}

                              {getStatusBadge(booking.status)}
                            </div>
                            <p className="text-xs text-zinc-400">
                              Submitted by{" "}
                              <strong className="text-zinc-200">{booking.playerName}</strong> (
                              {booking.discordTag}) on{" "}
                              {new Date(booking.created_at).toLocaleDateString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopyId(booking.id)}
                              className="rounded-xl border-zinc-800 text-xs text-zinc-300 hover:text-white"
                            >
                              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Code
                            </Button>

                            {isStaffOrAbove(role) && (
                              <Button
                                asChild
                                size="sm"
                                className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs"
                              >
                                <Link to="/panel">
                                  Review in Panel <ArrowRight className="ml-1 h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Booking Schedule Specs */}
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-3">
                            <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                              <Calendar className="h-3.5 w-3.5 text-purple-400" /> Date & Time
                            </div>
                            <div className="font-semibold text-white">{booking.preferredDate}</div>
                            <div className="text-[11px] text-purple-300">
                              {booking.preferredTime}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-3">
                            <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                              <Clock3 className="h-3.5 w-3.5 text-purple-400" /> Duration & Scale
                            </div>
                            <div className="font-semibold text-white">
                              {booking.durationHours} Hours
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              {booking.playersCount} Players
                            </div>
                          </div>

                          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-3 sm:col-span-2">
                            <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                              <Server className="h-3.5 w-3.5 text-purple-400" /> Minecraft Server
                            </div>
                            <div className="font-semibold text-white truncate">
                              {booking.serverType === "player_server"
                                ? booking.serverIp || "Player Server"
                                : "Visual Studios Dedicated Host"}
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              {booking.serverType === "player_server"
                                ? "Provided by Player"
                                : "Studio Hosted"}
                            </div>
                          </div>
                        </div>

                        {/* Note */}
                        {booking.description && (
                          <div className="mt-4 rounded-2xl border border-zinc-800/50 bg-zinc-900/20 p-3.5 text-xs text-zinc-300">
                            <span className="font-semibold text-zinc-400 uppercase text-[10px] tracking-wider block mb-1">
                              Note:
                            </span>
                            {booking.description}
                          </div>
                        )}

                        {/* Admin Acceptance or Status Notice Box */}
                        {isAccepted && (
                          <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200 space-y-1.5">
                            <div className="flex items-center gap-2 font-bold text-emerald-300">
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              Session Accepted & Confirmed by Studio Crew!
                            </div>
                            <p className="text-emerald-200/90 leading-relaxed">
                              {booking.adminNotes ||
                                "Your recording session request has been accepted by the studio team. Please be in Discord VC 10 minutes prior to session start."}
                            </p>
                            {booking.assignedStaff && (
                              <p className="text-[11px] text-emerald-300/70">
                                Assigned Supervisor: <strong>{booking.assignedStaff}</strong>
                              </p>
                            )}
                          </div>
                        )}

                        {isRejected && (
                          <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200 space-y-1">
                            <div className="flex items-center gap-2 font-bold text-rose-300">
                              <AlertCircle className="h-4 w-4 text-rose-400" />
                              Studio Feedback / Revision Request
                            </div>
                            <p className="text-rose-200/90 leading-relaxed">
                              {booking.adminNotes ||
                                "This time slot is currently unavailable or requires rescheduling. Please adjust your time slot or reach out to staff."}
                            </p>
                          </div>
                        )}

                        {!isAccepted && !isRejected && (
                          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-amber-200/90 flex items-center gap-2">
                            <Clock3 className="h-4 w-4 text-amber-400 shrink-0" />
                            <span>
                              Your request is queued for review by the Visual Studios directors.
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </Tabs>

        {/* Free Community Plan & Studio VIP Plan at Bottom */}
        <div className="pt-4 border-t border-zinc-900/80 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-zinc-400">
              Booking Plans & Scale Overview
            </h2>
            <span className="text-[11px] text-zinc-500">Free vs Paid VIP Requirements</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Free Community Plan */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-white uppercase tracking-wide">
                      Free Community Plan
                    </h3>
                    <span className="text-[11px] font-semibold text-emerald-400">
                      100% Free Forever
                    </span>
                  </div>
                </div>
                <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[10px]">
                  Standard
                </Badge>
              </div>

              <ul className="space-y-1.5 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>
                    Duration: <strong>Up to 1.5 Hours</strong>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>
                    Cast Size: <strong>Up to 12 Players</strong>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>
                    Server: <strong>You provide your own Minecraft server IP</strong>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Dedicated recording crew & audio setup</span>
                </li>
              </ul>
            </div>

            {/* Studio VIP Plan */}
            <div className="rounded-2xl border border-purple-500/40 bg-gradient-to-br from-purple-950/20 via-zinc-950 to-zinc-950 p-5 space-y-3 shadow-lg shadow-purple-950/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 font-bold">
                    <Crown className="h-4 w-4 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-white uppercase tracking-wide">
                      Studio VIP Plan
                    </h3>
                    <span className="text-[11px] font-semibold text-purple-300">
                      Extended Scale
                    </span>
                  </div>
                </div>
                <Badge className="border-purple-500/40 bg-purple-500/20 text-purple-200 text-[10px]">
                  VIP / Extended
                </Badge>
              </div>

              <ul className="space-y-1.5 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span>
                    Duration: <strong>More than 1.5 Hours</strong>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span>
                    Cast Size: <strong>More than 12 Players</strong>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span>
                    Server: <strong>Studio Dedicated Hosted Server</strong> provided
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span>Priority queue & custom replay cinematics</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
