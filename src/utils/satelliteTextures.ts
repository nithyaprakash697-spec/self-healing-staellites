import * as THREE from 'three';

// Procedural high-resolution PBR texture generator for aerospace satellite models
export class SatelliteTextureGenerator {
  // 1. Procedural Gold MLI (Multi-Layer Insulation) Foil Texture
  static createGoldMliTexture(): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base amber/gold metallic gradient
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#e5a823');
    grad.addColorStop(0.3, '#d49419');
    grad.addColorStop(0.7, '#f7c34b');
    grad.addColorStop(1, '#c28514');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Procedural foil wrinkles and crinkles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    for (let i = 0; i < 400; i++) {
      ctx.beginPath();
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 2 + Math.random() * 18;
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crease lines
    ctx.strokeStyle = 'rgba(120, 70, 5, 0.25)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 120; i++) {
      ctx.beginPath();
      const x1 = Math.random() * size;
      const y1 = Math.random() * size;
      const len = 15 + Math.random() * 45;
      const angle = Math.random() * Math.PI * 2;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 + Math.cos(angle) * len, y1 + Math.sin(angle) * len);
      ctx.stroke();
    }

    // Thermal blanket quilting stitch marks
    ctx.strokeStyle = 'rgba(255, 230, 160, 0.4)';
    ctx.lineWidth = 0.8;
    const gridSize = 32;
    for (let x = 0; x <= size; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = 0; y <= size; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    // Fastener rivets at quilt intersections
    ctx.fillStyle = '#fff0b3';
    for (let x = 0; x <= size; x += gridSize) {
      for (let y = 0; y <= size; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;

    // Bump Map
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = size;
    bumpCanvas.height = size;
    const bCtx = bumpCanvas.getContext('2d')!;
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, size, size);

    bCtx.strokeStyle = '#202020';
    bCtx.lineWidth = 1.5;
    for (let i = 0; i < 150; i++) {
      bCtx.beginPath();
      const x1 = Math.random() * size;
      const y1 = Math.random() * size;
      const len = 10 + Math.random() * 40;
      const angle = Math.random() * Math.PI * 2;
      bCtx.moveTo(x1, y1);
      bCtx.lineTo(x1 + Math.cos(angle) * len, y1 + Math.sin(angle) * len);
      bCtx.stroke();
    }

    const bumpMap = new THREE.CanvasTexture(bumpCanvas);
    bumpMap.wrapS = THREE.RepeatWrapping;
    bumpMap.wrapT = THREE.RepeatWrapping;

    return { map, bumpMap };
  }

  // 2. High-Efficiency Space Solar Cell Photovoltaic Texture
  static createSolarCellTexture(): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Deep crystalline space blue with subtle antireflective gradient
    const bgGrad = ctx.createLinearGradient(0, 0, size, size);
    bgGrad.addColorStop(0, '#0a224a');
    bgGrad.addColorStop(0.5, '#051838');
    bgGrad.addColorStop(1, '#020f26');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, size, size);

    // Silicon wafer cell borders (4x4 cell matrix per tile)
    const cellW = size / 4;
    const cellH = size / 4;

    ctx.strokeStyle = '#020817';
    ctx.lineWidth = 2.5;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const x = c * cellW;
        const y = r * cellH;

        // Individual cell fill with antireflective violet/cyan sheen
        const cellGrad = ctx.createRadialGradient(
          x + cellW / 2, y + cellH / 2, 5,
          x + cellW / 2, y + cellH / 2, cellW / 1.5
        );
        cellGrad.addColorStop(0, '#103975');
        cellGrad.addColorStop(0.7, '#071d42');
        cellGrad.addColorStop(1, '#030f24');
        ctx.fillStyle = cellGrad;
        ctx.fillRect(x + 1.5, y + 1.5, cellW - 3, cellH - 3);

        // Fine silver conductive grid lines (fingers)
        ctx.strokeStyle = 'rgba(180, 215, 255, 0.45)';
        ctx.lineWidth = 0.6;
        for (let gy = y + 4; gy < y + cellH - 4; gy += 6) {
          ctx.beginPath();
          ctx.moveTo(x + 2, gy);
          ctx.lineTo(x + cellW - 2, gy);
          ctx.stroke();
        }

        // Main primary silver busbars (2 vertical lines per cell)
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x + cellW * 0.33, y + 2);
        ctx.lineTo(x + cellW * 0.33, y + cellH - 2);
        ctx.moveTo(x + cellW * 0.66, y + 2);
        ctx.lineTo(x + cellW * 0.66, y + cellH - 2);
        ctx.stroke();

        // Corner chamfers (clipped cell corners typical of space silicon wafers)
        ctx.fillStyle = '#020817';
        const chamfer = 6;
        // Top-left
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + chamfer, y);
        ctx.lineTo(x, y + chamfer);
        ctx.fill();
        // Top-right
        ctx.beginPath();
        ctx.moveTo(x + cellW, y);
        ctx.lineTo(x + cellW - chamfer, y);
        ctx.lineTo(x + cellW, y + chamfer);
        ctx.fill();
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(x, y + cellH);
        ctx.lineTo(x + chamfer, y + cellH);
        ctx.lineTo(x, y + cellH - chamfer);
        ctx.fill();
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(x + cellW, y + cellH);
        ctx.lineTo(x + cellW - chamfer, y + cellH);
        ctx.lineTo(x + cellW, y + cellH - chamfer);
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  // 3. Carbon-Fiber Composite Twill Weave Texture
  static createCarbonFiberTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, size, size);

    const step = 8;
    for (let x = 0; x < size; x += step) {
      for (let y = 0; y < size; y += step) {
        const isAlt = ((x / step) + (y / step)) % 2 === 0;
        ctx.fillStyle = isAlt ? '#1f2937' : '#0b0f19';
        ctx.fillRect(x, y, step, step);

        ctx.strokeStyle = isAlt ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + step, y + step);
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
  }

  // 4. Aerospace Machined Titanium Panels with Seams and Rivets
  static createMachinedTitaniumTexture(): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Brushed titanium gray
    const grad = ctx.createLinearGradient(0, 0, size, 0);
    grad.addColorStop(0, '#475569');
    grad.addColorStop(0.5, '#64748b');
    grad.addColorStop(1, '#334155');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Micro brush streaks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 600; i++) {
      const y = Math.random() * size;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    // Structural panel seam lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(16, 16, size - 32, size - 32);
    ctx.beginPath();
    ctx.moveTo(size / 2, 16);
    ctx.lineTo(size / 2, size - 16);
    ctx.moveTo(16, size / 2);
    ctx.lineTo(size - 16, size / 2);
    ctx.stroke();

    // Rivet bolts along seams
    ctx.fillStyle = '#cbd5e1';
    for (let x = 24; x < size - 24; x += 28) {
      ctx.beginPath();
      ctx.arc(x, 24, 2, 0, Math.PI * 2);
      ctx.arc(x, size - 24, 2, 0, Math.PI * 2);
      ctx.arc(x, size / 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let y = 24; y < size - 24; y += 28) {
      ctx.beginPath();
      ctx.arc(24, y, 2, 0, Math.PI * 2);
      ctx.arc(size - 24, y, 2, 0, Math.PI * 2);
      ctx.arc(size / 2, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }
}
