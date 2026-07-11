(function () {
    "use strict";

    var DIFFS = {
        easy: { cols: 9, rows: 9, mines: 10 },
        medium: { cols: 12, rows: 12, mines: 24 },
        hard: { cols: 16, rows: 16, mines: 50 }
    };
    var RECORD_PREFIX = "minesweeperBest_";

    // ---- DOM ----
    var boardEl = document.getElementById("mswBoard");
    var el = {
        mines: document.getElementById("mswMines"),
        time: document.getElementById("mswTime"),
        record: document.getElementById("mswRecord"),
        overlay: document.getElementById("mswOverlay"),
        overTitle: document.getElementById("mswOverTitle"),
        overText: document.getElementById("mswOverText"),
        again: document.getElementById("mswAgain"),
        newBtn: document.getElementById("mswNew"),
        flagMode: document.getElementById("mswFlagMode")
    };
    var diffButtons = document.querySelectorAll(".msw-diff button");

    // ---- State ----
    var diff = "easy";
    var cols, rows, mineCount;
    var cells;         // array of {mine, adj, open, flag, node}
    var placed;        // mines placed yet (after first click)
    var flagsUsed;
    var openCount;
    var timer, elapsed, started, over, won;
    var flagModeOn = false;

    function loadRecord() {
        var best = getBest();
        el.record.textContent = best == null ? "—" : best + "s";
    }
    function getBest() {
        try { var v = parseInt(localStorage.getItem(RECORD_PREFIX + diff), 10); return isNaN(v) ? null : v; }
        catch (e) { return null; }
    }
    function saveBest(sec) {
        try {
            var cur = getBest();
            if (cur == null || sec < cur) {
                localStorage.setItem(RECORD_PREFIX + diff, String(sec));
                return true;
            }
        } catch (e) { /* ignore */ }
        return false;
    }

    function idx(r, c) { return r * cols + c; }

    function forEachNeighbor(r, c, fn) {
        for (var dr = -1; dr <= 1; dr++) {
            for (var dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) { continue; }
                var nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) { fn(nr, nc); }
            }
        }
    }

    function buildBoard() {
        var cfg = DIFFS[diff];
        cols = cfg.cols; rows = cfg.rows; mineCount = cfg.mines;

        cells = [];
        boardEl.innerHTML = "";
        boardEl.style.gridTemplateColumns = "repeat(" + cols + ", 1fr)";
        // scale font relative to number of columns
        var fontSize = Math.max(11, Math.round(300 / cols));
        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var node = document.createElement("button");
                node.className = "msw-tile";
                node.style.fontSize = fontSize + "px";
                node.dataset.r = r;
                node.dataset.c = c;
                boardEl.appendChild(node);
                cells.push({ mine: false, adj: 0, open: false, flag: false, node: node });
            }
        }

        placed = false;
        flagsUsed = 0;
        openCount = 0;
        elapsed = 0;
        started = false;
        over = false;
        won = false;
        clearInterval(timer);
        el.time.textContent = "0";
        el.mines.textContent = mineCount;
        el.overlay.classList.add("msw-hidden");
    }

    function placeMines(safeR, safeC) {
        var forbidden = {};
        forbidden[idx(safeR, safeC)] = true;
        forEachNeighbor(safeR, safeC, function (nr, nc) { forbidden[idx(nr, nc)] = true; });

        var spots = [];
        for (var i = 0; i < cells.length; i++) { if (!forbidden[i]) { spots.push(i); } }
        // shuffle-pick
        for (var m = 0; m < mineCount && spots.length; m++) {
            var pick = Math.floor(Math.random() * spots.length);
            cells[spots[pick]].mine = true;
            spots.splice(pick, 1);
        }
        // compute adjacency
        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                if (cells[idx(r, c)].mine) { continue; }
                var count = 0;
                forEachNeighbor(r, c, function (nr, nc) { if (cells[idx(nr, nc)].mine) { count++; } });
                cells[idx(r, c)].adj = count;
            }
        }
        placed = true;
    }

    function startTimer() {
        started = true;
        timer = setInterval(function () {
            elapsed++;
            el.time.textContent = elapsed;
        }, 1000);
    }

    function renderCell(cell) {
        var node = cell.node;
        node.className = "msw-tile";
        if (cell.open) {
            node.classList.add("open");
            if (cell.mine) {
                node.classList.add("mine");
                node.textContent = "💣";
            } else if (cell.adj > 0) {
                node.textContent = cell.adj;
                node.classList.add("msw-n" + cell.adj);
            } else {
                node.textContent = "";
            }
        } else if (cell.flag) {
            node.classList.add("flag");
            node.textContent = "🚩";
        } else {
            node.textContent = "";
        }
    }

    function reveal(r, c) {
        var cell = cells[idx(r, c)];
        if (cell.open || cell.flag) { return; }
        cell.open = true;
        openCount++;
        renderCell(cell);

        if (cell.mine) { loseGame(r, c); return; }

        if (cell.adj === 0) {
            forEachNeighbor(r, c, function (nr, nc) {
                if (!cells[idx(nr, nc)].open) { reveal(nr, nc); }
            });
        }
    }

    function handleOpen(r, c) {
        if (over) { return; }
        var cell = cells[idx(r, c)];
        if (flagModeOn) { toggleFlag(r, c); return; }
        if (cell.flag) { return; }

        if (!placed) { placeMines(r, c); }
        if (!started) { startTimer(); }

        // chord: clicking an open number with correct flags reveals neighbors
        if (cell.open && cell.adj > 0) {
            var flags = 0;
            forEachNeighbor(r, c, function (nr, nc) { if (cells[idx(nr, nc)].flag) { flags++; } });
            if (flags === cell.adj) {
                forEachNeighbor(r, c, function (nr, nc) {
                    if (!cells[idx(nr, nc)].flag && !cells[idx(nr, nc)].open) { reveal(nr, nc); }
                });
            }
            checkWin();
            return;
        }

        reveal(r, c);
        checkWin();
    }

    function toggleFlag(r, c) {
        if (over) { return; }
        var cell = cells[idx(r, c)];
        if (cell.open) { return; }
        if (!started && !placed) {
            // allow flagging before first dig without starting timer? start on first dig only
        }
        cell.flag = !cell.flag;
        flagsUsed += cell.flag ? 1 : -1;
        el.mines.textContent = mineCount - flagsUsed;
        renderCell(cell);
    }

    function checkWin() {
        if (over) { return; }
        var safeTotal = rows * cols - mineCount;
        if (openCount >= safeTotal) { winGame(); }
    }

    function loseGame(r, c) {
        over = true;
        clearInterval(timer);
        // reveal all mines
        for (var i = 0; i < cells.length; i++) {
            if (cells[i].mine) { cells[i].open = true; renderCell(cells[i]); }
        }
        cells[idx(r, c)].node.style.background = "#e74c3c";

        el.overTitle.innerHTML = '<span class="msw-medal">💥</span><br>BOOM!';
        el.overText.innerHTML =
            '<div class="msw-scoreboard">' +
                '<div class="msw-score-row"><span>⏱ Time</span><b>' + elapsed + 's</b></div>' +
                '<div class="msw-score-row"><span>🔎 Revealed</span><b>' + openCount + '</b></div>' +
            '</div>';
        el.again.textContent = "TRY AGAIN";
        el.overlay.classList.remove("msw-hidden");
    }

    function winGame() {
        over = true;
        won = true;
        clearInterval(timer);
        // flag all mines
        for (var i = 0; i < cells.length; i++) {
            if (cells[i].mine && !cells[i].flag) { cells[i].flag = true; renderCell(cells[i]); }
        }
        el.mines.textContent = "0";

        var isRecord = saveBest(elapsed);
        loadRecord();

        var medal = isRecord ? "🏆" : "🥇";
        var title = isRecord ? "NEW BEST TIME!" : "YOU WIN!";
        el.overTitle.innerHTML = '<span class="msw-medal">' + medal + '</span><br>' + title;
        el.overText.innerHTML =
            '<div class="msw-scoreboard">' +
                '<div class="msw-score-row"><span>⏱ Time</span><b>' + elapsed + 's</b></div>' +
                '<div class="msw-score-row"><span>💣 Mines</span><b>' + mineCount + '</b></div>' +
                '<div class="msw-score-row"><span>🏅 Best</span><b>' + (getBest() || elapsed) + 's</b></div>' +
            '</div>';
        el.again.textContent = "PLAY AGAIN";
        el.overlay.classList.remove("msw-hidden");
        launchConfetti(90);
    }

    function launchConfetti(count) {
        var colors = ["#f5a623", "#2bb3d6", "#6ab04c", "#e74c3c", "#5a9fd4", "#9b59b6"];
        var layer = document.createElement("div");
        layer.className = "msw-confetti";
        el.overlay.appendChild(layer);
        for (var i = 0; i < count; i++) {
            var piece = document.createElement("span");
            piece.className = "msw-confetti-piece";
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
    boardEl.addEventListener("click", function (e) {
        var t = e.target.closest(".msw-tile");
        if (!t) { return; }
        handleOpen(parseInt(t.dataset.r, 10), parseInt(t.dataset.c, 10));
    });
    boardEl.addEventListener("contextmenu", function (e) {
        var t = e.target.closest(".msw-tile");
        if (!t) { return; }
        e.preventDefault();
        toggleFlag(parseInt(t.dataset.r, 10), parseInt(t.dataset.c, 10));
    });

    el.newBtn.addEventListener("click", buildBoard);
    el.again.addEventListener("click", buildBoard);
    el.flagMode.addEventListener("click", function () {
        flagModeOn = !flagModeOn;
        el.flagMode.textContent = flagModeOn ? "🚩 Flag: ON" : "🚩 Flag: OFF";
        el.flagMode.classList.toggle("active", flagModeOn);
    });

    for (var i = 0; i < diffButtons.length; i++) {
        diffButtons[i].addEventListener("click", function () {
            for (var j = 0; j < diffButtons.length; j++) { diffButtons[j].classList.remove("active"); }
            this.classList.add("active");
            diff = this.dataset.diff;
            loadRecord();
            buildBoard();
        });
    }

    loadRecord();
    buildBoard();
})();
