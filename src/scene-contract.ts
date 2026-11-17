export interface PathPoint {
  forward: number;
  lateral: number;
}

export interface ForceVector {
  x: number;
  y: number;
  z: number;
}

export interface SceneFrame {
  speed: number;
  time: number;
  forward: number;
  lateral: number;
  heading: number;
  lean: number;
  steer: number;
  leftPressed: boolean;
  rightPressed: boolean;
  leftForce: ForceVector;
  rightForce: ForceVector;
  comfort: boolean;
  path: readonly PathPoint[];
}

export interface RiderScene {
  render(frame: SceneFrame): void;
  dispose(): void;
}
