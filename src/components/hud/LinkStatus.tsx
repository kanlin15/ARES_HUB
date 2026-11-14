import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export function LinkStatus({ online, partner }: { online: boolean; partner: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        online ? "border-success/60 text-success" : "border-border text-muted-foreground",
      )}
      title={online ? `${partner} conectado en vivo` : `${partner} sin conexión`}
    >
      <Radio className={cn("size-3", online && "alert-blink")} />
      {partner} · {online ? "en vivo" : "sin enlace"}
    </span>
  );
}
