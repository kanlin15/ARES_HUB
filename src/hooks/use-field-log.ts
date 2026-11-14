import { useCallback, useEffect, useState } from "react";
import {
  loadGeoPoints,
  loadSamples,
  saveGeoPoints,
  saveSamples,
  type GeoPoint,
  type Sample,
} from "@/lib/field-log";

export function useFieldLog() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [geoPoints, setGeoPoints] = useState<GeoPoint[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([loadSamples(), loadGeoPoints()]).then(([s, g]) => {
      setSamples(s);
      setGeoPoints(g);
      setReady(true);
    });
  }, []);

  const addSample = useCallback((s: Sample) => {
    setSamples((prev) => {
      const next = [s, ...prev];
      void saveSamples(next);
      return next;
    });
  }, []);
  const removeSample = useCallback((id: string) => {
    setSamples((prev) => {
      const next = prev.filter((s) => s.id !== id);
      void saveSamples(next);
      return next;
    });
  }, []);
  const addGeoPoint = useCallback((g: GeoPoint) => {
    setGeoPoints((prev) => {
      const next = [g, ...prev];
      void saveGeoPoints(next);
      return next;
    });
  }, []);
  const removeGeoPoint = useCallback((id: string) => {
    setGeoPoints((prev) => {
      const next = prev.filter((g) => g.id !== id);
      void saveGeoPoints(next);
      return next;
    });
  }, []);

  return { samples, geoPoints, ready, addSample, removeSample, addGeoPoint, removeGeoPoint };
}
