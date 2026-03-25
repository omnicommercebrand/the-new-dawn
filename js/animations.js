/* ============================================
   A NEW DAWN — GSAP Visual Animations
   Replaces placeholder images with living,
   breathing sacred geometry + nature visuals
   ============================================ */

// Wait for GSAP + ScrollTrigger to load
function initAnimations() {
  gsap.registerPlugin(ScrollTrigger);

  // --- Shared color palette ---
  const COLORS = {
    gold: '#c9a84c',
    goldLight: '#e4cc7a',
    goldGlow: 'rgba(201, 168, 76, 0.15)',
    dawnRose: '#c47a6e',
    forest: '#132613',
    forestMist: '#1e3a2a',
    canopy: '#2a4f3a',
    warmWhite: '#f5f0e6',
    deepEarth: '#0b1a0b',
  };

  // --- Utility: create canvas inside a container ---
  function createCanvas(container, className) {
    const canvas = document.createElement('canvas');
    canvas.className = className || '';
    canvas.style.cssText = 'width:100%;height:100%;display:block;border-radius:inherit;';
    container.innerHTML = '';
    container.appendChild(canvas);

    function resize() {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      canvas._w = rect.width;
      canvas._h = rect.height;
    }
    resize();
    window.addEventListener('resize', resize);
    return canvas;
  }

  // ============================================
  // 1. HERO BACKGROUND — Aurora particles
  // ============================================
  function heroAurora(container) {
    const canvas = createCanvas(container, 'anim-hero');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let time = 0;

    function initParticles() {
      particles = [];
      const count = Math.min(80, Math.floor(canvas._w * canvas._h / 8000));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas._w,
          y: Math.random() * canvas._h,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.2 - 0.1,
          r: Math.random() * 2 + 0.5,
          alpha: Math.random() * 0.5 + 0.1,
          phase: Math.random() * Math.PI * 2
        });
      }
    }
    initParticles();

    function draw() {
      time += 0.005;
      const w = canvas._w, h = canvas._h;
      ctx.clearRect(0, 0, w, h);

      // Aurora waves
      for (let wave = 0; wave < 3; wave++) {
        ctx.beginPath();
        const baseY = h * (0.3 + wave * 0.15);
        const amp = h * 0.08;
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 4) {
          const y = baseY + Math.sin(x * 0.003 + time * (1 + wave * 0.5) + wave) * amp
                          + Math.sin(x * 0.007 + time * 0.8) * amp * 0.5;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, baseY - amp, 0, h);
        const alpha = 0.03 + wave * 0.01;
        if (wave === 0) {
          grad.addColorStop(0, `rgba(201, 168, 76, ${alpha})`);
          grad.addColorStop(1, 'rgba(201, 168, 76, 0)');
        } else if (wave === 1) {
          grad.addColorStop(0, `rgba(196, 122, 110, ${alpha})`);
          grad.addColorStop(1, 'rgba(196, 122, 110, 0)');
        } else {
          grad.addColorStop(0, `rgba(228, 204, 122, ${alpha})`);
          grad.addColorStop(1, 'rgba(228, 204, 122, 0)');
        }
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Floating particles
      particles.forEach(p => {
        p.x += p.vx + Math.sin(time + p.phase) * 0.15;
        p.y += p.vy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        const flicker = 0.5 + Math.sin(time * 2 + p.phase) * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201, 168, 76, ${p.alpha * flicker})`;
        ctx.fill();
      });

      requestAnimationFrame(draw);
    }
    draw();
  }

  // ============================================
  // 2. FLOWER OF LIFE — Sacred geometry breathe
  // ============================================
  function flowerOfLife(container) {
    const canvas = createCanvas(container);
    const ctx = canvas.getContext('2d');
    let time = 0;

    function draw() {
      time += 0.008;
      const w = canvas._w, h = canvas._h;
      const cx = w / 2, cy = h / 2;
      const baseR = Math.min(w, h) * 0.12;
      ctx.clearRect(0, 0, w, h);

      // Background gradient
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
      bg.addColorStop(0, 'rgba(42, 79, 58, 0.3)');
      bg.addColorStop(1, 'rgba(11, 26, 11, 0.8)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const breathe = 1 + Math.sin(time) * 0.05;
      const r = baseR * breathe;

      // Draw flower of life pattern
      const positions = [{x: 0, y: 0}];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + time * 0.1;
        positions.push({x: Math.cos(angle) * r, y: Math.sin(angle) * r});
      }
      // Second ring
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + Math.PI / 6 + time * 0.1;
        positions.push({x: Math.cos(angle) * r * 1.73, y: Math.sin(angle) * r * 1.73});
      }

      positions.forEach((pos, idx) => {
        const alpha = 0.15 + Math.sin(time * 1.5 + idx * 0.5) * 0.1;
        ctx.beginPath();
        ctx.arc(cx + pos.x, cy + pos.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(201, 168, 76, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Center glow
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.5);
      glow.addColorStop(0, `rgba(201, 168, 76, ${0.1 + Math.sin(time) * 0.05})`);
      glow.addColorStop(1, 'rgba(201, 168, 76, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Outer subtle ring
      ctx.beginPath();
      ctx.arc(cx, cy, r * 3, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(201, 168, 76, ${0.05 + Math.sin(time * 0.5) * 0.03})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      requestAnimationFrame(draw);
    }
    draw();
  }

  // ============================================
  // 3. EARTH WIREFRAME — Spinning globe with ley lines
  // ============================================
  function earthWireframe(container) {
    const canvas = createCanvas(container);
    const ctx = canvas.getContext('2d');
    let time = 0;

    function draw() {
      time += 0.004;
      const w = canvas._w, h = canvas._h;
      const cx = w / 2, cy = h / 2;
      const radius = Math.min(w, h) * 0.32;
      ctx.clearRect(0, 0, w, h);

      // BG
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 2);
      bg.addColorStop(0, 'rgba(30, 58, 42, 0.4)');
      bg.addColorStop(1, 'rgba(11, 26, 11, 0.9)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Globe outline
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(201, 168, 76, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Latitude lines
      for (let lat = -60; lat <= 60; lat += 30) {
        const latRad = (lat * Math.PI) / 180;
        const y = cy - Math.sin(latRad) * radius;
        const r = Math.cos(latRad) * radius;
        ctx.beginPath();
        ctx.ellipse(cx, y, r, r * 0.15, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(201, 168, 76, 0.08)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Longitude lines (rotating)
      for (let lon = 0; lon < 180; lon += 30) {
        const lonRad = (lon * Math.PI) / 180 + time;
        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 2; a += 0.05) {
          const x3d = Math.cos(a) * Math.cos(lonRad);
          const z3d = Math.cos(a) * Math.sin(lonRad);
          const y3d = Math.sin(a);
          // Only draw front-facing
          if (z3d > -0.1) {
            const px = cx + x3d * radius;
            const py = cy - y3d * radius;
            if (a === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
        }
        ctx.strokeStyle = 'rgba(201, 168, 76, 0.1)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Ley line energy points
      const points = [
        {lat: 30, lon: 31 + time * 20},   // Giza
        {lat: -14, lon: -75 + time * 20},  // Machu Picchu
        {lat: 51, lon: -2 + time * 20},    // Stonehenge
        {lat: 27, lon: 86 + time * 20},    // Everest
        {lat: -34, lon: 131 + time * 20},  // Uluru
        {lat: 21, lon: -157 + time * 20},  // Hawaii
      ];

      points.forEach((p, i) => {
        const latRad = (p.lat * Math.PI) / 180;
        const lonRad = (p.lon * Math.PI) / 180;
        const x3d = Math.cos(latRad) * Math.cos(lonRad);
        const z3d = Math.cos(latRad) * Math.sin(lonRad);
        const y3d = Math.sin(latRad);

        if (z3d > 0) {
          const px = cx + x3d * radius;
          const py = cy - y3d * radius;
          const alpha = z3d * 0.8;
          const pulse = 2 + Math.sin(time * 3 + i) * 1.5;

          ctx.beginPath();
          ctx.arc(px, py, pulse, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(201, 168, 76, ${alpha * 0.6})`;
          ctx.fill();

          // Glow
          const g = ctx.createRadialGradient(px, py, 0, px, py, pulse * 4);
          g.addColorStop(0, `rgba(201, 168, 76, ${alpha * 0.2})`);
          g.addColorStop(1, 'rgba(201, 168, 76, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, pulse * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      requestAnimationFrame(draw);
    }
    draw();
  }

  // ============================================
  // 4. SUNRISE — Expanding golden rays
  // ============================================
  function sunriseRays(container) {
    const canvas = createCanvas(container);
    const ctx = canvas.getContext('2d');
    let time = 0;

    function draw() {
      time += 0.006;
      const w = canvas._w, h = canvas._h;
      ctx.clearRect(0, 0, w, h);

      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, 'rgba(11, 26, 11, 0.9)');
      sky.addColorStop(0.5, 'rgba(30, 58, 42, 0.6)');
      sky.addColorStop(0.85, 'rgba(196, 122, 110, 0.15)');
      sky.addColorStop(1, 'rgba(201, 168, 76, 0.1)');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      const sunX = w / 2;
      const sunY = h * 0.78;
      const sunR = Math.min(w, h) * 0.06;

      // Sun rays
      const numRays = 24;
      for (let i = 0; i < numRays; i++) {
        const angle = (i / numRays) * Math.PI - Math.PI; // Only top half
        const rayLen = Math.min(w, h) * (0.5 + Math.sin(time * 2 + i * 0.7) * 0.1);
        const rayWidth = 0.02 + Math.sin(time + i * 0.5) * 0.01;

        ctx.beginPath();
        ctx.moveTo(sunX, sunY);
        ctx.lineTo(
          sunX + Math.cos(angle - rayWidth) * rayLen,
          sunY + Math.sin(angle - rayWidth) * rayLen
        );
        ctx.lineTo(
          sunX + Math.cos(angle + rayWidth) * rayLen,
          sunY + Math.sin(angle + rayWidth) * rayLen
        );
        ctx.closePath();

        const rayGrad = ctx.createLinearGradient(sunX, sunY, sunX + Math.cos(angle) * rayLen, sunY + Math.sin(angle) * rayLen);
        const alpha = 0.04 + Math.sin(time * 1.5 + i * 0.4) * 0.02;
        rayGrad.addColorStop(0, `rgba(201, 168, 76, ${alpha * 2})`);
        rayGrad.addColorStop(1, 'rgba(201, 168, 76, 0)');
        ctx.fillStyle = rayGrad;
        ctx.fill();
      }

      // Sun disc
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 5);
      sunGlow.addColorStop(0, 'rgba(228, 204, 122, 0.3)');
      sunGlow.addColorStop(0.3, 'rgba(201, 168, 76, 0.1)');
      sunGlow.addColorStop(1, 'rgba(201, 168, 76, 0)');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR * 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(228, 204, 122, ${0.4 + Math.sin(time) * 0.1})`;
      ctx.fill();

      // Horizon line
      ctx.beginPath();
      ctx.moveTo(0, sunY + sunR * 0.5);
      ctx.lineTo(w, sunY + sunR * 0.5);
      ctx.strokeStyle = 'rgba(201, 168, 76, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      requestAnimationFrame(draw);
    }
    draw();
  }

  // ============================================
  // 5. ENERGY BODY — Chakra silhouette
  // ============================================
  function energyBody(container) {
    const canvas = createCanvas(container);
    const ctx = canvas.getContext('2d');
    let time = 0;

    const chakraColors = [
      'rgba(196, 50, 50, 0.6)',   // Root
      'rgba(196, 122, 50, 0.6)',  // Sacral
      'rgba(201, 168, 76, 0.6)',  // Solar
      'rgba(76, 175, 80, 0.6)',   // Heart
      'rgba(76, 150, 200, 0.6)',  // Throat
      'rgba(100, 80, 180, 0.6)',  // Third Eye
      'rgba(180, 130, 200, 0.6)', // Crown
    ];

    function draw() {
      time += 0.008;
      const w = canvas._w, h = canvas._h;
      const cx = w / 2, cy = h / 2;
      ctx.clearRect(0, 0, w, h);

      // BG
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
      bg.addColorStop(0, 'rgba(30, 58, 42, 0.3)');
      bg.addColorStop(1, 'rgba(11, 26, 11, 0.85)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Body silhouette line (simple meditative pose)
      const scale = Math.min(w, h) * 0.0035;
      ctx.save();
      ctx.translate(cx, cy);

      // Energy field aura
      for (let ring = 3; ring > 0; ring--) {
        const auraR = scale * (35 + ring * 15 + Math.sin(time + ring) * 3);
        const auraGrad = ctx.createRadialGradient(0, -scale * 5, auraR * 0.3, 0, -scale * 5, auraR);
        const alpha = 0.02 + Math.sin(time * 0.5 + ring) * 0.01;
        auraGrad.addColorStop(0, `rgba(201, 168, 76, ${alpha})`);
        auraGrad.addColorStop(1, 'rgba(201, 168, 76, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.ellipse(0, -scale * 5, auraR, auraR * 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Spine / central channel
      ctx.beginPath();
      ctx.moveTo(0, -scale * 50);
      ctx.lineTo(0, scale * 30);
      ctx.strokeStyle = `rgba(201, 168, 76, ${0.1 + Math.sin(time) * 0.05})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Chakra points along spine
      const chakraPositions = [
        scale * 28,   // Root
        scale * 18,   // Sacral
        scale * 8,    // Solar
        -scale * 4,   // Heart
        -scale * 18,  // Throat
        -scale * 32,  // Third Eye
        -scale * 46,  // Crown
      ];

      chakraPositions.forEach((y, i) => {
        const pulse = 3 + Math.sin(time * 2 + i * 1.2) * 2;
        const glowR = pulse * 4;

        // Glow
        const g = ctx.createRadialGradient(0, y, 0, 0, y, glowR * scale * 0.3);
        g.addColorStop(0, chakraColors[i]);
        g.addColorStop(1, chakraColors[i].replace('0.6', '0'));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, y, glowR * scale * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(0, y, pulse, 0, Math.PI * 2);
        ctx.fillStyle = chakraColors[i];
        ctx.fill();
      });

      // Energy flowing up spine
      for (let i = 0; i < 8; i++) {
        const progress = ((time * 0.5 + i * 0.125) % 1);
        const ey = scale * 30 - progress * scale * 80;
        const eAlpha = Math.sin(progress * Math.PI) * 0.3;
        ctx.beginPath();
        ctx.arc(Math.sin(time * 3 + i) * scale * 2, ey, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(228, 204, 122, ${eAlpha})`;
        ctx.fill();
      }

      ctx.restore();
      requestAnimationFrame(draw);
    }
    draw();
  }

  // ============================================
  // 6. SPIRIT ORBS — Ethereal floating lights
  // ============================================
  function spiritOrbs(container) {
    const canvas = createCanvas(container);
    const ctx = canvas.getContext('2d');
    let time = 0;
    const orbs = [];
    for (let i = 0; i < 12; i++) {
      orbs.push({
        x: Math.random(), y: Math.random(),
        vx: (Math.random() - 0.5) * 0.001,
        vy: -Math.random() * 0.001 - 0.0003,
        r: Math.random() * 15 + 8,
        phase: Math.random() * Math.PI * 2,
        color: Math.random() > 0.5 ? COLORS.gold : COLORS.warmWhite
      });
    }

    function draw() {
      time += 0.006;
      const w = canvas._w, h = canvas._h;
      ctx.clearRect(0, 0, w, h);

      // BG
      const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
      bg.addColorStop(0, 'rgba(19, 38, 19, 0.5)');
      bg.addColorStop(1, 'rgba(11, 26, 11, 0.9)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Veil/portal line
      ctx.beginPath();
      for (let x = 0; x < w; x += 3) {
        const y = h * 0.5 + Math.sin(x * 0.01 + time) * h * 0.05 + Math.sin(x * 0.025 + time * 1.5) * h * 0.02;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(201, 168, 76, ${0.06 + Math.sin(time) * 0.02})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      orbs.forEach(o => {
        o.x += o.vx + Math.sin(time + o.phase) * 0.0005;
        o.y += o.vy;
        if (o.y < -0.1) { o.y = 1.1; o.x = Math.random(); }
        if (o.x < -0.1 || o.x > 1.1) o.x = Math.random();

        const px = o.x * w, py = o.y * h;
        const alpha = 0.15 + Math.sin(time * 1.5 + o.phase) * 0.1;

        const g = ctx.createRadialGradient(px, py, 0, px, py, o.r);
        g.addColorStop(0, o.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba'));
        g.addColorStop(0.5, o.color.replace(')', ', 0.03)').replace('rgb', 'rgba'));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, o.r, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 240, 230, ${alpha * 1.5})`;
        ctx.fill();
      });

      requestAnimationFrame(draw);
    }
    draw();
  }

  // ============================================
  // 7. TERRAIN GRID — Topographic energy lines
  // ============================================
  function terrainGrid(container) {
    const canvas = createCanvas(container);
    const ctx = canvas.getContext('2d');
    let time = 0;

    function draw() {
      time += 0.005;
      const w = canvas._w, h = canvas._h;
      ctx.clearRect(0, 0, w, h);

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, 'rgba(11, 26, 11, 0.9)');
      bg.addColorStop(1, 'rgba(30, 58, 42, 0.4)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Perspective grid
      const rows = 20;
      const cols = 24;
      const vanishY = h * 0.25;

      for (let row = 0; row < rows; row++) {
        const progress = row / rows;
        const y = vanishY + (h - vanishY) * Math.pow(progress, 1.5);
        const spread = progress * 1.5;

        ctx.beginPath();
        for (let col = 0; col <= cols; col++) {
          const xNorm = (col / cols - 0.5) * spread;
          const x = w / 2 + xNorm * w;
          const elevation = Math.sin(col * 0.5 + time * 2 + row * 0.3) * 15 * progress
                          + Math.sin(col * 0.8 + time + row * 0.5) * 8 * progress;
          const py = y - elevation;
          if (col === 0) ctx.moveTo(x, py); else ctx.lineTo(x, py);
        }
        const alpha = 0.03 + progress * 0.08;
        ctx.strokeStyle = `rgba(201, 168, 76, ${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Energy nodes on grid
      for (let i = 0; i < 5; i++) {
        const progress = 0.3 + i * 0.15;
        const y = vanishY + (h - vanishY) * Math.pow(progress, 1.5);
        const x = w / 2 + Math.sin(time + i * 2) * w * progress * 0.3;
        const pulse = 3 + Math.sin(time * 2 + i) * 2;

        const g = ctx.createRadialGradient(x, y, 0, x, y, pulse * 6);
        g.addColorStop(0, `rgba(201, 168, 76, 0.2)`);
        g.addColorStop(1, 'rgba(201, 168, 76, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, pulse * 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201, 168, 76, 0.4)`;
        ctx.fill();
      }

      requestAnimationFrame(draw);
    }
    draw();
  }

  // ============================================
  // 8. FLOWING LINES — Fascia/body wave
  // ============================================
  function flowingLines(container) {
    const canvas = createCanvas(container);
    const ctx = canvas.getContext('2d');
    let time = 0;

    function draw() {
      time += 0.005;
      const w = canvas._w, h = canvas._h;
      ctx.clearRect(0, 0, w, h);

      const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
      bg.addColorStop(0, 'rgba(30, 58, 42, 0.3)');
      bg.addColorStop(1, 'rgba(11, 26, 11, 0.85)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Flowing meridian lines
      const numLines = 16;
      for (let i = 0; i < numLines; i++) {
        ctx.beginPath();
        const baseX = (i / numLines) * w;
        const offset = i * 0.7;

        for (let y = 0; y <= h; y += 3) {
          const wave1 = Math.sin(y * 0.008 + time * 1.5 + offset) * 30;
          const wave2 = Math.sin(y * 0.015 + time * 0.8 + offset * 0.5) * 15;
          const x = baseX + wave1 + wave2;
          if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }

        const alpha = 0.04 + Math.sin(time + i * 0.5) * 0.02;
        ctx.strokeStyle = `rgba(201, 168, 76, ${alpha})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Energy pulses traveling along lines
      for (let i = 0; i < 8; i++) {
        const lineIdx = Math.floor(Math.random() * numLines * 0.99);
        const progress = ((time * 0.3 + i * 0.125) % 1);
        const y = progress * h;
        const baseX = (lineIdx / numLines) * w;
        const x = baseX + Math.sin(y * 0.008 + time * 1.5 + lineIdx * 0.7) * 30 + Math.sin(y * 0.015 + time * 0.8 + lineIdx * 0.35) * 15;

        const pAlpha = Math.sin(progress * Math.PI) * 0.4;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 8);
        g.addColorStop(0, `rgba(228, 204, 122, ${pAlpha})`);
        g.addColorStop(1, 'rgba(228, 204, 122, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(draw);
    }
    draw();
  }

  // ============================================
  // 9. MANDALA — Self-drawing sacred pattern
  // ============================================
  function mandala(container) {
    const canvas = createCanvas(container);
    const ctx = canvas.getContext('2d');
    let time = 0;

    function draw() {
      time += 0.004;
      const w = canvas._w, h = canvas._h;
      const cx = w / 2, cy = h / 2;
      const maxR = Math.min(w, h) * 0.4;
      ctx.clearRect(0, 0, w, h);

      // BG
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 1.5);
      bg.addColorStop(0, 'rgba(42, 79, 58, 0.3)');
      bg.addColorStop(1, 'rgba(11, 26, 11, 0.85)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const layers = 6;
      for (let layer = 0; layer < layers; layer++) {
        const r = maxR * ((layer + 1) / layers);
        const petals = 6 + layer * 2;
        const rotation = time * (0.2 - layer * 0.03) * (layer % 2 === 0 ? 1 : -1);
        const breathe = 1 + Math.sin(time * 1.5 + layer) * 0.03;

        // Ring
        ctx.beginPath();
        ctx.arc(cx, cy, r * breathe, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(201, 168, 76, ${0.05 + layer * 0.015})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Petals
        for (let p = 0; p < petals; p++) {
          const angle = (p / petals) * Math.PI * 2 + rotation;
          const innerR = r * 0.4 * breathe;
          const outerR = r * breathe;
          const petalWidth = Math.PI / petals * 0.6;

          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
          ctx.quadraticCurveTo(
            cx + Math.cos(angle + petalWidth) * outerR * 0.7,
            cy + Math.sin(angle + petalWidth) * outerR * 0.7,
            cx + Math.cos(angle) * outerR,
            cy + Math.sin(angle) * outerR
          );
          ctx.quadraticCurveTo(
            cx + Math.cos(angle - petalWidth) * outerR * 0.7,
            cy + Math.sin(angle - petalWidth) * outerR * 0.7,
            cx + Math.cos(angle) * innerR,
            cy + Math.sin(angle) * innerR
          );
          ctx.strokeStyle = `rgba(201, 168, 76, ${0.06 + Math.sin(time + p + layer) * 0.03})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // Center jewel
      const cGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.15);
      cGlow.addColorStop(0, `rgba(228, 204, 122, ${0.2 + Math.sin(time * 2) * 0.1})`);
      cGlow.addColorStop(1, 'rgba(201, 168, 76, 0)');
      ctx.fillStyle = cGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * 0.15, 0, Math.PI * 2);
      ctx.fill();

      requestAnimationFrame(draw);
    }
    draw();
  }

  // ============================================
  // 10. TREE OF LIFE — Growing golden branches
  // ============================================
  function treeOfLife(container) {
    const canvas = createCanvas(container);
    const ctx = canvas.getContext('2d');
    let time = 0;

    function drawBranch(x, y, angle, length, depth, maxDepth) {
      if (depth > maxDepth || length < 2) return;

      const sway = Math.sin(time * 2 + depth * 0.5 + x * 0.01) * 0.05;
      const endX = x + Math.cos(angle + sway) * length;
      const endY = y + Math.sin(angle + sway) * length;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(endX, endY);
      const alpha = 0.05 + (1 - depth / maxDepth) * 0.1;
      ctx.strokeStyle = `rgba(201, 168, 76, ${alpha})`;
      ctx.lineWidth = Math.max(0.5, (maxDepth - depth) * 0.6);
      ctx.stroke();

      // Leaf glow at tips
      if (depth >= maxDepth - 1) {
        const pulse = Math.sin(time * 3 + x + y) * 0.5 + 0.5;
        const g = ctx.createRadialGradient(endX, endY, 0, endX, endY, 6);
        g.addColorStop(0, `rgba(201, 168, 76, ${pulse * 0.15})`);
        g.addColorStop(1, 'rgba(201, 168, 76, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(endX, endY, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      const branchAngle = 0.4 + Math.sin(time * 0.5 + depth) * 0.1;
      drawBranch(endX, endY, angle - branchAngle, length * 0.72, depth + 1, maxDepth);
      drawBranch(endX, endY, angle + branchAngle, length * 0.72, depth + 1, maxDepth);
    }

    function draw() {
      time += 0.004;
      const w = canvas._w, h = canvas._h;
      ctx.clearRect(0, 0, w, h);

      // BG
      const bg = ctx.createRadialGradient(w / 2, h * 0.8, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
      bg.addColorStop(0, 'rgba(30, 58, 42, 0.3)');
      bg.addColorStop(1, 'rgba(11, 26, 11, 0.85)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const trunkX = w / 2;
      const trunkBase = h * 0.85;
      const trunkLen = h * 0.12;

      // Roots (mirrored branches going down)
      ctx.save();
      ctx.globalAlpha = 0.4;
      drawBranch(trunkX, trunkBase, Math.PI / 2 + 0.3, trunkLen * 0.6, 0, 5);
      drawBranch(trunkX, trunkBase, Math.PI / 2 - 0.3, trunkLen * 0.6, 0, 5);
      drawBranch(trunkX, trunkBase, Math.PI / 2, trunkLen * 0.5, 0, 4);
      ctx.restore();

      // Trunk
      ctx.beginPath();
      ctx.moveTo(trunkX, trunkBase);
      ctx.lineTo(trunkX, trunkBase - trunkLen);
      ctx.strokeStyle = 'rgba(201, 168, 76, 0.15)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Crown branches
      const branchStart = trunkBase - trunkLen;
      drawBranch(trunkX, branchStart, -Math.PI / 2 - 0.1, trunkLen * 0.8, 0, 7);
      drawBranch(trunkX, branchStart, -Math.PI / 2 + 0.1, trunkLen * 0.8, 0, 7);
      drawBranch(trunkX, branchStart, -Math.PI / 2 - 0.5, trunkLen * 0.6, 0, 6);
      drawBranch(trunkX, branchStart, -Math.PI / 2 + 0.5, trunkLen * 0.6, 0, 6);

      // Circle of life around tree
      ctx.beginPath();
      ctx.arc(trunkX, branchStart + trunkLen * 0.3, Math.min(w, h) * 0.38, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(201, 168, 76, ${0.04 + Math.sin(time) * 0.02})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      requestAnimationFrame(draw);
    }
    draw();
  }

  // ============================================
  // INITIALIZATION — Map placeholders to animations
  // ============================================
  const animMap = [
    { selector: '.hero__bg .placeholder-image', fn: heroAurora },
    { page: 'index', context: 'Shakina Ray Portrait', fn: flowerOfLife },
    { page: 'mission', context: 'Earth & Sacred Geometry', fn: earthWireframe },
    { page: 'mission', context: 'Sunrise & Golden Light', fn: sunriseRays },
    { page: 'offerings', context: 'Energetic Wellness Session', fn: energyBody },
    { page: 'offerings', context: 'Spirit Communication', fn: spiritOrbs },
    { page: 'offerings', context: 'Land & Earth Healing', fn: terrainGrid },
    { page: 'offerings', context: 'Massage Therapy', fn: flowingLines },
    { page: 'story', context: 'Shakina Ray / Misty Dawn', fn: mandala },
    { page: 'story', context: 'Nature & Sacred Space', fn: treeOfLife },
  ];

  animMap.forEach(entry => {
    let el;
    if (entry.selector) {
      el = document.querySelector(entry.selector);
    } else {
      // Find by text content match
      document.querySelectorAll('.placeholder-image').forEach(div => {
        if (div.textContent.trim() === entry.context) {
          el = div;
        }
      });
    }
    if (el) {
      // Use IntersectionObserver for performance — only animate when visible
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            entry.fn(el);
            observer.unobserve(el);
          }
        });
      }, { threshold: 0.05 });
      observer.observe(el);
    }
  });

  // GSAP ScrollTrigger reveal enhancements
  gsap.utils.toArray('.reveal').forEach(el => {
    gsap.from(el, {
      y: 40,
      opacity: 0,
      duration: 1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    });
  });

  gsap.utils.toArray('.reveal-scale').forEach(el => {
    gsap.from(el, {
      scale: 0.95,
      opacity: 0,
      duration: 1.2,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    });
  });
}

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnimations);
} else {
  initAnimations();
}
