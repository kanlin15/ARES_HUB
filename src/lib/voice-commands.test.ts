import { describe, expect, it } from "vitest";

import { parseVoiceCommand } from "./voice-commands";

describe("voice commands", () => {
  it("recognizes the compact visor and EVA controls", () => {
    expect(parseVoiceCommand("minimizar visor")).toEqual({ action: "toggleCompact" });
    expect(parseVoiceCommand("restaurar visor")).toEqual({ action: "restore" });
    expect(parseVoiceCommand("iniciar EVA")).toEqual({ action: "startEVA" });
    expect(parseVoiceCommand("pausar EVA")).toEqual({ action: "pauseEVA" });
    expect(parseVoiceCommand("tormenta solar")).toEqual({ action: "triggerStorm" });
  });

  it("recognizes mission guidance and logging commands", () => {
    expect(parseVoiceCommand("mostrar muestras recogidas")).toEqual({ action: "showSamples" });
    expect(parseVoiceCommand("ruta correcta a seguir")).toEqual({ action: "showRoute" });
    expect(parseVoiceCommand("guardar punto geografico")).toEqual({ action: "saveGeoPoint" });
    expect(parseVoiceCommand("guardar nota por voz presencia de hielo")).toEqual({
      action: "saveVoiceNote",
      detail: "presencia de hielo",
    });
    expect(parseVoiceCommand("envia noticia importante claridad alta en el cruce")).toEqual({
      action: "sendPriorityNews",
      detail: "claridad alta en el cruce",
    });
    expect(parseVoiceCommand("recoger material mineral")).toEqual({
      action: "collectMaterial",
      detail: "mineral",
    });
  });
});
