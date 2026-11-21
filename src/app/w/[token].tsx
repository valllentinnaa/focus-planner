// Public wishlist page: anyone with the link can see the list and mark "I'm getting this".
// Needs no account. The owner opening their own link sees no claims.
import { Link, useLocalSearchParams } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSharedWishlist } from "@/data/wishlist";
import { colors, fonts, layout, radius, space } from "@/theme/tokens";
import { Body, Display, Eyebrow } from "@/components/ui";

export default function SharedWishlistPage() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const insets = useSafeAreaInsets();
  const { list, loading, error, claim, unclaim, busy } = useSharedWishlist(String(token ?? ""));
  const owner = list?.owner.trim();

  return (
    <ScrollView style={s.root} contentContainerStyle={[s.content, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xxl }]}>
      <View style={s.inner}>
        <Eyebrow style={{ marginBottom: 6 }}>Wishlist</Eyebrow>
        <Display italic>{list ? (owner ? `${owner}'s wishes` : "Wishes") : loading ? " " : "Not found"}</Display>

        {loading ? <Body muted style={{ marginTop: space.lg }}>Loading…</Body> : null}
        {error ? <Body muted style={{ marginTop: space.lg }}>Couldn’t load this list. Try again in a moment.</Body> : null}
        {!loading && !error && !list ? (
          <Body muted style={{ marginTop: space.lg }}>This link doesn’t work anymore. Ask for a new one.</Body>
        ) : null}

        {list?.is_owner ? (
          <View style={s.banner}>
            <Text style={s.bannerText}>This is what people with your link see. Who’s getting what stays hidden from you.</Text>
          </View>
        ) : list ? (
          <Body muted style={{ marginTop: space.md }}>
            Tap “I’m getting this” so nobody buys the same thing. {owner || "They"} won’t see it.
          </Body>
        ) : null}

        {list && list.items.length === 0 ? <Body muted style={{ marginTop: space.lg, fontStyle: "italic" }}>Nothing on the list yet.</Body> : null}

        <View style={{ marginTop: space.lg }}>
          {list?.items.map((it) => {
            const mine = list.mine.has(it.id);
            return (
              <View key={it.id} style={[s.item, it.claimed && !mine && s.itemTaken]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[s.itemText, it.claimed && !mine && s.taken]}>{it.text}</Text>
                  {it.note ? <Text style={s.note}>{it.note}</Text> : null}
                  {it.link ? (
                    <Text style={s.link} numberOfLines={1} onPress={() => Linking.openURL(it.link!)}>
                      {it.link.replace(/^https?:\/\//, "")}
                    </Text>
                  ) : null}
                </View>
                {list.is_owner ? null : mine ? (
                  <Pressable disabled={busy} onPress={() => unclaim(it.id)} style={[s.btn, s.btnMine]}>
                    <Text style={[s.btnText, { color: colors.paper }]}>You’re getting it · undo</Text>
                  </Pressable>
                ) : it.claimed ? (
                  <Text style={s.takenLabel}>Someone’s getting this</Text>
                ) : (
                  <Pressable disabled={busy} onPress={() => claim(it.id)} style={s.btn}>
                    <Text style={s.btnText}>I’m getting this</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        <Link href="/" style={s.footer}>Made with Focus Planner</Link>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: layout.gutter },
  inner: { width: "100%", maxWidth: 640, alignSelf: "center" },
  banner: { marginTop: space.md, borderLeftWidth: 2, borderLeftColor: colors.gold, paddingLeft: space.md, paddingVertical: 4 },
  bannerText: { fontFamily: fonts.sans, fontSize: 13, color: colors.mutedForeground },
  item: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.rule },
  itemTaken: { opacity: 0.6 },
  itemText: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  taken: { textDecorationLine: "line-through" },
  note: { fontFamily: fonts.sans, fontSize: 13, color: colors.mutedForeground },
  link: { fontFamily: fonts.sans, fontSize: 12, color: colors.gold, textDecorationLine: "underline" },
  btn: { borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  btnMine: { backgroundColor: colors.gold },
  btnText: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: colors.ink },
  takenLabel: { fontFamily: fonts.sans, fontSize: 11, color: colors.mutedForeground, fontStyle: "italic" },
  footer: { marginTop: space.xxl, fontFamily: fonts.sans, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: colors.mutedForeground, textAlign: "center" },
});
