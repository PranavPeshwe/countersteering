import { TORQUE_NM } from './physics';
import type { ForceVector } from './scene-contract';

export type PressDirection = 'forward' | 'backward' | 'side-in' | 'side-out' | 'top' | 'diagonal';
export type PressStyle = 'hold' | 'gentle' | 'quick' | 'jerk' | 'strong';
export type PressSide = 'left' | 'right';
export const PRESS_DIRECTIONS = ['forward', 'backward', 'side-in', 'side-out', 'top', 'diagonal'] as const;
export const GRIP_LEVER_METERS = 0.3;
export const MAX_FORWARD_TORQUE = TORQUE_NM * 4;

export interface PressSettings {
  direction: PressDirection;
  style: PressStyle;
  strength: number;
  duration: number;
  attack: number;
}

export const PRESS_STYLES = [
  { id: 'hold', label: 'Steady hold', hint: 'Hold, then release', strength: 25, duration: 1, attack: 0.02 },
  { id: 'gentle', label: 'Gentle push', hint: 'Hold for smooth pulses', strength: 15, duration: 0.85, attack: 0.25 },
  { id: 'quick', label: 'Quick push', hint: 'Hold for brief pushes', strength: 25, duration: 0.2, attack: 0.025 },
  { id: 'jerk', label: 'Sharp jerk', hint: 'Hold for sharp pulses', strength: 45, duration: 0.1, attack: 0.008 },
  { id: 'strong', label: 'Strong jerk', hint: 'Hold for firm pulses', strength: 80, duration: 0.17, attack: 0.008 },
] as const;

export const DEFAULT_PRESS: Readonly<PressSettings> = {
  direction: 'forward',
  style: 'hold',
  strength: 25,
  duration: 1,
  attack: 0.02,
};

export interface AppliedPress {
  left: boolean;
  right: boolean;
  torque: number;
  leftLevel: number;
  rightLevel: number;
  leftForce: ForceVector;
  rightForce: ForceVector;
  leftNewtons: number;
  rightNewtons: number;
}

export function validatePress(settings: Readonly<PressSettings>): void {
  if (
    !PRESS_DIRECTIONS.includes(settings.direction) ||
    !PRESS_STYLES.some(style => style.id === settings.style) ||
    !Number.isFinite(settings.strength) ||
    settings.strength < 0 || settings.strength > 100 ||
    !Number.isFinite(settings.duration) || settings.duration < 0.08 || settings.duration > 1.5 ||
    !Number.isFinite(settings.attack) || settings.attack < 0.004 || settings.attack > 0.5
  ) {
    throw new RangeError('Press settings require a supported direction/style and bounded strength, duration, and attack.');
  }
}

export function pulseLevel(settings: Readonly<PressSettings>, seconds: number): number {
  if (!Number.isFinite(seconds)) throw new RangeError('Pulse time must be finite.');
  if (seconds < 0 || seconds >= settings.duration) return 0;
  const rise = Math.min(settings.attack, settings.duration / 2);
  const fall = Math.min(settings.duration * 0.4, settings.duration - rise);
  if (seconds < rise) return seconds / rise;
  if (seconds > settings.duration - fall) return (settings.duration - seconds) / fall;
  return 1;
}

export function forceDirection(direction: PressDirection, side: PressSide): ForceVector {
  const outward = side === 'right' ? 1 : -1;
  switch (direction) {
    case 'forward': return { x: 0, y: 0, z: -1 };
    case 'backward': return { x: 0, y: 0, z: 1 };
    case 'side-in': return { x: -outward, y: 0, z: 0 };
    case 'side-out': return { x: outward, y: 0, z: 0 };
    case 'top': return { x: 0, y: -1, z: 0 };
    case 'diagonal': return { x: 0, y: -Math.SQRT1_2, z: -Math.SQRT1_2 };
  }
}

export function projectedTorque(side: PressSide, force: ForceVector): number {
  const lateralLever = side === 'right' ? GRIP_LEVER_METERS : -GRIP_LEVER_METERS;
  // (r x F) dot axis, with r=(+/-lever,0,0) and right-positive axis=(0,-1,0).
  const momentY = -lateralLever * force.z;
  return -momentY;
}

export function applyPress(
  settings: Readonly<PressSettings>,
  leftLevel: number,
  rightLevel: number,
): AppliedPress {
  const peakForce = (MAX_FORWARD_TORQUE * settings.strength / 100) / GRIP_LEVER_METERS;
  const leftNewtons = peakForce * leftLevel;
  const rightNewtons = peakForce * rightLevel;
  const leftDirection = forceDirection(settings.direction, 'left');
  const rightDirection = forceDirection(settings.direction, 'right');
  const leftForce = {
    x: leftDirection.x * leftNewtons,
    y: leftDirection.y * leftNewtons,
    z: leftDirection.z * leftNewtons,
  };
  const rightForce = {
    x: rightDirection.x * rightNewtons,
    y: rightDirection.y * rightNewtons,
    z: rightDirection.z * rightNewtons,
  };
  return {
    left: leftNewtons > 0,
    right: rightNewtons > 0,
    torque: projectedTorque('left', leftForce) + projectedTorque('right', rightForce),
    leftLevel: leftLevel * settings.strength / 100,
    rightLevel: rightLevel * settings.strength / 100,
    leftForce,
    rightForce,
    leftNewtons,
    rightNewtons,
  };
}

export function steeringOnlyDirection(direction: PressDirection): boolean {
  return direction === 'side-in' || direction === 'side-out' || direction === 'top';
}

export function styleSettings(style: PressStyle, direction: PressDirection): PressSettings {
  const preset = PRESS_STYLES.find(item => item.id === style);
  if (!preset) throw new Error('Unknown press style.');
  return {
    direction,
    style: preset.id,
    strength: preset.strength,
    duration: preset.duration,
    attack: preset.attack,
  };
}

export function parseDirection(value: string): PressDirection {
  const direction = PRESS_DIRECTIONS.find(item => item === value);
  if (!direction) throw new RangeError('Unsupported press direction.');
  return direction;
}
