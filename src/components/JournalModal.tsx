import { X, CheckCircle2, Circle } from 'lucide-react';
import { POI } from '../types/game';

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  pois: POI[];
  pineconesCollected: number;
  totalPinecones: number;
}

export function JournalModal({
  isOpen,
  onClose,
  pois,
  pineconesCollected,
  totalPinecones,
}: JournalModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/60 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Explorer Field Journal</h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>Spherical Micro-World Expedition</span>
              <span aria-hidden="true">·</span>
              <span>Radius 16.0m</span>
              <span aria-hidden="true">·</span>
              <span>Low-Poly Topology</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close journal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Progress summary */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-slate-800/40 border border-slate-800">
            <div>
              <div className="text-xs text-slate-400">Landmarks Documented</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400 mt-1">
                {pois.filter((p) => p.interacted).length} / {pois.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Golden Acorns Collected</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-amber-400 mt-1">
                {pineconesCollected} / {totalPinecones}
              </div>
            </div>
          </div>

          {/* Landmarks list */}
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-3">Expedition Landmarks</h3>
            <div className="space-y-3">
              {pois.map((poi) => (
                <div
                  key={poi.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/25 border border-slate-800/60"
                >
                  <div className="mt-0.5">
                    {poi.interacted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-100">{poi.name}</span>
                      <span className="text-xs text-slate-400">{poi.category}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{poi.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Guide Tips */}
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <h4 className="text-xs font-semibold text-amber-300">Curved Horizon Tips</h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Because of the exaggerated curvature of the micro-planet, walking forward rotates the whole world underneath your boots. Click anywhere on the grassy hills to navigate via great-circle paths, or use WASD / touch controls to run freely across the planet.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors"
          >
            Resume Exploration
          </button>
        </div>
      </div>
    </div>
  );
}
