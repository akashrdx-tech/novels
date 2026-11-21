import { useEffect, useRef, useState } from "react";
import logo from "@/assets/logo.png";

const KEY = "nf-intro-seen";
/** Served with the website itself so it plays on every host (Lovable or Vercel). */
const WELCOME_AUDIO = "/media/welcome-novels-forever.mp3";
/** How long the book animation runs before the overlay fades away (matches the CSS timings). */
const INTRO_MS = 3800;
/** If the browser neither starts nor blocks the sound by then, open the book without it. */
const AUDIO_DECISION_MS = 1500;

type Phase = "pending" | "tap" | "playing" | "done";

/**
 * Book-opening intro, shown once per browser session, with the "Novels Forever mein khush
 * aamdeed" greeting starting together with the animation. When the browser blocks sound until
 * the visitor taps, the closed book waits on "Tap to open" and the tap starts both at once.
 */
export function IntroOverlay() {
  const [phase, setPhase] = useState<Phase>("pending");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === "1";
    } catch {
      /* ignore */
    }
    if (seen) {
      setPhase("done");
      return;
    }

    const audio = new Audio(WELCOME_AUDIO);
    audio.preload = "auto";
    audio.volume = 0.9;
    audioRef.current = audio;

    let decided = false;
    const decide = (next: Phase) => {
      if (decided) return;
      decided = true;
      setPhase(next);
    };
    audio
      .play()
      .then(() => decide("playing"))
      .catch(() => decide("tap"));
    const fallback = window.setTimeout(() => decide("playing"), AUDIO_DECISION_MS);

    return () => {
      decided = true;
      window.clearTimeout(fallback);
      audio.pause();
    };
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    const t = window.setTimeout(() => setPhase("done"), INTRO_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === "done") return null;

  const open = () => {
    if (phase === "tap") {
      // Inside the tap itself, so the browser allows the sound.
      void audioRef.current?.play().catch(() => {
        /* sound unavailable; the book still opens */
      });
      setPhase("playing");
    } else if (phase === "playing") {
      setPhase("done");
    }
  };

  return (
    <div
      className={`intro-overlay fixed inset-0 z-[100] flex flex-col items-center justify-center bg-night ${phase === "playing" ? "" : "intro-wait"}`}
      onClick={open}
      role="presentation"
    >
      <div className="intro-book relative h-64 w-48 sm:h-80 sm:w-60">
        <div className="intro-glow absolute -inset-16 rounded-full bg-glow-radial" />
        {/* inner pages */}
        <div className="absolute inset-0 rounded-r-lg bg-parchment shadow-book" />
        <div className="absolute inset-0 flex items-center justify-center">
          <img src={logo} alt="" className="h-28 w-28 sm:h-36 sm:w-36" />
        </div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="intro-page absolute inset-0 rounded-r-lg border-l border-parchment-foreground/10 bg-parchment"
            style={{ animationDelay: `${0.9 + i * 0.18}s` }}
          />
        ))}
        {/* cover */}
        <div className="intro-cover gold-frame absolute inset-0 flex flex-col items-center justify-center rounded-r-lg bg-leather shadow-book">
          <img src={logo} alt="" className="h-20 w-20 opacity-90" />
          <span className="mt-3 font-display text-2xl text-gold">Novels Forever</span>
        </div>
      </div>
      {phase === "tap" ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
          className="intro-tap mt-10 rounded-full border border-primary/60 px-7 py-3 font-display text-2xl text-gold"
          autoFocus
        >
          Tap to open
        </button>
      ) : (
        <>
          <h1 className="intro-title mt-10 font-display text-4xl text-gold sm:text-5xl">Novels Forever</h1>
          <p className="intro-title mt-2 text-sm uppercase tracking-[0.3em] text-muted-foreground">
            Every story, one library
          </p>
        </>
      )}
    </div>
  );
}
