import { describe, expect, it } from 'vitest';
import { pulseReference } from './fixtures/pulse-reference';
import { initialState, LEAN_LIMIT, modelLimit, STEP_SECONDS, stepPhysics } from './physics';

describe('source-based lean and steering dynamics', () => {
  for (const reference of pulseReference) {
    it(`matches independent matrix-exponential angles at ${reference.speed} m/s`, () => {
      let state = initialState();
      for (let tick = 0; tick < 1200; tick++) {
        state = stepPhysics(state, tick < 240 ? -2 : 0, reference.speed);
        const expected = reference.samples.find(sample => Math.round(sample.time / STEP_SECONDS) === tick + 1);
        if (expected) {
          expect(Math.abs(state.lean - expected.lean)).toBeLessThan(0.0001);
          expect(Math.abs(state.steer - expected.steer)).toBeLessThan(0.0001);
        }
        expect(modelLimit(state)).toBeNull();
      }
    });

    it(`converges over every matched tick at ${reference.speed} m/s`, () => {
      let coarse = initialState();
      let fine = initialState();
      let largestDifference = 0;
      for (let tick = 0; tick < 1200; tick++) {
        const torque = tick < 240 ? -2 : 0;
        coarse = stepPhysics(coarse, torque, reference.speed);
        fine = stepPhysics(fine, torque, reference.speed, STEP_SECONDS / 2);
        fine = stepPhysics(fine, torque, reference.speed, STEP_SECONDS / 2);
        largestDifference = Math.max(largestDifference, Math.abs(coarse.lean - fine.lean), Math.abs(coarse.steer - fine.steer));
      }
      expect(largestDifference).toBeLessThan(0.0001);
    });
  }

  it('starts with opposite wheel direction, then develops the intended lean', () => {
    let state = initialState();
    for (let tick = 0; tick < 24; tick++) state = stepPhysics(state, -2, 10);
    expect(state.steer).toBeLessThan(0);
    expect(state.lean).toBeGreaterThan(0);
  });

  it('mirrors all lateral and angular responses', () => {
    let right = initialState();
    let left = initialState();
    for (let tick = 0; tick < 1200; tick++) {
      right = stepPhysics(right, tick < 240 ? -2 : 0, 10);
      left = stepPhysics(left, tick < 240 ? 2 : 0, 10);
    }
    expect(right.lean).toBeCloseTo(-left.lean, 12);
    expect(right.steer).toBeCloseTo(-left.steer, 12);
    expect(right.heading).toBeCloseTo(-left.heading, 12);
    expect(right.lateral).toBeCloseTo(-left.lateral, 12);
    expect(right.forward).toBeCloseTo(left.forward, 12);
  });

  it('travels straight from an upright state with zero torque', () => {
    let state = initialState();
    for (let tick = 0; tick < 1200; tick++) state = stepPhysics(state, 0, 10);
    expect(state.lean).toBe(0);
    expect(state.steer).toBe(0);
    expect(state.heading).toBe(0);
    expect(state.lateral).toBe(0);
    expect(state.forward).toBeCloseTo(50, 9);
  });

  it('reports a model boundary without modifying the physical angle', () => {
    const state = { ...initialState(), lean: LEAN_LIMIT + 0.001 };
    expect(modelLimit(state)).toBe('lean');
    expect(state.lean).toBe(LEAN_LIMIT + 0.001);
  });

  it('rejects invalid numerical states and unsupported standstill', () => {
    expect(() => stepPhysics(initialState(), 0, 0)).toThrow(RangeError);
    expect(() => stepPhysics(initialState(), Number.NaN, 10)).toThrow(RangeError);
    expect(() => stepPhysics({ ...initialState(), lean: Number.NaN }, 0, 10)).toThrow(RangeError);
  });
});
