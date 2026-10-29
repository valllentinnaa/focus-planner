# Releasing to Android (installable APK)

Android needs **no Apple account and no paid membership** — just a free Expo account. The build runs
in the cloud on EAS (this repo's sandbox can't reach the Android SDK, so it can't build locally).
The `preview` profile produces a plain **APK** you can install directly on a phone.

## One-time setup

```bash
# From the repo root:
npx eas-cli@latest login          # free Expo account (https://expo.dev)
npx eas-cli@latest init           # creates the EAS project, writes extra.eas.projectId into app.json
```

Optional — point the build at a real backend (otherwise it runs in demo mode, like the web demo):

```bash
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value "https://<ref>.supabase.co"
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value "sb_publishable_..."
```

## Build the APK

```bash
npx eas-cli@latest build --platform android --profile preview
```

EAS offers to generate the Android signing keystore for you — accept (it keeps it for future builds).
When the build finishes it prints a download URL, also shown at https://expo.dev → your project → Builds.

## Install on your phone

1. Open that URL on the phone (or scan the QR EAS shows) and download the `.apk`.
2. Android will ask to allow installing from this source — allow it, then open the file to install.
3. Launch "Focus Planner".

(To share with testers without sending files around, EAS internal distribution gives a link that
lists installable builds: https://docs.expo.dev/build/internal-distribution/.)

## From CI (optional)

`.github/workflows/android-build.yml` builds the APK on demand. Add an `EXPO_TOKEN` repo secret
(https://expo.dev/settings/access-tokens), then run it from the Actions tab; the APK URL is in the
run log and on expo.dev.

## Updates

JS-only changes ship over the air without a rebuild: `npx eas-cli@latest update --branch preview`.
A new APK is only needed when native code or config changes (app.json plugins, new native deps).

## Play Store (later)

The `production` profile builds an `.aab` for Google Play. That needs a one-time Google Play
Developer account ($25, once) and `eas submit --platform android`.
