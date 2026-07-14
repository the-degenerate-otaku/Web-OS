let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let cx = mouseX;
let cy = mouseY;
let cursorFxEnabled = true;
let particles = [];
let trailCtx = null;

const cursorEl = document.createElement("div");
cursorEl.className = "custom-cursor";

const trailCanvas = document.createElement("canvas");
trailCanvas.id = "cursor-trail-canvas";

function resizeTrailCanvas() {
    trailCanvas.width = window.innerWidth;
    trailCanvas.height = window.innerHeight;
}

function applyCursorFxState() {
    document.body.classList.toggle("cursor-fx-on", cursorFxEnabled);
    cursorEl.classList.toggle("hidden-cursor", !cursorFxEnabled);
    trailCanvas.classList.toggle("hidden-cursor", !cursorFxEnabled);
}

function spawnTrailParticle(x, y) {
    particles.push({ x, y, life: 1 });
    if (particles.length > 40) particles.shift();
}

function renderTrail() {
    trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent-color").trim();
    particles.forEach((p) => {
        trailCtx.globalAlpha = p.life;
        trailCtx.fillStyle = accent;
        trailCtx.beginPath();
        trailCtx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        trailCtx.fill();
        p.life -= 0.05;
    });
    particles = particles.filter((p) => p.life > 0);
    trailCtx.globalAlpha = 1;
}

function updateDockMagnet(mx, my) {
    const dock = document.getElementById("dock");
    if (!dock) return;
    const radius = 80;
    dock.querySelectorAll(".dock-item").forEach((item) => {
        const rect = item.getBoundingClientRect();
        const dx = mx - (rect.left + rect.width / 2);
        const dy = my - (rect.top + rect.height / 2);
        const dist = Math.hypot(dx, dy);
        if (dist < radius) {
            const pull = (1 - dist / radius) * 14;
            const angle = Math.atan2(dy, dx);
            item.style.transform = `translate(${Math.cos(angle) * pull}px, ${Math.sin(angle) * pull}px)`;
        } else {
            item.style.transform = "";
        }
    });
}

function updateParallax(mx, my) {
    const factors = [0.02, 0.035, 0.05];
    document.querySelectorAll(".glow-orb").forEach((orb, i) => {
        const dx = (mx - window.innerWidth / 2) * factors[i % factors.length];
        const dy = (my - window.innerHeight / 2) * factors[i % factors.length];
        orb.style.transform = `translate(${dx}px, ${dy}px)`;
    });
}

function runShimmer() {
    document.querySelectorAll(".window:not(.hidden) .window-header").forEach((header) => {
        header.classList.add("shimmer");
        setTimeout(() => header.classList.remove("shimmer"), 1000);
    });
}

function tick() {
    cx += (mouseX - cx) * 0.15;
    cy += (mouseY - cy) * 0.15;
    cursorEl.style.left = `${cx}px`;
    cursorEl.style.top = `${cy}px`;

    if (cursorFxEnabled) {
        updateDockMagnet(mouseX, mouseY);
        updateParallax(mouseX, mouseY);
        renderTrail();
    }

    requestAnimationFrame(tick);
}

function initAesthetics() {
    document.body.appendChild(cursorEl);
    document.body.appendChild(trailCanvas);
    trailCtx = trailCanvas.getContext("2d");
    resizeTrailCanvas();
    window.addEventListener("resize", resizeTrailCanvas);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const stored = localStorage.getItem("flux_cursor_fx");
    cursorFxEnabled = !reduceMotion && !coarsePointer && stored !== "off";

    const toggle = document.getElementById("cursor-fx-toggle");
    if (toggle) {
        toggle.checked = cursorFxEnabled;
        toggle.disabled = reduceMotion || coarsePointer;
        toggle.onchange = () => {
            cursorFxEnabled = toggle.checked;
            localStorage.setItem("flux_cursor_fx", cursorFxEnabled ? "on" : "off");
            applyCursorFxState();
        };
    }
    applyCursorFxState();

    document.addEventListener("mousemove", (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (cursorFxEnabled) spawnTrailParticle(mouseX, mouseY);
    });

    const hoverTargets = ".icon, .dock-item, .window-header, button, a, input, .theme-btn";
    document.addEventListener("mouseover", (e) => {
        if (cursorFxEnabled && e.target.closest(hoverTargets)) cursorEl.classList.add("cursor-hover");
    });
    document.addEventListener("mouseout", (e) => {
        if (e.target.closest(hoverTargets)) cursorEl.classList.remove("cursor-hover");
    });

    requestAnimationFrame(tick);
    setInterval(runShimmer, 20000);
}

document.addEventListener("DOMContentLoaded", initAesthetics);