export type VoiceCommandAction =
  | "toggleCompact"
  | "restore"
  | "startEVA"
  | "pauseEVA"
  | "toggleAutopilot"
  | "triggerStorm"
  | "collectMaterial"
  | "showSamples"
  | "showRoute"
  | "saveGeoPoint"
  | "saveVoiceNote"
  | "sendPriorityNews"
  | "reset";

export type VoiceCommand = {
  action: VoiceCommandAction;
  detail?: string;
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractAfter = (input: string, needles: string[]) => {
  const ordered = [...needles].sort((a, b) => b.length - a.length);
  for (const needle of ordered) {
    const index = input.indexOf(needle);
    if (index < 0) continue;
    const detail = input.slice(index + needle.length).trim();
    if (detail) return detail;
  }
  return undefined;
};

export function parseVoiceCommand(raw: string): VoiceCommand | null {
  const input = normalize(raw);
  if (!input) return null;

  if (/(recoger|recolectar|coger|tomar).*(material|materiales|mineral|minerales|roca|hielo|yeso|arcilla|basalto|hematita|muestra)/.test(input) || /(material|materiales|mineral|minerales|roca|hielo|yeso|arcilla|basalto|hematita|muestra).*(recoger|recolectar|coger|tomar)/.test(input)) {
    const detail = extractAfter(input, [
      "recoger material",
      "recolectar material",
      "coger material",
      "tomar material",
      "recoger",
      "recolectar",
      "coger",
      "tomar",
      "material",
      "mineral",
      "hielo",
      "roca",
      "yeso",
      "arcilla",
      "basalto",
      "hematita",
    ]);
    return detail ? { action: "collectMaterial", detail } : { action: "collectMaterial" };
  }
  if (/(mostrar|ver|abrir|listar).*(muestras|recogidas|registros|bitacora)/.test(input) || /(muestras|recogidas|registros|bitacora).*(mostrar|ver|abrir|listar)/.test(input)) {
    return { action: "showSamples" };
  }
  if (/(ruta|camino|trayectoria).*(correcta|seguida|seguir|guia|guia de marcha|siguiente)/.test(input) || /(correcta|guia|guia de marcha).*(ruta|camino|trayectoria)/.test(input)) {
    return { action: "showRoute" };
  }
  if (/(guardar|marcar|anotar|grabar).*(punto|geo|geografico|geografico|geografica)/.test(input) || /(punto|geo|geografico|geografica).*(guardar|marcar|anotar|grabar)/.test(input)) {
    return { action: "saveGeoPoint" };
  }
  if (/(guardar|grabar|anotar|dictado|nota).*(voz|de voz|por voz|nota)/.test(input) || /(nota|dictado|voz).*(guardar|grabar|anotar|dictado|nota)/.test(input)) {
    const detail = extractAfter(input, [
      "nota por voz",
      "nota de voz",
      "guardar nota",
      "grabar nota",
      "anotar nota",
      "dictado",
      "nota",
    ]);
    return detail ? { action: "saveVoiceNote", detail } : { action: "saveVoiceNote" };
  }
  if (/(noticia|mensaje|aviso|informe).*(importante|prioritaria|urgente|critica|destacada|principal)/.test(input) || /(importante|prioritaria|urgente|critica|destacada|principal).*(noticia|mensaje|aviso|informe)/.test(input) || /(envia|enviar|manda|mandar).*(noticia|mensaje|aviso|informe)/.test(input)) {
    const detail = extractAfter(input, [
      "noticia importante",
      "mensaje importante",
      "aviso urgente",
      "noticia prioritaria",
      "mensaje prioritario",
      "enviar noticia",
      "envia noticia",
      "manda noticia",
      "noticia",
      "mensaje",
      "aviso",
      "informe",
    ]);
    return detail ? { action: "sendPriorityNews", detail } : { action: "sendPriorityNews" };
  }

  if (/(minimi|compact|ocultar|reducir|oculta)/.test(input)) {
    return { action: "toggleCompact" };
  }
  if (/(restaurar|mostrar|expand|normal|maximi)/.test(input)) {
    return { action: "restore" };
  }
  if (/(iniciar|activar|comenzar).*(eva|misión)|eva.*(iniciar|activar|comenzar)/.test(input)) {
    return { action: "startEVA" };
  }
  if (/(pausar|detener).*(eva|misión)|eva.*(pausar|detener)/.test(input)) {
    return { action: "pauseEVA" };
  }
  if (/(autopiloto|piloto|piloto automatico)/.test(input)) {
    return { action: "toggleAutopilot" };
  }
  if (/(tormenta|solar|particulas)/.test(input)) {
    return { action: "triggerStorm" };
  }
  if (/(reiniciar|reset)/.test(input)) {
    return { action: "reset" };
  }

  return null;
}
