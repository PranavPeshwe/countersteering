import { Grips } from './grips';
import type { GripSide, GripState, HeldGrips } from './grips';
import {
  initialState,
  interpolateState,
  modelLimit,
  SPEED_PRESETS,
  STEP_SECONDS,
  stepPhysics,
} from './physics';
import type { PhysicsState } from './physics';
import type { PathPoint } from './scene-contract';
import { applyPress, DEFAULT_PRESS, pulseLevel, validatePress } from './press';
import type { PressSettings } from './press';

export type Speed = (typeof SPEED_PRESETS)[number];
export type Mode = 'practice' | 'demo';
export const DEMO_INPUT_TICKS = 240;
export const DEMO_TICKS = 1200;

export interface Observation {
  wheelAway: boolean;
  leanIntoTurn: boolean;
  pathIntoTurn: boolean;
}

export interface InputEvent {
  tick: number;
  left: boolean;
  right: boolean;
  torque: number;
}

export interface PressTracePoint {
  time: number;
  left: number;
  right: number;
  torque: number;
}

export class Simulation {
  press: PressSettings = { ...DEFAULT_PRESS };
  readonly grips = new Grips(() => this.press, () => this.tick * STEP_SECONDS);
  state = initialState();
  previous = initialState();
  speed: Speed = 10;
  side: GripSide = 'right';
  mode: Mode = 'practice';
  running = false;
  slowMotion = false;
  interrupted = false;
  limit: 'lean' | 'steer' | null = null;
  tick = 0;
  peakLean = 0;
  peakSteer = 0;
  observations: Observation = { wheelAway: false, leanIntoTurn: false, pathIntoTurn: false };
  readonly history: InputEvent[] = [];
  readonly pressTrace: PressTracePoint[] = [{ time: 0, left: 0, right: 0, torque: 0 }];
  readonly path: PathPoint[] = [{ forward: 0, lateral: 0 }];
  private accumulator = 0;
  private firstWheelObserved = false;

  get input(): GripState {
    return this.inputAt(this.tick * STEP_SECONDS);
  }

  get commandedGrips(): HeldGrips {
    if (!this.running) return { left: false, right: false };
    if (this.mode === 'practice') return this.grips.held();
    const active = this.tick * STEP_SECONDS <
      (this.press.style === 'hold' ? DEMO_INPUT_TICKS * STEP_SECONDS : this.press.duration);
    return { left: active && this.side === 'left', right: active && this.side === 'right' };
  }

  private inputAt(time: number): GripState {
    if (!this.running) return applyPress(this.press, 0, 0);
    if (this.mode === 'demo') {
      const level = this.press.style === 'hold'
        ? Number(time < DEMO_INPUT_TICKS * STEP_SECONDS)
        : pulseLevel(this.press, time);
      return applyPress(this.press, this.side === 'left' ? level : 0, this.side === 'right' ? level : 0);
    }
    return this.grips.snapshot(time);
  }

  get frame(): PhysicsState {
    return this.running
      ? interpolateState(this.previous, this.state, this.accumulator / STEP_SECONDS)
      : this.state;
  }

  get completed(): boolean {
    return this.mode === 'demo' && this.tick >= DEMO_TICKS;
  }

  reset(): void {
    this.state = initialState();
    this.previous = initialState();
    this.grips.clear();
    this.running = false;
    this.mode = 'practice';
    this.interrupted = false;
    this.limit = null;
    this.tick = 0;
    this.accumulator = 0;
    this.peakLean = 0;
    this.peakSteer = 0;
    this.observations = { wheelAway: false, leanIntoTurn: false, pathIntoTurn: false };
    this.history.length = 0;
    this.pressTrace.splice(0, this.pressTrace.length, { time: 0, left: 0, right: 0, torque: 0 });
    this.firstWheelObserved = false;
    this.path.splice(0, this.path.length, { forward: 0, lateral: 0 });
  }

  startDemo(): void {
    this.reset();
    this.mode = 'demo';
    this.running = true;
  }

  startPractice(): void {
    this.reset();
    this.running = true;
  }

  pause(interrupted = false): void {
    this.running = false;
    this.interrupted = interrupted;
    this.grips.clear();
    this.accumulator = 0;
    this.previous = { ...this.state };
    const lastTrace = this.pressTrace.at(-1);
    if (lastTrace && (lastTrace.left > 0 || lastTrace.right > 0)) {
      this.pressTrace.push({ time: this.state.time, left: 0, right: 0, torque: 0 });
      if (this.pressTrace.length > 600) this.pressTrace.shift();
    }
  }

  resume(): void {
    if (this.limit) throw new Error('Reset the trial before leaving the model boundary.');
    if (this.completed) throw new Error('Choose Show me or Your turn to start another trial.');
    this.interrupted = false;
    this.running = true;
  }

  setSpeed(speed: Speed): void {
    if (this.running) throw new Error('Pause before changing speed.');
    if (!SPEED_PRESETS.includes(speed)) throw new RangeError('Unsupported example speed.');
    this.speed = speed;
    this.reset();
  }

  setSide(side: GripSide): void {
    if (this.running) throw new Error('Pause before changing the target turn.');
    this.side = side;
    this.reset();
  }

  setPress(settings: PressSettings, preserveActiveInput = false): void {
    validatePress(settings);
    if (this.running && this.mode === 'demo') throw new Error('Pause before changing the demonstration input.');
    this.press = { ...settings };
    if (!this.running) this.reset();
    else if (!preserveActiveInput) this.grips.clear();
  }

  advance(wallSeconds: number): void {
    if (!Number.isFinite(wallSeconds) || wallSeconds < 0) {
      throw new RangeError('The browser clock must provide a finite, non-negative interval.');
    }
    if (!this.running) return;
    if (wallSeconds > 0.25) {
      this.pause(true);
      return;
    }

    this.accumulator += wallSeconds * (this.slowMotion ? 0.25 : 1);
    while (this.running && this.accumulator + 1e-12 >= STEP_SECONDS) {
      this.accumulator = Math.max(0, this.accumulator - STEP_SECONDS);
      const input = this.inputAt((this.tick + 0.5) * STEP_SECONDS);
      const last = this.history.at(-1);
      if (!last || last.left !== input.left || last.right !== input.right || last.torque !== input.torque) {
        this.history.push({ tick: this.tick, left: input.left, right: input.right, torque: input.torque });
        if (this.history.length > 256) this.history.shift();
      }

      this.previous = this.state;
      this.state = stepPhysics(this.state, input.torque, this.speed);
      this.tick += 1;
      this.peakLean = Math.max(this.peakLean, Math.abs(this.state.lean));
      this.peakSteer = Math.max(this.peakSteer, Math.abs(this.state.steer));
      const target = this.side === 'right' ? 1 : -1;
      if (!this.firstWheelObserved && Math.abs(this.state.steer) > 0.00001) {
        this.observations.wheelAway = this.state.steer * target < 0;
        this.firstWheelObserved = true;
      }
      this.observations.leanIntoTurn ||= this.state.lean * target > 0.0005;
      this.observations.pathIntoTurn ||= this.state.heading * target > 0.0001;

      if (this.tick % 12 === 0) {
        this.path.push({ forward: this.state.forward, lateral: this.state.lateral });
        if (this.path.length > 256) this.path.shift();
      }
      if (this.tick % 2 === 0) {
        this.pressTrace.push({ time: this.state.time, left: input.leftLevel, right: input.rightLevel, torque: input.torque });
        if (this.pressTrace.length > 600) this.pressTrace.shift();
      }
      this.limit = modelLimit(this.state);
      if (this.limit || (this.mode === 'demo' && this.tick >= DEMO_TICKS)) {
        this.pause();
      }
    }
  }
}
