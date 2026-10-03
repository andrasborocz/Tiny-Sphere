import { useState, useRef, useEffect } from 'react';
import { Sparkles, ArrowUp, Zap } from 'lucide-react';

interface ControlsOverlayProps {
  onMove: (x: number, y: number, isSprint: boolean) => void;
  onJump: () => void;
  onInteract: () => void;
  activePrompt: string | null;
}

export function ControlsOverlay({
  onMove,
  onJump,
  onInteract,
  activePrompt,
}: ControlsOverlayProps) {
  const joystickRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isSprintToggled, setIsSprintToggled] = useState(false);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging || !joystickRef.current) return;
      const rect = joystickRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = e.clientX - centerX;
      let dy = e.clientY - centerY;
      const dist = Math.hypot(dx, dy);
      const maxRadius = rect.width / 2 - 12;

      if (dist > maxRadius) {
        dx = (dx / dist) * maxRadius;
        dy = (dy / dist) * maxRadius;
      }

      setKnobPos({ x: dx, y: dy });
      onMove(dx / maxRadius, dy / maxRadius, isSprintToggled);
    };

    const handlePointerUp = () => {
      if (!isDragging) return;
      setIsDragging(false);
      setKnobPos({ x: 0, y: 0 });
      onMove(0, 0, isSprintToggled);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, isSprintToggled, onMove]);

  return (
    <>
      {/* Central interaction callout when near a point of interest */}
      {activePrompt && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <button
            onClick={onInteract}
            className="flex items-center gap-3 px-5 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-400/40 shadow-xl backdrop-blur-md transition-all active:scale-95 animate-bounce-subtle"
          >
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin-slow" />
            <span className="text-xs font-semibold tracking-wide text-slate-100">{activePrompt}</span>
          </button>
        </div>
      )}

      {/* On-screen touch joystick for mobile/touch */}
      <div className="fixed bottom-6 left-6 z-20 pointer-events-auto select-none sm:opacity-90">
        <div
          ref={joystickRef}
          onPointerDown={() => setIsDragging(true)}
          className="relative w-28 h-28 rounded-full bg-slate-900/70 border border-slate-700/60 backdrop-blur-sm flex items-center justify-center touch-none shadow-lg"
          aria-label="Movement virtual joystick"
        >
          {/* Inner ring */}
          <div className="w-12 h-12 rounded-full border border-slate-600/40" />
          {/* Draggable Knob */}
          <div
            className="absolute w-12 h-12 rounded-full bg-amber-400/80 border-2 border-white/60 shadow-md transition-transform"
            style={{
              transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
            }}
          />
        </div>
      </div>

      {/* Touch Action buttons: Jump & Sprint */}
      <div className="fixed bottom-6 right-6 z-20 flex items-center gap-3 pointer-events-auto">
        <button
          onClick={() => {
            const next = !isSprintToggled;
            setIsSprintToggled(next);
            onMove(knobPos.x, knobPos.y, next);
          }}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-full border backdrop-blur-sm transition-all active:scale-95 shadow-lg ${
            isSprintToggled
              ? 'bg-amber-500/80 border-amber-300 text-slate-950 font-bold'
              : 'bg-slate-900/70 border-slate-700 text-slate-300'
          }`}
          aria-label="Toggle sprint"
        >
          <Zap className="w-4 h-4" />
          <span className="text-[9px] uppercase tracking-tighter mt-0.5">Sprint</span>
        </button>

        <button
          onClick={onJump}
          className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-emerald-500/80 hover:bg-emerald-400 border border-emerald-300 text-slate-950 font-bold backdrop-blur-sm transition-all active:scale-95 shadow-lg"
          aria-label="Jump"
        >
          <ArrowUp className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[10px] uppercase tracking-tighter">Jump</span>
        </button>
      </div>
    </>
  );
}
