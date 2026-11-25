// The oyster opening loader is part of index.html (scripts/pwa-head.mjs), so it shows before any
// JavaScript. Once the app is ready we fade it out — but not before the oyster has opened
// (~2.9 s after the page started), so it never cuts off mid-animation.
const OPENED_MS = 2900;
let done = false;

export function hideOpeningLoader() {
  if (done || typeof document === "undefined") return;
  const el = document.getElementById("fp-boot");
  if (!el) return;
  done = true;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const wait = reduce ? 0 : Math.max(0, OPENED_MS - performance.now());
  setTimeout(() => {
    el.classList.add("is-leaving");
    setTimeout(() => {
      el.remove();
      document.documentElement.removeAttribute("data-fp-boot");
    }, 480);
  }, wait);
}
