// Space-filling render of the human apoptosome, PDB 3J2T. Plain canvas 2D.
//
// Alpha carbons only, drawn as shaded discs and sorted back to front, which
// reads as a molecular surface at this size without computing one. Spheres are
// pre-rendered once into a small sprite atlas, a few brightness steps per
// chain type, because building a radial gradient per atom per frame is far too
// slow at ~8700 atoms.
//
// The particle is a clean C7 about z, so assets/apoptosome.js ships one Apaf-1
// chain and one cytochrome c and this file spins them into the other six.

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.querySelector('.apoptosome-canvas');
    if (!canvas || typeof APOPTOSOME === 'undefined') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.closest('figure').hidden = false;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Config from the markup, so one renderer serves both the captioned figure
    // and the oversized decorative one on the 404 page.
    const ALWAYS = canvas.dataset.spin === 'always';
    const FILL = parseFloat(canvas.dataset.fill) || 0.46;

    // ---- build the full particle from the asymmetric unit -------------------
    const build = () => {
        const out = [];
        // Each Apaf-1 copy is tagged with its own index so the seven spokes can
        // be coloured apart. Seven identical spokes make the spin almost
        // impossible to see, since the particle is identical every 51.4 degrees.
        const add = (flat, kindOf) => {
            for (let c = 0; c < APOPTOSOME.n; c++) {
                const t = (2 * Math.PI * c) / APOPTOSOME.n;
                const cs = Math.cos(t), sn = Math.sin(t);
                const kind = kindOf(c);
                for (let i = 0; i < flat.length; i += 3) {
                    const x = flat[i], y = flat[i + 1], z = flat[i + 2];
                    out.push(x * cs - y * sn, x * sn + y * cs, z, kind);
                }
            }
        };
        add(APOPTOSOME.apaf, c => c);              // 0..6, one per spoke
        add(APOPTOSOME.cytc, () => APOPTOSOME.n);  // 7, all cytochrome c
        return out;                       // flat [x, y, z, kind] * N
    };
    const atoms = build();
    const N = atoms.length / 4;

    // ---- sprite atlas ------------------------------------------------------
    const STEPS = 10;                     // brightness bands, cheap depth cue
    let sprites = [], spriteR = 0;

    // Seven spoke colours swept through hue between two palette endpoints,
    // plus one constant colour for cytochrome c so it still reads as a
    // separate protein rather than an eighth spoke.
    const hexToHsl = hex => {
        const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
        const l = (mx + mn) / 2;
        if (!d) return [0, 0, l];
        const s = d / (1 - Math.abs(2 * l - 1));
        const h = mx === r ? ((g - b) / d + (g < b ? 6 : 0))
                : mx === g ? (b - r) / d + 2
                : (r - g) / d + 4;
        return [h * 60, s, l];
    };

    const hslToRgb = (h, s, l) => {
        h = ((h % 360) + 360) % 360;
        const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
                        : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
        return [r + m, g + m, b + m].map(v => Math.round(v * 255));
    };

    const colours = () => {
        const st = getComputedStyle(document.documentElement);
        const a = hexToHsl(st.getPropertyValue('--apo-ring').trim() || '#8b8ef5');
        const b = hexToHsl(st.getPropertyValue('--apo-ring-end').trim() || '#f472b6');
        const out = [];
        for (let i = 0; i < APOPTOSOME.n; i++) {
            const t = i / (APOPTOSOME.n - 1);
            out.push(hslToRgb(a[0] + (b[0] - a[0]) * t,
                              a[1] + (b[1] - a[1]) * t,
                              a[2] + (b[2] - a[2]) * t));
        }
        const core = st.getPropertyValue('--apo-core').trim() || '#f0913f';
        out.push([1, 3, 5].map(i => parseInt(core.slice(i, i + 2), 16)));
        return out;
    };

    const buildSprites = r => {
        spriteR = r;
        const size = Math.ceil(r * 2) + 2;
        sprites = colours().map(rgb => {
            return Array.from({ length: STEPS }, (_, s) => {
                const k = 0.42 + 0.58 * (s / (STEPS - 1));      // far to near
                const c = document.createElement('canvas');
                c.width = c.height = size;
                const g = c.getContext('2d');
                const grad = g.createRadialGradient(
                    size * 0.38, size * 0.34, r * 0.1, size / 2, size / 2, r);
                const lit = rgb.map(v => Math.min(255, Math.round(v * k + 70 * k)));
                const dim = rgb.map(v => Math.round(v * k * 0.42));
                grad.addColorStop(0, `rgb(${lit.join(',')})`);
                grad.addColorStop(1, `rgb(${dim.join(',')})`);
                g.fillStyle = grad;
                g.beginPath();
                g.arc(size / 2, size / 2, r, 0, Math.PI * 2);
                g.fill();
                return c;
            });
        });
    };

    // ---- layout ------------------------------------------------------------
    let w = 0, h = 0, scale = 1;
    const layout = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = canvas.getBoundingClientRect();
        w = rect.width; h = rect.height;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        scale = Math.min(w, h) * FILL / 100;
        buildSprites(Math.max(1.8, scale * 3.4));
    };

    // ---- draw --------------------------------------------------------------
    const order = new Int32Array(N);
    const zs = new Float32Array(N);
    const px = new Float32Array(N), py = new Float32Array(N);

    // Spin is about the particle's own C7 axis, which is z and runs
    // perpendicular to the plane of the ring, so it turns like a wheel rather
    // than tumbling edge-on. The viewing tilt is applied after, and only so
    // the disc reads as three-dimensional instead of flat.
    const draw = (spin, tilt) => {
        ctx.clearRect(0, 0, w, h);
        const cs = Math.cos(spin), sn = Math.sin(spin);
        const ct = Math.cos(tilt), st = Math.sin(tilt);
        const cx = w / 2, cy = h / 2;

        for (let i = 0; i < N; i++) {
            const j = i * 4;
            const x = atoms[j], y = atoms[j + 1], z = atoms[j + 2];
            const sx = x * cs - y * sn;          // about the symmetry axis
            const sy = x * sn + y * cs;
            px[i] = cx + sx * scale;
            py[i] = cy + (sy * ct - z * st) * scale;
            zs[i] = sy * st + z * ct;            // depth after the tilt
            order[i] = i;
        }
        // back to front
        order.sort((a, b) => zs[a] - zs[b]);

        for (let n = 0; n < N; n++) {
            const i = order[n];
            const band = Math.min(STEPS - 1, Math.max(0,
                (((zs[i] + 110) / 220) * STEPS) | 0));
            const sp = sprites[atoms[i * 4 + 3]][band];
            ctx.drawImage(sp, px[i] - spriteR - 1, py[i] - spriteR - 1);
        }
    };

    // ---- motion ------------------------------------------------------------
    const TILT = 0.30;
    let angle = 0, spinning = false, raf = 0, prev = 0;
    const SPEED = 0.0007;                 // rad/ms, a slow turn

    const frame = now => {
        angle += (now - prev) * SPEED;
        prev = now;
        draw(angle, TILT);
        if (spinning) raf = requestAnimationFrame(frame);
    };

    const start = () => {
        if (spinning || reduce.matches) return;
        spinning = true;
        prev = performance.now();
        raf = requestAnimationFrame(frame);
    };
    const stop = () => { spinning = false; cancelAnimationFrame(raf); };

    if (ALWAYS) {
        // Only run while the canvas is actually on screen.
        new IntersectionObserver(es => es[0].isIntersecting ? start() : stop())
            .observe(canvas);
    } else {
        canvas.addEventListener('pointerenter', start);
        canvas.addEventListener('pointerleave', stop);
        canvas.addEventListener('focus', start);
        canvas.addEventListener('blur', stop);
    }

    const refresh = () => { layout(); draw(angle, TILT); };
    refresh();
    window.addEventListener('load', refresh);
    window.addEventListener('resize', refresh);
    new MutationObserver(refresh).observe(document.documentElement, {
        attributes: true, attributeFilter: ['data-theme']
    });
});
