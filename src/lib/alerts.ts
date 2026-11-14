import { OFF_ROUTE_LIMIT, RESOURCES, resourceStatus, slopeLevel, type PlaceContext, type Status, type Telemetry } from "./mission";

export interface HudAlert {
  id: string;
  status: Exclude<Status, "nominal">;
  message: string;
  detail: string;
}

export function computeAlerts(telemetry: Telemetry, ctx: PlaceContext): HudAlert[] {
  const list: HudAlert[] = [];
  for (const r of RESOURCES) {
    const st = resourceStatus(r.key, telemetry[r.key]);
    if (st !== "nominal")
      list.push({
        id: `${r.key}:${st}`,
        status: st,
        message: `${r.label} ${telemetry[r.key].toFixed(r.decimals)} ${r.unit}`,
        detail: st === "critico" ? "Nivel crítico — actuar de inmediato" : "Advertencia de soporte vital",
      });
  }
  const slope = slopeLevel(ctx.slope);
  if (slope.status !== "nominal")
    list.push({
      id: `slope:${ctx.segment}`,
      status: slope.status,
      message: `Pendiente ${ctx.slope}° · ${slope.label}`,
      detail: ctx.slope >= 30 ? "Considere ruta alterna o cuerda fija" : "Avance con precaución",
    });
  if (ctx.offRoute > OFF_ROUTE_LIMIT)
    list.push({
      id: "off-route",
      status: "advertencia",
      message: `Fuera de ruta · ${Math.round(ctx.offRoute)} m`,
      detail: "Regrese a la ruta sugerida",
    });
  if (ctx.hazard && ctx.hazardDist <= ctx.hazard.radius)
    list.push({
      id: `hazard:${ctx.hazard.id}`,
      status: ctx.hazardDist <= ctx.hazard.radius * 0.4 ? "critico" : "advertencia",
      message: `${ctx.hazard.label} · ${Math.round(ctx.hazardDist)} m`,
      detail: "Peligro geológico cercano",
    });
  return list.sort((a, b) => (a.status === b.status ? 0 : a.status === "critico" ? -1 : 1));
}
