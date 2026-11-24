// React glue for lib/disclosure: keeps the state and runs the 5-second close timer.
import { useEffect, useRef, useState } from "react";
import { CLOSE_AFTER_MS, disclose, initialDisclosure, type DisclosureEvent } from "@/lib/disclosure";

export function useDisclosure() {
  const [state, setState] = useState(initialDisclosure);
  const current = useRef(initialDisclosure);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function send(ev: DisclosureEvent) {
    const r = disclose(current.current, ev);
    current.current = r.state;
    setState(r.state);
    if (r.timer !== "none" && timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (r.timer === "start") timer.current = setTimeout(() => send("timeout"), CLOSE_AFTER_MS);
  }

  return { open: state.open, pinned: state.pinned, send };
}
