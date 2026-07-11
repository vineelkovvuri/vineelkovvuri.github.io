(function () {
    "use strict";

    var W = 420, H = 440;
    var RECORD_KEY = "pongWins";
    var WIN_SCORE = 7;

    var PADDLE_H = 70, PADDLE_W = 12, PADDLE_MARGIN = 16;

    // ---- DOM ----
    var board = document.getElementById("pngBoard");
    var ctx = board.getContext("2d");
    var el = {
        you: document.getElementById("pngYou"),
        cpu: document.getElementById("pngCpu"),
        rally: document.getElementById("pngRally"),
        record: document.getElementById("pngRecord"),
        overlay: document.getElementById("pngOverlay"),
        overTitle: document.getElementById("pngOverTitle"),
        overText: document.getElementById("pngOverText"),
        start: document.getElementById("pngStart"),
        pause: document.getElementById("pngPause")
    };

    // ---- State ----
    var player, cpu, ball, youScore, cpuScore, rally, wins;
    var rafId, lastTime;
    var upHeld = false, downHeld = false;
    var running = false, paused = false, gameOver = true;

    function loadRecord() {
        try { var v = parseInt(localStorage.getItem(RECORD_KEY), 10); wins = isNaN(v) ? 0 : v; }
        catch (e) { wins = 0; }
        el.record.textContent = wins;
    }
    function saveRecord() {
        try { localStorage.setItem(RECORD_KEY, String(wins)); } catch (e) { /* ignore */ }
    }

    function resetBall(dir) {
        rally = 0;
        el.rally.textContent = rally;
        ball = {
            x: W / 2, y: H / 2, r: 7,
            speed: 4.2,
            vx: dir * 4.2,
            vy: (Math.random() * 2 - 1) * 3
        };
    }

    function updateStats() {
        el.you.textContent = youScore;
        el.cpu.textContent = cpuScore;
        el.rally.textContent = rally;
    }

    // ---- Rendering ----
    function draw() {
        ctx.clearRect(0, 0, W, H);

        // center dashed line
        ctx.strokeStyle = "#d0d5dd";
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 12]);
        ctx.beginPath();
        ctx.moveTo(W / 2, 0);
        ctx.lineTo(W / 2, H);
        ctx.stroke();
        ctx.setLineDash([]);

        // paddles
        ctx.fillStyle = "#5a9fd4";
        ctx.fillRect(player.x, player.y, PADDLE_W, PADDLE_H);
        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(cpu.x, cpu.y, PADDLE_W, PADDLE_H);

        // ball
        ctx.fillStyle = "#2c3e50";
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fill();
    }

    // ---- Physics ----
    function update() {
        var pspeed = 6;
        if (upHeld) { player.y -= pspeed; }
        if (downHeld) { player.y += pspeed; }
        player.y = Math.max(0, Math.min(H - PADDLE_H, player.y));

        // CPU AI: follow ball with capped speed
        var cpuCenter = cpu.y + PADDLE_H / 2;
        var target = ball.y;
        var cpuSpeed = 4.4;
        if (cpuCenter < target - 6) { cpu.y += cpuSpeed; }
        else if (cpuCenter > target + 6) { cpu.y -= cpuSpeed; }
        cpu.y = Math.max(0, Math.min(H - PADDLE_H, cpu.y));

        ball.x += ball.vx;
        ball.y += ball.vy;

        // top/bottom walls
        if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }
        if (ball.y + ball.r > H) { ball.y = H - ball.r; ball.vy = -Math.abs(ball.vy); }

        // player paddle
        if (ball.vx < 0 &&
            ball.x - ball.r <= player.x + PADDLE_W &&
            ball.x - ball.r >= player.x - 6 &&
            ball.y >= player.y && ball.y <= player.y + PADDLE_H) {
            bounce(player);
            ball.vx = Math.abs(ball.vx);
            ball.x = player.x + PADDLE_W + ball.r;
        }

        // cpu paddle
        if (ball.vx > 0 &&
            ball.x + ball.r >= cpu.x &&
            ball.x + ball.r <= cpu.x + PADDLE_W + 6 &&
            ball.y >= cpu.y && ball.y <= cpu.y + PADDLE_H) {
            bounce(cpu);
            ball.vx = -Math.abs(ball.vx);
            ball.x = cpu.x - ball.r;
        }

        // scoring
        if (ball.x + ball.r < 0) {
            cpuScore++;
            updateStats();
            if (cpuScore >= WIN_SCORE) { endGame(false); return; }
            resetBall(-1);
        } else if (ball.x - ball.r > W) {
            youScore++;
            updateStats();
            if (youScore >= WIN_SCORE) { endGame(true); return; }
            resetBall(1);
        }
    }

    function bounce(paddle) {
        rally++;
        el.rally.textContent = rally;
        ball.speed = Math.min(9, ball.speed + 0.25);
        var rel = (ball.y - (paddle.y + PADDLE_H / 2)) / (PADDLE_H / 2); // -1..1
        rel = Math.max(-1, Math.min(1, rel));
        var angle = rel * (Math.PI / 4); // up to 45deg
        var sign = ball.vx > 0 ? 1 : -1;
        ball.vx = sign * Math.cos(angle) * ball.speed;
        ball.vy = Math.sin(angle) * ball.speed;
    }

    function tick(time) {
        if (!running) { return; }
        if (!paused) {
            lastTime = time;
            update();
            draw();
        } else {
            lastTime = time;
        }
        rafId = requestAnimationFrame(tick);
    }

    // ---- Game flow ----
    function startGame() {
        youScore = 0; cpuScore = 0;
        player = { x: PADDLE_MARGIN, y: H / 2 - PADDLE_H / 2 };
        cpu = { x: W - PADDLE_MARGIN - PADDLE_W, y: H / 2 - PADDLE_H / 2 };
        resetBall(Math.random() < 0.5 ? -1 : 1);
        gameOver = false;
        running = true;
        paused = false;
        el.pause.textContent = "PAUSE";
        el.overlay.classList.add("png-hidden");
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
            el.overlay.classList.remove("png-hidden");
        } else {
            el.overlay.classList.add("png-hidden");
            lastTime = performance.now();
        }
    }

    function endGame(won) {
        running = false;
        gameOver = true;
        cancelAnimationFrame(rafId);

        var medal, title;
        if (won) {
            wins++;
            saveRecord();
            el.record.textContent = wins;
            medal = "🏆"; title = "YOU WIN!";
        } else {
            medal = "🤖"; title = "COMPUTER WINS";
        }

        el.overTitle.innerHTML = '<span class="png-medal">' + medal + '</span><br>' + title;
        el.overText.innerHTML =
            '<div class="png-scoreboard">' +
                '<div class="png-score-row"><span>🙂 You</span><b>' + youScore + '</b></div>' +
                '<div class="png-score-row"><span>🤖 Computer</span><b>' + cpuScore + '</b></div>' +
                '<div class="png-score-row"><span>🏅 Total Wins</span><b>' + wins + '</b></div>' +
            '</div>';
        el.start.textContent = "PLAY AGAIN";
        el.overlay.classList.remove("png-hidden");

        if (won) { launchConfetti(90); }
    }

    function launchConfetti(count) {
        var colors = ["#f5a623", "#2bb3d6", "#6ab04c", "#e74c3c", "#5a9fd4", "#9b59b6"];
        var layer = document.createElement("div");
        layer.className = "png-confetti";
        el.overlay.appendChild(layer);
        for (var i = 0; i < count; i++) {
            var piece = document.createElement("span");
            piece.className = "png-confetti-piece";
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
            case "ArrowUp": case "w": case "W": upHeld = true; e.preventDefault(); break;
            case "ArrowDown": case "s": case "S": downHeld = true; e.preventDefault(); break;
            case "p": case "P": togglePause(); break;
            default: break;
        }
    });
    document.addEventListener("keyup", function (e) {
        switch (e.key) {
            case "ArrowUp": case "w": case "W": upHeld = false; break;
            case "ArrowDown": case "s": case "S": downHeld = false; break;
            default: break;
        }
    });

    function moveToClientY(clientY) {
        if (!running || paused) { return; }
        var rect = board.getBoundingClientRect();
        var y = (clientY - rect.top) * (H / rect.height);
        player.y = Math.max(0, Math.min(H - PADDLE_H, y - PADDLE_H / 2));
    }
    board.addEventListener("mousemove", function (e) { moveToClientY(e.clientY); });
    board.addEventListener("touchmove", function (e) {
        if (e.touches[0]) { moveToClientY(e.touches[0].clientY); }
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
    bindHold("pngUp", function (v) { upHeld = v; });
    bindHold("pngDown", function (v) { downHeld = v; });

    loadRecord();
})();
