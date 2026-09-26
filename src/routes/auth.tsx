import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Mail, ShieldCheck, LogOut, User } from "lucide-react";

import logo from "@/assets/vs-logo.png.asset.json";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, ROLE_LABEL, isStaffOrAbove } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Visual Studios" },
      {
        name: "description",
        content:
          "Sign in or register for Visual Studios to access recordings and the control panel.",
      },
      { property: "og:title", content: "Sign in — Visual Studios" },
      {
        property: "og:description",
        content:
          "Sign in or register for Visual Studios to access recordings and the control panel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp, signOut, resetPassword, user, role } = useAuth();

  const [tab, setTab] = useState<"signin" | "register" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetSentInfo, setResetSentInfo] = useState<{ email: string; token: string } | null>(null);

  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    setBusy(true);
    const result = await signIn(email.trim(), password);
    setBusy(false);

    if (!result.success) {
      toast.error(result.error || "Failed to sign in. Please verify your credentials.");
      return;
    }

    toast.success("Welcome back to Visual Studios!");
    void navigate({ to: "/" });
  };

  const handleSignUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please enter an email and password.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    const result = await signUp(email.trim(), password, displayName.trim());
    setBusy(false);

    if (!result.success) {
      toast.error(result.error || "Failed to register account.");
      return;
    }

    toast.success("Account created successfully! You are now logged in.");
    void navigate({ to: "/" });
  };

  const handleForgotPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      toast.error("Enter your account email address first.");
      return;
    }

    setBusy(true);
    const res = await resetPassword(email.trim());
    setBusy(false);

    if (!res.success) {
      toast.error(res.error || "Failed to send reset email.");
      return;
    }

    setResetSentInfo({ email: email.trim(), token: res.token || "token" });
    toast.success(
      "Password reset email generated! Follow the link below to choose a new password.",
    );
  };

  return (
    <SiteLayout>
      <main className="animate-fade-up-late mx-auto flex max-w-lg flex-col px-4 py-10 sm:px-6">
        <div className="glass-panel purple-glow rounded-3xl p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <img
              src={logo.url}
              alt="Visual Studios logo"
              referrerPolicy="no-referrer"
              className="h-12 sm:h-14 w-auto aspect-[16/9] rounded-2xl border border-zinc-800 bg-black object-contain shadow-lg shadow-black"
            />
            <div>
              <h1 className="font-display text-2xl font-bold uppercase tracking-widest text-foreground">
                {tab === "forgot" ? "Reset Password" : "Authentication"}
              </h1>
              <p className="text-xs text-muted-foreground">Visual Studios Member & Staff Portal</p>
            </div>
          </div>

          {!user && (
            <div className="mb-6">
              <Tabs
                value={tab}
                onValueChange={(v) => setTab(v as "signin" | "register" | "forgot")}
              >
                <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-zinc-900 p-1">
                  <TabsTrigger value="signin" className="rounded-xl">
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger value="register" className="rounded-xl">
                    Register Account
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          {user ? (
            <div className="rounded-2xl border border-glass-border bg-glass-highlight p-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="mt-3 text-lg font-semibold text-foreground">
                Signed in as {user.display_name}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {user.email} •{" "}
                <span
                  className={`font-semibold ${
                    user.role === "super_admin"
                      ? "text-red-400"
                      : user.role === "admin"
                        ? "text-purple-400"
                        : user.role === "staff"
                          ? "text-orange-400"
                          : "text-zinc-300"
                  }`}
                >
                  {ROLE_LABEL[user.role]}
                </span>
              </p>

              <div className="mt-5 flex flex-col gap-2.5">
                <Button asChild className="rounded-full shadow-lg shadow-primary/20">
                  <Link to="/">Go to Homepage</Link>
                </Button>

                <Button
                  asChild
                  variant="secondary"
                  className="rounded-full border border-purple-500/30 bg-purple-950/30 hover:bg-purple-900/40 text-purple-200"
                >
                  <Link to="/account">
                    <User className="mr-1.5 h-4 w-4 text-purple-400" /> Account Settings
                  </Link>
                </Button>

                {isStaffOrAbove(role) && (
                  <Button asChild variant="outline" className="rounded-full">
                    <Link to="/panel">Open Control Panel</Link>
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="rounded-full text-rose-400 hover:text-rose-300 border-rose-500/30 hover:bg-rose-950/20"
                  onClick={async () => {
                    await signOut();
                    toast.success("You have been signed out.");
                  }}
                >
                  <LogOut className="mr-1.5 h-4 w-4 text-rose-400" /> Sign out
                </Button>
              </div>
            </div>
          ) : tab === "forgot" ? (
            <div className="grid gap-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Enter your registered email address. We will send a secure password reset link to
                update your credentials.
              </p>

              <div className="grid gap-2">
                <Label htmlFor="forgot-email">Account Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="email"
                    className="rounded-xl pl-10"
                    placeholder="name@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {resetSentInfo && (
                <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-xs text-green-200">
                  <p className="font-semibold text-green-100">Reset Link Ready!</p>
                  <p className="mt-1 text-muted-foreground">
                    You can open the reset link below to choose your new password:
                  </p>
                  <Button
                    asChild
                    size="sm"
                    className="mt-3 w-full rounded-xl bg-green-600 text-white hover:bg-green-700"
                  >
                    <a href={`/reset-password?email=${encodeURIComponent(resetSentInfo.email)}`}>
                      Reset Password Now <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              )}

              <div className="mt-2 flex flex-col gap-2">
                <Button
                  className="rounded-full shadow-lg shadow-primary/20"
                  onClick={handleForgotPassword}
                  disabled={busy}
                >
                  {busy ? "Sending link…" : "Send password reset email"}
                </Button>
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  onClick={() => {
                    setTab("signin");
                    setResetSentInfo(null);
                  }}
                >
                  Back to sign in
                </button>
              </div>
            </div>
          ) : tab === "register" ? (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-300">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Public Registration Open
                </div>
                <p className="mt-1 text-zinc-400 leading-relaxed">
                  Create your account instantly. New accounts automatically appear in the Control
                  Panel where Founders and Admins can assign staff or player roles.
                </p>
              </div>

              <form onSubmit={handleSignUp} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="reg-name">Display / Staff Name</Label>
                  <Input
                    id="reg-name"
                    required
                    className="rounded-xl"
                    placeholder="Your Name or Handle"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="reg-email">Email Address</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    required
                    className="rounded-xl"
                    placeholder="name@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="reg-password">Password (min 6 chars)</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    required
                    className="rounded-xl"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="mt-2 grid gap-3">
                  <Button
                    type="submit"
                    className="rounded-full bg-white text-zinc-900 hover:bg-zinc-100 font-medium shadow-lg"
                    disabled={busy}
                  >
                    {busy ? "Creating account…" : "Register New Account"}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-300">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Staff & Creator Access Portal
                </div>
                <p className="mt-1 text-zinc-400 leading-relaxed">
                  Sign in with your registered email and password. All accounts are tracked in the
                  Control Panel for role management.
                </p>
              </div>

              <form onSubmit={handleSignIn} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    className="rounded-xl"
                    placeholder="name@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      onClick={() => setTab("forgot")}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    className="rounded-xl"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="mt-4 grid gap-3">
                  <Button
                    type="submit"
                    className="rounded-full bg-white text-zinc-900 hover:bg-zinc-100 font-medium shadow-lg"
                    disabled={busy}
                  >
                    {busy ? "Signing in…" : "Sign In to Studio Portal"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </SiteLayout>
  );
}
