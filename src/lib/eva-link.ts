// Live link between browser tabs (visor <-> mission control) on the same computer.
// One tab is elected leader (Web Locks) and runs the simulation; every tab sends commands
// and receives the leader's state over a BroadcastChannel ~20 times per second.
import { applyCommand, INITIAL_EVA, step, type Command, type EvaState } from "./eva-engine";

export type LinkRole = "visor" | "control";

export interface Peer {
  id: string;
  role: LinkRole;
  at: number;
}

export interface LinkSnapshot {
  eva: EvaState;
  peers: Peer[];
  isLeader: boolean;
  connected: boolean;
}

type Msg =
  | { kind: "state"; from: string; state: EvaState }
  | { kind: "cmd"; from: string; cmd: Command }
  | { kind: "presence"; peer: Peer }
  | { kind: "bye"; id: string };

const CHANNEL = "ares-hud-link";
const SNAP_KEY = "ares-hud:eva-state";
const TICK_MS = 50;
const PEER_TTL = 4000;

export const SERVER_SNAPSHOT: LinkSnapshot = { eva: INITIAL_EVA, peers: [], isLeader: false, connected: false };

function loadPersisted(): EvaState {
  try {
    const raw = localStorage.getItem(SNAP_KEY);
    if (!raw) return INITIAL_EVA;
    const saved = JSON.parse(raw) as EvaState;
    return { ...INITIAL_EVA, ...saved, input: INITIAL_EVA.input, moving: false };
  } catch {
    return INITIAL_EVA;
  }
}

class EvaLink {
  private id = Math.random().toString(36).slice(2, 10);
  private role: LinkRole = "visor";
  private state: EvaState;
  private peers = new Map<string, Peer>();
  private isLeader = false;
  private channel: BroadcastChannel | null;
  private listeners = new Set<() => void>();
  private snapshot: LinkSnapshot;
  private localLookUntil = 0;
  private lastTick = 0;
  private lastPersist = 0;

  constructor() {
    this.state = loadPersisted();
    this.channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL) : null;
    this.channel?.addEventListener("message", (e: MessageEvent<Msg>) => this.onMessage(e.data));
    this.snapshot = this.build();
    this.elect();
    this.announce();
    window.setInterval(() => {
      this.announce();
      this.prunePeers();
    }, 1500);
    window.addEventListener("pagehide", () => this.post({ kind: "bye", id: this.id }));
  }

  private build(): LinkSnapshot {
    const peers = [...this.peers.values()];
    return { eva: this.state, peers, isLeader: this.isLeader, connected: peers.length > 0 };
  }

  private emit() {
    this.snapshot = this.build();
    this.listeners.forEach((l) => l());
  }

  private post(m: Msg) {
    this.channel?.postMessage(m);
  }

  private elect() {
    const nav = navigator as Navigator & { locks?: LockManager };
    if (nav.locks?.request) {
      void nav.locks.request("ares-hud-leader", () => {
        this.becomeLeader();
        return new Promise<void>(() => {}); // hold the lock while the tab is open
      });
    } else this.becomeLeader();
  }

  private becomeLeader() {
    this.isLeader = true;
    this.state = { ...this.state, input: INITIAL_EVA.input };
    this.lastTick = performance.now();
    window.setInterval(() => this.tick(), TICK_MS);
    this.emit();
  }

  private tick() {
    const now = performance.now();
    const dt = Math.min(0.25, (now - this.lastTick) / 1000);
    this.lastTick = now;
    const next = step(this.state, dt);
    if (next !== this.state) {
      this.state = next;
      this.broadcastState();
    }
    if (now - this.lastPersist > 1000) {
      this.lastPersist = now;
      try {
        localStorage.setItem(SNAP_KEY, JSON.stringify(this.state));
      } catch {
        /* storage full or blocked: keep running in memory */
      }
    }
  }

  private broadcastState() {
    this.post({ kind: "state", from: this.id, state: this.state });
    this.emit();
  }

  private announce() {
    this.post({ kind: "presence", peer: { id: this.id, role: this.role, at: Date.now() } });
  }

  private prunePeers() {
    const now = Date.now();
    let changed = false;
    for (const [id, p] of this.peers) {
      if (now - p.at > PEER_TTL) {
        this.peers.delete(id);
        changed = true;
      }
    }
    if (changed) this.emit();
  }

  private onMessage(m: Msg) {
    switch (m.kind) {
      case "state": {
        if (this.isLeader) return;
        const keepLook = performance.now() < this.localLookUntil;
        this.state = keepLook
          ? { ...m.state, lookOffset: this.state.lookOffset, lookPitch: this.state.lookPitch }
          : m.state;
        this.emit();
        return;
      }
      case "cmd":
        if (this.isLeader) {
          this.state = applyCommand(this.state, m.cmd);
          this.broadcastState();
        }
        return;
      case "presence": {
        const isNew = !this.peers.has(m.peer.id);
        this.peers.set(m.peer.id, m.peer);
        if (isNew) {
          this.announce();
          if (this.isLeader) this.broadcastState();
        }
        this.emit();
        return;
      }
      case "bye":
        this.peers.delete(m.id);
        this.emit();
        return;
    }
  }

  setRole(role: LinkRole) {
    if (this.role === role) return;
    this.role = role;
    this.announce();
  }

  dispatch = (cmd: Command) => {
    if (cmd.type === "look") this.localLookUntil = performance.now() + 400;
    this.state = applyCommand(this.state, cmd);
    if (this.isLeader) this.broadcastState();
    else {
      this.post({ kind: "cmd", from: this.id, cmd });
      this.emit();
    }
  };

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = () => this.snapshot;
}

let link: EvaLink | null = null;
export function getLink() {
  if (!link) link = new EvaLink();
  return link;
}
