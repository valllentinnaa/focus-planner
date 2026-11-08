// Injects PWA + iOS install tags into the exported SPA index.html.
// Runs after `expo export -p web` (output: single), which doesn't use +html.tsx.
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
if (html.includes('rel="manifest"')) { console.log("pwa-head: already present"); process.exit(0); }
html = html.replace("</head>", tags + "</head>");
writeFileSync(file, html);
console.log("pwa-head: injected PWA tags into", file);
