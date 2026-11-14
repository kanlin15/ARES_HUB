import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { HudAlert } from "@/lib/alerts";
import { cn } from "@/lib/utils";

export function AlertBanner({ alerts }: { alerts: HudAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="mx-auto flex w-fit items-center justify-center gap-2 rounded-sm bg-glass px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-success">
        <ShieldCheck className="size-4" /> Todos los sistemas nominales
      </div>
    );
  }
  const sorted = alerts.slice(0, 4);
  return (
    <div role="alert" className="flex flex-wrap justify-center gap-2">
      {sorted.map((a) => (
        <span
          key={a.id}
          className={cn(
            "flex items-center gap-2 rounded-sm border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em]",
            a.status === "critico"
              ? "alert-blink border-destructive bg-background/85 text-destructive"
              : "border-warning bg-background/85 text-warning",
          )}
        >
          <AlertTriangle className="size-3.5" />
          {a.message}
        </span>
      ))}
    </div>
  );
}
