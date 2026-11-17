# Physics contract and verification

**Purpose:** Explain the Stage 1 teaching model and its limits.
**Status:** An implementation of approximate dynamics, not measured motorcycle calibration.

## Coordinates and input

The app uses positive lean, steer, and heading towards the rider's right.
Forward and lateral position describe the rear contact point on the road.
All internal quantities use SI units and radians.

The default forward, 25%-strength input applies steering torque:

```text
T_delta = 2 * (left_pressed - right_pressed) Nm
```

Each grip unions held devices instead of adding their strengths.
Equal opposite inputs cancel the net steering torque.
Timed pulses at different phases can produce unequal torques.
The production state never assigns lean from a button press.

The source convention maps to the app as follows:

```text
source a = app lean
source s = -app steer
source Ns = -app T_delta
```

## Directional forces and pulse shapes

The input model uses body-relative axes: x right, y up, and z backward.
Its assumed grip lever is 0.30 m from an ideal vertical steering axis.
The virtual straight bar places both grips in the same fore-aft plane.
These are input-model assumptions, not measured Royal Enfield geometry.

```text
r_left  = (-0.30, 0, 0) m
r_right = (+0.30, 0, 0) m
right-positive steering axis = (0, -1, 0)
T_delta = sum((r_grip cross F_grip) dot axis)

peak virtual force = (8 Nm * strength / 100) / 0.30 m
```

The moment projection follows the standard force-moment relation:

```text
https://mechanicsmap.psu.edu/websites/3_equilibrium_rigid_body/3-5_moment_about_an_axis/momentaboutanaxis.html
```

Forward/backward force supplies opposite steering torque.
A diagonal forward/downward force supplies only its forward steering component.
Radial side force and top-down force project zero steering torque in this ideal geometry.
Their other effects on a real motorcycle remain unsupported.
Do not treat this zero projection as a real-world harmlessness claim.
The model does not add rider-internal hand forces as external whole-body roll torque.

Steady hold applies constant virtual force until release.
Gentle, quick, sharp, and strong presets use a finite rise, plateau, and decay.
Holding a grip repeats the selected waveform.
Another device does not double its force or restart its phase.
Release of the last source removes input immediately.
Pause, Reset, focus loss, and cancellation clear the held command.
The soft button blink tracks the command, including brief zero-force waveform boundaries.
The trace and vehicle indicators show the actual force and response.

Strength spans 0-100%, equivalent to 0-8 Nm for a single forward grip.
Pulse duration spans 0.08-1.50 seconds.
Rise time is bounded and never exceeds half the selected duration.
The solver samples the waveform at each fixed step's midpoint.
The pressure trace records applied levels, not button presses alone.
"Jerk" describes abrupt input here, not measured vehicle jerk.

## Source and profile

The coupled angular equations come from J. Fajans, *Steering in bicycles and motorcycles*, American Journal of Physics 68, 2000.
Equations (1)-(3), the motorcycle example, and footnote 10 supply the model and parameter provenance.

```text
https://physics.berkeley.edu/sites/default/files/bulk_3/SteerBikeAJP.PDF
```

Footnote 10 identifies inferred Sportster parameters.
These are not measured Royal Enfield values.
The Classic 350-inspired visual model does not change those parameters.
Chrome curves and detailed cockpit parts do not substitute for measured handling or force geometry.

| Parameter | Value |
|---|---|
| Combined mass M | 300 kg |
| Gravity g | 9.81 m/s^2 |
| Center height h | 0.60 m |
| Wheelbase L | 1.54 m |
| Center distance from rear b | 0.77 m |
| Trail D | 0.117 m |
| Wheel spin inertia I0 | 0.77 kg m^2 |
| Steering inertia Is | 0.57 kg m^2 |
| Body roll inertia Il | 118 kg m^2 |
| Wheel roll inertia Ilw | 4.0 kg m^2 |
| Steering damping Gamma | 3 Nm s |
| Wheel radius | 0.29 m |

## Reduced source equations

Elimination of the internal fork torque gives the two angular accelerations:

```text
omega = v / wheel_radius

Is * s_ddot =
  Ns - Gamma*s_dot - omega*I0*a_dot
  - (M*g*b*D/L)*a - (M*b*v^2*D/L^2)*s

(Il + Ilw) * a_ddot =
  h*M*g*a
  + ((h*M*v^2 + 2*v*omega*I0)/L)*s
  + (omega*I0 + h*b*M*v/L)*s_dot
```

The implementation preserves both gyroscopic contributions and the steering-rate coupling.
The source damping is a disclosed physical model term.
It is not a hidden balance controller or an artificial wheel-centering command.

The additional road-path approximation is:

```text
heading_dot = v * app_steer / L
forward_dot = v * cos(heading)
lateral_dot = v * sin(heading)
```

This constant-speed, small-angle, non-slip reconstruction does not add tire dynamics.
The rider camera, motorcycle, rear inset, and path trace use the same pose.
Comfort mode changes camera roll only.

## Demonstration and limits

The default right-turn demonstration applies app torque -2 Nm for one second.
It then applies zero torque for four seconds.
The left-turn demonstration mirrors that input.
The same pulse runs at 10 and 20 m/s.
Other demonstrations replay the selected direction, strength, and timed profile.
Backward inputs reverse the initial response.
Side/top demonstrations explicitly identify their missing body-loading predictions.

The trial pauses beyond an absolute lean of 10 degrees or steer of 5 degrees.
Those boundaries are design assumptions.
Neither boundary predicts a real fall.
Input release preserves all angular states and velocities.
In manual pulse mode, release stops the waveform without resetting physical states.
The explicit demonstration still replays one pulse rather than a held train.

The source omits friction, finite tire width, and important steering-axis geometry effects.
This implementation does not claim skid, crash, low-speed balance, or exact motorcycle-handling accuracy.
The selected speeds are examples, not countersteering on/off thresholds.

## Independent numerical reference

`scripts\generate_reference_20261003_120951.mjs` expresses the angular system in the original source coordinates.
It does not import the production physics module.
It uses mathjs 15.2.0 `expm`, a Padé matrix exponential with scaling and squaring.

```text
https://mathjs.org/docs/reference/functions/expm.html
```

The generator produces raw output in the external artifact directory.
`src\fixtures\pulse-reference.ts` contains curated reference values and their provenance.
The fixed-step RK4 implementation compares lean and steer at 0.1, 0.5, 1, 2, and 5 seconds.
The angular tolerance is 0.0001 rad at both example speeds.

The tests also compare every matched state after halving the timestep from 1/240 to 1/480 second.
They verify the initial countersteer, mirrored responses, straight travel, and the full demonstration's angular bounds.
They verify identical demonstration states at 30, 60, and 120 render frames per second.

This evidence concerns implementation and numerical agreement.
It does not establish empirical motorcycle fidelity.

## Learner and browser verification

The interface records three observations from actual states:

- Initial wheel direction opposite the selected turn.
- Lean towards the selected turn.
- Heading towards the selected turn.

Demonstration success requires all three observations.
It does not follow from a grip press alone.

Unit tests cover directional projection, strength continuity, all pulse presets, waveform convergence, first-response signs, and multi-device arbitration.
They also cover reset, pause, hidden-tab interruption, slow motion, and model boundaries.
Browser tests cover real WebGL pixels, guided examples, input profiles, live strength, force directions, error reporting, navigation, and mobile-sized touch.
The browser touch trial is emulated.
A real-device trial and a human learner review remain separate.
