import { useState, useRef, useCallback } from 'react';
import { GameCanvas, GameCanvasHandle } from './components/GameCanvas';
import { GameHUD } from './components/GameHUD';
import { ControlsOverlay } from './components/ControlsOverlay';
import { JournalModal } from './components/JournalModal';
import { SnapshotModal } from './components/SnapshotModal';
import { GameStats, TimeOfDay, WeatherType } from './types/game';

export default function App() {
  const canvasRef = useRef<GameCanvasHandle>(null);
  const [stats, setStats] = useState<GameStats>({
    pineconesCollected: 0,
    totalPinecones: 7,
    locationsVisited: 0,
    totalLocations: 5,
    timeOfDay: 'day',
    weather: 'clear',
    isAudioMuted: true,
    cameraMode: 'isometric',
    activeInteractionPrompt: null,
  });

  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);

  const handleStatsChange = useCallback((newStats: GameStats) => {
    setStats(newStats);
  }, []);

  const handleTimeOfDayChange = (time: TimeOfDay) => {
    canvasRef.current?.setTimeOfDay(time);
  };

  const handleWeatherChange = (weather: WeatherType) => {
    canvasRef.current?.setWeather(weather);
  };

  const handleCameraModeChange = (mode: 'isometric' | 'follow' | 'cinematic' | 'orbit') => {
    canvasRef.current?.setCameraMode(mode);
  };

  const handleToggleMute = () => {
    canvasRef.current?.toggleMute();
  };

  const handleCapture4K = () => {
    const dataUrl = canvasRef.current?.capture4KSnapshot();
    if (dataUrl) {
      setSnapshotUrl(dataUrl);
    }
  };

  const handleJump = () => {
    canvasRef.current?.jump();
  };

  const handleInteract = () => {
    canvasRef.current?.interact();
  };

  const handleMove = (x: number, y: number, isSprint: boolean) => {
    canvasRef.current?.setVirtualMoveVector(x, y, isSprint);
  };

  const pois = canvasRef.current?.getPOIs() || [];

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* 3D WebGL Canvas Layer */}
      <GameCanvas ref={canvasRef} onStatsChange={handleStatsChange} />

      {/* Top HUD (3-Zone Contract, Zero-Pill) */}
      <GameHUD
        stats={stats}
        onTimeOfDayChange={handleTimeOfDayChange}
        onWeatherChange={handleWeatherChange}
        onCameraModeChange={handleCameraModeChange}
        onToggleMute={handleToggleMute}
        onCapture4K={handleCapture4K}
        onOpenJournal={() => setIsJournalOpen(true)}
      />

      {/* On-screen controls & interaction prompts */}
      <ControlsOverlay
        onMove={handleMove}
        onJump={handleJump}
        onInteract={handleInteract}
        activePrompt={stats.activeInteractionPrompt}
      />

      {/* Journal Modal */}
      <JournalModal
        isOpen={isJournalOpen}
        onClose={() => setIsJournalOpen(false)}
        pois={pois}
        pineconesCollected={stats.pineconesCollected}
        totalPinecones={stats.totalPinecones}
      />

      {/* 4K Snapshot Preview & Download Modal */}
      <SnapshotModal imageUrl={snapshotUrl} onClose={() => setSnapshotUrl(null)} />
    </main>
  );
}
