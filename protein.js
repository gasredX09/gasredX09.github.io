// Renders the two alpha-carbon traces in assets/backbones.js side by side and
// spins them as the page scrolls. Plain canvas 2D: no library, no WebGL. The
// depth cue is done by sorting segments back to front and modulating width and
// alpha by z, which is enough to read as three-dimensional at this size.

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.querySelector('.structure-canvas');
    if (!canvas || typeof BACKBONES === 'undefined') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Revealed only once we know we can draw, so a reader with scripts off
    // gets no empty box where the figure would be.
    canvas.closest('figure').hidden = false;
    const models = [
        { key: 'laproteina', label: 'La-Proteina' },
        { key: 'reqflow', label: 'ReQFlow' }
    ];
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    let w = 0, h = 0, stacked = false;

    const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = canvas.getBoundingClientRect();
        w = rect.width;
        h = rect.height;
        stacked = w < 520;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Read theme colours from CSS so the drawing follows the light/dark toggle.
    const themeColours = () => {
        const s = getComputedStyle(document.documentElement);
        return {
            start: s.getPropertyValue('--protein-n').trim() || '#60a5fa',
            end: s.getPropertyValue('--protein-c').trim() || '#c084fc',
            label: s.getPropertyValue('--text-muted').trim() || '#7e7e8f'
        };
    };

    const mix = (a, b, t) => {
        const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
        const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
        return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
    };

    const draw = angle => {
        const col = themeColours();
        ctx.clearRect(0, 0, w, h);

        const cellW = stacked ? w : w / 2;
        const cellH = stacked ? h / 2 : h;
        const scale = Math.min(cellW, cellH) * 0.42 / 100;

        models.forEach((model, i) => {
            const pts = BACKBONES[model.key];
            if (!pts) return;
            const cx = stacked ? cellW / 2 : cellW * (i + 0.5);
            const cy = (stacked ? cellH * (i + 0.5) : cellH / 2) - 8;

            // rotate about Y, then a fixed tilt about X, then orthographic
            const ca = Math.cos(angle), sa = Math.sin(angle);
            const tilt = 0.42, ct = Math.cos(tilt), st = Math.sin(tilt);
            const proj = pts.map(([x, y, z]) => {
                const rx = x * ca + z * sa;
                const rz = -x * sa + z * ca;
                const ry = y * ct - rz * st;
                const dz = y * st + rz * ct;
                return [cx + rx * scale, cy + ry * scale, dz];
            });

            // back to front so nearer segments overdraw farther ones
            const segs = [];
            for (let k = 0; k < proj.length - 1; k++) {
                segs.push({ k, z: (proj[k][2] + proj[k + 1][2]) / 2 });
            }
            segs.sort((p, q) => p.z - q.z);

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            for (const { k, z } of segs) {
                const d = (z + 100) / 200;                 // 0 far, 1 near
                ctx.beginPath();
                ctx.moveTo(proj[k][0], proj[k][1]);
                ctx.lineTo(proj[k + 1][0], proj[k + 1][1]);
                ctx.strokeStyle = mix(col.start, col.end, k / (proj.length - 1));
                ctx.globalAlpha = 0.35 + 0.65 * d;
                ctx.lineWidth = (1.4 + 2.8 * d) * (scale * 100 / 60);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;

            ctx.fillStyle = col.label;
            ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(model.label, cx, stacked ? cellH * (i + 1) - 6 : h - 6);
        });
    };

    // Scroll drives rotation. Cached geometry, rAF-throttled, passive listener.
    let top = 0, height = 1, ticking = false;
    const measure = () => {
        const r = canvas.getBoundingClientRect();
        top = r.top + window.scrollY;
        height = r.height;
    };

    const angleNow = () => {
        const progress = (window.scrollY + window.innerHeight - top) / (window.innerHeight + height);
        return Math.max(0, Math.min(1, progress)) * Math.PI * 2;
    };

    const render = () => draw(reduce.matches ? 0.9 : angleNow());

    const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            try { render(); } finally { ticking = false; }
        });
    };

    const refresh = () => { resize(); measure(); render(); };

    refresh();
    window.addEventListener('load', refresh);
    window.addEventListener('resize', refresh);
    if (!reduce.matches) window.addEventListener('scroll', onScroll, { passive: true });
    reduce.addEventListener('change', render);

    // follow the light/dark toggle
    new MutationObserver(render).observe(document.documentElement, {
        attributes: true, attributeFilter: ['data-theme']
    });
});
