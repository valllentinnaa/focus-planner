import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

// Base path the app is served from (GitHub Pages project site: /focus-planner).
// Keep in sync with the Pages workflow's EXPO_BASE_URL.
const BASE = process.env.EXPO_BASE_URL || "";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />

        {/* PWA / installable */}
        <link rel="manifest" href={`${BASE}/manifest.webmanifest`} />
        <meta name="theme-color" content="#ede9e0" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* iOS Add to Home Screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Focus Planner" />
        <link rel="apple-touch-icon" href={`${BASE}/icons/apple-touch-icon.png`} />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `html,body{background:#ede9e0}` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
