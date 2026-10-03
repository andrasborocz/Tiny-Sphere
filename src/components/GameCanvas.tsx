import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { GameEngine } from '../game/gameEngine';
import { GameStats, TimeOfDay, WeatherType, POI } from '../types/game';

export interface GameCanvasHandle {
  setTimeOfDay: (time: TimeOfDay) => void;
  setWeather: (weather: WeatherType) => void;
  setCameraMode: (mode: 'isometric' | 'follow' | 'cinematic' | 'orbit') => void;
  toggleMute: () => void;
  jump: () => void;
  interact: () => void;
  setVirtualMoveVector: (x: number, y: number, isSprint: boolean) => void;
  capture4KSnapshot: () => string;
  getPOIs: () => POI[];
}

interface GameCanvasProps {
  onStatsChange: (stats: GameStats) => void;
}

export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(({ onStatsChange }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine(containerRef.current, onStatsChange);
    engineRef.current = engine;
    setIsReady(true);

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [onStatsChange]);

  useImperativeHandle(ref, () => ({
    setTimeOfDay: (time: TimeOfDay) => engineRef.current?.setTimeOfDay(time),
    setWeather: (weather: WeatherType) => engineRef.current?.setWeather(weather),
    setCameraMode: (mode: 'isometric' | 'follow' | 'cinematic' | 'orbit') => engineRef.current?.setCameraMode(mode),
    toggleMute: () => engineRef.current?.toggleMute(),
    jump: () => engineRef.current?.jump(),
    interact: () => engineRef.current?.interact(),
    setVirtualMoveVector: (x: number, y: number, isSprint: boolean) => engineRef.current?.setVirtualMoveVector(x, y, isSprint),
    capture4KSnapshot: () => engineRef.current?.capture4KSnapshot() || '',
    getPOIs: () => engineRef.current?.getPOIs() || [],
  }));

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-slate-400 text-sm">
          <span>Generating Low-Poly Micro-Planet...</span>
        </div>
      )}
    </div>
  );
});
