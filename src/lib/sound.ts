// Web Audio API notification sound synthesizer and audio alert system

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

const SOUND_MUTE_KEY = "vs_sound_alerts_muted";

export function isSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SOUND_MUTE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setSoundMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SOUND_MUTE_KEY, muted ? "true" : "false");
    window.dispatchEvent(new CustomEvent("vs_sound_mute_changed", { detail: { muted } }));
  } catch {
    // Ignored
  }
}

export function toggleSoundMute(): boolean {
  const current = isSoundMuted();
  setSoundMuted(!current);
  return !current;
}

/**
 * Play a high-quality studio chime when a recording is assigned to staff.
 * Uses harmonized sine waves with smooth ADSR decay.
 */
export function playAssignmentChime(): void {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Harmonized triad bell sequence (D5 -> F#5 -> A5 -> D6)
    const notes = [
      { freq: 587.33, start: 0, duration: 0.4, gain: 0.25 }, // D5
      { freq: 739.99, start: 0.1, duration: 0.45, gain: 0.3 }, // F#5
      { freq: 880.0, start: 0.2, duration: 0.5, gain: 0.35 }, // A5
      { freq: 1174.66, start: 0.3, duration: 0.8, gain: 0.4 }, // D6 (Top chime)
    ];

    notes.forEach(({ freq, start, duration, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);

      // Smooth attack & exponential decay
      gainNode.gain.setValueAtTime(0.0001, now + start);
      gainNode.gain.exponentialRampToValueAtTime(gain, now + start + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration + 0.05);
    });
  } catch (err) {
    console.warn("Could not play assignment chime:", err);
  }
}

/**
 * Play a short alert ping
 */
export function playAlertPing(): void {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.3, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // Ignored
  }
}
