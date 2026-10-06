import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SatelliteTextureGenerator } from '../../utils/satelliteTextures';
import { FaultType, PipelineStage, SubsystemHealth } from '../../types/satellite';

export interface GlbSatelliteHandles {
  group: THREE.Group;
  isLoaded: boolean;
  loadProgress: number; // 0 - 100
  update: (delta: number, elapsed: number) => void;
  setFaultAndReconfiguration: (
    fault: FaultType,
    stage: PipelineStage,
    health: SubsystemHealth,
    telemetry: { coreTemp: number; attitudeError: number; busVoltage: number; commMargin: number; powerMargin: number }
  ) => void;
  dispose: () => void;
  subsystemNodes: Map<string, THREE.Object3D>;
}

export function loadGlbSatelliteModel(
  glbUrl = '/models/satellite.glb',
  onLoadCallback?: () => void,
  onErrorCallback?: (err: unknown) => void
): GlbSatelliteHandles {
  const root = new THREE.Group();
  root.name = 'GLB_Satellite_Root';

  const subsystemNodes = new Map<string, THREE.Object3D>();
  let isLoaded = false;
  let loadProgress = 0;

  // Single cached PBR Procedural Textures to prevent shader recompilation flicker
  const { map: goldMliMap, bumpMap: goldMliBump } = SatelliteTextureGenerator.createGoldMliTexture();
  const solarCellMap = SatelliteTextureGenerator.createSolarCellTexture();
  const carbonMap = SatelliteTextureGenerator.createCarbonFiberTexture();
  const titaniumMap = SatelliteTextureGenerator.createMachinedTitaniumTexture();

  // Cached materials
  const mliMaterial = new THREE.MeshStandardMaterial({
    map: goldMliMap,
    bumpMap: goldMliBump,
    bumpScale: 0.05,
    metalness: 0.9,
    roughness: 0.28,
    color: 0xffffff,
  });

  const solarMaterial = new THREE.MeshStandardMaterial({
    map: solarCellMap,
    metalness: 0.82,
    roughness: 0.16,
    color: 0xffffff,
    emissive: 0x021330,
    emissiveIntensity: 0.25,
  });

  const carbonMaterial = new THREE.MeshStandardMaterial({
    map: carbonMap,
    metalness: 0.45,
    roughness: 0.55,
    color: 0x1e293b,
  });

  const titaniumMaterial = new THREE.MeshStandardMaterial({
    map: titaniumMap,
    metalness: 0.85,
    roughness: 0.35,
    color: 0x94a3b8,
  });

  const radiatorMaterial = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.95,
    roughness: 0.08,
  });

  // Dynamic animation node references
  const reactionWheels: THREE.Object3D[] = [];
  const radiatorLouvers: THREE.Object3D[] = [];
  const solarWings: THREE.Object3D[] = [];
  const rcsPlumes: THREE.Mesh[] = [];
  const heatPipes: THREE.Mesh[] = [];
  let highGainDishGroup: THREE.Object3D | null = null;
  let primaryPowerConduit: THREE.LineSegments | null = null;
  let crossStrapPowerConduit: THREE.LineSegments | null = null;
  let rfWaveBeam: THREE.LineSegments | null = null;
  const statusLeds: { mesh: THREE.Mesh; subsystem: keyof SubsystemHealth }[] = [];

  // Reconfiguration State Variables (smoothly interpolated, no random flips!)
  let louverTargetAngle = 0.05;
  let louverCurrentAngle = 0.05;
  let targetGimbalPitch = 0;
  let currentGimbalPitch = 0;
  let isRcsFiring = false;
  let isCrossStrapActive = false;
  let activeFaultState: FaultType = 'none';
  let pipelineStageState: PipelineStage = 'IDLE';

  // Loader Setup
  const loader = new GLTFLoader();

  loader.load(
    glbUrl,
    (gltf) => {
      const glbScene = gltf.scene;
      glbScene.name = 'GLB_Imported_Mesh';
      root.add(glbScene);

      // Assign cached PBR materials and bind subsystem references
      glbScene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          const matName = child.material?.name || '';
          const nodeName = child.name || '';

          if (matName.includes('GoldMLI') || nodeName.includes('MLI') || nodeName.includes('GoldMesh')) {
            child.material = mliMaterial;
          } else if (matName.includes('SolarCells') || nodeName.includes('Cells')) {
            child.material = solarMaterial;
          } else if (matName.includes('CarbonFiber') || nodeName.includes('Backing') || nodeName.includes('Housing')) {
            child.material = carbonMaterial;
          } else if (matName.includes('Titanium') || nodeName.includes('Rail') || nodeName.includes('Hatch') || nodeName.includes('Gimbal')) {
            child.material = titaniumMaterial;
          } else if (matName.includes('RadiatorOSR') || nodeName.includes('Louver') || nodeName.includes('Radiator')) {
            child.material = radiatorMaterial;
          }

          if (nodeName.includes('LouverFin')) {
            radiatorLouvers.push(child);
          } else if (nodeName.startsWith('ReactionWheel_') && !nodeName.includes('_Rim') && !nodeName.includes('_Bracket')) {
            reactionWheels.push(child);
          } else if (nodeName.startsWith('HeatPipe_')) {
            heatPipes.push(child);
          }
        }

        const nName = child.name || '';
        if (nName === 'MainBus') {
          subsystemNodes.set('obc', child);
          child.userData = { subsystem: 'obc', name: 'Main Avionics Bus (OBC & PDU)' };
        } else if (nName === 'SolarWing_Port' || nName === 'SolarWing_Starboard') {
          solarWings.push(child);
          if (!subsystemNodes.has('power')) {
            subsystemNodes.set('power', child);
            child.userData = { subsystem: 'power', name: 'Photovoltaic Solar Wing Arrays' };
          }
        } else if (nName === 'HighGainAntenna') {
          highGainDishGroup = child;
          subsystemNodes.set('communication', child);
          child.userData = { subsystem: 'communication', name: 'High-Gain Parabolic Reflector Dish' };
        } else if (nName === 'ThermalControl') {
          subsystemNodes.set('thermal', child);
          child.userData = { subsystem: 'thermal', name: 'Thermal Radiator Louvers & Heat Pipes' };
        } else if (nName === 'AttitudeControl') {
          subsystemNodes.set('attitude', child);
          child.userData = { subsystem: 'attitude', name: 'ADCS Reaction Wheels & Inertial Sensors' };
        } else if (nName === 'SciencePayload') {
          subsystemNodes.set('sensors', child);
          child.userData = { subsystem: 'sensors', name: 'Multispectral Earth Observation Optical Payload' };
        }
      });

      attachDynamicEffects(glbScene);

      isLoaded = true;
      loadProgress = 100;
      if (onLoadCallback) onLoadCallback();
    },
    (xhr) => {
      if (xhr.total > 0) {
        loadProgress = Math.round((xhr.loaded / xhr.total) * 100);
      }
    },
    (error) => {
      console.warn('GLTFLoader error loading satellite.glb, utilizing procedural fallback:', error);
      if (onErrorCallback) onErrorCallback(error);
    }
  );

  function attachDynamicEffects(parent: THREE.Object3D) {
    // 1. Primary & Secondary Cross-Strap Power Conduits
    const primaryPoints = [
      new THREE.Vector3(1.02, 0, 0),
      new THREE.Vector3(1.06, -0.4, 0),
      new THREE.Vector3(1.06, -0.4, 0),
      new THREE.Vector3(1.06, -0.4, -0.2),
    ];
    const primaryGeo = new THREE.BufferGeometry().setFromPoints(primaryPoints);
    const primaryMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 3, transparent: true, opacity: 0.8 });
    primaryPowerConduit = new THREE.LineSegments(primaryGeo, primaryMat);
    parent.add(primaryPowerConduit);

    const crossStrapPoints = [
      new THREE.Vector3(-1.02, 0, 0),
      new THREE.Vector3(-1.06, -0.4, 0),
      new THREE.Vector3(0, -0.9, -1.02),
      new THREE.Vector3(1.06, -0.4, 0),
    ];
    const crossStrapGeo = new THREE.BufferGeometry().setFromPoints(crossStrapPoints);
    const crossStrapMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, linewidth: 3, transparent: true, opacity: 0.2 });
    crossStrapPowerConduit = new THREE.LineSegments(crossStrapGeo, crossStrapMat);
    parent.add(crossStrapPowerConduit);

    // 2. High-Gain Antenna RF Wave Pulse Lines
    const waveCoords: number[] = [];
    for (let r = 0.6; r <= 4.8; r += 0.8) {
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
    const waveMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 });
    rfWaveBeam = new THREE.LineSegments(waveGeo, waveMat);
    parent.add(rfWaveBeam);

    // 3. RCS Thruster Gas Plumes
    const plumePositions = [
      [0.96, -1.45, 0.96],
      [-0.96, -1.45, 0.96],
      [0.96, -1.45, -0.96],
      [-0.96, -1.45, -0.96],
    ];
    plumePositions.forEach(([x, y, z]) => {
      const plumeGeo = new THREE.ConeGeometry(0.12, 0.6, 12);
      const plumeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0 });
      const plume = new THREE.Mesh(plumeGeo, plumeMat);
      plume.position.set(x, y, z);
      plume.rotation.x = Math.PI;
      parent.add(plume);
      rcsPlumes.push(plume);
    });

    // 4. Subsystem Status LEDs
    const ledLocations: { pos: [number, number, number]; sub: keyof SubsystemHealth }[] = [
      { pos: [1.02, -0.3, 0.2], sub: 'power' },
      { pos: [1.02, -0.5, 0.2], sub: 'power' },
      { pos: [-0.98, 0.8, 0], sub: 'thermal' },
      { pos: [0, 1.6, 0.5], sub: 'communication' },
      { pos: [0.35, -1.3, 0], sub: 'attitude' },
      { pos: [0, 0.65, 0.95], sub: 'obc' },
    ];
    ledLocations.forEach((cfg) => {
      const ledGeo = new THREE.SphereGeometry(0.04, 12, 12);
      const ledMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.set(...cfg.pos);
      parent.add(led);
      statusLeds.push({ mesh: led, subsystem: cfg.sub });
    });
  }

  // Animation Update Loop (smooth, physics-based, ZERO glitching!)
  const update = (delta: number, elapsed: number) => {
    const clampedDelta = Math.min(delta, 0.05);

    // A. Reaction Wheels dynamic spin
    reactionWheels.forEach((wheel, idx) => {
      const speed = idx === 1 && activeFaultState === 'attitude' ? 4.8 : 2.2;
      wheel.rotation.y += speed * clampedDelta;
    });

    // B. Solar Array Wing micro-tracking
    solarWings.forEach((wing, idx) => {
      wing.rotation.x = Math.sin(elapsed * 0.15 + idx) * 0.02;
    });

    // C. Radiator Louver articulation (opening & closing on hinges)
    louverCurrentAngle = THREE.MathUtils.lerp(louverCurrentAngle, louverTargetAngle, 0.05);
    radiatorLouvers.forEach((louver) => {
      louver.rotation.z = louverCurrentAngle;
    });

    // D. High-Gain Antenna motorized gimbal re-pointing
    currentGimbalPitch = THREE.MathUtils.lerp(currentGimbalPitch, targetGimbalPitch, 0.05);
    if (highGainDishGroup) {
      highGainDishGroup.rotation.z = currentGimbalPitch;
    }

    // E. RF Wave pulse expansion
    if (rfWaveBeam) {
      const cycle = (elapsed * 1.5) % 1.5;
      const s = 1.0 + cycle * 0.45;
      rfWaveBeam.scale.set(s, s, s);
    }

    // F. RCS Thruster Plumes - smooth sinusoidal bursts, NO Math.random flicker!
    rcsPlumes.forEach((p) => {
      const mat = p.material as THREE.MeshBasicMaterial;
      if (isRcsFiring) {
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 12);
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, pulse > 0.3 ? 0.75 : 0, 0.2);
      } else {
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0, 0.15);
      }
    });

    // G. Power conduit dynamic electricity flow
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

    // H. Smooth continuous spacecraft attitude orientation
    if (activeFaultState === 'attitude') {
      if (pipelineStageState === 'RECONFIGURE' || pipelineStageState === 'VERIFY') {
        // Stabilizing
        root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, 0, 0.03);
        root.rotation.z = THREE.MathUtils.lerp(root.rotation.z, 0, 0.03);
      } else if (pipelineStageState === 'RECOVERED') {
        // Nominal
        root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, 0, 0.05);
        root.rotation.z = THREE.MathUtils.lerp(root.rotation.z, 0, 0.05);
      } else {
        // Smooth harmonic tumble (NOT jerky random noise!)
        root.rotation.x = Math.sin(elapsed * 1.2) * 0.14;
        root.rotation.z = Math.cos(elapsed * 0.9) * 0.16;
      }
    } else {
      // Gentle orbital micro-motion
      root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, Math.sin(elapsed * 0.25) * 0.015, 0.04);
      root.rotation.z = THREE.MathUtils.lerp(root.rotation.z, Math.cos(elapsed * 0.2) * 0.012, 0.04);
    }
  };

  // Physical Reconfiguration Controller
  const setFaultAndReconfiguration = (
    fault: FaultType,
    stage: PipelineStage,
    health: SubsystemHealth,
    telemetry: { coreTemp: number; attitudeError: number; busVoltage: number; commMargin: number; powerMargin: number }
  ) => {
    activeFaultState = fault;
    pipelineStageState = stage;

    // 1. Status LEDs
    statusLeds.forEach(({ mesh, subsystem }) => {
      const h = health[subsystem];
      const mat = mesh.material as THREE.MeshBasicMaterial;
      if (h === 'critical') mat.color.setHex(0xef4444);
      else if (h === 'degraded') mat.color.setHex(0xf59e0b);
      else if (h === 'reconfigured') mat.color.setHex(0x06b6d4);
      else mat.color.setHex(0x10b981);
    });

    // 2. Power Fault & Reconfiguration
    if (fault === 'power') {
      if (stage === 'RECONFIGURE' || stage === 'VERIFY' || stage === 'RECOVERED') {
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

    // 3. Thermal Fault & Reconfiguration (Louver Articulation)
    if (fault === 'thermal') {
      if (stage === 'RECONFIGURE' || stage === 'VERIFY' || stage === 'RECOVERED') {
        louverTargetAngle = Math.PI / 3; // 60 degrees open!
        heatPipes.forEach((hp) => {
          const mat = hp.material as THREE.MeshStandardMaterial;
          mat.emissive.setHex(0x0284c7);
          mat.emissiveIntensity = 0.4;
        });
      } else {
        louverTargetAngle = 0; // Stuck closed
        heatPipes.forEach((hp) => {
          const mat = hp.material as THREE.MeshStandardMaterial;
          mat.emissive.setHex(0xef4444);
          mat.emissiveIntensity = 0.9;
        });
      }
    } else {
      louverTargetAngle = 0.05;
      heatPipes.forEach((hp) => {
        const mat = hp.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(0x0284c7);
        mat.emissiveIntensity = 0.1;
      });
    }

    // 4. Communication Fault & Reconfiguration (Gimbal Re-aiming)
    if (fault === 'communication') {
      if (stage === 'RECONFIGURE' || stage === 'VERIFY' || stage === 'RECOVERED') {
        targetGimbalPitch = 0;
        if (rfWaveBeam) {
          (rfWaveBeam.material as THREE.LineBasicMaterial).color.setHex(0x10b981);
          (rfWaveBeam.material as THREE.LineBasicMaterial).opacity = 0.6;
        }
      } else {
        targetGimbalPitch = 0.38;
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

    // 5. Attitude Fault & Reconfiguration (RCS Gas Plumes)
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
      }
    });
    mliMaterial.dispose();
    solarMaterial.dispose();
    carbonMaterial.dispose();
    titaniumMaterial.dispose();
    radiatorMaterial.dispose();
    goldMliMap.dispose();
    goldMliBump.dispose();
    solarCellMap.dispose();
    carbonMap.dispose();
    titaniumMap.dispose();
  };

  return {
    group: root,
    isLoaded,
    loadProgress,
    update,
    setFaultAndReconfiguration,
    dispose,
    subsystemNodes,
  };
}
