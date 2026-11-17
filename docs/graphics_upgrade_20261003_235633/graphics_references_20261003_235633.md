# Classic 350 cockpit: visual references

Purpose: graphics-only renderer guidance. Task start: October 3, 2026, 23:56 +05:30. Research date: October 4, 2026, local +05:30.

[Inference] Target a traditional chrome/analog Classic 350 cockpit, not exact-year CAD. Preserve the existing Fajans approximate handling and virtual input.

## Primary references

PDF page numbers below are one-based. Documentation locations use section names.

| ID | Official source URL | Precise location |
|---|---|---|
| R1 | `https://www.royalenfield.com/content/dam/royal-enfield/india/motorcycles/classic-350/specification/royal_enfield_classic_350_specification.pdf` | PDF p3, model context. P6, cockpit photograph and instrument text. P8, top-center and middle-right photographs. |
| R2 | `https://threejs.org/docs/pages/MeshPhysicalMaterial.html` | Introduction, inheritance, clearcoat, transmission, performance. Properties: clearcoat, clearcoatRoughness, transmission. |
| R3 | `https://threejs.org/docs/pages/PMREMGenerator.html` | Introduction. Methods: fromScene, dispose. |
| R4 | `https://threejs.org/docs/pages/CanvasTexture.html` | Introduction and constructor. |
| R5 | `https://threejs.org/docs/pages/WebGLRenderer.html` | Properties: outputColorSpace, toneMapping, toneMappingExposure. |
| S1 | `https://www.royalenfield.com/content/dam/open-pdf/royal-enfield-classic-350-owners-manual-english-united-kingdom.pdf` | Indexed snippet only: printed p21, LOCATION OF KEY PARTS, cockpit diagram. |
| S2 | `https://www.royalenfield.com/content/dam/open-pdf/royal-enfield-classic-350-technical-specifications.pdf` | Indexed snippet only: instrument paragraph and MiY footnote. |

Five references received direct inspection. Two supplemental sources received snippet inspection only. No full UK manual download or diagram image inspection occurred.

## Observable features

[VerifiedWithEvidence] R1 names the 2021 Classic 350. Its path identifies India. S1 identifies the UK. Neither establishes universal trim equipment.

[VerifiedWithEvidence] The curved chrome bar rises and sweeps toward the rider from a central clamp. Silver levers flank black housings. The right side has a red control and black reservoir. [R1, p6 photograph]

[VerifiedWithEvidence] The round speedometer has pale graduations, a red needle, and a bright ring. An LCD sits beneath it. The ignition sits left, with a smaller pod right. [R1, p6]

[VerifiedWithEvidence] Round mirrors, angled stalks, and black grips appear beside an accessory windscreen. Other photographs show a red teardrop tank, reflective cap, and painted nacelle. [R1, p6; p8, middle-right and bottom-center]

[VerifiedWithEvidence: snippet only] S1 names thirteen cockpit parts. These cover horn, indicators, both levers, information and beam controls, USB, key, instruments, optional navigation/badge, engine stop, hazards, and tank closure. [S1, printed p21]

[VerifiedWithEvidence: snippet only] S2 specifies analog speed plus LCD and restricts Tripper to MiY editions. Treat the secondary pod as trim-dependent, not universal. [S2, instrument paragraph and footnote]

## Procedural geometry and composition

[Inference] These are original visual approximations, not measured motorcycle dimensions.

- Form the chrome bar with a smooth tube curve. Add rise and sweep through its intermediate points.
- Keep both virtual grip anchors at lateral `+/-0.30 m` in the existing axis/fore-aft plane. Terminate decorative bends at these anchors.
- Preserve the existing vertical input axis, force calculations, and lever arms. Do not derive those values from mesh bounds.
- Add cylindrical black grips, shallow ribs, collar rings, rounded control housings, silver levers, and a right reservoir.
- Add two circular mirrors, thin stalks, a rounded nacelle, a central dial, a lower LCD, and a tank shoulder.
- Use original dial artwork and a neutral secondary cap. Omit logos and the accessory windscreen.
- Place the camera above and behind the tank. Frame both grips and mirrors with the dial between them.

## Materials and renderer

[VerifiedWithEvidence] MeshPhysicalMaterial extends MeshStandardMaterial. Clearcoat and transmission add effects with extra pixel cost. Its documentation recommends an environment map. [R2, introduction]

[Inference] Use MeshStandardMaterial for chrome and rubber. Start chrome at metalness `1`, roughness `0.15-0.25`, and a neutral light color. Start rubber at metalness `0`, roughness `0.8`, and near-black. Use MeshPhysicalMaterial selectively for red paint with clearcoat `1` and clearcoatRoughness `0.15`. These are artistic values.

[VerifiedWithEvidence] PMREMGenerator.fromScene accepts a procedural scene. CanvasTexture accepts an HTML canvas and initially sets needsUpdate. [R3, fromScene; R4, introduction]

[Inference] Generate a room environment with bright panels for chrome reflections. If its installed API matches, use the task-proposed RoomEnvironment addon. Generate dial artwork with CanvasTexture.

[VerifiedWithEvidence] WebGLRenderer exposes ACESFilmicToneMapping, exposure, and SRGBColorSpace output. [R5, named properties]

[Inference] Start with ACESFilmicToneMapping, exposure `1`, and SRGBColorSpace output. Verify dial contrast after reflections.

## Limits and rights

[Unverified] Exact cockpit dimensions, mirror specification, later trim differences, RoomEnvironment API, and compatibility with the task-supplied Three.js `0.186.1` remain unverified.

Use photographs as reference only. Do not copy photographs, logos, models, textures, or HDR assets into the app. Public access does not establish reuse permission.
