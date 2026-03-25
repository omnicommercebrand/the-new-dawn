/* ============================================
   A NEW DAWN — GSAP Visual Animations v2
   10x: hover magic, magnetic cursor, particle
   bursts, breathing pulses, color shifts
   ============================================ */

function initAnimations() {
  gsap.registerPlugin(ScrollTrigger);

  const C = {
    gold: [201, 168, 76],
    goldLight: [228, 204, 122],
    rose: [196, 122, 110],
    white: [245, 240, 230],
    forest: [19, 38, 19],
    canopy: [42, 79, 58],
    deep: [11, 26, 11],
  };

  function rgba(c, a) { return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
  function lerpColor(a, b, t) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }

  // --- Create interactive canvas with hover tracking ---
  function createCanvas(container) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;border-radius:inherit;cursor:none;';
    container.innerHTML = '';
    container.appendChild(canvas);

    const state = { mx: -999, my: -999, hover: 0, clicked: 0, time: 0, w: 0, h: 0 };

    function resize() {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      state.w = rect.width;
      state.h = rect.height;
    }
    resize();
    window.addEventListener('resize', resize);

    container.addEventListener('mousemove', e => {
      const r = container.getBoundingClientRect();
      state.mx = e.clientX - r.left;
      state.my = e.clientY - r.top;
    });
    container.addEventListener('mouseenter', () => { gsap.to(state, { hover: 1, duration: 0.6, ease: 'power2.out' }); });
    container.addEventListener('mouseleave', () => { state.mx = -999; state.my = -999; gsap.to(state, { hover: 0, duration: 1.2, ease: 'power2.inOut' }); });
    container.addEventListener('click', () => { state.clicked = 1; setTimeout(() => state.clicked = 0, 800); });

    return { canvas, ctx: canvas.getContext('2d'), state };
  }

  // --- Shared: cursor glow ---
  function drawCursorGlow(ctx, s, color, radius) {
    if (s.mx < 0) return;
    const r = radius || 80;
    const a = s.hover * 0.25;
    const g = ctx.createRadialGradient(s.mx, s.my, 0, s.mx, s.my, r);
    g.addColorStop(0, rgba(color || C.gold, a));
    g.addColorStop(0.5, rgba(color || C.gold, a * 0.3));
    g.addColorStop(1, rgba(color || C.gold, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.mx, s.my, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Shared: burst particles on click ---
  function createBurstSystem() {
    const bursts = [];
    return {
      trigger(x, y, count, color) {
        for (let i = 0; i < (count || 20); i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 4 + 2;
          bursts.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color: color || C.gold, r: Math.random() * 3 + 1 });
        }
      },
      update(ctx) {
        for (let i = bursts.length - 1; i >= 0; i--) {
          const b = bursts[i];
          b.x += b.vx; b.y += b.vy;
          b.vx *= 0.96; b.vy *= 0.96;
          b.life -= 0.02;
          if (b.life <= 0) { bursts.splice(i, 1); continue; }
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r * b.life, 0, Math.PI * 2);
          ctx.fillStyle = rgba(b.color, b.life * 0.6);
          ctx.fill();
          // Trail
          ctx.beginPath();
          ctx.arc(b.x - b.vx * 2, b.y - b.vy * 2, b.r * b.life * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = rgba(b.color, b.life * 0.2);
          ctx.fill();
        }
      }
    };
  }

  // ============================================
  // 1. HERO — Aurora + floating embers + cursor ripple
  // ============================================
  function heroAurora(container) {
    const { canvas, ctx, state: s } = createCanvas(container);
    const bursts = createBurstSystem();
    const particles = [];
    const embers = [];

    function init() {
      particles.length = 0; embers.length = 0;
      const count = Math.min(120, Math.floor(s.w * s.h / 5000));
      for (let i = 0; i < count; i++) {
        particles.push({ x: Math.random() * s.w, y: Math.random() * s.h, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.2 - 0.15, r: Math.random() * 2.5 + 0.5, a: Math.random() * 0.4 + 0.1, phase: Math.random() * Math.PI * 2 });
      }
      for (let i = 0; i < 15; i++) {
        embers.push({ x: Math.random() * s.w, y: s.h + Math.random() * 50, vy: -Math.random() * 1.5 - 0.5, vx: (Math.random() - 0.5) * 0.5, life: Math.random(), phase: Math.random() * Math.PI * 2, r: Math.random() * 4 + 2 });
      }
    }
    init();

    let lastClick = 0;
    function draw() {
      s.time += 0.005;
      const { w, h } = s;
      ctx.clearRect(0, 0, w, h);

      // Aurora waves — deeper, more layers
      for (let wave = 0; wave < 5; wave++) {
        ctx.beginPath();
        const baseY = h * (0.2 + wave * 0.12);
        const amp = h * (0.06 + wave * 0.015 + s.hover * 0.03);
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 3) {
          const mouseInfluence = s.mx > 0 ? Math.exp(-Math.pow((x - s.mx) / 200, 2)) * 30 * s.hover : 0;
          const y = baseY + Math.sin(x * 0.003 + s.time * (1 + wave * 0.4) + wave) * amp
                    + Math.sin(x * 0.007 + s.time * 0.7) * amp * 0.4 - mouseInfluence;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        const colors = [[201,168,76],[196,122,110],[228,204,122],[42,79,58],[201,168,76]];
        const alpha = (0.025 + wave * 0.008 + s.hover * 0.015);
        const grad = ctx.createLinearGradient(0, baseY - amp, 0, h);
        grad.addColorStop(0, rgba(colors[wave], alpha));
        grad.addColorStop(1, rgba(colors[wave], 0));
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Particles — magnetic pull toward cursor
      particles.forEach(p => {
        if (s.mx > 0 && s.hover > 0.1) {
          const dx = s.mx - p.x, dy = s.my - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200) {
            const force = (1 - dist / 200) * 0.5 * s.hover;
            p.x += dx * force * 0.02;
            p.y += dy * force * 0.02;
          }
        }
        p.x += p.vx + Math.sin(s.time + p.phase) * 0.2;
        p.y += p.vy;
        if (p.x < -10) p.x = w + 10; if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10; if (p.y > h + 10) p.y = -10;
        const flicker = 0.5 + Math.sin(s.time * 2 + p.phase) * 0.5;
        const size = p.r * (1 + s.hover * 0.5);
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = rgba(C.gold, p.a * flicker * (1 + s.hover * 0.5));
        ctx.fill();
      });

      // Rising embers
      embers.forEach(e => {
        e.y += e.vy;
        e.x += e.vx + Math.sin(s.time * 2 + e.phase) * 0.5;
        e.life -= 0.003;
        if (e.life <= 0 || e.y < -20) { e.y = h + 20; e.x = Math.random() * w; e.life = 1; }
        const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r);
        g.addColorStop(0, rgba(C.goldLight, e.life * 0.3));
        g.addColorStop(1, rgba(C.gold, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Cursor ripple
      if (s.mx > 0 && s.hover > 0.1) {
        for (let ring = 0; ring < 3; ring++) {
          const r = 20 + ring * 25 + Math.sin(s.time * 4 + ring) * 8;
          ctx.beginPath();
          ctx.arc(s.mx, s.my, r, 0, Math.PI * 2);
          ctx.strokeStyle = rgba(C.gold, (0.1 - ring * 0.03) * s.hover);
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // Click burst
      if (s.clicked && s.clicked !== lastClick) { bursts.trigger(s.mx, s.my, 30, C.goldLight); lastClick = s.clicked; }
      bursts.update(ctx);

      requestAnimationFrame(draw);
    }
    draw();
  }

  // ============================================
  // 2. FLOWER OF LIFE — Hover unfolds layers + glow intensifies
  // ============================================
  function flowerOfLife(container) {
    const { canvas, ctx, state: s } = createCanvas(container);
    const bursts = createBurstSystem();

    function draw() {
      s.time += 0.006;
      const { w, h } = s;
      const cx = w / 2, cy = h / 2;
      const baseR = Math.min(w, h) * 0.11;
      ctx.clearRect(0, 0, w, h);

      // BG
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
      bg.addColorStop(0, rgba(C.canopy, 0.3 + s.hover * 0.1));
      bg.addColorStop(1, rgba(C.deep, 0.85));
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const breathe = 1 + Math.sin(s.time) * 0.04;
      const hoverExpand = 1 + s.hover * 0.15;
      const r = baseR * breathe * hoverExpand;
      const rotation = s.time * 0.08;

      // 3 rings of circles
      const rings = [
        { count: 1, dist: 0, offset: 0 },
        { count: 6, dist: r, offset: rotation },
        { count: 6, dist: r * 1.73, offset: rotation + Math.PI / 6 },
        { count: 12, dist: r * 2, offset: rotation * 0.5 },
      ];

      // Only show outer rings on hover
      const visibleRings = 2 + Math.round(s.hover * 2);

      rings.slice(0, visibleRings).forEach((ring, ri) => {
        const positions = [];
        if (ring.count === 1) { positions.push({ x: 0, y: 0 }); }
        else {
          for (let i = 0; i < ring.count; i++) {
            const angle = (Math.PI * 2 / ring.count) * i + ring.offset;
            positions.push({ x: Math.cos(angle) * ring.dist, y: Math.sin(angle) * ring.dist });
          }
        }
        positions.forEach((pos, idx) => {
          const alpha = (0.12 + Math.sin(s.time * 1.5 + idx * 0.5 + ri) * 0.06) * (1 + s.hover * 0.8);
          const col = lerpColor(C.gold, C.goldLight, Math.sin(s.time + idx) * 0.5 + 0.5);

          // Circle
          ctx.beginPath();
          ctx.arc(cx + pos.x, cy + pos.y, r, 0, Math.PI * 2);
          ctx.strokeStyle = rgba(col, alpha);
          ctx.lineWidth = 0.8 + s.hover * 0.5;
          ctx.stroke();

          // Intersection glow dots on hover
          if (s.hover > 0.3 && ri > 0) {
            const dotAlpha = (s.hover - 0.3) * 0.5;
            ctx.beginPath();
            ctx.arc(cx + pos.x, cy + pos.y, 2 + Math.sin(s.time * 3 + idx) * 1, 0, Math.PI * 2);
            ctx.fillStyle = rgba(C.goldLight, dotAlpha);
            ctx.fill();
          }
        });
      });

      // Center pulsing jewel
      const jewelR = r * (0.15 + s.hover * 0.1);
      const jewelGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, jewelR * 4);
      jewelGlow.addColorStop(0, rgba(C.goldLight, 0.2 + s.hover * 0.2 + Math.sin(s.time * 2) * 0.05));
      jewelGlow.addColorStop(0.5, rgba(C.gold, 0.05));
      jewelGlow.addColorStop(1, rgba(C.gold, 0));
      ctx.fillStyle = jewelGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, jewelR * 4, 0, Math.PI * 2);
      ctx.fill();

      // Spinning golden lines connecting centers on hover
      if (s.hover > 0.2) {
        const lineAlpha = (s.hover - 0.2) * 0.15;
        for (let i = 0; i < 6; i++) {
          const a1 = (Math.PI * 2 / 6) * i + rotation;
          const a2 = (Math.PI * 2 / 6) * ((i + 2) % 6) + rotation;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
          ctx.lineTo(cx + Math.cos(a2) * r, cy + Math.sin(a2) * r);
          ctx.strokeStyle = rgba(C.gold, lineAlpha);
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // Outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, r * (3 + s.hover * 0.5), 0, Math.PI * 2);
      ctx.strokeStyle = rgba(C.gold, 0.03 + Math.sin(s.time * 0.5) * 0.02 + s.hover * 0.04);
      ctx.lineWidth = 0.5;
      ctx.stroke();

      drawCursorGlow(ctx, s, C.goldLight, 100);
      if (s.clicked) bursts.trigger(s.mx > 0 ? s.mx : cx, s.my > 0 ? s.my : cy, 25, C.goldLight);
      bursts.update(ctx);

      requestAnimationFrame(draw);
    }
    draw();
  }

  // ============================================
  // 3. EARTH WIREFRAME — Hover spins faster + ley lines blaze
  // ============================================
  function earthWireframe(container) {
    const { canvas, ctx, state: s } = createCanvas(container);
    const bursts = createBurstSystem();

    function draw() {
      s.time += 0.004 + s.hover * 0.008;
      const { w, h } = s;
      const cx = w / 2, cy = h / 2;
      const radius = Math.min(w, h) * 0.32;
      ctx.clearRect(0, 0, w, h);

      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 2);
      bg.addColorStop(0, rgba(C.canopy, 0.3 + s.hover * 0.1));
      bg.addColorStop(1, rgba(C.deep, 0.9));
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Globe
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(C.gold, 0.15 + s.hover * 0.15);
      ctx.lineWidth = 1 + s.hover;
      ctx.stroke();

      // Atmosphere glow on hover
      if (s.hover > 0.1) {
        const atmo = ctx.createRadialGradient(cx, cy, radius * 0.95, cx, cy, radius * 1.15);
        atmo.addColorStop(0, rgba(C.gold, s.hover * 0.06));
        atmo.addColorStop(1, rgba(C.gold, 0));
        ctx.fillStyle = atmo;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.15, 0, Math.PI * 2);
        ctx.fill();
      }

      // Latitude lines
      for (let lat = -60; lat <= 60; lat += 20) {
        const latRad = (lat * Math.PI) / 180;
        const y = cy - Math.sin(latRad) * radius;
        const r = Math.cos(latRad) * radius;
        ctx.beginPath();
        ctx.ellipse(cx, y, r, r * 0.15, 0, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(C.gold, 0.05 + s.hover * 0.04);
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // Longitude lines
      for (let lon = 0; lon < 180; lon += 20) {
        const lonRad = (lon * Math.PI) / 180 + s.time;
        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 2; a += 0.04) {
          const x3d = Math.cos(a) * Math.cos(lonRad);
          const z3d = Math.cos(a) * Math.sin(lonRad);
          const y3d = Math.sin(a);
          if (z3d > -0.1) {
            const px = cx + x3d * radius;
            const py = cy - y3d * radius;
            if (a < 0.05) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
        }
        ctx.strokeStyle = rgba(C.gold, 0.06 + s.hover * 0.04);
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // Sacred sites — bigger on hover with connecting lines
      const sites = [
        { lat: 30, lon: 31, name: 'Giza' }, { lat: -14, lon: -75, name: 'Machu Picchu' },
        { lat: 51, lon: -2, name: 'Stonehenge' }, { lat: 27, lon: 86, name: 'Everest' },
        { lat: -34, lon: 131, name: 'Uluru' }, { lat: 21, lon: -157, name: 'Hawaii' },
        { lat: 34, lon: 135, name: 'Shasta' }, { lat: -22, lon: -43, name: 'Rio' },
      ];

      const visibleSites = [];
      sites.forEach((site, i) => {
        const latRad = (site.lat * Math.PI) / 180;
        const lonRad = (site.lon * Math.PI) / 180 + s.time * 20 * Math.PI / 180;
        const x3d = Math.cos(latRad) * Math.cos(lonRad);
        const z3d = Math.cos(latRad) * Math.sin(lonRad);
        const y3d = Math.sin(latRad);
        if (z3d > 0) {
          const px = cx + x3d * radius;
          const py = cy - y3d * radius;
          const alpha = z3d;
          const pulse = (2.5 + Math.sin(s.time * 3 + i) * 1.5) * (1 + s.hover * 0.8);
          visibleSites.push({ px, py, alpha, i });

          // Glow
          const g = ctx.createRadialGradient(px, py, 0, px, py, pulse * (4 + s.hover * 3));
          g.addColorStop(0, rgba(C.gold, alpha * (0.2 + s.hover * 0.2)));
          g.addColorStop(1, rgba(C.gold, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, pulse * (4 + s.hover * 3), 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(px, py, pulse, 0, Math.PI * 2);
          ctx.fillStyle = rgba(lerpColor(C.gold, C.goldLight, Math.sin(s.time + i) * 0.5 + 0.5), alpha * 0.7);
          ctx.fill();
        }
      });

      // Ley lines between visible sites on hover
      if (s.hover > 0.3 && visibleSites.length > 1) {
        const lineAlpha = (s.hover - 0.3) * 0.15;
        for (let i = 0; i < visibleSites.length - 1; i++) {
          const a = visibleSites[i], b = visibleSites[i + 1];
          ctx.beginPath();
          ctx.moveTo(a.px, a.py);
          ctx.lineTo(b.px, b.py);
          ctx.strokeStyle = rgba(C.gold, lineAlpha * Math.min(a.alpha, b.alpha));
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      drawCursorGlow(ctx, s, C.gold, 120);
      if (s.clicked) bursts.trigger(s.mx > 0 ? s.mx : cx, s.my > 0 ? s.my : cy, 35, C.goldLight);
      bursts.update(ctx);
      requestAnimationFrame(draw);
    }
    draw();
  }

  // ============================================
  // 4. SUNRISE — Rays intensify on hover, color shifts
  // ============================================
  function sunriseRays(container) {
    const { canvas, ctx, state: s } = createCanvas(container);
    const bursts = createBurstSystem();

    function draw() {
      s.time += 0.005;
      const { w, h } = s;
      ctx.clearRect(0, 0, w, h);

      const sunY = h * (0.78 - s.hover * 0.05);
      const sunX = w / 2;
      const sunR = Math.min(w, h) * (0.06 + s.hover * 0.02);

      // Sky gradient — warmer on hover
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, rgba(C.deep, 0.9 - s.hover * 0.1));
      sky.addColorStop(0.4, rgba(C.canopy, 0.5 + s.hover * 0.1));
      sky.addColorStop(0.7, rgba(C.rose, 0.1 + s.hover * 0.12));
      sky.addColorStop(0.85, rgba(C.gold, 0.08 + s.hover * 0.15));
      sky.addColorStop(1, rgba(C.goldLight, 0.05 + s.hover * 0.1));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Rays — more + brighter on hover
      const numRays = 24 + Math.round(s.hover * 16);
      for (let i = 0; i < numRays; i++) {
        const angle = (i / numRays) * Math.PI - Math.PI;
        const rayLen = Math.min(w, h) * (0.5 + Math.sin(s.time * 2 + i * 0.5) * 0.1 + s.hover * 0.2);
        const rayWidth = 0.02 + Math.sin(s.time + i * 0.5) * 0.008 + s.hover * 0.01;
        ctx.beginPath();
        ctx.moveTo(sunX, sunY);
        ctx.lineTo(sunX + Math.cos(angle - rayWidth) * rayLen, sunY + Math.sin(angle - rayWidth) * rayLen);
        ctx.lineTo(sunX + Math.cos(angle + rayWidth) * rayLen, sunY + Math.sin(angle + rayWidth) * rayLen);
        ctx.closePath();
        const col = i % 3 === 0 ? C.rose : (i % 3 === 1 ? C.goldLight : C.gold);
        const alpha = (0.03 + Math.sin(s.time * 1.5 + i * 0.4) * 0.015) * (1 + s.hover * 1.5);
        const rayGrad = ctx.createLinearGradient(sunX, sunY, sunX + Math.cos(angle) * rayLen, sunY + Math.sin(angle) * rayLen);
        rayGrad.addColorStop(0, rgba(col, alpha * 2));
        rayGrad.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = rayGrad;
        ctx.fill();
      }

      // Sun disc + expanded glow on hover
      const glowR = sunR * (5 + s.hover * 4);
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, glowR);
      sunGlow.addColorStop(0, rgba(C.goldLight, 0.3 + s.hover * 0.2));
      sunGlow.addColorStop(0.2, rgba(C.gold, 0.1 + s.hover * 0.1));
      sunGlow.addColorStop(0.5, rgba(C.rose, 0.03 + s.hover * 0.03));
      sunGlow.addColorStop(1, rgba(C.gold, 0));
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, glowR, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      ctx.fillStyle = rgba(C.goldLight, 0.4 + Math.sin(s.time) * 0.1 + s.hover * 0.2);
      ctx.fill();

      // Stars appear away from sun on hover
      if (s.hover > 0.3) {
        for (let i = 0; i < 20; i++) {
          const sx = (Math.sin(i * 7.3 + 1.2) * 0.5 + 0.5) * w;
          const sy = (Math.sin(i * 5.1 + 3.4) * 0.5 + 0.5) * h * 0.5;
          const twinkle = Math.sin(s.time * 4 + i * 2) * 0.5 + 0.5;
          ctx.beginPath();
          ctx.arc(sx, sy, 1, 0, Math.PI * 2);
          ctx.fillStyle = rgba(C.white, (s.hover - 0.3) * twinkle * 0.3);
          ctx.fill();
        }
      }

      drawCursorGlow(ctx, s, C.goldLight, 100);
      if (s.clicked) bursts.trigger(s.mx > 0 ? s.mx : sunX, s.my > 0 ? s.my : sunY, 40, C.goldLight);
      bursts.update(ctx);
      requestAnimationFrame(draw);
    }
    draw();
  }

  // ============================================
  // 5. ENERGY BODY — Chakras blaze on hover
  // ============================================
  function energyBody(container) {
    const { canvas, ctx, state: s } = createCanvas(container);
    const bursts = createBurstSystem();
    const chakraColors = [[196,50,50],[196,122,50],[201,168,76],[76,175,80],[76,150,200],[100,80,180],[180,130,200]];

    function draw() {
      s.time += 0.007;
      const { w, h } = s;
      const cx = w / 2, cy = h / 2;
      const scale = Math.min(w, h) * 0.0035;
      ctx.clearRect(0, 0, w, h);

      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
      bg.addColorStop(0, rgba(C.canopy, 0.3 + s.hover * 0.08));
      bg.addColorStop(1, rgba(C.deep, 0.85));
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(cx, cy);

      // Aura rings — more on hover
      const auraLayers = 3 + Math.round(s.hover * 3);
      for (let ring = auraLayers; ring > 0; ring--) {
        const auraR = scale * (30 + ring * 12 + Math.sin(s.time + ring) * 3 + s.hover * ring * 5);
        const aGrad = ctx.createRadialGradient(0, -scale * 5, auraR * 0.2, 0, -scale * 5, auraR);
        const idx = Math.min(ring - 1, chakraColors.length - 1);
        const col = s.hover > 0.3 ? chakraColors[idx] : C.gold;
        aGrad.addColorStop(0, rgba(col, 0.02 + s.hover * 0.02));
        aGrad.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = aGrad;
        ctx.beginPath();
        ctx.ellipse(0, -scale * 5, auraR, auraR * 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Spine
      ctx.beginPath();
      ctx.moveTo(0, -scale * 52);
      ctx.lineTo(0, scale * 32);
      ctx.strokeStyle = rgba(C.gold, 0.08 + Math.sin(s.time) * 0.04 + s.hover * 0.1);
      ctx.lineWidth = 1 + s.hover;
      ctx.stroke();

      // Chakras
      const positions = [scale*28, scale*18, scale*8, -scale*4, -scale*18, -scale*32, -scale*46];
      positions.forEach((y, i) => {
        const pulse = (3 + Math.sin(s.time * 2 + i * 1.2) * 2) * (1 + s.hover * 0.8);
        const glowR = pulse * (4 + s.hover * 4) * scale * 0.3;

        // Spinning ring on hover
        if (s.hover > 0.2) {
          const ringAlpha = (s.hover - 0.2) * 0.3;
          ctx.beginPath();
          ctx.arc(0, y, pulse * 3, 0, Math.PI * 2);
          ctx.strokeStyle = rgba(chakraColors[i], ringAlpha);
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }

        // Glow
        const g = ctx.createRadialGradient(0, y, 0, 0, y, glowR);
        g.addColorStop(0, rgba(chakraColors[i], 0.4 + s.hover * 0.3));
        g.addColorStop(1, rgba(chakraColors[i], 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, y, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(0, y, pulse, 0, Math.PI * 2);
        ctx.fillStyle = rgba(chakraColors[i], 0.6 + s.hover * 0.3);
        ctx.fill();
      });

      // Energy flow up spine — more particles on hover
      const flowCount = 8 + Math.round(s.hover * 12);
      for (let i = 0; i < flowCount; i++) {
        const progress = ((s.time * 0.5 + i / flowCount) % 1);
        const ey = scale * 32 - progress * scale * 84;
        const eAlpha = Math.sin(progress * Math.PI) * (0.3 + s.hover * 0.3);
        const wobble = Math.sin(s.time * 3 + i) * scale * (2 + s.hover * 3);
        const chakraIdx = Math.min(Math.floor(progress * 7), 6);
        ctx.beginPath();
        ctx.arc(wobble, ey, 1.5 + s.hover, 0, Math.PI * 2);
        ctx.fillStyle = rgba(s.hover > 0.3 ? chakraColors[chakraIdx] : C.goldLight, eAlpha);
        ctx.fill();
      }

      ctx.restore();
      drawCursorGlow(ctx, s, C.gold, 90);
      if (s.clicked) bursts.trigger(s.mx > 0 ? s.mx : cx, s.my > 0 ? s.my : cy, 30);
      bursts.update(ctx);
      requestAnimationFrame(draw);
    }
    draw();
  }

  // ============================================
  // 6. SPIRIT ORBS — Hover opens veil, orbs multiply
  // ============================================
  function spiritOrbs(container) {
    const { canvas, ctx, state: s } = createCanvas(container);
    const bursts = createBurstSystem();
    const orbs = [];
    for (let i = 0; i < 20; i++) {
      orbs.push({ x: Math.random(), y: Math.random(), vx: (Math.random()-0.5)*0.001, vy: -Math.random()*0.001-0.0003, r: Math.random()*18+8, phase: Math.random()*Math.PI*2, bright: Math.random() > 0.6 });
    }

    function draw() {
      s.time += 0.005;
      const { w, h } = s;
      ctx.clearRect(0, 0, w, h);

      const bg = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h)*0.7);
      bg.addColorStop(0, rgba(C.forest, 0.4 + s.hover * 0.1));
      bg.addColorStop(1, rgba(C.deep, 0.9));
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      // Veil — wavy line that opens on hover
      const veilGap = s.hover * 40;
      for (let layer = 0; layer < 3; layer++) {
        ctx.beginPath();
        for (let x = 0; x < w; x += 2) {
          const baseY = h * 0.5 + Math.sin(x * 0.01 + s.time + layer * 0.5) * h * 0.04;
          const offset = layer * 3 - 3;
          const gapPush = s.mx > 0 ? Math.exp(-Math.pow((x - s.mx) / 150, 2)) * veilGap : 0;
          const y = baseY + offset + (layer > 1 ? gapPush : -gapPush);
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = rgba(C.gold, 0.04 + layer * 0.02 + s.hover * 0.03);
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Orbs — magnetic to cursor
      orbs.forEach(o => {
        const px = o.x * w, py = o.y * h;
        if (s.mx > 0 && s.hover > 0.1) {
          const dx = s.mx - px, dy = s.my - py;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 180) {
            o.x += (dx / dist) * 0.0003 * s.hover;
            o.y += (dy / dist) * 0.0003 * s.hover;
          }
        }
        o.x += o.vx + Math.sin(s.time + o.phase) * 0.0004;
        o.y += o.vy;
        if (o.y < -0.1) { o.y = 1.1; o.x = Math.random(); }

        const alpha = (0.12 + Math.sin(s.time * 1.5 + o.phase) * 0.08) * (1 + s.hover * 0.8);
        const col = o.bright ? C.goldLight : C.white;
        const size = o.r * (1 + s.hover * 0.3);

        const g = ctx.createRadialGradient(o.x*w, o.y*h, 0, o.x*w, o.y*h, size);
        g.addColorStop(0, rgba(col, alpha));
        g.addColorStop(0.4, rgba(col, alpha * 0.2));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x*w, o.y*h, size, 0, Math.PI*2); ctx.fill();

        // Core sparkle
        ctx.beginPath(); ctx.arc(o.x*w, o.y*h, 1.5 + Math.sin(s.time*4+o.phase)*0.5, 0, Math.PI*2);
        ctx.fillStyle = rgba(C.white, alpha * 1.5);
        ctx.fill();
      });

      drawCursorGlow(ctx, s, C.white, 80);
      if (s.clicked) bursts.trigger(s.mx, s.my, 25, C.white);
      bursts.update(ctx);
      requestAnimationFrame(draw);
    }
    draw();
  }

  // ============================================
  // 7. TERRAIN GRID — Hover lifts terrain, energy pulses
  // ============================================
  function terrainGrid(container) {
    const { canvas, ctx, state: s } = createCanvas(container);
    const bursts = createBurstSystem();

    function draw() {
      s.time += 0.004;
      const { w, h } = s;
      ctx.clearRect(0, 0, w, h);

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, rgba(C.deep, 0.9));
      bg.addColorStop(1, rgba(C.canopy, 0.3 + s.hover * 0.1));
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const rows = 25, cols = 30;
      const vanishY = h * 0.2;

      for (let row = 0; row < rows; row++) {
        const progress = row / rows;
        const y = vanishY + (h - vanishY) * Math.pow(progress, 1.5);
        const spread = progress * 1.5;

        ctx.beginPath();
        for (let col = 0; col <= cols; col++) {
          const xNorm = (col / cols - 0.5) * spread;
          const x = w / 2 + xNorm * w;
          const mouseProximity = s.mx > 0 ? Math.exp(-Math.pow((x - s.mx) / 200, 2) - Math.pow((y - s.my) / 200, 2)) * 30 * s.hover : 0;
          const elev = (Math.sin(col * 0.5 + s.time * 2 + row * 0.3) * 15 + Math.sin(col * 0.8 + s.time + row * 0.5) * 8) * progress * (1 + s.hover * 0.5) + mouseProximity;
          if (col === 0) ctx.moveTo(x, y - elev); else ctx.lineTo(x, y - elev);
        }
        const alpha = (0.03 + progress * 0.07) * (1 + s.hover * 0.5);
        const col = lerpColor(C.gold, C.goldLight, progress);
        ctx.strokeStyle = rgba(col, alpha);
        ctx.lineWidth = 0.6 + s.hover * 0.3;
        ctx.stroke();
      }

      // Energy nodes
      for (let i = 0; i < 7; i++) {
        const progress = 0.2 + i * 0.12;
        const y = vanishY + (h - vanishY) * Math.pow(progress, 1.5);
        const x = w / 2 + Math.sin(s.time + i * 2) * w * progress * 0.3;
        const pulse = (3 + Math.sin(s.time * 2 + i) * 2) * (1 + s.hover * 0.6);

        const g = ctx.createRadialGradient(x, y, 0, x, y, pulse * (6 + s.hover * 4));
        g.addColorStop(0, rgba(C.gold, 0.2 + s.hover * 0.15));
        g.addColorStop(1, rgba(C.gold, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, pulse * (6 + s.hover * 4), 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, pulse, 0, Math.PI * 2); ctx.fillStyle = rgba(C.gold, 0.4 + s.hover * 0.3); ctx.fill();
      }

      drawCursorGlow(ctx, s, C.gold, 100);
      if (s.clicked) bursts.trigger(s.mx, s.my, 30);
      bursts.update(ctx);
      requestAnimationFrame(draw);
    }
    draw();
  }

  // ============================================
  // 8. FLOWING LINES — Hover creates magnetic ripple
  // ============================================
  function flowingLines(container) {
    const { canvas, ctx, state: s } = createCanvas(container);
    const bursts = createBurstSystem();

    function draw() {
      s.time += 0.004;
      const { w, h } = s;
      ctx.clearRect(0, 0, w, h);

      const bg = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h)*0.6);
      bg.addColorStop(0, rgba(C.canopy, 0.25 + s.hover * 0.08));
      bg.addColorStop(1, rgba(C.deep, 0.85));
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const numLines = 20;
      for (let i = 0; i < numLines; i++) {
        ctx.beginPath();
        const baseX = (i / numLines) * w;
        const offset = i * 0.7;
        for (let y = 0; y <= h; y += 2) {
          const mouseEffect = s.mx > 0 ? Math.exp(-Math.pow((baseX - s.mx) / 120, 2) - Math.pow((y - s.my) / 120, 2)) * 40 * s.hover : 0;
          const wave1 = Math.sin(y * 0.007 + s.time * 1.5 + offset) * (25 + s.hover * 15);
          const wave2 = Math.sin(y * 0.014 + s.time * 0.8 + offset * 0.5) * 12;
          const x = baseX + wave1 + wave2 + mouseEffect;
          if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        const col = lerpColor(C.gold, C.rose, Math.sin(s.time * 0.5 + i * 0.3) * 0.5 + 0.5);
        ctx.strokeStyle = rgba(col, 0.04 + Math.sin(s.time + i * 0.5) * 0.02 + s.hover * 0.03);
        ctx.lineWidth = 1 + s.hover * 0.5;
        ctx.stroke();
      }

      // Energy pulses
      for (let i = 0; i < 12; i++) {
        const li = i % numLines;
        const progress = ((s.time * 0.3 + i * 0.083) % 1);
        const y = progress * h;
        const baseX = (li / numLines) * w;
        const x = baseX + Math.sin(y * 0.007 + s.time * 1.5 + li * 0.7) * 25 + Math.sin(y * 0.014 + s.time * 0.8 + li * 0.35) * 12;
        const pAlpha = Math.sin(progress * Math.PI) * (0.3 + s.hover * 0.3);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 10 + s.hover * 5);
        g.addColorStop(0, rgba(C.goldLight, pAlpha));
        g.addColorStop(1, rgba(C.goldLight, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 10 + s.hover * 5, 0, Math.PI * 2); ctx.fill();
      }

      drawCursorGlow(ctx, s, C.rose, 90);
      if (s.clicked) bursts.trigger(s.mx, s.my, 25, C.rose);
      bursts.update(ctx);
      requestAnimationFrame(draw);
    }
    draw();
  }

  // ============================================
  // 9. MANDALA — Hover unfolds additional layers + spins
  // ============================================
  function mandala(container) {
    const { canvas, ctx, state: s } = createCanvas(container);
    const bursts = createBurstSystem();

    function draw() {
      s.time += 0.003;
      const { w, h } = s;
      const cx = w / 2, cy = h / 2;
      const maxR = Math.min(w, h) * 0.38;
      ctx.clearRect(0, 0, w, h);

      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 1.5);
      bg.addColorStop(0, rgba(C.canopy, 0.3 + s.hover * 0.1));
      bg.addColorStop(1, rgba(C.deep, 0.85));
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const layers = 6 + Math.round(s.hover * 3);
      for (let layer = 0; layer < layers; layer++) {
        const r = maxR * ((layer + 1) / layers) * (1 + s.hover * 0.05);
        const petals = 6 + layer * 2;
        const speed = (0.15 - layer * 0.02) * (1 + s.hover * 1.5);
        const rotation = s.time * speed * (layer % 2 === 0 ? 1 : -1);
        const breathe = 1 + Math.sin(s.time * 1.5 + layer) * 0.03;

        ctx.beginPath();
        ctx.arc(cx, cy, r * breathe, 0, Math.PI * 2);
        const ringCol = lerpColor(C.gold, C.rose, layer / layers * s.hover);
        ctx.strokeStyle = rgba(ringCol, 0.04 + layer * 0.012 + s.hover * 0.04);
        ctx.lineWidth = 0.5 + s.hover * 0.3;
        ctx.stroke();

        for (let p = 0; p < petals; p++) {
          const angle = (p / petals) * Math.PI * 2 + rotation;
          const innerR = r * 0.4 * breathe;
          const outerR = r * breathe;
          const pw = Math.PI / petals * 0.6;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
          ctx.quadraticCurveTo(cx + Math.cos(angle + pw) * outerR * 0.7, cy + Math.sin(angle + pw) * outerR * 0.7, cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
          ctx.quadraticCurveTo(cx + Math.cos(angle - pw) * outerR * 0.7, cy + Math.sin(angle - pw) * outerR * 0.7, cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
          const petalCol = lerpColor(C.gold, C.goldLight, Math.sin(s.time + p + layer) * 0.5 + 0.5);
          ctx.strokeStyle = rgba(petalCol, 0.05 + Math.sin(s.time + p + layer) * 0.025 + s.hover * 0.04);
          ctx.lineWidth = 0.6 + s.hover * 0.3;
          ctx.stroke();

          // Petal tip glow on hover
          if (s.hover > 0.3) {
            const tipX = cx + Math.cos(angle) * outerR;
            const tipY = cy + Math.sin(angle) * outerR;
            ctx.beginPath(); ctx.arc(tipX, tipY, 2, 0, Math.PI * 2);
            ctx.fillStyle = rgba(C.goldLight, (s.hover - 0.3) * 0.3 * Math.sin(s.time * 3 + p));
            ctx.fill();
          }
        }
      }

      // Center jewel — larger on hover
      const jr = maxR * (0.12 + s.hover * 0.06);
      const jg = ctx.createRadialGradient(cx, cy, 0, cx, cy, jr * 3);
      jg.addColorStop(0, rgba(C.goldLight, 0.25 + s.hover * 0.2 + Math.sin(s.time * 2) * 0.05));
      jg.addColorStop(0.3, rgba(C.gold, 0.08 + s.hover * 0.05));
      jg.addColorStop(1, rgba(C.gold, 0));
      ctx.fillStyle = jg; ctx.beginPath(); ctx.arc(cx, cy, jr * 3, 0, Math.PI * 2); ctx.fill();

      drawCursorGlow(ctx, s, C.goldLight, 100);
      if (s.clicked) bursts.trigger(s.mx > 0 ? s.mx : cx, s.my > 0 ? s.my : cy, 30, C.goldLight);
      bursts.update(ctx);
      requestAnimationFrame(draw);
    }
    draw();
  }

  // ============================================
  // 10. TREE OF LIFE — Hover grows more branches + leaves glow
  // ============================================
  function treeOfLife(container) {
    const { canvas, ctx, state: s } = createCanvas(container);
    const bursts = createBurstSystem();

    function drawBranch(x, y, angle, length, depth, maxDepth) {
      if (depth > maxDepth || length < 2) return;
      const sway = Math.sin(s.time * 2 + depth * 0.5 + x * 0.01) * (0.04 + s.hover * 0.03);
      const endX = x + Math.cos(angle + sway) * length;
      const endY = y + Math.sin(angle + sway) * length;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(endX, endY);
      const alpha = (0.04 + (1 - depth / maxDepth) * 0.08) * (1 + s.hover * 0.6);
      const col = lerpColor(C.gold, C.goldLight, depth / maxDepth);
      ctx.strokeStyle = rgba(col, alpha);
      ctx.lineWidth = Math.max(0.4, (maxDepth - depth) * (0.5 + s.hover * 0.15));
      ctx.stroke();

      if (depth >= maxDepth - 1) {
        const pulse = Math.sin(s.time * 3 + x + y) * 0.5 + 0.5;
        const leafR = 4 + s.hover * 4;
        const g = ctx.createRadialGradient(endX, endY, 0, endX, endY, leafR);
        g.addColorStop(0, rgba(C.goldLight, pulse * (0.15 + s.hover * 0.2)));
        g.addColorStop(1, rgba(C.gold, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(endX, endY, leafR, 0, Math.PI * 2); ctx.fill();
      }

      const branchAngle = 0.4 + Math.sin(s.time * 0.5 + depth) * 0.08;
      const shrink = 0.72 + s.hover * 0.02;
      drawBranch(endX, endY, angle - branchAngle, length * shrink, depth + 1, maxDepth);
      drawBranch(endX, endY, angle + branchAngle, length * shrink, depth + 1, maxDepth);
    }

    function draw() {
      s.time += 0.003;
      const { w, h } = s;
      ctx.clearRect(0, 0, w, h);

      const bg = ctx.createRadialGradient(w/2, h*0.8, 0, w/2, h/2, Math.max(w,h)*0.7);
      bg.addColorStop(0, rgba(C.canopy, 0.3 + s.hover * 0.08));
      bg.addColorStop(1, rgba(C.deep, 0.85));
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const tx = w / 2, base = h * 0.85, trunkLen = h * 0.12;
      const maxD = 7 + Math.round(s.hover * 2);

      // Roots
      ctx.save(); ctx.globalAlpha = 0.4 + s.hover * 0.2;
      drawBranch(tx, base, Math.PI/2 + 0.3, trunkLen * 0.6, 0, 5);
      drawBranch(tx, base, Math.PI/2 - 0.3, trunkLen * 0.6, 0, 5);
      drawBranch(tx, base, Math.PI/2, trunkLen * 0.5, 0, 4);
      ctx.restore();

      // Trunk
      ctx.beginPath(); ctx.moveTo(tx, base); ctx.lineTo(tx, base - trunkLen);
      ctx.strokeStyle = rgba(C.gold, 0.12 + s.hover * 0.08);
      ctx.lineWidth = 2.5 + s.hover * 1.5; ctx.stroke();

      // Crown
      drawBranch(tx, base - trunkLen, -Math.PI/2 - 0.1, trunkLen * 0.8, 0, maxD);
      drawBranch(tx, base - trunkLen, -Math.PI/2 + 0.1, trunkLen * 0.8, 0, maxD);
      drawBranch(tx, base - trunkLen, -Math.PI/2 - 0.5, trunkLen * 0.6, 0, maxD - 1);
      drawBranch(tx, base - trunkLen, -Math.PI/2 + 0.5, trunkLen * 0.6, 0, maxD - 1);

      // Circle of life
      const circleR = Math.min(w, h) * (0.38 + s.hover * 0.04);
      ctx.beginPath(); ctx.arc(tx, base - trunkLen + trunkLen * 0.3, circleR, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(C.gold, 0.03 + Math.sin(s.time) * 0.02 + s.hover * 0.04);
      ctx.lineWidth = 0.6 + s.hover * 0.4; ctx.stroke();

      drawCursorGlow(ctx, s, C.goldLight, 100);
      if (s.clicked) bursts.trigger(s.mx > 0 ? s.mx : tx, s.my > 0 ? s.my : base - trunkLen, 35, C.goldLight);
      bursts.update(ctx);
      requestAnimationFrame(draw);
    }
    draw();
  }

  // ============================================
  // INIT — Map placeholders → animations
  // ============================================
  const animMap = [
    { selector: '.hero__bg .placeholder-image', fn: heroAurora },
    { context: 'Shakina Ray Portrait', fn: flowerOfLife },
    { context: 'Earth & Sacred Geometry', fn: earthWireframe },
    { context: 'Sunrise & Golden Light', fn: sunriseRays },
    { context: 'Energetic Wellness Session', fn: energyBody },
    { context: 'Spirit Communication', fn: spiritOrbs },
    { context: 'Land & Earth Healing', fn: terrainGrid },
    { context: 'Massage Therapy', fn: flowingLines },
    { context: 'Shakina Ray / Misty Dawn', fn: mandala },
    { context: 'Nature & Sacred Space', fn: treeOfLife },
  ];

  animMap.forEach(entry => {
    let el;
    if (entry.selector) { el = document.querySelector(entry.selector); }
    else { document.querySelectorAll('.placeholder-image').forEach(div => { if (div.textContent.trim() === entry.context) el = div; }); }
    if (el) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { entry.fn(el); observer.unobserve(el); } });
      }, { threshold: 0.05 });
      observer.observe(el);
    }
  });

  // Reveals handled by CSS IntersectionObserver in main.js — no GSAP override
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAnimations);
else initAnimations();
