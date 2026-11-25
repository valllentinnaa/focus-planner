// Runs after `expo export -p web` (output: single), which doesn't use +html.tsx:
//  1. injects PWA + iOS install tags into dist/index.html;
//  2. inlines the oyster opening loader, so it shows the moment the page arrives — before any
//     JavaScript loads. The app fades it out once it's ready (src/lib/opening-loader.web.ts).
import { readFileSync, writeFileSync } from "node:fs";

const file = "dist/index.html";
const base = process.env.EXPO_BASE_URL || ""; // "" at a root host (Cloudflare)
const tags = [
  `<link rel="manifest" href="${base}/manifest.webmanifest"/>`,
  `<meta name="theme-color" content="#ede9e0"/>`,
  `<meta name="mobile-web-app-capable" content="yes"/>`,
  `<meta name="apple-mobile-web-app-capable" content="yes"/>`,
  `<meta name="apple-mobile-web-app-status-bar-style" content="default"/>`,
  `<meta name="apple-mobile-web-app-title" content="Focus Planner"/>`,
  `<link rel="apple-touch-icon" href="${base}/icons/apple-touch-icon.png"/>`,
].join("");

let html = readFileSync(file, "utf8");
if (html.includes('rel="manifest"')) {
  console.log("pwa-head: already present");
  process.exit(0);
}

// ---------- opening loader ----------
const css = readFileSync("src/components/oyster-loader/oyster-loader.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ");
const { ambient, burst } = JSON.parse(readFileSync("src/components/oyster-loader/sparks.json", "utf8"));
const bootCss = [
  // the app's own font names (loaded by the app); Georgia until then
  `#fp-boot{--font-display:InstrumentSerif_400Regular,"Instrument Serif",Georgia,serif;--font-sans:WorkSans_400Regular,"Work Sans","Helvetica Neue",Arial,sans-serif;z-index:2147483000;transition:opacity .45s ease}`,
  `#fp-boot .oyster-loader__label em{font-family:InstrumentSerif_400Regular_Italic,"Instrument Serif",Georgia,serif}`,
  `#fp-boot.is-leaving{opacity:0;pointer-events:none}`,
  `html[data-fp-boot="dark"],html[data-fp-boot="dark"] body{background:#0f0d0b}`,
  `html[data-fp-boot="dark"] #fp-boot{--paper:#0f0d0b;--ink:#eee8dc;--gold:#c8b995;--rule:#35312b}`,
].join("");
const img = (name, cls) => `<img src="${base}/loader/${name}.webp" class="oyster-loader__${cls}" alt="" draggable="false"/>`;
const sparks = ambient
  .map(([x, y, s, d, u]) => `<span class="oyster-loader__spark" style="--sx:${x}%;--sy:${y}%;--ss:${s};--sdl:${d}s;--sd:${u}s"></span>`)
  .join("");
const glints = burst
  .map(([dx, dy, s, d, u]) => `<span class="oyster-loader__bspark" style="--dx:${dx};--dy:${dy};--ss:${s};--bdl:${d}s;--bd:${u}s"></span>`)
  .join("");
// Dark theme before the app's CSS arrives; and never leave the loader up if the app fails to start.
const bootJs = `(function(){try{var p=localStorage.getItem("fp.theme");if(p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.setAttribute("data-fp-boot","dark")}catch(e){}setTimeout(function(){var b=document.getElementById("fp-boot");if(b)b.remove()},15000)})()`;
const loader =
  `<div id="fp-boot" role="status" aria-label="Loading" class="oyster-loader oyster-loader--full" style="--ol-size:196px">` +
  `<div class="oyster-loader__stage"><span class="oyster-loader__lines"></span>${img("oyster-mark", "mark")}${img("oyster-mark", "rings")}` +
  `<span class="oyster-loader__ripple" style="--rd:2.6s"></span><span class="oyster-loader__ripple" style="--rd:5.2s"></span>${img("oyster-closed", "lid")}` +
  `<span class="oyster-loader__glow"><span class="oyster-loader__bloom"></span><span class="oyster-loader__spread"></span><span class="oyster-loader__halo"></span><span class="oyster-loader__sparks">${sparks}</span></span>` +
  `<span class="oyster-loader__burst">${glints}</span></div>` +
  `<p class="oyster-loader__label">Focus <em>planner</em></p><span class="oyster-loader__rule"></span><p class="oyster-loader__hint">gathering focus</p></div>` +
  `<script>${bootJs}</script>`;
const preload = `<link rel="preload" as="image" href="${base}/loader/oyster-closed.webp"/><link rel="preload" as="image" href="${base}/loader/oyster-mark.webp"/>`;

html = html.replace("</head>", `${tags}${preload}<style id="fp-boot-css">${css}${bootCss}</style></head>`);
if (!/<body[^>]*>/.test(html)) throw new Error("pwa-head: no <body> in index.html");
html = html.replace(/<body[^>]*>/, (m) => m + loader);
writeFileSync(file, html);
console.log("pwa-head: injected PWA tags and the opening loader into", file);
