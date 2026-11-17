export const STEP_SECONDS = 1 / 240;
export const TORQUE_NM = 2;
export const SPEED_PRESETS = [10, 20] as const;
export const LEAN_LIMIT = (10 * Math.PI) / 180;
export const STEER_LIMIT = (5 * Math.PI) / 180;

export const PROFILE = {
  mass: 300,
  gravity: 9.81,
  centerHeight: 0.6,
  wheelbase: 1.54,
  centerFromRear: 0.77,
  trail: 0.117,
  wheelSpinInertia: 0.77,
  steeringInertia: 0.57,
  wheelsRollInertia: 4,
  bodyRollInertia: 118,
  steeringDamping: 3,
  wheelRadius: 0.29,
} as const;

export interface PhysicsState {
  lean: number;
  leanRate: number;
  steer: number;
  steerRate: number;
  heading: number;
  forward: number;
  lateral: number;
  time: number;
}

export function initialState(): PhysicsState {
  return {
    lean: 0,
    leanRate: 0,
    steer: 0,
    steerRate: 0,
    heading: 0,
    forward: 0,
    lateral: 0,
    time: 0,
  };
}

export function degrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

function derivative(state: PhysicsState, torque: number, speed: number): PhysicsState {
  const p = PROFILE;
  const omega = speed / p.wheelRadius;
  const rollInertia = p.bodyRollInertia + p.wheelsRollInertia;

  // Fajans a = lean, s = -steer and Ns = -torque in the app's right-positive convention.
  const leanAcceleration =
    (p.centerHeight * p.mass * p.gravity * state.lean -
      ((p.centerHeight * p.mass * speed ** 2 + 2 * speed * omega * p.wheelSpinInertia) /
        p.wheelbase) *
        state.steer -
      (omega * p.wheelSpinInertia +
        (p.centerHeight * p.centerFromRear * p.mass * speed) / p.wheelbase) *
        state.steerRate) /
    rollInertia;

  const steerAcceleration =
    (torque -
      p.steeringDamping * state.steerRate +
      omega * p.wheelSpinInertia * state.leanRate +
      ((p.mass * p.gravity * p.centerFromRear * p.trail) / p.wheelbase) * state.lean -
      ((p.mass * p.centerFromRear * speed ** 2 * p.trail) / p.wheelbase ** 2) *
        state.steer) /
    p.steeringInertia;

  return {
    lean: state.leanRate,
    leanRate: leanAcceleration,
    steer: state.steerRate,
    steerRate: steerAcceleration,
    heading: (speed * state.steer) / p.wheelbase,
    forward: speed * Math.cos(state.heading),
    lateral: speed * Math.sin(state.heading),
    time: 1,
  };
}

function shifted(state: PhysicsState, rate: PhysicsState, seconds: number): PhysicsState {
  return {
    lean: state.lean + rate.lean * seconds,
    leanRate: state.leanRate + rate.leanRate * seconds,
    steer: state.steer + rate.steer * seconds,
    steerRate: state.steerRate + rate.steerRate * seconds,
    heading: state.heading + rate.heading * seconds,
    forward: state.forward + rate.forward * seconds,
    lateral: state.lateral + rate.lateral * seconds,
    time: state.time + rate.time * seconds,
  };
}

export function stepPhysics(
  state: PhysicsState,
  torque: number,
  speed: number,
  seconds = STEP_SECONDS,
): PhysicsState {
  if (
    !Object.values(state).every(Number.isFinite) ||
    !Number.isFinite(torque) ||
    !Number.isFinite(speed) ||
    speed <= 0 ||
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    throw new RangeError('Physics requires a finite state, positive speed and timestep, and finite torque.');
  }

  const k1 = derivative(state, torque, speed);
  const k2 = derivative(shifted(state, k1, seconds / 2), torque, speed);
  const k3 = derivative(shifted(state, k2, seconds / 2), torque, speed);
  const k4 = derivative(shifted(state, k3, seconds), torque, speed);
  const rate: PhysicsState = {
    lean: (k1.lean + 2 * k2.lean + 2 * k3.lean + k4.lean) / 6,
    leanRate: (k1.leanRate + 2 * k2.leanRate + 2 * k3.leanRate + k4.leanRate) / 6,
    steer: (k1.steer + 2 * k2.steer + 2 * k3.steer + k4.steer) / 6,
    steerRate: (k1.steerRate + 2 * k2.steerRate + 2 * k3.steerRate + k4.steerRate) / 6,
    heading: (k1.heading + 2 * k2.heading + 2 * k3.heading + k4.heading) / 6,
    forward: (k1.forward + 2 * k2.forward + 2 * k3.forward + k4.forward) / 6,
    lateral: (k1.lateral + 2 * k2.lateral + 2 * k3.lateral + k4.lateral) / 6,
    time: 1,
  };
  const result = shifted(state, rate, seconds);
  if (!Object.values(result).every(Number.isFinite)) {
    throw new RangeError('Physics produced a non-finite state. The trial must stop.');
  }
  return result;
}

export function modelLimit(state: PhysicsState): 'lean' | 'steer' | null {
  if (Math.abs(state.lean) > LEAN_LIMIT) return 'lean';
  if (Math.abs(state.steer) > STEER_LIMIT) return 'steer';
  return null;
}

export function interpolateState(
  previous: PhysicsState,
  current: PhysicsState,
  fraction: number,
): PhysicsState {
  const alpha = Math.min(1, Math.max(0, fraction));
  return {
    lean: previous.lean + (current.lean - previous.lean) * alpha,
    leanRate: previous.leanRate + (current.leanRate - previous.leanRate) * alpha,
    steer: previous.steer + (current.steer - previous.steer) * alpha,
    steerRate: previous.steerRate + (current.steerRate - previous.steerRate) * alpha,
    heading: previous.heading + (current.heading - previous.heading) * alpha,
    forward: previous.forward + (current.forward - previous.forward) * alpha,
    lateral: previous.lateral + (current.lateral - previous.lateral) * alpha,
    time: previous.time + (current.time - previous.time) * alpha,
  };
}
