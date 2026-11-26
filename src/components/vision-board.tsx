// The 12W vision board: hidden until you add something. Images and short words in a grid; tap an
// image to see it large. Sits above "Next Q notes".
import { useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { useVisionBoard, useVisionImageUrls } from "@/data/vision";
import { canPickFiles, pickImages } from "@/lib/pick-file";
import { alpha, colors, fonts, space } from "@/theme/tokens";
import { useIsWide } from "./screen";
import { GhostButton, OutlineButton, RuleInput } from "./ui";

export function VisionBoard({ quarterId }: { quarterId: string }) {
  const wide = useIsWide();
  const board = useVisionBoard(quarterId);
  const [opened, setOpened] = useState(false);
  const [note, setNote] = useState("");
  const [large, setLarge] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const urls = useVisionImageUrls(board.items.map((i) => i.file_path).filter((p): p is string => !!p));

  const empty = board.items.length === 0 && board.uploading === 0;
  if (board.loading) return null;
  if (empty && !opened) {
    return (
      <OutlineButton gold style={s.reveal} onPress={() => setOpened(true)}>
        + Vision board
      </OutlineButton>
    );
  }

  const addImages = async () => {
    setNote("");
    const picked = await pickImages();
    if (!picked) return;
    const failed = await board.addImages(picked.files);
    const missed = picked.skipped + failed;
    if (missed) setNote(`${missed} image${missed === 1 ? "" : "s"} couldn't be added (images only, up to 10 MB).`);
  };
  const tile = wide ? s.tileWide : s.tilePhone;

  return (
    <View style={s.box}>
      <View style={s.head}>
        <Text style={s.label}>Vision board</Text>
        <View style={s.headActions}>
          {canPickFiles ? <GhostButton onPress={addImages}>+ Image</GhostButton> : null}
          <GhostButton
            onPress={() => {
              const id = board.addWords();
              if (id) setFocusId(id);
            }}
          >
            + Words
          </GhostButton>
          {empty ? <GhostButton onPress={() => setOpened(false)}>Close</GhostButton> : null}
        </View>
      </View>

      {empty ? (
        <Text style={s.hint}>Pictures and words that pull you toward these 12 weeks.</Text>
      ) : (
        <View style={s.grid}>
          {board.items.map((item) => (
            <View key={item.id} style={[s.tile, tile]}>
              {item.kind === "image" ? (
                <Pressable
                  style={StyleSheet.absoluteFill}
                  accessibilityLabel="See larger"
                  onPress={() => item.file_path && urls[item.file_path] && setLarge(urls[item.file_path]!)}
                >
                  {item.file_path && urls[item.file_path] ? (
                    <Image source={{ uri: urls[item.file_path] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : (
                    <View style={s.loadingTile} />
                  )}
                </Pressable>
              ) : (
                <View style={s.words}>
                  <RuleInput
                    italicGold
                    lines={3}
                    autoFocus={focusId === item.id}
                    value={item.text}
                    maxLength={300}
                    onChangeText={(t) => board.setText(item.id, t)}
                    placeholder="A word, a line…"
                    style={s.wordsInput}
                  />
                </View>
              )}
              <Pressable accessibilityLabel="Remove" style={s.remove} onPress={() => void board.remove(item)} hitSlop={6}>
                <X size={12} color={colors.ink} strokeWidth={2} />
              </Pressable>
            </View>
          ))}
          {Array.from({ length: board.uploading }, (_, i) => (
            <View key={`up-${i}`} style={[s.tile, tile, s.loadingTile, s.center]}>
              <Text style={s.hint}>Adding…</Text>
            </View>
          ))}
        </View>
      )}
      {note ? <Text style={s.error}>{note}</Text> : null}

      <Modal visible={!!large} transparent animationType="fade" onRequestClose={() => setLarge(null)}>
        <Pressable style={s.lightbox} onPress={() => setLarge(null)} accessibilityLabel="Close">
          {large ? <Image source={{ uri: large }} style={s.lightboxImg} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  reveal: { alignSelf: "flex-start", marginBottom: space.lg },
  box: {
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 4,
    backgroundColor: alpha("card", "66"),
    padding: space.lg,
    marginBottom: space.xl,
    gap: space.md,
  },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: space.sm },
  headActions: { flexDirection: "row", alignItems: "center", gap: space.sm },
  label: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground },
  hint: { fontFamily: fonts.sans, fontSize: 13, color: colors.mutedForeground },
  error: { fontFamily: fonts.sans, fontSize: 12, color: colors.destructive },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  tile: { aspectRatio: 1, borderRadius: 4, overflow: "hidden", borderWidth: 1, borderColor: colors.rule },
  tileWide: { width: 172 },
  tilePhone: { width: "47%" },
  loadingTile: { backgroundColor: alpha("gold", "18") },
  center: { alignItems: "center", justifyContent: "center" },
  words: { flex: 1, backgroundColor: colors.paper, padding: space.md, justifyContent: "center" },
  wordsInput: { textAlign: "center", borderBottomWidth: 0, fontSize: 18, lineHeight: 24 },
  remove: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: alpha("card", "B3"),
  },
  lightbox: { flex: 1, backgroundColor: alpha("ink", "B3"), alignItems: "center", justifyContent: "center", padding: space.xl },
  lightboxImg: { width: "100%", height: "100%", maxWidth: 1200 },
});
