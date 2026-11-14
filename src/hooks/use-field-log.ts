import { useCallback, useEffect, useState } from "react";
import {
  loadGeoPoints,
  loadSamples,
  saveGeoPoints,
  saveSamples,
  type GeoPoint,
  type Sample,
} from "@/lib/field-log";

const LOG_CHANNEL = "ares-hud-log";

/** On-device sample & geo-point log, kept in sync across open tabs. */
export function useFieldLog() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [geoPoints, setGeoPoints] = useState<GeoPoint[]>([]);
  const [ready, setReady] = useState(false);
  const [channel, setChannel] = useState<BroadcastChannel | null>(null);

  useEffect(() => {
    const reload = () =>
      Promise.all([loadSamples(), loadGeoPoints()]).then(([s, g]) => {
        setSamples(s);
        setGeoPoints(g);
        setReady(true);
      });
    void reload();
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(LOG_CHANNEL);
    ch.onmessage = () => void reload();
    setChannel(ch);
    return () => ch.close();
  }, []);

  const notify = useCallback(() => channel?.postMessage("changed"), [channel]);

  const addSample = useCallback(
    (s: Sample) =>
      setSamples((prev) => {
        const next = [s, ...prev];
        void saveSamples(next).then(notify);
        return next;
      }),
    [notify],
  );
  const removeSample = useCallback(
    (id: string) =>
      setSamples((prev) => {
        const next = prev.filter((s) => s.id !== id);
        void saveSamples(next).then(notify);
        return next;
      }),
    [notify],
  );
  const addGeoPoint = useCallback(
    (g: GeoPoint) =>
      setGeoPoints((prev) => {
        const next = [g, ...prev];
        void saveGeoPoints(next).then(notify);
        return next;
      }),
    [notify],
  );
  const removeGeoPoint = useCallback(
    (id: string) =>
      setGeoPoints((prev) => {
        const next = prev.filter((g) => g.id !== id);
        void saveGeoPoints(next).then(notify);
        return next;
      }),
    [notify],
  );

  return { samples, geoPoints, ready, addSample, removeSample, addGeoPoint, removeGeoPoint };
}
