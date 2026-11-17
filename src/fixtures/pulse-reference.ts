export const pulseReference = [
  {
    speed: 10,
    samples: [
      { time: 0.1, lean: 0.0018218738011683176, steer: -0.000828498874018025 },
      { time: 0.5, lean: 0.015005037795132578, steer: 0.0019095245658045474 },
      { time: 1, lean: 0.03705658133479532, steer: 0.004705090312409906 },
      { time: 2, lean: 0.04443933768756336, steer: 0.006725242579012317 },
      { time: 5, lean: 0.03063836763928438, steer: 0.004534385088642267 },
    ],
  },
  {
    speed: 20,
    samples: [
      { time: 0.1, lean: 0.0010910950340192907, steer: -0.000557824538862959 },
      { time: 0.5, lean: 0.011093722480614025, steer: 0.00026897316313253226 },
      { time: 1, lean: 0.02665486356483427, steer: 0.0007158214868702114 },
      { time: 2, lean: 0.03060639379343409, steer: 0.0014462763257934057 },
      { time: 5, lean: 0.02378132305957791, steer: 0.0009209813423308181 },
    ],
  },
] as const;

export const referenceProvenance = {
  method: 'mathjs 15.2.0 expm, independently expressed source-coordinate linear equations',
  source: 'J. Fajans (2000), equations (1)-(3) and footnote 10',
  generator: 'scripts/generate_reference_20261003_120951.mjs',
  pulse: 'Right grip: -2 Nm app torque for 1 second, then zero torque',
  units: 'SI; angle in radians; app right-positive coordinates',
};
