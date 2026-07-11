(function () {
    "use strict";

    var EMOJIS = ["🐶", "🐱", "🦊", "🐼", "🦁", "🐸", "🐵", "🐷", "🐧", "🦄", "🐝", "🦋"];
    var DIFFS = {
        easy: { cols: 4, rows: 3 },
        medium: { cols: 4, rows: 4 },
        hard: { cols: 6, rows: 4 }
    };
    var RECORD_PREFIX = "memoryMatchBest_";

    // ---- DOM ----
    var gridEl = document.getElementById("memGrid");
    var el = {
        moves: document.getElementById("memMoves"),
        matches: document.getElementById("memMatches"),
        time: document.getElementById("memTime"),
        record: document.getElementById("memRecord"),
        overlay: document.getElementById("memOverlay"),
        overTitle: document.getElementById("memOverTitle"),
        overText: document.getElementById("memOverText"),
        again: document.getElementById("memAgain"),
        newBtn: document.getElementById("memNew")
    };
    var diffButtons = document.querySelectorAll(".mem-diff button");

    // ---- State ----
    var diff = "easy";
    var cards;         // array of {value, node, matched}
    var first = null;
    var lock = false;
    var moves, matches, totalPairs;
    var timer, elapsed, started;

    function loadRecord() {
        var best = getBest();
        el.record.textContent = best == null ? "—" : best;
    }
    function getBest() {
        try { var v = parseInt(localStorage.getItem(RECORD_PREFIX + diff), 10); return isNaN(v) ? null : v; }
        catch (e) { return null; }
    }
    function saveBest(m) {
        try {
            var cur = getBest();
            if (cur == null || m < cur) { localStorage.setItem(RECORD_PREFIX + diff, String(m)); return true; }
        } catch (e) { /* ignore */ }
        return false;
    }

    function shuffle(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        }
        return arr;
    }

    function buildGame() {
        var cfg = DIFFS[diff];
        totalPairs = (cfg.cols * cfg.rows) / 2;

        var chosen = shuffle(EMOJIS.slice()).slice(0, totalPairs);
        var values = shuffle(chosen.concat(chosen));

        gridEl.style.gridTemplateColumns = "repeat(" + cfg.cols + ", 1fr)";
        gridEl.innerHTML = "";
        cards = [];
        first = null;
        lock = false;
        moves = 0;
        matches = 0;
        elapsed = 0;
        started = false;
        clearInterval(timer);
        el.moves.textContent = "0";
        el.matches.textContent = "0";
        el.time.textContent = "0";
        el.overlay.classList.add("mem-hidden");

        for (var i = 0; i < values.length; i++) {
            var card = document.createElement("div");
            card.className = "mem-card";
            card.innerHTML =
                '<div class="mem-inner">' +
                    '<div class="mem-front">?</div>' +
                    '<div class="mem-back">' + values[i] + '</div>' +
                '</div>';
            gridEl.appendChild(card);
            var rec = { value: values[i], node: card, matched: false };
            cards.push(rec);
            bindCard(rec);
        }
    }

    function bindCard(rec) {
        rec.node.addEventListener("click", function () { flip(rec); });
    }

    function startTimer() {
        started = true;
        timer = setInterval(function () {
            elapsed++;
            el.time.textContent = elapsed;
        }, 1000);
    }

    function flip(rec) {
        if (lock || rec.matched) { return; }
        if (first === rec) { return; }
        if (rec.node.classList.contains("flipped")) { return; }

        if (!started) { startTimer(); }
        rec.node.classList.add("flipped");

        if (!first) {
            first = rec;
            return;
        }

        // second card
        moves++;
        el.moves.textContent = moves;

        if (first.value === rec.value) {
            first.matched = true;
            rec.matched = true;
            first.node.classList.add("matched");
            rec.node.classList.add("matched");
            first = null;
            matches++;
            el.matches.textContent = matches;
            if (matches >= totalPairs) { setTimeout(winGame, 500); }
        } else {
            lock = true;
            var a = first, b = rec;
            first = null;
            setTimeout(function () {
                a.node.classList.remove("flipped");
                b.node.classList.remove("flipped");
                lock = false;
            }, 800);
        }
    }

    function winGame() {
        clearInterval(timer);
        var isRecord = saveBest(moves);
        loadRecord();

        var medal = isRecord ? "🏆" : "🥇";
        var title = isRecord ? "NEW BEST!" : "YOU WIN!";
        el.overTitle.innerHTML = '<span class="mem-medal">' + medal + '</span><br>' + title;
        el.overText.innerHTML =
            '<div class="mem-scoreboard">' +
                '<div class="mem-score-row"><span>👆 Moves</span><b>' + moves + '</b></div>' +
                '<div class="mem-score-row"><span>⏱ Time</span><b>' + elapsed + 's</b></div>' +
                '<div class="mem-score-row"><span>🏅 Best Moves</span><b>' + (getBest() || moves) + '</b></div>' +
            '</div>';
        el.again.textContent = "PLAY AGAIN";
        el.overlay.classList.remove("mem-hidden");
        launchConfetti(90);
    }

    function launchConfetti(count) {
        var colors = ["#f5a623", "#2bb3d6", "#6ab04c", "#e74c3c", "#5a9fd4", "#9b59b6"];
        var layer = document.createElement("div");
        layer.className = "mem-confetti";
        el.overlay.appendChild(layer);
        for (var i = 0; i < count; i++) {
            var piece = document.createElement("span");
            piece.className = "mem-confetti-piece";
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
    el.newBtn.addEventListener("click", buildGame);
    el.again.addEventListener("click", buildGame);

    for (var i = 0; i < diffButtons.length; i++) {
        diffButtons[i].addEventListener("click", function () {
            for (var j = 0; j < diffButtons.length; j++) { diffButtons[j].classList.remove("active"); }
            this.classList.add("active");
            diff = this.dataset.diff;
            loadRecord();
            buildGame();
        });
    }

    loadRecord();
    buildGame();
})();
