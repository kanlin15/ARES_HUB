// On-device field log (IndexedDB): collected samples with photos and geological resource points.
import { get, set } from "idb-keyval";

export interface FieldLocation {
  lat: number;
  lon: number;
  x: number;
  y: number;
  waypoint: string;
  terrain: string;
  slope: number;
  missionTime: number;
}

export interface Sample {
  id: string;
  name: string;
  category: string;
  description: string;
  photos: string[];
  location: FieldLocation;
  createdAt: number;
}

export interface GeoPoint {
  id: string;
  resource: string;
  abundance: string;
  notes: string;
  location: FieldLocation;
  createdAt: number;
}

const SAMPLES_KEY = "ares-hud:samples";
const GEO_KEY = "ares-hud:geo-points";

export const loadSamples = async () => ((await get<Sample[]>(SAMPLES_KEY)) ?? []);
export const saveSamples = (s: Sample[]) => set(SAMPLES_KEY, s);
export const loadGeoPoints = async () => ((await get<GeoPoint[]>(GEO_KEY)) ?? []);
export const saveGeoPoints = (g: GeoPoint[]) => set(GEO_KEY, g);

export const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

/** Downscale a photo to keep the log light: longest side 1024px, JPEG. */
export function compressImage(file: File, maxSide = 1024, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}
