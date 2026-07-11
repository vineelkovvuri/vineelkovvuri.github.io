(function () {
    "use strict";

    var COLS = 21;
    var ROWS = 21;
    var CELL = 20;             // board is 420x420
    var RECORD_KEY = "snakeRecord";

    // ---- DOM ----
    var board = document.getElementById("snkBoard");
    var ctx = board.getContext("2d");
    var el = {
        score: document.getElementById("snkScore"),
        length: document.getElementById("snkLength"),
        level: document.getElementById("snkLevel"),
        record: document.getElementById("snkRecord"),
        overlay: document.getElementById("snkOverlay"),
        overTitle: document.getElementById("snkOverTitle"),
        overText: document.getElementById("snkOverText"),
        start: document.getElementById("snkStart"),
        pause: document.getElementById("snkPause")
    };

    // ---- State ----
    var snake, dir, nextDir, food, score, level, record;
    var stepInterval, stepTimer, rafId, lastTime;
    var running = false, paused = false, gameOver = true;

    function loadRecord() {
        try { var v = parseInt(localStorage.getItem(RECORD_KEY), 10); record = isNaN(v) ? 0 : v; }
        catch (e) { record = 0; }
        el.record.textContent = record;
    }
    function saveRecord() {
        try { localStorage.setItem(RECORD_KEY, String(record)); } catch (e) { /* ignore */ }
    }

    function placeFood() {
        var open = [];
        for (var y = 0; y < ROWS; y++) {
            for (var x = 0; x < COLS; x++) {
                var onSnake = false;
                for (var i = 0; i < snake.length; i++) {
                    if (snake[i].x === x && snake[i].y === y) { onSnake = true; break; }
                }
                if (!onSnake) { open.push({ x: x, y: y }); }
            }
        }
        food = open.length ? open[Math.floor(Math.random() * open.length)] : null;
    }

    function updateStats() {
        el.score.textContent = score;
        el.length.textContent = snake.length;
        el.level.textContent = level;
    }

    // ---- Rendering ----
    function drawCell(x, y, color, inset) {
        var pad = inset || 1;
        ctx.fillStyle = color;
        ctx.fillRect(x * CELL + pad, y * CELL + pad, CELL - pad * 2, CELL - pad * 2);
    }

    function drawGridLines() {
        ctx.strokeStyle = "#e0e5ee";
        ctx.lineWidth = 1;
        for (var x = 1; x < COLS; x++) {
            ctx.beginPath();
            ctx.moveTo(x * CELL + 0.5, 0);
            ctx.lineTo(x * CELL + 0.5, ROWS * CELL);
            ctx.stroke();
        }
        for (var y = 1; y < ROWS; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * CELL + 0.5);
            ctx.lineTo(COLS * CELL, y * CELL + 0.5);
            ctx.stroke();
        }
    }

    function draw() {
        ctx.clearRect(0, 0, board.width, board.height);
        drawGridLines();

        if (food) {
            ctx.fillStyle = "#e74c3c";
            ctx.beginPath();
            ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
            ctx.fill();
        }

        for (var i = 0; i < snake.length; i++) {
            var seg = snake[i];
            var color = i === 0 ? "#4e8a37" : "#6ab04c";
            drawCell(seg.x, seg.y, color);
        }
    }

    // ---- Loop ----
    function step() {
        dir = nextDir;
        var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

        if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) { endGame(); return; }
        for (var i = 0; i < snake.length; i++) {
            if (snake[i].x === head.x && snake[i].y === head.y) { endGame(); return; }
        }

        snake.unshift(head);

        if (food && head.x === food.x && head.y === food.y) {
            score += 10 * level;
            placeFood();
            var newLevel = Math.floor(snake.length / 5) + 1;
            if (newLevel !== level) {
                level = newLevel;
                stepInterval = Math.max(60, 140 - (level - 1) * 10);
            }
            updateStats();
        } else {
            snake.pop();
        }
        draw();
    }

    function tick(time) {
        if (!running) { return; }
        if (!paused) {
            var dt = time - lastTime;
            lastTime = time;
            stepTimer += dt;
            if (stepTimer >= stepInterval) {
                stepTimer = 0;
                step();
            }
        } else {
            lastTime = time;
        }
        rafId = requestAnimationFrame(tick);
    }

    // ---- Input ----
    function setDir(x, y) {
        if (!running || paused) { return; }
        // prevent reversing directly into self
        if (dir.x === -x && dir.y === -y) { return; }
        if (dir.x === x && dir.y === y) { return; }
        nextDir = { x: x, y: y };
    }

    // ---- Game flow ----
    function startGame() {
        snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
        dir = { x: 1, y: 0 };
        nextDir = { x: 1, y: 0 };
        score = 0; level = 1;
        stepInterval = 140;
        stepTimer = 0;
        gameOver = false;
        running = true;
        paused = false;
        el.pause.textContent = "PAUSE";
        el.overlay.classList.add("snk-hidden");
        placeFood();
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
            el.overlay.classList.remove("snk-hidden");
        } else {
            el.overlay.classList.add("snk-hidden");
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
        else if (score >= 500) { medal = "🥇"; title = "AWESOME!"; }
        else if (score >= 200) { medal = "🥈"; title = "GREAT RUN!"; }
        else if (score >= 50) { medal = "🥉"; title = "NICE!"; }
        else { medal = "🐍"; title = "GAME OVER"; }

        el.overTitle.innerHTML = '<span class="snk-medal">' + medal + '</span><br>' + title;
        el.overText.innerHTML =
            '<div class="snk-scoreboard">' +
                '<div class="snk-score-row"><span>⭐ Score</span><b>' + score + '</b></div>' +
                '<div class="snk-score-row"><span>📏 Length</span><b>' + snake.length + '</b></div>' +
                '<div class="snk-score-row"><span>🚀 Level</span><b>' + level + '</b></div>' +
                '<div class="snk-score-row"><span>🏅 Record</span><b>' + record + '</b></div>' +
            '</div>';
        el.start.textContent = "PLAY AGAIN";
        el.overlay.classList.remove("snk-hidden");

        if (isRecord && score > 0) { launchConfetti(90); }
    }

    function launchConfetti(count) {
        var colors = ["#f5a623", "#2bb3d6", "#6ab04c", "#e74c3c", "#5a9fd4", "#9b59b6"];
        var layer = document.createElement("div");
        layer.className = "snk-confetti";
        el.overlay.appendChild(layer);
        for (var i = 0; i < count; i++) {
            var piece = document.createElement("span");
            piece.className = "snk-confetti-piece";
            piece.style.left = Math.random() * 100 + "%";
            piece.style.background = colors[Math.floor(Math.random() * colors.length)];
            piece.style.animationDelay = (Math.random() * 0.6) + "s";
            piece.style.animationDuration = (1.8 + Math.random() * 1.4) + "s";
            piece.style.transform = "rotate(" + (Math.random() * 360) + "deg)";
            layer.appendChild(piece);
        }
        setTimeout(function () { if (layer.parentNode) { layer.parentNode.removeChild(layer); } }, 3600);
    }

    // ---- Bindings ----
    el.start.addEventListener("click", function () {
        if (paused && running) { togglePause(); } else { startGame(); }
    });
    el.pause.addEventListener("click", togglePause);

    document.addEventListener("keydown", function (e) {
        if (!running) { return; }
        switch (e.key) {
            case "ArrowLeft": case "a": case "A": setDir(-1, 0); e.preventDefault(); break;
            case "ArrowRight": case "d": case "D": setDir(1, 0); e.preventDefault(); break;
            case "ArrowUp": case "w": case "W": setDir(0, -1); e.preventDefault(); break;
            case "ArrowDown": case "s": case "S": setDir(0, 1); e.preventDefault(); break;
            case "p": case "P": togglePause(); break;
            default: break;
        }
    });

    function bindTap(id, fn) {
        var btn = document.getElementById(id);
        btn.addEventListener("click", function (ev) { ev.preventDefault(); fn(); });
    }
    bindTap("snkUp", function () { setDir(0, -1); });
    bindTap("snkDown", function () { setDir(0, 1); });
    bindTap("snkLeft", function () { setDir(-1, 0); });
    bindTap("snkRight", function () { setDir(1, 0); });

    loadRecord();
})();
