import { Link, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { colors } from "@/theme/tokens";
import { Body, Display, OutlineButton } from "@/components/ui";

const KNOWN = ["/", "/today", "/month", "/food", "/quarter", "/settings", "/sign-in", "/auth/callback"];

export default function NotFound() {
  const router = useRouter();
  const pathname = usePathname();

  // Static hosts sometimes serve the app under a prefix path (e.g. a preview host); when the
  // pathname is nothing we know, land on Week instead of a dead end.
  useEffect(() => {
    if (Platform.OS === "web" && !KNOWN.includes(pathname)) router.replace("/");
  }, [pathname, router]);

  return (
    <View style={s.root}>
      <Display italic>Page not found</Display>
      <Body muted style={{ marginVertical: 12 }}>{pathname}</Body>
      <Link href="/" asChild><OutlineButton gold>Back to Week</OutlineButton></Link>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center", padding: 24 },
});
