// Draws a grid of alpha-carbon traces from assets/backbones.js. Plain canvas
// 2D: no library, no WebGL. Depth is conveyed by sorting segments back to
// front and modulating stroke width and alpha by z, which is enough to read as
// three-dimensional at this size.
//
// Each structure carries its own 3x3 orientation. Dragging rotates it about
// the screen-space axis perpendicular to the drag, so it follows the pointer
// whichever way you pull it; release with speed and it coasts about that same
// axis under friction. A hard scroll over one tumbles it about the horizontal.
// Scrolling the page turns the whole grid about the vertical on top of all of
// that.

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.querySelector('.structure-canvas');
    if (!canvas || typeof BACKBONES === 'undefined' || !BACKBONES.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Revealed only once we know we can draw, so a reader with scripts off
    // gets no empty box where the figure would be.
    canvas.closest('figure').hidden = false;

    // ---- small 3x3 helpers, row-major -------------------------------------
    const IDENT = () => [1, 0, 0, 0, 1, 0, 0, 0, 1];

    // Rodrigues: rotation about a unit axis by theta
    const axisAngle = ([x, y, z], t) => {
        const c = Math.cos(t), s = Math.sin(t), k = 1 - c;
        return [
            k * x * x + c,     k * x * y - s * z, k * x * z + s * y,
            k * x * y + s * z, k * y * y + c,     k * y * z - s * x,
            k * x * z - s * y, k * y * z + s * x, k * z * z + c
        ];
    };

    const mul = (a, b) => {
        const o = new Array(9);
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
            }
        }
        return o;
    };

    const apply = (m, x, y, z) => [
        m[0] * x + m[1] * y + m[2] * z,
        m[3] * x + m[4] * y + m[5] * z,
        m[6] * x + m[7] * y + m[8] * z
    ];

    // Turn the structure about an axis given in screen space. Pre-multiplying
    // is what makes the rotation feel attached to the pointer rather than to
    // the structure's own drifting frame.
    const turn = (i, axis, angle) => { rot[i] = mul(axisAngle(axis, angle), rot[i]); };

    // ---- state -------------------------------------------------------------
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
    const models = shuffle([...pick(0), ...pick(half)]).map(i => BACKBONES[i]);
    const SHOWN = models.length;

    const rot = models.map(IDENT);                  // per-structure orientation
    const axis = models.map(() => [0, 1, 0]);       // current spin axis
    const speed = new Array(SHOWN).fill(0);         // rad/ms about that axis

    const DRAG_K = 0.012;      // radians per pixel dragged
    const MAX_V = 0.03;        // rad/ms cap, about five turns a second
    const FRICTION = 0.9982;   // per ms; a hard flick coasts ~2.6 turns over ~3s
    const STOP_V = 0.00008;    // below this it is not visibly moving
    const HARD = 2.2;          // px/ms of wheel travel before a scroll counts

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

    // ---- drawing -----------------------------------------------------------
    const draw = base => {
        const col = palette();
        ctx.clearRect(0, 0, w, h);
        const scale = Math.min(cellW, cellH) * 0.40 / 100;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // shared page-scroll spin about the vertical, then a fixed viewing tilt
        const view = mul(axisAngle([1, 0, 0], 0.42), axisAngle([0, 1, 0], base));

        models.forEach((pts, i) => {
            const m = mul(view, rot[i]);
            const cx = cellW * ((i % cols) + 0.5);
            const cy = cellH * (Math.floor(i / cols) + 0.5);

            const proj = pts.map(([x, y, z]) => {
                const [px, py, pz] = apply(m, x, y, z);
                return [cx + px * scale, cy + py * scale, pz];
            });

            const segs = [];
            for (let k = 0; k < proj.length - 1; k++) {
                segs.push({ k, z: (proj[k][2] + proj[k + 1][2]) / 2 });
            }
            segs.sort((p, q) => p.z - q.z);       // back to front

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

    // ---- page scroll turns the whole grid ----------------------------------
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

    // ---- coasting ----------------------------------------------------------
    let coasting = false;
    const coast = () => {
        if (coasting) return;
        coasting = true;
        let prev = performance.now();
        const stepFrame = now => {
            const dt = Math.min(64, now - prev);   // ignore huge tab-switch gaps
            prev = now;
            let moving = false;
            for (let i = 0; i < SHOWN; i++) {
                // A held structure keeps whatever velocity the drag is building
                // up, otherwise releasing it mid-coast would throw nothing.
                if (i === dragging) continue;
                if (Math.abs(speed[i]) <= STOP_V) { speed[i] = 0; continue; }
                turn(i, axis[i], speed[i] * dt);
                speed[i] *= Math.pow(FRICTION, dt);
                moving = true;
            }
            render();
            if (moving) requestAnimationFrame(stepFrame);
            else coasting = false;
        };
        requestAnimationFrame(stepFrame);
    };

    // ---- pointer -----------------------------------------------------------
    let dragging = -1, lastX = 0, lastY = 0, lastT = 0;

    const cellAt = e => {
        const r = canvas.getBoundingClientRect();
        const i = Math.floor((e.clientY - r.top) / cellH) * cols
                + Math.floor((e.clientX - r.left) / cellW);
        return i >= 0 && i < SHOWN ? i : -1;
    };

    canvas.addEventListener('pointerdown', e => {
        dragging = cellAt(e);
        if (dragging < 0) return;
        speed[dragging] = 0;          // grabbing a spinning one stops it
        lastX = e.clientX; lastY = e.clientY; lastT = e.timeStamp;
        canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', e => {
        if (dragging < 0) return;
        const dx = e.clientX - lastX, dy = e.clientY - lastY;
        const len = Math.hypot(dx, dy);
        lastX = e.clientX; lastY = e.clientY;
        if (len < 0.01) return;

        // Axis perpendicular to the drag, in screen space: pulling right turns
        // it about the vertical, pulling down about the horizontal, and any
        // diagonal about the matching in-between axis.
        const ax = [-dy / len, dx / len, 0];
        const angle = len * DRAG_K;
        turn(dragging, ax, angle);

        const dt = Math.max(1, e.timeStamp - lastT);
        lastT = e.timeStamp;
        axis[dragging] = ax;
        // smooth so one jittery final event cannot dominate the throw
        speed[dragging] = speed[dragging] * 0.7 + (angle / dt) * 0.3;
        schedule();
    });

    const endDrag = e => {
        if (dragging < 0) return;
        const i = dragging;
        dragging = -1;
        if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
        speed[i] = Math.max(-MAX_V, Math.min(MAX_V, speed[i]));
        if (reduce.matches) speed[i] = 0;
        if (Math.abs(speed[i]) > STOP_V) coast();
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    // A hard scroll while the pointer is over a structure tumbles that one
    // about the horizontal. Judged on speed rather than raw delta so a mouse
    // wheel and a trackpad behave alike, and thresholded so ordinary scrolling
    // past the figure leaves everything alone. The listener is passive and
    // never calls preventDefault, so the page keeps scrolling normally.
    let wheelT = 0;
    canvas.addEventListener('wheel', e => {
        if (reduce.matches) return;
        const i = cellAt(e);
        if (i < 0) return;
        const dt = Math.max(1, e.timeStamp - wheelT);
        wheelT = e.timeStamp;
        const sp = e.deltaY / dt;
        if (Math.abs(sp) < HARD) return;
        axis[i] = [-1, 0, 0];
        speed[i] = Math.max(-MAX_V, Math.min(MAX_V, speed[i] + sp * 0.0016));
        coast();
    }, { passive: true });

    refresh();
    window.addEventListener('load', refresh);
    window.addEventListener('resize', refresh);
    if (!reduce.matches) window.addEventListener('scroll', schedule, { passive: true });
    reduce.addEventListener('change', render);

    new MutationObserver(render).observe(document.documentElement, {
        attributes: true, attributeFilter: ['data-theme']
    });
});
