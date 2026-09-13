import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";

import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — Visual Studios" },
      {
        name: "description",
        content: "Set a new password for your Visual Studios account after a reset request.",
      },
      { property: "og:title", content: "Choose a new password — Visual Studios" },
      {
        property: "og:description",
        content: "Set a new password for your Visual Studios account after a reset request.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { confirmPasswordReset } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get("email");
      if (emailParam) {
        setEmail(emailParam);
      }
    }
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email) {
      toast.error("Please provide your account email address.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match. Please re-type your confirmation password.");
      return;
    }

    setBusy(true);
    const result = await confirmPasswordReset(email, password);
    setBusy(false);

    if (!result.success) {
      toast.error(result.error || "Failed to update password. Please check your email.");
      return;
    }

    toast.success("Password reset successfully! You can now sign in with your new password.");
    void navigate({ to: "/auth" });
  };

  return (
    <SiteLayout>
      <main className="animate-fade-up-late mx-auto max-w-md px-4 py-12 sm:px-6">
        <div className="glass-panel purple-glow rounded-3xl p-6 sm:p-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-glass-border px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
            <KeyRound className="h-3.5 w-3.5 text-primary" /> Credential Recovery
          </div>

          <h1 className="font-display text-2xl font-bold uppercase tracking-widest">
            Set New Password
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email and define a new secure password for your Visual Studios account.
          </p>

          <form onSubmit={handleSave} className="mt-6 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="account-email">Account Email</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="account-email"
                  type="email"
                  required
                  placeholder="name@domain.com"
                  className="rounded-xl pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                required
                placeholder="At least 6 characters"
                className="rounded-xl"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                placeholder="Re-enter new password"
                className="rounded-xl"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              className="mt-2 w-full rounded-full shadow-lg shadow-primary/20"
              disabled={busy}
            >
              {busy ? "Updating credentials…" : "Save New Password"}
            </Button>
          </form>
        </div>
      </main>
    </SiteLayout>
  );
}
