// Web welcome screen — real HTML + CSS keyframes (staggered blur reveal, breathing headline,
// self-drawing underline, drifting daylight, paper texture, cursor parallax, button shimmer,
// pulsing markers, exit transition). The only JS: two CSS variables from the mouse position.
// Everything stops under prefers-reduced-motion.
import { useEffect, useRef, useState } from "react";
import { fonts } from "@/theme/tokens";
import { getThemePref, resolveTheme, setThemePref } from "@/theme/theme";
import type { WebWelcomeProps } from "./welcome-web";

export type { WebWelcomeProps };

const EXIT_MS = 350;

// Subtle paper grain (SVG noise), multiplied over the cream background in light mode only.
const PAPER = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.55  0 0 0 0 0.5  0 0 0 0 0.42  0 0 0 0.55 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>',
)}")`;

const CSS = `
.fpw { position: fixed; inset: 0; min-height: 100svh; display: grid; place-items: center; overflow: hidden;
  background: var(--fp-paper); color: var(--fp-ink); --welcome-x: 0; --welcome-y: 0; }
.fpw * { box-sizing: border-box; }

/* 4 · drifting daylight + 6 · light layer parallax (opposite, 2x) */
.fpw-light { position: absolute; inset: -20%; pointer-events: none;
  transform: translate(calc(var(--welcome-x) * -22px), calc(var(--welcome-y) * -22px));
  transition: transform 1.8s cubic-bezier(0.22, 1, 0.36, 1); }
.fpw-light::before, .fpw-light::after { content: ""; position: absolute; inset: 0; background-size: 300% 300%; }
.fpw-light::before { background-image: linear-gradient(115deg, transparent 30%, var(--fp-card-99) 44%, var(--fp-gold-22) 50%, transparent 64%);
  animation: fpw-sweep 12s ease-in-out infinite alternate; }
.fpw-light::after { background-image: linear-gradient(115deg, transparent 35%, var(--fp-gold-18) 48%, var(--fp-card-66) 53%, transparent 68%);
  animation: fpw-sweep 18s ease-in-out -7s infinite alternate-reverse; }
:root[data-theme="dark"] .fpw-light::before { background-image: linear-gradient(115deg, transparent 30%, var(--fp-gold-18) 46%, var(--fp-gold-22) 50%, transparent 64%); }
:root[data-theme="dark"] .fpw-light::after { background-image: linear-gradient(115deg, transparent 35%, var(--fp-gold-18) 50%, transparent 68%); }
@keyframes fpw-sweep { from { background-position: 100% 0%; } to { background-position: 0% 100%; } }

/* 5 · paper texture drift (light mode only) */
.fpw-paper { position: absolute; inset: -5%; pointer-events: none; background-image: ${PAPER}; opacity: 0.3; mix-blend-mode: multiply;
  animation: fpw-paper 16s ease-in-out infinite alternate; }
:root[data-theme="dark"] .fpw-paper { display: none; }
@media (prefers-color-scheme: dark) { :root[data-theme="system"] .fpw-paper { display: none; } }
@keyframes fpw-paper { from { transform: scale(1.04); } to { transform: scale(1.09); } }

/* 6 · content parallax */
.fpw-content { position: relative; width: 100%; max-width: 480px; padding: 0 24px;
  transform: translate(calc(var(--welcome-x) * 11px), calc(var(--welcome-y) * 11px));
  transition: transform 1s cubic-bezier(0.22, 1, 0.36, 1); }
/* 9 · exit */
.fpw-exit { transition: opacity ${EXIT_MS}ms ease, transform ${EXIT_MS}ms ease; }
.fpw-exit[data-exiting="1"] { opacity: 0; transform: translateY(-8px); }

/* 1 · staggered reveal */
.fpw-r { animation: fpw-reveal 1.2s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: var(--d, 0ms); }
@keyframes fpw-reveal { from { opacity: 0; transform: translateY(14px); filter: blur(7px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }

.fpw-brand { font-family: ${fonts.display}; font-size: 30px; line-height: 1; color: var(--fp-ink); margin: 0 0 36px; }
.fpw-mark-dark { display: none !important; }
:root[data-theme="dark"] .fpw-mark-dark { display: block !important; }
:root[data-theme="dark"] .fpw-mark-light { display: none !important; }
@media (prefers-color-scheme: dark) {
  :root[data-theme="system"] .fpw-mark-dark { display: block !important; }
  :root[data-theme="system"] .fpw-mark-light { display: none !important; }
}
.fpw-mark { display: block; width: 64px; height: 64px; border-radius: 15px; margin: 0 0 18px; box-shadow: 0 1px 2px rgba(0,0,0,.08); }
.fpw-brand em { font-family: ${fonts.displayItalic}; font-style: normal; color: var(--fp-gold); }

.fpw-h { margin: 0; font-family: ${fonts.displayItalic}; font-weight: 400; font-size: 76px; line-height: 0.98; letter-spacing: -0.01em; color: var(--fp-gold); }
.fpw-line { display: block; }
/* 2 · breathing headline (after the entrance; second line out of phase) */
.fpw-breathe { display: inline-block; animation: fpw-breathe 6s ease-in-out 1.6s infinite; }
.fpw-breathe.fpw-b2 { animation-delay: 2.4s; }
@keyframes fpw-breathe { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }

/* 3 · "life." underline draws itself, holds, fades — every 7s */
.fpw-life { position: relative; display: inline-block; }
.fpw-ul { position: absolute; left: 0; right: 0; bottom: -6px; height: 1px; background: var(--fp-gold); transform-origin: left;
  transform: scaleX(0); animation: fpw-ul 7s ease-in-out 1.6s infinite; }
@keyframes fpw-ul { 0% { transform: scaleX(0); opacity: 1; } 22% { transform: scaleX(1); opacity: 1; } 70% { transform: scaleX(1); opacity: 1; }
  86% { transform: scaleX(1); opacity: 0; } 100% { transform: scaleX(0); opacity: 0; } }

.fpw-copy { margin: 34px 0 0; font-family: ${fonts.sans}; font-size: 17px; line-height: 1.6; color: var(--fp-mutedForeground); }

.fpw-actions { margin-top: 40px; display: flex; flex-direction: column; align-items: stretch; gap: 14px; }
/* 7 · primary button: shimmer every 6s; hover lifts, arrow nudges */
.fpw-primary { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; height: 56px; padding: 0 24px;
  border: 0; border-radius: 6px; background: var(--fp-gold); color: var(--fp-paper); cursor: pointer;
  font-family: ${fonts.sansMedium}; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease; }
.fpw-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 24px -12px rgba(0,0,0,0.35); }
.fpw-primary:focus-visible, .fpw-ghost:focus-visible, .fpw-theme:focus-visible { outline: 2px solid var(--fp-gold); outline-offset: 3px; }
.fpw-arrow { position: absolute; right: 22px; top: 50%; margin-top: -8px; transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
.fpw-primary:hover .fpw-arrow { transform: translateX(4px); }
.fpw-primary::after { content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%);
  transform: translateX(-120%); animation: fpw-shine 6s ease-in-out 2.6s infinite; }
@keyframes fpw-shine { 0% { transform: translateX(-120%); } 22%, 100% { transform: translateX(120%); } }
.fpw-ghost { align-self: center; background: none; border: 0; padding: 8px 12px; cursor: pointer; color: var(--fp-ink);
  font-family: ${fonts.sansMedium}; font-size: 14px; opacity: 0.85; }
.fpw-ghost:hover { opacity: 1; text-decoration: underline; text-underline-offset: 4px; text-decoration-color: var(--fp-gold); }

/* 5 · theme toggle */
.fpw-theme { position: absolute; top: 20px; right: 20px; width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center;
  background: transparent; border: 1px solid var(--fp-rule); color: var(--fp-gold); cursor: pointer; z-index: 2;
  transition: border-color 0.3s ease; }
.fpw-theme:hover { border-color: var(--fp-gold); }

/* 8 · bottom markers pulse in sequence */
.fpw-markers { position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; }
.fpw-markers i { display: block; width: 20px; height: 1px; background: var(--fp-rule); transform-origin: center;
  animation: fpw-mark 4.5s ease-in-out infinite; }
.fpw-markers i:nth-child(2) { animation-delay: 1.5s; }
.fpw-markers i:nth-child(3) { animation-delay: 3s; }
@keyframes fpw-mark { 0%, 30%, 100% { background: var(--fp-rule); transform: scaleX(1); } 12% { background: var(--fp-gold); transform: scaleX(1.5); } }

@media (max-width: 640px) { .fpw-h { font-size: 58px; } }
@media (max-width: 360px) { .fpw-h { font-size: 48px; } }

@media (prefers-reduced-motion: reduce) {
  .fpw *, .fpw *::before, .fpw *::after { animation: none !important; transition: none !important; }
  .fpw-r { opacity: 1; transform: none; filter: none; }
  .fpw-ul { transform: scaleX(1); opacity: 1; }
}
`;

function Sun() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}
function Moon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

const isDarkNow = () =>
  resolveTheme(getThemePref(), window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light") === "dark";

export function WebWelcome({ onStart, onSignIn }: WebWelcomeProps) {
  const root = useRef<HTMLDivElement>(null);
  const [exiting, setExiting] = useState(false);
  const [dark, setDark] = useState(isDarkNow);

  useEffect(() => {
    if (!document.getElementById("fpw-css")) {
      const style = document.createElement("style");
      style.id = "fpw-css";
      style.textContent = CSS;
      document.head.appendChild(style);
    }
  }, []);

  // 6 · cursor parallax — mouse only (never touch), skipped when reduced motion is on.
  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      el.style.setProperty("--welcome-x", x.toFixed(3));
      el.style.setProperty("--welcome-y", y.toFixed(3));
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // 9 · exit: fade + slide up, then go.
  const leave = (go: () => void) => {
    if (exiting) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setExiting(true);
    setTimeout(go, reduce ? 0 : EXIT_MS);
  };

  const toggleTheme = () => {
    const next = dark ? "light" : "dark";
    void setThemePref(next);
    setDark(!dark);
  };

  return (
    <div className="fpw" ref={root}>
      <div className="fpw-light" aria-hidden />
      <div className="fpw-paper" aria-hidden />
      <button type="button" className="fpw-theme" onClick={toggleTheme} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
        {dark ? <Sun /> : <Moon />}
      </button>

      <main className="fpw-content">
        <div className="fpw-exit" data-exiting={exiting ? "1" : "0"}>
          <div className="fpw-brand fpw-r" style={{ ["--d" as string]: "0ms" }}>
            <img className="fpw-mark fpw-mark-light" src="/icons/icon-192.png" width={64} height={64} alt="" />
            <img className="fpw-mark fpw-mark-dark" src="/icons/icon-192-dark.png" width={64} height={64} alt="" />
            Focus <em>planner</em>
          </div>
          <h1 className="fpw-h">
            <span className="fpw-line fpw-r" style={{ ["--d" as string]: "180ms" }}>
              <span className="fpw-breathe">Be on top</span>
            </span>
            <span className="fpw-line fpw-r" style={{ ["--d" as string]: "440ms" }}>
              <span className="fpw-breathe fpw-b2">
                of your{" "}
                <span className="fpw-life">
                  life.
                  <i className="fpw-ul" aria-hidden />
                </span>
              </span>
            </span>
          </h1>
          <p className="fpw-copy fpw-r" style={{ ["--d" as string]: "750ms" }}>
            Organisation that’s actually simple.
            <br />
            Don’t get overwhelmed.
          </p>
          <div className="fpw-actions fpw-r" style={{ ["--d" as string]: "950ms" }}>
            <button type="button" className="fpw-primary" onClick={() => leave(onStart)}>
              <span>Get started</span>
              <svg className="fpw-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
            <button type="button" className="fpw-ghost" onClick={() => leave(onSignIn)}>
              Open my planner
            </button>
          </div>
        </div>
      </main>

      <div className="fpw-markers" aria-hidden>
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
