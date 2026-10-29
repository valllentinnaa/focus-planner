// Lightweight cross-container drag-and-drop built on react-native-gesture-handler + RN Animated
// (no reanimated, so it stays simple and exports cleanly to web).
//
// A DropZone registers its on-screen rectangle; a DragHandle (long-press to pick up) moves a
// floating label and, on release, drops onto whichever zone contains the pointer. Dropping
// outside every zone is a no-op, so the button-based moves remain the reliable path.
/* eslint-disable react-hooks/refs -- this module keeps a registry of drop-zone nodes in refs by design */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ComponentRef, type ReactNode } from "react";
import { Animated, StyleSheet, Text, View, type LayoutRectangle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import type { TaskRow } from "@/lib/database.types";
import { colors, fonts } from "@/theme/tokens";

type Host = ComponentRef<typeof View>;

type Zone = { id: string; node: Host | null; onDrop: (task: TaskRow) => void };
type Rect = { id: string; onDrop: (task: TaskRow) => void } & LayoutRectangle;

type DragApi = {
  register: (id: string, node: Host | null, onDrop: (task: TaskRow) => void) => () => void;
  begin: (task: TaskRow, label: string, x: number, y: number) => void;
  move: (x: number, y: number) => void;
  end: (x: number, y: number) => void;
  cancel: () => void;
  highlight: string | null;
  dragging: boolean;
};

const Ctx = createContext<DragApi | null>(null);
export const useDrag = () => useContext(Ctx);

function measure(node: Host | null): Promise<LayoutRectangle | null> {
  return new Promise((resolve) => {
    if (!node) return resolve(null);
    node.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
  });
}
const inside = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;

export function DragProvider({ children }: { children: ReactNode }) {
  const zones = useRef(new Map<string, Zone>());
  const rects = useRef<Rect[]>([]);
  const task = useRef<TaskRow | null>(null);
  const pos = useRef(new Animated.ValueXY()).current;
  const [label, setLabel] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);

  const register: DragApi["register"] = useCallback((id, node, onDrop) => {
    zones.current.set(id, { id, node, onDrop });
    return () => { if (zones.current.get(id)?.node === node) zones.current.delete(id); };
  }, []);

  const begin: DragApi["begin"] = useCallback((t, lbl, x, y) => {
    task.current = t;
    pos.setValue({ x, y });
    setLabel(lbl);
    setHighlight(null);
    Promise.all([...zones.current.values()].map(async (z) => {
      const r = await measure(z.node);
      return r ? ({ id: z.id, onDrop: z.onDrop, ...r } as Rect) : null;
    })).then((list) => { rects.current = list.filter(Boolean) as Rect[]; });
  }, [pos]);

  const move: DragApi["move"] = useCallback((x, y) => {
    pos.setValue({ x, y });
    const hit = rects.current.find((r) => inside(r, x, y));
    setHighlight(hit?.id ?? null);
  }, [pos]);

  const finish = useCallback(() => { task.current = null; rects.current = []; setLabel(null); setHighlight(null); }, []);

  const end: DragApi["end"] = useCallback((x, y) => {
    const hit = rects.current.find((r) => inside(r, x, y));
    if (hit && task.current) hit.onDrop(task.current);
    finish();
  }, [finish]);

  const api = useMemo<DragApi>(() => ({ register, begin, move, end, cancel: finish, highlight, dragging: label !== null }), [register, begin, move, end, finish, highlight, label]);

  return (
    <Ctx.Provider value={api}>
      {children}
      {label !== null ? (
        <Animated.View pointerEvents="none" style={[s.floating, { transform: pos.getTranslateTransform() }]}>
          <View style={s.floatingInner}>
            <Text numberOfLines={1} style={s.floatingText}>{label || "task"}</Text>
          </View>
        </Animated.View>
      ) : null}
    </Ctx.Provider>
  );
}

/** Wraps content as a drop target; highlights while a dragged item hovers over it. */
export function DropZone({ id, onDrop, style, highlightStyle, children }: {
  id: string;
  onDrop: (task: TaskRow) => void;
  style?: object;
  highlightStyle?: object;
  children: ReactNode;
}) {
  const api = useDrag();
  const ref = useRef<Host | null>(null);
  const setRef = useCallback((node: Host | null) => {
    ref.current = node;
    api?.register(id, node, onDrop);
    // re-register when onDrop identity changes is handled by the caller keeping it stable
  }, [api, id, onDrop]);
  const active = api?.highlight === id;
  return (
    <View ref={setRef} collapsable={false} style={[style, active && highlightStyle]}>
      {children}
    </View>
  );
}

/** Long-press grip that picks up a task and drags it to a DropZone. */
export function DragHandle({ task, label }: { task: TaskRow; label: string }) {
  const api = useDrag();
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(160)
        .onBegin((e) => api?.begin(task, label, e.absoluteX, e.absoluteY))
        .onUpdate((e) => api?.move(e.absoluteX, e.absoluteY))
        .onEnd((e) => api?.end(e.absoluteX, e.absoluteY))
        .onFinalize(() => { if (api?.dragging) api.cancel(); }),
    [api, task, label],
  );
  if (!api) return null;
  return (
    <GestureDetector gesture={gesture}>
      <View style={s.grip} accessibilityLabel="Drag to reschedule">
        <Text style={s.gripText}>⠿</Text>
      </View>
    </GestureDetector>
  );
}

const s = StyleSheet.create({
  floating: { position: "absolute", top: 0, left: 0, zIndex: 1000 },
  floatingInner: { transform: [{ translateX: -60 }, { translateY: -18 }], backgroundColor: colors.ink, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12, maxWidth: 220, opacity: 0.95 },
  floatingText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.paper },
  grip: { paddingHorizontal: 2, paddingVertical: 4, justifyContent: "center" },
  gripText: { fontFamily: fonts.sans, fontSize: 14, color: colors.mutedForeground },
});
