// Small in-page oyster loader (web). Uses the loader styles that index.html already carries
// (scripts/pwa-head.mjs inlines oyster-loader.css), so nothing extra is downloaded.
import type { CSSProperties } from "react";
import sparks from "./sparks.json";

const v = (o: Record<string, string | number>) => o as CSSProperties;

export function OysterLoader({
  size = 72,
  hint = "One moment…",
  wordmark = false,
  rule = false,
}: {
  size?: number;
  hint?: string | false;
  /** "Focus planner" under the oyster. */
  wordmark?: boolean;
  /** The gold light travelling along a ruled line. */
  rule?: boolean;
}) {
  return (
    <div role="status" aria-label="Loading" className="oyster-loader" style={v({ "--ol-size": `${size}px`, alignSelf: "center", margin: "12px auto" })}>
      <div className="oyster-loader__stage">
        <span className="oyster-loader__lines" />
        <img src="/loader/oyster-mark.webp" className="oyster-loader__mark" alt="" draggable={false} />
        <img src="/loader/oyster-mark.webp" className="oyster-loader__rings" alt="" draggable={false} />
        <span className="oyster-loader__ripple" style={v({ "--rd": "2.6s" })} />
        <span className="oyster-loader__ripple" style={v({ "--rd": "5.2s" })} />
        <img src="/loader/oyster-closed.webp" className="oyster-loader__lid" alt="" draggable={false} />
        <span className="oyster-loader__glow">
          <span className="oyster-loader__bloom" />
          <span className="oyster-loader__spread" />
          <span className="oyster-loader__halo" />
          <span className="oyster-loader__sparks">
            {sparks.ambient.map(([x, y, s, d, u], i) => (
              <span key={i} className="oyster-loader__spark" style={v({ "--sx": `${x}%`, "--sy": `${y}%`, "--ss": s!, "--sdl": `${d}s`, "--sd": `${u}s` })} />
            ))}
          </span>
        </span>
        <span className="oyster-loader__burst">
          {sparks.burst.map(([dx, dy, s, d, u], i) => (
            <span key={i} className="oyster-loader__bspark" style={v({ "--dx": dx!, "--dy": dy!, "--ss": s!, "--bdl": `${d}s`, "--bd": `${u}s` })} />
          ))}
        </span>
      </div>
      {wordmark ? (
        <p className="oyster-loader__label">
          Focus <em>planner</em>
        </p>
      ) : null}
      {rule ? <span className="oyster-loader__rule" /> : null}
      {hint ? <p className="oyster-loader__hint">{hint}</p> : null}
    </div>
  );
}
