import { Download, X } from 'lucide-react';

interface SnapshotModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export function SnapshotModal({ imageUrl, onClose }: SnapshotModalProps) {
  if (!imageUrl) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `tiny-planet-4k-snapshot-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/60 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">4K Ultra-Sharp Snapshot</h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>3840 × 2160 Ultra-HD</span>
              <span aria-hidden="true">·</span>
              <span>Flat-Shaded Low-Poly Render</span>
              <span aria-hidden="true">·</span>
              <span>Spherical Micro-Planet</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Preview Container */}
        <div className="relative flex-1 min-h-[300px] overflow-auto bg-slate-950 flex items-center justify-center p-3">
          <img
            src={imageUrl}
            alt="4K Low-Poly Micro-Planet World Render"
            referrerPolicy="no-referrer"
            className="max-h-[62vh] w-auto rounded-lg object-contain shadow-lg border border-slate-800"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <p className="text-xs text-slate-400">
            Rendered at native 4K canvas buffer with PCF soft shadows and filmic tone mapping.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download 4K PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
