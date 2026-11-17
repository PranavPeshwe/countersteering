import { applyPress, DEFAULT_PRESS, pulseLevel } from './press';
import type { AppliedPress, PressSettings } from './press';

export type GripSide = 'left' | 'right';
export type GripState = AppliedPress;
export interface HeldGrips {
  left: boolean;
  right: boolean;
}

export class Grips {
  private readonly left = new Set<string>();
  private readonly right = new Set<string>();
  private readonly started: Record<GripSide, number | null> = { left: null, right: null };

  constructor(
    private readonly settings: () => Readonly<PressSettings> = () => DEFAULT_PRESS,
    private readonly time: () => number = () => 0,
  ) {}

  press(side: GripSide, source: string): void {
    if (!source) throw new Error('A grip press requires an input source.');
    const sources = side === 'left' ? this.left : this.right;
    if (sources.size === 0) this.started[side] = this.time();
    sources.add(source);
  }

  release(source: string): void {
    this.left.delete(source);
    this.right.delete(source);
    if (this.left.size === 0) this.started.left = null;
    if (this.right.size === 0) this.started.right = null;
  }

  clear(): void {
    this.left.clear();
    this.right.clear();
    this.started.left = null;
    this.started.right = null;
  }

  snapshot(at = this.time()): GripState {
    const settings = this.settings();
    const level = (side: GripSide): number => {
      if (settings.style === 'hold') return Number((side === 'left' ? this.left : this.right).size > 0);
      const start = this.started[side];
      if (start === null || at < start) return 0;
      return pulseLevel(settings, (at - start) % settings.duration);
    };
    return applyPress(settings, level('left'), level('right'));
  }

  held(): HeldGrips {
    return { left: this.left.size > 0, right: this.right.size > 0 };
  }
}
