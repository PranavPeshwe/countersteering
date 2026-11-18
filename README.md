# First Ride: countersteering simulator

A browser tutorial for someone who learns motorcycling.
Watch one demonstration, repeat it with the grips, then compare the wheel, lean, and road path.
The graphics upgrade targets an original Royal Enfield Classic 350-inspired rider cockpit.

## Live app

Use the simulator at [pranavpeshwe.github.io/pp_countersteering](https://pranavpeshwe.github.io/pp_countersteering/).
The app runs in the browser and requires WebGL 2.

The GitHub Pages workflow runs the unit tests and builds the site after each push to `main`.
Its hosted Windows runner maps a temporary directory to `Q:` and uses the existing project scripts.
The workflow publishes only the compiled site, not dependencies or test artifacts.

## Start

Use Windows PowerShell 5.x and Node.js 22.12 or later.
The generated-output drive must be available.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\project_20261003_120951.ps1 -Action install
npm run browsers:install
npm run dev
```

Open the local application:

```text
http://127.0.0.1:5173
```

The development server listens only on the local machine.
It does not expose a network service to other devices.

The local development and preview servers accept request headers up to 64 KiB.
This accommodates larger browser headers without an unlimited parser setting.
If the browser reports HTTP 431, try a private window or the `localhost` hostname.
Do not clear unrelated site cookies without permission.

To verify the header boundary with synthetic data:

```powershell
node .\scripts\check_server_headers_20261004_081739.mjs
```

## Use the lesson

1. Choose the desired turn and example speed.
2. Choose **Show me** for a five-second demonstration.
3. Watch the grip arrow, wheel diagram, lean indicator, and road path.
4. Choose **Your turn** for manual input.
5. Choose a press direction, style, and virtual strength.
6. Keep the corresponding grip pressed to continue the selected input.
7. Pause before changing the turn or speed.

| Control | Meaning |
|---|---|
| `A` or left grip | The selected directional input on the left grip |
| `D` or right grip | The selected directional input on the right grip |
| Both grips | Combined steering torques, with existing motion preserved |
| Show me | The selected input profile within a five-second observation |
| Your turn | A fresh trial with manual grip control |
| Pause / Resume | Stop or resume the same physical state |
| Reset | Clear the trial, input sources, history, and observations |
| Comfort camera | Reduce camera roll without changing motorcycle lean |
| Slow motion | Advance simulation time at one quarter of real time |

Steady mode applies constant force while held.
Pulse modes repeat their waveform while held.
Release of the last input source stops the force immediately.
Pause, Reset, focus loss, and pointer cancellation also stop input.
The button softly blinks while its input remains active.
With reduced-motion preferences, a steady outline replaces the animation.
The blink indicates active input, not a guaranteed turn.
Neither release nor cancellation assigns a straight wheel or upright motorcycle.
Focus loss, pointer cancellation, and a hidden tab clear held inputs.
Focus loss and a hidden tab also pause the trial.

The wheel direction diagram is not an angle-scale drawing.
The 3D motorcycle uses the actual calculated angle.

## Cockpit graphics

The visual reference is the traditional Classic 350 cockpit.
The exact model year remains unspecified because the user was unavailable to select it.
The model is an original approximation, not an official CAD model.

The cockpit has chrome curved handlebars, ribbed grips, switch housings, levers, cables, round mirrors, an analog dial, and a painted tank.
The analog needle reads the simulation's actual example speed.
Wheel rotation uses simulation time and speed.
The scene preserves physical lean, steering, heading, force arrows, and the rear inset.
Mirror glass uses generated visual reflections, not a live rear-traffic feed.

All geometry and artwork are original procedural assets.
Official photographs serve as references, not bundled textures.
Richer visuals do not change the inferred handling parameters or the ideal steering-force geometry.
The renderer reuses unchanged paused frames and reduces world shading cost for responsive input.

See `docs\graphics_upgrade_20261003_235633\graphics_plan_20261003_235633.md` for the plan and graphics review gate.
The companion reference report records source evidence and visual assumptions.
Controlled screenshots and application tests verify the analog dial, near-field composition, and mobile view.

## Explore the press spectrum

The input lab offers five starting presets:

| Style | Default strength | Duration | Rise time |
|---|---|---|---|
| Steady hold | 25% | Manual hold; one second in Show me | Immediate |
| Gentle push | 15% | Repeated 0.85 s cycles | 250 ms |
| Quick push | 25% | Repeated 0.20 s cycles | 25 ms |
| Sharp jerk | 45% | Repeated 0.10 s cycles | 8 ms |
| Strong jerk | 80% | Repeated 0.17 s cycles | 8 ms |

Use the strength slider across 0-100%.
Change strength during a manual hold to compare continuous input.
Use the collapsed timing controls to customize pulse duration and rise time.
A shorter rise creates a more abrupt input.
Here, "jerk" names the input style, not measured motorcycle jerk.
These virtual presets are not practical riding instructions.
Show me replays one pulse, or one second of steady input, within its five-second demonstration.
Manual practice repeats pulses until release.

Choose forward, backward, side-inward, side-outward, top-downward, or forward-plus-downward force.
The 3D force arrows show the supplied direction and relative magnitude.
The pressure trace shows actual virtual input history.
Arrow length is a visual scale, not physical handlebar travel.

The force projection assumes a straight virtual bar and an ideal vertical steering axis.
Side and top-down inputs carry force but project zero steering torque in this setup.
This does not imply no effect on a real motorcycle.
Direct body loading, rider reactions, and real handlebar geometry are not calculated.
The interface labels this limitation beside the inputs and in the live coach.

## Scope

This is Stage 1 of the learner-first plan.
It uses one approximate motorcycle profile and two constant-speed examples: 36 and 72 km/h.
These speeds are not practice recommendations or countersteering activation thresholds.

The model pauses beyond 10 degrees of lean or 5 degrees of steering.
Those boundaries are design assumptions, not real safety limits.
Direct body loading, skids, falls, walking-speed balance, braking, and throttle changes are not simulated.
Royal Enfield-specific handling remains unverified.

Keep experiments inside the simulator.
Use qualified hands-on instruction for practical riding skills.

See `docs\physics.md` for equations, parameters, sources, and numerical verification.
The original plan and research remain under `docs\countersteering_plan_20261003_091755`.

## Verify and build

```powershell
npm run typecheck
npm test
npm run build
npm run test:browser
```

The browser suite uses an isolated Chromium installation.
Its mobile touch events are emulated.
A physical touch-device trial remains a separate manual verification.
The learner review gate requires human feedback, not merely passing automated tests.

To recompute the independent pulse reference:

```powershell
npm run reference
```

To serve the production build:

```powershell
npm run preview
```

The production preview uses:

```text
http://127.0.0.1:4173
```

## Storage

All authored source, scripts, documents, and curated test fixtures remain in this directory.
Generated dependencies, cache, build output, test reports, browser profiles, and screenshots use:

```text
Q:\pp_exp\pp_countersteering_artifacts
```

`node_modules` is a junction to the external dependency directory.
The install action uses an external npm prefix because npm can replace a local junction.
The canonical package manifest and lockfile remain here.
Their installation copies under the artifact directory are generated dependency metadata.

Use the project install action, not a bare `npm install`.
The action script verifies the junction and configures generated-output locations before each command.
If the artifact directory is unavailable, the script stops.

## Open an isolated preview window

First start the development server.
Then run:

```powershell
npm run open:preview
```

This command opens an owned Chromium window with a profile under the artifact directory.
It does not attach to an existing personal browser profile.
Its local debugging port is 9229.
Close that window to end the preview process.

The optional `scripts\setup_browser_harness_20261003_120951.ps1` installs a local browser-control tool under the artifact directory.
It disables automatic recordings and telemetry.
The application itself does not require that tool.
