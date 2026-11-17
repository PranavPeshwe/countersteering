import { describe, expect, it } from 'vitest';
import { initialState } from './physics';
import { coach } from './lesson';
import { Simulation } from './simulation';

function demoAtFrames(framesPerSecond: number): Simulation {
  const simulation = new Simulation();
  simulation.startDemo();
  for (let frame = 0; frame < framesPerSecond * 5; frame++) simulation.advance(1 / framesPerSecond);
  return simulation;
}

describe('deterministic trials and learner lifecycle', () => {
  it('runs the same completed demo at 30, 60, and 120 render frames per second', () => {
    const slow = demoAtFrames(30);
    const normal = demoAtFrames(60);
    const fast = demoAtFrames(120);
    expect(slow.state).toEqual(normal.state);
    expect(normal.state).toEqual(fast.state);
    expect(normal.tick).toBe(1200);
    expect(normal.running).toBe(false);
    expect(normal.limit).toBeNull();
    expect(normal.observations).toEqual({ wheelAway: true, leanIntoTurn: true, pathIntoTurn: true });
    expect(normal.history).toEqual([
      { tick: 0, left: false, right: true, torque: -2 },
      { tick: 240, left: false, right: false, torque: 0 },
    ]);
  });

  it('clears held input on pause without erasing lean or motion', () => {
    const simulation = new Simulation();
    simulation.startPractice();
    simulation.grips.press('right', 'keyboard:D');
    for (let frame = 0; frame < 60; frame++) simulation.advance(1 / 60);
    const state = { ...simulation.state };
    simulation.pause();
    expect(simulation.state).toEqual(state);
    expect(simulation.input.torque).toBe(0);
    simulation.resume();
    expect(simulation.input.torque).toBe(0);
    simulation.advance(1 / 60);
    expect(simulation.state.lean).not.toBe(0);
  });

  it('resets full trial state and clears stale controls and history', () => {
    const simulation = demoAtFrames(60);
    simulation.grips.press('left', 'pointer:5');
    simulation.reset();
    expect(simulation.state).toEqual(initialState());
    expect(simulation.previous).toEqual(initialState());
    expect(simulation.observations).toEqual({ wheelAway: false, leanIntoTurn: false, pathIntoTurn: false });
    expect(simulation.path).toEqual([{ forward: 0, lateral: 0 }]);
    expect(simulation.history).toEqual([]);
    expect(simulation.grips.snapshot().torque).toBe(0);
    expect(simulation.tick).toBe(0);
  });

  it('does not catch up a hidden-tab interruption', () => {
    const simulation = new Simulation();
    simulation.startPractice();
    simulation.grips.press('right', 'keyboard:D');
    simulation.advance(2);
    expect(simulation.running).toBe(false);
    expect(simulation.interrupted).toBe(true);
    expect(simulation.state.time).toBe(0);
    expect(simulation.grips.snapshot().torque).toBe(0);
  });

  it('slows simulation time without changing torque or physics step', () => {
    const simulation = new Simulation();
    simulation.slowMotion = true;
    simulation.startDemo();
    for (let frame = 0; frame < 60; frame++) simulation.advance(1 / 60);
    expect(simulation.tick).toBe(60);
    expect(simulation.state.time).toBeCloseTo(0.25, 10);
    expect(simulation.input.torque).toBe(-2);
  });

  it('requires pause and reset for speed changes', () => {
    const simulation = new Simulation();
    simulation.startDemo();
    expect(() => simulation.setSpeed(20)).toThrow('Pause');
    simulation.pause();
    simulation.setSpeed(20);
    expect(simulation.speed).toBe(20);
    expect(simulation.state).toEqual(initialState());
  });

  it('pauses at a model limit, explains it, and requires reset', () => {
    const simulation = new Simulation();
    simulation.setSpeed(20);
    simulation.startPractice();
    simulation.grips.press('right', 'keyboard:D');
    for (let frame = 0; frame < 1200 && simulation.running; frame++) simulation.advance(1 / 60);
    expect(simulation.limit).toBe('lean');
    expect(simulation.running).toBe(false);
    expect(simulation.input.torque).toBe(0);
    expect(coach(simulation).text).toContain('not a predicted fall');
    expect(() => simulation.resume()).toThrow('Reset');
  });
});
