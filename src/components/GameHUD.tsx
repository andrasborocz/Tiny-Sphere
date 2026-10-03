import { Volume2, VolumeX, Camera, BookOpen, Sun, CloudRain, Snowflake } from 'lucide-react';
import { GameStats, TimeOfDay, WeatherType } from '../types/game';

interface GameHUDProps {
  stats: GameStats;
  onTimeOfDayChange: (time: TimeOfDay) => void;
  onWeatherChange: (weather: WeatherType) => void;
  onCameraModeChange: (mode: 'isometric' | 'follow' | 'cinematic' | 'orbit') => void;
  onToggleMute: () => void;
  onCapture4K: () => void;
  onOpenJournal: () => void;
}

export function GameHUD({
  stats,
  onTimeOfDayChange,
  onWeatherChange,
  onCameraModeChange,
  onToggleMute,
  onCapture4K,
  onOpenJournal,
}: GameHUDProps) {
  const cameraModes: { id: 'isometric' | 'follow' | 'cinematic' | 'orbit'; label: string }[] = [
    { id: 'isometric', label: 'Isometric' },
    { id: 'follow', label: 'Follow' },
    { id: 'cinematic', label: 'Cinematic' },
    { id: 'orbit', label: 'Free Orbit' },
  ];

  const timeOptions: { id: TimeOfDay; label: string }[] = [
    { id: 'day', label: 'Noon' },
    { id: 'sunset', label: 'Sunset' },
    { id: 'night', label: 'Night' },
    { id: 'dawn', label: 'Dawn' },
  ];

  const weatherOptions: { id: WeatherType; label: string; icon: typeof Sun }[] = [
    { id: 'clear', label: 'Clear', icon: Sun },
    { id: 'rain', label: 'Rain', icon: CloudRain },
    { id: 'snow', label: 'Snow', icon: Snowflake },
  ];

  const weatherLabels: Record<WeatherType, string> = {
    clear: 'Clear Skies',
    rain: 'Light Rain',
    snow: 'Falling Snow',
  };

  return (
    <div className="fixed inset-x-0 top-0 z-20 pointer-events-none flex flex-col">
      {/* Strict 3-Zone Top Navigation Bar */}
      <header className="pointer-events-auto flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/10 bg-slate-950/70 backdrop-blur-md">
        {/* Zone 1: Single text element wordmark */}
        <span className="text-sm md:text-base font-bold tracking-tight text-slate-100 whitespace-nowrap">
          Tiny Planet Odyssey
        </span>

        {/* Zone 2: Clean functional segmented controls */}
        <nav className="hidden lg:flex items-center gap-3">
          {/* Camera selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-lg border border-white/10">
            {cameraModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => onCameraModeChange(mode.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  stats.cameraMode === mode.id
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Time of Day selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-lg border border-white/10">
            {timeOptions.map((time) => (
              <button
                key={time.id}
                onClick={() => onTimeOfDayChange(time.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  stats.timeOfDay === time.id
                    ? 'bg-amber-400/20 text-amber-300 shadow-sm border border-amber-400/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {time.label}
              </button>
            ))}
          </div>

          {/* Weather selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-lg border border-white/10">
            {weatherOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  onClick={() => onWeatherChange(opt.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    stats.weather === opt.id
                      ? 'bg-cyan-400/20 text-cyan-300 shadow-sm border border-cyan-400/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-2">
          {/* Audio toggle */}
          <button
            onClick={onToggleMute}
            className="p-2 text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 rounded-lg border border-white/10 transition-colors"
            title={stats.isAudioMuted ? 'Unmute cozy audio' : 'Mute audio'}
            aria-label="Toggle ambient sound"
          >
            {stats.isAudioMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Journal button */}
          <button
            onClick={onOpenJournal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-900/80 hover:bg-slate-800 rounded-lg border border-white/10 transition-colors whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Journal</span>
          </button>

          {/* 4K Screenshot button */}
          <button
            onClick={onCapture4K}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-sm whitespace-nowrap"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Capture 4K</span>
          </button>
        </div>
      </header>

      {/* Sub-header on mobile: compact camera, time & weather controls */}
      <div className="lg:hidden pointer-events-auto flex items-center justify-between px-4 py-2 bg-slate-950/50 backdrop-blur-sm border-b border-white/5 overflow-x-auto gap-2">
        <div className="flex items-center gap-1">
          {cameraModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => onCameraModeChange(mode.id)}
              className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                stats.cameraMode === mode.id ? 'bg-white/20 text-white' : 'text-slate-400'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {timeOptions.map((time) => (
            <button
              key={time.id}
              onClick={() => onTimeOfDayChange(time.id)}
              className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                stats.timeOfDay === time.id ? 'bg-amber-400/25 text-amber-300' : 'text-slate-400'
              }`}
            >
              {time.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {weatherOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onWeatherChange(opt.id)}
              className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                stats.weather === opt.id ? 'bg-cyan-400/25 text-cyan-300' : 'text-slate-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Unboxed Metadata Strip (Following Zero-Pill Discipline) */}
      <div className="px-6 py-2 pointer-events-none">
        <div className="flex items-center gap-2.5 text-xs font-mono tabular-nums text-slate-300/80 drop-shadow-md flex-wrap">
          <span>Landmarks {stats.locationsVisited} / {stats.totalLocations}</span>
          <span aria-hidden="true" className="text-slate-500">·</span>
          <span>Acorns {stats.pineconesCollected} / {stats.totalPinecones}</span>
          <span aria-hidden="true" className="text-slate-500">·</span>
          <span className="text-cyan-300/90 font-medium">Weather: {weatherLabels[stats.weather]}</span>
          <span aria-hidden="true" className="text-slate-500">·</span>
          <span>Curvature R=16m</span>
          <span aria-hidden="true" className="text-slate-500">·</span>
          <span className="hidden sm:inline">WASD / Click to move · Space to jump · E to interact</span>
        </div>
      </div>
    </div>
  );
}
