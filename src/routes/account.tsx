import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  User,
  Key,
  Eye,
  EyeOff,
  Upload,
  CheckCircle2,
  AlertCircle,
  Camera,
  ShieldCheck,
  Loader2,
  Trash2,
  ArrowLeft,
  Sparkles,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

import logo from "@/assets/vs-logo.png.asset.json";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABEL, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account Settings — Visual Studios" },
      {
        name: "description",
        content: "Manage your player profile, avatar, display name, and password security.",
      },
    ],
  }),
  component: AccountPage,
});

const PRESET_AVATARS = [
  {
    id: "vs-gold",
    name: "VS Studio Gold",
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=VisualStudios&backgroundColor=030712",
  },
  {
    id: "mc-steve",
    name: "Minecraft Steve",
    url: "https://mc-heads.net/avatar/Steve/100",
  },
  {
    id: "mc-alex",
    name: "Minecraft Alex",
    url: "https://mc-heads.net/avatar/Alex/100",
  },
  {
    id: "neon-gamer",
    name: "Neon Gamer",
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=NeonGamer&backgroundColor=09090b",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk Hero",
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=CyberpunkHero&backgroundColor=18181b",
  },
  {
    id: "dragon-knight",
    name: "Dragon Knight",
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=DragonKnight&backgroundColor=020617",
  },
  {
    id: "vip-crown",
    name: "VIP Crown",
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=VIPCrown&backgroundColor=3f0f3f",
  },
];

function AccountPage() {
  const { user, role, updateProfile } = useAuth();
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [isUploading, setIsUploading] = useState(false);

  // Password change fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  // Sync state when user loads
  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      setAvatarUrl(user.avatar_url || "");
    }
  }, [user]);

  // Handle direct profile picture file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WEBP).");
      return;
    }

    // Limit file size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file is too large. Please select an image under 5MB.");
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize image using HTML5 Canvas to 300x300 max to keep data URL compact
        const canvas = document.createElement("canvas");
        const MAX_DIM = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const resizedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setAvatarUrl(resizedDataUrl);
          toast.success("Profile photo uploaded successfully!");
        } else {
          setAvatarUrl(event.target?.result as string);
          toast.success("Profile photo uploaded!");
        }
        setIsUploading(false);
      };

      img.onerror = () => {
        setIsUploading(false);
        toast.error("Could not process image file.");
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      setIsUploading(false);
      toast.error("Failed to read image file.");
    };

    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      toast.error("Display name cannot be empty.");
      return;
    }

    // If changing password, validate all 3 fields
    const isChangingPassword = Boolean(currentPassword || newPassword || confirmPassword);

    if (isChangingPassword) {
      if (!currentPassword) {
        toast.error("Please enter your current password to confirm password change.");
        return;
      }
      if (!newPassword) {
        toast.error("Please enter a new password.");
        return;
      }
      if (newPassword.length < 6) {
        toast.error("New password must be at least 6 characters long.");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("New password and confirm password do not match.");
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await updateProfile({
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim(),
        currentPassword: isChangingPassword ? currentPassword : undefined,
        newPassword: isChangingPassword ? newPassword : undefined,
      });

      if (res.success) {
        toast.success("Account profile updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(res.error || "Failed to update profile.");
      }
    } catch (err) {
      console.error("Profile update error:", err);
      toast.error("An error occurred while saving your profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-md py-16 text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-white/10 text-zinc-300">
            <Lock className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white font-display">Authentication Required</h1>
            <p className="text-xs text-zinc-400">
              You must be signed in to access your Account Settings.
            </p>
          </div>
          <Button
            asChild
            className="rounded-full bg-white hover:bg-zinc-200 text-black font-semibold"
          >
            <Link to="/auth">Sign In / Register</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const userInitial = (displayName || user.email || "U").charAt(0).toUpperCase();

  // Password matching status checks
  const isChangingPass = Boolean(currentPassword || newPassword || confirmPassword);
  const passLengthOk = newPassword.length >= 6;
  const passMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl space-y-8 py-6">
        {/* Header Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate({ to: "/" })}
              className="h-9 w-9 rounded-xl border-white/10 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-display text-white tracking-wide flex items-center gap-2">
                Account Settings
              </h1>
              <p className="text-xs text-zinc-400">
                Manage your avatar photo, display name, and password security
              </p>
            </div>
          </div>

          <Badge
            variant="outline"
            className="font-mono text-xs px-3 py-1 border-white/10 bg-zinc-900/80 text-zinc-300"
          >
            {role ? ROLE_LABEL[role] : "Player"}
          </Badge>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Section 1: Profile Picture / Avatar Upload */}
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 backdrop-blur-xl shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-zinc-300" />
                <h2 className="text-base font-bold text-white">Profile Picture</h2>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono">
                Upload image file directly
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Big Avatar Display */}
              <div className="relative group shrink-0">
                <Avatar className="h-28 w-28 border border-white/20 bg-zinc-900 shadow-xl">
                  <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />
                  <AvatarFallback className="bg-zinc-800 text-3xl font-bold text-white">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>

                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/70 backdrop-blur-sm">
                    <Loader2 className="h-7 w-7 animate-spin text-white" />
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <div>
                  <h3 className="text-sm font-semibold text-white">Upload Your Photo</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Select any image file (PNG, JPG, WEBP) directly from your computer or phone.
                  </p>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold px-4 h-9 shadow-md transition"
                  >
                    <Upload className="mr-2 h-3.5 w-3.5" />
                    {isUploading ? "Processing..." : "Upload Profile Picture"}
                  </Button>

                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAvatarUrl("")}
                      className="rounded-xl border-white/10 bg-zinc-900 hover:bg-rose-950/30 hover:text-rose-400 text-zinc-300 text-xs h-9"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5 text-rose-400" /> Remove Photo
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Optional Presets */}
            <div className="pt-4 border-t border-white/10 space-y-2">
              <p className="text-[11px] font-medium text-zinc-400">Or choose a preset avatar:</p>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_AVATARS.map((preset) => {
                  const isSelected = avatarUrl === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      title={preset.name}
                      onClick={() => setAvatarUrl(preset.url)}
                      className={`relative flex items-center justify-center rounded-xl p-1 border transition-all ${
                        isSelected
                          ? "border-white bg-white/15 ring-2 ring-white/30 scale-105"
                          : "border-white/10 bg-zinc-900/80 hover:border-white/25 hover:bg-zinc-800/80"
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="h-8 w-8 rounded-lg object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 2: Display Name & General Info */}
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 backdrop-blur-xl shadow-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-4">
              <User className="h-5 w-5 text-zinc-300" />
              <h2 className="text-base font-bold text-white">Personal Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="acc-display-name" className="text-xs font-semibold text-zinc-200">
                  Display Name / Player Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <Input
                    id="acc-display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your in-game or display name"
                    required
                    className="pl-9 text-xs bg-zinc-900/80 border-white/15 text-white rounded-xl focus-visible:ring-white/20 h-10"
                  />
                </div>
                <p className="text-[11px] text-zinc-400">
                  Visible across bookings, recordings roster, and staff dashboards.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="acc-email" className="text-xs font-semibold text-zinc-200">
                  Email Address
                </Label>
                <Input
                  id="acc-email"
                  value={user.email}
                  disabled
                  className="text-xs bg-zinc-900/40 border-white/5 text-zinc-400 cursor-not-allowed rounded-xl h-10"
                />
                <p className="text-[11px] text-zinc-500">
                  Email is locked to your account identity.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Change Password (Current Password, New Password, Confirm Password) */}
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 backdrop-blur-xl shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-zinc-300" />
                <h2 className="text-base font-bold text-white">Change Password</h2>
              </div>
              <span className="text-[11px] text-zinc-400">
                Leave empty if you do not want to change your password
              </span>
            </div>

            <div className="space-y-4">
              {/* 1. Current Password */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="acc-current-pass"
                  className="text-xs font-semibold text-zinc-200 flex items-center justify-between"
                >
                  <span>Current Password</span>
                  {isChangingPass && !currentPassword && (
                    <span className="text-amber-400 text-[11px]">Required to confirm change</span>
                  )}
                </Label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <Input
                    id="acc-current-pass"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current account password"
                    className="pl-9 pr-9 text-xs bg-zinc-900/80 border-white/15 text-white rounded-xl focus-visible:ring-white/20 h-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-white transition"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* 2. New Password & 3. Confirm New Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* New Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="acc-new-pass" className="text-xs font-semibold text-zinc-200">
                    New Password
                  </Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                      id="acc-new-pass"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="pl-9 pr-9 text-xs bg-zinc-900/80 border-white/15 text-white rounded-xl focus-visible:ring-white/20 h-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-white transition"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="acc-confirm-pass" className="text-xs font-semibold text-zinc-200">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                      id="acc-confirm-pass"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="pl-9 pr-9 text-xs bg-zinc-900/80 border-white/15 text-white rounded-xl focus-visible:ring-white/20 h-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-white transition"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Match Status Helper Banner */}
              {isChangingPass && (
                <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-3 space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    {passLengthOk ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                    )}
                    <span className={passLengthOk ? "text-emerald-300" : "text-amber-300"}>
                      {passLengthOk
                        ? "New password length is valid (6+ characters)"
                        : "New password must be at least 6 characters"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {passMatch ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                    )}
                    <span className={passMatch ? "text-emerald-300" : "text-amber-300"}>
                      {passMatch
                        ? "New password and Confirm password match perfectly!"
                        : "Confirm password does not match new password"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit / Save Bar */}
          <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-zinc-950/90 p-4">
            <p className="text-xs text-zinc-400 hidden sm:block">
              Changes will take effect immediately across all studio apps.
            </p>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="ghost"
                disabled={isSaving}
                onClick={() => navigate({ to: "/" })}
                className="rounded-xl text-zinc-400 hover:text-white"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-white hover:bg-zinc-200 font-semibold text-black px-6 h-10 shadow-lg transition"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Changes...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" /> Save Profile Settings
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </SiteLayout>
  );
}
