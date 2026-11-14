import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronsLeft, ChevronsRight, LocateFixed } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MoveKey } from "@/hooks/use-move-keys";
import { cn } from "@/lib/utils";

function PadButton({
  k,
  icon: Icon,
  label,
  press,
  release,
  className,
}: {
  k: MoveKey;
  icon: LucideIcon;
  label: string;
  press: (k: MoveKey) => void;
  release: (k: MoveKey) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        press(k);
      }}
      onPointerUp={() => release(k)}
      onPointerCancel={() => release(k)}
      onLostPointerCapture={() => release(k)}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "grid size-10 select-none place-items-center rounded-sm border border-border bg-glass text-primary transition-colors active:bg-primary active:text-primary-foreground",
        className,
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

export function MovePad({
  press,
  release,
  onCenter,
}: {
  press: (k: MoveKey) => void;
  release: (k: MoveKey) => void;
  onCenter: () => void;
}) {
  const p = { press, release };
  return (
    <div className="pointer-events-auto flex items-end gap-3" aria-label="Controles de movimiento">
      <div className="grid grid-cols-3 gap-1">
        <PadButton k="strafeL" icon={ChevronsLeft} label="Paso lateral izquierda (Q)" {...p} />
        <PadButton k="forward" icon={ArrowUp} label="Avanzar (W)" {...p} />
        <PadButton k="strafeR" icon={ChevronsRight} label="Paso lateral derecha (E)" {...p} />
        <PadButton k="left" icon={ArrowLeft} label="Girar izquierda (A)" {...p} />
        <PadButton k="back" icon={ArrowDown} label="Retroceder (S)" {...p} />
        <PadButton k="right" icon={ArrowRight} label="Girar derecha (D)" {...p} />
      </div>
      <div className="space-y-1">
        <button
          type="button"
          onClick={onCenter}
          className="flex items-center gap-1.5 rounded-sm border border-border bg-glass px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary hover:bg-primary/15"
        >
          <LocateFixed className="size-3.5" /> Centrar vista (C)
        </button>
        <p className="hidden font-mono text-[10px] leading-relaxed text-muted-foreground sm:block">
          W A S D · moverse
          <br />
          Arrastra · mirar alrededor
        </p>
      </div>
    </div>
  );
}
