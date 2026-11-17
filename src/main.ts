import './style.css';
import { createRiderScene } from './scene';
import { Simulation } from './simulation';
import { angleLabel, coach, direction } from './lesson';
import { degrees } from './physics';
import { buildIndex } from './navigation';
import type { GripSide } from './grips';
import type { RiderScene } from './scene-contract';
import type { Speed } from './simulation';
import { parseDirection, PRESS_STYLES, steeringOnlyDirection, styleSettings } from './press';

function node<T extends HTMLElement>(id: string, type: { new(): T }): T {
  const result = document.getElementById(id);
  if (!(result instanceof type)) throw new Error(`Required UI element is missing: ${id}`);
  return result;
}

const simulation = new Simulation();
const shell = node('simulation-shell', HTMLDivElement);
const canvas = node('rider-canvas', HTMLCanvasElement);
const leftGrip = node('grip-left', HTMLButtonElement);
const rightGrip = node('grip-right', HTMLButtonElement);
const showDemo = node('show-demo', HTMLButtonElement);
const yourTurn = node('start-practice', HTMLButtonElement);
const pause = node('pause-trial', HTMLButtonElement);
const reset = node('reset-trial', HTMLButtonElement);
const speedPreset = node('speed-preset', HTMLSelectElement);
const turnSide = node('turn-side', HTMLSelectElement);
const comfort = node('comfort-camera', HTMLInputElement);
const slow = node('slow-motion', HTMLInputElement);
const pushDirection = node('press-direction', HTMLSelectElement);
const strength = node('press-strength', HTMLInputElement);
const pulseDuration = node('press-duration', HTMLInputElement);
const pulseAttack = node('press-attack', HTMLInputElement);
const styleButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('button[data-press-style]'));
const renderError = node('render-error', HTMLDivElement);
const wheel = node('wheel-value', HTMLOutputElement);
const lean = node('lean-value', HTMLOutputElement);
const heading = node('heading-value', HTMLOutputElement);
const coachTitle = node('coach-title', HTMLElement);
const coachText = node('coach-text', HTMLParagraphElement);
const demoProgress = node('demo-progress', HTMLProgressElement);
const keyboardSources = new Map<string, string>();
let fatal = false;
let scene: RiderScene | null = null;

buildIndex(node('section-index', HTMLElement), node('main-content', HTMLElement));

function fail(error: unknown): void {
  console.error('The simulator stopped:', error);
  simulation.pause();
  keyboardSources.clear();
  fatal = true;
  document.documentElement.dataset.sceneReady = 'false';
  shell.dataset.running = 'false';
  shell.dataset.torque = '0';
  shell.dataset.forceLeft = '0';
  shell.dataset.forceRight = '0';
  leftGrip.setAttribute('aria-pressed', 'false');
  rightGrip.setAttribute('aria-pressed', 'false');
  leftGrip.dataset.inputActive = 'false';
  rightGrip.dataset.inputActive = 'false';
  node('mode-chip', HTMLDivElement).textContent = 'Simulator stopped';
  node('ride-status', HTMLElement).textContent = 'Stopped after error';
  node('pressure-label', HTMLElement).textContent = 'Input cleared - simulator stopped';
  node('torque-value', HTMLElement).textContent = '0.00 Nm';
  node('force-value', HTMLElement).textContent = '0.00 / 0.00 N';
  renderError.hidden = false;
  renderError.textContent = `The simulator could not run. ${error instanceof Error ? error.message : String(error)} Reload after correcting the problem. A modern browser with WebGL 2 is required.`;
  for (const control of [leftGrip, rightGrip, showDemo, yourTurn, pause, reset]) control.disabled = true;
}

function act(action: () => void): void {
  if (fatal) return;
  try {
    action();
    updateUI();
  } catch (error) {
    fail(error);
  }
}

function clearKeyboard(): void {
  keyboardSources.clear();
}

function focusRide(): void {
  const target = innerWidth >= 1050 && innerHeight >= 950
    ? node('press-lab', HTMLHeadingElement)
    : shell;
  target.scrollIntoView({ behavior: 'auto', block: 'start' });
}

showDemo.addEventListener('click', () => act(() => {
  clearKeyboard();
  simulation.startDemo();
  focusRide();
}));
yourTurn.addEventListener('click', () => act(() => {
  clearKeyboard();
  simulation.startPractice();
  focusRide();
}));
pause.addEventListener('click', () => act(() => {
  clearKeyboard();
  if (simulation.running) simulation.pause();
  else simulation.resume();
}));
reset.addEventListener('click', () => act(() => {
  clearKeyboard();
  simulation.reset();
}));
speedPreset.addEventListener('change', () => act(() => {
  const value = speedPreset.value;
  const speed: Speed = value === '10' ? 10 : value === '20' ? 20 : (() => { throw new Error('Unsupported speed preset.'); })();
  clearKeyboard();
  simulation.setSpeed(speed);
}));
turnSide.addEventListener('change', () => act(() => {
  if (turnSide.value !== 'left' && turnSide.value !== 'right') throw new Error('Unsupported target turn.');
  clearKeyboard();
  simulation.setSide(turnSide.value);
}));
slow.addEventListener('change', () => { simulation.slowMotion = slow.checked; });

function syncPressControls(): void {
  const settings = simulation.press;
  pushDirection.value = settings.direction;
  strength.value = String(settings.strength);
  pulseDuration.value = String(settings.duration);
  pulseAttack.max = String(Math.min(0.5, settings.duration / 2));
  pulseAttack.value = String(settings.attack);
}

for (const button of styleButtons) {
  const preset = PRESS_STYLES.find(style => style.id === button.dataset.pressStyle);
  if (!preset) throw new Error('A press preset button has no matching model.');
  button.addEventListener('click', () => act(() => {
    clearKeyboard();
    simulation.setPress(styleSettings(preset.id, simulation.press.direction));
    syncPressControls();
  }));
  button.addEventListener('keydown', event => {
    if (event.code !== 'ArrowLeft' && event.code !== 'ArrowRight') return;
    event.preventDefault();
    const index = styleButtons.indexOf(button);
    const target = styleButtons[(index + (event.code === 'ArrowRight' ? 1 : -1) + styleButtons.length) % styleButtons.length];
    target.click();
    target.focus();
  });
}
pushDirection.addEventListener('change', () => act(() => {
  clearKeyboard();
  simulation.setPress({ ...simulation.press, direction: parseDirection(pushDirection.value) });
}));
strength.addEventListener('input', () => act(() => {
  simulation.setPress({ ...simulation.press, strength: Number(strength.value) }, true);
}));
pulseDuration.addEventListener('input', () => act(() => {
  const duration = Number(pulseDuration.value);
  clearKeyboard();
  simulation.setPress({
    ...simulation.press,
    duration,
    attack: Math.min(simulation.press.attack, duration / 2),
  });
  syncPressControls();
}));
pulseAttack.addEventListener('input', () => act(() => {
  clearKeyboard();
  simulation.setPress({ ...simulation.press, attack: Number(pulseAttack.value) });
}));

function manualInputAllowed(): boolean {
  return !fatal && simulation.running && simulation.mode === 'practice';
}

function bindGrip(button: HTMLButtonElement, side: GripSide): void {
  button.addEventListener('pointerdown', event => {
    if (!manualInputAllowed() || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    simulation.grips.press(side, `pointer:${event.pointerId}`);
    updateUI();
  });
  button.addEventListener('pointerup', event => {
    simulation.grips.release(`pointer:${event.pointerId}`);
    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
    updateUI();
  });
  button.addEventListener('pointercancel', () => {
    simulation.grips.clear();
    clearKeyboard();
    updateUI();
  });
  button.addEventListener('lostpointercapture', event => {
    simulation.grips.release(`pointer:${event.pointerId}`);
    updateUI();
  });
}
bindGrip(leftGrip, 'left');
bindGrip(rightGrip, 'right');

window.addEventListener('keydown', event => {
  if (!manualInputAllowed() || event.repeat) return;
  if (
    (event.target instanceof HTMLInputElement && !['range', 'checkbox', 'radio'].includes(event.target.type)) ||
    event.target instanceof HTMLSelectElement ||
    event.target instanceof HTMLTextAreaElement ||
    (event.target instanceof HTMLElement && event.target.isContentEditable)
  ) return;
  let side: GripSide | null = event.code === 'KeyA' ? 'left' : event.code === 'KeyD' ? 'right' : null;
  if ((event.code === 'Space' || event.code === 'Enter') && event.target === leftGrip) side = 'left';
  if ((event.code === 'Space' || event.code === 'Enter') && event.target === rightGrip) side = 'right';
  if (!side) return;
  event.preventDefault();
  const source = `keyboard:${event.code}`;
  keyboardSources.set(event.code, source);
  simulation.grips.press(side, source);
  updateUI();
});
window.addEventListener('keyup', event => {
  const source = keyboardSources.get(event.code);
  if (source) {
    simulation.grips.release(source);
    keyboardSources.delete(event.code);
    updateUI();
  }
});
window.addEventListener('blur', () => {
  simulation.pause(true);
  clearKeyboard();
  updateUI();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    simulation.pause(true);
    clearKeyboard();
    updateUI();
  }
});

function updateUI(): void {
  const state = simulation.state;
  const input = simulation.input;
  const commanded = simulation.commandedGrips;
  const hint = coach(simulation);
  const settings = simulation.press;
  const hold = settings.style === 'hold';
  const demoLocked = simulation.running && simulation.mode === 'demo';
  const manual = manualInputAllowed();
  leftGrip.disabled = !manual;
  rightGrip.disabled = !manual;
  leftGrip.setAttribute('aria-pressed', String(commanded.left));
  rightGrip.setAttribute('aria-pressed', String(commanded.right));
  leftGrip.dataset.inputActive = String(commanded.left && settings.strength > 0);
  rightGrip.dataset.inputActive = String(commanded.right && settings.strength > 0);
  speedPreset.disabled = fatal || simulation.running;
  turnSide.disabled = fatal || simulation.running;
  pushDirection.disabled = fatal || demoLocked;
  strength.disabled = fatal || demoLocked;
  pulseDuration.disabled = fatal || demoLocked || hold;
  pulseAttack.disabled = fatal || demoLocked || hold;
  for (const button of styleButtons) {
    const selected = button.dataset.pressStyle === settings.style;
    button.setAttribute('aria-checked', String(selected));
    button.tabIndex = selected ? 0 : -1;
    button.disabled = fatal || demoLocked;
  }
  const strengthWord = settings.strength <= 15 ? 'Light' : settings.strength <= 35 ? 'Normal' : settings.strength <= 65 ? 'Firm' : 'Strong';
  node('strength-value', HTMLOutputElement).textContent = `${strengthWord} / ${settings.strength}%`;
  node('duration-value', HTMLOutputElement).textContent = hold ? 'Manual hold / demo 1 s' : `${settings.duration.toFixed(2)} s`;
  node('attack-value', HTMLOutputElement).textContent = hold ? 'Immediate hold' : `${Math.round(Math.min(settings.attack, settings.duration / 2) * 1000)} ms`;
  node('press-description', HTMLParagraphElement).textContent = hold
    ? 'Hold for steady pressure. Release removes it. Strength can change during a manual hold.'
    : `Hold a grip to repeat a ${settings.duration.toFixed(2)} s pulse. Release stops the input immediately.`;
  const notice = node('direction-notice', HTMLParagraphElement);
  notice.classList.toggle('unsupported-loading', steeringOnlyDirection(settings.direction));
  notice.textContent = steeringOnlyDirection(settings.direction)
    ? 'Steering effects only: this side/top direction gives zero steering torque in the ideal straight-bar setup. Body loading and real geometry effects are not predicted.'
    : settings.direction === 'backward'
      ? 'A backward pull reverses the steering torque from this grip. Compare the actual wheel and lean response.'
      : settings.direction === 'diagonal'
        ? 'Only the forward component contributes to steering here. Downward body-loading effects are not calculated.'
        : 'Forward force acts through steering torque. Virtual strength is not measured riding effort.';
  const activeHelp = simulation.mode === 'demo' ? 'DEMO INPUT / automatic' : 'INPUT ACTIVE / release to stop';
  node('left-grip-help', HTMLElement).textContent = commanded.left ? activeHelp : 'Hold here or hold A';
  node('right-grip-help', HTMLElement).textContent = commanded.right ? activeHelp : 'Hold here or hold D';
  node('grip-help', HTMLElement).textContent = 'Blink = active input. Release stops input, not existing motion.';
  for (const arrow of document.querySelectorAll<HTMLElement>('.grip-arrow')) {
    arrow.dataset.direction = settings.direction;
    const side = arrow.closest('#grip-left') ? 'left' : 'right';
    arrow.style.transform = settings.direction === 'backward' || settings.direction === 'top' ? 'rotate(180deg)'
      : settings.direction === 'side-in' ? `rotate(${side === 'left' ? 90 : -90}deg)`
      : settings.direction === 'side-out' ? `rotate(${side === 'left' ? -90 : 90}deg)`
      : settings.direction === 'diagonal' ? 'rotate(45deg)' : 'rotate(0deg)';
  }
  pause.disabled = fatal || Boolean(simulation.limit) || simulation.completed;
  pause.textContent = simulation.running ? 'Pause' : 'Resume';
  node('mode-chip', HTMLDivElement).textContent = simulation.limit ? 'Model boundary' : simulation.mode === 'demo' ? 'Guided demo' : simulation.running ? 'Your turn' : 'Ready / paused';
  node('speed-value', HTMLElement).textContent = String(simulation.speed * 3.6);
  node('ride-status', HTMLElement).textContent = simulation.limit ? 'Model limit - not a fall' : simulation.running ? 'Moving' : 'Paused';
  node('pressure-label', HTMLElement).textContent = commanded.left && commanded.right
    ? Math.abs(input.torque) < 0.000001 ? 'Both grips / net torque zero' : 'Both grips / inputs combine'
    : commanded.left ? 'Left grip / continuous input'
      : commanded.right ? 'Right grip / continuous input' : 'No virtual pressure';
  node('camera-label', HTMLElement).textContent = comfort.checked ? 'Camera stabilized; bike lean is unchanged' : 'Camera follows the full bike lean';
  node('live-input-label', HTMLElement).textContent = `${PRESS_STYLES.find(item => item.id === settings.style)?.label ?? settings.style} / ${settings.direction} / ${settings.strength}%`;
  node('trial-label', HTMLElement).textContent = simulation.mode === 'demo'
    ? `Demo: ${hold ? '1.00' : settings.duration.toFixed(2)} s input / 5 s observation`
    : hold ? 'Practice: hold, vary strength, then release' : 'Practice: hold for repeated pulses; release to stop';
  demoProgress.value = simulation.mode === 'demo' ? Math.min(5, state.time) : 0;

  wheel.textContent = angleLabel(state.steer);
  wheel.dataset.radians = String(state.steer);
  lean.textContent = angleLabel(state.lean);
  lean.dataset.radians = String(state.lean);
  heading.textContent = angleLabel(state.heading);
  heading.dataset.radians = String(state.heading);
  node('hud-wheel', HTMLOutputElement).textContent = angleLabel(state.steer);
  node('hud-lean', HTMLOutputElement).textContent = angleLabel(state.lean);
  node('hud-heading', HTMLOutputElement).textContent = angleLabel(state.heading);
  node('wheel-diagram', HTMLDivElement).dataset.direction = direction(state.steer);
  node('wheel-direction-label', HTMLElement).textContent = direction(state.steer);
  node('lean-needle', HTMLElement).style.transform = `rotate(${degrees(state.lean)}deg)`;
  const pathDirection = direction(state.heading);
  const path = document.getElementById('path-arrow');
  if (!(path instanceof SVGPathElement)) throw new Error('The path diagram is missing.');
  path.setAttribute('d', pathDirection === 'left' ? 'M70 75Q70 30 35 10' : pathDirection === 'right' ? 'M70 75Q70 30 105 10' : 'M70 75Q70 35 70 10');

  if (coachTitle.textContent !== hint.title) coachTitle.textContent = hint.title;
  if (coachText.textContent !== hint.text) coachText.textContent = hint.text;
  node('coach', HTMLDivElement).classList.toggle('is-limit', Boolean(simulation.limit));
  node('coach', HTMLDivElement).classList.toggle('is-limited-input', steeringOnlyDirection(settings.direction) || settings.direction === 'diagonal');
  node('observed-wheel', HTMLElement).dataset.observed = String(simulation.observations.wheelAway);
  node('observed-lean', HTMLElement).dataset.observed = String(simulation.observations.leanIntoTurn);
  node('observed-path', HTMLElement).dataset.observed = String(simulation.observations.pathIntoTurn);
  node('comparison-speed', HTMLElement).textContent = `${simulation.speed * 3.6} km/h`;
  node('peak-lean', HTMLElement).textContent = `${degrees(simulation.peakLean).toFixed(2)} degrees`;
  node('peak-steer', HTMLElement).textContent = `${degrees(simulation.peakSteer).toFixed(2)} degrees`;
  node('elapsed', HTMLElement).textContent = `${state.time.toFixed(2)} s`;
  node('torque-value', HTMLElement).textContent = `${input.torque.toFixed(2)} Nm`;
  node('force-value', HTMLElement).textContent = `${input.leftNewtons.toFixed(2)} / ${input.rightNewtons.toFixed(2)} N`;
  node('speed-ms', HTMLElement).textContent = `${simulation.speed.toFixed(2)} m/s`;
  node('yaw-value', HTMLElement).textContent = `${degrees(state.heading).toFixed(2)} degrees`;
  node('lateral-value', HTMLElement).textContent = `${state.lateral.toFixed(2)} m`;

  shell.dataset.running = String(simulation.running);
  shell.dataset.mode = simulation.mode;
  shell.dataset.time = String(state.time);
  shell.dataset.tick = String(simulation.tick);
  shell.dataset.torque = String(input.torque);
  shell.dataset.lean = String(state.lean);
  shell.dataset.steer = String(state.steer);
  shell.dataset.heading = String(state.heading);
  shell.dataset.forward = String(state.forward);
  shell.dataset.lateral = String(state.lateral);
  shell.dataset.limit = simulation.limit ?? '';
  shell.dataset.speed = String(simulation.speed);
  shell.dataset.pressStyle = settings.style;
  shell.dataset.pressDirection = settings.direction;
  shell.dataset.strength = String(settings.strength);
  shell.dataset.forceLeft = String(input.leftNewtons);
  shell.dataset.forceRight = String(input.rightNewtons);

  const end = Math.max(5, state.time);
  const start = end - 5;
  const tracePoints = (side: 'left' | 'right'): string => simulation.pressTrace
    .filter(point => point.time >= start)
    .map(point => `${(8 + (point.time - start) / 5 * 264).toFixed(1)},${(64 - point[side] * 56).toFixed(1)}`)
    .join(' ');
  const leftTrace = document.getElementById('left-trace');
  const rightTrace = document.getElementById('right-trace');
  if (!(leftTrace instanceof SVGPolylineElement) || !(rightTrace instanceof SVGPolylineElement)) throw new Error('Pressure trace elements are missing.');
  leftTrace.setAttribute('points', tracePoints('left'));
  rightTrace.setAttribute('points', tracePoints('right'));
}

try {
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    fail(new Error('The graphics context was lost. The trial stopped rather than displaying a blank moving scene.'));
  });
  scene = createRiderScene(canvas);
  updateUI();
} catch (error) {
  fail(error);
}

let previousWallTime = performance.now();
function frame(wallTime: number): void {
  if (fatal || !scene) return;
  try {
    simulation.advance(Math.max(0, (wallTime - previousWallTime) / 1000));
    previousWallTime = wallTime;
    const state = simulation.frame;
    const input = simulation.input;
    scene.render({
      speed: simulation.speed,
      time: state.time,
      forward: state.forward,
      lateral: state.lateral,
      heading: state.heading,
      lean: state.lean,
      steer: state.steer,
      leftPressed: input.left,
      rightPressed: input.right,
      leftForce: input.leftForce,
      rightForce: input.rightForce,
      comfort: comfort.checked,
      path: simulation.path,
    });
    document.documentElement.dataset.sceneReady = 'true';
    updateUI();
    requestAnimationFrame(frame);
  } catch (error) {
    fail(error);
  }
}
requestAnimationFrame(frame);
window.addEventListener('beforeunload', () => scene?.dispose());
