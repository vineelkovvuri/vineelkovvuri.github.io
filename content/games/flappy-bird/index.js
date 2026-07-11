(function () {
    "use strict";

    var W = 360, H = 480;
    var RECORD_KEY = "flappyBirdRecord";

    var GRAVITY = 0.45;
    var FLAP = -7.2;
    var PIPE_W = 54;
    var GAP = 140;
    var PIPE_SPACING = 200;   // horizontal distance between pipes
    var SPEED = 2.2;
    var GROUND_H = 40;
    var BIRD_X = 90;
    var BIRD_R = 13;

    // ---- DOM ----
    var board = document.getElementById("fbyBoard");
    var ctx = board.getContext("2d");
    var el = {
        score: document.getElementById("fbyScore"),
        record: document.getElementById("fbyRecord"),
        overlay: document.getElementById("fbyOverlay"),
        overTitle: document.getElementById("fbyOverTitle"),
        overText: document.getElementById("fbyOverText"),
        start: document.getElementById("fbyStart"),
        pause: document.getElementById("fbyPause"),
        flap: document.getElementById("fbyFlap")
    };

    // ---- State ----
    var bird, pipes, score, record;
    var rafId, frameOffset;
    var running = false, paused = false, gameOver = true;

    function loadRecord() {
        try { var v = parseInt(localStorage.getItem(RECORD_KEY), 10); record = isNaN(v) ? 0 : v; }
        catch (e) { record = 0; }
        el.record.textContent = record;
    }
    function saveRecord() {
        try { localStorage.setItem(RECORD_KEY, String(record)); } catch (e) { /* ignore */ }
    }

    function spawnPipe(x) {
        var minTop = 40;
        var maxTop = H - GROUND_H - GAP - 40;
        var top = minTop + Math.random() * (maxTop - minTop);
        pipes.push({ x: x, top: top, passed: false });
    }

    function flap() {
        if (!running || paused) { return; }
        bird.vy = FLAP;
    }

    // ---- Rendering ----
    function draw() {
        ctx.clearRect(0, 0, W, H);

        // pipes
        for (var i = 0; i < pipes.length; i++) {
            var p = pipes[i];
            ctx.fillStyle = "#6ab04c";
            ctx.fillRect(p.x, 0, PIPE_W, p.top);
            ctx.fillRect(p.x, p.top + GAP, PIPE_W, H - GROUND_H - (p.top + GAP));
            // lips
            ctx.fillStyle = "#4e8a37";
            ctx.fillRect(p.x - 3, p.top - 16, PIPE_W + 6, 16);
            ctx.fillRect(p.x - 3, p.top + GAP, PIPE_W + 6, 16);
        }

        // ground
        ctx.fillStyle = "#d9c18b";
        ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
        ctx.fillStyle = "#c9ad72";
        ctx.fillRect(0, H - GROUND_H, W, 6);

        // bird
        ctx.save();
        ctx.translate(BIRD_X, bird.y);
        var tilt = Math.max(-0.5, Math.min(1.0, bird.vy / 12));
        ctx.rotate(tilt);
        ctx.fillStyle = "#f5a623";
        ctx.beginPath();
        ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
        ctx.fill();
        // wing
        ctx.fillStyle = "#e6942e";
        ctx.beginPath();
        ctx.ellipse(-3, 3, 7, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // eye
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(6, -4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#2c3e50";
        ctx.beginPath();
        ctx.arc(7, -4, 2, 0, Math.PI * 2);
        ctx.fill();
        // beak
        ctx.fillStyle = "#e74c3c";
        ctx.beginPath();
        ctx.moveTo(BIRD_R - 2, -2);
        ctx.lineTo(BIRD_R + 7, 0);
        ctx.lineTo(BIRD_R - 2, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // score
        ctx.fillStyle = "rgba(44,62,80,0.85)";
        ctx.font = "bold 32px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(score, W / 2, 54);
    }

    // ---- Update ----
    function update() {
        bird.vy += GRAVITY;
        bird.y += bird.vy;

        // move pipes
        for (var i = 0; i < pipes.length; i++) {
            pipes[i].x -= SPEED;
        }
        // remove offscreen, spawn new
        if (pipes.length && pipes[0].x + PIPE_W < 0) { pipes.shift(); }
        var last = pipes[pipes.length - 1];
        if (last && last.x < W - PIPE_SPACING) { spawnPipe(last.x + PIPE_SPACING); }

        // scoring + collision
        for (var j = 0; j < pipes.length; j++) {
            var p = pipes[j];
            if (!p.passed && p.x + PIPE_W < BIRD_X) {
                p.passed = true;
                score++;
                el.score.textContent = score;
            }
            // collision with pipe
            if (BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W) {
                if (bird.y - BIRD_R < p.top || bird.y + BIRD_R > p.top + GAP) {
                    endGame();
                    return;
                }
            }
        }

        // ground / ceiling
        if (bird.y + BIRD_R > H - GROUND_H) { bird.y = H - GROUND_H - BIRD_R; endGame(); return; }
        if (bird.y - BIRD_R < 0) { bird.y = BIRD_R; bird.vy = 0; }
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
        bird = { y: H / 2, vy: 0 };
        pipes = [];
        spawnPipe(W + 40);
        spawnPipe(W + 40 + PIPE_SPACING);
        score = 0;
        el.score.textContent = 0;
        gameOver = false;
        running = true;
        paused = false;
        el.pause.textContent = "PAUSE";
        el.overlay.classList.add("fby-hidden");
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
            el.overlay.classList.remove("fby-hidden");
        } else {
            el.overlay.classList.add("fby-hidden");
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
        else if (score >= 30) { medal = "🥇"; title = "AWESOME!"; }
        else if (score >= 15) { medal = "🥈"; title = "GREAT RUN!"; }
        else if (score >= 5) { medal = "🥉"; title = "NICE!"; }
        else { medal = "🐤"; title = "GAME OVER"; }

        el.overTitle.innerHTML = '<span class="fby-medal">' + medal + '</span><br>' + title;
        el.overText.innerHTML =
            '<div class="fby-scoreboard">' +
                '<div class="fby-score-row"><span>⭐ Score</span><b>' + score + '</b></div>' +
                '<div class="fby-score-row"><span>🏅 Record</span><b>' + record + '</b></div>' +
            '</div>';
        el.start.textContent = "PLAY AGAIN";
        el.overlay.classList.remove("fby-hidden");

        if (isRecord && score > 0) { launchConfetti(90); }
    }

    function launchConfetti(count) {
        var colors = ["#f5a623", "#2bb3d6", "#6ab04c", "#e74c3c", "#5a9fd4", "#9b59b6"];
        var layer = document.createElement("div");
        layer.className = "fby-confetti";
        el.overlay.appendChild(layer);
        for (var i = 0; i < count; i++) {
            var piece = document.createElement("span");
            piece.className = "fby-confetti-piece";
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
    el.flap.addEventListener("click", function (e) { e.preventDefault(); flap(); });

    document.addEventListener("keydown", function (e) {
        switch (e.key) {
            case " ": case "ArrowUp": case "w": case "W":
                if (!running && gameOver) { startGame(); }
                else { flap(); }
                e.preventDefault();
                break;
            case "p": case "P": togglePause(); break;
            default: break;
        }
    });

    board.addEventListener("mousedown", function (e) { e.preventDefault(); flap(); });
    board.addEventListener("touchstart", function (e) { e.preventDefault(); flap(); }, { passive: false });

    // initial static frame
    loadRecord();
    bird = { y: H / 2, vy: 0 };
    pipes = [];
    score = 0;
    draw();
})();
