import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CrewMessage } from "@/lib/eva-engine";

export function CommsBanner({ message, onReceived }: { message: CrewMessage | null; onReceived: () => void }) {
  if (!message || message.receivedAt) return null;
  return (
    <div role="status" className="hud-panel mx-auto flex max-w-xl items-start gap-3 border-primary p-3">
      <MessageSquare className="mt-0.5 size-4 shrink-0 text-primary alert-blink" />
      <div className="min-w-0 flex-1">
        <p className="hud-label">Mensaje de Centro de control</p>
        <p className="text-sm text-foreground">{message.text}</p>
      </div>
      <Button variant="hudSolid" size="sm" onClick={onReceived}>
        Recibido
      </Button>
    </div>
  );
}
