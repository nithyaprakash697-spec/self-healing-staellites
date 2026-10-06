import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'fs';
import path from 'path';

// Polyfill FileReader for Node.js
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    constructor() {
      this.result = null;
      this.onloadend = null;
    }
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        if (this.onloadend) this.onloadend();
      });
    }
  };
}

const outputDir = path.resolve(process.cwd(), 'public', 'models');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const root = new THREE.Group();
root.name = 'FUSE_X_Satellite';

// High-Fidelity PBR Aerospace Materials with proper depth writing
const goldMliMaterial = new THREE.MeshStandardMaterial({
  color: 0xd4a017,
  metalness: 0.9,
  roughness: 0.28,
  name: 'Mat_GoldMLI',
});

const titaniumMaterial = new THREE.MeshStandardMaterial({
  color: 0x94a3b8,
  metalness: 0.85,
  roughness: 0.35,
  name: 'Mat_Titanium',
});

const darkCarbonMaterial = new THREE.MeshStandardMaterial({
  color: 0x1e293b,
  metalness: 0.45,
  roughness: 0.55,
  name: 'Mat_CarbonFiber',
});

const solarCellMaterial = new THREE.MeshStandardMaterial({
  color: 0x072b61,
  metalness: 0.82,
  roughness: 0.16,
  emissive: 0x021330,
  emissiveIntensity: 0.25,
  name: 'Mat_SolarCells',
});

const radiatorMaterial = new THREE.MeshStandardMaterial({
  color: 0xf8fafc,
  metalness: 0.95,
  roughness: 0.08,
  name: 'Mat_RadiatorOSR',
});

const chromeMaterial = new THREE.MeshStandardMaterial({
  color: 0xe2e8f0,
  metalness: 0.98,
  roughness: 0.12,
  name: 'Mat_Chrome',
});

// A. MAIN BUS
const busGroup = new THREE.Group();
busGroup.name = 'MainBus';
root.add(busGroup);

const busBoxGeo = new THREE.BoxGeometry(1.8, 2.8, 1.8);
const busBody = new THREE.Mesh(busBoxGeo, goldMliMaterial);
busBody.name = 'BusBody_MLI';
busGroup.add(busBody);

// Titanium Structural Rails (Positioned cleanly at corners with clear 0.03 offset to prevent Z-fighting)
const railGeo = new THREE.CylinderGeometry(0.045, 0.045, 2.88, 8);
const cornerPositions = [
  [-0.93, 0, -0.93],
  [0.93, 0, -0.93],
  [-0.93, 0, 0.93],
  [0.93, 0, 0.93],
];
cornerPositions.forEach(([x, y, z], idx) => {
  const rail = new THREE.Mesh(railGeo, titaniumMaterial);
  rail.name = `FrameRail_${idx + 1}`;
  rail.position.set(x, y, z);
  busGroup.add(rail);

  [-1, 1].forEach((dir) => {
    const capGeo = new THREE.BoxGeometry(0.12, 0.08, 0.12);
    const cap = new THREE.Mesh(capGeo, darkCarbonMaterial);
    cap.name = `RailCap_${idx + 1}_${dir > 0 ? 'Top' : 'Bottom'}`;
    cap.position.set(x, 1.44 * dir, z);
    busGroup.add(cap);
  });
});

// Avionics Service Hatch
const hatchGeo = new THREE.BoxGeometry(1.0, 0.7, 0.06);
const hatch = new THREE.Mesh(hatchGeo, titaniumMaterial);
hatch.name = 'AvionicsServiceHatch';
hatch.position.set(0, 0.4, 0.93);
busGroup.add(hatch);

// PDU Module
const pduGeo = new THREE.BoxGeometry(0.8, 0.6, 0.16);
const pdu = new THREE.Mesh(pduGeo, darkCarbonMaterial);
pdu.name = 'PDU_Module';
pdu.position.set(0.98, -0.4, 0);
busGroup.add(pdu);

// B. THERMAL CONTROL & RADIATOR FINS (Clear layer separation: base -> pipes -> louvers)
const thermalGroup = new THREE.Group();
thermalGroup.name = 'ThermalControl';
thermalGroup.position.set(-0.93, 0, 0);
root.add(thermalGroup);

// Radiator base panel
const radiatorBaseGeo = new THREE.BoxGeometry(0.05, 2.2, 1.5);
const radiatorBase = new THREE.Mesh(radiatorBaseGeo, radiatorMaterial);
radiatorBase.name = 'RadiatorBasePanel';
radiatorBase.position.set(-0.025, 0, 0);
thermalGroup.add(radiatorBase);

// Heat pipes (at x = -0.065)
for (let i = -0.8; i <= 0.8; i += 0.32) {
  const hpGeo = new THREE.CylinderGeometry(0.016, 0.016, 1.35, 8);
  const hp = new THREE.Mesh(hpGeo, titaniumMaterial);
  hp.name = `HeatPipe_${Math.round((i + 0.8) * 10)}`;
  hp.rotation.x = Math.PI / 2;
  hp.position.set(-0.065, i, 0);
  thermalGroup.add(hp);
}

// Radiator Louver Fins (at x = -0.11, so they clear heat pipes during rotation)
const louverGroup = new THREE.Group();
louverGroup.name = 'RadiatorLouvers';
thermalGroup.add(louverGroup);

const numLouvers = 7;
for (let i = 0; i < numLouvers; i++) {
  const louverGeo = new THREE.BoxGeometry(0.012, 0.22, 1.3);
  const louver = new THREE.Mesh(louverGeo, radiatorMaterial);
  louver.name = `LouverFin_${i + 1}`;
  louver.position.set(-0.11, -0.75 + i * 0.25, 0);
  louverGroup.add(louver);
}

// C. ARTICULATED SOLAR PANELS (PORT & STARBOARD)
const solarRoot = new THREE.Group();
solarRoot.name = 'SolarPanels';
root.add(solarRoot);

[-1, 1].forEach((side) => {
  const sideName = side > 0 ? 'Port' : 'Starboard';
  const wingGroup = new THREE.Group();
  wingGroup.name = `SolarWing_${sideName}`;
  wingGroup.position.set(side * 1.05, 0, 0);
  solarRoot.add(wingGroup);

  // SADM Gimbal Boom
  const sadmGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.4, 16);
  const sadm = new THREE.Mesh(sadmGeo, titaniumMaterial);
  sadm.name = `SADM_Gimbal_${sideName}`;
  sadm.rotation.z = Math.PI / 2;
  sadm.position.set(side * 0.15, 0, 0);
  wingGroup.add(sadm);

  // 3 Multi-Segment Solar Panels with clean Z separation between front cell and back plate
  for (let p = 0; p < 3; p++) {
    const panelGroup = new THREE.Group();
    panelGroup.name = `PanelSegment_${sideName}_${p + 1}`;
    const posX = side * (0.8 + p * 1.49 + 0.7);
    panelGroup.position.set(posX, 0, 0);

    // Front Solar Cells (centered at z = 0.02, thickness 0.02)
    const cellGeo = new THREE.BoxGeometry(1.4, 1.8, 0.02);
    const cellMesh = new THREE.Mesh(cellGeo, solarCellMaterial);
    cellMesh.name = `Cells_${sideName}_${p + 1}`;
    cellMesh.position.set(0, 0, 0.015);
    panelGroup.add(cellMesh);

    // Carbon Backing Plate (centered at z = -0.02, thickness 0.02 -> 0.01 gap between them, ZERO Z-fighting!)
    const backGeo = new THREE.BoxGeometry(1.42, 1.82, 0.02);
    const backMesh = new THREE.Mesh(backGeo, darkCarbonMaterial);
    backMesh.name = `Backing_${sideName}_${p + 1}`;
    backMesh.position.set(0, 0, -0.015);
    panelGroup.add(backMesh);

    // Hinges between panels
    if (p < 2) {
      const hingeGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.3, 8);
      const hinge = new THREE.Mesh(hingeGeo, titaniumMaterial);
      hinge.name = `Hinge_${sideName}_${p + 1}`;
      hinge.position.set(side * 0.745, 0, 0);
      panelGroup.add(hinge);
    }

    wingGroup.add(panelGroup);
  }
});

// D. HIGH-GAIN & AUXILIARY ANTENNAS
const antennaGroup = new THREE.Group();
antennaGroup.name = 'CommunicationAntennas';
antennaGroup.position.set(0, 1.45, 0.2);
root.add(antennaGroup);

const gimbalBaseGeo = new THREE.CylinderGeometry(0.25, 0.28, 0.3, 16);
const gimbalBase = new THREE.Mesh(gimbalBaseGeo, titaniumMaterial);
gimbalBase.name = 'AntennaGimbalBase';
antennaGroup.add(gimbalBase);

const dishGroup = new THREE.Group();
dishGroup.name = 'HighGainAntenna';
dishGroup.position.set(0, 0.5, 0.2);
antennaGroup.add(dishGroup);

// Parabolic Reflector Dish (Clean concave shell with single back structure to avoid coplanar Z-fighting)
const dishGeo = new THREE.SphereGeometry(1.15, 32, 16, 0, Math.PI * 2, 0, Math.PI / 3.2);
const dishMesh = new THREE.Mesh(dishGeo, goldMliMaterial);
dishMesh.name = 'DishReflector_GoldMesh';
dishMesh.rotation.x = Math.PI - 0.25;
dishGroup.add(dishMesh);

// Dish outer perimeter structural ring
const ringGeo = new THREE.TorusGeometry(1.15 * Math.sin(Math.PI / 3.2), 0.025, 8, 32);
const ringMesh = new THREE.Mesh(ringGeo, darkCarbonMaterial);
ringMesh.name = 'DishPerimeterRing';
ringMesh.rotation.x = -0.25;
ringMesh.position.set(0, 0.15, 0.06);
dishGroup.add(ringMesh);

// Tripod Struts & Sub-Reflector
[-0.3, 0.3].forEach((sx, idx) => {
  const strutGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.75, 8);
  const strut = new THREE.Mesh(strutGeo, chromeMaterial);
  strut.name = `SubReflectorStrut_${idx + 1}`;
  strut.position.set(sx, 0.45, 0.25);
  strut.rotation.z = sx > 0 ? 0.35 : -0.35;
  strut.rotation.x = -0.25;
  dishGroup.add(strut);
});

const subReflectorGeo = new THREE.ConeGeometry(0.12, 0.15, 12);
const subReflector = new THREE.Mesh(subReflectorGeo, chromeMaterial);
subReflector.name = 'SubReflectorHorn';
subReflector.position.set(0, 0.75, 0.45);
subReflector.rotation.x = Math.PI - 0.25;
dishGroup.add(subReflector);

// Auxiliary Patch Phased Array
const patchGeo = new THREE.BoxGeometry(0.4, 0.4, 0.05);
const patch = new THREE.Mesh(patchGeo, titaniumMaterial);
patch.name = 'PatchPhasedArray_SBand';
patch.position.set(0.93, 0.9, 0);
patch.rotation.y = Math.PI / 2;
root.add(patch);

// E. ATTITUDE CONTROL (REACTION WHEELS & STAR TRACKERS)
const adcsGroup = new THREE.Group();
adcsGroup.name = 'AttitudeControl';
adcsGroup.position.set(0, -0.7, 0);
root.add(adcsGroup);

const wheelConfigs = [
  { pos: [0.55, 0, 0], rot: [0, 0, Math.PI / 2], name: 'ReactionWheel_1' },
  { pos: [0, 0.55, 0], rot: [0, 0, 0], name: 'ReactionWheel_2' },
  { pos: [0, 0.55, 0.55], rot: [Math.PI / 2, 0, 0], name: 'ReactionWheel_3' },
  { pos: [0.38, 0.38, 0.38], rot: [Math.PI / 4, Math.PI / 4, 0], name: 'ReactionWheel_4_Skewed' },
];

wheelConfigs.forEach((cfg) => {
  const housingGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.16, 24);
  const housing = new THREE.Mesh(housingGeo, darkCarbonMaterial);
  housing.name = `${cfg.name}_Housing`;
  housing.position.set(...cfg.pos);
  housing.rotation.set(...cfg.rot);
  adcsGroup.add(housing);

  const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.12, 32);
  const wheel = new THREE.Mesh(wheelGeo, chromeMaterial);
  wheel.name = cfg.name;
  wheel.position.set(...cfg.pos);
  wheel.rotation.set(...cfg.rot);
  adcsGroup.add(wheel);
});

// Dual Star Trackers
[-0.68, 0.68].forEach((tx, idx) => {
  const trackerGroup = new THREE.Group();
  trackerGroup.name = `StarTracker_${idx + 1}`;
  trackerGroup.position.set(tx, 1.2, -0.95);
  trackerGroup.rotation.x = -Math.PI / 3;

  const baffleGeo = new THREE.CylinderGeometry(0.14, 0.08, 0.45, 16, 1, true);
  const baffle = new THREE.Mesh(baffleGeo, darkCarbonMaterial);
  baffle.name = `BaffleCone_${idx + 1}`;
  trackerGroup.add(baffle);

  root.add(trackerGroup);
});

// F. MULTISPECTRAL SCIENCE PAYLOAD
const payloadGroup = new THREE.Group();
payloadGroup.name = 'SciencePayload';
payloadGroup.position.set(0, -1.45, 0);
root.add(payloadGroup);

const barrelGeo = new THREE.CylinderGeometry(0.42, 0.52, 1.3, 24);
const barrel = new THREE.Mesh(barrelGeo, darkCarbonMaterial);
barrel.name = 'TelescopeOpticalBarrel';
payloadGroup.add(barrel);

const rimGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.08, 24);
const rim = new THREE.Mesh(rimGeo, chromeMaterial);
rim.name = 'ApertureRim';
rim.position.set(0, -0.65, 0);
payloadGroup.add(rim);

// G. PROPULSION & RCS THRUSTERS
const rcsGroup = new THREE.Group();
rcsGroup.name = 'RCS_Thrusters';
root.add(rcsGroup);

const thrusterLocations = [
  [0.96, -1.3, 0.96],
  [-0.96, -1.3, 0.96],
  [0.96, -1.3, -0.96],
  [-0.96, -1.3, -0.96],
];

thrusterLocations.forEach(([x, y, z], idx) => {
  const podGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
  const pod = new THREE.Mesh(podGeo, titaniumMaterial);
  pod.name = `ThrusterPod_${idx + 1}`;
  pod.position.set(x, y, z);
  rcsGroup.add(pod);

  [-0.04, 0.04].forEach((off, nIdx) => {
    const nozzleGeo = new THREE.ConeGeometry(0.04, 0.14, 12);
    const nozzle = new THREE.Mesh(nozzleGeo, titaniumMaterial);
    nozzle.name = `Nozzle_${idx + 1}_${nIdx + 1}`;
    nozzle.position.set(x + off, y - 0.12, z);
    nozzle.rotation.x = Math.PI;
    rcsGroup.add(nozzle);
  });
});

// EXPORT TO GLB BINARY
const exporter = new GLTFExporter();
exporter.parse(
  root,
  (result) => {
    const outputPath = path.join(outputDir, 'satellite.glb');
    if (result instanceof ArrayBuffer) {
      fs.writeFileSync(outputPath, Buffer.from(result));
      console.log('Successfully generated satellite.glb with zero Z-fighting! Bytes:', result.byteLength);
    } else {
      const outputJson = JSON.stringify(result, null, 2);
      fs.writeFileSync(path.join(outputDir, 'satellite.gltf'), outputJson);
      console.log('Successfully generated satellite.gltf');
    }
  },
  (error) => {
    console.error('An error occurred during GLTF export:', error);
    process.exit(1);
  },
  { binary: true }
);
