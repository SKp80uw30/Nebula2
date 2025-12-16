export enum ParticleShape {
  SPHERE = 'SPHERE',
  HEART = 'HEART',
  FLOWER = 'FLOWER',
  SATURN = 'SATURN',
  FIREWORKS = 'FIREWORKS'
}

export interface HandData {
  fingersUp: number;
  isPinching: boolean;
  pinchDistance: number;
  handPosition: { x: number; y: number }; // Normalized 0-1
  detected: boolean;
}

export interface AudioState {
  isMuted: boolean;
  intensity: number; // 0.0 to 1.0 based on pinch/interaction
}

export type ShapeConfig = {
  [key in ParticleShape]: {
    label: string;
    gesture: string;
    description: string;
    color: string;
  }
};