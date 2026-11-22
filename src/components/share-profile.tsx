// Settings → Share my profile: personal link + QR. People with the app connect with you; people
// without it are invited to sign up first.
import { QrCode as QrIcon, RefreshCw } from "lucide-react-native";
import { useState } from "react";
import { Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { circlesAvailable } from "@/data/circles";
import { profileUrl, sharingErrorText, useProfileLink } from "@/data/connections";
import { colors, fonts, radius, space } from "@/theme/tokens";
import { QrCode } from "./qr-code";
import { Hint } from "./screen";
import { OutlineButton, SectionLabel } from "./ui";

/** Share sheet where there is one (phones, phone browsers); otherwise copy the link. */
export async function shareInvite(url: string, name: string): Promise<"shared" | "copied"> {
  const message = `${name || "I"} invited you to connect on Focus Planner — see each other's wishlists: ${url}`;
  if (Platform.OS === "web" && typeof navigator !== "undefined") {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Focus Planner", text: message, url });
        return "shared";
      } catch {
        /* cancelled — fall back to copy */
      }
    }
    await navigator.clipboard?.writeText(url);
    return "copied";
  }
  await Share.share({ message });
  return "shared";
}

export function ShareProfileSection({ name }: { name: string }) {
  const link = useProfileLink();
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!circlesAvailable) return null;
  const url = link.token ? profileUrl(link.token) : null;

  const share = async () => {
    if (!url) return;
    if ((await shareInvite(url, name)) === "copied") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <View>
      <SectionLabel>Share my profile</SectionLabel>
      <Hint>Send your link or show the QR. Friends with the app connect with you; anyone else is invited to join first. Connected people see each other’s wishlists.</Hint>
      {link.error ? <Hint>{sharingErrorText(link.error)}</Hint> : null}
      {link.loading ? null : !link.token ? (
        <OutlineButton gold disabled={link.busy} onPress={link.create} style={{ marginTop: space.sm }}>
          Create my link
        </OutlineButton>
      ) : !url ? (
        <Hint>Open the planner on the web to get your link.</Hint>
      ) : (
        <View style={{ gap: space.sm, marginTop: space.sm }}>
          <Text selectable style={s.url} numberOfLines={1}>{url}</Text>
          <View style={s.row}>
            <OutlineButton gold onPress={share}>{copied ? "Copied" : "Share link"}</OutlineButton>
            <Pressable accessibilityRole="button" accessibilityLabel={showQr ? "Hide QR code" : "Show QR code"} onPress={() => setShowQr((v) => !v)} style={[s.icon, showQr && s.iconOn]}>
              <QrIcon size={17} color={showQr ? colors.paper : colors.ink} strokeWidth={1.6} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Make a new link (the old one stops working)" disabled={link.busy} onPress={link.reset} style={s.icon}>
              <RefreshCw size={15} color={colors.mutedForeground} strokeWidth={1.6} />
            </Pressable>
          </View>
          {showQr ? (
            <View style={s.qr}>
              <QrCode value={url} size={220} />
              <Text style={s.qrHint}>Scan with a phone camera</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  url: { fontFamily: fonts.sans, fontSize: 13, color: colors.ink },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  icon: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.rule, alignItems: "center", justifyContent: "center" },
  iconOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  qr: { alignSelf: "flex-start", alignItems: "center", gap: space.xs, padding: space.md, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.rule },
  qrHint: { fontFamily: fonts.sans, fontSize: 11, color: colors.mutedForeground },
});
