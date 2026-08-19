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

    // ---- build the full particle from the asymmetric unit -------------------
    const build = () => {
        const out = [];
        const add = (flat, kind) => {
            for (let c = 0; c < APOPTOSOME.n; c++) {
                const t = (2 * Math.PI * c) / APOPTOSOME.n;
                const cs = Math.cos(t), sn = Math.sin(t);
                for (let i = 0; i < flat.length; i += 3) {
                    const x = flat[i], y = flat[i + 1], z = flat[i + 2];
                    out.push(x * cs - y * sn, x * sn + y * cs, z, kind);
                }
            }
        };
        add(APOPTOSOME.apaf, 0);
        add(APOPTOSOME.cytc, 1);
        return out;                       // flat [x, y, z, kind] * N
    };
    const atoms = build();
    const N = atoms.length / 4;

    // ---- sprite atlas ------------------------------------------------------
    const STEPS = 10;                     // brightness bands, cheap depth cue
    let sprites = [], spriteR = 0;

    const colours = () => {
        const s = getComputedStyle(document.documentElement);
        return [
            s.getPropertyValue('--apo-ring').trim() || '#8b8ef5',
            s.getPropertyValue('--apo-core').trim() || '#f0913f'
        ];
    };

    const buildSprites = r => {
        spriteR = r;
        const size = Math.ceil(r * 2) + 2;
        sprites = colours().map(hex => {
            const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
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
        scale = Math.min(w, h) * 0.46 / 100;
        buildSprites(Math.max(1.8, scale * 3.4));
    };

    // ---- draw --------------------------------------------------------------
    const order = new Int32Array(N);
    const zs = new Float32Array(N);
    const px = new Float32Array(N), py = new Float32Array(N);

    const draw = (ry, rx) => {
        ctx.clearRect(0, 0, w, h);
        const ca = Math.cos(ry), sa = Math.sin(ry);
        const ct = Math.cos(rx), st = Math.sin(rx);
        const cx = w / 2, cy = h / 2;

        for (let i = 0; i < N; i++) {
            const j = i * 4;
            const x = atoms[j], y = atoms[j + 1], z = atoms[j + 2];
            const rxx = x * ca + z * sa;
            const rz = -x * sa + z * ca;
            px[i] = cx + rxx * scale;
            py[i] = cy + (y * ct - rz * st) * scale;
            zs[i] = y * st + rz * ct;
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

    canvas.addEventListener('pointerenter', start);
    canvas.addEventListener('pointerleave', stop);
    canvas.addEventListener('focus', start);
    canvas.addEventListener('blur', stop);

    const refresh = () => { layout(); draw(angle, TILT); };
    refresh();
    window.addEventListener('load', refresh);
    window.addEventListener('resize', refresh);
    new MutationObserver(refresh).observe(document.documentElement, {
        attributes: true, attributeFilter: ['data-theme']
    });
});
