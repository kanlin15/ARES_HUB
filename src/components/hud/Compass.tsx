const MARKS = Array.from({ length: 72 }, (_, i) => i * 5);
const LABEL: Record<number, string> = { 0: "N", 45: "NE", 90: "E", 135: "SE", 180: "S", 225: "SO", 270: "O", 315: "NO" };

export function Compass({ heading }: { heading: number }) {
  const PX_PER_DEG = 4;
  return (
    <div className="relative mx-auto w-full max-w-md" aria-label={`Rumbo ${Math.round(heading)} grados`}>
      <div className="relative h-10 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
        <div
          className="absolute top-0 flex h-full transition-transform duration-700"
          style={{ left: "50%", transform: `translateX(${-(heading + 360) * PX_PER_DEG - (PX_PER_DEG * 5) / 2}px)` }}
        >
          {[...MARKS, ...MARKS.map((m) => m + 360), ...MARKS.map((m) => m + 720)].map((deg) => {
            const d = deg % 360;
            const major = d % 45 === 0;
            return (
              <div key={deg} className="relative flex flex-col items-center" style={{ width: PX_PER_DEG * 5 }}>
                <span className={major ? "h-3 w-px bg-primary" : "h-1.5 w-px bg-primary/50"} />
                {major && <span className="mt-0.5 font-mono text-[10px] text-primary hud-glow">{LABEL[d]}</span>}
              </div>
            );
          })}
        </div>
      </div>
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
        <div className="size-0 border-x-[6px] border-t-[7px] border-x-transparent border-t-accent" />
      </div>
      <p className="hud-value text-center text-xs text-primary hud-glow">{String(Math.round(heading)).padStart(3, "0")}°</p>
    </div>
  );
}
