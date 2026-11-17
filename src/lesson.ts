import { degrees } from './physics';
import type { Simulation } from './simulation';
import { PRESS_STYLES, steeringOnlyDirection } from './press';

export function direction(angle: number, threshold = 0.00001): 'left' | 'right' | 'straight' {
  if (Math.abs(angle) < threshold) return 'straight';
  return angle > 0 ? 'right' : 'left';
}

export function angleLabel(angle: number): string {
  const side = direction(angle);
  if (side === 'straight') return 'Straight';
  return `${Math.abs(degrees(angle)).toFixed(2)} degrees ${side}`;
}

export function coach(simulation: Simulation): { title: string; text: string } {
  const side = simulation.side;
  const opposite = side === 'right' ? 'left' : 'right';
  const style = PRESS_STYLES.find(item => item.id === simulation.press.style);
  if (!style) throw new Error('The selected press style is unavailable.');
  if (simulation.limit) {
    return {
      title: 'This trial exceeded the simple model\'s range.',
      text: `The ${simulation.limit === 'lean' ? 'lean' : 'wheel angle'} crossed its model limit. This is not a predicted fall. Reset, then try a shorter press.`,
    };
  }
  if (simulation.interrupted) {
    return {
      title: 'Paused after a browser interruption.',
      text: 'Held inputs were cleared. Resume only when you are ready to watch the response.',
    };
  }
  if (simulation.completed) {
    if (steeringOnlyDirection(simulation.press.direction)) {
      return {
        title: 'Force direction matters, and this model has limits.',
        text: 'This side/top input projects no steering torque in the straight-bar, vertical-axis example. Direct body loading and real handlebar geometry are not predicted.',
      };
    }
    if (simulation.press.direction === 'diagonal') {
      return {
        title: 'Only the forward component steers this model.',
        text: 'The diagonal force carries a downward component too. That body-loading effect is not calculated. Read the pressure trace, actual steering torque, and bike response separately.',
      };
    }
    if (simulation.press.direction === 'backward') {
      return {
        title: 'A backward pull reverses the steering input.',
        text: 'The same grip can produce an opposite response when force direction changes. Read the actual wheel, lean, and path cues rather than assuming grip side alone decides the turn.',
      };
    }
    const observed = simulation.observations;
    if (observed.wheelAway && observed.leanIntoTurn && observed.pathIntoTurn) {
      return {
        title: 'The input and the turn are not the same thing.',
        text: `The wheel first pointed ${opposite}, the bike leaned ${side}, and the path developed ${side}. Repeat this same input at the other speed, or try a different press.`,
      };
    }
    return {
      title: 'Look at the three separate cues.',
      text: 'The indicators record actual wheel, lean, and path responses. An unfinished cue is not a successful turn. Reset to repeat the trial.',
    };
  }
  if (!simulation.running) {
    return {
      title: simulation.tick === 0 ? 'Choose a turn. Watch once. Then try it.' : 'Paused. Your previous motion is preserved.',
      text: simulation.tick === 0
        ? `Choose direction, press style, and strength. For a ${side} lean, use a forward press on the ${side} grip. Show me replays the selected input.`
        : 'Resume with no held pressure, or Reset for a straight starting position.',
    };
  }
  const input = simulation.input;
  if (steeringOnlyDirection(simulation.press.direction)) {
    return {
      title: 'Side/top loading is only partly represented.',
      text: 'The force arrow and pressure trace show your input. This simplified geometry gives no steering torque from that direction. Real body-loading effects remain outside this model.',
    };
  }
  if (input.left && input.right) {
    return {
      title: Math.abs(input.torque) < 0.000001 ? 'Equal opposite inputs cancel steering torque.' : 'Two pulses overlap with different strengths.',
      text: 'The net steering torque combines both inputs. The bike can still have lean and motion after net input becomes zero.',
    };
  }
  if (simulation.press.direction === 'diagonal') {
    return {
      title: 'Only the forward component steers this model.',
      text: 'The downward component is visible but its body-loading effect is not calculated. Compare the pressure, steering torque, and actual bike response.',
    };
  }
  if (simulation.press.direction === 'backward' && (input.left || input.right)) {
    return {
      title: 'A backward pull reverses the input.',
      text: 'The grip side alone does not decide the lean. Force direction matters. Watch the actual wheel and lean while existing motion continues.',
    };
  }
  if (simulation.mode === 'demo' && (input.left || input.right)) {
    return {
      title: `Demo input: ${style.label.toLowerCase()} on the ${side} grip.`,
      text: `Strength ${simulation.press.strength}%. The selected direction and timed input produce the steering torque. Watch the actual response; no lean is assigned.`,
    };
  }
  if (simulation.mode === 'demo') {
    return {
      title: 'The demonstration input finished.',
      text: 'The bike still responds to its existing motion. Watch the lean indicator and the path rather than expecting an instant wheel reset.',
    };
  }
  const pressedSide = input.left ? 'left' : input.right ? 'right' : null;
  if (pressedSide && pressedSide !== side) {
    return {
      title: `You pressed the ${pressedSide} grip.`,
      text: `That input tends to initiate a ${pressedSide} lean. Existing motion also matters. Watch the actual lean rather than assuming a scripted crash.`,
    };
  }
  if (pressedSide) {
    return {
      title: `${style.label}: watch input strength and the response.`,
      text: simulation.press.style === 'hold'
        ? 'A hold continues until release. You can vary strength while holding. Watch the actual wheel and lean indicators.'
        : 'Keep the grip held for repeated pulses. Release stops the input immediately. The bike still has existing motion. These are virtual inputs, not riding prescriptions.',
    };
  }
  return {
    title: 'No grip pressure. The bike still has motion.',
    text: 'Watch the actual lean indicator. In this simulator, a brief opposite-grip input can reduce the lean. Watch the response.',
  };
}
