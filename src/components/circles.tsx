// Circles section for Presents, and a circle-mate's wishlist (with "I'm getting this").
import { Check, ChevronDown, ChevronUp, Link2, LogOut, Plus, RefreshCw, Send, Trash2, X } from "lucide-react-native";
import { useState } from "react";
import { Linking, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { circlesAvailable, inviteUrl, useCircles, useMateWishlist, type Circle } from "@/data/circles";
import { profileUrl, useConnections, useProfileLink } from "@/data/connections";
import { useSettings } from "@/data/profile";
import { shareInvite } from "./share-profile";
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

const initial = (name: string) => (name.trim()[0] ?? "?").toUpperCase();

/** Overlapping initials, like a little group photo. `onAdd` draws the dashed "+" at the end. */
function AvatarStack({
  people,
  selected,
  onPick,
  onAdd,
  max = 6,
}: {
  people: { user_id: string; name: string }[];
  selected?: string | null;
  onPick?: (id: string) => void;
  onAdd?: () => void;
  max?: number;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <View style={s.stack}>
      {shown.map((p, i) => (
        <Pressable
          key={p.user_id}
          disabled={!onPick}
          onPress={() => onPick?.(p.user_id)}
          accessibilityRole={onPick ? "button" : undefined}
          accessibilityLabel={onPick ? `${p.name} — see wishlist` : p.name}
          style={[s.avatar, i > 0 && s.overlap, selected === p.user_id && s.avatarOn]}
        >
          <Text style={[s.avatarText, selected === p.user_id && { color: colors.paper }]}>{initial(p.name)}</Text>
        </Pressable>
      ))}
      {extra > 0 ? (
        <View style={[s.avatar, s.overlap]}>
          <Text style={[s.avatarText, { fontSize: 15 }]}>+{extra}</Text>
        </View>
      ) : null}
      {onAdd ? (
        <Pressable onPress={onAdd} accessibilityRole="button" accessibilityLabel="Invite someone" style={[s.avatar, s.avatarAdd, shown.length > 0 && s.overlap]}>
          <Plus size={20} color={colors.mutedForeground} strokeWidth={1.4} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Friends: connect with people directly through your profile link. */
export function FriendsSection() {
  const { connections, remove } = useConnections();
  const link = useProfileLink();
  const { settings } = useSettings();
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  if (!circlesAvailable) return null;
  const friend = connections.find((c) => c.user_id === open);

  const invite = async () => {
    setNote(null);
    try {
      const url = profileUrl(await link.ensure());
      if (!url) return setNote("Open the planner on the web to get your invite link.");
      if ((await shareInvite(url, settings.ownerName.trim())) === "copied") setNote("Invite link copied — paste it in a message.");
    } catch {
      setNote("Couldn't make the link. Try again.");
    }
  };

  return (
    <View style={[s.panel, s.hero]}>
      <AvatarStack people={connections} selected={open} onPick={(id) => { setConfirm(false); setOpen(open === id ? null : id); }} onAdd={invite} />
      <Text style={s.heroTitle}>
        Gifting is better <Text style={s.heroItalic}>together</Text>
      </Text>
      <Text style={s.heroSub}>Invite someone you love — they’ll see your wishlist, and you’ll see theirs.</Text>
      <Pressable onPress={invite} disabled={link.busy} style={({ pressed }) => [s.cta, (pressed || link.busy) && { opacity: 0.7 }]} accessibilityRole="button">
        <Send size={15} color={colors.paper} strokeWidth={1.6} />
        <Text style={s.ctaText}>Invite a friend</Text>
      </Pressable>
      {note ? <Text style={s.heroNote}>{note}</Text> : null}

      {friend ? (
        <View style={s.friendPanel}>
          <View style={s.friendHead}>
            <Text style={s.circleName}>{friend.name}</Text>
            {confirm ? (
              <View style={s.row}>
                <Text style={s.meta}>Disconnect?</Text>
                <GhostButton onPress={() => setConfirm(false)}>No</GhostButton>
                <GhostButton onPress={() => { remove(friend.user_id); setOpen(null); setConfirm(false); }}>
                  <Text style={s.danger}>Yes</Text>
                </GhostButton>
              </View>
            ) : (
              <IconBtn label={`Disconnect from ${friend.name}`} onPress={() => setConfirm(true)}>
                <X size={15} color={colors.mutedForeground} strokeWidth={1.6} />
              </IconBtn>
            )}
          </View>
          <MateWishlist mateId={friend.user_id} />
        </View>
      ) : connections.length ? (
        <Text style={s.heroHint}>Tap someone to see their wishlist.</Text>
      ) : null}
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
      <Text style={s.lede}>Little gatherings — family, best friends, the book club. Everyone inside shares wishlists.</Text>
      {c.circles.map((circle) => (
        <CircleCard key={circle.id} circle={circle} ops={c} />
      ))}
      <View style={s.addRow}>
        <RuleInput value={name} onChangeText={setName} placeholder="New circle, e.g. Family" onSubmitEditing={create} style={{ flex: 1 }} />
        <OutlineButton onPress={create}>Create</OutlineButton>
      </View>
    </View>
  );
}

function CircleCard({ circle, ops }: { circle: Circle; ops: ReturnType<typeof useCircles> }) {
  const [openMate, setOpenMate] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const url = circle.invite_token ? inviteUrl(circle.invite_token) : null;
  const others = circle.members.filter((m) => !m.is_me);
  const mate = others.find((m) => m.user_id === openMate);

  return (
    <View style={[s.panel, s.circle]}>
      <View style={s.friendHead}>
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
            {circle.is_owner ? <Trash2 size={15} color={colors.mutedForeground} strokeWidth={1.6} /> : <LogOut size={15} color={colors.mutedForeground} strokeWidth={1.6} />}
          </IconBtn>
        )}
      </View>

      {others.length ? (
        <View style={{ alignItems: "flex-start", marginTop: space.sm }}>
          <AvatarStack people={others} selected={openMate} onPick={(id) => setOpenMate(openMate === id ? null : id)} />
        </View>
      ) : null}

      {mate ? (
        <View style={{ marginTop: space.sm }}>
          <View style={s.friendHead}>
            <Text style={s.memberName}>
              {mate.name}
              {mate.is_owner ? <Text style={s.meta}>  · created it</Text> : null}
            </Text>
            {circle.is_owner ? (
              <GhostButton onPress={() => { ops.removeMember(circle.id, mate.user_id); setOpenMate(null); }}>Remove</GhostButton>
            ) : null}
          </View>
          <MateWishlist mateId={mate.user_id} />
        </View>
      ) : null}

      {circle.is_owner ? (
        <>
          <Pressable onPress={() => setAdding((v) => !v)} style={s.addSomeone} accessibilityRole="button" accessibilityState={{ expanded: adding }}>
            <Text style={s.addSomeoneText}>+ Add someone</Text>
            {adding ? <ChevronUp size={14} color={colors.gold} /> : <ChevronDown size={14} color={colors.gold} />}
          </Pressable>
          {adding ? (
            <View style={s.invite}>
              {url ? (
                <>
                  <Text style={s.meta}>Send this link — whoever opens it joins {circle.name}.</Text>
                  <View style={s.row}>
                    <OutlineButton gold onPress={() => sendLink(url, () => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}>
                      {copied ? "Copied" : Platform.OS === "web" ? "Copy invite link" : "Share invite link"}
                    </OutlineButton>
                    <IconBtn label="Make a new invite link (the old one stops working)" onPress={() => ops.resetInvite(circle.id)}>
                      <RefreshCw size={15} color={colors.mutedForeground} strokeWidth={1.6} />
                    </IconBtn>
                  </View>
                </>
              ) : (
                <Hint>Open the planner on the web to get the invite link.</Hint>
              )}
            </View>
          ) : null}
        </>
      ) : others.length === 0 ? (
        <Text style={s.meta}>Nobody else yet.</Text>
      ) : null}
    </View>
  );
}

/** A circle-mate's wishlist. Claims are hidden from them; you see only that something's taken. */
export function MateWishlist({ mateId }: { mateId: string }) {
  const w = useMateWishlist(mateId);
  if (w.loading) return <Hint>Loading…</Hint>;
  if (!w.list) return <Hint>You’re no longer in a circle together.</Hint>;
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
              <Text style={s.claimText}>I’m getting this</Text>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}

const AVATAR = 56;

const s = StyleSheet.create({
  meta: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground },
  lede: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.mutedForeground, marginBottom: space.md },
  addRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.lg },
  row: { flexDirection: "row", alignItems: "center", gap: space.xs, flexWrap: "wrap" },
  panel: { borderWidth: 1, borderColor: colors.rule, borderRadius: 16, backgroundColor: colors.card + "B3" },
  // Friends
  hero: { alignItems: "center", paddingVertical: space.xl, paddingHorizontal: space.lg, gap: space.md, marginTop: space.xl },
  heroTitle: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, color: colors.ink, textAlign: "center" },
  heroItalic: { fontFamily: fonts.displayItalic, color: colors.gold },
  heroSub: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.mutedForeground, textAlign: "center", maxWidth: 440 },
  heroNote: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground, textAlign: "center" },
  heroHint: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground, fontStyle: "italic" },
  cta: { flexDirection: "row", alignItems: "center", gap: space.sm, backgroundColor: colors.gold, borderRadius: radius.pill, paddingVertical: 12, paddingHorizontal: 22 },
  ctaText: { fontFamily: fonts.sansMedium, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: colors.paper },
  friendPanel: { alignSelf: "stretch", marginTop: space.sm, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.rule },
  friendHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  // Avatars
  stack: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.card, borderWidth: 2, borderColor: colors.paper,
    shadowColor: colors.ink, shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
  },
  overlap: { marginLeft: -12 },
  avatarOn: { backgroundColor: colors.gold },
  avatarAdd: { backgroundColor: colors.paper, borderStyle: "dashed", borderColor: colors.gold, borderWidth: 1.5, shadowOpacity: 0 },
  avatarText: { fontFamily: fonts.displayItalic, fontSize: 24, color: colors.gold },
  // Circles
  circle: { padding: space.lg, marginBottom: space.md },
  circleName: { fontFamily: fonts.displayItalic, fontSize: 26, color: colors.ink },
  memberName: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  addSomeone: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", marginTop: space.md, paddingVertical: 4, paddingLeft: space.lg },
  addSomeoneText: { fontFamily: fonts.sansMedium, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: colors.gold },
  invite: { gap: space.sm, marginTop: space.sm, paddingLeft: space.lg },
  iconBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 15 },
  danger: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: colors.destructive },
  // A mate's wishlist
  mateList: { paddingLeft: space.md, borderLeftWidth: 2, borderLeftColor: colors.rule, marginVertical: space.xs, alignSelf: "stretch" },
  empty: { fontStyle: "italic", paddingVertical: 4 },
  item: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: 6, borderBottomWidth: 1, borderStyle: "dashed", borderBottomColor: colors.rule },
  struck: { textDecorationLine: "line-through", color: colors.mutedForeground },
  link: { fontFamily: fonts.sans, fontSize: 12, color: colors.gold },
  claim: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  claimMine: { backgroundColor: colors.gold },
  claimText: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: colors.ink },
  takenLabel: { fontFamily: fonts.sans, fontSize: 11, fontStyle: "italic", color: colors.mutedForeground },
});
