(function () {
    "use strict";

    var COLS = 10;
    var ROWS = 20;
    var CELL = 34;             // board is 340x680
    var RECORD_KEY = "tetrisRecord";

    // ---- Tetromino definitions (rotation states as 4x4 coordinate lists) ----
    var COLORS = {
        I: "#2bb3d6", O: "#f5a623", T: "#9b59b6", S: "#6ab04c",
        Z: "#e74c3c", J: "#5a9fd4", L: "#e67e22"
    };

    // Each shape defined by its cells in a base rotation; we rotate matrices.
    var SHAPES = {
        I: [[0, 1], [1, 1], [2, 1], [3, 1]],
        O: [[1, 0], [2, 0], [1, 1], [2, 1]],
        T: [[1, 0], [0, 1], [1, 1], [2, 1]],
        S: [[1, 0], [2, 0], [0, 1], [1, 1]],
        Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
        J: [[0, 0], [0, 1], [1, 1], [2, 1]],
        L: [[2, 0], [0, 1], [1, 1], [2, 1]]
    };
    var TYPES = ["I", "O", "T", "S", "Z", "J", "L"];

    // Bounding box size used when rotating each piece
    var BOX = { I: 4, O: 4, T: 3, S: 3, Z: 3, J: 3, L: 3 };

    // ---- DOM ----
    var board = document.getElementById("tetBoard");
    var ctx = board.getContext("2d");
    var nextCanvas = document.getElementById("tetNext");
    var nctx = nextCanvas.getContext("2d");
    var el = {
        score: document.getElementById("tetScore"),
        lines: document.getElementById("tetLines"),
        level: document.getElementById("tetLevel"),
        record: document.getElementById("tetRecord"),
        overlay: document.getElementById("tetOverlay"),
        overTitle: document.getElementById("tetOverTitle"),
        overText: document.getElementById("tetOverText"),
        start: document.getElementById("tetStart"),
        pause: document.getElementById("tetPause")
    };

    // ---- State ----
    var grid, current, nextType, score, lines, level, record;
    var dropInterval, dropTimer, rafId, lastTime;
    var running = false, paused = false, gameOver = true;

    function loadRecord() {
        try { var v = parseInt(localStorage.getItem(RECORD_KEY), 10); record = isNaN(v) ? 0 : v; }
        catch (e) { record = 0; }
        el.record.textContent = record;
    }
    function saveRecord() {
        try { localStorage.setItem(RECORD_KEY, String(record)); } catch (e) { /* ignore */ }
    }

    function emptyGrid() {
        var g = [];
        for (var r = 0; r < ROWS; r++) {
            g.push(new Array(COLS).fill(null));
        }
        return g;
    }

    function randomType() {
        return TYPES[Math.floor(Math.random() * TYPES.length)];
    }

    // Build cell list for a type at rotation 0
    function baseCells(type) {
        return SHAPES[type].map(function (p) { return [p[0], p[1]]; });
    }

    // Rotate a set of cells 90° clockwise within its bounding box
    function rotateCells(cells, box) {
        return cells.map(function (p) {
            return [box - 1 - p[1], p[0]];
        });
    }

    function spawn() {
        var type = nextType || randomType();
        nextType = randomType();
        var cells = baseCells(type);
        current = {
            type: type,
            box: BOX[type],
            cells: cells,
            x: Math.floor((COLS - BOX[type]) / 2),
            y: -1
        };
        drawNext();
        if (collides(current.cells, current.x, current.y)) {
            endGame();
        }
    }

    function collides(cells, ox, oy) {
        for (var i = 0; i < cells.length; i++) {
            var x = ox + cells[i][0];
            var y = oy + cells[i][1];
            if (x < 0 || x >= COLS || y >= ROWS) { return true; }
            if (y >= 0 && grid[y][x]) { return true; }
        }
        return false;
    }

    function move(dx, dy) {
        if (!running || paused) { return false; }
        if (!collides(current.cells, current.x + dx, current.y + dy)) {
            current.x += dx;
            current.y += dy;
            draw();
            return true;
        }
        return false;
    }

    function rotate() {
        if (!running || paused) { return; }
        var rotated = rotateCells(current.cells, current.box);
        // simple wall kicks: try offsets
        var kicks = [0, -1, 1, -2, 2];
        for (var i = 0; i < kicks.length; i++) {
            if (!collides(rotated, current.x + kicks[i], current.y)) {
                current.cells = rotated;
                current.x += kicks[i];
                draw();
                return;
            }
        }
    }

    function softDrop() {
        if (!move(0, 1)) { lockPiece(); }
        else { score += 1; updateStats(); }
        resetDropTimer();
    }

    function hardDrop() {
        if (!running || paused) { return; }
        var dist = 0;
        while (!collides(current.cells, current.x, current.y + 1)) {
            current.y++;
            dist++;
        }
        score += dist * 2;
        lockPiece();
    }

    function lockPiece() {
        for (var i = 0; i < current.cells.length; i++) {
            var x = current.x + current.cells[i][0];
            var y = current.y + current.cells[i][1];
            if (y < 0) { endGame(); return; }
            grid[y][x] = COLORS[current.type];
        }
        clearLines();
        spawn();
        resetDropTimer();
        draw();
    }

    function clearLines() {
        var cleared = 0;
        for (var r = ROWS - 1; r >= 0; r--) {
            if (grid[r].every(function (c) { return c; })) {
                grid.splice(r, 1);
                grid.unshift(new Array(COLS).fill(null));
                cleared++;
                r++; // recheck same index after shift
            }
        }
        if (cleared > 0) {
            var points = [0, 100, 300, 500, 800][cleared] * level;
            score += points;
            lines += cleared;
            var newLevel = Math.floor(lines / 10) + 1;
            if (newLevel !== level) {
                level = newLevel;
                dropInterval = Math.max(80, 800 - (level - 1) * 70);
            }
            updateStats();
        }
    }

    function updateStats() {
        el.score.textContent = score;
        el.lines.textContent = lines;
        el.level.textContent = level;
    }

    // ---- Rendering ----
    function drawCell(c, x, y, color) {
        c.fillStyle = color;
        c.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
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

    function ghostY() {
        var gy = current.y;
        while (!collides(current.cells, current.x, gy + 1)) { gy++; }
        return gy;
    }

    function draw() {
        ctx.clearRect(0, 0, board.width, board.height);
        drawGridLines();

        // settled blocks
        for (var r = 0; r < ROWS; r++) {
            for (var col = 0; col < COLS; col++) {
                if (grid[r][col]) { drawCell(ctx, col, r, grid[r][col]); }
            }
        }

        if (current) {
            // ghost piece
            var gy = ghostY();
            for (var i = 0; i < current.cells.length; i++) {
                var gx = current.x + current.cells[i][0];
                var gyy = gy + current.cells[i][1];
                if (gyy >= 0) {
                    ctx.fillStyle = "rgba(90,159,212,0.18)";
                    ctx.fillRect(gx * CELL + 1, gyy * CELL + 1, CELL - 2, CELL - 2);
                }
            }
            // active piece
            for (var j = 0; j < current.cells.length; j++) {
                var x = current.x + current.cells[j][0];
                var y = current.y + current.cells[j][1];
                if (y >= 0) { drawCell(ctx, x, y, COLORS[current.type]); }
            }
        }
    }

    function drawNext() {
        nctx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        if (!nextType) { return; }
        var cells = baseCells(nextType);
        var box = BOX[nextType];
        var cell = 24;
        var offX = (nextCanvas.width - box * cell) / 2;
        var offY = (nextCanvas.height - box * cell) / 2;
        for (var i = 0; i < cells.length; i++) {
            var x = cells[i][0], y = cells[i][1];
            nctx.fillStyle = COLORS[nextType];
            nctx.fillRect(offX + x * cell + 1, offY + y * cell + 1, cell - 2, cell - 2);
        }
    }

    // ---- Loop ----
    function resetDropTimer() { dropTimer = 0; }

    function tick(time) {
        if (!running) { return; }
        if (!paused) {
            var dt = time - lastTime;
            lastTime = time;
            dropTimer += dt;
            if (dropTimer >= dropInterval) {
                dropTimer = 0;
                if (!move(0, 1)) { lockPiece(); }
            }
        } else {
            lastTime = time;
        }
        rafId = requestAnimationFrame(tick);
    }

    // ---- Game flow ----
    function startGame() {
        grid = emptyGrid();
        score = 0; lines = 0; level = 1;
        dropInterval = 800;
        dropTimer = 0;
        nextType = randomType();
        gameOver = false;
        running = true;
        paused = false;
        el.pause.textContent = "PAUSE";
        el.overlay.classList.add("tet-hidden");
        updateStats();
        spawn();
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
            el.overlay.classList.remove("tet-hidden");
        } else {
            el.overlay.classList.add("tet-hidden");
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
        else if (score >= 5000) { medal = "🥇"; title = "AWESOME!"; }
        else if (score >= 2000) { medal = "🥈"; title = "GREAT RUN!"; }
        else if (score >= 500) { medal = "🥉"; title = "NICE!"; }
        else { medal = "🎮"; title = "GAME OVER"; }

        el.overTitle.innerHTML = '<span class="tet-medal">' + medal + '</span><br>' + title;
        el.overText.innerHTML =
            '<div class="tet-scoreboard">' +
                '<div class="tet-score-row"><span>⭐ Score</span><b>' + score + '</b></div>' +
                '<div class="tet-score-row"><span>📏 Lines</span><b>' + lines + '</b></div>' +
                '<div class="tet-score-row"><span>🚀 Level</span><b>' + level + '</b></div>' +
                '<div class="tet-score-row"><span>🏅 Record</span><b>' + record + '</b></div>' +
            '</div>';
        el.start.textContent = "PLAY AGAIN";
        el.overlay.classList.remove("tet-hidden");

        if (isRecord && score > 0) { launchConfetti(90); }
    }

    function launchConfetti(count) {
        var colors = ["#f5a623", "#2bb3d6", "#6ab04c", "#e74c3c", "#5a9fd4", "#9b59b6"];
        var layer = document.createElement("div");
        layer.className = "tet-confetti";
        el.overlay.appendChild(layer);
        for (var i = 0; i < count; i++) {
            var piece = document.createElement("span");
            piece.className = "tet-confetti-piece";
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
            case "ArrowLeft": move(-1, 0); e.preventDefault(); break;
            case "ArrowRight": move(1, 0); e.preventDefault(); break;
            case "ArrowDown": softDrop(); e.preventDefault(); break;
            case "ArrowUp": rotate(); e.preventDefault(); break;
            case " ": hardDrop(); e.preventDefault(); break;
            case "p": case "P": togglePause(); break;
            default: break;
        }
    });

    // Touch buttons
    function bindHold(id, fn) {
        var btn = document.getElementById(id);
        btn.addEventListener("click", function (ev) { ev.preventDefault(); fn(); });
    }
    bindHold("tetLeft", function () { move(-1, 0); });
    bindHold("tetRight", function () { move(1, 0); });
    bindHold("tetRotate", rotate);
    bindHold("tetDrop", hardDrop);

    // Swipe / tap on the board (mobile)
    (function () {
        var sx = 0, sy = 0, st = 0, moved = false;
        board.addEventListener("touchstart", function (e) {
            var t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = Date.now(); moved = false;
        }, { passive: true });
        board.addEventListener("touchmove", function (e) {
            var t = e.touches[0];
            var dx = t.clientX - sx, dy = t.clientY - sy;
            if (Math.abs(dx) > 24) { move(dx > 0 ? 1 : -1, 0); sx = t.clientX; moved = true; }
            else if (dy > 28) { softDrop(); sy = t.clientY; moved = true; }
        }, { passive: true });
        board.addEventListener("touchend", function (e) {
            if (!moved && Date.now() - st < 250) { rotate(); }
        });
    })();

    // ---- Init ----
    loadRecord();
    draw();
})();
