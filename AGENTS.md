# Project instructions

## File locations

The directory that contains this file is the project root.
These rules apply to this project and its subdirectories.

- Keep all authored project files inside the project root.
  This includes source code, scripts, plans, documentation, assets, and intentional deliverables.
- Store generated dependencies, caches, temporary files, and build output in `Q:\pp_exp\pp_countersteering_artifacts`.
  This includes `node_modules`, Python `__pycache__`, virtual environments, build bundles, coverage, and test reports.
- Configure output locations before any dependency installation, build, or test execution.
- Install dependencies with `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\project_20261003_120951.ps1 -Action install`.
  A bare `npm install` can replace the local dependency junction.
- If a tool requires a local generated directory, use a junction that targets the external artifact directory.
  Keep the generated data on `Q:`.
- If the external artifact directory is unavailable, stop and report the blocker.
  Do not substitute another directory.

For this project, these locations replace earlier shared document and script output paths.

## Project context

Before changing simulator physics or the tutorial, read both documents:

- `docs\countersteering_plan_20261003_091755\countersteering_plan_20261003_091755.md`
- `docs\countersteering_plan_20261003_091755\countersteering_research_20261003_091755.md`
- `docs\physics.md`
