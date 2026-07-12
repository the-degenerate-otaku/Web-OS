

const ComnyangPet = (function () {
    const PX = 4;
    const OFFSETS = {
        body: [0, 0], head: [0, 0], earL: [1, -6], earR: [15, -6],
        tail: [19, 4], legFl: [5, 12], legFr: [10, 12], legRl: [2, 13], legRr: [12, 13]
    };
    const DRAW_ORDER = ['legRl', 'legRr', 'tail', 'body', 'head', 'earL', 'earR'];
    const RED = { r: 224, g: 35, b: 36 };

    const cfg = {
        sleepTimeoutMs: 5 * 60 * 1000,
        overheatWpmThreshold: 80,
        heatRampSpeed: 0.03,
        heatDecaySpeed: 0.02,
        roamSpeed: 0.6,
        pounceSpeed: 4,
        pounceTriggerDist: 250,
        idleQuirkIntervalMs: [4000, 9000],
        canvasSize: [200, 160],
        jsonPath: 'comnyang-pattern-comnyang-dark.json',
        debugAlign: false
    };

    let canvas, ctx, pattern;
    let cat = { x: 100, y: 0, dir: 1, mode: 'roam', heat: 0, lean: 0, squash: 1, tailWag: 0 };
    let keyTimes = [], particles = [], lastActivity = Date.now();
    let mouse = { x: 0, y: 0, lastX: 0, lastY: 0, lastMove: Date.now() };
    let dragging = false, dragOffset = [0, 0];
    let quirkTimer = null;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
    }
    function heatColor(hex, heat) {
        if (heat <= 0) return hex;
        const c = hexToRgb(hex);
        return rgbToHex(lerp(c.r, RED.r, heat), lerp(c.g, RED.g, heat), lerp(c.b, RED.b, heat));
    }

    async function init(userCfg = {}) {
        Object.assign(cfg, userCfg);
        const res = await fetch(cfg.jsonPath || 'comnyang-pattern-comnyang-dark.json');
        const data = await res.json();
        pattern = data.preset.pattern;

        canvas = document.createElement('canvas');
        canvas.id = 'comnyang-canvas';
        canvas.width = cfg.canvasSize[0];
        canvas.height = cfg.canvasSize[1];
        canvas.style.cssText = `position:fixed;left:0;top:0;width:${cfg.canvasSize[0]}px;height:${cfg.canvasSize[1]}px;z-index:9998;image-rendering:pixelated;cursor:grab`;
        document.body.appendChild(canvas);
        ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        cat.y = window.innerHeight - 140;
        cat.x = Math.random() * (window.innerWidth - cfg.canvasSize[0]);

        document.addEventListener('keydown', onKeydown);
        document.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('click', onClick);

        scheduleQuirk();
        requestAnimationFrame(loop);
        if (cfg.debugAlign) initDebugAlign();
        return api;
    }


    function initDebugAlign() {
        const partKeys = Object.keys(OFFSETS);
        let selected = 0;
        const label = document.createElement('div');
        label.style.cssText = 'position:fixed;top:8px;left:8px;z-index:99999;background:#000;color:#0f0;font:12px monospace;padding:6px 10px;border-radius:4px';
        document.body.appendChild(label);
        const updateLabel = () => label.textContent = `[align] ${partKeys[selected]}  (1-9 select, arrows nudge, shift=5px)`;
        updateLabel();
        window.addEventListener('keydown', (e) => {
            const n = parseInt(e.key);
            if (n >= 1 && n <= partKeys.length) { selected = n - 1; updateLabel(); return; }
            const step = e.shiftKey ? 5 : 1;
            const off = OFFSETS[partKeys[selected]];
            let changed = true;
            if (e.key === 'ArrowUp') off[1] -= step;
            else if (e.key === 'ArrowDown') off[1] += step;
            else if (e.key === 'ArrowLeft') off[0] -= step;
            else if (e.key === 'ArrowRight') off[0] += step;
            else changed = false;
            if (changed) {
                e.preventDefault();
                console.log('OFFSETS =', JSON.stringify(OFFSETS));
            }
        });
    }

    function onKeydown() {
        const now = performance.now();
        keyTimes.push(now);
        keyTimes = keyTimes.filter(t => now - t < 2000);
        lastActivity = Date.now();
        cat.pawPhase = !cat.pawPhase;
        if (cat.mode === 'sleep' || cat.mode === 'roam' || cat.mode === 'idle') cat.mode = 'typing';

        const wpm = (keyTimes.length / 2) * 12; 
        if (wpm >= cfg.overheatWpmThreshold) cat.mode = 'overheat';
    }

    function onMouseMove(e) {
        mouse.lastX = mouse.x; mouse.lastY = mouse.y;
        mouse.x = e.clientX; mouse.y = e.clientY;
        const speed = Math.hypot(mouse.x - mouse.lastX, mouse.y - mouse.lastY);
        mouse.lastMove = Date.now();

        if (dragging) {
            cat.x = mouse.x - dragOffset[0];
            cat.y = mouse.y - dragOffset[1];
            return;
        }
        const cx = cat.x + cfg.canvasSize[0] / 2, cy = cat.y + cfg.canvasSize[1] / 2;
        const dist = Math.hypot(mouse.x - cx, mouse.y - cy);
        if (speed > 45 && dist < cfg.pounceTriggerDist && cat.mode !== 'overheat' && cat.mode !== 'typing') {
            cat.mode = 'pounce';
            lastActivity = Date.now();
        }
    
        cat.lean = Math.max(-3, Math.min(3, (mouse.x - cx) / 80));
    }

    function onMouseDown(e) {
        dragging = true;
        cat.mode = 'drag';
        dragOffset = [e.clientX - cat.x, e.clientY - cat.y];
        canvas.style.cursor = 'grabbing';
    }
    function onMouseUp() {
        if (dragging) {
            dragging = false;
            cat.mode = 'idle';
            canvas.style.cursor = 'grab';
        }
    }
    function onClick() {
        if (dragging) return;
        cat.mode = 'petted';
        cat.pettedUntil = Date.now() + 700;
        lastActivity = Date.now();
        for (let i = 0; i < 5; i++) {
            particles.push({ x: cfg.canvasSize[0] / 2 + (Math.random() * 20 - 10), y: 40, life: 25, heart: true });
        }
    }


    function startle() {
        cat.mode = 'startled';
        cat.startledUntil = Date.now() + 400;
        lastActivity = Date.now();
    }

    function scheduleQuirk() {
        const [min, max] = cfg.idleQuirkIntervalMs;
        clearTimeout(quirkTimer);
        quirkTimer = setTimeout(() => {
            if (['roam', 'idle', 'sleep'].includes(cat.mode)) triggerQuirk();
            scheduleQuirk();
        }, min + Math.random() * (max - min));
    }
    function triggerQuirk() {
        const quirks = ['blink', 'stretch', 'tailflick'];
        cat.quirk = quirks[Math.floor(Math.random() * quirks.length)];
        cat.quirkUntil = Date.now() + 500;
    }


    
    function update() {
        const idleMs = Date.now() - lastActivity;
        const now = Date.now();

        if (cat.mode === 'petted' && now > cat.pettedUntil) cat.mode = 'idle';
        if (cat.mode === 'startled' && now > cat.startledUntil) cat.mode = 'idle';
        if (cat.quirk && now > cat.quirkUntil) cat.quirk = null;

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
            if (cat.x < 0 || cat.x > window.innerWidth - cfg.canvasSize[0]) cat.dir *= -1;
        }
        if (cat.mode === 'pounce') {
            const cx = cat.x + cfg.canvasSize[0] / 2;
            cat.x += Math.sign(mouse.x - cx) * cfg.pounceSpeed;
            cat.dir = Math.sign(mouse.x - cx) || cat.dir;
            if (Math.abs(mouse.x - cx) < 20 || Date.now() - mouse.lastMove > 600) cat.mode = 'idle';
        }

        if (cat.mode === 'overheat' && Math.random() < 0.5) {
            particles.push({ x: 90 + Math.random() * 20, y: 0, life: 20, heart: false });
        }
        particles.forEach(p => p.y -= p.heart ? 1 : 2);
        particles.forEach(p => p.life--);
        particles = particles.filter(p => p.life > 0);

        cat.tailWag += 0.08;
        cat.squash = cat.quirk === 'stretch' ? 1.15 : 1;
    }

    function drawPart(name, heat) {
        const off = OFFSETS[name];
        for (const { x, y, color } of pattern[name]) {
            ctx.fillStyle = heat > 0 ? heatColor(color, heat) : color;
            ctx.fillRect((off[0] + x) * PX, (off[1] + y) * PX, PX, PX);
        }
    }

    function render() {
        if (!pattern) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.left = cat.x + 'px';
        canvas.style.top = cat.y + 'px';

        ctx.save();
        if (cat.dir < 0) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
        ctx.translate(cat.lean, 0);
        if (cat.quirk === 'stretch') ctx.scale(1, cat.squash);
        if (cat.mode === 'sleep') ctx.globalAlpha = 0.75;

        const pawBob = (cat.mode === 'typing' || cat.mode === 'overheat')
            ? (cat.mode === 'overheat' ? Math.sin(performance.now() / 40) * 3 : (cat.pawPhase ? 2 : -2))
            : Math.sin(cat.tailWag) * (cat.mode === 'roam' ? 1.5 : 0);

        for (const part of DRAW_ORDER) {
            if (part === 'legFl' || part === 'legFr') continue;
            drawPart(part, cat.heat);
        }
        const savedFl = OFFSETS.legFl[1], savedFr = OFFSETS.legFr[1];
        OFFSETS.legFl[1] += pawBob;
        OFFSETS.legFr[1] -= pawBob;
        drawPart('legFl', cat.heat);
        drawPart('legFr', cat.heat);
        OFFSETS.legFl[1] = savedFl;
        OFFSETS.legFr[1] = savedFr;

        if (cat.quirk === 'blink') {
            ctx.fillStyle = heatColor('#1A1A1A', cat.heat);
            ctx.fillRect((OFFSETS.head[0] + 3) * PX, (OFFSETS.head[1] + 5) * PX, 14 * PX, 2 * PX);
        }
        ctx.restore();

        if (cat.mode === 'sleep') {
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px monospace';
            ctx.fillText('z z z', canvas.width / 2 + 10, 20);
        }

        particles.forEach(p => {
            ctx.fillStyle = p.heart ? '#ff6b8a' : '#ff5555';
            ctx.fillRect(p.x, p.y + 20, p.heart ? 5 : 3, p.heart ? 5 : 3);
        });
    }

    function loop() { update(); render(); requestAnimationFrame(loop); }

    const api = { init, startle, get state() { return { ...cat }; }, config: cfg };
    return api;
})();
