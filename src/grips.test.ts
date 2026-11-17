import { describe, expect, it } from 'vitest';
import { Grips } from './grips';

describe('virtual grip input', () => {
  it('maps the right forward press to initial leftward steering torque', () => {
    const grips = new Grips();
    grips.press('right', 'keyboard:D');
    expect(grips.snapshot()).toMatchObject({ left: false, right: true, torque: -2 });
  });

  it('unions input sources without doubling torque or losing another held device', () => {
    const grips = new Grips();
    grips.press('right', 'keyboard:D');
    grips.press('right', 'pointer:1');
    grips.press('right', 'keyboard:D');
    expect(grips.snapshot().torque).toBe(-2);
    grips.release('pointer:1');
    expect(grips.snapshot().right).toBe(true);
    grips.release('keyboard:D');
    expect(grips.snapshot().torque).toBe(0);
  });

  it('cancels opposite inputs while preserving their visible pressed states', () => {
    const grips = new Grips();
    grips.press('left', 'pointer:1');
    grips.press('right', 'pointer:2');
    expect(grips.snapshot()).toMatchObject({ left: true, right: true, torque: 0 });
    grips.clear();
    expect(grips.snapshot()).toMatchObject({ left: false, right: false, torque: 0 });
  });
});
