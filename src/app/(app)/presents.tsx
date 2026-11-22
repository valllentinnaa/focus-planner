import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { type ReactNode, useMemo, useState } from "react";
import { Image, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { Paperclip, Trash2 } from "lucide-react-native";
import { useCalendarOps } from "@/data/calendar";
import { shareUrl, sharingAvailable, useWishlist, useWishlistShare } from "@/data/wishlist";
import { useUserId } from "@/data/auth";
import { circlesAvailable } from "@/data/circles";
import { CirclesSection, FriendsSection, MateWishlist } from "@/components/circles";
import { useMates } from "@/data/connections";
import { useIsPhone } from "@/components/app-header";
import { canPickFiles, pickFile } from "@/lib/pick-file";
import {
  giftFilesAvailable,
  removeGiftFiles,
  uploadGiftFile,
  useGiftFileUrls,
  contactsImportAvailable,
  fetchGoogleContacts, useGiftIdeas, useImportContacts, usePeople, type GoogleContact } from "@/data/presents";
import { byUpcoming, daysLabel, nextBirthday } from "@/lib/birthdays";
import { formatBirthday, formatBirthdayInput, parseBirthday, splitLink } from "@/lib/birthday-input";
import type { GiftIdeaRow, PersonRow } from "@/lib/database.types";
import { alpha, colors, fonts, radius, space } from "@/theme/tokens";
import { Hint, PageTitle, Screen } from "@/components/screen";
import { Body, Card, CheckBox, GhostButton, OutlineButton, RuleInput, RuledArea, SectionLabel, SolidButton } from "@/components/ui";

const SOON_DAYS = 30;
const STATUS_NEXT: Record<GiftIdeaRow["status"], GiftIdeaRow["status"]> = { idea: "bought", bought: "given", given: "idea" };
const STATUS_LABEL: Record<GiftIdeaRow["status"], string> = { idea: "Idea", bought: "Bought", given: "Given" };

export default function PresentsScreen() {
  const people = usePeople();
  const ideas = useGiftIdeas();
  const params = useLocalSearchParams<{ calendar?: string; person?: string; tab?: string }>();
  const [tab, setTab] = useState<Tab>(isTab(params.tab) ? params.tab : "people");
  const [open, setOpen] = useState<string | null>(params.person ?? null);
  // Opened from a birthday in Week/Month: jump to that person (adjusting state during render,
  // as React recommends, instead of in an effect).
  const [seenPerson, setSeenPerson] = useState(params.person);
  if (params.person !== seenPerson) {
    setSeenPerson(params.person);
    if (params.person) {
      setOpen(params.person);
      setTab("people");
    }
  }
  const [importing, setImporting] = useState(params.calendar === "connected");
  const goToPerson = (id: string) => {
    setTab("people");
    setOpen(id);
  };
  const today = useMemo(() => new Date(), []);

  const sorted = useMemo(() => byUpcoming(people.items, today), [people.items, today]);
  const soon = sorted.filter((p) => p.birth_month && p.birth_day && nextBirthday({ month: p.birth_month, day: p.birth_day }, today).daysUntil <= SOON_DAYS);
  const ideasFor = (id: string) => ideas.items.filter((i) => i.person_id === id);

  return (
    <Screen>
      <PageTitle
        eyebrow="Birthdays & gifts"
        title="Presents"
        right={tab === "people" && contactsImportAvailable && !importing ? <OutlineButton onPress={() => setImporting(true)}>Import contacts</OutlineButton> : null}
      />

      <Tabs value={tab} onChange={setTab} counts={{ people: people.items.length }} />

      {tab === "wishlist" ? (
        <View style={s.tabBody}>
          <MyWishlist />
        </View>
      ) : tab === "friends" ? (
        <View style={s.tabBody}>
          <FriendsSection
            personFor={(userId) => people.items.find((p) => p.linked_user_id === userId)}
            onOpenPerson={goToPerson}
            onAddPerson={(name, userId) => goToPerson(people.add({ name: name.slice(0, 120), linked_user_id: userId }))}
          />
          <CirclesSection />
        </View>
      ) : (
      <View style={[s.tabBody, { gap: space.xl }]}>
      {importing ? <ImportPanel onClose={() => setImporting(false)} /> : null}

      <OnAppSuggestions people={people.items} onAdd={(name, userId) => goToPerson(people.add({ name: name.slice(0, 120), linked_user_id: userId }))} onLink={(personId, userId) => { people.update(personId, { linked_user_id: userId }); goToPerson(personId); }} />

      {soon.length ? (
        <View>
          <SectionLabel>Coming up</SectionLabel>
          <View style={s.soonRow}>
            {soon.map((p) => {
              const n = nextBirthday({ month: p.birth_month!, day: p.birth_day!, year: p.birth_year }, today);
              const count = ideasFor(p.id).filter((i) => i.status !== "given").length;
              return (
                <Pressable key={p.id} onPress={() => setOpen(p.id)} style={s.soonCard}>
                  <Text style={s.soonWhen}>{daysLabel(n.daysUntil)}</Text>
                  <Text style={s.soonName}>{p.name}</Text>
                  <Text style={s.meta}>
                    {formatBirthday(p.birth_month!, p.birth_day!)}
                    {n.turns ? ` · turns ${n.turns}` : ""} · {count ? `${count} idea${count > 1 ? "s" : ""}` : "no ideas yet"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View>
        <SectionLabel right={<Text style={s.meta}>{people.items.length}</Text>}>People</SectionLabel>
        <AddPerson onAdd={(row) => setOpen(people.add(row))} />
        {people.items.length === 0 && !people.loading ? (
          <Body muted style={{ fontStyle: "italic", paddingVertical: 8 }}>
            Add the people you buy presents for, or import them from your contacts.
          </Body>
        ) : null}
        {sorted.map((p) => (
          <PersonRowView
            key={p.id}
            person={p}
            ideas={ideasFor(p.id)}
            today={today}
            open={open === p.id}
            onToggle={() => setOpen(open === p.id ? null : p.id)}
            onUpdate={(change) => people.update(p.id, change)}
            onRemove={() => {
              removeGiftFiles(ideasFor(p.id).map((i) => i.file_path)).catch(() => undefined);
              people.remove(p.id);
              setOpen(null);
            }}
            ideaOps={ideas}
          />
        ))}
      </View>
      </View>
      )}
    </Screen>
  );
}

type Tab = "people" | "wishlist" | "friends";
const TABS: { key: Tab; label: string; short: string }[] = [
  { key: "people", label: "People", short: "People" },
  { key: "wishlist", label: "My wishlist", short: "Wishlist" },
  { key: "friends", label: "Friends & circles", short: "Friends" },
];
const isTab = (v: unknown): v is Tab => TABS.some((t) => t.key === v);

/**
 * Friends and circle-mates who aren't in People yet: add them, or say they're someone already
 * there — so each person is one entry, with their birthday, gift ideas and wishlist together.
 */
function OnAppSuggestions({
  people,
  onAdd,
  onLink,
}: {
  people: PersonRow[];
  onAdd: (name: string, userId: string) => void;
  onLink: (personId: string, userId: string) => void;
}) {
  const mates = useMates();
  const [linking, setLinking] = useState<string | null>(null);
  const linked = new Set(people.map((p) => p.linked_user_id).filter(Boolean));
  const fresh = mates.filter((m) => !linked.has(m.user_id));
  if (!fresh.length) return null;
  const unlinkedPeople = people.filter((p) => !p.linked_user_id);
  return (
    <View style={s.suggest}>
      <Text style={s.suggestTitle}>On Focus Planner</Text>
      {fresh.slice(0, 5).map((m) => (
        <View key={m.user_id} style={{ gap: space.xs }}>
          <View style={s.suggestRow}>
            <Text style={s.suggestName}>{m.name}</Text>
            <View style={s.suggestActions}>
              <GhostButton onPress={() => onAdd(m.name, m.user_id)}>Add to people</GhostButton>
              {unlinkedPeople.length ? (
                <GhostButton onPress={() => setLinking(linking === m.user_id ? null : m.user_id)}>{linking === m.user_id ? "Cancel" : "Already here"}</GhostButton>
              ) : null}
            </View>
          </View>
          {linking === m.user_id ? (
            <View style={s.chips}>
              <Text style={s.meta}>Which one is {m.name}?</Text>
              {unlinkedPeople.map((p) => (
                <Pressable key={p.id} style={s.chip} onPress={() => { onLink(p.id, m.user_id); setLinking(null); }}>
                  <Text style={s.chipText}>{p.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ))}
      <Hint>One entry per person: their birthday, your gift ideas and their wishlist in one place.</Hint>
    </View>
  );
}

function Tabs({ value, onChange, counts }: { value: Tab; onChange: (t: Tab) => void; counts: Partial<Record<Tab, number>> }) {
  // Phones: three equal segments across the full width, short labels, so it never wraps.
  const phone = useIsPhone();
  return (
    <View style={[s.tabs, phone && s.tabsPhone]} accessibilityRole="tablist">
      {TABS.map((t) => {
        const active = t.key === value;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t.label}
            style={({ pressed }) => [s.tab, phone && s.tabPhone, active && s.tabActive, pressed && !active && { opacity: 0.6 }]}
          >
            <Text numberOfLines={1} style={[s.tabText, phone && s.tabTextPhone, active && s.tabTextActive]}>{phone ? t.short : t.label}</Text>
            {counts[t.key] ? (
              <View style={[s.tabCount, active && s.tabCountActive]}>
                <Text style={[s.tabCountText, active && s.tabCountTextActive]}>{counts[t.key]}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

type PersonInsert = { name: string; birth_month: number | null; birth_day: number | null; birth_year: number | null };

function AddPerson({ onAdd }: { onAdd: (row: PersonInsert) => void }) {
  const [name, setName] = useState("");
  const [bday, setBday] = useState("");
  const parsed = parseBirthday(bday);
  const invalid = parsed === "invalid";
  const submit = () => {
    if (!name.trim() || invalid) return;
    onAdd({ name: name.trim().slice(0, 120), birth_month: parsed?.month ?? null, birth_day: parsed?.day ?? null, birth_year: parsed?.year ?? null });
    setName("");
    setBday("");
  };
  return (
    <View style={s.addRow}>
      <RuleInput value={name} onChangeText={setName} placeholder="Name…" onSubmitEditing={submit} style={{ flex: 2, minWidth: 140 }} />
      <RuleInput
        value={bday}
        onChangeText={setBday}
        placeholder="Birthday dd.mm(.yyyy)"
        onSubmitEditing={submit}
        keyboardType="numbers-and-punctuation"
        style={[{ flex: 1, minWidth: 150 }, invalid && { borderBottomColor: colors.destructive }]}
      />
      <OutlineButton onPress={submit}>Add</OutlineButton>
    </View>
  );
}

function PersonRowView({
  person: p,
  ideas,
  today,
  open,
  onToggle,
  onUpdate,
  onRemove,
  ideaOps,
}: {
  person: PersonRow;
  ideas: GiftIdeaRow[];
  today: Date;
  open: boolean;
  onToggle: () => void;
  onUpdate: (change: Partial<PersonRow>) => void;
  onRemove: () => void;
  ideaOps: ReturnType<typeof useGiftIdeas>;
}) {
  const has = !!(p.birth_month && p.birth_day);
  const n = has ? nextBirthday({ month: p.birth_month!, day: p.birth_day!, year: p.birth_year }, today) : null;
  const openIdeas = ideas.filter((i) => i.status !== "given").length;

  return (
    <View style={[s.person, open && s.personOpen]}>
      <Pressable onPress={onToggle} style={s.personHead} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.personName}>{p.name}</Text>
          <Text style={[s.meta, !has && { fontStyle: "italic" }]}>
            {has ? `${formatBirthday(p.birth_month!, p.birth_day!)}${n!.turns ? ` · turns ${n!.turns}` : ""}` : "No birthday yet"}
            {openIdeas ? ` · ${openIdeas} idea${openIdeas > 1 ? "s" : ""}` : ""}
            {p.linked_user_id ? <Text style={s.onApp}>  · has a wishlist</Text> : null}
          </Text>
        </View>
        {n ? <Text style={[s.when, n.daysUntil <= SOON_DAYS && { color: colors.ink }]}>{daysLabel(n.daysUntil)}</Text> : null}
        <Text style={s.chev}>{open ? "–" : "+"}</Text>
      </Pressable>
      {open ? <PersonDetail person={p} ideas={ideas} onUpdate={onUpdate} onRemove={onRemove} ideaOps={ideaOps} /> : null}
    </View>
  );
}

function PersonDetail({
  person: p,
  ideas,
  onUpdate,
  onRemove,
  ideaOps,
}: {
  person: PersonRow;
  ideas: GiftIdeaRow[];
  onUpdate: (change: Partial<PersonRow>) => void;
  onRemove: () => void;
  ideaOps: ReturnType<typeof useGiftIdeas>;
}) {
  const [name, setName] = useState(p.name);
  const [bday, setBday] = useState(formatBirthdayInput(p.birth_month, p.birth_day, p.birth_year));
  const [notes, setNotes] = useState(p.notes);
  const [draft, setDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const parsed = parseBirthday(bday);

  const saveName = () => (name.trim() ? name.trim() !== p.name && onUpdate({ name: name.trim().slice(0, 120) }) : setName(p.name));
  const saveBday = () => {
    if (parsed === "invalid") return;
    onUpdate({ birth_month: parsed?.month ?? null, birth_day: parsed?.day ?? null, birth_year: parsed?.year ?? null });
  };
  const addIdea = () => {
    const { text, link } = splitLink(draft);
    if (!text) return;
    ideaOps.add({ person_id: p.id, text: text.slice(0, 1000), link, position: ideas.length });
    setDraft("");
  };
  const userId = useUserId();
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const canAttach = canPickFiles && giftFilesAvailable;
  const fileUrls = useGiftFileUrls(ideas.map((i) => i.file_path).filter((x): x is string => !!x));
  const attach = async () => {
    setFileError(null);
    const f = await pickFile();
    if (!f) return;
    if (f === "too_big") return setFileError("That file is over 10 MB.");
    if (f === "wrong_type") return setFileError("Photos (JPG, PNG, WebP, GIF, HEIC) or PDFs only.");
    if (!userId) return;
    setUploading(true);
    try {
      const path = await uploadGiftFile(userId, f);
      const { text, link } = splitLink(draft);
      ideaOps.add({ person_id: p.id, text: (text || f.name).slice(0, 1000), link, file_path: path, file_name: f.name, file_type: f.type, position: ideas.length });
      setDraft("");
    } catch {
      setFileError("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };
  const removeIdea = (i: GiftIdeaRow) => {
    ideaOps.remove(i.id);
    removeGiftFiles([i.file_path]).catch(() => undefined);
  };
  const cycle = (i: GiftIdeaRow) => {
    const status = STATUS_NEXT[i.status];
    ideaOps.update(i.id, { status, given_year: status === "given" ? new Date().getFullYear() : null });
  };

  return (
    <View style={s.detail}>
      <View style={s.addRow}>
        <RuleInput value={name} onChangeText={setName} onBlur={saveName} onSubmitEditing={saveName} placeholder="Name" style={{ flex: 2, minWidth: 140 }} />
        <RuleInput
          value={bday}
          onChangeText={setBday}
          onBlur={saveBday}
          onSubmitEditing={saveBday}
          placeholder="Birthday dd.mm(.yyyy)"
          keyboardType="numbers-and-punctuation"
          style={[{ flex: 1, minWidth: 150 }, parsed === "invalid" && { borderBottomColor: colors.destructive }]}
        />
        {confirmDelete ? (
          <View style={s.confirm}>
            <Text style={s.meta}>Delete?</Text>
            <GhostButton onPress={() => setConfirmDelete(false)}>No</GhostButton>
            <GhostButton onPress={onRemove}>
              <Text style={s.ghostDanger}>Yes</Text>
            </GhostButton>
          </View>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${p.name}`} hitSlop={8} onPress={() => setConfirmDelete(true)} style={s.iconBtn}>
            <Trash2 size={17} color={colors.mutedForeground} strokeWidth={1.6} />
          </Pressable>
        )}
      </View>

      <SectionLabel>Gift ideas</SectionLabel>
      <View style={s.addRow}>
        <RuleInput value={draft} onChangeText={setDraft} placeholder="Idea, link, photo or PDF…" onSubmitEditing={addIdea} blurOnSubmit={false} style={{ flex: 1 }} />
        {canAttach ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Attach a photo or PDF" hitSlop={8} disabled={uploading} onPress={attach} style={s.iconBtn}>
            <Paperclip size={17} color={uploading ? colors.rule : colors.ink} strokeWidth={1.6} />
          </Pressable>
        ) : null}
        <OutlineButton onPress={addIdea}>Add</OutlineButton>
      </View>
      {uploading ? <Hint>Uploading…</Hint> : null}
      {fileError ? <Hint>{fileError}</Hint> : null}
      {ideas.length === 0 ? <Body muted style={{ fontStyle: "italic", paddingVertical: 4 }}>Dump anything they might like.</Body> : null}
      {ideas.map((i) => (
        <View key={i.id} style={s.idea}>
          <Pressable onPress={() => cycle(i)} style={[s.status, s[`status_${i.status}`]]} accessibilityLabel={`Status ${STATUS_LABEL[i.status]}, tap to change`}>
            <Text style={[s.statusText, i.status === "given" && { color: colors.paper }]}>{STATUS_LABEL[i.status]}</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Body style={i.status === "given" && s.givenText}>
              {i.text}
              {i.status === "given" && i.given_year ? ` (${i.given_year})` : ""}
            </Body>
            {i.link && i.link !== i.text ? (
              <Text style={s.link} numberOfLines={1} onPress={() => Linking.openURL(i.link!)}>
                {i.link.replace(/^https?:\/\//, "")}
              </Text>
            ) : null}
            {i.file_path && i.file_type === "application/pdf" ? (
              <Text style={s.link} numberOfLines={1} onPress={() => fileUrls[i.file_path!] && Linking.openURL(fileUrls[i.file_path!]!)}>
                📄 {i.file_name ?? "PDF"}
              </Text>
            ) : null}
          </View>
          {i.file_path && i.file_type?.startsWith("image/") && fileUrls[i.file_path] ? (
            <Pressable onPress={() => Linking.openURL(fileUrls[i.file_path!]!)} accessibilityLabel={`Open photo ${i.file_name ?? ""}`}>
              <Image source={{ uri: fileUrls[i.file_path] }} style={s.thumb} />
            </Pressable>
          ) : null}
          {i.link && i.link === i.text ? <GhostButton onPress={() => Linking.openURL(i.link!)}>Open</GhostButton> : null}
          <GhostButton accessibilityLabel="Remove idea" onPress={() => removeIdea(i)}>
            <Text style={s.x}>✕</Text>
          </GhostButton>
        </View>
      ))}

      <LinkedMate person={p} onUpdate={onUpdate} />

      <SectionLabel>Notes</SectionLabel>
      <RuledArea
        lines={2}
        value={notes}
        onChangeText={setNotes}
        onBlur={() => notes !== p.notes && onUpdate({ notes: notes.slice(0, 2000) })}
        placeholder="Sizes, favourite colours, things to avoid…"
      />

    </View>
  );
}

/** Tie this contact to someone in your circles, to see their wishlist right here. */
function LinkedMate({ person: p, onUpdate }: { person: PersonRow; onUpdate: (change: Partial<PersonRow>) => void }) {
  const mates = useMates();
  const [picking, setPicking] = useState(false);
  if (!circlesAvailable) return null;
  const linked = mates.find((m) => m.user_id === p.linked_user_id);
  if (!linked && !mates.length) return null;
  return (
    <View style={{ marginTop: space.sm }}>
      <SectionLabel
        right={
          linked ? (
            <GhostButton onPress={() => onUpdate({ linked_user_id: null })}>Unlink</GhostButton>
          ) : (
            <GhostButton onPress={() => setPicking((v) => !v)}>{picking ? "Cancel" : "Link"}</GhostButton>
          )
        }
      >
        {linked ? `${linked.name}'s wishlist` : "Their wishlist"}
      </SectionLabel>
      {linked ? (
        <MateWishlist mateId={linked.user_id} />
      ) : picking ? (
        <View style={s.chips}>
          {mates.map((m) => (
            <Pressable
              key={m.user_id}
              style={s.chip}
              onPress={() => {
                onUpdate({ linked_user_id: m.user_id });
                setPicking(false);
              }}
            >
              <Text style={s.chipText}>{m.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Hint>Is {p.name} a friend or in one of your circles? Link them to see their wishlist here.</Hint>
      )}
    </View>
  );
}

function MyWishlist() {
  const list = useWishlist();
  const share = useWishlistShare();
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const url = share.token ? shareUrl(share.token) : null;

  const add = () => {
    const { text, link } = splitLink(draft);
    if (!text) return;
    list.add({ text: text.slice(0, 500), link, position: list.items.length });
    setDraft("");
  };
  const sendLink = async () => {
    if (!url) return;
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      await Share.share({ message: url });
    }
  };

  return (
    <View style={s.wishBox}>
      <SectionLabel right={<Text style={s.meta}>{list.items.length}</Text>}>My wishlist</SectionLabel>
      <View style={s.addRow}>
        <RuleInput value={draft} onChangeText={setDraft} placeholder="Something you'd like, or a link…" onSubmitEditing={add} blurOnSubmit={false} style={{ flex: 1 }} />
        <OutlineButton onPress={add}>Add</OutlineButton>
      </View>
      {list.items.length === 0 && !list.loading ? (
        <Body muted style={{ fontStyle: "italic", paddingVertical: 4 }}>Add what you’d love to get, then share the list.</Body>
      ) : null}
      {list.items.map((i) => (
        <View key={i.id} style={s.idea}>
          <View style={{ flex: 1 }}>
            <Body>{i.text}</Body>
            {i.link && i.link !== i.text ? (
              <Text style={s.link} numberOfLines={1} onPress={() => Linking.openURL(i.link!)}>
                {i.link.replace(/^https?:\/\//, "")}
              </Text>
            ) : null}
          </View>
          <GhostButton accessibilityLabel="Remove" onPress={() => list.remove(i.id)}>
            <Text style={s.x}>✕</Text>
          </GhostButton>
        </View>
      ))}

      {sharingAvailable ? (
        <View style={s.shareBox}>
          <Text style={s.shareTitle}>Share</Text>
          {share.loading ? null : share.token ? (
            <>
              {url ? (
                <Text selectable style={s.shareUrl} numberOfLines={1}>{url}</Text>
              ) : (
                <Hint>Open the planner on the web to get the link.</Hint>
              )}
              <View style={{ flexDirection: "row", gap: space.sm, alignItems: "center", flexWrap: "wrap" }}>
                {url ? <OutlineButton gold onPress={sendLink}>{copied ? "Copied" : Platform.OS === "web" ? "Copy link" : "Share link"}</OutlineButton> : null}
                {url ? <GhostButton onPress={() => Linking.openURL(url)}>Preview</GhostButton> : null}
                <GhostButton disabled={share.busy} onPress={share.turnOff}>Turn off link</GhostButton>
              </View>
              <Hint>Anyone with the link can see the list and mark what they’re buying. You won’t see who picked what. Turning the link off makes it stop working; a new one is different.</Hint>
            </>
          ) : (
            <>
              <Hint>Make a private link to send to family and friends. They don’t need the app.</Hint>
              <OutlineButton gold disabled={share.busy} onPress={share.create}>Create share link</OutlineButton>
            </>
          )}
          {share.error ? <Hint>Something went wrong. Try again.</Hint> : null}
        </View>
      ) : null}
    </View>
  );
}

function ImportPanel({ onClose }: { onClose: () => void }) {
  const ops = useCalendarOps();
  const imp = useImportContacts();
  const q = useQuery({ queryKey: ["google-contacts"], queryFn: fetchGoogleContacts, staleTime: 0, gcTime: 0, retry: false });
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [onlyBirthdays, setOnlyBirthdays] = useState(true);
  const [done, setDone] = useState<number | null>(null);

  const list = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (q.data?.contacts ?? []).filter((c) => (!onlyBirthdays || c.month) && (!term || c.name.toLowerCase().includes(term)));
  }, [q.data, search, onlyBirthdays]);

  const allowAccess = () => ops.connect({ contacts: true, path: "presents" }).catch(() => undefined);
  const toggle = (c: GoogleContact) => setPicked((cur) => {
    const next = new Set(cur);
    if (next.has(c.id)) next.delete(c.id);
    else next.add(c.id);
    return next;
  });
  const save = () =>
    imp.mutate(
      (q.data?.contacts ?? []).filter((c) => picked.has(c.id)),
      { onSuccess: (n) => { setDone(n); setPicked(new Set()); } },
    );

  let body: ReactNode;
  if (q.isLoading) body = <Body muted>Loading your contacts…</Body>;
  else if (q.error) body = <Body muted>{"Couldn't load contacts. Try again in a moment."}</Body>;
  else if (q.data?.errors.some((e) => e.error === "api_disabled") && !q.data.contacts.length) {
    body = <Body muted>Google says the People API isn&apos;t turned on for this app yet. Enable it in Google Cloud, wait a few minutes, then try again.</Body>;
  } else if (!q.data?.connected || (q.data.needsAccess.length > 0 && q.data.needsAccess.length >= (q.data.accounts?.length ?? 1))) {
    body = (
      <View style={{ gap: space.sm }}>
        <Body>
          {q.data?.connected
            ? `Allow read-only access to the Google contacts of ${q.data.needsAccess.join(", ")}. The planner only saves the people you pick.`
            : "Connect your Google account to import contacts. Access is read-only; the planner only saves the people you pick."}
        </Body>
        <OutlineButton gold onPress={allowAccess}>{q.data?.connected ? "Allow contacts access" : "Connect Google"}</OutlineButton>
      </View>
    );
  } else {
    body = (
      <View style={{ gap: space.sm }}>
        {q.data.needsAccess.length ? (
          <View style={{ gap: space.xs }}>
            <Hint>{`No contacts access yet for ${q.data.needsAccess.join(", ")}.`}</Hint>
            <OutlineButton gold onPress={allowAccess}>Allow contacts access</OutlineButton>
          </View>
        ) : null}
        {q.data.errors.length ? <Hint>{`Couldn't read contacts for ${q.data.errors.map((e) => e.account).join(", ")}.`}</Hint> : null}
        <View style={s.addRow}>
          <RuleInput value={search} onChangeText={setSearch} placeholder="Search…" style={{ flex: 1 }} />
          <Pressable onPress={() => setOnlyBirthdays(!onlyBirthdays)} style={s.filter}>
            <CheckBox size={14} checked={onlyBirthdays} onChange={setOnlyBirthdays} />
            <Text style={s.meta}>With birthday only</Text>
          </Pressable>
        </View>
        <ScrollView style={s.contactList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {list.length === 0 ? (
            <Body muted style={{ fontStyle: "italic" }}>
              {q.data.contacts.length === 0
                ? `No contacts found in ${(q.data.accounts ?? []).filter((a) => !q.data!.needsAccess.includes(a)).join(", ") || "your Google account"}.`
                : onlyBirthdays && !search.trim()
                  ? "None of your contacts have a birthday saved. Untick \"With birthday only\" to see everyone."
                  : "No contacts match."}
            </Body>
          ) : null}
          {list.slice(0, 300).map((c) => (
            <Pressable key={c.id} onPress={() => toggle(c)} style={s.contact}>
              <CheckBox size={16} checked={picked.has(c.id)} onChange={() => toggle(c)} />
              <Body style={{ flex: 1 }}>{c.name}</Body>
              <Text style={s.meta}>{c.month && c.day ? formatBirthday(c.month, c.day) : "—"}</Text>
            </Pressable>
          ))}
          {list.length > 300 ? <Hint>{`Showing 300 of ${list.length}. Search to narrow down.`}</Hint> : null}
        </ScrollView>
        {done !== null ? <Hint>{done ? `Added ${done}.` : "Those are already in your list."}</Hint> : null}
        <View style={{ flexDirection: "row", gap: space.sm, alignItems: "center" }}>
          <SolidButton disabled={!picked.size || imp.isPending} onPress={save}>
            {picked.size ? `Add ${picked.size}` : "Pick people"}
          </SolidButton>
          {list.length && picked.size < list.length ? (
            <GhostButton onPress={() => setPicked(new Set(list.map((c) => c.id)))}>Select all shown</GhostButton>
          ) : null}
        </View>
        <Hint>Missing birthdays? Add them later on each person.</Hint>
      </View>
    );
  }

  return (
    <Card highlighted style={{ maxWidth: 720, gap: space.sm }}>
      <SectionLabel right={<GhostButton onPress={onClose}>Close</GhostButton>}>Import from Google Contacts</SectionLabel>
      {body}
    </Card>
  );
}

const s = StyleSheet.create({
  // Segmented control: separate pills in one rounded track, the active one filled.
  tabs: { flexDirection: "row", flexWrap: "wrap", alignSelf: "flex-start", gap: 4, padding: 4, borderWidth: 1, borderColor: colors.rule, borderRadius: radius.pill },
  tab: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 9, paddingHorizontal: 18, borderRadius: radius.pill },
  tabActive: { backgroundColor: colors.ink },
  tabsPhone: { alignSelf: "stretch", flexWrap: "nowrap" },
  tabPhone: { flex: 1, justifyContent: "center", paddingHorizontal: 6, gap: 5 },
  tabTextPhone: { fontSize: 10, letterSpacing: 1 },
  tabText: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground },
  tabTextActive: { color: colors.paper },
  tabCount: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: alpha("gold", "22") },
  tabCountActive: { backgroundColor: colors.paper },
  tabCountText: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.ink },
  tabCountTextActive: { color: colors.ink },
  onApp: { fontFamily: fonts.sans, fontSize: 12, color: colors.gold },
  suggest: { borderWidth: 1, borderColor: colors.gold, borderRadius: 16, padding: space.lg, gap: space.sm, backgroundColor: alpha("card", "80") },
  suggestTitle: { fontFamily: fonts.sansSemiBold, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: colors.gold },
  suggestRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: space.sm },
  suggestName: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  suggestActions: { flexDirection: "row", gap: space.xs },
  tabBody: { width: "100%", maxWidth: 760 },
  meta: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground },
  addRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginVertical: space.sm, flexWrap: "wrap" },
  soonRow: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  soonCard: { borderWidth: 1, borderColor: colors.gold, borderRadius: radius.md, padding: space.md, minWidth: 180, gap: 2, backgroundColor: alpha("card", "80") },
  soonWhen: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: colors.gold },
  soonName: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  person: { borderBottomWidth: 1, borderBottomColor: colors.rule },
  personOpen: { borderWidth: 1, borderColor: colors.gold, borderRadius: radius.md, paddingHorizontal: space.md, marginVertical: space.sm, backgroundColor: alpha("card", "80") },
  iconBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 16 },
  confirm: { flexDirection: "row", alignItems: "center", gap: 2 },
  thumb: { width: 48, height: 48, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.rule },
  personHead: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md },
  personName: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  when: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: colors.mutedForeground },
  chev: { fontFamily: fonts.sans, fontSize: 18, color: colors.mutedForeground, width: 16, textAlign: "center" },
  detail: { paddingBottom: space.lg, gap: space.xs },
  idea: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 6, borderBottomWidth: 1, borderStyle: "dashed", borderBottomColor: colors.rule },
  status: { borderWidth: 1, borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 10, minWidth: 64, alignItems: "center" },
  status_idea: { borderColor: colors.rule },
  status_bought: { borderColor: colors.gold },
  status_given: { borderColor: colors.gold, backgroundColor: colors.gold },
  statusText: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: colors.ink },
  givenText: { color: colors.mutedForeground },
  link: { fontFamily: fonts.sans, fontSize: 12, color: colors.gold, textDecorationLine: "underline" },
  x: { fontFamily: fonts.sans, fontSize: 11, color: colors.mutedForeground },
  ghostDanger: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: colors.destructive },
  filter: { flexDirection: "row", alignItems: "center", gap: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, paddingVertical: space.xs },
  chip: { borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 12 },
  chipText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.ink },
  // One box around the whole wishlist, like the Week view's boxes.
  wishBox: { borderWidth: 1, borderColor: colors.rule, borderRadius: 4, padding: space.lg, gap: 4 },
  shareBox: { marginTop: space.lg, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.rule, gap: space.sm },
  shareTitle: { fontFamily: fonts.sansSemiBold, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground },
  shareUrl: { fontFamily: fonts.sans, fontSize: 13, color: colors.ink },
  contactList: { maxHeight: 360 },
  contact: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.rule },
});
