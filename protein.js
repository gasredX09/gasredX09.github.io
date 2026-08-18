// Draws a grid of alpha-carbon traces from assets/backbones.js. Plain canvas
// 2D: no library, no WebGL. Depth is conveyed by sorting segments back to
// front and modulating stroke width and alpha by z, which is enough to read as
// three-dimensional at this size.
//
// Scroll turns the whole grid. Dragging one structure spins that one on its
// own and the offset sticks. touch-action on the canvas keeps vertical
// scrolling with the page while horizontal drags rotate.

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.querySelector('.structure-canvas');
    if (!canvas || typeof BACKBONES === 'undefined' || !BACKBONES.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Revealed only once we know we can draw, so a reader with scripts off
    // gets no empty box where the figure would be.
    canvas.closest('figure').hidden = false;

    // The data file holds six La-Proteina samples then six ReQFlow. Take three
    // at random from each half so the caption stays true whatever comes up,
    // then shuffle the six so the generators are not in a predictable order.
    const shuffle = a => {
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };
    const half = BACKBONES.length / 2;
    const pick = n => shuffle([...Array(half).keys()].map(i => i + n)).slice(0, 3);
    const chosen = shuffle([...pick(0), ...pick(half)]);
    const models = chosen.map(i => BACKBONES[i]);
    const SHOWN = models.length;
    const spin = new Array(SHOWN).fill(0);      // per-structure drag offset

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let w = 0, h = 0, cols = 3, cellW = 0, cellH = 0;

    const layout = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = canvas.getBoundingClientRect();
        w = rect.width;
        h = rect.height;
        cols = w >= 820 ? 3 : 2;
        cellW = w / cols;
        cellH = h / Math.ceil(SHOWN / cols);
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Colours come from CSS so the drawing follows the light/dark toggle.
    const palette = () => {
        const s = getComputedStyle(document.documentElement);
        return {
            n: s.getPropertyValue('--protein-n').trim() || '#60a5fa',
            c: s.getPropertyValue('--protein-c').trim() || '#c084fc'
        };
    };

    const mix = (a, b, t) => {
        const parse = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
        const [r1, g1, b1] = parse(a), [r2, g2, b2] = parse(b);
        return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
    };

    const draw = base => {
        const col = palette();
        ctx.clearRect(0, 0, w, h);
        const scale = Math.min(cellW, cellH) * 0.40 / 100;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        models.forEach((pts, i) => {
            const cx = cellW * ((i % cols) + 0.5);
            const cy = cellH * (Math.floor(i / cols) + 0.5);
            const angle = base + spin[i];
            const ca = Math.cos(angle), sa = Math.sin(angle);
            const tilt = 0.42, ct = Math.cos(tilt), st = Math.sin(tilt);

            const proj = pts.map(([x, y, z]) => {
                const rx = x * ca + z * sa;
                const rz = -x * sa + z * ca;
                return [cx + rx * scale, cy + (y * ct - rz * st) * scale, y * st + rz * ct];
            });

            const segs = [];
            for (let k = 0; k < proj.length - 1; k++) {
                segs.push({ k, z: (proj[k][2] + proj[k + 1][2]) / 2 });
            }
            segs.sort((p, q) => p.z - q.z);

            for (const { k, z } of segs) {
                const d = (z + 100) / 200;                 // 0 far, 1 near
                ctx.beginPath();
                ctx.moveTo(proj[k][0], proj[k][1]);
                ctx.lineTo(proj[k + 1][0], proj[k + 1][1]);
                ctx.strokeStyle = mix(col.n, col.c, k / (proj.length - 1));
                ctx.globalAlpha = 0.35 + 0.65 * d;
                ctx.lineWidth = (1.2 + 2.4 * d) * (scale * 100 / 60);
                ctx.stroke();
            }
        });
        ctx.globalAlpha = 1;
    };

    // Scroll drives the shared rotation. Geometry cached, rAF-throttled.
    let top = 0, height = 1, ticking = false;
    const measure = () => {
        const r = canvas.getBoundingClientRect();
        top = r.top + window.scrollY;
        height = r.height;
    };

    const scrollAngle = () => {
        const p = (window.scrollY + window.innerHeight - top) / (window.innerHeight + height);
        return Math.max(0, Math.min(1, p)) * Math.PI * 2;
    };

    const render = () => draw(reduce.matches ? 0.9 : scrollAngle());

    const schedule = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            try { render(); } finally { ticking = false; }
        });
    };

    const refresh = () => { layout(); measure(); render(); };

    // Drag one structure to spin it independently of the others.
    let dragging = -1, lastX = 0;
    const cellAt = e => {
        const r = canvas.getBoundingClientRect();
        const i = Math.floor((e.clientY - r.top) / cellH) * cols
                + Math.floor((e.clientX - r.left) / cellW);
        return i >= 0 && i < SHOWN ? i : -1;
    };

    canvas.addEventListener('pointerdown', e => {
        dragging = cellAt(e);
        if (dragging < 0) return;
        lastX = e.clientX;
        canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', e => {
        if (dragging < 0) return;
        spin[dragging] += (e.clientX - lastX) * 0.012;
        lastX = e.clientX;
        schedule();
    });

    const endDrag = e => {
        if (dragging < 0) return;
        dragging = -1;
        if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    refresh();
    window.addEventListener('load', refresh);
    window.addEventListener('resize', refresh);
    if (!reduce.matches) window.addEventListener('scroll', schedule, { passive: true });
    reduce.addEventListener('change', render);

    new MutationObserver(render).observe(document.documentElement, {
        attributes: true, attributeFilter: ['data-theme']
    });
});
