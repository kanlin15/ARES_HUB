import { useEffect, useMemo, useSyncExternalStore } from "react";
import { computeAlerts } from "@/lib/alerts";
import type { Command } from "@/lib/eva-engine";
import { getLink, SERVER_SNAPSHOT, type LinkRole } from "@/lib/eva-link";
import { contextAt } from "@/lib/mission";

const subscribe = (fn: () => void) => getLink().subscribe(fn);
const getSnapshot = () => getLink().getSnapshot();
const getServerSnapshot = () => SERVER_SNAPSHOT;
const dispatch = (cmd: Command) => getLink().dispatch(cmd);

/** Live, tab-synchronised EVA state plus derived terrain context and alerts. */
export function useEva(role: LinkRole) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => getLink().setRole(role), [role]);
  const { eva } = snap;
  const ctx = useMemo(() => contextAt(eva.x, eva.y), [eva.x, eva.y]);
  const alerts = useMemo(() => computeAlerts(eva.telemetry, ctx), [eva.telemetry, ctx]);
  const otherRole = role === "visor" ? "control" : "visor";
  const partnerOnline = snap.peers.some((p) => p.role === otherRole);
  return { ...snap, ctx, alerts, dispatch, partnerOnline };
}
