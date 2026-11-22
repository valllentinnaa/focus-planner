// The month card on web — a little celebration, in the welcome screen's language: drifting light,
// paper grain, staggered blur reveal, breathing headline with a self-drawing underline, a gold
// sparkle burst, your month as a constellation (one twinkling star per thing done, lines drawing
// in order), a rotating "sky" stamp, and a shimmering button. All motion stops under
// prefers-reduced-motion.
import { format } from "date-fns";
import { useEffect, useMemo } from "react";
import { fromISO } from "@/lib/dates";
import type { Star } from "@/lib/checkin";
import { moonLabel } from "@/lib/sky";
import { fonts } from "@/theme/tokens";
import type { MonthCardProps } from "./month-card";

export type { MonthCardProps };

const PAPER = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.55  0 0 0 0 0.5  0 0 0 0 0.42  0 0 0 0.55 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>',
)}")`;

const CSS = `
.fmc { position: fixed; inset: 0; z-index: 50; overflow-y: auto; overflow-x: hidden; background: var(--fp-paper); color: var(--fp-ink); }
.fmc * { box-sizing: border-box; }
.fmc-light { position: fixed; inset: -20%; pointer-events: none; }
.fmc-light::before, .fmc-light::after { content: ""; position: absolute; inset: 0; background-size: 300% 300%; }
.fmc-light::before { background-image: linear-gradient(115deg, transparent 30%, var(--fp-card-99) 44%, var(--fp-gold-22) 50%, transparent 64%); animation: fmc-sweep 12s ease-in-out infinite alternate; }
.fmc-light::after { background-image: linear-gradient(115deg, transparent 35%, var(--fp-gold-18) 48%, var(--fp-card-66) 53%, transparent 68%); animation: fmc-sweep 18s ease-in-out -7s infinite alternate-reverse; }
@keyframes fmc-sweep { from { background-position: 100% 0%; } to { background-position: 0% 100%; } }
.fmc-paper { position: fixed; inset: -5%; pointer-events: none; background-image: ${PAPER}; opacity: 0.3; mix-blend-mode: multiply; }
:root[data-theme="dark"] .fmc-paper { display: none; }
@media (prefers-color-scheme: dark) { :root[data-theme="system"] .fmc-paper { display: none; } }

.fmc-main { position: relative; max-width: 600px; margin: 0 auto; padding: 72px 24px 64px; }
.fmc-close { position: fixed; top: 18px; left: 18px; z-index: 2; width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center;
  background: var(--fp-card-99); border: 1px solid var(--fp-rule); color: var(--fp-mutedForeground); cursor: pointer; }
.fmc-close:hover { border-color: var(--fp-gold); color: var(--fp-gold); }

.fmc-r { animation: fmc-reveal 1.2s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: var(--d, 0ms); }
@keyframes fmc-reveal { from { opacity: 0; transform: translateY(14px); filter: blur(7px); } to { opacity: 1; transform: none; filter: blur(0); } }

.fmc-eyebrow { font-family: ${fonts.sans}; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--fp-mutedForeground); }
.fmc-h { position: relative; margin: 10px 0 8px; font-family: ${fonts.displayItalic}; font-weight: 400; font-size: 84px; line-height: 0.95; color: var(--fp-gold); }
.fmc-line { display: block; }
.fmc-breathe { display: inline-block; animation: fmc-breathe 6s ease-in-out 1.6s infinite; }
.fmc-b2 { animation-delay: 2.4s; }
@keyframes fmc-breathe { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
.fmc-done { position: relative; display: inline-block; }
.fmc-ul { position: absolute; left: 0; right: 0; bottom: -4px; height: 2px; background: var(--fp-gold); transform-origin: left; transform: scaleX(0);
  animation: fmc-ul 1.2s cubic-bezier(0.22, 1, 0.36, 1) 1.1s forwards; }
@keyframes fmc-ul { to { transform: scaleX(1); } }
.fmc-sub { font-family: ${fonts.sans}; font-size: 16px; line-height: 1.6; color: var(--fp-mutedForeground); margin: 18px 0 0; }

/* sparkle burst behind the headline, once */
.fmc-spark { position: absolute; left: 30%; top: 50%; width: 6px; height: 6px; border-radius: 50%; background: var(--fp-gold); opacity: 0; pointer-events: none;
  animation: fmc-burst 1.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; animation-delay: var(--sd); }
@keyframes fmc-burst { 0% { opacity: 0; transform: translate(0, 0) scale(0.4); } 15% { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--sx), var(--sy)) scale(1); } }

/* constellation: a small night sky, whatever the theme */
.fmc-sky { position: relative; margin-top: 40px; border-radius: 22px; overflow: hidden;
  background: radial-gradient(90% 70% at 85% 10%, rgba(231, 207, 150, 0.16), transparent 60%), linear-gradient(180deg, #1a1712 0%, #2b241b 100%);
  box-shadow: 0 24px 48px -28px rgba(0, 0, 0, 0.55); }
.fmc-sky svg { display: block; width: 100%; height: auto; }
.fmc-dust { fill: #f3e6c4; opacity: 0.25; animation: fmc-twinkle 4.5s ease-in-out infinite; animation-delay: var(--sd); }
.fmc-star { fill: #f0d79c; transform-box: fill-box; transform-origin: center; opacity: 0; filter: url(#fmc-glow);
  animation: fmc-pop 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards, fmc-twinkle 3.6s ease-in-out infinite;
  animation-delay: calc(var(--sd) + 900ms), calc(var(--sd) + 1600ms); }
@keyframes fmc-pop { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
@keyframes fmc-twinkle { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
.fmc-path { fill: none; stroke: #f0d79c; stroke-opacity: 0.35; stroke-width: 0.8; stroke-dasharray: 1; stroke-dashoffset: 1;
  animation: fmc-draw 3.2s ease-in-out 1.4s forwards; }
@keyframes fmc-draw { to { stroke-dashoffset: 0; } }
.fmc-moon { fill: #f3e2b4; filter: url(#fmc-moonglow); }
.fmc-band { font-family: ${fonts.sans}; font-size: 8px; letter-spacing: 0.25em; text-transform: uppercase; fill: #f3e6c4; opacity: 0.45; }
.fmc-cap { padding: 0 18px 16px; display: flex; justify-content: space-between; gap: 12px; font-family: ${fonts.displayItalic}; font-size: 15px; color: rgba(243, 230, 196, 0.75); }

/* numbers */
.fmc-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-top: 28px; }
.fmc-stat { border: 1px solid var(--fp-rule); border-radius: 16px; padding: 16px 18px; background: var(--fp-card-99); }
.fmc-n { font-family: ${fonts.display}; font-size: 54px; line-height: 1; color: var(--fp-gold); }
.fmc-n.small { font-family: ${fonts.displayItalic}; font-size: 30px; line-height: 1.15; }
.fmc-l { margin-top: 6px; font-family: ${fonts.sans}; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--fp-mutedForeground); }

.fmc-sec { margin-top: 36px; }
.fmc-label { font-family: ${fonts.sansSemiBold}; font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--fp-mutedForeground);
  padding-bottom: 10px; border-bottom: 1px solid var(--fp-rule); margin-bottom: 12px; }

.fmc-weeks { display: flex; align-items: flex-end; gap: 10px; height: 120px; }
.fmc-week { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; }
.fmc-col { position: relative; width: 100%; max-width: 54px; border-radius: 8px; background: var(--fp-muted); overflow: hidden; height: var(--h); min-height: 6px; }
.fmc-col i { position: absolute; left: 0; right: 0; bottom: 0; background: var(--fp-gold); height: 0; animation: fmc-grow 1.1s cubic-bezier(0.22, 1, 0.36, 1) forwards; animation-delay: var(--d); }
@keyframes fmc-grow { to { height: var(--f); } }
.fmc-wl { font-family: ${fonts.sans}; font-size: 11px; color: var(--fp-mutedForeground); }
.fmc-wn { font-family: ${fonts.sansMedium}; font-size: 12px; color: var(--fp-ink); }

.fmc-focus { display: flex; height: 14px; border-radius: 7px; overflow: hidden; background: var(--fp-muted); }
.fmc-focus i { display: block; height: 100%; transform-origin: left; transform: scaleX(0); animation: fmc-x 1s cubic-bezier(0.22, 1, 0.36, 1) forwards; animation-delay: var(--d); }
@keyframes fmc-x { to { transform: scaleX(1); } }
.fmc-legend { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 10px; font-family: ${fonts.sans}; font-size: 13px; color: var(--fp-ink); }
.fmc-legend b { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 7px; }
.fmc-focusline { font-family: ${fonts.displayItalic}; font-size: 24px; line-height: 1.25; color: var(--fp-ink); margin: 0 0 12px; }
.fmc-focusline em { font-style: normal; color: var(--fp-gold); }

.fmc-goal { display: flex; align-items: center; gap: 12px; padding: 9px 0; border-bottom: 1px dashed var(--fp-rule); }
.fmc-tick { flex: none; width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--fp-gold); display: grid; place-items: center; color: var(--fp-paper); }
.fmc-tick.on { background: var(--fp-gold); }
.fmc-gt { flex: 1; font-family: ${fonts.sans}; font-size: 15px; color: var(--fp-ink); }
.fmc-gt.on { color: var(--fp-mutedForeground); }
.fmc-ga { font-family: ${fonts.sans}; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--fp-mutedForeground); }
.fmc-dots { display: flex; gap: 4px; }
.fmc-dots span { width: 7px; height: 7px; border-radius: 50%; border: 1px solid var(--fp-gold); }
.fmc-dots span.on { background: var(--fp-gold); }

/* the sky stamp */
.fmc-stampwrap { display: grid; place-items: center; margin-top: 48px; }
.fmc-stamp { position: relative; width: 210px; height: 210px; display: grid; place-items: center; text-align: center; }
.fmc-ring { position: absolute; inset: 0; animation: fmc-spin 40s linear infinite; }
.fmc-ring text { font-family: ${fonts.sansMedium}; font-size: 9.5px; letter-spacing: 0.32em; text-transform: uppercase; fill: var(--fp-gold); }
@keyframes fmc-spin { to { transform: rotate(360deg); } }
.fmc-stamp-in { width: 150px; height: 150px; border-radius: 50%; border: 1px solid var(--fp-gold); display: grid; place-items: center; align-content: center; gap: 2px;
  background: radial-gradient(circle at 35% 30%, var(--fp-gold-22), transparent 70%); }
.fmc-moonbig { width: 34px; height: 34px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #fbf0d2, #e9cf92); box-shadow: 0 0 24px rgba(233, 207, 146, 0.8); margin: 0 auto 6px; }
.fmc-sname { font-family: ${fonts.displayItalic}; font-size: 21px; line-height: 1.1; color: var(--fp-gold); }
.fmc-sdate { font-family: ${fonts.sans}; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--fp-mutedForeground); }
.fmc-fun { margin: 22px auto 0; max-width: 440px; text-align: center; font-family: ${fonts.displayItalic}; font-size: 22px; line-height: 1.35; color: var(--fp-ink); }

.fmc-actions { margin-top: 48px; display: flex; flex-direction: column; gap: 12px; }
.fmc-primary { position: relative; overflow: hidden; height: 58px; border: 0; border-radius: 6px; background: var(--fp-gold); color: var(--fp-paper); cursor: pointer;
  font-family: ${fonts.sansMedium}; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease; }
.fmc-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 24px -12px rgba(0,0,0,0.35); }
.fmc-primary::after { content: ""; position: absolute; inset: 0; background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%);
  transform: translateX(-120%); animation: fmc-shine 6s ease-in-out 2.6s infinite; }
@keyframes fmc-shine { 0% { transform: translateX(-120%); } 22%, 100% { transform: translateX(120%); } }
.fmc-ghost { align-self: center; background: none; border: 0; padding: 8px 12px; cursor: pointer; color: var(--fp-ink); font-family: ${fonts.sansMedium}; font-size: 14px; }
.fmc-ghost:hover { text-decoration: underline; text-underline-offset: 4px; text-decoration-color: var(--fp-gold); }
.fmc-note { text-align: center; font-family: ${fonts.sans}; font-size: 13px; color: var(--fp-mutedForeground); }
.fmc-primary:focus-visible, .fmc-ghost:focus-visible, .fmc-close:focus-visible { outline: 2px solid var(--fp-gold); outline-offset: 3px; }

@media (max-width: 520px) { .fmc-h { font-size: 64px; } .fmc-n { font-size: 44px; } }
@media (prefers-reduced-motion: reduce) {
  .fmc *, .fmc *::before, .fmc *::after { animation: none !important; transition: none !important; }
  .fmc-r, .fmc-star { opacity: 1; transform: none; filter: none; }
  .fmc-ul, .fmc-focus i { transform: scaleX(1); }
  .fmc-col i { height: var(--f); }
  .fmc-path { stroke-dashoffset: 0; }
  .fmc-spark { display: none; }
}
`;

const AREA_COLORS: Record<string, string> = {
  work: "var(--fp-gold)",
  personal: "var(--fp-gold-66)",
  development: "var(--fp-ink)",
  habits: "var(--fp-mutedForeground)",
};

/** Faint background stars, seeded by the month so it looks the same every time. */
function dustFor(month: string, w: number, h: number) {
  let seed = 0;
  for (const c of month) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  return Array.from({ length: 46 }, () => ({ x: rnd() * w, y: rnd() * h, r: 0.4 + rnd() * 0.9, sd: `${Math.round(rnd() * 4000)}ms` }));
}

const W = 600;
const H = 300;

const d = (ms: number) => ({ ["--d" as string]: `${ms}ms` });

export function MonthCard({ month, recap: r, sky, areaLabel, onShare, shareNote, ready, onClose }: MonthCardProps) {
  useEffect(() => {
    if (!document.getElementById("fmc-css")) {
      const style = document.createElement("style");
      style.id = "fmc-css";
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const name = format(fromISO(month), "MMMM");
  
  // One constellation per life area, joined in the order things got done.
  const constellations = useMemo(() => {
    const by = new Map<string, Star[]>();
    for (const p of r.stars) by.set(p.area ?? "other", [...(by.get(p.area ?? "other") ?? []), p]);
    return [...by.values()].filter((g) => g.length > 1).map((g) => [...g].sort((a, b) => a.x - b.x));
  }, [r.stars]);
  // Faint background stars, the same for a given month.
  const dust = useMemo(() => dustFor(month, W, H), [month]);
  const sparks = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const dist = 90 + ((i * 37) % 70);
        return { sx: `${Math.cos(a) * dist}px`, sy: `${Math.sin(a) * dist * 0.6}px`, sd: `${500 + (i % 5) * 60}ms` };
      }),
    [],
  );
  // Leading/trailing weeks with nothing planned (the month's partial edges) are left out.
  const weeks = useMemo(() => {
    let a = 0;
    let b = r.weeks.length;
    while (a < b && !r.weeks[a]!.planned) a++;
    while (b > a && !r.weeks[b - 1]!.planned) b--;
    return r.weeks.slice(a, b);
  }, [r.weeks]);
  const maxPlanned = Math.max(1, ...weeks.map((w) => w.planned));
  const goalsDone = r.goals.filter((g) => g.done).length;

  return (
    <div className="fmc" role="dialog" aria-label={`Your ${name}`}>
      <div className="fmc-light" aria-hidden />
      <div className="fmc-paper" aria-hidden />
      <button type="button" className="fmc-close" onClick={onClose} aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <main className="fmc-main">
        <div className="fmc-eyebrow fmc-r" style={d(0)}>Your month · {format(fromISO(month), "yyyy")}</div>
        <h1 className="fmc-h">
          {sparks.map((s, i) => (
            <i key={i} className="fmc-spark" style={{ ["--sx" as string]: s.sx, ["--sy" as string]: s.sy, ["--sd" as string]: s.sd }} aria-hidden />
          ))}
          <span className="fmc-line fmc-r" style={d(150)}>
            <span className="fmc-breathe">{name},</span>
          </span>
          <span className="fmc-line fmc-r" style={d(400)}>
            <span className="fmc-breathe fmc-b2">
              <span className="fmc-done">
                done.
                <i className="fmc-ul" aria-hidden />
              </span>
            </span>
          </span>
        </h1>
        <p className="fmc-sub fmc-r" style={d(650)}>
          Take a minute with it. Look how far this month took you.
        </p>

        <section className="fmc-sky fmc-r" style={d(800)} aria-label={`${r.doneCount} stars, one for each thing done`}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-hidden>
            <defs>
              <filter id="fmc-glow" x="-200%" y="-200%" width="500%" height="500%">
                <feGaussianBlur stdDeviation="2.2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="fmc-moonglow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="7" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {dust.map((p, i) => (
              <circle key={`d${i}`} className="fmc-dust" cx={p.x} cy={p.y} r={p.r} style={{ ["--sd" as string]: p.sd }} />
            ))}
            <text className="fmc-band" x="18" y={H * 0.22}>Work</text>
            <text className="fmc-band" x="18" y={H * 0.5}>Growth</text>
            <text className="fmc-band" x="18" y={H * 0.78}>Life</text>
            <circle className="fmc-moon" cx={W - 58} cy={50} r={17} />
            {constellations.map((pts, i) => (
              <polyline key={`c${i}`} className="fmc-path" pathLength={1} points={pts.map((p) => `${p.x * W},${p.y * H}`).join(" ")} />
            ))}
            {r.stars.map((p, i) => (
              <circle key={i} className="fmc-star" cx={p.x * W} cy={p.y * H} r={p.r} style={{ ["--sd" as string]: `${p.delay}ms` }} />
            ))}
          </svg>
          <div className="fmc-cap">
            <span>{r.doneCount ? "One star for everything you did." : "A quiet sky this month."}</span>
            <span>{moonLabel(sky)}</span>
          </div>
        </section>

        <div className="fmc-stats">
          <div className="fmc-stat fmc-r" style={d(1000)}>
            <div className="fmc-n">{r.doneCount}</div>
            <div className="fmc-l">things done</div>
          </div>
          {r.perDay >= 1 || r.perWeek >= 1 ? (
            <div className="fmc-stat fmc-r" style={d(1100)}>
              <div className="fmc-n">~{r.perDay >= 1 ? r.perDay : r.perWeek}</div>
              <div className="fmc-l">{r.perDay >= 1 ? "a day, on average" : "a week, on average"}</div>
            </div>
          ) : null}
          {r.goals.length ? (
            <div className="fmc-stat fmc-r" style={d(1200)}>
              <div className="fmc-n">
                {goalsDone}/{r.goals.length}
              </div>
              <div className="fmc-l">12-week goals done</div>
            </div>
          ) : null}
        </div>

        {r.focus.length ? (
          <section className="fmc-sec fmc-r" style={d(1300)}>
            <div className="fmc-label">Where your focus went</div>
            {r.topArea ? (
              <p className="fmc-focusline">
                Most of it went to <em>{areaLabel(r.topArea)}</em>.
              </p>
            ) : (
              <p className="fmc-focusline">A balanced month — spread across your life.</p>
            )}
            <div className="fmc-focus">
              {r.focus.map((f, i) => (
                <i key={f.area} style={{ width: `${f.share}%`, background: AREA_COLORS[f.area] ?? "var(--fp-rule)", ...d(1500 + i * 200) }} />
              ))}
            </div>
            <div className="fmc-legend">
              {r.focus.map((f) => (
                <span key={f.area}>
                  <b style={{ background: AREA_COLORS[f.area] ?? "var(--fp-rule)" }} />
                  {areaLabel(f.area)} · {f.share}%
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <section className="fmc-sec fmc-r" style={d(1400)}>
          <div className="fmc-label">Week by week · done / planned</div>
          <div className="fmc-weeks">
            {weeks.map((w, i) => (
              <div key={w.start} className="fmc-week">
                <span className="fmc-wn">{w.planned ? `${w.done}/${w.planned}` : "—"}</span>
                <div
                  className="fmc-col"
                  style={{ ["--h" as string]: `${Math.max(8, (w.planned / maxPlanned) * 80)}px`, ["--f" as string]: `${w.planned ? (w.done / w.planned) * 100 : 0}%` }}
                >
                  <i style={d(1700 + i * 120)} />
                </div>
                <span className="fmc-wl">{format(fromISO(w.start), "MMM d")}</span>
              </div>
            ))}
          </div>
        </section>

        {r.goals.length ? (
          <section className="fmc-sec fmc-r" style={d(1500)}>
            <div className="fmc-label">Your 12-week goals</div>
            {r.goals.map((g, i) => (
              <div key={i} className="fmc-goal">
                <span className={`fmc-tick${g.done ? " on" : ""}`}>
                  {g.done ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  ) : null}
                </span>
                <span className={`fmc-gt${g.done ? " on" : ""}`}>{g.text}</span>
                {g.steps ? (
                  <span className="fmc-dots" aria-label={`${g.steps.done} of ${g.steps.total} steps`}>
                    {Array.from({ length: Math.min(g.steps.total, 8) }, (_, k) => (
                      <span key={k} className={k < g.steps!.done ? "on" : ""} />
                    ))}
                  </span>
                ) : (
                  <span className="fmc-ga">{areaLabel(g.area)}</span>
                )}
              </div>
            ))}
          </section>
        ) : null}

        <section className="fmc-stampwrap fmc-r" style={d(1600)}>
          <div className="fmc-stamp">
            <svg className="fmc-ring" viewBox="0 0 210 210" aria-hidden>
              <defs>
                <path id="fmc-circle" d="M105,105 m-92,0 a92,92 0 1,1 184,0 a92,92 0 1,1 -184,0" />
              </defs>
              <text>
                <textPath href="#fmc-circle" textLength={570} lengthAdjust="spacing">
                  {`${name} ${format(fromISO(month), "yyyy")} · ${sky.season} · ${sky.retrogrades.length ? `${sky.retrogrades.join(" · ")} ℞ · ` : ""}`}
                </textPath>
              </text>
            </svg>
            <div className="fmc-stamp-in">
              <div className="fmc-moonbig" />
              <div className="fmc-sname">{sky.moon.name} Moon</div>
              <div className="fmc-sdate">{format(sky.moon.date, "MMM d")}</div>
            </div>
          </div>
          <p className="fmc-fun">{sky.line}</p>
        </section>

        <div className="fmc-actions fmc-r" style={d(1800)}>
          {ready ? (
            <button type="button" className="fmc-primary" onClick={ready.onPress}>
              {ready.label}
            </button>
          ) : null}
          <button type="button" className={ready ? "fmc-ghost" : "fmc-primary"} onClick={onShare}>
            Share my month
          </button>
          {shareNote ? <div className="fmc-note">{shareNote}</div> : null}
        </div>
      </main>
    </div>
  );
}
