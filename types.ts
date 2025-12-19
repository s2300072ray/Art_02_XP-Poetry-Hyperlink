
export interface PoetryNode {
  id: string;
  parentId?: string;
  text: string;
  fullText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  zIndex: number;
}

export enum BackgroundType {
  Noise = 0,
  WavesColor = 1,
  WavesSharp = 2,
  Circles = 3,
  DotGrid = 4,
  ShadowFigures = 5,
  DelaunayMesh = 6,
  BlissDream = 7
}

export interface VirtualCursor {
  x: number;
  y: number;
  isDown: boolean;
  targetId: string | null;
  progress: number; // 0 to 1 for click detection
}
