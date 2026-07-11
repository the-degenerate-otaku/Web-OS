// cat-behaviour.js — basic behavior pack for a flat pixel-grid sprite
// Usage: CatBehaviour.init({ jsonPath: 'cat-skin.json' })

const CatBehaviour = (function () {
    const PX = 8; // on-screen size per sprite pixel
    const RED = { r: 224, g: 35, b: 36 };

    const cfg = {
        jsonPath: 'cat-skin.json',
        sleepTimeoutMs: 5 * 60 * 1000,
        overheatWpmThreshold: 80,
        heatRampSpeed: 0.04,
        heatDecaySpeed: 0.025,
        roamSpeed: 0.6
    };

    let canvas, ctx, sprite, grid, palette, W, H;
    let cat = { x: 100, y: 0, dir: 1, mode: 'roam', heat: 0, bob: 0 };
    let keyTimes = [], lastActivity = Date.now();
    let mouse = { x: 0, y: 0 };
    let dragging = false, dragOffset = [0, 0];

    function lerp(a, b, t) { return a + (b - a) * t; }
    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
    }
    function heatColor(hex, heat) {
        if (heat <= 0 || hex === 'transparent') return hex;
        const c = hexToRgb(hex);
        return rgbToHex(lerp(c.r, RED.r, heat), lerp(c.g, RED.g, heat), lerp(c.b, RED.b, heat));
    }

    async function init(userCfg = {}) {
        Object.assign(cfg, userCfg);
        const res = await fetch(cfg.jsonPath);
        sprite = await res.json();
        grid = sprite.pixelData;
        palette = sprite.palette;
        W = sprite.dimensions.width;
        H = sprite.dimensions.height;

        canvas = document.createElement('canvas');
        canvas.id = 'voidcat-canvas';
        canvas.width = W * PX;
        canvas.height = H * PX;
        canvas.style.cssText = `position:fixed;left:0;top:0;width:${W * PX}px;height:${H * PX}px;z-index:9998;image-rendering:pixelated;cursor:grab`;
        document.body.appendChild(canvas);
        ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        cat.y = window.innerHeight - H * PX - 40;
        cat.x = Math.random() * (window.innerWidth - W * PX);

        document.addEventListener('keydown', onKeydown);
        document.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('click', onClick);

        requestAnimationFrame(loop);
        return api;
    }

    function onKeydown() {
        const now = performance.now();
        keyTimes.push(now);
        keyTimes = keyTimes.filter(t => now - t < 2000);
        lastActivity = Date.now();
        if (['sleep', 'roam', 'idle'].includes(cat.mode)) cat.mode = 'typing';
        const wpm = (keyTimes.length / 2) * 12;
        if (wpm >= cfg.overheatWpmThreshold) cat.mode = 'overheat';
    }

    function onMouseMove(e) {
        mouse.x = e.clientX; mouse.y = e.clientY;
        if (dragging) { cat.x = mouse.x - dragOffset[0]; cat.y = mouse.y - dragOffset[1]; }
    }
    function onMouseDown(e) {
        dragging = true; cat.mode = 'drag';
        dragOffset = [e.clientX - cat.x, e.clientY - cat.y];
        canvas.style.cursor = 'grabbing';
    }
    function onMouseUp() {
        if (dragging) { dragging = false; cat.mode = 'idle'; canvas.style.cursor = 'grab'; }
    }
    function onClick() {
        if (dragging) return;
        cat.mode = 'petted';
        cat.pettedUntil = Date.now() + 500;
        lastActivity = Date.now();
    }

    function update() {
        const idleMs = Date.now() - lastActivity;
        const now = Date.now();
        if (cat.mode === 'petted' && now > cat.pettedUntil) cat.mode = 'idle';

        const wpm = (keyTimes.filter(t => performance.now() - t < 2000).length / 2) * 12;
        const targetHeat = cat.mode === 'overheat' ? 1 : (wpm > cfg.overheatWpmThreshold * 0.5 ? 0.4 : 0);
        cat.heat = targetHeat > cat.heat
            ? Math.min(1, cat.heat + cfg.heatRampSpeed)
            : Math.max(0, cat.heat - cfg.heatDecaySpeed);
        if (cat.mode === 'overheat' && cat.heat < 0.15 && wpm < cfg.overheatWpmThreshold) {
            cat.mode = keyTimes.length ? 'typing' : 'idle';
        }
        if (cat.mode === 'typing' && idleMs > 1200) cat.mode = 'idle';
        if (cat.mode === 'idle' && idleMs > 2500) cat.mode = 'roam';
        if (idleMs > cfg.sleepTimeoutMs) cat.mode = 'sleep';

        if (cat.mode === 'roam') {
            cat.x += cat.dir * cfg.roamSpeed;
            if (cat.x < 0 || cat.x > window.innerWidth - W * PX) cat.dir *= -1;
        }

        cat.bob += cat.mode === 'typing' ? 0.4 : cat.mode === 'overheat' ? 0.9 : 0.08;
    }

    function render() {
        if (!grid) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.left = cat.x + 'px';
        canvas.style.top = cat.y + 'px';

        ctx.save();
        if (cat.dir < 0) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
        if (cat.mode === 'sleep') ctx.globalAlpha = 0.75;

        // whole-sprite squash/bounce stands in for animation (flat single-frame sprite)
        const squish = cat.mode === 'typing' ? 1 + Math.sin(cat.bob) * 0.04
            : cat.mode === 'overheat' ? 1 + Math.sin(cat.bob) * 0.09
                : cat.mode === 'petted' ? 1.1 : 1;
        ctx.translate(canvas.width / 2, canvas.height);
        ctx.scale(squish, 1 / squish);
        ctx.translate(-canvas.width / 2, -canvas.height);

        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const idx = grid[y][x];
                const color = palette[idx];
                if (color === 'transparent') continue;
                ctx.fillStyle = heatColor(color, cat.heat);
                ctx.fillRect(x * PX, y * PX, PX, PX);
            }
        }
        ctx.restore();

        if (cat.mode === 'sleep') {
            ctx.fillStyle = '#ffffff';
            ctx.font = '11px monospace';
            ctx.fillText('z z z', canvas.width - 20, 14);
        }
    }

    function loop() { update(); render(); requestAnimationFrame(loop); }

    const api = { init, get state() { return { ...cat }; }, config: cfg };
    return api;
})();