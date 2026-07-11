(function () {
    "use strict";

    var TOTAL_ROUNDS = 10;
    var RECORD_KEY = "colorHuntRecord";

    // ---- DOM references ----
    var el = {
        level: document.getElementById("clrLevel"),
        score: document.getElementById("clrScore"),
        record: document.getElementById("clrRecord"),
        roundPill: document.getElementById("clrRoundPill"),
        progress: document.getElementById("clrProgress"),
        grid: document.getElementById("clrGrid"),
        overlay: document.getElementById("clrOverlay"),
        overTitle: document.getElementById("clrOverTitle"),
        overText: document.getElementById("clrOverText"),
        start: document.getElementById("clrStart")
    };

    // ---- Game state ----
    var round = 0;         // 0-based index of current round
    var score = 0;
    var record = 0;
    var locked = false;

    function loadRecord() {
        try {
            var v = parseInt(localStorage.getItem(RECORD_KEY), 10);
            record = isNaN(v) ? 0 : v;
        } catch (e) { record = 0; }
        el.record.textContent = record;
    }

    function saveRecord() {
        try { localStorage.setItem(RECORD_KEY, String(record)); } catch (e) { /* ignore */ }
    }

    // Grid columns grow with the round: 2,2,3,3,4,4,5,5,6,6
    function colsForRound(r) {
        return Math.min(2 + Math.floor(r / 2), 6);
    }

    // Shade difference (in HSL lightness %) shrinks as rounds progress: easy -> hard
    function deltaForRound(r) {
        var t = r / (TOTAL_ROUNDS - 1); // 0 .. 1
        return 22 - t * 16;             // 22% down to ~6%
    }

    function randomBaseColor() {
        var hue = Math.floor(Math.random() * 360);
        var sat = 45 + Math.floor(Math.random() * 25);   // 45-70%
        var light = 38 + Math.floor(Math.random() * 18);  // 38-56% (room to go lighter)
        return { h: hue, s: sat, l: light };
    }

    function hsl(c) {
        return "hsl(" + c.h + ", " + c.s + "%, " + c.l + "%)";
    }

    function renderRound() {
        locked = false;
        var cols = colsForRound(round);
        var count = cols * cols;
        var base = randomBaseColor();
        var delta = deltaForRound(round);

        // Odd tile is a lighter shade of the same hue.
        var odd = { h: base.h, s: base.s, l: Math.min(base.l + delta, 92) };
        var oddIndex = Math.floor(Math.random() * count);

        el.roundPill.textContent = (round + 1);
        el.roundPill.classList.toggle("warn", round >= 4 && round < 7);
        el.roundPill.classList.toggle("danger", round >= 7);
        el.level.textContent = (round + 1);
        el.progress.style.width = (round / TOTAL_ROUNDS * 100) + "%";

        el.grid.style.gridTemplateColumns = "repeat(" + cols + ", 1fr)";
        el.grid.innerHTML = "";
        for (var i = 0; i < count; i++) {
            var tile = document.createElement("button");
            tile.className = "clr-tile";
            tile.style.background = (i === oddIndex) ? hsl(odd) : hsl(base);
            tile.dataset.odd = (i === oddIndex) ? "1" : "0";
            tile.addEventListener("click", onTileClick);
            el.grid.appendChild(tile);
        }
    }

    function onTileClick(e) {
        if (locked) { return; }
        locked = true;
        var tile = e.currentTarget;
        var isCorrect = tile.dataset.odd === "1";

        if (isCorrect) {
            score++;
            el.score.textContent = score;
            tile.classList.add("hit");
        } else {
            tile.classList.add("miss");
            // also highlight the correct one so the kid learns
            var odd = el.grid.querySelector('[data-odd="1"]');
            if (odd) { odd.classList.add("hit"); }
        }

        // disable all tiles
        var tiles = el.grid.querySelectorAll(".clr-tile");
        tiles.forEach(function (t) { t.disabled = true; });

        setTimeout(next, isCorrect ? 550 : 950);
    }

    function next() {
        round++;
        if (round >= TOTAL_ROUNDS) {
            finish();
        } else {
            renderRound();
        }
    }

    function finish() {
        el.progress.style.width = "100%";

        var pct = score / TOTAL_ROUNDS;
        var missed = TOTAL_ROUNDS - score;

        if (score > record) { record = score; saveRecord(); }
        el.record.textContent = record;

        var medal, title, cheer;
        if (score === TOTAL_ROUNDS) { medal = "\ud83c\udfc6"; title = "PERFECT!"; cheer = "Incredible eyes! You spotted every single one! \ud83c\udf89"; }
        else if (pct >= 0.8) { medal = "\ud83e\udd47"; title = "AMAZING!"; cheer = "Super sharp vision! So close to perfect! \ud83c\udf1f"; }
        else if (pct >= 0.6) { medal = "\ud83e\udd48"; title = "GREAT JOB!"; cheer = "You have a great eye for color! \ud83c\udfa8"; }
        else if (pct >= 0.4) { medal = "\ud83e\udd49"; title = "WELL DONE!"; cheer = "Nice spotting! Play again to sharpen your eyes! \ud83d\udc41\ufe0f"; }
        else { medal = "\ud83c\udf31"; title = "GOOD TRY!"; cheer = "Colors can be tricky! Give it another go! \ud83d\udcaa"; }

        var stars = Math.round(pct * 5);
        var starRow = "";
        for (var i = 0; i < 5; i++) { starRow += (i < stars ? "\u2b50" : "\u2606"); }

        el.overTitle.innerHTML = '<span class="clr-medal">' + medal + '</span><br>' + title;
        el.overTitle.classList.remove("clr-hidden");
        el.overText.innerHTML =
            '<div class="clr-stars">' + starRow + '</div>' +
            '<div class="clr-scoreboard">' +
                '<div class="clr-score-row"><span>\ud83c\udfaf Correct</span><b>' + score + ' / ' + TOTAL_ROUNDS + '</b></div>' +
                '<div class="clr-score-row"><span>\u274c Missed</span><b>' + missed + '</b></div>' +
                '<div class="clr-score-row"><span>\ud83c\udfc5 Record</span><b>' + record + '</b></div>' +
            '</div>' +
            '<div class="clr-cheer">' + cheer + '</div>';
        el.start.textContent = "PLAY AGAIN";
        el.overlay.classList.remove("clr-hidden");

        launchConfetti(20 + Math.round(pct * 80));
    }

    // ---- Confetti celebration ----
    function launchConfetti(count) {
        var colors = ["#f5a623", "#2bb3d6", "#6ab04c", "#e74c3c", "#5a9fd4", "#9b59b6"];
        var layer = document.createElement("div");
        layer.className = "clr-confetti";
        el.overlay.appendChild(layer);
        for (var i = 0; i < count; i++) {
            var piece = document.createElement("span");
            piece.className = "clr-confetti-piece";
            piece.style.left = Math.random() * 100 + "%";
            piece.style.background = colors[Math.floor(Math.random() * colors.length)];
            piece.style.animationDelay = (Math.random() * 0.6) + "s";
            piece.style.animationDuration = (1.8 + Math.random() * 1.4) + "s";
            piece.style.transform = "rotate(" + (Math.random() * 360) + "deg)";
            layer.appendChild(piece);
        }
        setTimeout(function () { if (layer.parentNode) { layer.parentNode.removeChild(layer); } }, 3600);
    }

    function startGame() {
        round = 0;
        score = 0;
        el.score.textContent = 0;
        el.level.textContent = 1;
        el.overlay.classList.add("clr-hidden");
        renderRound();
    }

    el.start.addEventListener("click", startGame);
    loadRecord();
})();
