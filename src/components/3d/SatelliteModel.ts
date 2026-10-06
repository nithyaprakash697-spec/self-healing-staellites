import * as THREE from 'three';
import { SatelliteTextureGenerator } from '../../utils/satelliteTextures';
import { FaultType, PipelineStage, SubsystemHealth } from '../../types/satellite';

export interface SatelliteModelHandles {
  group: THREE.Group;
  update: (delta: number, elapsed: number) => void;
  setFaultAndReconfiguration: (
    fault: FaultType, 
    stage: PipelineStage, 
    health: SubsystemHealth, 
    telemetry: { coreTemp: number; attitudeError: number; busVoltage: number; commMargin: number; powerMargin: number }
  ) => void;
  dispose: () => void;
  subsystemMeshes: Map<string, THREE.Object3D>;
}

export function buildSatelliteModel(): SatelliteModelHandles {
  const root = new THREE.Group();
  const subsystemMeshes = new Map<string, THREE.Object3D>();

  // 1. Generate PBR Procedural Textures
  const { map: goldMliMap, bumpMap: goldMliBump } = SatelliteTextureGenerator.createGoldMliTexture();
  const solarCellMap = SatelliteTextureGenerator.createSolarCellTexture();
  const carbonMap = SatelliteTextureGenerator.createCarbonFiberTexture();
  const titaniumMap = SatelliteTextureGenerator.createMachinedTitaniumTexture();

  // 2. High-Quality PBR Aerospace Materials
  const goldMliMaterial = new THREE.MeshStandardMaterial({
    map: goldMliMap,
    bumpMap: goldMliBump,
    bumpScale: 0.08,
    color: 0xffffff,
    metalness: 0.88,
    roughness: 0.32,
    envMapIntensity: 1.5,
  });

  const titaniumMaterial = new THREE.MeshStandardMaterial({
    map: titaniumMap,
    color: 0x94a3b8,
    metalness: 0.85,
    roughness: 0.35,
    envMapIntensity: 1.2,
  });

  const darkStructuralMaterial = new THREE.MeshStandardMaterial({
    map: carbonMap,
    color: 0x1e293b,
    metalness: 0.4,
    roughness: 0.6,
  });

  const solarCellMaterial = new THREE.MeshStandardMaterial({
    map: solarCellMap,
    color: 0xffffff,
    metalness: 0.8,
    roughness: 0.18,
    emissive: 0x031838,
    emissiveIntensity: 0.2,
  });

  const opticalSolarReflectorMaterial = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.95,
    roughness: 0.08,
    envMapIntensity: 2.0,
  });

  const chromeMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.98,
    roughness: 0.1,
  });

  const copperMaterial = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.9,
    roughness: 0.25,
  });

  const lensGlassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x06b6d4,
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.85,
    thickness: 0.5,
    transparent: true,
    opacity: 0.9,
    reflectivity: 0.9,
  });

  // Animated elements references
  const reactionWheels: THREE.Mesh[] = [];
  const solarWings: THREE.Group[] = [];
  const radiatorLouvers: THREE.Mesh[] = [];
  const rcsPlumes: THREE.Mesh[] = [];
  const heatPipes: THREE.Mesh[] = [];
  let antennaGimbal: THREE.Group | null = null;
  let primaryPowerConduit: THREE.LineSegments | null = null;
  let crossStrapPowerConduit: THREE.LineSegments | null = null;
  let rfWaveBeam: THREE.LineSegments | null = null;
  const statusLeds: { mesh: THREE.Mesh; subsystem: keyof SubsystemHealth }[] = [];

  // ==========================================
  // A. MAIN SPACECRAFT BUS & STRUCTURAL FRAME
  // ==========================================
  const busGroup = new THREE.Group();
  root.add(busGroup);

  // Main core chassis (hexagonal prism/cuboid with beveled corner posts)
  const busWidth = 1.8;
  const busHeight = 2.8;
  const busDepth = 1.8;
  const busBoxGeo = new THREE.BoxGeometry(busWidth, busHeight, busDepth);
  const busBody = new THREE.Mesh(busBoxGeo, goldMliMaterial);
  busBody.castShadow = true;
  busBody.receiveShadow = true;
  busBody.userData = { subsystem: 'obc', name: 'Main Avionics Bus (OBC & PDU)' };
  busGroup.add(busBody);
  subsystemMeshes.set('obc', busBody);

  // Titanium Structural Corner Rails & Edge Brackets
  const railGeo = new THREE.CylinderGeometry(0.045, 0.045, busHeight + 0.1, 8);
  const corners = [
    [-busWidth / 2, 0, -busDepth / 2],
    [busWidth / 2, 0, -busDepth / 2],
    [-busWidth / 2, 0, busDepth / 2],
    [busWidth / 2, 0, busDepth / 2],
  ];

  corners.forEach(([cx, cy, cz]) => {
    const rail = new THREE.Mesh(railGeo, titaniumMaterial);
    rail.position.set(cx, cy, cz);
    rail.castShadow = true;
    busGroup.add(rail);

    // End cap brackets with bolt detailing
    [-1, 1].forEach((dir) => {
      const capGeo = new THREE.BoxGeometry(0.12, 0.08, 0.12);
      const cap = new THREE.Mesh(capGeo, darkStructuralMaterial);
      cap.position.set(cx, (busHeight / 2) * dir, cz);
      busGroup.add(cap);
    });
  });

  // Avionics Access Service Panels & Umbilical Cavity
  const hatchGeo = new THREE.BoxGeometry(1.0, 0.7, 0.04);
  const hatch = new THREE.Mesh(hatchGeo, titaniumMaterial);
  hatch.position.set(0, 0.4, busDepth / 2 + 0.02);
  hatch.userData = { subsystem: 'obc', name: 'Avionics Service Hatch' };
  busGroup.add(hatch);

  // Power Distribution Unit (PDU) Module Enclosure on side face
  const pduGeo = new THREE.BoxGeometry(0.8, 0.6, 0.15);
  const pdu = new THREE.Mesh(pduGeo, darkStructuralMaterial);
  pdu.position.set(busWidth / 2 + 0.08, -0.4, 0);
  pdu.userData = { subsystem: 'power', name: 'Primary Power Distribution Unit (PDU)' };
  busGroup.add(pdu);
  subsystemMeshes.set('power', pdu);

  // Cable Harness Raceways (Braided wire harness bundles running along chassis)
  const harnessCoords = [
    new THREE.Vector3(busWidth / 2 + 0.06, -0.4, 0.4),
    new THREE.Vector3(busWidth / 2 + 0.06, 0.8, 0.4),
    new THREE.Vector3(0.5, busHeight / 2 + 0.05, 0.2),
  ];
  const harnessCurve = new THREE.CatmullRomCurve3(harnessCoords);
  const harnessGeo = new THREE.TubeGeometry(harnessCurve, 16, 0.025, 8, false);
  const harnessMesh = new THREE.Mesh(harnessGeo, copperMaterial);
  busGroup.add(harnessMesh);

  // Subsystem LED Status Indicators (Tiny holographic diagnostic lights)
  const ledConfigs: { pos: [number, number, number]; sub: keyof SubsystemHealth }[] = [
    { pos: [busWidth / 2 + 0.16, -0.3, 0.2], sub: 'power' },
    { pos: [busWidth / 2 + 0.16, -0.5, 0.2], sub: 'power' },
    { pos: [-busWidth / 2 - 0.08, 0.8, 0], sub: 'thermal' },
    { pos: [0, busHeight / 2 + 0.2, 0.5], sub: 'communication' },
    { pos: [0.3, -busHeight / 2 - 0.05, 0], sub: 'attitude' },
    { pos: [0, 0.65, busDepth / 2 + 0.06], sub: 'obc' },
  ];

  ledConfigs.forEach((cfg) => {
    const ledGeo = new THREE.SphereGeometry(0.035, 12, 12);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(...cfg.pos);
    busGroup.add(led);
    statusLeds.push({ mesh: led, subsystem: cfg.sub });
  });

  // ==========================================
  // B. THERMAL CONTROL & ARTICULATING LOUVERS
  // ==========================================
  const thermalGroup = new THREE.Group();
  thermalGroup.position.set(-busWidth / 2 - 0.02, 0, 0);
  thermalGroup.userData = { subsystem: 'thermal', name: 'Thermal Control Radiator Louvers' };
  busGroup.add(thermalGroup);
  subsystemMeshes.set('thermal', thermalGroup);

  // Optical Solar Reflector (OSR) Quartz Mirror Base Panel
  const radiatorBaseGeo = new THREE.BoxGeometry(0.05, 2.2, 1.5);
  const radiatorBase = new THREE.Mesh(radiatorBaseGeo, opticalSolarReflectorMaterial);
  radiatorBase.position.set(-0.025, 0, 0);
  radiatorBase.castShadow = true;
  thermalGroup.add(radiatorBase);

  // Heat pipe cooling loops (Ammonia conduits that glow under heat)
  for (let y = -0.8; y <= 0.8; y += 0.32) {
    const pipeGeo = new THREE.CylinderGeometry(0.018, 0.018, 1.35, 8);
    const pipeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x0284c7,
      emissiveIntensity: 0.1,
    });
    const pipe = new THREE.Mesh(pipeGeo, pipeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(-0.06, y, 0);
    thermalGroup.add(pipe);
    heatPipes.push(pipe);
  }

  // Motorized Radiator Louver Blades (Physically articulate/open during thermal reconfiguration!)
  const numLouvers = 7;
  const louverWidth = 1.3;
  const louverHeight = 0.22;
  const louverGeo = new THREE.BoxGeometry(0.015, louverHeight, louverWidth);

  for (let i = 0; i < numLouvers; i++) {
    const louver = new THREE.Mesh(louverGeo, opticalSolarReflectorMaterial);
    const louverY = -0.75 + i * 0.25;
    louver.position.set(-0.09, louverY, 0);
    louver.rotation.z = 0; // Starts closed (flush)
    thermalGroup.add(louver);
    radiatorLouvers.push(louver);
  }

  // ==========================================
  // C. DUAL ARTICULATED SOLAR ARRAY WINGS
  // ==========================================
  solarWings.length = 0;
  [-1, 1].forEach((side) => {
    const wingPivot = new THREE.Group();
    wingPivot.position.set(side * (busWidth / 2 + 0.15), 0, 0);
    busGroup.add(wingPivot);
    solarWings.push(wingPivot);

    // Solar Array Drive Mechanism (SADM) gimbal collar
    const sadmGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.35, 16);
    const sadm = new THREE.Mesh(sadmGeo, titaniumMaterial);
    sadm.rotation.z = Math.PI / 2;
    sadm.position.set(side * 0.1, 0, 0);
    wingPivot.add(sadm);

    // Structural boom truss
    const boomGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8);
    const boom = new THREE.Mesh(boomGeo, chromeMaterial);
    boom.rotation.z = Math.PI / 2;
    boom.position.set(side * 0.45, 0, 0);
    wingPivot.add(boom);

    // 3 Linked Solar Panels per wing
    const panelCount = 3;
    const panelW = 1.4;
    const panelH = 1.8;
    const panelThickness = 0.045;

    for (let p = 0; p < panelCount; p++) {
      const panelGroup = new THREE.Group();
      const posX = side * (0.8 + p * (panelW + 0.09) + panelW / 2);
      panelGroup.position.set(posX, 0, 0);

      // Solar Cell Front Face
      const cellFaceGeo = new THREE.BoxGeometry(panelW, panelH, panelThickness);
      const cellFace = new THREE.Mesh(cellFaceGeo, solarCellMaterial);
      cellFace.castShadow = true;
      cellFace.receiveShadow = true;
      cellFace.userData = { subsystem: 'power', name: `Photovoltaic Wing ${side > 0 ? 'Port' : 'Starboard'} Panel ${p + 1}` };
      panelGroup.add(cellFace);

      // Carbon-Fiber Composite Backing
      const backingGeo = new THREE.BoxGeometry(panelW + 0.04, panelH + 0.04, 0.02);
      const backing = new THREE.Mesh(backingGeo, darkStructuralMaterial);
      backing.position.set(0, 0, -panelThickness / 2 - 0.012);
      panelGroup.add(backing);

      // Mechanical Hinge Joint between panels
      if (p < panelCount - 1) {
        const hingeGeo = new THREE.CylinderGeometry(0.035, 0.035, panelH * 0.7, 8);
        const hinge = new THREE.Mesh(hingeGeo, titaniumMaterial);
        hinge.position.set(side * (panelW / 2 + 0.045), 0, 0);
        panelGroup.add(hinge);

        // Gold earthing wire loop
        const loopGeo = new THREE.TorusGeometry(0.04, 0.01, 8, 16, Math.PI);
        const wire = new THREE.Mesh(loopGeo, copperMaterial);
        wire.position.set(side * (panelW / 2 + 0.045), 0.5, 0);
        wire.rotation.z = Math.PI / 2;
        panelGroup.add(wire);
      }

      wingPivot.add(panelGroup);
    }
  });

  // ==========================================
  // D. HIGH-GAIN & AUXILIARY ANTENNA SUBSYSTEM
  // ==========================================
  const antennaRoot = new THREE.Group();
  antennaRoot.position.set(0, busHeight / 2 + 0.1, 0.2);
  busGroup.add(antennaRoot);
  subsystemMeshes.set('communication', antennaRoot);

  // 2-Axis Motorized Gimbal Base (Articulates during communication recovery!)
  antennaGimbal = new THREE.Group();
  antennaRoot.add(antennaGimbal);

  const gimbalBaseGeo = new THREE.CylinderGeometry(0.25, 0.28, 0.3, 16);
  const gimbalBase = new THREE.Mesh(gimbalBaseGeo, titaniumMaterial);
  antennaGimbal.add(gimbalBase);

  // High-Gain Parabolic Reflector Dish (Composite backing + gold mesh front)
  const dishRadius = 1.15;
  const dishGeo = new THREE.SphereGeometry(dishRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 3.2);
  const dishFront = new THREE.Mesh(dishGeo, goldMliMaterial);
  dishFront.rotation.x = Math.PI - 0.25;
  dishFront.position.set(0, 0.65, 0.25);
  dishFront.castShadow = true;
  dishFront.userData = { subsystem: 'communication', name: 'X-Band Parabolic High-Gain Dish' };
  antennaGimbal.add(dishFront);

  // Carbon-composite back shell of dish
  const dishBackGeo = new THREE.SphereGeometry(dishRadius + 0.02, 32, 16, 0, Math.PI * 2, 0, Math.PI / 3.2);
  const dishBack = new THREE.Mesh(dishBackGeo, darkStructuralMaterial);
  dishBack.rotation.x = Math.PI - 0.25;
  dishBack.position.set(0, 0.65, 0.25);
  antennaGimbal.add(dishBack);

  // Tripod Struts & Cassegrain Sub-Reflector
  const strutGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.75, 8);
  [-0.3, 0.3].forEach((sx) => {
    const strut = new THREE.Mesh(strutGeo, chromeMaterial);
    strut.position.set(sx, 0.95, 0.45);
    strut.rotation.z = sx > 0 ? 0.35 : -0.35;
    strut.rotation.x = -0.25;
    antennaGimbal.add(strut);
  });

  const subReflectorGeo = new THREE.ConeGeometry(0.12, 0.15, 12);
  const subReflector = new THREE.Mesh(subReflectorGeo, chromeMaterial);
  subReflector.position.set(0, 1.25, 0.65);
  subReflector.rotation.x = Math.PI - 0.25;
  antennaGimbal.add(subReflector);

  // Auxiliary S-Band Patch Phased Array
  const patchArrayGeo = new THREE.BoxGeometry(0.4, 0.4, 0.05);
  const patchArray = new THREE.Mesh(patchArrayGeo, titaniumMaterial);
  patchArray.position.set(busWidth / 2 + 0.03, 0.9, 0);
  patchArray.rotation.y = Math.PI / 2;
  patchArray.userData = { subsystem: 'communication', name: 'S-Band Microstrip Phased Array' };
  busGroup.add(patchArray);

  // Omnidirectional Low-Gain Helical Antenna
  const helixMastGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8);
  const helixMast = new THREE.Mesh(helixMastGeo, chromeMaterial);
  helixMast.position.set(-busWidth / 2 - 0.1, busHeight / 2 + 0.4, -busDepth / 2);
  busGroup.add(helixMast);

  const helixCoilGeo = new THREE.TorusGeometry(0.08, 0.012, 8, 24, Math.PI * 4);
  const helixCoil = new THREE.Mesh(helixCoilGeo, copperMaterial);
  helixCoil.position.set(-busWidth / 2 - 0.1, busHeight / 2 + 0.85, -busDepth / 2);
  helixCoil.rotation.x = Math.PI / 2;
  busGroup.add(helixCoil);

  // RF Communication Wave Pulse Lines
  const waveCoords: number[] = [];
  for (let r = 0.6; r <= 5.0; r += 0.8) {
    const segs = 32;
    for (let s = 0; s < segs; s++) {
      const a1 = (s / segs) * Math.PI * 2;
      const a2 = ((s + 1) / segs) * Math.PI * 2;
      waveCoords.push(
        r * Math.cos(a1), 2.2 + r * 0.4, 0.6 + r * Math.sin(a1),
        r * Math.cos(a2), 2.2 + r * 0.4, 0.6 + r * Math.sin(a2)
      );
    }
  }
  const waveGeo = new THREE.BufferGeometry();
  waveGeo.setAttribute('position', new THREE.Float32BufferAttribute(waveCoords, 3));
  const waveMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.45,
  });
  rfWaveBeam = new THREE.LineSegments(waveGeo, waveMat);
  antennaGimbal.add(rfWaveBeam);

  // ==========================================
  // E. ATTITUDE CONTROL (ADCS) & REACTION WHEELS
  // ==========================================
  const adcsGroup = new THREE.Group();
  adcsGroup.position.set(0, -0.7, 0);
  adcsGroup.userData = { subsystem: 'attitude', name: 'Attitude Determination and Control System (ADCS)' };
  busGroup.add(adcsGroup);
  subsystemMeshes.set('attitude', adcsGroup);

  // 4 Reaction Wheels (3 orthogonal + 1 skewed pyramid configuration)
  const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.12, 32);
  const wheelConfigs = [
    { pos: [0.55, 0, 0], rot: [0, 0, Math.PI / 2], name: 'RW-1 (X-Axis Flywheel)' },
    { pos: [0, 0.55, 0], rot: [0, 0, 0], name: 'RW-2 (Y-Axis Flywheel)' },
    { pos: [0, 0, 0.55], rot: [Math.PI / 2, 0, 0], name: 'RW-3 (Z-Axis Flywheel)' },
    { pos: [0.38, 0.38, 0.38], rot: [Math.PI / 4, Math.PI / 4, 0], name: 'RW-4 (Skewed Redundant Pyramid Flywheel)' },
  ];

  wheelConfigs.forEach((cfg) => {
    const wheelHousingGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.16, 24);
    const housing = new THREE.Mesh(wheelHousingGeo, darkStructuralMaterial);
    housing.position.set(...(cfg.pos as [number, number, number]));
    housing.rotation.set(...(cfg.rot as [number, number, number]));
    adcsGroup.add(housing);

    const wheel = new THREE.Mesh(wheelGeo, chromeMaterial);
    wheel.position.set(...(cfg.pos as [number, number, number]));
    wheel.rotation.set(...(cfg.rot as [number, number, number]));
    wheel.userData = { name: cfg.name };
    adcsGroup.add(wheel);
    reactionWheels.push(wheel);
  });

  // 3-Axis Magnetorquer Coils along chassis rails
  const magnetorquerGeo = new THREE.CylinderGeometry(0.022, 0.022, 1.6, 8);
  const magnetorquerX = new THREE.Mesh(magnetorquerGeo, copperMaterial);
  magnetorquerX.rotation.z = Math.PI / 2;
  magnetorquerX.position.set(0, -1.3, 0.88);
  busGroup.add(magnetorquerX);

  // Dual Star Tracker Optical Heads (Long conical baffles with lens optics)
  [-0.68, 0.68].forEach((tx, idx) => {
    const trackerGroup = new THREE.Group();
    trackerGroup.position.set(tx, 1.2, -busDepth / 2 - 0.05);
    trackerGroup.rotation.x = -Math.PI / 3;
    trackerGroup.userData = { subsystem: 'sensors', name: `Star Tracker Optical Head #${idx + 1}` };

    const baffleGeo = new THREE.CylinderGeometry(0.14, 0.08, 0.45, 16, 1, true);
    const baffle = new THREE.Mesh(baffleGeo, darkStructuralMaterial);
    trackerGroup.add(baffle);

    const trackerLensGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.02, 16);
    const trackerLens = new THREE.Mesh(trackerLensGeo, lensGlassMaterial);
    trackerLens.position.set(0, -0.2, 0);
    trackerGroup.add(trackerLens);

    busGroup.add(trackerGroup);
    if (idx === 0) subsystemMeshes.set('sensors', trackerGroup);
  });

  // Coarse Sun Sensors on top corners
  [[-0.85, 1.35, 0.85], [0.85, 1.35, 0.85]].forEach(([sx, sy, sz]) => {
    const sunSensorGeo = new THREE.BoxGeometry(0.1, 0.08, 0.1);
    const sunSensor = new THREE.Mesh(sunSensorGeo, titaniumMaterial);
    sunSensor.position.set(sx, sy, sz);
    busGroup.add(sunSensor);
  });

  // ==========================================
  // F. SCIENCE PAYLOAD: MULTISPECTRAL TELESCOPE
  // ==========================================
  const payloadGroup = new THREE.Group();
  payloadGroup.position.set(0, -busHeight / 2 - 0.05, 0); // Pointing Nadir
  busGroup.add(payloadGroup);

  // Telescope Optical Barrel with MLI Insulation Wrap
  const barrelGeo = new THREE.CylinderGeometry(0.42, 0.52, 1.3, 24);
  const barrel = new THREE.Mesh(barrelGeo, darkStructuralMaterial);
  barrel.castShadow = true;
  barrel.userData = { subsystem: 'sensors', name: 'Multispectral Earth Observation Optical Payload' };
  payloadGroup.add(barrel);

  // Front Aperture Lens with Realistic Optical Coating
  const apertureRimGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.08, 24);
  const apertureRim = new THREE.Mesh(apertureRimGeo, chromeMaterial);
  apertureRim.position.set(0, -0.65, 0);
  payloadGroup.add(apertureRim);

  const mainLensGeo = new THREE.CylinderGeometry(0.39, 0.39, 0.03, 24);
  const mainLens = new THREE.Mesh(mainLensGeo, lensGlassMaterial);
  mainLens.position.set(0, -0.66, 0);
  payloadGroup.add(mainLens);

  // ==========================================
  // G. PROPULSION & RCS REACTION CONTROL JETS
  // ==========================================
  const thrusterClusters = [
    [busWidth / 2 + 0.06, -1.3, busDepth / 2 + 0.06],
    [-busWidth / 2 - 0.06, -1.3, busDepth / 2 + 0.06],
    [busWidth / 2 + 0.06, -1.3, -busDepth / 2 - 0.06],
    [-busWidth / 2 - 0.06, -1.3, -busDepth / 2 - 0.06],
  ];

  thrusterClusters.forEach(([cx, cy, cz]) => {
    const podGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    const pod = new THREE.Mesh(podGeo, titaniumMaterial);
    pod.position.set(cx, cy, cz);
    busGroup.add(pod);

    // Dual divergent titanium rocket nozzles
    [-0.04, 0.04].forEach((off) => {
      const nozzleGeo = new THREE.ConeGeometry(0.04, 0.14, 12);
      const nozzle = new THREE.Mesh(nozzleGeo, titaniumMaterial);
      nozzle.position.set(cx + off, cy - 0.12, cz);
      nozzle.rotation.x = Math.PI;
      busGroup.add(nozzle);

      // Gas plume particle mesh
      const plumeGeo = new THREE.ConeGeometry(0.12, 0.6, 12);
      const plumeMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0,
      });
      const plume = new THREE.Mesh(plumeGeo, plumeMat);
      plume.position.set(cx + off, cy - 0.42, cz);
      plume.rotation.x = Math.PI;
      busGroup.add(plume);
      rcsPlumes.push(plume);
    });
  });

  // ==========================================
  // H. PHYSICAL RECONFIGURATION POWER CONDUITS
  // ==========================================
  // 1. Primary Power Conduit (String #2 routing directly to PDU Channel A)
  const primaryConduitPoints = [
    new THREE.Vector3(busWidth / 2 + 0.1, 0, 0),
    new THREE.Vector3(busWidth / 2 + 0.15, -0.4, 0),
    new THREE.Vector3(busWidth / 2 + 0.15, -0.4, -0.2),
  ];
  const primaryConduitGeo = new THREE.BufferGeometry().setFromPoints(primaryConduitPoints);
  const primaryConduitMat = new THREE.LineBasicMaterial({
    color: 0x10b981,
    linewidth: 3,
    transparent: true,
    opacity: 0.8,
  });
  primaryPowerConduit = new THREE.LineSegments(primaryConduitGeo, primaryConduitMat);
  busGroup.add(primaryPowerConduit);

  // 2. Secondary Cross-Strap Conduit (Engaged during Autonomous Reconfiguration!)
  const crossStrapPoints = [
    new THREE.Vector3(-busWidth / 2 - 0.1, 0, 0),
    new THREE.Vector3(-busWidth / 2 - 0.15, -0.4, 0),
    new THREE.Vector3(0, -0.9, -busDepth / 2 - 0.1),
    new THREE.Vector3(busWidth / 2 + 0.15, -0.4, 0),
  ];
  const crossStrapGeo = new THREE.BufferGeometry().setFromPoints(crossStrapPoints);
  const crossStrapMat = new THREE.LineBasicMaterial({
    color: 0x06b6d4,
    linewidth: 3,
    transparent: true,
    opacity: 0.15,
  });
  crossStrapPowerConduit = new THREE.LineSegments(crossStrapGeo, crossStrapMat);
  busGroup.add(crossStrapPowerConduit);

  // ==========================================
  // UPDATE LOOP & PHYSICAL RECONFIGURATION LOGIC
  // ==========================================
  let louverTargetAngle = 0;
  let louverCurrentAngle = 0;
  let targetGimbalPitch = 0;
  let currentGimbalPitch = 0;
  let sadmSpinSpeed = 0.05;
  let isRcsFiring = false;
  let isCrossStrapActive = false;
  let activeFaultState: FaultType = 'none';
  let pipelineStageState: PipelineStage = 'IDLE';

  const update = (delta: number, elapsed: number) => {
    const clampedDelta = Math.min(delta, 0.05);

    // 1. Reaction wheels spin dynamically
    reactionWheels.forEach((wheel, idx) => {
      const speed = idx === 1 && activeFaultState === 'attitude' ? 4.8 : 2.2;
      wheel.rotation.y += speed * clampedDelta;
    });

    // 2. Solar array wing micro-tracking
    solarWings.forEach((wing, idx) => {
      wing.rotation.x = Math.sin(elapsed * 0.15 + idx) * 0.02;
    });

    // 3. Smooth louver physical articulation (opening/closing on hinges)
    louverCurrentAngle = THREE.MathUtils.lerp(louverCurrentAngle, louverTargetAngle, 0.05);
    radiatorLouvers.forEach((louver) => {
      louver.rotation.z = louverCurrentAngle;
    });

    // 4. Smooth antenna dish gimbal re-pointing
    currentGimbalPitch = THREE.MathUtils.lerp(currentGimbalPitch, targetGimbalPitch, 0.05);
    if (antennaGimbal) {
      antennaGimbal.rotation.z = currentGimbalPitch;
    }

    // 5. Dynamic RF wave beam expansion
    if (rfWaveBeam) {
      const cycle = (elapsed * 1.5) % 1.5;
      const s = 1.0 + cycle * 0.45;
      rfWaveBeam.scale.set(s, s, s);
    }

    // 6. RCS thruster plumes - smooth controlled firing pulse
    rcsPlumes.forEach((p) => {
      const mat = p.material as THREE.MeshBasicMaterial;
      if (isRcsFiring) {
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 12);
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, pulse > 0.3 ? 0.75 : 0, 0.2);
      } else {
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0, 0.15);
      }
    });

    // 7. Power conduit energy pulse animation
    if (primaryPowerConduit && crossStrapPowerConduit) {
      const pMat = primaryPowerConduit.material as THREE.LineBasicMaterial;
      const cMat = crossStrapPowerConduit.material as THREE.LineBasicMaterial;

      if (isCrossStrapActive) {
        cMat.opacity = 0.65 + 0.35 * Math.sin(elapsed * 6);
        cMat.color.setHex(0x10b981);
        pMat.opacity = 0.15;
      } else {
        cMat.opacity = 0.15;
      }
    }

    // 8. Smooth continuous spacecraft attitude orientation
    if (activeFaultState === 'attitude') {
      if (pipelineStageState === 'RECONFIGURE' || pipelineStageState === 'VERIFY') {
        busGroup.rotation.x = THREE.MathUtils.lerp(busGroup.rotation.x, 0, 0.03);
        busGroup.rotation.z = THREE.MathUtils.lerp(busGroup.rotation.z, 0, 0.03);
      } else if (pipelineStageState === 'RECOVERED') {
        busGroup.rotation.x = THREE.MathUtils.lerp(busGroup.rotation.x, 0, 0.05);
        busGroup.rotation.z = THREE.MathUtils.lerp(busGroup.rotation.z, 0, 0.05);
      } else {
        busGroup.rotation.x = Math.sin(elapsed * 1.2) * 0.14;
        busGroup.rotation.z = Math.cos(elapsed * 0.9) * 0.16;
      }
    } else {
      busGroup.rotation.x = THREE.MathUtils.lerp(busGroup.rotation.x, Math.sin(elapsed * 0.25) * 0.015, 0.04);
      busGroup.rotation.z = THREE.MathUtils.lerp(busGroup.rotation.z, Math.cos(elapsed * 0.2) * 0.012, 0.04);
    }
  };

  const setFaultAndReconfiguration = (
    fault: FaultType,
    stage: PipelineStage,
    health: SubsystemHealth,
    telemetry: { coreTemp: number; attitudeError: number; busVoltage: number; commMargin: number; powerMargin: number }
  ) => {
    activeFaultState = fault;
    pipelineStageState = stage;
    // A. Update Status LEDs
    statusLeds.forEach(({ mesh, subsystem }) => {
      const h = health[subsystem];
      const mat = mesh.material as THREE.MeshBasicMaterial;
      if (h === 'critical') mat.color.setHex(0xef4444); // Red
      else if (h === 'degraded') mat.color.setHex(0xf59e0b); // Amber
      else if (h === 'reconfigured') mat.color.setHex(0x06b6d4); // Cyan
      else mat.color.setHex(0x10b981); // Green nominal
    });

    // B. Power Fault & Reconfiguration
    if (fault === 'power') {
      if (stage === 'RECONFIGURE' || stage === 'VERIFY' || stage === 'RECOVERED') {
        // Safe configuration active: cross-strap engaged!
        isCrossStrapActive = true;
      } else {
        isCrossStrapActive = false;
        if (primaryPowerConduit) {
          (primaryPowerConduit.material as THREE.LineBasicMaterial).color.setHex(0xef4444);
        }
      }
    } else {
      isCrossStrapActive = stage === 'RECOVERED' && health.power === 'reconfigured';
      if (primaryPowerConduit) {
        (primaryPowerConduit.material as THREE.LineBasicMaterial).color.setHex(0x10b981);
        (primaryPowerConduit.material as THREE.LineBasicMaterial).opacity = 0.8;
      }
    }

    // C. Thermal Fault & Reconfiguration (Louver Blade Articulation)
    if (fault === 'thermal') {
      if (stage === 'RECONFIGURE' || stage === 'VERIFY' || stage === 'RECOVERED') {
        // Louvers open wide to 60° (Math.PI / 3) to radiate heat to deep space!
        louverTargetAngle = Math.PI / 3;
        heatPipes.forEach((hp) => {
          const mat = hp.material as THREE.MeshStandardMaterial;
          mat.emissive.setHex(0x0284c7);
          mat.emissiveIntensity = 0.4;
        });
      } else {
        // Louvers stuck closed, heat pipes glowing red
        louverTargetAngle = 0;
        heatPipes.forEach((hp) => {
          const mat = hp.material as THREE.MeshStandardMaterial;
          mat.emissive.setHex(0xef4444);
          mat.emissiveIntensity = 0.9;
        });
      }
    } else {
      louverTargetAngle = 0.1; // Baseline nominal slight ventilation
      heatPipes.forEach((hp) => {
        const mat = hp.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(0x0284c7);
        mat.emissiveIntensity = 0.1;
      });
    }

    // D. Communication Fault & Reconfiguration (Gimbal Re-pointing)
    if (fault === 'communication') {
      if (stage === 'RECONFIGURE' || stage === 'VERIFY' || stage === 'RECOVERED') {
        targetGimbalPitch = 0; // Aligned perfectly with Earth boresight!
        if (rfWaveBeam) {
          (rfWaveBeam.material as THREE.LineBasicMaterial).color.setHex(0x10b981);
          (rfWaveBeam.material as THREE.LineBasicMaterial).opacity = 0.6;
        }
      } else {
        targetGimbalPitch = 0.38; // Mispointed off-axis!
        if (rfWaveBeam) {
          (rfWaveBeam.material as THREE.LineBasicMaterial).color.setHex(0xef4444);
          (rfWaveBeam.material as THREE.LineBasicMaterial).opacity = 0.15;
        }
      }
    } else {
      targetGimbalPitch = 0;
      if (rfWaveBeam) {
        (rfWaveBeam.material as THREE.LineBasicMaterial).color.setHex(0x38bdf8);
        (rfWaveBeam.material as THREE.LineBasicMaterial).opacity = 0.4;
      }
    }

    // E. Attitude Fault & Reconfiguration (RCS Gas Plumes)
    if (fault === 'attitude') {
      isRcsFiring = stage !== 'RECOVERED';
    } else {
      isRcsFiring = false;
    }
  };

  const dispose = () => {
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  };

  return {
    group: root,
    update,
    setFaultAndReconfiguration,
    dispose,
    subsystemMeshes,
  };
}
