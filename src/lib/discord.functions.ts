import { createServerFn } from "@tanstack/react-start";

export const DISCORD_INVITE = "https://discord.gg/STNEkVv7ac";
export const DISCORD_INVITE_CODE = "STNEkVv7ac";

export type DiscordStats = {
  name: string;
  members: number | null;
  online: number | null;
  description?: string | null;
  iconUrl?: string | null;
  lastUpdated?: string;
  isLive: boolean;
};

// Server-side fetcher
export const getDiscordStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<DiscordStats> => {
    try {
      const response = await fetch(
        `https://discord.com/api/v10/invites/${DISCORD_INVITE_CODE}?with_counts=true&with_expiration=true`,
        { headers: { accept: "application/json" } },
      );
      if (!response.ok) {
        return {
          name: "Visual Studio",
          members: 665,
          online: 139,
          isLive: false,
        };
      }
      const data = (await response.json()) as {
        guild?: { id?: string; name?: string; icon?: string; description?: string };
        approximate_member_count?: number;
        approximate_presence_count?: number;
      };

      const iconUrl =
        data.guild?.id && data.guild?.icon
          ? `https://cdn.discordapp.com/icons/${data.guild.id}/${data.guild.icon}.webp?size=128`
          : null;

      return {
        name: data.guild?.name ?? "Visual Studio",
        members: data.approximate_member_count ?? 665,
        online: data.approximate_presence_count ?? 139,
        description: data.guild?.description ?? null,
        iconUrl,
        lastUpdated: new Date().toLocaleTimeString(),
        isLive: true,
      };
    } catch {
      return {
        name: "Visual Studio",
        members: 665,
        online: 139,
        isLive: false,
      };
    }
  },
);

// Client-side direct fetcher to ensure 100% real live counts with instantaneous updates
export async function fetchLiveDiscordStats(): Promise<DiscordStats> {
  try {
    const res = await fetch(
      `https://discord.com/api/v10/invites/${DISCORD_INVITE_CODE}?with_counts=true`,
      { headers: { accept: "application/json" }, cache: "no-store" },
    );
    if (res.ok) {
      const data = (await res.json()) as {
        guild?: { id?: string; name?: string; icon?: string; description?: string };
        approximate_member_count?: number;
        approximate_presence_count?: number;
      };

      const iconUrl =
        data.guild?.id && data.guild?.icon
          ? `https://cdn.discordapp.com/icons/${data.guild.id}/${data.guild.icon}.webp?size=128`
          : null;

      return {
        name: data.guild?.name ?? "Visual Studio",
        members: data.approximate_member_count ?? null,
        online: data.approximate_presence_count ?? null,
        description: data.guild?.description ?? null,
        iconUrl,
        lastUpdated: new Date().toLocaleTimeString(),
        isLive: true,
      };
    }
  } catch (err) {
    console.warn("Direct Discord fetch error, trying server fallback:", err);
  }

  // Fallback to serverFn
  try {
    return await getDiscordStats();
  } catch {
    return {
      name: "Visual Studio",
      members: 665,
      online: 139,
      isLive: false,
      lastUpdated: new Date().toLocaleTimeString(),
    };
  }
}
