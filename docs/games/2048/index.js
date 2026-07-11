(function () {
    "use strict";

    var N = 4;
    var RECORD_KEY = "game2048Record";
    var WIN_VALUE = 2048;

    var TILE_COLORS = {
        2: { bg: "#eee4da", fg: "#776e65" },
        4: { bg: "#ede0c8", fg: "#776e65" },
        8: { bg: "#f2b179", fg: "#ffffff" },
        16: { bg: "#f59563", fg: "#ffffff" },
        32: { bg: "#f67c5f", fg: "#ffffff" },
        64: { bg: "#f65e3b", fg: "#ffffff" },
        128: { bg: "#edcf72", fg: "#ffffff" },
        256: { bg: "#edcc61", fg: "#ffffff" },
        512: { bg: "#edc850", fg: "#ffffff" },
        1024: { bg: "#edc53f", fg: "#ffffff" },
        2048: { bg: "#edc22e", fg: "#ffffff" },
        4096: { bg: "#3c3a32", fg: "#ffffff" }
    };

    // ---- DOM ----
    var boardEl = document.getElementById("g48Board");
    var el = {
        score: document.getElementById("g48Score"),
        best: document.getElementById("g48Best"),
        record: document.getElementById("g48Record"),
        overlay: document.getElementById("g48Overlay"),
        overTitle: document.getElementById("g48OverTitle"),
        overText: document.getElementById("g48OverText"),
        cont: document.getElementById("g48Continue"),
        newBtn: document.getElementById("g48New")
    };

    // ---- State ----
    var grid;          // N x N of {value, id} or null
    var tileNodes;     // id -> DOM node
    var nextId = 1;
    var score, record;
    var won = false, over = false;

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
        for (var r = 0; r < N; r++) {
            g.push([null, null, null, null]);
        }
        return g;
    }

    function emptyCells() {
        var cells = [];
        for (var r = 0; r < N; r++) {
            for (var c = 0; c < N; c++) {
                if (!grid[r][c]) { cells.push({ r: r, c: c }); }
            }
        }
        return cells;
    }

    function addRandomTile() {
        var cells = emptyCells();
        if (!cells.length) { return null; }
        var spot = cells[Math.floor(Math.random() * cells.length)];
        var value = Math.random() < 0.9 ? 2 : 4;
        var tile = { value: value, id: nextId++, isNew: true };
        grid[spot.r][spot.c] = tile;
        return tile;
    }

    // ---- Layout helpers ----
    function cellMetrics() {
        var pad = 12, gap = 12;
        var inner = boardEl.clientWidth - pad * 2;
        var size = (inner - gap * (N - 1)) / N;
        return { pad: pad, gap: gap, size: size };
    }

    function positionTile(node, r, c) {
        var m = cellMetrics();
        node.style.width = m.size + "px";
        node.style.height = m.size + "px";
        node.style.left = (m.pad + c * (m.size + m.gap)) + "px";
        node.style.top = (m.pad + r * (m.size + m.gap)) + "px";
        var fs = m.size * 0.42;
        node.style.fontSize = fs + "px";
    }

    function styleTile(node, value) {
        var col = TILE_COLORS[value] || TILE_COLORS[4096];
        node.style.background = col.bg;
        node.style.color = col.fg;
        node.textContent = value;
        var len = String(value).length;
        if (len >= 4) { node.style.fontSize = (cellMetrics().size * 0.3) + "px"; }
    }

    function render(popIds) {
        popIds = popIds || {};
        var seen = {};
        for (var r = 0; r < N; r++) {
            for (var c = 0; c < N; c++) {
                var tile = grid[r][c];
                if (!tile) { continue; }
                seen[tile.id] = true;
                var node = tileNodes[tile.id];
                if (!node) {
                    node = document.createElement("div");
                    node.className = "g48-tile";
                    boardEl.appendChild(node);
                    tileNodes[tile.id] = node;
                    styleTile(node, tile.value);
                    positionTile(node, r, c);
                    if (tile.isNew) { node.classList.add("new"); tile.isNew = false; }
                } else {
                    styleTile(node, tile.value);
                    positionTile(node, r, c);
                    if (popIds[tile.id]) {
                        node.classList.remove("pop");
                        void node.offsetWidth; // reflow to restart animation
                        node.classList.add("pop");
                    }
                }
            }
        }
        // remove stale nodes
        Object.keys(tileNodes).forEach(function (id) {
            if (!seen[id]) {
                var n = tileNodes[id];
                if (n && n.parentNode) { n.parentNode.removeChild(n); }
                delete tileNodes[id];
            }
        });
    }

    function bestTile() {
        var best = 0;
        for (var r = 0; r < N; r++) {
            for (var c = 0; c < N; c++) {
                if (grid[r][c] && grid[r][c].value > best) { best = grid[r][c].value; }
            }
        }
        return best;
    }

    function updateStats() {
        el.score.textContent = score;
        el.best.textContent = bestTile();
    }

    // ---- Movement ----
    // direction: build ordered line of coordinates, compress+merge
    function move(dir) {
        if (over) { return; }
        var moved = false;
        var gained = 0;
        var popIds = {};

        var order = buildTraversal(dir);
        for (var i = 0; i < order.lines.length; i++) {
            var line = order.lines[i];
            // gather tiles
            var tiles = [];
            for (var k = 0; k < line.length; k++) {
                var cell = line[k];
                if (grid[cell.r][cell.c]) { tiles.push(grid[cell.r][cell.c]); }
            }
            // merge
            var result = [];
            for (var t = 0; t < tiles.length; t++) {
                if (t < tiles.length - 1 && tiles[t].value === tiles[t + 1].value) {
                    var mergedVal = tiles[t].value * 2;
                    var keep = tiles[t];
                    keep.value = mergedVal;
                    result.push(keep);
                    popIds[keep.id] = true;
                    gained += mergedVal;
                    if (mergedVal >= WIN_VALUE && !won) { won = true; }
                    t++; // skip next
                } else {
                    result.push(tiles[t]);
                }
            }
            // write back into line positions
            for (var p = 0; p < line.length; p++) {
                var pos = line[p];
                var newTile = p < result.length ? result[p] : null;
                var oldTile = grid[pos.r][pos.c];
                if ((oldTile && newTile && oldTile.id !== newTile.id) ||
                    (!oldTile && newTile) || (oldTile && !newTile)) {
                    moved = true;
                }
                grid[pos.r][pos.c] = newTile;
            }
        }

        if (!moved) { return; }

        score += gained;
        addRandomTile();
        render(popIds);
        updateStats();

        if (won) { winGame(); return; }
        if (!hasMoves()) { endGame(); }
    }

    function buildTraversal(dir) {
        var lines = [];
        if (dir === "left" || dir === "right") {
            for (var r = 0; r < N; r++) {
                var line = [];
                for (var c = 0; c < N; c++) { line.push({ r: r, c: c }); }
                if (dir === "right") { line.reverse(); }
                lines.push(line);
            }
        } else {
            for (var c2 = 0; c2 < N; c2++) {
                var col = [];
                for (var r2 = 0; r2 < N; r2++) { col.push({ r: r2, c: c2 }); }
                if (dir === "down") { col.reverse(); }
                lines.push(col);
            }
        }
        return { lines: lines };
    }

    function hasMoves() {
        if (emptyCells().length) { return true; }
        for (var r = 0; r < N; r++) {
            for (var c = 0; c < N; c++) {
                var v = grid[r][c].value;
                if (c < N - 1 && grid[r][c + 1] && grid[r][c + 1].value === v) { return true; }
                if (r < N - 1 && grid[r + 1][c] && grid[r + 1][c].value === v) { return true; }
            }
        }
        return false;
    }

    // ---- Game flow ----
    function newGame() {
        grid = emptyGrid();
        tileNodes = {};
        // clear existing tile nodes
        var existing = boardEl.querySelectorAll(".g48-tile");
        for (var i = 0; i < existing.length; i++) { existing[i].remove(); }
        nextId = 1;
        score = 0;
        won = false;
        over = false;
        addRandomTile();
        addRandomTile();
        render();
        updateStats();
        el.overlay.classList.add("g48-hidden");
    }

    function winGame() {
        // record continues; show win overlay but allow continue
        if (score > record) { record = score; saveRecord(); el.record.textContent = record; }
        el.overTitle.innerHTML = '<span class="g48-medal">🏆</span><br>YOU REACHED 2048!';
        el.overText.innerHTML =
            '<div class="g48-scoreboard">' +
                '<div class="g48-score-row"><span>⭐ Score</span><b>' + score + '</b></div>' +
                '<div class="g48-score-row"><span>🔝 Best Tile</span><b>' + bestTile() + '</b></div>' +
                '<div class="g48-score-row"><span>🏅 Record</span><b>' + record + '</b></div>' +
            '</div>';
        el.cont.textContent = "KEEP GOING";
        el.overlay.classList.remove("g48-hidden");
        launchConfetti(90);
    }

    function endGame() {
        over = true;
        var isRecord = score > record;
        if (isRecord) { record = score; saveRecord(); el.record.textContent = record; }

        var medal, title;
        if (isRecord && score > 0) { medal = "🏆"; title = "NEW RECORD!"; }
        else if (bestTile() >= 1024) { medal = "🥇"; title = "AWESOME!"; }
        else if (bestTile() >= 256) { medal = "🥈"; title = "GREAT RUN!"; }
        else { medal = "🔢"; title = "GAME OVER"; }

        el.overTitle.innerHTML = '<span class="g48-medal">' + medal + '</span><br>' + title;
        el.overText.innerHTML =
            '<div class="g48-scoreboard">' +
                '<div class="g48-score-row"><span>⭐ Score</span><b>' + score + '</b></div>' +
                '<div class="g48-score-row"><span>🔝 Best Tile</span><b>' + bestTile() + '</b></div>' +
                '<div class="g48-score-row"><span>🏅 Record</span><b>' + record + '</b></div>' +
            '</div>';
        el.cont.textContent = "NEW GAME";
        el.overlay.classList.remove("g48-hidden");
        if (isRecord && score > 0) { launchConfetti(90); }
    }

    function launchConfetti(count) {
        var colors = ["#f5a623", "#2bb3d6", "#6ab04c", "#e74c3c", "#5a9fd4", "#9b59b6"];
        var layer = document.createElement("div");
        layer.className = "g48-confetti";
        el.overlay.appendChild(layer);
        for (var i = 0; i < count; i++) {
            var piece = document.createElement("span");
            piece.className = "g48-confetti-piece";
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
    el.newBtn.addEventListener("click", newGame);
    el.cont.addEventListener("click", function () {
        if (over) { newGame(); }
        else { el.overlay.classList.add("g48-hidden"); } // keep going after win
    });

    document.addEventListener("keydown", function (e) {
        switch (e.key) {
            case "ArrowLeft": case "a": case "A": move("left"); e.preventDefault(); break;
            case "ArrowRight": case "d": case "D": move("right"); e.preventDefault(); break;
            case "ArrowUp": case "w": case "W": move("up"); e.preventDefault(); break;
            case "ArrowDown": case "s": case "S": move("down"); e.preventDefault(); break;
            default: break;
        }
    });

    function bindTap(id, dir) {
        var btn = document.getElementById(id);
        btn.addEventListener("click", function (ev) { ev.preventDefault(); move(dir); });
    }
    bindTap("g48Up", "up");
    bindTap("g48Down", "down");
    bindTap("g48Left", "left");
    bindTap("g48Right", "right");

    // swipe on board
    var touchStart = null;
    boardEl.addEventListener("touchstart", function (e) {
        if (e.touches[0]) { touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
    }, { passive: true });
    boardEl.addEventListener("touchend", function (e) {
        if (!touchStart || !e.changedTouches[0]) { return; }
        var dx = e.changedTouches[0].clientX - touchStart.x;
        var dy = e.changedTouches[0].clientY - touchStart.y;
        touchStart = null;
        if (Math.abs(dx) < 24 && Math.abs(dy) < 24) { return; }
        if (Math.abs(dx) > Math.abs(dy)) { move(dx > 0 ? "right" : "left"); }
        else { move(dy > 0 ? "down" : "up"); }
    }, { passive: true });

    // reposition tiles on resize
    window.addEventListener("resize", function () { if (grid) { render(); } });

    loadRecord();
    newGame();
})();
