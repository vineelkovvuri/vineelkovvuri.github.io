(function () {
    "use strict";

    var W = 420, H = 460;
    var RECORD_KEY = "spaceInvadersRecord";

    var ALIEN_ROWS = 4;
    var ALIEN_COLS = 8;
    var ALIEN_W = 26, ALIEN_H = 20;
    var ALIEN_GAP_X = 18, ALIEN_GAP_Y = 14;
    var ALIEN_TOP = 40, ALIEN_LEFT = 24;

    var ROW_COLORS = ["#e74c3c", "#e67e22", "#f5a623", "#6ab04c"];
    var ROW_POINTS = [40, 30, 20, 10];

    // ---- DOM ----
    var board = document.getElementById("invBoard");
    var ctx = board.getContext("2d");
    var el = {
        score: document.getElementById("invScore"),
        lives: document.getElementById("invLives"),
        wave: document.getElementById("invWave"),
        record: document.getElementById("invRecord"),
        overlay: document.getElementById("invOverlay"),
        overTitle: document.getElementById("invOverTitle"),
        overText: document.getElementById("invOverText"),
        start: document.getElementById("invStart"),
        pause: document.getElementById("invPause")
    };

    // ---- State ----
    var ship, aliens, bullets, bombs, score, lives, wave, record;
    var alienDir, alienSpeed, alienStepTimer, alienBombTimer;
    var rafId, lastTime;
    var leftHeld = false, rightHeld = false, fireHeld = false, fireCooldown = 0;
    var running = false, paused = false, gameOver = true;

    function loadRecord() {
        try { var v = parseInt(localStorage.getItem(RECORD_KEY), 10); record = isNaN(v) ? 0 : v; }
        catch (e) { record = 0; }
        el.record.textContent = record;
    }
    function saveRecord() {
        try { localStorage.setItem(RECORD_KEY, String(record)); } catch (e) { /* ignore */ }
    }

    function buildAliens() {
        aliens = [];
        for (var r = 0; r < ALIEN_ROWS; r++) {
            for (var c = 0; c < ALIEN_COLS; c++) {
                aliens.push({
                    x: ALIEN_LEFT + c * (ALIEN_W + ALIEN_GAP_X),
                    y: ALIEN_TOP + r * (ALIEN_H + ALIEN_GAP_Y),
                    row: r,
                    alive: true
                });
            }
        }
        alienDir = 1;
        alienSpeed = 12 + (wave - 1) * 4;
        alienStepTimer = 0;
        alienBombTimer = 0;
    }

    function updateStats() {
        el.score.textContent = score;
        el.lives.textContent = lives;
        el.wave.textContent = wave;
    }

    function fire() {
        if (fireCooldown > 0) { return; }
        bullets.push({ x: ship.x + ship.w / 2, y: ship.y, vy: -7 });
        fireCooldown = 18;
    }

    // ---- Rendering ----
    function drawAlien(a) {
        ctx.fillStyle = ROW_COLORS[a.row];
        ctx.fillRect(a.x, a.y, ALIEN_W, ALIEN_H);
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillRect(a.x + 5, a.y + 6, 4, 4);
        ctx.fillRect(a.x + ALIEN_W - 9, a.y + 6, 4, 4);
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);

        for (var i = 0; i < aliens.length; i++) {
            if (aliens[i].alive) { drawAlien(aliens[i]); }
        }

        // ship
        ctx.fillStyle = "#5a9fd4";
        ctx.beginPath();
        ctx.moveTo(ship.x + ship.w / 2, ship.y);
        ctx.lineTo(ship.x + ship.w, ship.y + ship.h);
        ctx.lineTo(ship.x, ship.y + ship.h);
        ctx.closePath();
        ctx.fill();

        // bullets
        ctx.fillStyle = "#2c3e50";
        for (var b = 0; b < bullets.length; b++) {
            ctx.fillRect(bullets[b].x - 2, bullets[b].y - 8, 4, 10);
        }

        // bombs
        ctx.fillStyle = "#e74c3c";
        for (var m = 0; m < bombs.length; m++) {
            ctx.fillRect(bombs[m].x - 2, bombs[m].y, 4, 10);
        }
    }

    // ---- Update ----
    function update(dt) {
        var pspeed = 6;
        if (leftHeld) { ship.x -= pspeed; }
        if (rightHeld) { ship.x += pspeed; }
        ship.x = Math.max(0, Math.min(W - ship.w, ship.x));
        if (fireHeld) { fire(); }
        if (fireCooldown > 0) { fireCooldown--; }

        // move aliens in steps
        alienStepTimer += dt;
        var stepEvery = Math.max(120, 700 - countAlive() * 8 - (wave - 1) * 40);
        if (alienStepTimer >= stepEvery) {
            alienStepTimer = 0;
            stepAliens();
        }

        // alien bombs
        alienBombTimer += dt;
        if (alienBombTimer >= Math.max(500, 1400 - wave * 100)) {
            alienBombTimer = 0;
            dropBomb();
        }

        // bullets
        for (var i = bullets.length - 1; i >= 0; i--) {
            bullets[i].y += bullets[i].vy;
            if (bullets[i].y < -12) { bullets.splice(i, 1); continue; }
            // hit alien
            for (var a = 0; a < aliens.length; a++) {
                var al = aliens[a];
                if (al.alive &&
                    bullets[i].x > al.x && bullets[i].x < al.x + ALIEN_W &&
                    bullets[i].y > al.y && bullets[i].y < al.y + ALIEN_H) {
                    al.alive = false;
                    score += ROW_POINTS[al.row];
                    updateStats();
                    bullets.splice(i, 1);
                    break;
                }
            }
        }

        // bombs
        for (var m = bombs.length - 1; m >= 0; m--) {
            bombs[m].y += bombs[m].vy;
            if (bombs[m].y > H) { bombs.splice(m, 1); continue; }
            if (bombs[m].x > ship.x && bombs[m].x < ship.x + ship.w &&
                bombs[m].y > ship.y && bombs[m].y < ship.y + ship.h) {
                bombs.splice(m, 1);
                loseLife();
                return;
            }
        }

        // wave clear
        if (countAlive() === 0) { nextWave(); }
    }

    function countAlive() {
        var n = 0;
        for (var i = 0; i < aliens.length; i++) { if (aliens[i].alive) { n++; } }
        return n;
    }

    function stepAliens() {
        var minX = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (var i = 0; i < aliens.length; i++) {
            if (!aliens[i].alive) { continue; }
            minX = Math.min(minX, aliens[i].x);
            maxX = Math.max(maxX, aliens[i].x + ALIEN_W);
            maxY = Math.max(maxY, aliens[i].y + ALIEN_H);
        }
        if (minX === Infinity) { return; }

        var dropDown = false;
        if (alienDir > 0 && maxX + alienSpeed >= W - 6) { dropDown = true; }
        else if (alienDir < 0 && minX - alienSpeed <= 6) { dropDown = true; }

        for (var j = 0; j < aliens.length; j++) {
            if (!aliens[j].alive) { continue; }
            if (dropDown) { aliens[j].y += ALIEN_H; }
            else { aliens[j].x += alienDir * alienSpeed; }
        }
        if (dropDown) { alienDir = -alienDir; }

        if (maxY >= ship.y) { endGame(); }
    }

    function dropBomb() {
        var alive = aliens.filter(function (a) { return a.alive; });
        if (!alive.length) { return; }
        var shooter = alive[Math.floor(Math.random() * alive.length)];
        bombs.push({ x: shooter.x + ALIEN_W / 2, y: shooter.y + ALIEN_H, vy: 3 + wave * 0.4 });
    }

    function loseLife() {
        lives--;
        updateStats();
        if (lives <= 0) { endGame(); return; }
        bombs = [];
        ship.x = W / 2 - ship.w / 2;
    }

    function nextWave() {
        wave++;
        score += 100;
        updateStats();
        bullets = []; bombs = [];
        buildAliens();
    }

    function tick(time) {
        if (!running) { return; }
        if (!paused) {
            var dt = time - lastTime;
            lastTime = time;
            update(dt);
            draw();
        } else {
            lastTime = time;
        }
        rafId = requestAnimationFrame(tick);
    }

    // ---- Game flow ----
    function startGame() {
        score = 0; lives = 3; wave = 1;
        ship = { x: W / 2 - 16, y: H - 30, w: 32, h: 18 };
        bullets = []; bombs = [];
        fireCooldown = 0;
        buildAliens();
        gameOver = false;
        running = true;
        paused = false;
        el.pause.textContent = "PAUSE";
        el.overlay.classList.add("inv-hidden");
        updateStats();
        draw();
        lastTime = performance.now();
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(tick);
    }

    function togglePause() {
        if (!running || gameOver) { return; }
        paused = !paused;
        el.pause.textContent = paused ? "RESUME" : "PAUSE";
        if (paused) {
            el.overTitle.textContent = "⏸ Paused";
            el.overText.innerHTML = "Take a breath.<br>Press <b>Resume</b> or <b>P</b> to continue.";
            el.start.textContent = "RESUME";
            el.overlay.classList.remove("inv-hidden");
        } else {
            el.overlay.classList.add("inv-hidden");
            lastTime = performance.now();
        }
    }

    function endGame() {
        running = false;
        gameOver = true;
        cancelAnimationFrame(rafId);

        var isRecord = score > record;
        if (isRecord) { record = score; saveRecord(); el.record.textContent = record; }

        var medal, title;
        if (isRecord && score > 0) { medal = "🏆"; title = "NEW RECORD!"; }
        else if (score >= 2000) { medal = "🥇"; title = "AWESOME!"; }
        else if (score >= 800) { medal = "🥈"; title = "GREAT RUN!"; }
        else if (score >= 200) { medal = "🥉"; title = "NICE!"; }
        else { medal = "👾"; title = "GAME OVER"; }

        el.overTitle.innerHTML = '<span class="inv-medal">' + medal + '</span><br>' + title;
        el.overText.innerHTML =
            '<div class="inv-scoreboard">' +
                '<div class="inv-score-row"><span>⭐ Score</span><b>' + score + '</b></div>' +
                '<div class="inv-score-row"><span>🌊 Wave</span><b>' + wave + '</b></div>' +
                '<div class="inv-score-row"><span>🏅 Record</span><b>' + record + '</b></div>' +
            '</div>';
        el.start.textContent = "PLAY AGAIN";
        el.overlay.classList.remove("inv-hidden");

        if (isRecord && score > 0) { launchConfetti(90); }
    }

    function launchConfetti(count) {
        var colors = ["#f5a623", "#2bb3d6", "#6ab04c", "#e74c3c", "#5a9fd4", "#9b59b6"];
        var layer = document.createElement("div");
        layer.className = "inv-confetti";
        el.overlay.appendChild(layer);
        for (var i = 0; i < count; i++) {
            var piece = document.createElement("span");
            piece.className = "inv-confetti-piece";
            piece.style.left = Math.random() * 100 + "%";
            piece.style.background = colors[Math.floor(Math.random() * colors.length)];
            piece.style.animationDelay = (Math.random() * 0.6) + "s";
            piece.style.animationDuration = (1.8 + Math.random() * 1.4) + "s";
            piece.style.transform = "rotate(" + (Math.random() * 360) + "deg)";
            layer.appendChild(piece);
        }
        setTimeout(function () { if (layer.parentNode) { layer.parentNode.removeChild(layer); } }, 3600);
    }

    // ---- Input ----
    el.start.addEventListener("click", function () {
        if (paused && running) { togglePause(); } else { startGame(); }
    });
    el.pause.addEventListener("click", togglePause);

    document.addEventListener("keydown", function (e) {
        if (!running) { return; }
        switch (e.key) {
            case "ArrowLeft": case "a": case "A": leftHeld = true; e.preventDefault(); break;
            case "ArrowRight": case "d": case "D": rightHeld = true; e.preventDefault(); break;
            case " ": fire(); e.preventDefault(); break;
            case "p": case "P": togglePause(); break;
            default: break;
        }
    });
    document.addEventListener("keyup", function (e) {
        switch (e.key) {
            case "ArrowLeft": case "a": case "A": leftHeld = false; break;
            case "ArrowRight": case "d": case "D": rightHeld = false; break;
            default: break;
        }
    });

    function bindHold(id, setter) {
        var btn = document.getElementById(id);
        var on = function (ev) { ev.preventDefault(); setter(true); };
        var off = function (ev) { ev.preventDefault(); setter(false); };
        btn.addEventListener("mousedown", on);
        btn.addEventListener("mouseup", off);
        btn.addEventListener("mouseleave", off);
        btn.addEventListener("touchstart", on, { passive: false });
        btn.addEventListener("touchend", off);
    }
    bindHold("invLeft", function (v) { leftHeld = v; });
    bindHold("invRight", function (v) { rightHeld = v; });
    bindHold("invFire", function (v) { fireHeld = v; if (v) { fire(); } });

    loadRecord();
})();
