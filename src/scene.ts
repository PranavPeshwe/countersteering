import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { SceneFrame, RiderScene } from './scene-contract';

export function createRiderScene(canvas: HTMLCanvasElement): RiderScene {
  // Retain genuine rendered pixels between cached frames.
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: false, preserveDrawingBuffer: true,
  });
  const context = renderer.getContext();
  const canCacheFrames = context.getContextAttributes()?.preserveDrawingBuffer === true;
  if (!canCacheFrames) {
    console.warn('The renderer cannot cache frames because this canvas does not retain its WebGL drawing buffer.');
  }
  const debugRenderer = context.getExtension('WEBGL_debug_renderer_info');
  const gpuName: unknown = debugRenderer
    ? context.getParameter(debugRenderer.UNMASKED_RENDERER_WEBGL)
    : undefined;
  const maxPixelRatio = typeof gpuName === 'string' && gpuName.toLowerCase().includes('swiftshader')
    ? 0.85
    : 2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbcd8e5);
  scene.fog = new THREE.Fog(0xbcd8e5, 35, 180);

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const instances = new Set<THREE.InstancedMesh>();
  const straightTubeGeometry = new THREE.CylinderGeometry(1, 1, 1, 12);
  geometries.add(straightTubeGeometry);
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 256;
  skyCanvas.height = 128;
  const skyContext = skyCanvas.getContext('2d');
  if (!skyContext) throw new Error('The daylight sky requires a Canvas 2D context.');
  const skyGradient = skyContext.createLinearGradient(0, 0, 0, 128);
  skyGradient.addColorStop(0, '#72acd4');
  skyGradient.addColorStop(0.5, '#bcd8e5');
  skyGradient.addColorStop(1, '#aebc9c');
  skyContext.fillStyle = skyGradient;
  skyContext.fillRect(0, 0, 256, 128);
  const skyTexture = new THREE.CanvasTexture(skyCanvas);
  skyTexture.colorSpace = THREE.SRGBColorSpace;
  skyTexture.mapping = THREE.EquirectangularReflectionMapping;
  textures.add(skyTexture);
  scene.background = skyTexture;
  const room = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, 0.04, 0.1, 100, { size: 64 });
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.8;
  room.dispose();
  pmrem.dispose();

  const chrome = new THREE.MeshStandardMaterial({
    color: 0xe4e9ed, metalness: 1, roughness: 0.15,
  });
  const aluminum = new THREE.MeshStandardMaterial({
    color: 0xa3abb0, metalness: 0.85, roughness: 0.32,
  });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x171b1a, roughness: 0.92 });
  const cast = new THREE.MeshStandardMaterial({
    color: 0x242a28, metalness: 0.3, roughness: 0.67,
  });
  const paint = new THREE.MeshPhysicalMaterial({
    color: 0x153c2e, metalness: 0.25, roughness: 0.28,
    clearcoat: 1, clearcoatRoughness: 0.16,
  });
  const red = new THREE.MeshStandardMaterial({ color: 0xb72620, roughness: 0.45 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xd8cfb6, roughness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0xe4f3f7, roughness: 0.07, metalness: 0, transparent: true,
    opacity: 0.09, depthWrite: false,
  });
  const mirror = new THREE.MeshStandardMaterial({
    color: 0xb8cfda, metalness: 1, roughness: 0.05, envMapIntensity: 1.2,
  });
  const leftCue = new THREE.MeshStandardMaterial({
    color: 0x75847e, metalness: 0.45, roughness: 0.4,
  });
  const rightCue = leftCue.clone();
  for (const material of [
    chrome, aluminum, rubber, cast, paint, red, pale, glass, mirror, leftCue, rightCue,
  ]) materials.add(material);

  function addMesh(
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    position: readonly [number, number, number] = [0, 0, 0],
  ): THREE.Mesh {
    geometries.add(geometry);
    materials.add(material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    parent.add(mesh);
    return mesh;
  }

  function addTube(
    parent: THREE.Object3D,
    points: readonly (readonly [number, number, number])[],
    radius: number,
    material: THREE.Material,
    curved = false,
  ): THREE.Mesh {
    const vectors = points.map(point => new THREE.Vector3(...point));
    if (curved) {
      const curve = new THREE.CatmullRomCurve3(vectors);
      return addMesh(parent, new THREE.TubeGeometry(curve, 32, radius, 8, false), material);
    }
    const first = vectors[0];
    const last = vectors[vectors.length - 1];
    const direction = last.clone().sub(first);
    const mesh = addMesh(
      parent,
      straightTubeGeometry,
      material,
    );
    mesh.scale.set(radius, direction.length(), radius);
    mesh.position.copy(first).add(last).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return mesh;
  }

  scene.add(new THREE.HemisphereLight(0xe5f2ff, 0x718455, 2));
  const sun = new THREE.DirectionalLight(0xfff3dc, 3.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(256, 256);
  sun.shadow.camera.left = -5;
  sun.shadow.camera.right = 5;
  sun.shadow.camera.top = 5;
  sun.shadow.camera.bottom = -5;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 40;
  sun.shadow.normalBias = 0.025;
  sun.shadow.bias = -0.0003;
  scene.add(sun, sun.target);

  const yaw = new THREE.Group();
  yaw.name = 'motorcycle-heading';
  const lean = new THREE.Group();
  lean.name = 'motorcycle-lean';
  yaw.add(lean);
  scene.add(yaw);
  const front = new THREE.Group();
  front.name = 'steering-assembly';
  front.position.set(0, 0.29, -1.54);
  lean.add(front);

  const wheels: THREE.Group[] = [];
  for (const [parent, centerY] of [[lean, 0.29], [front, 0]] as const) {
    const wheel = new THREE.Group();
    wheel.position.y = centerY;
    parent.add(wheel);
    wheels.push(wheel);
    const tire = addMesh(wheel, new THREE.TorusGeometry(0.25, 0.04, 12, 48), rubber);
    tire.castShadow = true;
    tire.rotation.y = Math.PI / 2;
    const rim = addMesh(wheel, new THREE.TorusGeometry(0.218, 0.013, 8, 40), chrome);
    rim.rotation.y = Math.PI / 2;
    addTube(wheel, [[-0.07, 0, 0], [0.07, 0, 0]], 0.045, aluminum);
    const spokes = new THREE.InstancedMesh(straightTubeGeometry, chrome, 16);
    const spokePose = new THREE.Object3D();
    const spokeStart = new THREE.Vector3();
    const spokeEnd = new THREE.Vector3();
    const spokeDirection = new THREE.Vector3();
    for (let index = 0; index < 16; index += 1) {
      const angle = (index / 16) * Math.PI * 2;
      spokeStart.set(index % 2 ? -0.025 : 0.025, 0, 0);
      spokeEnd.set(0, Math.cos(angle) * 0.218, Math.sin(angle) * 0.218);
      spokeDirection.copy(spokeEnd).sub(spokeStart);
      spokePose.position.copy(spokeStart).add(spokeEnd).multiplyScalar(0.5);
      spokePose.scale.set(0.0025, spokeDirection.length(), 0.0025);
      spokePose.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0), spokeDirection.normalize(),
      );
      spokePose.updateMatrix();
      spokes.setMatrixAt(index, spokePose.matrix);
    }
    instances.add(spokes);
    wheel.add(spokes);
  }
  for (const x of [-0.12, 0.12]) {
    addTube(lean, [[x, 0.29, 0], [x, 0.75, -0.22]], 0.022, cast);
    addTube(lean, [[x, 0.75, -0.22], [x, 0.92, -1.3]], 0.021, cast);
    addTube(lean, [[x, 0.92, -1.3], [x, 0.38, -0.84]], 0.023, cast);
    addTube(lean, [[x, 0.38, -0.84], [x, 0.29, 0]], 0.022, cast);
    addTube(front, [[x, 0, 0], [x, 0.4, 0.1]], 0.026, chrome);
    addTube(front, [[x, 0.4, 0.1], [x, 0.74, 0.19]], 0.034, aluminum);
  }
  const engine = addMesh(lean, new THREE.BoxGeometry(0.28, 0.28, 0.32), aluminum, [0, 0.5, -0.64]);
  engine.name = 'approximate-engine';
  engine.castShadow = true;
  for (let index = 0; index < 5; index += 1) {
    addMesh(lean, new THREE.BoxGeometry(0.32, 0.012, 0.24), cast, [0, 0.58 + index * 0.025, -0.67]);
  }
  const tank = addMesh(lean, new THREE.SphereGeometry(1, 32, 20), paint, [0, 0.87, -0.82]);
  tank.name = 'green-tank';
  tank.castShadow = true;
  tank.scale.set(0.23, 0.2, 0.39);
  const cap = addMesh(lean, new THREE.CylinderGeometry(0.048, 0.052, 0.018, 32), chrome, [0, 1.05, -0.99]);
  cap.name = 'fuel-cap';
  addMesh(lean, new THREE.BoxGeometry(0.032, 0.003, 0.004), cast, [0, 1.061, -0.99]);
  const seat = addMesh(lean, new THREE.SphereGeometry(1, 24, 12), rubber, [0, 0.8, -0.18]);
  seat.castShadow = true;
  seat.scale.set(0.21, 0.075, 0.3);
  addTube(lean, [[0.22, 0.33, 0.15], [0.22, 0.33, -0.85]], 0.043, chrome);
  addTube(lean, [[-0.29, 0.38, -0.58], [0.29, 0.38, -0.58]], 0.024, rubber);

  const lampHousing = addMesh(front, new THREE.SphereGeometry(0.13, 24, 16), paint, [0, 0.62, 0.02]);
  lampHousing.scale.z = 1.2;
  const lampRim = addMesh(front, new THREE.TorusGeometry(0.116, 0.008, 8, 32), chrome, [0, 0.62, -0.092]);
  lampRim.name = 'headlamp-rim';
  const lampLens = addMesh(front, new THREE.CircleGeometry(0.11, 32), pale, [0, 0.62, -0.101]);
  lampLens.rotation.y = Math.PI;
  addMesh(front, new THREE.BoxGeometry(0.3, 0.035, 0.12), aluminum, [0, 0.73, 0.14]);
  for (const x of [-0.075, 0.075]) {
    addTube(front, [[x, 0.73, 0.13], [x, 0.78, 0.13]], 0.016, chrome);
    const clamp = addMesh(front, new THREE.BoxGeometry(0.043, 0.025, 0.046), aluminum, [x, 0.788, 0.13]);
    clamp.name = x < 0 ? 'left-clamp' : 'right-clamp';
    for (const z of [0.115, 0.145]) {
      addMesh(front, new THREE.CylinderGeometry(0.006, 0.006, 0.006, 6), chrome, [x, 0.804, z]);
    }
  }

  const handlebar = addTube(front, [
    [-0.36, 0.87, 0], [-0.24, 0.87, 0], [-0.19, 0.82, 0.075],
    [-0.12, 0.78, 0.13], [0, 0.78, 0.13],
    [0.12, 0.78, 0.13], [0.19, 0.82, 0.075],
    [0.24, 0.87, 0], [0.36, 0.87, 0],
  ], 0.0125, chrome, true);
  handlebar.name = 'chrome-handlebar';

  const forceArrows: THREE.ArrowHelper[] = [];
  for (const [side, cue] of [[-1, leftCue], [1, rightCue]] as const) {
    // The curved chrome bar does not move the ideal +/-0.30 m force anchors.
    const gripCenter = side * 0.3;
    const grip = addTube(front, [[gripCenter - 0.06, 0.87, 0], [gripCenter + 0.06, 0.87, 0]], 0.022, rubber);
    grip.name = side < 0 ? 'left-grip' : 'right-grip';
    const ribGeometry = new THREE.TorusGeometry(0.022, 0.002, 6, 16);
    geometries.add(ribGeometry);
    const ribs = new THREE.InstancedMesh(ribGeometry, rubber, 10);
    const ribPose = new THREE.Object3D();
    ribPose.rotation.y = Math.PI / 2;
    for (let index = 0; index < 10; index += 1) {
      ribPose.position.set(gripCenter - 0.05 + index * 0.011, 0.87, 0);
      ribPose.updateMatrix();
      ribs.setMatrixAt(index, ribPose.matrix);
    }
    instances.add(ribs);
    front.add(ribs);
    addTube(front, [[side * 0.36, 0.87, 0], [side * 0.37, 0.87, 0]], 0.023, chrome);
    addTube(front, [[side * 0.238, 0.87, 0], [side * 0.245, 0.87, 0]], 0.025, cue);

    const pod = addMesh(front, new THREE.SphereGeometry(1, 16, 12), cast, [side * 0.213, 0.87, 0.006]);
    pod.scale.set(0.037, 0.038, 0.041);
    pod.name = side < 0 ? 'clutch-switch-pod' : 'brake-switch-pod';
    addMesh(front, new THREE.BoxGeometry(0.018, 0.012, 0.012), side > 0 ? red : pale, [side * 0.213, 0.902, 0.02]);
    if (side < 0) {
      addMesh(front, new THREE.BoxGeometry(0.016, 0.009, 0.009), rubber, [-0.213, 0.875, 0.045]);
      addMesh(front, new THREE.BoxGeometry(0.022, 0.008, 0.009), pale, [-0.213, 0.858, 0.045]);
    } else {
      addMesh(front, new THREE.BoxGeometry(0.045, 0.028, 0.035), cast, [0.19, 0.89, -0.04]);
    }
    const pivotX = side * 0.18;
    addMesh(front, new THREE.CylinderGeometry(0.009, 0.009, 0.02, 12), chrome, [pivotX, 0.883, -0.075]);
    const lever = addTube(front, [
      [pivotX, 0.878, -0.075], [side * 0.225, 0.875, -0.125],
      [side * 0.31, 0.875, -0.145], [side * 0.369, 0.883, -0.12],
    ], 0.006, aluminum, true);
    lever.name = side < 0 ? 'clutch-lever' : 'brake-lever';
    addMesh(front, new THREE.SphereGeometry(0.009, 12, 8), aluminum, [side * 0.369, 0.883, -0.12]);
    addTube(front, [
      [side * 0.18, 0.863, -0.042], [side * 0.12, 0.75, -0.12],
      [side * 0.19, 0.58, 0.1], [side * 0.12, 0.26, 0.04],
    ], 0.004, rubber, true);

    addTube(front, [
      [side * 0.205, 0.905, -0.01], [side * 0.23, 1.005, -0.06],
      [side * 0.37, 1.095, -0.12], [side * 0.44, 1.11, -0.12],
    ], 0.007, chrome, true);
    const mirrorHead = new THREE.Group();
    mirrorHead.name = side < 0 ? 'left-mirror' : 'right-mirror';
    mirrorHead.position.set(side * 0.44, 1.11, -0.12);
    mirrorHead.rotation.y = side * -0.1;
    mirrorHead.rotation.x = -0.18;
    front.add(mirrorHead);
    const housing = addMesh(mirrorHead, new THREE.SphereGeometry(1, 24, 12), chrome, [0, 0, -0.008]);
    housing.scale.set(0.068, 0.068, 0.014);
    const face = addMesh(mirrorHead, new THREE.CircleGeometry(0.061, 32), mirror, [0, 0, 0.005]);
    face.name = 'environment-reflection-only';
    addMesh(mirrorHead, new THREE.TorusGeometry(0.064, 0.004, 8, 32), chrome, [0, 0, 0.008]);

    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1), new THREE.Vector3(gripCenter, 0.87, 0), 0.12, 0xffbd35,
    );
    arrow.visible = false;
    // Input overlays remain readable where a downward force crosses a solid part.
    for (const part of [arrow.line, arrow.cone]) {
      geometries.add(part.geometry);
      const arrowMaterials = Array.isArray(part.material) ? part.material : [part.material];
      for (const material of arrowMaterials) {
        material.depthTest = false;
        material.depthWrite = false;
        material.toneMapped = false;
        materials.add(material);
      }
      part.renderOrder = 5;
    }
    front.add(arrow);
    forceArrows.push(arrow);
  }
  const forceDirection = new THREE.Vector3();

  const dialCanvas = document.createElement('canvas');
  dialCanvas.width = 512;
  dialCanvas.height = 512;
  const dialContext = dialCanvas.getContext('2d');
  if (!dialContext) throw new Error('The cockpit dial requires a Canvas 2D context.');
  dialContext.fillStyle = '#19221f';
  dialContext.fillRect(0, 0, 512, 512);
  dialContext.strokeStyle = '#eee7d6';
  dialContext.fillStyle = '#eee7d6';
  dialContext.textAlign = 'center';
  dialContext.textBaseline = 'middle';
  for (let speed = 0; speed <= 160; speed += 5) {
    const angle = THREE.MathUtils.degToRad(225 - (speed / 160) * 270);
    const major = speed % 20 === 0;
    const outer = 224;
    const inner = major ? 196 : 210;
    dialContext.lineWidth = major ? 5 : 2;
    dialContext.beginPath();
    dialContext.moveTo(256 + Math.cos(angle) * inner, 256 - Math.sin(angle) * inner);
    dialContext.lineTo(256 + Math.cos(angle) * outer, 256 - Math.sin(angle) * outer);
    dialContext.stroke();
    if (major) {
      dialContext.font = '28px sans-serif';
      dialContext.fillText(String(speed), 256 + Math.cos(angle) * 171, 256 - Math.sin(angle) * 171);
    }
  }
  dialContext.font = 'bold 24px sans-serif';
  dialContext.fillText('SIM', 256, 184);
  dialContext.font = '19px sans-serif';
  dialContext.fillText('km/h', 256, 214);
  const dialTexture = new THREE.CanvasTexture(dialCanvas);
  dialTexture.colorSpace = THREE.SRGBColorSpace;
  textures.add(dialTexture);
  const dialMaterial = new THREE.MeshBasicMaterial({ map: dialTexture, toneMapped: false });
  materials.add(dialMaterial);
  const dial = new THREE.Group();
  dial.name = 'analog-speedometer';
  dial.position.set(0, 0.84, -0.1);
  dial.rotation.x = -0.72;
  front.add(dial);
  const gaugeBody = addMesh(dial, new THREE.CylinderGeometry(0.117, 0.104, 0.054, 40), chrome, [0, 0, -0.025]);
  gaugeBody.rotation.x = Math.PI / 2;
  addMesh(dial, new THREE.CircleGeometry(0.108, 48), dialMaterial, [0, 0, 0.003]);
  addMesh(dial, new THREE.TorusGeometry(0.112, 0.008, 12, 48), chrome, [0, 0, 0.005]);

  const lcdCanvas = document.createElement('canvas');
  lcdCanvas.width = 256;
  lcdCanvas.height = 80;
  const lcdContext = lcdCanvas.getContext('2d');
  if (!lcdContext) throw new Error('The cockpit speed display requires a Canvas 2D context.');
  const lcdTexture = new THREE.CanvasTexture(lcdCanvas);
  lcdTexture.colorSpace = THREE.SRGBColorSpace;
  textures.add(lcdTexture);
  const lcdMaterial = new THREE.MeshBasicMaterial({ map: lcdTexture, toneMapped: false });
  materials.add(lcdMaterial);
  addMesh(dial, new THREE.PlaneGeometry(0.09, 0.028), lcdMaterial, [0, -0.049, 0.006]);
  const actualNeedle = new THREE.Group();
  actualNeedle.name = 'actual-speed-needle';
  actualNeedle.position.z = 0.012;
  dial.add(actualNeedle);
  const needleShape = new THREE.Shape();
  needleShape.moveTo(-0.004, -0.02);
  needleShape.lineTo(0.004, -0.02);
  needleShape.lineTo(0.001, 0.086);
  needleShape.lineTo(-0.001, 0.086);
  needleShape.closePath();
  const needleMaterial = new THREE.MeshBasicMaterial({ color: 0xc52922, toneMapped: false });
  materials.add(needleMaterial);
  addMesh(actualNeedle, new THREE.ShapeGeometry(needleShape), needleMaterial);
  addMesh(dial, new THREE.CircleGeometry(0.008, 20), cast, [0, 0, 0.014]);
  const gaugeGlass = addMesh(dial, new THREE.CircleGeometry(0.106, 48), glass, [0, 0, 0.018]);
  gaugeGlass.castShadow = false;
  gaugeGlass.receiveShadow = false;
  let displayedSpeed = '';

  const ignition = new THREE.Group();
  ignition.name = 'left-ignition-key';
  ignition.position.set(-0.16, 0.81, -0.045);
  ignition.rotation.x = -0.72;
  front.add(ignition);
  const ignitionBody = addMesh(ignition, new THREE.CylinderGeometry(0.032, 0.032, 0.022, 24), cast, [0, 0, -0.011]);
  ignitionBody.rotation.x = Math.PI / 2;
  addMesh(ignition, new THREE.TorusGeometry(0.028, 0.004, 8, 24), chrome);
  addMesh(ignition, new THREE.BoxGeometry(0.008, 0.031, 0.005), aluminum, [0, 0.008, 0.014]);
  const keyHead = addMesh(ignition, new THREE.BoxGeometry(0.027, 0.021, 0.012), rubber, [0, 0.03, 0.017]);
  keyHead.rotation.z = -0.2;

  // A neutral cap represents trim-dependent equipment, not working navigation.
  const secondary = new THREE.Group();
  secondary.name = 'neutral-secondary-cap';
  secondary.position.set(0.17, 0.84, -0.1);
  secondary.rotation.x = -0.72;
  front.add(secondary);
  const secondaryBody = addMesh(secondary, new THREE.CylinderGeometry(0.044, 0.041, 0.03, 24), chrome, [0, 0, -0.015]);
  secondaryBody.rotation.x = Math.PI / 2;
  addMesh(secondary, new THREE.CircleGeometry(0.039, 24), cast, [0, 0, 0.002]);
  addMesh(secondary, new THREE.TorusGeometry(0.042, 0.004, 8, 24), chrome, [0, 0, 0.003]);

  const road = new THREE.Group();
  scene.add(road);
  const grass = new THREE.MeshLambertMaterial({ color: 0x6f8650 });
  materials.add(grass);
  // Separate verges avoid coplanar grass/asphalt overlap at shallow rider angles.
  for (const x of [-48.5, 48.5]) {
    const verge = addMesh(road, new THREE.PlaneGeometry(83, 360), grass, [x, -0.025, -90]);
    verge.name = 'grass-verge';
    verge.rotation.x = -Math.PI / 2;
  }
  const asphaltCanvas = document.createElement('canvas');
  asphaltCanvas.width = 128;
  asphaltCanvas.height = 128;
  const asphaltContext = asphaltCanvas.getContext('2d');
  if (!asphaltContext) throw new Error('The road material requires a Canvas 2D context.');
  const asphaltPixels = asphaltContext.createImageData(128, 128);
  for (let index = 0; index < 128 * 128; index += 1) {
    const value = 56 + ((index * 73 + (index % 19) * 31) % 17);
    asphaltPixels.data.set([value, value + 2, value + 3, 255], index * 4);
  }
  asphaltContext.putImageData(asphaltPixels, 0, 0);
  const asphaltTexture = new THREE.CanvasTexture(asphaltCanvas);
  asphaltTexture.colorSpace = THREE.SRGBColorSpace;
  asphaltTexture.wrapS = THREE.RepeatWrapping;
  asphaltTexture.wrapT = THREE.RepeatWrapping;
  asphaltTexture.repeat.set(5, 100);
  textures.add(asphaltTexture);
  const asphalt = new THREE.MeshLambertMaterial({ map: asphaltTexture });
  materials.add(asphalt);
  const surface = addMesh(road, new THREE.PlaneGeometry(14, 360), asphalt, [0, -0.025, -90]);
  surface.rotation.x = -Math.PI / 2;
  surface.castShadow = false;
  surface.receiveShadow = true;
  surface.name = 'asphalt-road';
  const laneMaterial = new THREE.MeshLambertMaterial({ color: 0xe7e6d4 });
  materials.add(laneMaterial);
  for (const x of [-6.6, 6.6]) {
    const edge = addMesh(road, new THREE.PlaneGeometry(0.1, 330), laneMaterial, [x, -0.018, -105]);
    edge.rotation.x = -Math.PI / 2;
    edge.castShadow = false;
  }
  const dashGeometry = new THREE.PlaneGeometry(0.09, 5);
  geometries.add(dashGeometry);
  const dashes = new THREE.InstancedMesh(dashGeometry, laneMaterial, 84);
  const dashPose = new THREE.Object3D();
  dashPose.rotation.x = -Math.PI / 2;
  let dashIndex = 0;
  for (let forward = -60; forward < 270; forward += 12) {
    for (const x of [-3.5, 0, 3.5]) {
      dashPose.position.set(x, -0.017, -forward - 2.5);
      dashPose.updateMatrix();
      dashes.setMatrixAt(dashIndex, dashPose.matrix);
      dashIndex += 1;
    }
  }
  dashes.count = dashIndex;
  instances.add(dashes);
  road.add(dashes);
  const foliage = new THREE.MeshLambertMaterial({ color: 0x415f39 });
  const trunk = new THREE.MeshLambertMaterial({ color: 0x635b43 });
  materials.add(foliage);
  materials.add(trunk);
  const scenery = new THREE.Group();
  scene.add(scenery);
  const crownGeometry = new THREE.SphereGeometry(1, 10, 8);
  geometries.add(crownGeometry);
  const trunks = new THREE.InstancedMesh(straightTubeGeometry, trunk, 18);
  const crowns = new THREE.InstancedMesh(crownGeometry, foliage, 18);
  const treePose = new THREE.Object3D();
  for (let index = 0; index < 18; index += 1) {
    const side = index % 2 ? 1 : -1;
    const z = 30 - index * 16;
    const x = side * (18 + (index % 3) * 5);
    treePose.position.set(x, 1.25, z);
    treePose.scale.set(0.16, 2.5, 0.16);
    treePose.updateMatrix();
    trunks.setMatrixAt(index, treePose.matrix);
    treePose.position.set(x, 3.5, z);
    treePose.scale.set(1.7, 2.6, 1.7);
    treePose.updateMatrix();
    crowns.setMatrixAt(index, treePose.matrix);
  }
  instances.add(trunks);
  instances.add(crowns);
  scenery.add(trunks, crowns);

  const pathGeometry = new THREE.BufferGeometry();
  const pathMaterial = new THREE.LineBasicMaterial({ color: 0x0786aa, toneMapped: false });
  geometries.add(pathGeometry);
  materials.add(pathMaterial);
  let pathPositions = new THREE.Float32BufferAttribute(6, 3);
  pathPositions.setUsage(THREE.DynamicDrawUsage);
  pathGeometry.setAttribute('position', pathPositions);
  pathGeometry.setDrawRange(0, 0);
  const path = new THREE.Line(pathGeometry, pathMaterial);
  path.frustumCulled = false;
  scene.add(path);

  const riderCamera = new THREE.PerspectiveCamera(45, 1, 0.06, 220);
  const rearCamera = new THREE.PerspectiveCamera(55, 220 / 130, 0.1, 220);
  const head = new THREE.Vector3(0, 1.56, -0.68);
  const ahead = new THREE.Vector3();
  const up = new THREE.Vector3();
  const rearOffset = new THREE.Vector3();
  const rearTarget = new THREE.Vector3();
  const yawQuaternion = new THREE.Quaternion();
  const vertical = new THREE.Vector3(0, 1, 0);
  const container = canvas.parentElement ?? canvas;
  let width = 1;
  let height = 1;
  let pixelRatio = 0;
  let disposed = false;
  let needsRender = true;
  let previousFrame: Omit<SceneFrame, 'path'> | null = null;
  let previousPathPositions = new Float64Array(0);
  let previousPathLength = -1;
  const frameKeys = [
    'speed', 'time', 'forward', 'lateral', 'heading', 'lean', 'steer',
    'leftPressed', 'rightPressed', 'comfort',
  ] as const;
  const shadowPose = [NaN, NaN, NaN, NaN, NaN];

  function resize(): void {
    if (disposed) return;
    const bounds = container.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.floor(bounds.width));
    const nextHeight = Math.max(1, Math.floor(bounds.height));
    const nextRatio = Math.min(maxPixelRatio, window.devicePixelRatio || 1);
    if (nextWidth === width && nextHeight === height && nextRatio === pixelRatio) return;
    width = nextWidth;
    height = nextHeight;
    pixelRatio = nextRatio;
    needsRender = true;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    riderCamera.aspect = width / height;
    const horizontalFov = THREE.MathUtils.degToRad(82);
    riderCamera.fov = Math.max(45, THREE.MathUtils.radToDeg(
      2 * Math.atan(Math.tan(horizontalFov / 2) / riderCamera.aspect),
    ));
    riderCamera.updateProjectionMatrix();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  const invalidate = (): void => {
    needsRender = true;
    shadowPose.fill(NaN);
  };
  canvas.addEventListener('webglcontextrestored', invalidate);
  resize();

  // Finish shader/environment uploads before the controller starts its frame clock.
  sun.position.set(-8, 15, 6);
  riderCamera.position.copy(head);
  riderCamera.lookAt(ahead.set(0, -0.245, -1).add(head));
  renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, riderCamera);
  rearCamera.position.set(0, 2.4, 5.5);
  rearCamera.lookAt(0, 0.75, -0.65);
  renderer.setScissorTest(true);
  renderer.setScissor(0, 0, Math.min(220, width), Math.min(130, height));
  renderer.setViewport(0, 0, Math.min(220, width), Math.min(130, height));
  renderer.render(scene, rearCamera);
  renderer.setScissorTest(false);
  renderer.setScissor(0, 0, width, height);
  renderer.setViewport(0, 0, width, height);
  context.readPixels(0, 0, 1, 1, context.RGBA, context.UNSIGNED_BYTE, new Uint8Array(4));

  return {
    render(frame: SceneFrame): void {
      if (disposed) return;
      if (Math.min(maxPixelRatio, window.devicePixelRatio || 1) !== pixelRatio) resize();
      const previous = previousFrame;
      const pathUnchanged = previousPathLength === frame.path.length && frame.path.every(
        (point, index) => point.forward === previousPathPositions[index * 2] &&
          point.lateral === previousPathPositions[index * 2 + 1],
      );
      if (
        canCacheFrames && !needsRender && previous && pathUnchanged &&
        frameKeys.every(key => frame[key] === previous[key]) &&
        frame.leftForce.x === previous.leftForce.x &&
        frame.leftForce.y === previous.leftForce.y &&
        frame.leftForce.z === previous.leftForce.z &&
        frame.rightForce.x === previous.rightForce.x &&
        frame.rightForce.y === previous.rightForce.y &&
        frame.rightForce.z === previous.rightForce.z
      ) return;
      yaw.position.set(frame.lateral, 0, -frame.forward);
      yaw.rotation.y = -frame.heading;
      lean.rotation.z = -frame.lean;
      front.rotation.y = -frame.steer;
      wheels.forEach(wheel => { wheel.rotation.x = -(frame.speed * frame.time) / 0.29; });
      leftCue.emissive.setHex(frame.leftPressed ? 0xd69418 : 0x000000);
      rightCue.emissive.setHex(frame.rightPressed ? 0xd69418 : 0x000000);
      forceArrows.forEach((arrow, index) => {
        const force = index === 0 ? frame.leftForce : frame.rightForce;
        forceDirection.set(force.x, force.y, force.z);
        const magnitude = forceDirection.length();
        arrow.visible = magnitude > 0;
        if (!arrow.visible) return;
        arrow.setDirection(forceDirection.divideScalar(magnitude));
        const length = 0.12 + (0.53 * magnitude) / (magnitude + 3);
        arrow.setLength(length, Math.min(0.1, length * 0.3), Math.min(0.07, length * 0.2));
      });
      const speedKmh = frame.speed * 3.6;
      actualNeedle.rotation.z = THREE.MathUtils.degToRad(135 - (speedKmh / 160) * 270);
      const speedText = speedKmh.toFixed(0);
      if (displayedSpeed !== speedText) {
        displayedSpeed = speedText;
        lcdContext.fillStyle = '#b9c4a9';
        lcdContext.fillRect(0, 0, 256, 80);
        lcdContext.fillStyle = '#23302a';
        lcdContext.textAlign = 'center';
        lcdContext.textBaseline = 'middle';
        lcdContext.font = 'bold 40px monospace';
        lcdContext.fillText(`${speedText} km/h`, 128, 31);
        lcdContext.font = '18px monospace';
        lcdContext.fillText('SIM', 128, 63);
        lcdTexture.needsUpdate = true;
      }
      road.position.z = -Math.floor(frame.forward / 12) * 12;
      // Preserve world-space texture and tree positions across recycling boundaries.
      asphaltTexture.offset.y = -road.position.z * asphaltTexture.repeat.y / 360;
      scenery.position.z = -Math.floor(frame.forward / 96) * 96;
      sun.position.set(frame.lateral - 8, 15, -frame.forward + 6);
      sun.target.position.set(frame.lateral, 0, -frame.forward);
      if (
        shadowPose[0] !== frame.forward || shadowPose[1] !== frame.lateral ||
        shadowPose[2] !== frame.heading || shadowPose[3] !== frame.lean ||
        shadowPose[4] !== frame.steer
      ) {
        renderer.shadowMap.needsUpdate = true;
        shadowPose[0] = frame.forward;
        shadowPose[1] = frame.lateral;
        shadowPose[2] = frame.heading;
        shadowPose[3] = frame.lean;
        shadowPose[4] = frame.steer;
      }
      yaw.updateMatrixWorld(true);

      if (pathPositions.count < frame.path.length) {
        pathGeometry.dispose();
        pathPositions = new THREE.Float32BufferAttribute(
          Math.max(frame.path.length, pathPositions.count * 2) * 3, 3,
        );
        pathPositions.setUsage(THREE.DynamicDrawUsage);
        pathGeometry.setAttribute('position', pathPositions);
      }
      if (!pathUnchanged || needsRender) {
        frame.path.forEach((point, index) => {
          pathPositions.setXYZ(index, point.lateral, 0.018, -point.forward);
        });
        pathPositions.needsUpdate = true;
        pathGeometry.setDrawRange(0, frame.path.length);
      }

      yawQuaternion.setFromAxisAngle(vertical, -frame.heading);
      riderCamera.position.copy(head).applyMatrix4(lean.matrixWorld);
      ahead.set(0, -0.245, -1).applyQuaternion(yawQuaternion).add(riderCamera.position);
      const roll = frame.lean * (frame.comfort ? 0.25 : 1);
      up.set(Math.sin(roll), Math.cos(roll), 0).applyQuaternion(yawQuaternion);
      riderCamera.up.copy(up);
      riderCamera.lookAt(ahead);
      rearOffset.set(0, 2.4, 5.5).applyQuaternion(yawQuaternion);
      rearCamera.position.copy(yaw.position).add(rearOffset);
      rearTarget.set(0, 0.75, -0.65).applyQuaternion(yawQuaternion).add(yaw.position);
      rearCamera.lookAt(rearTarget);

      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, width, height);
      renderer.render(scene, riderCamera);
      const insetScale = Math.min(1, (width * 0.32) / 220, (height * 0.3) / 130);
      const insetWidth = Math.max(1, Math.floor(220 * insetScale));
      const insetHeight = Math.max(1, Math.floor(130 * insetScale));
      const margin = Math.floor(Math.min(12, width * 0.02, height * 0.02));
      const insetX = width - insetWidth - margin;
      rearCamera.aspect = insetWidth / insetHeight;
      rearCamera.updateProjectionMatrix();
      renderer.setScissor(insetX, margin, insetWidth, insetHeight);
      renderer.setViewport(insetX, margin, insetWidth, insetHeight);
      renderer.setScissorTest(true);
      renderer.render(scene, rearCamera);
      renderer.setScissorTest(false);
      renderer.setScissor(0, 0, width, height);
      renderer.setViewport(0, 0, width, height);
      canvas.dataset.graphicsStyle = 'classic350-solid';
      canvas.dataset.cockpitSpeedKmh = String(speedKmh);
      canvas.dataset.speedNeedleAngle = String(actualNeedle.rotation.z);
      previousFrame = {
        speed: frame.speed, time: frame.time, forward: frame.forward, lateral: frame.lateral,
        heading: frame.heading, lean: frame.lean, steer: frame.steer,
        leftPressed: frame.leftPressed, rightPressed: frame.rightPressed, comfort: frame.comfort,
        leftForce: { ...frame.leftForce }, rightForce: { ...frame.rightForce },
      };
      if (!pathUnchanged) {
        if (previousPathPositions.length < frame.path.length * 2) {
          previousPathPositions = new Float64Array(
            Math.max(frame.path.length * 2, previousPathPositions.length * 2),
          );
        }
        frame.path.forEach((point, index) => {
          previousPathPositions[index * 2] = point.forward;
          previousPathPositions[index * 2 + 1] = point.lateral;
        });
        previousPathLength = frame.path.length;
      }
      needsRender = false;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      observer.disconnect();
      canvas.removeEventListener('webglcontextrestored', invalidate);
      instances.forEach(mesh => mesh.dispose());
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      textures.forEach(texture => texture.dispose());
      environment.dispose();
      sun.shadow.dispose();
      renderer.dispose();
    },
  };
}
