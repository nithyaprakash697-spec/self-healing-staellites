import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { FaultType, PipelineStage, SubsystemHealth } from '../../types/satellite';
import { buildSatelliteModel, SatelliteModelHandles } from './SatelliteModel';
import { loadGlbSatelliteModel, GlbSatelliteHandles } from './GlbSatelliteModel';
import { 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Layers, 
  Eye, 
  Camera, 
  Compass, 
  Box
} from 'lucide-react';

interface SatelliteSceneProps {
  pipelineStage: PipelineStage;
  activeFault: FaultType;
  subsystemHealth: SubsystemHealth;
  activeCameraTarget: 'orbit' | 'diagnostic' | 'cinematic' | 'recovery' | 'wide' | 'bus' | 'solar' | 'antenna' | 'adcs' | 'thermal' | 'sensor' | 'obc';
  onSelectSubsystem?: (subsystem: keyof SubsystemHealth) => void;
  telemetry?: { coreTemp: number; attitudeError: number; busVoltage: number; commMargin: number; powerMargin: number };
  interactiveMode?: boolean;
}

export const SatelliteScene: React.FC<SatelliteSceneProps> = ({
  pipelineStage,
  activeFault,
  subsystemHealth,
  activeCameraTarget,
  onSelectSubsystem,
  telemetry = { coreTemp: 21.4, attitudeError: 0.03, busVoltage: 28.2, commMargin: 14.2, powerMargin: 48.0 },
  interactiveMode = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [inspectedPart, setInspectedPart] = useState<string | null>(null);
  const [wireframeMode, setWireframeMode] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [currentCameraMode, setCurrentCameraMode] = useState<string>(activeCameraTarget);
  const [isGlbActive, setIsGlbActive] = useState<boolean>(true);

  // Stable refs for callbacks and mode flags to prevent scene re-initialization
  const onSelectSubsystemRef = useRef(onSelectSubsystem);
  onSelectSubsystemRef.current = onSelectSubsystem;

  const interactiveModeRef = useRef(interactiveMode);
  interactiveModeRef.current = interactiveMode;

  // Mutable refs to keep animation loop decoupled from React render churn
  const stateRef = useRef({
    activeFault,
    pipelineStage,
    subsystemHealth,
    telemetry,
  });

  // Always keep stateRef up-to-date synchronously with latest props
  stateRef.current = {
    activeFault,
    pipelineStage,
    subsystemHealth,
    telemetry,
  };

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const satelliteHandleRef = useRef<SatelliteModelHandles | GlbSatelliteHandles | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);

  // Smooth Camera Coordinates (Continuous Angle Tracking)
  const cameraSphericalRef = useRef({ radius: 9.5, theta: 0.8, phi: 1.15 });
  const targetCameraSphericalRef = useRef({ radius: 9.5, theta: 0.8, phi: 1.15 });
  const targetLookAtRef = useRef(new THREE.Vector3(0, 0, 0));
  const currentLookAtRef = useRef(new THREE.Vector3(0, 0, 0));
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const reqAnimFrameRef = useRef<number | null>(null);

  // Smooth Camera Preset Transition with Shortest Angular Distance (Zero Spun-Out Glitches!)
  const applyCameraPreset = useCallback((preset: string) => {
    setCurrentCameraMode(preset);

    let baseRadius = 9.5;
    let baseTheta = 0.8;
    let basePhi = 1.15;
    let lookTarget = new THREE.Vector3(0, 0, 0);
    let shouldAutoRotate = false;

    switch (preset) {
      case 'diagnostic':
        baseRadius = 5.8; baseTheta = 0.4; basePhi = 1.2;
        lookTarget.set(0, 0.2, 0);
        break;
      case 'cinematic':
        baseRadius = 10.5; baseTheta = -1.2; basePhi = 1.05;
        shouldAutoRotate = true;
        break;
      case 'wide':
        baseRadius = 15.0; baseTheta = 1.2; basePhi = 1.1;
        lookTarget.set(0, -0.5, 0);
        break;
      case 'recovery':
        baseRadius = 6.8; baseTheta = -0.6; basePhi = 1.3;
        lookTarget.set(0, 0.3, 0);
        break;
      case 'bus':
        baseRadius = 5.5; baseTheta = 0.5; basePhi = 1.3;
        break;
      case 'solar':
        baseRadius = 7.2; baseTheta = 1.55; basePhi = 1.25;
        lookTarget.set(1.6, 0, 0);
        break;
      case 'antenna':
        baseRadius = 5.2; baseTheta = -0.85; basePhi = 0.75;
        lookTarget.set(0, 1.4, 0.35);
        break;
      case 'adcs':
        baseRadius = 4.8; baseTheta = 2.1; basePhi = 1.8;
        lookTarget.set(0, -0.8, 0);
        break;
      case 'thermal':
        baseRadius = 5.2; baseTheta = -1.5; basePhi = 1.3;
        lookTarget.set(-1.0, 0, 0);
        break;
      case 'sensor':
        baseRadius = 5.0; baseTheta = 0.1; basePhi = 1.6;
        lookTarget.set(0, -1.2, 0);
        break;
      case 'orbit':
      default:
        baseRadius = 9.5; baseTheta = 0.8; basePhi = 1.15;
        shouldAutoRotate = true;
        break;
    }

    setAutoRotate(shouldAutoRotate);
    targetLookAtRef.current.copy(lookTarget);

    // Calculate modular shortest angular distance (prevents camera from spinning 360 degrees!)
    const currentTheta = cameraSphericalRef.current.theta;
    const diff = (baseTheta - currentTheta) % (Math.PI * 2);
    const shortestDiff = ((diff + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

    targetCameraSphericalRef.current.radius = baseRadius;
    targetCameraSphericalRef.current.theta = currentTheta + shortestDiff;
    targetCameraSphericalRef.current.phi = basePhi;
  }, []);

  // Sync external camera target changes
  const lastPresetRef = useRef(activeCameraTarget);
  useEffect(() => {
    if (lastPresetRef.current !== activeCameraTarget) {
      lastPresetRef.current = activeCameraTarget;
      applyCameraPreset(activeCameraTarget);
    }
  }, [activeCameraTarget, applyCameraPreset]);

  // Main Three.js Scene Setup
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x020617, 0.0018);

    // 2. Camera with tuned near/far planes
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 800);
    cameraRef.current = camera;
    camera.position.set(7, 5, 8);

    // 3. Renderer with LOGARITHMIC DEPTH BUFFER (Eliminates ALL Z-fighting!)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      logarithmicDepthBuffer: true,
      powerPreference: 'high-performance',
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 4. Starfield Background
    const starCount = 3500;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const dist = 280 + Math.random() * 220;
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);

      starPos[i * 3] = dist * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = dist * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = dist * Math.cos(phi);

      const roll = Math.random();
      if (roll > 0.85) {
        starCol[i * 3] = 0.65; starCol[i * 3 + 1] = 0.85; starCol[i * 3 + 2] = 1.0;
      } else if (roll < 0.12) {
        starCol[i * 3] = 1.0; starCol[i * 3 + 1] = 0.78; starCol[i * 3 + 2] = 0.55;
      } else {
        starCol[i * 3] = 0.95; starCol[i * 3 + 1] = 0.98; starCol[i * 3 + 2] = 1.0;
      }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 5. Realistic Distant Earth in Background
    const earthGroup = new THREE.Group();
    earthGroup.position.set(-42, -50, -78);
    scene.add(earthGroup);

    const earthGeo = new THREE.SphereGeometry(52, 64, 64);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.6,
      metalness: 0.1,
      emissive: 0x0a2540,
      emissiveIntensity: 0.15,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMeshRef.current = earthMesh;
    earthGroup.add(earthMesh);

    // Cloud Layer with proper 1.2 unit radial clearance
    const cloudGeo = new THREE.SphereGeometry(53.2, 48, 48);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.4,
      roughness: 0.9,
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    cloudsMeshRef.current = cloudMesh;
    earthGroup.add(cloudMesh);

    // Atmospheric Rim Glow
    const atmosGeo = new THREE.SphereGeometry(54.4, 48, 48);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide,
    });
    earthGroup.add(new THREE.Mesh(atmosGeo, atmosMat));

    // Orbital Path Trajectory Curve Ring
    const orbitCurve = new THREE.EllipseCurve(0, 0, 14.5, 14.5, 0, Math.PI * 2, false, 0);
    const orbitPoints = orbitCurve.getPoints(120);
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(
      orbitPoints.map((p) => new THREE.Vector3(p.x, -2.8, p.y))
    );
    const orbitMat = new THREE.LineBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.35,
    });
    scene.add(new THREE.Line(orbitGeo, orbitMat));

    // 6. Cinematic Lighting
    const sunKeyLight = new THREE.DirectionalLight(0xfffbf2, 3.2);
    sunKeyLight.position.set(22, 16, 14);
    sunKeyLight.castShadow = true;
    sunKeyLight.shadow.mapSize.width = 2048;
    sunKeyLight.shadow.mapSize.height = 2048;
    sunKeyLight.shadow.bias = -0.0004;
    scene.add(sunKeyLight);

    const earthAlbedoLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    earthAlbedoLight.position.set(-18, -18, -25);
    scene.add(earthAlbedoLight);

    const rimEdgeLight = new THREE.DirectionalLight(0x818cf8, 0.45);
    rimEdgeLight.position.set(0, 10, -20);
    scene.add(rimEdgeLight);

    const ambientLight = new THREE.AmbientLight(0x0f172a, 0.55);
    scene.add(ambientLight);

    // 7. BUILD HIGH-FIDELITY GLB SATELLITE ASSET
    let satHandles: SatelliteModelHandles | GlbSatelliteHandles;
    try {
      satHandles = loadGlbSatelliteModel(
        '/models/satellite.glb',
        () => {
          setIsGlbActive(true);
        },
        () => {
          setIsGlbActive(false);
        }
      );
    } catch {
      satHandles = buildSatelliteModel();
      setIsGlbActive(false);
    }
    satelliteHandleRef.current = satHandles;
    scene.add(satHandles.group);

    // 8. ANIMATION LOOP (Smooth, Rock-Solid, ZERO Camera or Physics Glitches!)
    const clock = new THREE.Clock();

    const animate = () => {
      reqAnimFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Earth rotation
      if (earthMeshRef.current) earthMeshRef.current.rotation.y = elapsed * 0.012;
      if (cloudsMeshRef.current) cloudsMeshRef.current.rotation.y = elapsed * 0.018;

      // Update satellite model animations & physics
      satHandles.update(delta, elapsed);
      satHandles.setFaultAndReconfiguration(
        stateRef.current.activeFault,
        stateRef.current.pipelineStage,
        stateRef.current.subsystemHealth,
        stateRef.current.telemetry
      );

      // Camera auto-rotation if idle/cinematic
      if (autoRotate && !isDraggingRef.current) {
        targetCameraSphericalRef.current.theta += 0.0018;
      }

      // Smooth Damped Camera Interpolation
      const cur = cameraSphericalRef.current;
      const tgt = targetCameraSphericalRef.current;
      cur.radius = THREE.MathUtils.lerp(cur.radius, tgt.radius, 0.05);
      cur.theta = THREE.MathUtils.lerp(cur.theta, tgt.theta, 0.05);
      cur.phi = THREE.MathUtils.lerp(cur.phi, tgt.phi, 0.05);

      // Smooth look-at target interpolation
      currentLookAtRef.current.lerp(targetLookAtRef.current, 0.05);

      // Compute camera position
      const cx = currentLookAtRef.current.x + cur.radius * Math.sin(cur.phi) * Math.sin(cur.theta);
      const cy = currentLookAtRef.current.y + cur.radius * Math.cos(cur.phi);
      const cz = currentLookAtRef.current.z + cur.radius * Math.sin(cur.phi) * Math.cos(cur.theta);
      camera.position.set(cx, cy, cz);
      camera.lookAt(currentLookAtRef.current);

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Listener
    const onResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 10. Interactive Controls Handlers
    const dom = renderer.domElement;

    const onMouseDown = (e: MouseEvent) => {
      if (!interactiveMode) return;
      isDraggingRef.current = true;
      hasDraggedRef.current = false;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !interactiveMode) return;
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasDraggedRef.current = true;
      }
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      targetCameraSphericalRef.current.theta -= dx * 0.006;
      targetCameraSphericalRef.current.phi = THREE.MathUtils.clamp(
        targetCameraSphericalRef.current.phi - dy * 0.006,
        0.15,
        Math.PI - 0.15
      );
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (!interactiveModeRef.current) return;
      e.preventDefault();
      targetCameraSphericalRef.current.radius = THREE.MathUtils.clamp(
        targetCameraSphericalRef.current.radius + e.deltaY * 0.006,
        3.5,
        22.0
      );
    };

    // Touch handlers
    let touchStartDist = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (!interactiveModeRef.current) return;
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        hasDraggedRef.current = false;
        prevMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        touchStartDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!interactiveModeRef.current) return;
      if (e.touches.length === 1 && isDraggingRef.current) {
        const dx = e.touches[0].clientX - prevMouseRef.current.x;
        const dy = e.touches[0].clientY - prevMouseRef.current.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          hasDraggedRef.current = true;
        }
        prevMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

        targetCameraSphericalRef.current.theta -= dx * 0.006;
        targetCameraSphericalRef.current.phi = THREE.MathUtils.clamp(
          targetCameraSphericalRef.current.phi - dy * 0.006,
          0.15,
          Math.PI - 0.15
        );
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const deltaDist = touchStartDist - dist;
        touchStartDist = dist;
        targetCameraSphericalRef.current.radius = THREE.MathUtils.clamp(
          targetCameraSphericalRef.current.radius + deltaDist * 0.025,
          3.5,
          22.0
        );
      }
    };

    const onTouchEnd = () => {
      isDraggingRef.current = false;
    };

    // Raycast Object Click Inspection (Guarded against drag false triggers!)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (e: MouseEvent) => {
      if (hasDraggedRef.current) return;
      if (!satelliteHandleRef.current || !cameraRef.current || !rendererRef.current) return;

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(satelliteHandleRef.current.group.children, true);

      if (intersects.length > 0) {
        let currentObj: THREE.Object3D | null = intersects[0].object;
        while (currentObj && !currentObj.userData.subsystem && currentObj.parent !== satelliteHandleRef.current.group) {
          currentObj = currentObj.parent;
        }

        if (currentObj && currentObj.userData.subsystem) {
          setInspectedPart(currentObj.userData.name || currentObj.userData.subsystem);
          if (onSelectSubsystemRef.current) {
            onSelectSubsystemRef.current(currentObj.userData.subsystem as keyof SubsystemHealth);
          }
        }
      }
    };

    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('touchstart', onTouchStart, { passive: true });
    dom.addEventListener('touchmove', onTouchMove, { passive: true });
    dom.addEventListener('touchend', onTouchEnd);
    dom.addEventListener('click', onClick);

    return () => {
      if (reqAnimFrameRef.current) cancelAnimationFrame(reqAnimFrameRef.current);
      window.removeEventListener('resize', onResize);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('touchstart', onTouchStart);
      dom.removeEventListener('touchmove', onTouchMove);
      dom.removeEventListener('touchend', onTouchEnd);
      dom.removeEventListener('click', onClick);

      satHandles.dispose();
      if (rendererRef.current && rendererRef.current.domElement) {
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Wireframe toggle effect
  useEffect(() => {
    if (!satelliteHandleRef.current) return;
    satelliteHandleRef.current.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => { m.wireframe = wireframeMode; });
        } else if (child.material) {
          child.material.wireframe = wireframeMode;
        }
      }
    });
  }, [wireframeMode]);

  return (
    <div className="relative w-full h-full min-h-[380px] lg:min-h-[500px] bg-gradient-to-b from-[#020617] via-[#03091e] to-[#040819] overflow-hidden select-none">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Aerospace Telemetry HUD Overlay */}
      <div className="absolute top-3 left-3 pointer-events-none flex flex-col gap-1">
        <div className="flex items-center gap-2 text-[11px] font-mono-code tracking-wider text-cyan-400">
          <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>FUSE-X DIGITAL TWIN // SSO 540KM ORBIT</span>
        </div>
        <div className="text-[10px] font-mono-code text-slate-400 flex items-center gap-2">
          <span>NADIR ACCURACY: {telemetry.attitudeError.toFixed(2)}° · BUS: {telemetry.busVoltage.toFixed(1)}V</span>
          <span className="text-slate-600">·</span>
          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
            <Box className="w-3 h-3 text-cyan-400" />
            {isGlbActive ? 'HIGH-FIDELITY GLB MODEL' : 'PROCEDURAL TWIN'}
          </span>
        </div>
      </div>

      {/* Subsystem Inspection Badge */}
      {inspectedPart && (
        <div className="absolute top-12 left-3 bg-slate-950/90 border border-cyan-500/40 px-3 py-1.5 rounded text-xs font-mono-code text-cyan-200 backdrop-blur shadow-lg flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>INSPECTING: {inspectedPart.toUpperCase()}</span>
          <button
            onClick={() => setInspectedPart(null)}
            className="text-slate-400 hover:text-white ml-2 text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* Subsystem Physical Fault Warning Banner */}
      {activeFault !== 'none' && (
        <div className="absolute top-3 right-3 pointer-events-none">
          <div className="bg-rose-950/85 border border-rose-500/70 px-3 py-1.5 rounded text-xs font-mono-code text-rose-300 flex items-center gap-2 shadow-xl animate-pulse backdrop-blur">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="font-semibold uppercase tracking-wide">
              {activeFault === 'stress' ? 'SEVERE STRESS FAULT (EXP B)' : activeFault === 'unrecoverable_stress' ? 'CRITICAL CASCADING STRESS FAULT' : `${activeFault.toUpperCase()} FAULT ACTIVE`}
            </span>
          </div>
        </div>
      )}

      {/* Cinematic Camera & Viewport Toolbar */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
        {/* Cinematic & Diagnostic Camera Mode Selectors */}
        <div className="flex items-center gap-1 bg-slate-950/85 border border-slate-800/90 p-1 rounded-lg backdrop-blur text-xs">
          <span className="text-[10px] font-mono-code text-slate-500 px-1 hidden sm:inline flex items-center gap-1">
            <Camera className="w-3 h-3 text-cyan-400" /> CAM:
          </span>
          {[
            { id: 'orbit', label: 'Orbit' },
            { id: 'cinematic', label: 'Cinematic' },
            { id: 'diagnostic', label: 'Diagnostic' },
            { id: 'solar', label: 'Solar' },
            { id: 'antenna', label: 'Antenna' },
            { id: 'adcs', label: 'ADCS' },
            { id: 'thermal', label: 'Thermal' },
            { id: 'wide', label: 'Wide' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => applyCameraPreset(mode.id)}
              className={`px-2 py-1 rounded text-[11px] font-mono-code transition-colors ${
                currentCameraMode === mode.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Viewport Utilities (Zoom, Wireframe, Auto-rotate, Reset) */}
        <div className="flex items-center gap-1 bg-slate-950/85 border border-slate-800/90 p-1 rounded-lg backdrop-blur text-xs">
          <button
            onClick={() => {
              targetCameraSphericalRef.current.radius = Math.max(3.5, targetCameraSphericalRef.current.radius - 1.8);
            }}
            title="Zoom In"
            className="p-1 text-slate-400 hover:text-cyan-400 rounded transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              targetCameraSphericalRef.current.radius = Math.min(22.0, targetCameraSphericalRef.current.radius + 1.8);
            }}
            title="Zoom Out"
            className="p-1 text-slate-400 hover:text-cyan-400 rounded transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            title={autoRotate ? 'Pause cinematic rotation' : 'Enable cinematic rotation'}
            className={`p-1 rounded transition-colors ${autoRotate ? 'text-cyan-400 bg-cyan-950/60' : 'text-slate-400 hover:text-white'}`}
          >
            <Compass className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setWireframeMode(!wireframeMode)}
            title="Toggle Structural Wireframe"
            className={`p-1 rounded transition-colors ${wireframeMode ? 'text-cyan-400 bg-cyan-950/60' : 'text-slate-400 hover:text-cyan-400'}`}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => applyCameraPreset('orbit')}
            title="Reset Camera"
            className="p-1 text-slate-400 hover:text-cyan-400 rounded transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
