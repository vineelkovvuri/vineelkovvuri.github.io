(function () {
    "use strict";

    var W = 420, H = 480;
    var RECORD_KEY = "breakoutRecord";

    var BRICK_ROWS = 5;
    var BRICK_COLS = 8;
    var BRICK_GAP = 4;
    var BRICK_TOP = 40;
    var BRICK_H = 20;
    var BRICK_W = (W - BRICK_GAP) / BRICK_COLS - BRICK_GAP;

    var ROW_COLORS = ["#e74c3c", "#e67e22", "#f5a623", "#6ab04c", "#5a9fd4"];

    // ---- DOM ----
    var board = document.getElementById("brkBoard");
    var ctx = board.getContext("2d");
    var el = {
        score: document.getElementById("brkScore"),
        lives: document.getElementById("brkLives"),
        level: document.getElementById("brkLevel"),
        record: document.getElementById("brkRecord"),
        overlay: document.getElementById("brkOverlay"),
        overTitle: document.getElementById("brkOverTitle"),
        overText: document.getElementById("brkOverText"),
        start: document.getElementById("brkStart"),
        pause: document.getElementById("brkPause")
    };

    // ---- State ----
    var paddle, ball, bricks, score, lives, level, record;
    var rafId, lastTime;
    var leftHeld = false, rightHeld = false;
    var running = false, paused = false, gameOver = true;
    var ballLaunched = false;

    function loadRecord() {
        try { var v = parseInt(localStorage.getItem(RECORD_KEY), 10); record = isNaN(v) ? 0 : v; }
        catch (e) { record = 0; }
        el.record.textContent = record;
    }
    function saveRecord() {
        try { localStorage.setItem(RECORD_KEY, String(record)); } catch (e) { /* ignore */ }
    }

    function buildBricks() {
        bricks = [];
        for (var r = 0; r < BRICK_ROWS; r++) {
            for (var c = 0; c < BRICK_COLS; c++) {
                bricks.push({
                    x: BRICK_GAP + c * (BRICK_W + BRICK_GAP),
                    y: BRICK_TOP + r * (BRICK_H + BRICK_GAP),
                    w: BRICK_W,
                    h: BRICK_H,
                    hits: BRICK_ROWS - r,      // top rows are tougher
                    color: ROW_COLORS[r % ROW_COLORS.length],
                    alive: true
                });
            }
        }
    }

    function resetBall() {
        ballLaunched = false;
        ball = {
            x: paddle.x + paddle.w / 2,
            y: paddle.y - 8,
            r: 7,
            vx: 0,
            vy: 0,
            speed: 4 + (level - 1) * 0.6
        };
    }

    function launchBall() {
        if (ballLaunched) { return; }
        ballLaunched = true;
        var angle = (Math.random() * 0.6 - 0.3) - Math.PI / 2; // mostly up
        ball.vx = Math.cos(angle) * ball.speed;
        ball.vy = Math.sin(angle) * ball.speed;
    }

    function updateStats() {
        el.score.textContent = score;
        el.lives.textContent = lives;
        el.level.textContent = level;
    }

    // ---- Rendering ----
    function draw() {
        ctx.clearRect(0, 0, W, H);

        for (var i = 0; i < bricks.length; i++) {
            var b = bricks[i];
            if (!b.alive) { continue; }
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, b.y, b.w, b.h);
            if (b.hits > 1) {
                ctx.fillStyle = "rgba(255,255,255,0.35)";
                ctx.fillRect(b.x, b.y, b.w, b.h / 2);
            }
        }

        // paddle
        ctx.fillStyle = "#2c3e50";
        roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 6);
        ctx.fill();

        // ball
        ctx.fillStyle = "#5a9fd4";
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fill();

        if (!ballLaunched && running && !paused) {
            ctx.fillStyle = "#7f8c8d";
            ctx.font = "13px 'Segoe UI', sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("Press Space / tap to launch", W / 2, H - 20);
        }
    }

    function roundRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    // ---- Physics ----
    function update(dt) {
        var pspeed = 7;
        if (leftHeld) { paddle.x -= pspeed; }
        if (rightHeld) { paddle.x += pspeed; }
        paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

        if (!ballLaunched) {
            ball.x = paddle.x + paddle.w / 2;
            ball.y = paddle.y - 8;
            return;
        }

        ball.x += ball.vx;
        ball.y += ball.vy;

        // walls
        if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
        if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
        if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }

        // paddle
        if (ball.vy > 0 &&
            ball.y + ball.r >= paddle.y &&
            ball.y + ball.r <= paddle.y + paddle.h + 10 &&
            ball.x >= paddle.x - ball.r &&
            ball.x <= paddle.x + paddle.w + ball.r) {
            var hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2); // -1..1
            hit = Math.max(-1, Math.min(1, hit));
            var angle = hit * (Math.PI / 3); // up to 60deg
            ball.vx = Math.sin(angle) * ball.speed;
            ball.vy = -Math.cos(angle) * ball.speed;
            ball.y = paddle.y - ball.r - 1;
        }

        // bricks
        for (var i = 0; i < bricks.length; i++) {
            var b = bricks[i];
            if (!b.alive) { continue; }
            if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w &&
                ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
                // determine bounce side
                var overlapL = ball.x + ball.r - b.x;
                var overlapR = b.x + b.w - (ball.x - ball.r);
                var overlapT = ball.y + ball.r - b.y;
                var overlapB = b.y + b.h - (ball.y - ball.r);
                var minX = Math.min(overlapL, overlapR);
                var minY = Math.min(overlapT, overlapB);
                if (minX < minY) { ball.vx = -ball.vx; } else { ball.vy = -ball.vy; }

                b.hits--;
                score += 10 * level;
                if (b.hits <= 0) { b.alive = false; }
                updateStats();
                break;
            }
        }

        // lost ball
        if (ball.y - ball.r > H) {
            lives--;
            updateStats();
            if (lives <= 0) { endGame(); return; }
            resetBall();
        }

        // level clear
        var remaining = 0;
        for (var j = 0; j < bricks.length; j++) { if (bricks[j].alive) { remaining++; } }
        if (remaining === 0) { nextLevel(); }
    }

    function nextLevel() {
        level++;
        score += 100;
        updateStats();
        buildBricks();
        resetBall();
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
        score = 0; lives = 3; level = 1;
        paddle = { x: W / 2 - 40, y: H - 30, w: 80, h: 12 };
        buildBricks();
        resetBall();
        gameOver = false;
        running = true;
        paused = false;
        el.pause.textContent = "PAUSE";
        el.overlay.classList.add("brk-hidden");
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
            el.overlay.classList.remove("brk-hidden");
        } else {
            el.overlay.classList.add("brk-hidden");
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
        else if (score >= 3000) { medal = "🥇"; title = "AWESOME!"; }
        else if (score >= 1000) { medal = "🥈"; title = "GREAT RUN!"; }
        else if (score >= 300) { medal = "🥉"; title = "NICE!"; }
        else { medal = "🧱"; title = "GAME OVER"; }

        el.overTitle.innerHTML = '<span class="brk-medal">' + medal + '</span><br>' + title;
        el.overText.innerHTML =
            '<div class="brk-scoreboard">' +
                '<div class="brk-score-row"><span>⭐ Score</span><b>' + score + '</b></div>' +
                '<div class="brk-score-row"><span>🚀 Level</span><b>' + level + '</b></div>' +
                '<div class="brk-score-row"><span>🏅 Record</span><b>' + record + '</b></div>' +
            '</div>';
        el.start.textContent = "PLAY AGAIN";
        el.overlay.classList.remove("brk-hidden");

        if (isRecord && score > 0) { launchConfetti(90); }
    }

    function launchConfetti(count) {
        var colors = ["#f5a623", "#2bb3d6", "#6ab04c", "#e74c3c", "#5a9fd4", "#9b59b6"];
        var layer = document.createElement("div");
        layer.className = "brk-confetti";
        el.overlay.appendChild(layer);
        for (var i = 0; i < count; i++) {
            var piece = document.createElement("span");
            piece.className = "brk-confetti-piece";
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
            case " ": launchBall(); e.preventDefault(); break;
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

    // Mouse / touch move on board
    function moveToClientX(clientX) {
        if (!running || paused) { return; }
        var rect = board.getBoundingClientRect();
        var x = (clientX - rect.left) * (W / rect.width);
        paddle.x = Math.max(0, Math.min(W - paddle.w, x - paddle.w / 2));
    }
    board.addEventListener("mousemove", function (e) { moveToClientX(e.clientX); });
    board.addEventListener("mousedown", function (e) { launchBall(); moveToClientX(e.clientX); });
    board.addEventListener("touchstart", function (e) {
        launchBall();
        if (e.touches[0]) { moveToClientX(e.touches[0].clientX); }
        e.preventDefault();
    }, { passive: false });
    board.addEventListener("touchmove", function (e) {
        if (e.touches[0]) { moveToClientX(e.touches[0].clientX); }
        e.preventDefault();
    }, { passive: false });

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
    bindHold("brkLeft", function (v) { leftHeld = v; });
    bindHold("brkRight", function (v) { rightHeld = v; });

    loadRecord();
})();
