// Circles section for Presents, and a circle-mate's wishlist (with "I'm getting this").
import { Check, Link2, LogOut, RefreshCw, Trash2, X } from "lucide-react-native";
import { useState } from "react";
import { Linking, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { circlesAvailable, inviteUrl, useCircles, useMateWishlist, type Circle } from "@/data/circles";
import { useConnections } from "@/data/connections";
import { Link } from "expo-router";
import { colors, fonts, radius, space } from "@/theme/tokens";
import { Hint } from "./screen";
import { Body, GhostButton, OutlineButton, RuleInput, SectionLabel } from "./ui";

async function sendLink(url: string, onCopied: () => void) {
  if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(url);
    onCopied();
  } else {
    await Share.share({ message: url });
  }
}

function IconBtn({ label, onPress, children, disabled }: { label: string; onPress: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={8} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.5 }]}>
      {children}
    </Pressable>
  );
}

/** People you connected with through a profile link. */
export function FriendsSection() {
  const { connections, remove } = useConnections();
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  if (!circlesAvailable) return null;
  return (
    <View style={{ marginTop: space.xl }}>
      <SectionLabel right={<Text style={s.meta}>{connections.length}</Text>}>Friends</SectionLabel>
      {connections.length === 0 ? (
        <Hint>
          Share your profile link or QR from <Link href="/settings" style={s.metaLink}>Settings</Link> to connect with someone.
        </Hint>
      ) : null}
      {connections.map((f) => (
        <View key={f.user_id}>
          <View style={s.member}>
            <Pressable style={{ flex: 1 }} onPress={() => setOpen(open === f.user_id ? null : f.user_id)} accessibilityRole="button">
              <Text style={s.memberName}>{f.name}</Text>
              <Text style={s.metaLink}>{open === f.user_id ? "Hide wishlist" : "See wishlist"}</Text>
            </Pressable>
            {confirm === f.user_id ? (
              <View style={s.row}>
                <Text style={s.meta}>Disconnect?</Text>
                <GhostButton onPress={() => setConfirm(null)}>No</GhostButton>
                <GhostButton onPress={() => remove(f.user_id)}>
                  <Text style={s.danger}>Yes</Text>
                </GhostButton>
              </View>
            ) : (
              <IconBtn label={`Disconnect from ${f.name}`} onPress={() => setConfirm(f.user_id)}>
                <X size={15} color={colors.mutedForeground} strokeWidth={1.6} />
              </IconBtn>
            )}
          </View>
          {open === f.user_id ? <MateWishlist mateId={f.user_id} /> : null}
        </View>
      ))}
    </View>
  );
}

export function CirclesSection() {
  const c = useCircles();
  const [name, setName] = useState("");
  if (!circlesAvailable) return null;
  const create = () => {
    if (!name.trim()) return;
    c.create(name);
    setName("");
  };
  return (
    <View style={{ marginTop: space.xl }}>
      <SectionLabel right={<Text style={s.meta}>{c.circles.length}</Text>}>Circles</SectionLabel>
      <Hint>Family or friends who use the app. Everyone in a circle sees each other's wishlists.</Hint>
      <View style={s.addRow}>
        <RuleInput value={name} onChangeText={setName} placeholder="New circle, e.g. Family" onSubmitEditing={create} style={{ flex: 1 }} />
        <OutlineButton onPress={create}>Create</OutlineButton>
      </View>
      {c.circles.map((circle) => (
        <CircleCard key={circle.id} circle={circle} ops={c} />
      ))}
    </View>
  );
}

function CircleCard({ circle, ops }: { circle: Circle; ops: ReturnType<typeof useCircles> }) {
  const [openMate, setOpenMate] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const url = circle.invite_token ? inviteUrl(circle.invite_token) : null;
  const others = circle.members.filter((m) => !m.is_me);

  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <Text style={s.circleName}>{circle.name}</Text>
        {confirm ? (
          <View style={s.row}>
            <Text style={s.meta}>{circle.is_owner ? "Delete circle?" : "Leave?"}</Text>
            <GhostButton onPress={() => setConfirm(false)}>No</GhostButton>
            <GhostButton onPress={() => (circle.is_owner ? ops.remove(circle.id) : ops.leave(circle.id))}>
              <Text style={s.danger}>Yes</Text>
            </GhostButton>
          </View>
        ) : (
          <IconBtn label={circle.is_owner ? "Delete circle" : "Leave circle"} onPress={() => setConfirm(true)}>
            {circle.is_owner ? <Trash2 size={16} color={colors.mutedForeground} strokeWidth={1.6} /> : <LogOut size={16} color={colors.mutedForeground} strokeWidth={1.6} />}
          </IconBtn>
        )}
      </View>

      {others.length === 0 ? <Body muted style={{ fontStyle: "italic" }}>Nobody else yet — send the invite link.</Body> : null}
      {others.map((m) => (
        <View key={m.user_id}>
          <View style={s.member}>
            <Pressable style={{ flex: 1 }} onPress={() => setOpenMate(openMate === m.user_id ? null : m.user_id)} accessibilityRole="button">
              <Text style={s.memberName}>
                {m.name}
                {m.is_owner ? <Text style={s.meta}>  · created it</Text> : null}
              </Text>
              <Text style={s.metaLink}>{openMate === m.user_id ? "Hide wishlist" : "See wishlist"}</Text>
            </Pressable>
            {circle.is_owner ? (
              <IconBtn label={`Remove ${m.name}`} onPress={() => ops.removeMember(circle.id, m.user_id)}>
                <X size={15} color={colors.mutedForeground} strokeWidth={1.6} />
              </IconBtn>
            ) : null}
          </View>
          {openMate === m.user_id ? <MateWishlist mateId={m.user_id} /> : null}
        </View>
      ))}

      {circle.is_owner ? (
        <View style={s.invite}>
          {url ? (
            <>
              <OutlineButton gold onPress={() => sendLink(url, () => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}>
                {copied ? "Copied" : Platform.OS === "web" ? "Copy invite link" : "Share invite link"}
              </OutlineButton>
              <IconBtn label="Make a new invite link (the old one stops working)" onPress={() => ops.resetInvite(circle.id)}>
                <RefreshCw size={15} color={colors.mutedForeground} strokeWidth={1.6} />
              </IconBtn>
            </>
          ) : (
            <Hint>Open the planner on the web to get the invite link.</Hint>
          )}
        </View>
      ) : null}
    </View>
  );
}

/** A circle-mate's wishlist. Claims are hidden from them; you see only that something's taken. */
export function MateWishlist({ mateId }: { mateId: string }) {
  const w = useMateWishlist(mateId);
  if (w.loading) return <Hint>Loading…</Hint>;
  if (!w.list) return <Hint>You're no longer in a circle together.</Hint>;
  if (!w.list.items.length) return <Body muted style={s.empty}>Their wishlist is empty.</Body>;
  return (
    <View style={s.mateList}>
      {w.list.items.map((it) => (
        <View key={it.id} style={[s.item, it.claimed && !it.mine && { opacity: 0.55 }]}>
          <View style={{ flex: 1 }}>
            <Body style={it.claimed && !it.mine ? s.struck : undefined}>{it.text}</Body>
            {it.note ? <Text style={s.meta}>{it.note}</Text> : null}
            {it.link ? (
              <Text style={s.link} numberOfLines={1} onPress={() => Linking.openURL(it.link!)}>
                <Link2 size={11} color={colors.gold} /> {it.link.replace(/^https?:\/\//, "")}
              </Text>
            ) : null}
          </View>
          {it.mine ? (
            <Pressable disabled={w.busy} onPress={() => w.unclaim(it.id)} style={[s.claim, s.claimMine]} accessibilityLabel="You're getting this. Tap to undo">
              <Check size={12} color={colors.paper} />
              <Text style={[s.claimText, { color: colors.paper }]}>Mine</Text>
            </Pressable>
          ) : it.claimed ? (
            <Text style={s.takenLabel}>Taken</Text>
          ) : (
            <Pressable disabled={w.busy} onPress={() => w.claim(it.id)} style={s.claim}>
              <Text style={s.claimText}>I'm getting this</Text>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  meta: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground },
  metaLink: { fontFamily: fonts.sans, fontSize: 11, color: colors.gold },
  addRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginVertical: space.sm },
  row: { flexDirection: "row", alignItems: "center", gap: 2 },
  card: { borderWidth: 1, borderColor: colors.rule, borderRadius: radius.md, padding: space.md, marginTop: space.sm, gap: space.xs },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  circleName: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  member: { flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.rule },
  memberName: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  invite: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.sm },
  iconBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 15 },
  danger: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: colors.destructive },
  mateList: { paddingLeft: space.md, borderLeftWidth: 2, borderLeftColor: colors.rule, marginVertical: space.xs },
  empty: { fontStyle: "italic", paddingVertical: 4 },
  item: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: 6, borderBottomWidth: 1, borderStyle: "dashed", borderBottomColor: colors.rule },
  struck: { textDecorationLine: "line-through", color: colors.mutedForeground },
  link: { fontFamily: fonts.sans, fontSize: 12, color: colors.gold },
  claim: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  claimMine: { backgroundColor: colors.gold },
  claimText: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: colors.ink },
  takenLabel: { fontFamily: fonts.sans, fontSize: 11, fontStyle: "italic", color: colors.mutedForeground },
});
