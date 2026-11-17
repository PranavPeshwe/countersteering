import { writeFileSync } from 'node:fs';
import { expm, matrix, multiply } from 'mathjs';
import { artifactDirectory, artifactPath } from '../tooling/artifacts.mjs';

const M = 300, g = 9.81, h = 0.6, L = 1.54, b = 0.77, D = 0.117;
const I0 = 0.77, Is = 0.57, Il = 118, Ilw = 4, damping = 3, radius = 0.29;
const pulseDuration = 1;
const sourceTorque = 2;
const times = [0.1, 0.5, 1, 2, 5];

function referenceFor(speed) {
  const omega = speed / radius;
  // Original source coordinates [a, a_dot, s, s_dot], independently of production code.
  const A = [
    [0, 1, 0, 0],
    [h * M * g / (Il + Ilw), 0,
      (h * M * speed ** 2 + 2 * speed * omega * I0) / (L * (Il + Ilw)),
      (omega * I0 + h * b * M * speed / L) / (Il + Ilw)],
    [0, 0, 0, 1],
    [-M * g * b * D / (L * Is), -omega * I0 / Is,
      -M * b * speed ** 2 * D / (L ** 2 * Is), -damping / Is],
  ];
  const augmented = A.map((row, i) => [...row, i === 3 ? sourceTorque / Is : 0]);
  augmented.push([0, 0, 0, 0, 0]);
  const endPulse = multiply(
    expm(multiply(matrix(augmented), pulseDuration)),
    matrix([0, 0, 0, 0, 1]),
  ).toArray().slice(0, 4);

  return {
    speed,
    samples: times.map(time => {
      const sourceState = time <= pulseDuration
        ? multiply(expm(multiply(matrix(augmented), time)), matrix([0, 0, 0, 0, 1])).toArray()
        : multiply(expm(multiply(matrix(A), time - pulseDuration)), matrix(endPulse)).toArray();
      const [a, aRate, s, sRate] = sourceState;
      return { time, lean: a, leanRate: aRate, steer: -s, steerRate: -sRate };
    }),
  };
}

const result = {
  source: 'J. Fajans (2000), equations (1)-(3), inferred motorcycle parameters in footnote 10.',
  method: 'mathjs 15.2.0 expm: Pade matrix exponential with scaling and squaring; not RK4.',
  units: 'SI; angles in radians; right-positive app convention.',
  pulse: { grip: 'right', torqueNm: -2, durationSeconds: pulseDuration },
  cases: [referenceFor(10), referenceFor(20)],
};

artifactDirectory('reference');
const destination = artifactPath('reference', 'physics_reference_20261003_120951.json');
writeFileSync(destination, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Independent reference: ${destination}`);
console.log(JSON.stringify(result, null, 2));
