(function () {
    "use strict";

    var W = 440, H = 440;
    var RECORD_KEY = "asteroidsRecord";

    var SHIP_R = 12;
    var TURN = 0.09;
    var THRUST = 0.14;
    var FRICTION = 0.99;
    var BULLET_SPEED = 6;
    var BULLET_LIFE = 60;      // frames
    var INVULN = 120;          // frames after respawn

    var SIZES = { 3: 34, 2: 20, 1: 11 };   // radius by size tier
    var POINTS = { 3: 20, 2: 50, 1: 100 };

    // ---- DOM ----
    var board = document.getElementById("astBoard");
    var ctx = board.getContext("2d");
    var el = {
        score: document.getElementById("astScore"),
        lives: document.getElementById("astLives"),
        wave: document.getElementById("astWave"),
        record: document.getElementById("astRecord"),
        overlay: document.getElementById("astOverlay"),
        overTitle: document.getElementById("astOverTitle"),
        overText: document.getElementById("astOverText"),
        start: document.getElementById("astStart"),
        pause: document.getElementById("astPause")
    };

    // ---- State ----
    var ship, asteroids, bullets, score, lives, wave, record, invuln;
    var rafId;
    var leftHeld = false, rightHeld = false, thrustHeld = false;
    var running = false, paused = false, gameOver = true;
    var fireCooldown = 0;

    function loadRecord() {
        try { var v = parseInt(localStorage.getItem(RECORD_KEY), 10); record = isNaN(v) ? 0 : v; }
        catch (e) { record = 0; }
        el.record.textContent = record;
    }
    function saveRecord() {
        try { localStorage.setItem(RECORD_KEY, String(record)); } catch (e) { /* ignore */ }
    }

    function makeAsteroid(x, y, size) {
        var speed = (1 + Math.random() * 1.2) * (4 - size) * 0.6 + wave * 0.15;
        var angle = Math.random() * Math.PI * 2;
        var verts = [];
        var n = 9 + Math.floor(Math.random() * 4);
        for (var i = 0; i < n; i++) {
            verts.push(0.7 + Math.random() * 0.5);
        }
        return {
            x: x, y: y, size: size, r: SIZES[size],
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.06,
            verts: verts
        };
    }

    function spawnWave() {
        asteroids = [];
        var count = 3 + wave;
        for (var i = 0; i < count; i++) {
            // spawn away from center/ship
            var x, y;
            do {
                x = Math.random() * W;
                y = Math.random() * H;
            } while (Math.hypot(x - W / 2, y - H / 2) < 110);
            asteroids.push(makeAsteroid(x, y, 3));
        }
    }

    function resetShip() {
        ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, angle: -Math.PI / 2 };
        invuln = INVULN;
    }

    function updateStats() {
        el.score.textContent = score;
        el.lives.textContent = lives;
        el.wave.textContent = wave;
    }

    function fire() {
        if (fireCooldown > 0 || !running || paused) { return; }
        bullets.push({
            x: ship.x + Math.cos(ship.angle) * SHIP_R,
            y: ship.y + Math.sin(ship.angle) * SHIP_R,
            vx: Math.cos(ship.angle) * BULLET_SPEED + ship.vx,
            vy: Math.sin(ship.angle) * BULLET_SPEED + ship.vy,
            life: BULLET_LIFE
        });
        fireCooldown = 10;
    }

    function wrap(o) {
        if (o.x < 0) { o.x += W; } else if (o.x > W) { o.x -= W; }
        if (o.y < 0) { o.y += H; } else if (o.y > H) { o.y -= H; }
    }

    // ---- Rendering ----
    function draw() {
        ctx.clearRect(0, 0, W, H);

        // asteroids
        ctx.strokeStyle = "#7f8c8d";
        ctx.fillStyle = "#d7dee6";
        ctx.lineWidth = 2;
        for (var i = 0; i < asteroids.length; i++) {
            var a = asteroids[i];
            ctx.save();
            ctx.translate(a.x, a.y);
            ctx.rotate(a.angle);
            ctx.beginPath();
            for (var v = 0; v < a.verts.length; v++) {
                var ang = (v / a.verts.length) * Math.PI * 2;
                var rr = a.r * a.verts[v];
                var px = Math.cos(ang) * rr;
                var py = Math.sin(ang) * rr;
                if (v === 0) { ctx.moveTo(px, py); } else { ctx.lineTo(px, py); }
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // bullets
        ctx.fillStyle = "#e74c3c";
        for (var b = 0; b < bullets.length; b++) {
            ctx.beginPath();
            ctx.arc(bullets[b].x, bullets[b].y, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // ship
        if (!gameOver) {
            var blink = invuln > 0 && Math.floor(invuln / 6) % 2 === 0;
            if (!blink) {
                ctx.save();
                ctx.translate(ship.x, ship.y);
                ctx.rotate(ship.angle);
                ctx.strokeStyle = "#5a9fd4";
                ctx.fillStyle = "#dcecf7";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(SHIP_R, 0);
                ctx.lineTo(-SHIP_R * 0.7, -SHIP_R * 0.7);
                ctx.lineTo(-SHIP_R * 0.4, 0);
                ctx.lineTo(-SHIP_R * 0.7, SHIP_R * 0.7);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                // flame
                if (thrustHeld) {
                    ctx.strokeStyle = "#f5a623";
                    ctx.beginPath();
                    ctx.moveTo(-SHIP_R * 0.4, 0);
                    ctx.lineTo(-SHIP_R * 1.2, 0);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }
    }

    // ---- Update ----
    function update() {
        if (leftHeld) { ship.angle -= TURN; }
        if (rightHeld) { ship.angle += TURN; }
        if (thrustHeld) {
            ship.vx += Math.cos(ship.angle) * THRUST;
            ship.vy += Math.sin(ship.angle) * THRUST;
        }
        ship.vx *= FRICTION;
        ship.vy *= FRICTION;
        ship.x += ship.vx;
        ship.y += ship.vy;
        wrap(ship);
        if (invuln > 0) { invuln--; }
        if (fireCooldown > 0) { fireCooldown--; }

        // bullets
        for (var i = bullets.length - 1; i >= 0; i--) {
            var bl = bullets[i];
            bl.x += bl.vx; bl.y += bl.vy;
            wrap(bl);
            bl.life--;
            if (bl.life <= 0) { bullets.splice(i, 1); }
        }

        // asteroids move
        for (var a = 0; a < asteroids.length; a++) {
            asteroids[a].x += asteroids[a].vx;
            asteroids[a].y += asteroids[a].vy;
            asteroids[a].angle += asteroids[a].spin;
            wrap(asteroids[a]);
        }

        // bullet vs asteroid
        for (var bi = bullets.length - 1; bi >= 0; bi--) {
            for (var ai = asteroids.length - 1; ai >= 0; ai--) {
                var ast = asteroids[ai];
                if (Math.hypot(bullets[bi].x - ast.x, bullets[bi].y - ast.y) < ast.r) {
                    bullets.splice(bi, 1);
                    splitAsteroid(ai);
                    break;
                }
            }
        }

        // ship vs asteroid
        if (invuln <= 0) {
            for (var k = 0; k < asteroids.length; k++) {
                if (Math.hypot(ship.x - asteroids[k].x, ship.y - asteroids[k].y) < asteroids[k].r + SHIP_R * 0.6) {
                    loseLife();
                    return;
                }
            }
        }

        if (asteroids.length === 0) { nextWave(); }
    }

    function splitAsteroid(index) {
        var a = asteroids[index];
        score += POINTS[a.size];
        updateStats();
        asteroids.splice(index, 1);
        if (a.size > 1) {
            for (var i = 0; i < 2; i++) {
                asteroids.push(makeAsteroid(a.x, a.y, a.size - 1));
            }
        }
    }

    function loseLife() {
        lives--;
        updateStats();
        if (lives <= 0) { endGame(); return; }
        resetShip();
    }

    function nextWave() {
        wave++;
        score += 100;
        updateStats();
        bullets = [];
        resetShip();
        spawnWave();
    }

    function tick() {
        if (!running) { return; }
        if (!paused) {
            update();
            if (!running) { return; }
            draw();
        }
        rafId = requestAnimationFrame(tick);
    }

    // ---- Game flow ----
    function startGame() {
        score = 0; lives = 3; wave = 1;
        bullets = [];
        fireCooldown = 0;
        resetShip();
        spawnWave();
        gameOver = false;
        running = true;
        paused = false;
        el.pause.textContent = "PAUSE";
        el.overlay.classList.add("ast-hidden");
        updateStats();
        draw();
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
            el.overlay.classList.remove("ast-hidden");
        } else {
            el.overlay.classList.add("ast-hidden");
        }
    }

    function endGame() {
        running = false;
        gameOver = true;
        cancelAnimationFrame(rafId);
        draw();

        var isRecord = score > record;
        if (isRecord) { record = score; saveRecord(); el.record.textContent = record; }

        var medal, title;
        if (isRecord && score > 0) { medal = "🏆"; title = "NEW RECORD!"; }
        else if (score >= 3000) { medal = "🥇"; title = "AWESOME!"; }
        else if (score >= 1200) { medal = "🥈"; title = "GREAT RUN!"; }
        else if (score >= 400) { medal = "🥉"; title = "NICE!"; }
        else { medal = "🚀"; title = "GAME OVER"; }

        el.overTitle.innerHTML = '<span class="ast-medal">' + medal + '</span><br>' + title;
        el.overText.innerHTML =
            '<div class="ast-scoreboard">' +
                '<div class="ast-score-row"><span>⭐ Score</span><b>' + score + '</b></div>' +
                '<div class="ast-score-row"><span>🌊 Wave</span><b>' + wave + '</b></div>' +
                '<div class="ast-score-row"><span>🏅 Record</span><b>' + record + '</b></div>' +
            '</div>';
        el.start.textContent = "PLAY AGAIN";
        el.overlay.classList.remove("ast-hidden");

        if (isRecord && score > 0) { launchConfetti(90); }
    }

    function launchConfetti(count) {
        var colors = ["#f5a623", "#2bb3d6", "#6ab04c", "#e74c3c", "#5a9fd4", "#9b59b6"];
        var layer = document.createElement("div");
        layer.className = "ast-confetti";
        el.overlay.appendChild(layer);
        for (var i = 0; i < count; i++) {
            var piece = document.createElement("span");
            piece.className = "ast-confetti-piece";
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
            case "ArrowUp": case "w": case "W": thrustHeld = true; e.preventDefault(); break;
            case " ": fire(); e.preventDefault(); break;
            case "p": case "P": togglePause(); break;
            default: break;
        }
    });
    document.addEventListener("keyup", function (e) {
        switch (e.key) {
            case "ArrowLeft": case "a": case "A": leftHeld = false; break;
            case "ArrowRight": case "d": case "D": rightHeld = false; break;
            case "ArrowUp": case "w": case "W": thrustHeld = false; break;
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
    bindHold("astLeft", function (v) { leftHeld = v; });
    bindHold("astRight", function (v) { rightHeld = v; });
    bindHold("astThrust", function (v) { thrustHeld = v; });
    (function () {
        var btn = document.getElementById("astFire");
        btn.addEventListener("click", function (ev) { ev.preventDefault(); fire(); });
    })();

    loadRecord();
})();
