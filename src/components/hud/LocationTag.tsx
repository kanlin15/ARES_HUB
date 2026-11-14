import { MapPin } from "lucide-react";
import type { FieldLocation } from "@/lib/field-log";
import { formatCoord, formatMissionTime } from "@/lib/mission";

export function LocationTag({ location }: { location: FieldLocation }) {
  return (
    <div className="rounded-sm border border-border bg-muted/60 p-3 font-mono text-[11px] text-secondary-foreground">
      <p className="flex items-center gap-1.5 text-primary">
        <MapPin className="size-3.5" /> {formatCoord(location.lat, location.lon)}
      </p>
      <p className="mt-1 text-muted-foreground">
        {location.waypoint} · {location.terrain} · {location.slope}° · T+{formatMissionTime(location.missionTime)}
      </p>
    </div>
  );
}
