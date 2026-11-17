import { describe, expect, it } from 'vitest';
import { Grips } from './grips';
import { coach } from './lesson';
import {
  applyPress,
  DEFAULT_PRESS,
  forceDirection,
  PRESS_STYLES,
  projectedTorque,
  pulseLevel,
  styleSettings,
  validatePress,
} from './press';
import { Simulation } from './simulation';
import { initialState, STEP_SECONDS, stepPhysics } from './physics';

describe('direction, strength, and abruptness', () => {
  it('projects forward, backward, and diagonal forces consistently', () => {
    expect(applyPress(DEFAULT_PRESS, 0, 1).torque).toBe(-2);
    expect(applyPress({ ...DEFAULT_PRESS, direction: 'backward' }, 0, 1).torque).toBe(2);
    expect(applyPress({ ...DEFAULT_PRESS, direction: 'diagonal' }, 0, 1).torque).toBeCloseTo(-Math.SQRT2, 12);
    expect(projectedTorque('right', forceDirection('forward', 'right'))).toBeCloseTo(-0.3, 12);
  });

  it('shows side/top forces without inventing unmodeled body effects', () => {
    for (const direction of ['side-in', 'side-out', 'top'] as const) {
      const input = applyPress({ ...DEFAULT_PRESS, direction }, 0, 1);
      expect(input.rightNewtons).toBeGreaterThan(0);
      expect(input.right).toBe(true);
      expect(input.torque).toBe(0);
      const simulation = new Simulation();
      simulation.setPress({ ...DEFAULT_PRESS, direction });
      simulation.startDemo();
      for (let frame = 0; frame < 600; frame++) simulation.advance(1 / 120);
      expect(simulation.state.lean).toBe(0);
      expect(simulation.state.steer).toBe(0);
      expect(simulation.observations.wheelAway).toBe(false);
      expect(coach(simulation).text).toContain('not predicted');
    }
  });

  it('supports a continuum of virtual strength', () => {
    for (const strength of [0, 5, 25, 50, 80, 100]) {
      expect(applyPress({ ...DEFAULT_PRESS, strength }, 0, 1).torque).toBeCloseTo(-8 * strength / 100, 12);
    }
  });

  it('has distinct gentle and abrupt onset with finite bounded pulses', () => {
    const gentle = styleSettings('gentle', 'forward');
    const sharp = styleSettings('jerk', 'forward');
    expect(pulseLevel(sharp, 0.008)).toBe(1);
    expect(pulseLevel(gentle, 0.008)).toBeLessThan(0.05);
    expect(pulseLevel(sharp, -0.01)).toBe(0);
    expect(pulseLevel(sharp, sharp.duration)).toBe(0);
    expect(() => pulseLevel(sharp, Number.NaN)).toThrow(RangeError);
  });

  it('repeats pulses while held, unions devices, and stops on the last release', () => {
    let time = 0;
    const settings = styleSettings('quick', 'forward');
    const grips = new Grips(() => settings, () => time);
    grips.press('right', 'keyboard:D');
    time = 0.05;
    expect(grips.snapshot().torque).toBe(-2);
    grips.press('right', 'pointer:1');
    expect(grips.snapshot().torque).toBe(-2);
    grips.release('keyboard:D');
    time = 0.25;
    expect(grips.snapshot().torque).toBe(-2);
    time = 0.45;
    expect(grips.snapshot().torque).toBeCloseTo(-2, 12);
    expect(grips.held()).toEqual({ left: false, right: true });
    grips.release('pointer:1');
    expect(grips.snapshot().torque).toBe(0);
    expect(grips.held()).toEqual({ left: false, right: false });
    grips.press('right', 'keyboard:D');
    time = 0.5;
    expect(grips.snapshot().torque).toBeCloseTo(-2, 12);
    grips.clear();
    expect(grips.snapshot().torque).toBe(0);
  });

  it('keeps the command active through a zero-force pulse boundary', () => {
    let time = 0;
    const settings = styleSettings('quick', 'forward');
    const grips = new Grips(() => settings, () => time);
    grips.press('right', 'pointer:1');
    time = settings.duration;
    expect(grips.snapshot().torque).toBe(0);
    expect(grips.held().right).toBe(true);
    time += 0.05;
    expect(grips.snapshot().torque).toBeCloseTo(-2, 12);
  });

  it('repeats every pulse preset and preserves motion after release', () => {
    for (const preset of PRESS_STYLES.filter(item => item.id !== 'hold')) {
      const simulation = new Simulation();
      simulation.setPress(styleSettings(preset.id, 'forward'));
      simulation.startPractice();
      simulation.grips.press('right', 'keyboard:D');
      const requiredTicks = Math.ceil(preset.duration * 2.5 / STEP_SECONDS);
      for (let tick = 0; tick < requiredTicks && simulation.running; tick++) simulation.advance(STEP_SECONDS);
      expect(simulation.state.lean).toBeGreaterThan(0);
      expect(simulation.commandedGrips.right).toBe(true);
      const before = { ...simulation.state };
      simulation.grips.release('keyboard:D');
      expect(simulation.input.torque).toBe(0);
      expect(simulation.commandedGrips.right).toBe(false);
      expect(simulation.state).toEqual(before);
    }
  });

  it('changes strength during a hold without resetting physical motion', () => {
    const simulation = new Simulation();
    simulation.startPractice();
    simulation.grips.press('right', 'keyboard:D');
    for (let frame = 0; frame < 30; frame++) simulation.advance(1 / 60);
    const state = { ...simulation.state };
    simulation.setPress({ ...simulation.press, strength: 75 }, true);
    expect(simulation.state).toEqual(state);
    expect(simulation.input.torque).toBe(-6);
  });

  it('keeps every default press preset within the teaching bounds at both speeds', () => {
    for (const style of PRESS_STYLES) {
      for (const speed of [10, 20] as const) {
        const simulation = new Simulation();
        simulation.setSpeed(speed);
        simulation.setPress(styleSettings(style.id, 'forward'));
        simulation.startDemo();
        for (let frame = 0; frame < 600; frame++) simulation.advance(1 / 120);
        expect(simulation.completed, `${style.label}, ${speed} m/s`).toBe(true);
        expect(simulation.limit).toBeNull();
        expect(simulation.observations).toEqual({ wheelAway: true, leanIntoTurn: true, pathIntoTurn: true });
      }
    }
  });

  it('keeps all preset demonstrations independent of render frame rate', () => {
    for (const style of PRESS_STYLES) {
      const results = [30, 60, 120].map(fps => {
        const simulation = new Simulation();
        simulation.setPress(styleSettings(style.id, 'forward'));
        simulation.startDemo();
        for (let frame = 0; frame < fps * 5; frame++) simulation.advance(1 / fps);
        return simulation.state;
      });
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
    }
  });

  it('converges through every timed waveform at both example speeds', () => {
    for (const style of PRESS_STYLES.filter(item => item.id !== 'hold')) {
      for (const speed of [10, 20]) {
        const settings = styleSettings(style.id, 'forward');
        let coarse = initialState();
        let fine = initialState();
        for (let tick = 0; tick < 1200; tick++) {
          const coarseTorque = applyPress(settings, 0, pulseLevel(settings, (tick + 0.5) * STEP_SECONDS)).torque;
          coarse = stepPhysics(coarse, coarseTorque, speed);
          for (let half = 0; half < 2; half++) {
            const fineTime = (tick + (half + 0.5) / 2) * STEP_SECONDS;
            const fineTorque = applyPress(settings, 0, pulseLevel(settings, fineTime)).torque;
            fine = stepPhysics(fine, fineTorque, speed, STEP_SECONDS / 2);
          }
          expect(Math.abs(coarse.lean - fine.lean)).toBeLessThan(0.0001);
          expect(Math.abs(coarse.steer - fine.steer)).toBeLessThan(0.0001);
        }
      }
    }
  });

  it('records the first wheel response rather than a later reversal', () => {
    const simulation = new Simulation();
    simulation.setPress({ ...DEFAULT_PRESS, direction: 'backward' });
    simulation.startDemo();
    for (let frame = 0; frame < 600; frame++) simulation.advance(1 / 120);
    expect(simulation.observations.wheelAway).toBe(false);
    expect(simulation.state.lean).toBeLessThan(0);
    expect(coach(simulation).title).toContain('reverses');
  });

  it('explains every supported direction during and after a demonstration', () => {
    for (const direction of ['forward', 'backward', 'side-in', 'side-out', 'top', 'diagonal'] as const) {
      const simulation = new Simulation();
      simulation.setPress({ ...DEFAULT_PRESS, direction });
      simulation.startDemo();
      simulation.advance(0.1);
      expect(() => coach(simulation)).not.toThrow();
      for (let frame = 0; frame < 600 && simulation.running; frame++) simulation.advance(1 / 120);
      expect(() => coach(simulation)).not.toThrow();
    }
  });

  it('pauses an oversized custom pulse instead of simulating a fake fall', () => {
    const simulation = new Simulation();
    simulation.setPress({ ...styleSettings('strong', 'forward'), strength: 100, duration: 1.5 });
    simulation.startDemo();
    for (let frame = 0; frame < 600 && simulation.running; frame++) simulation.advance(1 / 120);
    expect(simulation.limit).toBe('lean');
    expect(simulation.input.torque).toBe(0);
  });

  it('rejects invalid strength and duration rather than using a hidden default', () => {
    expect(() => validatePress({ ...DEFAULT_PRESS, strength: 101 })).toThrow(RangeError);
    expect(() => validatePress({ ...DEFAULT_PRESS, duration: 0 })).toThrow(RangeError);
  });
});
