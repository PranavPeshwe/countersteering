# Countersteering simulator: staged implementation plan

**Date:** October 3, 2026.
**Revision:** Include the learner-first review and the requested directional press spectrum.
**Audience:** Someone who learns motorcycling, not a researcher.
**Purpose:** Teach countersteering through a simple browser simulator.
**Status:** Stage 1 browser prototype implemented. Human learner feedback and a physical touch-device trial remain pending.
**Evidence:** Source facts cite the references below. [Inference] identifies proposed implementation choices. [Unverified] identifies missing evidence.

## 1. Learner goal and scope

[VerifiedWithEvidence] The user selected these options:

- Generic Royal Enfield-style motorcycle first.
- On-screen handlebars, keyboard input, and touch input.
- Educational dynamics with visible assumptions and model limits.

[Inference] Build the smallest wireframe that teaches a useful lesson.
Keep equations and numerical details outside the learner's main view.
Treat correct physics as support for the lesson, not the product itself.

After the first lesson, the learner must explain:

- Which grip initiates the desired lean.
- Why initial wheel direction differs from the desired turn direction.
- How grip input, wheel direction, lean, and road path differ.
- Why prolonged input differs from a brief press.
- Why a simulator limit does not predict a real fall.

The MVP excludes traffic, gears, brakes, suspension, physical controllers, and exact motorcycle calibration.
Walking-speed balance, tire slip, and falls remain later lessons.
The user selected steering-effects-only support for directional presses.
Label unsupported direct body loading and real handlebar geometry effects explicitly.

## 2. First experience: show, try, explain

[Inference] Include guidance in the first wireframe, not a later milestone.

1. Open with a rider view, a simple road, a speedometer, and two labeled grips.
2. Offer **Show me** and **Your turn**.
3. Demonstrate one right-turn initiation with visible grip, wheel, lean, and path cues.
4. Let the learner repeat the same action.
5. Offer the mirrored left-turn example.
6. Let the learner try the other grip and a longer press.
7. Compare the same demonstration at two supported speeds.

**Show me** must identify its input as a demonstration.
Keep the verified default five-second trial with a one-second, 2 Nm forward input.
Let Show me replay the selected input direction, style, strength, and timing.
Keep manual grip input inactive during the explicit demonstration.
**Your turn** resets the trial and returns control to the learner.
Neither mode directly assigns lean or wheel angle.

Use short hints, such as:

- "Press the right grip forward briefly."
- "The wheel first points left."
- "Watch the motorcycle lean right."
- "Release the grip. The motorcycle still has motion."

Generate feedback from input history and the simulated state.
Do not report success from a button press alone.

### What the learner sees

[VerifiedWithEvidence] A right-turn initiation can start with a brief leftward steering deflection.
Then the motorcycle leans right and follows a rightward path. [P1]
[VerifiedWithEvidence] The MSF teaches forward pressure on the handgrip on the desired turn side. [P2]

| Learner question | Visible cue |
|---|---|
| Which grip did I press? | A forward arrow on that grip |
| Where does the wheel point? | A front-wheel direction diagram and the actual angle |
| Which way does the motorcycle lean? | A lean indicator and the motorcycle pose |
| Where does the motorcycle travel? | The road view and a short path trace |
| What does speed change? | A repeated demonstration with the same input |

When wheel movement is too small to see, use a clearly labeled direction diagram.
Keep the motorcycle's actual steering angle unchanged.
Use a small view from behind the motorcycle to connect lean with its path.
Offer a comfort camera that reduces camera roll without altering physics.
Label that camera mode so the learner does not confuse camera motion with motorcycle lean.

Put the simple explanation first.
Put equations, parameters, units, and model limitations in collapsed details.
Explain that wheel rotation is only part of the physics story. [P1, P4]

## 3. A simple press spectrum

[Inference] Keep one input model and one motorcycle model.
Offer steady hold, gentle push, quick push, sharp jerk, and strong jerk presets.
Offer forward, backward, side-inward, side-outward, top-downward, and diagonal directions.
Use a continuous virtual-strength slider and collapsed pulse timing controls.
Keep the default beginner example forward, steady, and 25% strength.
Do not add measured-force calibration or a controller framework.

| Input | Action |
|---|---|
| Left grip or `A` | Apply the selected input on the left grip |
| Right grip or `D` | Apply the selected input on the right grip |
| Hold mode | Maintain input until release |
| Pulse mode | Keep pressed for repeated pulses; release stops input |
| Both grips | Combine torques; equal opposed inputs cancel |
| Pause | Stop simulation time and clear held inputs |
| Reset | Restore the complete starting state and lesson |

Use the same input states for pointer, touch, and keyboard.
Ignore repeated keydown events.
Combine devices by grip state, not by adding their torques.
Keep a grip active until all input sources for that grip release.
Apply that release rule to every manual press style.
Repeat the pulse profile while any input source holds the grip.
Show a soft button blink during active input.
Keep the blink slower than the physical pulse repetition.
For reduced-motion preferences, retain a steady active outline.
Clear held inputs on focus loss, pointer cancellation, or a hidden tab.
Resume with no stale press.

Use a bounded force-moment projection:

```text
T_delta = sum((r_grip cross F_grip) dot steering_axis)
ideal right-positive axis = (0, -1, 0)
assumed straight-bar grip lever = +/-0.30 m
single forward-grip range = 0-8 Nm from virtual strength 0-100%
default forward hold at 25% = 2 Nm
```

Positive `T_delta` means rightward steering torque in the app convention.
A right-grip press therefore applies leftward steering torque.
Verify the source-coordinate conversion before connecting the controls.
Release means zero input in every manual mode, not an automatic wheel reset.
Preserve the existing lean, wheel angle, and angular velocities.
Use the source model's disclosed damping.
Do not add a hidden balance assistant or artificial centering spring.
Show live pressure traces and 3D force arrows.
Keep arrow length a labeled visual scale, not handlebar travel.
Treat "jerk" as an abrupt input style, not measured motorcycle jerk.
Top/side presses have zero steering projection in this ideal geometry.
Do not claim these directions lack effects on a real motorcycle.

## 4. Physics and speed: enough for the lesson

[Inference] Use one small-angle model: Fajans equations (1)-(3), with the published motorcycle parameters and disclosed damping. [P1]
Keep lean and steering coupled.
Calculate wheel angle and lean from torque, rather than assigning either angle from the controls.
Use the report's explicit approximate road-path relation.
Use the same position and heading for the camera and path trace.

[VerifiedWithEvidence] The published motorcycle parameters are inferred Sportster values, not Royal Enfield calibration. [P1, footnote 10]
[VerifiedWithEvidence] This model excludes friction and important tire and geometry effects. [P1]
[Unverified] Real Royal Enfield handling, skid onset, and crash prediction remain outside the available evidence.

### Two speed examples, not a failure threshold

[Inference] Propose **36 km/h** and **72 km/h** as the first comparison presets.
Use 36 km/h as the learner default only after verification.
Keep 72 km/h for comparison with the original 20 m/s source example.
These are demonstration choices, not recommended practice speeds or measured accuracy limits.

Verify the controls, reference response, and angular limits at both presets before enabling either preset.
If a preset fails these requirements, revise the preset before presenting the MVP.
Change speed only while paused.
Reset the trial after a speed change.
Keep speed constant during each trial.

Compare the same disclosed input at both speeds.
Explain what changes in this model without inventing an activation speed.
Do not present stability bands as speeds where countersteering fails.
State that this version does not simulate walking-speed balance.

### Honest boundaries

[Inference] Start with proposed limits of 10 degrees of lean and 5 degrees of steering.
These limits are design assumptions, not real safety thresholds.
Verify that the guided example remains within them.
When the trial exceeds a limit, pause it with **"This trial exceeded the simple model's range."**
Explain the input history.
Offer Reset.

Do not clamp lean into a successful turn.
Do not trigger a scripted fall after the wrong grip press.
Explain wrong-direction lean and prolonged input from the calculated response.
Identify road departure separately from tire slip.

Display **"Educational simulator. Skids, falls, and walking-speed balance are not simulated yet."**
Keep all suggested experiments inside the simulator.
Do not present this application as practical rider certification. [P2]

## 5. Small implementation, simple wireframe

[Inference] Use TypeScript, Vite, Three.js, and ordinary HTML controls. [T1, T2]
Keep one physics module, one scene, and a small lesson state.
Keep physics independent of browser and graphics APIs.
Keep lesson hints independent of the dynamics.
Use Vitest for a small dynamics test suite and one Playwright browser smoke test. [T3, T4]
Verify TypeScript separately from the Vite build. [T1]

Start with fourth-order Runge-Kutta integration at 240 simulation steps per second.
Verify the timestep before retaining it.
Interpolate graphics without changing physics.
Associate input history with simulation steps.
Pause after a long browser interruption.

```text
grip input -> steering torque -> coupled dynamics -> rider view
                                      |
                                      +-> learner hints and indicators
```

```text
+------------------+-------------------------------------------+
| Scrollable index | Rider view: road, horizon, simple cockpit |
|                  | Small wheel/lean inset and path trace     |
| Start            |                                           |
| Your turn        | Left grip --- speedometer --- right grip  |
| Compare speeds   |                                           |
| Why it works     | One short hint                            |
| Model limits     | Show me | Your turn | Pause | Reset       |
| Sources          | Speed preset | Comfort camera             |
+------------------+-------------------------------------------+
```

Use wireframes and simple road geometry.
Keep the index sticky and independently scrollable.
Generate links for every heading, including collapsed content.
When an index link targets collapsed content, expand that content.
Keep buttons readable and keyboard accessible.

## 6. Three delivery stages

### Stage 1: the first useful wireframe

- [x] Configure project storage from `AGENTS.md` before any installation or build.
- [x] Implement and verify the small physics module.
- [x] Add the rider view, road, grips, speedometer, and simple indicators.
- [x] Add Show me, Your turn, short hints, and the mirrored example.
- [x] Add directional forces, five press presets, continuous strength, pulse timing, and a pressure trace.
- [x] Add the two verified speed presets, pause, reset, and slow motion.
- [x] Verify the control contract and model-limit message.
- [x] Present the browser application for user review.

**Gate:** A learner can repeat the example and explain the grip, wheel, lean, and path sequence.
Do not stop at a solver demonstration without guidance.
[Unverified] This human learner gate and the physical touch-device trial await feedback.
Automated browser tests verify emulated touch, not physical hardware or learner comprehension.

### Stage 2: refine from learner feedback

Fix unclear controls, invisible steering cues, confusing hints, and uncomfortable camera motion first.
Then add the agreed next lesson or graphical improvement.
Add a turn-exit lesson and a gentle road curve before decorative detail.
Preserve physics during every graphical change.
Use original geometry or assets with documented permission.
Keep each iteration small enough for another user review.

**Gate:** The next change solves an observed learner problem.
Do not add features merely because a model or framework supports them.

### Stage 3: later turn-control lessons

Add walking-speed balance, grip loss, and fall explanations one lesson at a time.
Use tire forces before a calculated slip claim.
Use contact and ground behavior before a calculated fall claim.
Compare any replacement model with the existing small-angle response in their common range.
Define a concrete trial and expected behavior for each new effect.
Expose model changes and limitations without an arbitrary hidden speed switch.
Keep illustrative outcomes distinct from calculated outcomes.

**Gate:** Each new effect improves a learner lesson and has enough evidence for its stated claim.
Exact Royal Enfield calibration remains separate from the generic educational MVP.

## 7. Minimum verification before the first review

[Inference] Keep verification practical and bounded.
Use the existing linear equations, not a new research program.

For numerical verification, compute one disclosed pulse with an independent matrix-exponential reference.
Keep that calculation outside the production application.
Store its reference values, units, parameters, and input timing as an authored test fixture.
Compare both proposed speed presets at 0.1, 0.5, 1, 2, and 5 seconds.
Propose an angular tolerance of 0.0001 rad for lean and steering.
Halve the simulation step and compare matched states throughout the five-second trial.
Use the same tolerance for this convergence comparison.
These tolerances concern numerical agreement, not real motorcycle accuracy.

| Area | Required result |
|---|---|
| Source and signs | Reduced equations match the source, and right-grip input starts the intended sequence |
| Basic dynamics | An upright straight start with zero torque produces straight travel. Opposite inputs produce mirrored responses |
| Independent reference | Both speed presets match the recorded pulse values within the proposed tolerance |
| Render timing | The same input produces the same physics at 30, 60, and 120 render frames per second |
| Path and camera | Both use the same simulated position and heading |
| Controls | Held inputs, both grips, repeated keys, mixed devices, and cancellation follow Section 3 |
| Lifecycle | Pause, resume, reset, focus loss, and a hidden tab leave no stale input |
| Model boundary | The trial pauses with an explanation, not a crash claim |
| Learner trial | A learner can repeat the turn and distinguish grip input from wheel and lean response |
| Browser view | Text remains readable, all heading links work, and touch hold/release works on a real device |

Verify the actual guided trial, not only an arbitrary solver input.
If the trial barely shows the response, revise its duration or its labeled explanatory cues.
Keep the physical angles unchanged.
Do not treat a generic claim of instability as proof that a balance controller is necessary.

## 8. Storage and small documentation

Follow root `AGENTS.md` for every source, script, document, dependency, cache, and build-output location.
Keep all authored project materials inside this project.
Use `Q:\pp_exp\pp_countersteering_artifacts` for generated output.

Start with `README.md` and one `docs\physics.md`.
Include install/build instructions, controls, lesson scope, equations, parameter sources, and limits.
Keep the detailed research report as background.
Split documentation only after its size or purpose requires another file.
Keep documentation consistent with the implemented behavior.

## 9. Review decisions

| Suggestion | Decision |
|---|---|
| Add guidance to the first wireframe | Accept: Show me, Your turn, and one short lesson belong in Stage 1 |
| Define input behavior | Accept: distinct hold/tap rules, strength continuity, cancellation, and device arbitration |
| Add an independent reference | Accept: one small pulse fixture, not a benchmark platform |
| Compare speeds | Accept: two proposed presets with verification before exposure |
| Verify camera comfort and subtle wheel motion | Accept: a labeled comfort view and an explanatory direction diagram |
| Verify replacement-model behavior | Accept later: concrete lesson trials and comparison in the common range |
| Display a countersteering failure band | Reject: simulator limits and stability bands are not universal riding thresholds |
| Add mandatory balance or centering control | Reject for MVP: preserve the disclosed dynamics without hidden assistance |
| Reproduce Figure 3 or implement Whipple | Defer: neither is necessary for the first learner lesson |
| Treat current document locations as an external-storage violation | Qualify: follow `AGENTS.md`; remove ambiguous location wording |
| Support directional pushes and jerks | Accept: bounded torque projection, preset/custom waveforms, force arrows, and explicit body-loading limitations |

## 10. Next review

Review the working browser wireframe and its guided turn.
Use learner feedback to select the next small Stage 2 change.
Keep Stage 3 physics effects separate from this implemented MVP.
The implementation plan controls product scope.
The research report preserves technical background and earlier experiment proposals.

## 11. Primary sources

Use these sources for the stated model and explanations.
The background references do not create additional MVP requirements.

| ID | Source | Purpose |
|---|---|---|
| P1 | Fajans, *Steering in bicycles and motorcycles*, American Journal of Physics, 2000 | Countersteering transients and bounded educational model |
| P2 | Motorcycle Safety Foundation, Basic RiderCourse and rider materials | Rider-facing terminology and education limits |
| P3 | Meijaard and collaborators, *Linearized dynamics equations for the balance and steer of a bicycle*, 2007 | Background benchmark, not an MVP implementation task |
| P4 | Kooijman and collaborators, *A bicycle can be self-stable without gyroscopic or caster effects*, 2011 | Limits of a gyroscope-only explanation |
| T1 | Vite documentation | TypeScript template, production build, and separate type verification |
| T2 | Three.js documentation | Perspective camera and rendering loop |
| T3 | Vitest documentation | Numerical unit tests |
| T4 | Playwright documentation | Browser and touch-input verification |

```text
P1: https://physics.berkeley.edu/sites/default/files/bulk_3/SteerBikeAJP.PDF
P2: https://msf-usa.org/start-your-ride/basic-ridercourse/
P2: https://msf-usa.org/wp-content/uploads/2024/07/MSF-You-and-Your-Motorcycle-Riding-Tips-2023.pdf
P3: https://doi.org/10.1098/rspa.2007.1857
P4: https://arendschwab.com/research/stablebicycle/
T1: https://vite.dev/guide/
T1: https://vite.dev/guide/features.html
T2: https://threejs.org/docs/pages/PerspectiveCamera.html
T2: https://threejs.org/docs/pages/WebGLRenderer.html
T3: https://vitest.dev/guide/
T4: https://playwright.dev/docs/emulation
T4: https://playwright.dev/docs/api/class-touchscreen
```
