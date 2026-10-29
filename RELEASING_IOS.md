# Releasing to iOS (TestFlight)

The app is built with Expo and is iOS-ready (bundle id `com.focusplanner.app`, iPad supported,
icons and splash set). Builds run in the cloud via **EAS Build** — no Mac or Xcode needed. The one
prerequisite I can't do for you is the **Apple Developer Program** account.

## One-time setup

1. **Apple Developer Program** — enrol at https://developer.apple.com/programs/ (~€99/yr; approval
   is usually 1–2 days). You need this before any iOS build can be signed or sent to TestFlight.
2. **Expo account** — create one at https://expo.dev (free), then from the repo root:
   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest init          # creates the EAS project and writes extra.eas.projectId into app.json
   ```
3. **Supabase** — set the production env for the build (the app reads `EXPO_PUBLIC_SUPABASE_*`):
   ```bash
   npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value "https://<ref>.supabase.co"
   npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value "sb_publishable_..."
   ```
   (Until these are set the native build runs in demo mode, same as the web demo.)

## First build + TestFlight

```bash
# Build a signed .ipa in the cloud. EAS offers to create the signing credentials for you —
# accept, and it manages the distribution certificate and provisioning profile.
npx eas-cli@latest build --platform ios --profile preview

# Register the app in App Store Connect (first time only), then submit the build:
npx eas-cli@latest submit --platform ios --profile production --latest
```

`eas submit` will ask for the App Store Connect app (it can create it) and your Apple Team ID.
Put those two values into `eas.json` → `submit.production.ios` (`ascAppId`, `appleTeamId`) so future
submits are non-interactive. Then add testers in App Store Connect → TestFlight → Internal Testing.

The same build installs on iPhone, iPad, and Apple Silicon Macs ("Designed for iPad").

## From CI (optional)

A manual GitHub Action is included at `.github/workflows/ios-build.yml`. Add an `EXPO_TOKEN`
repo secret (https://expo.dev/settings/access-tokens), then run it from the Actions tab
(choose `preview` to just build, or `production` + submit to push to TestFlight). The first
run still needs the credential setup above to have happened once.

## Over-the-air updates

JS-only changes can ship without a new build: `npx eas-cli@latest update --branch preview`.
A new native build is only needed when native code or config (app.json plugins, new native deps)
changes.
