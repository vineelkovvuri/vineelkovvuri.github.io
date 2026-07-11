(function () {
    "use strict";

    var COLS = 7, ROWS = 6;
    var RED = 1, YELLOW = 2;
    var RECORD_KEY = "connectFourWins";

    // ---- DOM ----
    var boardEl = document.getElementById("cf4Board");
    var el = {
        status: document.getElementById("cf4Status"),
        overlay: document.getElementById("cf4Overlay"),
        overTitle: document.getElementById("cf4OverTitle"),
        overText: document.getElementById("cf4OverText"),
        again: document.getElementById("cf4Again"),
        newBtn: document.getElementById("cf4New")
    };
    var modeButtons = document.querySelectorAll(".cf4-mode button");

    // ---- State ----
    var grid;          // [row][col] 0/RED/YELLOW ; row 0 is top
    var cells;         // DOM nodes [row][col]
    var current;       // whose turn
    var mode = "cpu";  // cpu | two
    var over;
    var busy;          // during animations / cpu thinking
    var wins;

    function loadWins() {
        try { var v = parseInt(localStorage.getItem(RECORD_KEY), 10); wins = isNaN(v) ? 0 : v; }
        catch (e) { wins = 0; }
    }
    function saveWins() {
        try { localStorage.setItem(RECORD_KEY, String(wins)); } catch (e) { /* ignore */ }
    }

    function buildBoard() {
        grid = [];
        cells = [];
        boardEl.innerHTML = "";
        for (var r = 0; r < ROWS; r++) {
            grid.push(new Array(COLS).fill(0));
            cells.push(new Array(COLS));
        }
        for (var rr = 0; rr < ROWS; rr++) {
            for (var c = 0; c < COLS; c++) {
                var cell = document.createElement("div");
                cell.className = "cf4-cell";
                cell.dataset.col = c;
                cell.dataset.row = rr;
                boardEl.appendChild(cell);
                cells[rr][c] = cell;
            }
        }
        current = RED;
        over = false;
        busy = false;
        el.overlay.classList.add("cf4-hidden");
        updateStatus();
    }

    function updateStatus() {
        var name, cls;
        if (current === RED) { name = mode === "cpu" ? "Your turn" : "Red's turn"; cls = "cf4-dot-red"; }
        else { name = mode === "cpu" ? "Computer's turn" : "Yellow's turn"; cls = "cf4-dot-yellow"; }
        el.status.innerHTML = '<span class="dot ' + cls + '"></span> ' + name;
    }

    function lowestEmptyRow(col) {
        for (var r = ROWS - 1; r >= 0; r--) {
            if (grid[r][col] === 0) { return r; }
        }
        return -1;
    }

    function dropDisc(col) {
        if (over || busy) { return; }
        var row = lowestEmptyRow(col);
        if (row < 0) { return; }

        grid[row][col] = current;
        cells[row][col].classList.add(current === RED ? "red" : "yellow");

        var win = findWin(current);
        if (win) { endGame(current, win); return; }
        if (isFull()) { endGame(0, null); return; }

        current = current === RED ? YELLOW : RED;
        updateStatus();

        if (mode === "cpu" && current === YELLOW && !over) {
            busy = true;
            setTimeout(function () {
                busy = false;
                cpuMove();
            }, 420);
        }
    }

    function isFull() {
        for (var c = 0; c < COLS; c++) { if (grid[0][c] === 0) { return false; } }
        return true;
    }

    // Return array of winning cells [[r,c]...] or null
    function findWin(player) {
        var dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (var r = 0; r < ROWS; r++) {
            for (var c = 0; c < COLS; c++) {
                if (grid[r][c] !== player) { continue; }
                for (var d = 0; d < dirs.length; d++) {
                    var line = [[r, c]];
                    var nr = r, nc = c;
                    for (var k = 1; k < 4; k++) {
                        nr += dirs[d][0]; nc += dirs[d][1];
                        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || grid[nr][nc] !== player) { break; }
                        line.push([nr, nc]);
                    }
                    if (line.length === 4) { return line; }
                }
            }
        }
        return null;
    }

    // ---- Simple CPU AI ----
    function validCols() {
        var v = [];
        for (var c = 0; c < COLS; c++) { if (grid[0][c] === 0) { v.push(c); } }
        return v;
    }

    function wouldWin(col, player) {
        var row = lowestEmptyRow(col);
        if (row < 0) { return false; }
        grid[row][col] = player;
        var win = findWin(player);
        grid[row][col] = 0;
        return !!win;
    }

    function cpuMove() {
        if (over) { return; }
        var cols = validCols();
        if (!cols.length) { return; }

        var choice = -1;

        // 1. win if possible
        for (var i = 0; i < cols.length; i++) {
            if (wouldWin(cols[i], YELLOW)) { choice = cols[i]; break; }
        }
        // 2. block opponent win
        if (choice < 0) {
            for (var j = 0; j < cols.length; j++) {
                if (wouldWin(cols[j], RED)) { choice = cols[j]; break; }
            }
        }
        // 3. avoid giving opponent an immediate win on top; prefer center
        if (choice < 0) {
            var safe = [];
            for (var k = 0; k < cols.length; k++) {
                var col = cols[k];
                var row = lowestEmptyRow(col);
                grid[row][col] = YELLOW;
                var giftsWin = false;
                var aboveRow = lowestEmptyRow(col);
                if (aboveRow >= 0 && wouldWin(col, RED)) { giftsWin = true; }
                grid[row][col] = 0;
                if (!giftsWin) { safe.push(col); }
            }
            var pool = safe.length ? safe : cols;
            // weight toward center
            pool.sort(function (a, b) { return Math.abs(3 - a) - Math.abs(3 - b); });
            // add slight randomness among best few
            var top = pool.slice(0, Math.min(3, pool.length));
            choice = top[Math.floor(Math.random() * top.length)];
        }

        dropDisc(choice);
    }

    // ---- Game flow ----
    function endGame(winner, line) {
        over = true;

        if (line) {
            for (var i = 0; i < line.length; i++) {
                cells[line[i][0]][line[i][1]].classList.add("win");
            }
        }

        var medal, title, sub;
        if (winner === 0) {
            medal = "🤝"; title = "IT'S A DRAW!"; sub = "The board is full.";
        } else if (mode === "cpu") {
            if (winner === RED) {
                wins++; saveWins();
                medal = "🏆"; title = "YOU WIN!"; sub = "You beat the computer!";
            } else {
                medal = "🤖"; title = "COMPUTER WINS"; sub = "Better luck next time!";
            }
        } else {
            if (winner === RED) { medal = "🔴"; title = "RED WINS!"; }
            else { medal = "🟡"; title = "YELLOW WINS!"; }
            sub = "Four in a row!";
        }

        el.overTitle.innerHTML = '<span class="cf4-medal">' + medal + '</span><br>' + title;
        var rows = '<div class="cf4-score-row"><span>🎯 Result</span><b>' + sub + '</b></div>';
        if (mode === "cpu") {
            rows += '<div class="cf4-score-row"><span>🏅 Wins vs CPU</span><b>' + wins + '</b></div>';
        }
        el.overText.innerHTML = '<div class="cf4-scoreboard">' + rows + '</div>';
        el.overlay.classList.remove("cf4-hidden");

        if (winner === RED && mode === "cpu") { launchConfetti(90); }
        else if (winner !== 0 && mode === "two") { launchConfetti(80); }
    }

    function launchConfetti(count) {
        var colors = ["#f5a623", "#2bb3d6", "#6ab04c", "#e74c3c", "#5a9fd4", "#9b59b6"];
        var layer = document.createElement("div");
        layer.className = "cf4-confetti";
        el.overlay.appendChild(layer);
        for (var i = 0; i < count; i++) {
            var piece = document.createElement("span");
            piece.className = "cf4-confetti-piece";
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
        var cell = e.target.closest(".cf4-cell");
        if (!cell) { return; }
        if (mode === "cpu" && current !== RED) { return; }
        dropDisc(parseInt(cell.dataset.col, 10));
    });

    // hover highlight of column
    boardEl.addEventListener("mouseover", function (e) {
        var cell = e.target.closest(".cf4-cell");
        if (!cell) { return; }
        var col = parseInt(cell.dataset.col, 10);
        for (var r = 0; r < ROWS; r++) {
            if (grid[r][col] === 0) { cells[r][col].classList.add("cf4-col-hover"); }
        }
    });
    boardEl.addEventListener("mouseout", function (e) {
        var cell = e.target.closest(".cf4-cell");
        if (!cell) { return; }
        var col = parseInt(cell.dataset.col, 10);
        for (var r = 0; r < ROWS; r++) { cells[r][col].classList.remove("cf4-col-hover"); }
    });

    el.newBtn.addEventListener("click", buildBoard);
    el.again.addEventListener("click", buildBoard);

    for (var i = 0; i < modeButtons.length; i++) {
        modeButtons[i].addEventListener("click", function () {
            for (var j = 0; j < modeButtons.length; j++) { modeButtons[j].classList.remove("active"); }
            this.classList.add("active");
            mode = this.dataset.mode;
            buildBoard();
        });
    }

    loadWins();
    buildBoard();
})();
