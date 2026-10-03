export type TimeOfDay = 'day' | 'sunset' | 'night' | 'dawn';
export type WeatherType = 'clear' | 'rain' | 'snow';

export interface POI {
  id: string;
  name: string;
  description: string;
  category: string;
  interacted: boolean;
  position: [number, number, number];
}

export interface Collectible {
  id: string;
  name: string;
  collected: boolean;
  position: [number, number, number];
}

export interface GameStats {
  pineconesCollected: number;
  totalPinecones: number;
  locationsVisited: number;
  totalLocations: number;
  timeOfDay: TimeOfDay;
  weather: WeatherType;
  isAudioMuted: boolean;
  cameraMode: 'isometric' | 'follow' | 'cinematic' | 'orbit';
  activeInteractionPrompt: string | null;
}

