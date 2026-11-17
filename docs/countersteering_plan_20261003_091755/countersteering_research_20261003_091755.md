# Countersteering simulator: physics and motorcycle research

- **Purpose:** Define a defensible physics scope for a first-person browser demonstration.
- **Local date:** October 3, 2026, UTC+05:30.
- **Evidence:** Eight public primary sources. References identify pages, equations, or sections.
- **Scope clarification:** October 3, 2026, 09:23:22 UTC+05:30. Generic Royal Enfield-style wireframe first, with on-screen handlebars, keyboard, and touch.
- **Assumptions:** The first model uses an explicit generic teaching profile. Exact vehicle measurements are not prerequisites.
- **Vehicle specifications:** Classic/Bullet data serve as later reference only, not first-release calibration.
- **Converged first model:** Fajans (2000), equations (1)-(3), with its published motorcycle fixture. Whipple remains a separate benchmark option.
- **Model limitations:** Educational dynamics are not motorcycle calibration, skid prediction, crash prediction, or a riding qualification.
- **Status:** Research only. This report contains no implementation or executed simulation tests.
- **Product scope:** The implementation plan controls the learner experience and MVP scope. This report preserves technical background and earlier experiment proposals.
- **Speed distinction:** The 20 m/s fixture remains a published reference. Learner speed presets and demonstration timing follow the revised plan and require verification.

## 1. Motorcycle identity and verified specifications

[Inference: revised scope] The first wireframe does not select a production motorcycle. This comparison supports later refinement only.

[VerifiedWithEvidence] Classic 350 and Bullet 350 have separate manufacturer specification documents. "Classic Bullet" does not identify which document applies. [S1, p. 2] [S2, pp. 16-17]

[Unverified] An older Bullet 500 remains a possible interpretation of the request. This report does not select that interpretation.

| Specification | Classic 350, manufacturer English sheet [S1, p. 2] | Bullet 350, USA brochure [S2, pp. 16-17] |
|---|---|---|
| Document scope | Model year and market not explicitly identified on the sheet | Brochure text identifies the 2024 Bullet |
| Displacement | 349.34 cc | 349 cc |
| Engine power | 14.87 kW at 6,100 rpm | 14.87 kW at 6,100 rpm |
| Engine torque | 27 Nm at 4,000 rpm | 27 Nm at 4,000 rpm |
| Wheelbase | 1,390 mm | 1,390 mm |
| Vehicle mass label | 195 kg, weight in running order | 195 kg, curb weight |
| Seat height | 805 mm | 805 mm |
| Front tire | 100/90-19, tube type | 100/90-19, tube type |
| Rear tire | 120/80-18, tube type | 120/80-18, tube type |
| Length / width / height | 2,145 / 785 / 1,090 mm | 2,110 / 785 / 1,125 mm |

[VerifiedWithEvidence] The Bullet brochure pairs 195 kg with an inconsistent 209.44 lb value. The table retains its kilogram value. [S2, p. 17]

[Inference] Equal headline specifications do not establish equal handling. These documents do not establish the combined rider mass or center of mass.

[Inference] Engine torque is not handlebar steering torque. The simulator must keep those quantities separate.

## 2. Why the steady-turn equation is insufficient

[Inference: elementary equilibrium derivation] For an ideal thin single-track vehicle on a level road, steady force balance gives:

```text
tan(phi) = v^2 / (g R)
```

Here, `phi` represents the equilibrium lean of the combined mass relative to its support. Rider displacement and tire width require additional geometry.

This equation relates an established turn radius to lean. It supplies no steering torque, roll acceleration, steering acceleration, or transient yaw response.

[VerifiedWithEvidence] Limebeer and Sharp explicitly include roll acceleration, yaw acceleration, and steering-rate effects in their dynamic equations. [S4, p. 40, equations (3)-(5)]

[VerifiedWithEvidence] Their bicycle example first produces right steer and left lean after a torque step. The steer angle and lateral path subsequently reverse. [S4, pp. 46-48, Figures 16-17]

[Inference] A rule that instantly converts steering input into equilibrium lean cannot reproduce this causal sequence.

## 3. Torque, angle, and speed

[VerifiedWithEvidence] Steering torque is an input to the free steering system. Steering angle is a response of that system. [S4, p. 46] [S6, p. 251]

[VerifiedWithEvidence] In the bicycle examples, the torque that maintains a turn changes with speed. Torque and angle do not share a universal sign. [S4, pp. 47-48]

[Inference] A browser control must identify whether it commands torque or angle. An angle command implies a separate controller, not direct rider torque.

[Inference] Do not invert the physics input at a selected speed. These sources establish no universal speed threshold for countersteering.

Keep three speed concepts separate:

- A particular model's uncontrolled stability interval.
- The operating range of a particular simulator implementation.
- The speed dependence of steering response.

[Inference] None of these concepts alone defines a universal riding threshold.

## 4. Benchmark bicycle versus motorcycle models

### Lightweight first model: Fajans

[VerifiedWithEvidence] Fajans couples handlebar torque, steering inertia, lean, trail, and wheel rotation. His equations omit friction, finite tire width, and nonvertical-axis effects beyond trail. [S8, pp. 654-655]

[VerifiedWithEvidence] Figure 3 uses this motorcycle fixture: [S8, pp. 656-657]

```text
M = 300 kg
h = 0.60 m, L = 1.54 m, D = 0.117 m, b = 0.77 m
I0 = 0.77 kg*m^2, Is = 0.57 kg*m^2
Ilw = 4.0 kg*m^2, Il = 118 kg*m^2
Gamma = 3 N*m*s, wheel radius = 0.29 m
v = 20 m/s
```

[VerifiedWithEvidence] Footnote 10 identifies inferred XLH Sportster 883 parameters. This fixture is an illustrative simulation, not experimental motorcycle validation. [S8, p. 659]

### Whipple bicycle benchmark

[VerifiedWithEvidence] Meijaard and colleagues use four rigid bodies with ideal hinges and non-slipping, knife-edge wheel contacts. [S3, pp. 1958-1959]

Their upright, constant-speed, small-perturbation equations are:

```text
q = [phi, delta]^T
M q_ddot + v C1 q_dot + (g K0 + v^2 K2) q = [T_phi, T_delta]^T
```

`phi` is lean. `delta` is rotation about the steering axis. `T_delta` is the applied steering torque.

[VerifiedWithEvidence] The paper defines the matrices from 25 design parameters and verifies them against independent nonlinear formulations. [S3, equation (5.3), Appendix A, section 7]

Yaw and rear-contact position follow the same model's constraints:

```text
psi_dot = cos(lambda) * (v * delta + c * delta_dot) / w
x_dot = v * cos(psi)
y_dot = v * sin(psi)
```

Here, `c` is trail, `w` is wheelbase, and `lambda` is steering-axis tilt from vertical. [S3, equations (B6), (B8)]

[Inference] This benchmark can verify numerical mechanics. It cannot certify Royal Enfield handling or tire adhesion.

### Motorcycle-specific linear model

[VerifiedWithEvidence] Sharp's 1971 model includes lateral motion, yaw, roll, and steer. It compares no sideslip, instantaneous tire force, and delayed tire force. [S5, pp. 317-320]

[VerifiedWithEvidence] The full model uses small-angle tire sideslip and camber stiffnesses with relaxation lengths. It assumes constant speed and small perturbations. [S5, pp. 317, 327]

[Inference] This model is a feasible later step for motorcycle-specific small-signal response. Its linear forces do not establish adhesion limits.

### Nonlinear models and validation

[VerifiedWithEvidence] Sharp, Evangelou, and Limebeer include tire contact geometry, load and camber effects, combined slip, relaxation, suspension, and frame flexibility. [S6, sections 3-5]

[VerifiedWithEvidence] Their tire fits use experimental data and inferred coefficients where measurements are unavailable. Their GSX-R1000 description contains measured and assumed parameters. [S6, sections 2, 4.1-4.5]

[VerifiedWithEvidence] Cossalter and Lot report an eleven-degree-of-freedom nonlinear FastBike model. Their abstract reports agreement between simulated and experimental slalom and lane-change maneuvers. [S7, abstract]

[Unverified] S7 provides no attached full text. This research cannot verify its detailed error metrics or test envelope.

[Inference] Neither publication validates a Classic 350 or Bullet 350. Motorcycle equations require motorcycle-specific parameters and independent measurements.

## 5. Crucial parameters that remain unavailable

[VerifiedWithEvidence] The inspected Royal Enfield sheets do not provide the following dynamics parameters. [S1, p. 2] [S2, pp. 16-17]

| Parameter gap | Why the model needs it |
|---|---|
| Steering-axis angle, trail, fork offset | Steering geometry and force moments |
| Component masses and centers of mass | Front/rear loads and inertial coupling |
| Inertia tensors, wheel spin inertias | Roll, yaw, steering, and gyroscopic response |
| Rider mass, center of mass, posture, compliance | Combined inertia and rider interaction |
| Loaded tire radii and crown geometry | Actual rolling geometry and contact locations |
| Tire force and moment curves | Sideslip, camber, load, and combined-slip response |
| Tire relaxation lengths | Delay between motion and lateral force |
| Road friction and tire condition | Adhesion envelope |
| Steering damping and frame flexibility | Oscillation modes |
| Suspension rates and damping | Load transfer and posture |
| Handlebar lever geometry | Conversion from a hand force to steering torque |

[Inference] These requirements follow the parameter structures of S3, S5, and S6. Catalog tire dimensions cannot substitute for tire force measurements.

## 6. Feasible educational MVP

**[Inference: revised design proposal] Start with a generic Royal Enfield-style wireframe and a torque-controlled single-track teaching model.**

Use Fajans's motorcycle fixture as the first physics seed. Exact Royal Enfield measurements do not block this choice.

Keep the profile's physical geometry internally consistent. Decorative proportions cannot silently change wheelbase, trail, mass, or inertia.

Identify the seed as a published, approximate motorcycle example, not Royal Enfield calibration. Keep Whipple as a separate benchmark, not a mixed equation set.

1. Integrate Fajans equations (1)-(3), with the fixture's disclosed steering damping.
2. Integrate lean, lean rate, steer angle, and steer rate.
3. Eliminate the internal fork torque before calculating the two angular accelerations.
4. Map browser controls to signed steering torque.
5. Display torque, angle, lean, and yaw separately.
6. Show the initial response beside the later response.
7. Keep speed constant during each experiment.
8. Disable balancing assistance by default.
9. Derive the camera pose from the simulated frame.
10. Keep camera smoothing outside the physics state.

The damping term is an explicit model parameter, not hidden balancing assistance. Do not remove steering-rate coupling from the lean equation.

[Inference: algebraic reduction] Let `a` denote Fajans lean and `s` denote Fajans steer. Elimination of the fork torque gives:

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

Keep both gyroscopic contributions when eliminating the fork torque. Verify this reduction against the original three equations before numerical regression.

### Sign conventions and visual path

Use separate names for Fajans's lean and steering variables. Do not reuse Whipple's steering-axis tilt symbol for lean.

For the app convention, positive lean, steer, and yaw point right. Adapt the source variables at the model boundary:

```text
phi = Fajans lean
delta = -Fajans steer
Fajans handlebar torque = -T_delta
```

For visual path reconstruction, use an explicit small-angle, no-slip geometric assumption:

```text
psi_dot = v * delta / L
x_dot = v * cos(psi)
y_dot = v * sin(psi)
```

This visual reconstruction does not add tire dynamics. Do not attach Whipple's trail/steering-rate yaw constraint to the Fajans equations.

### Shared control contract

Keyboard, touch, and on-screen grip controls command the same virtual grip forces. These forces produce steering torque, not assigned lean or steer angle.

Use forward virtual pushes at the left and right grips. Show each force arrow on the corresponding grip.

```text
T_delta = sum((r_grip cross F_grip) dot e_delta)

For the default symmetric grip layout and forward pushes:
T_delta = T_max * (u_left_grip - u_right_grip)
u_left_grip, u_right_grip in [0, 1]
```

Here, `r_grip` is the lever from the steering axis. `e_delta` defines the positive steering-axis direction.

For this diagram, positive torque means clockwise steer from above. The left virtual push produces positive torque.

The right virtual push produces negative torque. The displayed force and steer angle can therefore point in different directions.

Propose `T_max = 2 Nm` as the initial interactive input bound. This value is a UI assumption, not measured rider effort.

Keep the angular guards even with bounded torque. A sustained input can leave the permitted angular envelope.

Map each keyboard command and touch target to its corresponding virtual grip. Use the same force-to-torque calculation for every input surface.

Render the handlebars at the simulated `delta`. Display the torque arrow separately from the actual steer angle.

On input release or focus loss, set the commanded torque to zero. Preserve the existing angular velocities.

If assistance becomes necessary, identify the controller and display its additional torque. Keep assistance separate from the user's torque.

### Explicit first-model envelope

| Quantity or condition | First-wireframe scope |
|---|---|
| Speed | Fixed 20 m/s for the initial published-fixture mode |
| Initial demonstration | Upright state with bounded virtual grip input |
| Lean | Proposed boundary: absolute angle at most 10 degrees |
| Steer | Proposed boundary: absolute angle at most 5 degrees |
| Road | Flat, level, rigid surface |
| Tires | Ideal non-slipping contacts |
| Rider | Fixed mass distribution in the selected profile |
| Exclusions | Acceleration, braking, suspension motion, tire slip, and physical crashes |

These numerical boundaries are design assumptions, not measured accuracy limits. Verify the model inside this envelope before a fidelity claim.

Treat other speeds as later test scenarios, not as a change in steering rules.

If the state crosses a guard limit, stop the experiment with **"Outside the educational model envelope."**

Do not clamp lean into a stable turn. Do not silently remove an unstable response.

Display the profile, assumptions, boundaries, and excluded effects beside the wireframe. State **"Educational dynamics, not calibrated motorcycle handling."**

[Inference] A supported standstill scene needs a separate support model. Do not hide divisions by speed in later tire models behind arbitrary minimum values.

## 7. Slip and fall limits

[VerifiedWithEvidence] Fajans omits friction, while Whipple constrains lateral slip. Neither supplies calibrated skid onset. [S8, p. 655] [S3, pp. 1958-1959]

**[Inference] The MVP must not claim accurate slip, traction-loss, fall, or crash prediction.**

- A growing lean can demonstrate linear instability only within the experiment envelope.
- An angle boundary means that the model stops, not that a real motorcycle crashes.
- A scene collision is a separate geometric event.
- A crash animation must identify its illustrative status.

[Inference: optional diagnostic] An assumed friction coefficient can support a coarse warning, not a skid model:

```text
aggregate demand = abs(v * psi_dot) / (mu * g)
```

This expression applies only to an approximate level-road, constant-speed force envelope. It omits individual tire loads and transient force distribution.

If the demand exceeds one, report **"Assumed adhesion envelope exceeded. Slip is not simulated."**

Do not infer a real friction coefficient from this warning.

## 8. Verification cases and later expansion

**[Inference: proposed acceptance tests]**

| Case | Required result |
|---|---|
| Upright initial state, zero input | Zero lateral response |
| Fajans equation reduction | Agreement between equations (1)-(3) and the reduced angular equations |
| Fajans motorcycle fixture | Exact fixture values, units, signs, and disclosed damping |
| Figure 3 reference maneuver | Appropriate initial steer, opposite lean, subsequent steer reversal, and recovery |
| Equal and opposite small inputs | Mirrored lean, steer, and yaw |
| Constant-speed torque response | Reproduce the appropriate reference transient, not only final curvature |
| Proposed RK4 convergence criterion | Halving 1/240 to 1/480 second changes lean/steer by less than 0.0001 rad over five seconds |
| Guard boundary | Explicit stop with no physical crash assertion |
| Optional Whipple implementation | Agreement with S3 matrices, eigenvalues, and stability transitions |

[Inference] Figure 3 is a plot, not a tabulated numeric trajectory. Reproduction requires its torque history or explicitly approximate digitization.

Keep the reference regression separate from the interactive guard limits. A source illustration does not establish physical accuracy outside the small-angle envelope.

Use smaller virtual input for the interactive demonstration. Do not claim a full Figure 3 reproduction from a trace that the guard truncates.

[VerifiedWithEvidence] The optional Whipple stability transitions are 4.29238253634111 and 6.02426201538837 m/s. They are not countersteering thresholds. [S3, Table 2]

[Inference] A steady-turn relation can provide an approximate equilibrium diagnostic. It cannot replace the transient tests.

### Nonlinear tire-slip expansion

[Inference: revised roadmap] Nonlinear expansion can start with explicitly assumed generic tire parameters. Exact Classic/Bullet measurements remain optional until vehicle-specific accuracy becomes a goal.

1. Add independent lateral velocity and yaw dynamics rather than enforced non-slip contact constraints.
2. Compute each tire's sideslip and camber from its local contact motion.
3. Add bounded nonlinear lateral forces, aligning moments, and tire-force delay.
4. Expose assumed tire coefficients, normal loads, and road friction.
5. Add longitudinal dynamics and wheel rotation before combined-slip braking or acceleration scenarios.
6. Add suspension and load transfer for the broader operating envelope.
7. Add contact loss and ground collision as separate dynamics.
8. Verify the nonlinear model's small-signal response against its linearization.

[Inference] A fitted nonlinear tire equation alone does not validate crash behavior. Parameter quality and independent test evidence remain essential.

Do not replace a tire model with a clamp on the linear force. A nonlinear model must update the forces and vehicle motion together.

For vehicle-specific refinement, select the motorcycle, year, market, tires, and rider. Then obtain physical parameters and independent response measurements.

## 9. Parent-plan boundary and later choices

[VerifiedWithEvidence: user clarification] The parent delivers a plan, not an app implementation. The first release prioritizes educational dynamics with visible assumptions.

The first wireframe has no exact-vehicle research blocker. On-screen handlebars, keyboard, and touch share the torque input contract.

Later choices include a synthetic motorcycle profile, nonlinear tire scenarios, balancing assistance, and eventual production-vehicle calibration.

## Primary references

**S1. Royal Enfield, Classic 350 technical specifications, English PDF.** Manufacturer specification sheet, PDF p. 2. Year/market not explicit.

https://www.royalenfield.com/content/dam/royal-enfield/classic-350/specification/pdf/royal-enfield-classic-350-technical-specifications-english.pdf

**S2. Royal Enfield, Bullet 350 USA brochure.** Manufacturer document, 2024 identification on PDF p. 7. Engine/chassis specifications on pp. 16-17.

https://www.royalenfield.com/content/dam/open-pdf/royal-enfield-bullet-350-technical-specifications-usa.pdf

**S3. Meijaard, Papadopoulos, Ruina, and Schwab (2007).** "Linearized dynamics equations for the balance and steer of a bicycle: a benchmark and review." Proceedings of the Royal Society A 463, 1955-1982. DOI: 10.1098/rspa.2007.1857. Original paper on an author's site.

https://arendschwab.com/assets/pdf/meijaard2007linearized.pdf

**S4. Limebeer and Sharp (2006).** "Bicycles, Motorcycles, and Models." IEEE Control Systems Magazine 26(5), 34-61. DOI: 10.1109/MCS.2006.1700044. Original published paper in Imperial College's repository.

https://spiral.imperial.ac.uk/bitstreams/cdbd22eb-ac27-46b4-a0f0-b7a26e36fed5/download

**S5. Sharp (1971).** "The Stability and Control of Motorcycles." Journal of Mechanical Engineering Science 13(5), 316-329. DOI: 10.1243/JMES_JOUR_1971_013_051_02. Original paper scan hosted by Princeton.

https://commons.princeton.edu/64-tiger-cub/wp-content/uploads/sites/80/2018/08/stability-of-motorcycles.pdf

**S6. Sharp, Evangelou, and Limebeer (2004).** "Advances in the Modelling of Motorcycle Dynamics." Multibody System Dynamics 12, 251-283. DOI: 10.1023/B:MUBO.0000049195.60868.a2. Original published paper in Imperial College's repository.

https://spiral.imperial.ac.uk/bitstreams/ac67b0dc-1a1b-4608-bf6c-a843d37764ba/download

**S7. Cossalter and Lot (2002).** "A Motorcycle Multi-Body Model for Real Time Simulations Based on the Natural Coordinates Approach." Vehicle System Dynamics 37, 423-447. DOI: 10.1076/vesd.37.6.423.3523. University of Padua's publication record and author abstract. Abstract-only evidence.

https://www.research.unipd.it/handle/11577/2556482?mode=complete

**S8. Fajans (2000).** "Steering in bicycles and motorcycles." American Journal of Physics 68(7), 654-659. Original published paper hosted by the author's university. Equations (1)-(3), limitations on p. 655, motorcycle fixture and Figure 3 on p. 656, wheel radius on p. 657, parameter provenance in footnote 10 on p. 659.

https://physics.berkeley.edu/sites/default/files/bulk_3/SteerBikeAJP.PDF
