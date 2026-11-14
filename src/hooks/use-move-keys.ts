import { useCallback, useEffect, useRef } from "react";
import type { Command, MoveInput } from "@/lib/eva-engine";

export type MoveKey = "forward" | "back" | "left" | "right" | "strafeL" | "strafeR";

const KEYMAP: Record<string, MoveKey> = {
  w: "forward",
  arrowup: "forward",
  s: "back",
  arrowdown: "back",
  a: "left",
  arrowleft: "left",
  d: "right",
  arrowright: "right",
  q: "strafeL",
  e: "strafeR",
};

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

/** Keyboard (W A S D / arrows / Q E) and on-screen pad movement, sent as live input. */
export function useMoveKeys(dispatch: (c: Command) => void, enabled: boolean) {
  const pressed = useRef(new Set<MoveKey>());
  const last = useRef("");

  const send = useCallback(() => {
    const p = pressed.current;
    const input: MoveInput = {
      forward: (p.has("forward") ? 1 : 0) - (p.has("back") ? 1 : 0),
      turn: (p.has("right") ? 1 : 0) - (p.has("left") ? 1 : 0),
      strafe: (p.has("strafeR") ? 1 : 0) - (p.has("strafeL") ? 1 : 0),
    };
    const key = JSON.stringify(input);
    if (key === last.current) return;
    last.current = key;
    dispatch({ type: "input", value: input });
  }, [dispatch]);

  const press = useCallback((k: MoveKey) => {
    pressed.current.add(k);
    send();
  }, [send]);
  const release = useCallback((k: MoveKey) => {
    pressed.current.delete(k);
    send();
  }, [send]);
  const releaseAll = useCallback(() => {
    pressed.current.clear();
    send();
  }, [send]);

  useEffect(() => {
    if (!enabled) {
      releaseAll();
      return;
    }
    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "c") return dispatch({ type: "centerView" });
      const m = KEYMAP[k];
      if (!m) return;
      e.preventDefault();
      press(m);
    };
    const up = (e: KeyboardEvent) => {
      const m = KEYMAP[e.key.toLowerCase()];
      if (m) release(m);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", releaseAll);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", releaseAll);
      releaseAll();
    };
  }, [enabled, dispatch, press, release, releaseAll]);

  return { press, release };
}
