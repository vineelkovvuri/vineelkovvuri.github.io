(function () {
    "use strict";

    var HOLES = 9;
    var GAME_TIME = 30;
    var RECORD_KEY = "whackMoleRecord";

    // ---- DOM ----
    var gridEl = document.getElementById("wamGrid");
    var el = {
        score: document.getElementById("wamScore"),
        time: document.getElementById("wamTime"),
        record: document.getElementById("wamRecord"),
        overlay: document.getElementById("wamOverlay"),
        overTitle: document.getElementById("wamOverTitle"),
        overText: document.getElementById("wamOverText"),
        start: document.getElementById("wamStart"),
        restart: document.getElementById("wamRestart")
    };

    // ---- State ----
    var holes = [];    // {el, moleEl, faceEl, active, isBomb, hideTimer}
    var score, timeLeft, record;
    var running = false;
    var countdownTimer = null;
    var popTimer = null;

    function loadRecord() {
        try { var v = parseInt(localStorage.getItem(RECORD_KEY), 10); record = isNaN(v) ? 0 : v; }
        catch (e) { record = 0; }
        el.record.textContent = record;
    }
    function saveRecord() {
        try { localStorage.setItem(RECORD_KEY, String(record)); } catch (e) { /* ignore */ }
    }

    function buildGrid() {
        gridEl.innerHTML = "";
        holes = [];
        for (var i = 0; i < HOLES; i++) {
            var hole = document.createElement("div");
            hole.className = "wam-hole";
            var mole = document.createElement("div");
            mole.className = "wam-mole";
            var face = document.createElement("span");
            face.className = "wam-face";
            mole.appendChild(face);
            hole.appendChild(mole);
            gridEl.appendChild(hole);

            var rec = { el: hole, moleEl: mole, faceEl: face, active: false, isBomb: false, hideTimer: null };
            holes.push(rec);
            bindHole(rec);
        }
    }

    function bindHole(rec) {
        rec.el.addEventListener("click", function () { whack(rec); });
    }

    function whack(rec) {
        if (!running || !rec.active) { return; }
        rec.active = false;
        clearTimeout(rec.hideTimer);

        if (rec.isBomb) {
            score = Math.max(0, score - 15);
            rec.faceEl.textContent = "💥";
            flashHide(rec, 250);
        } else {
            score += 10;
            rec.faceEl.textContent = "😵";
            rec.moleEl.classList.remove("up");
        }
        el.score.textContent = score;
    }

    function flashHide(rec, delay) {
        setTimeout(function () { rec.moleEl.classList.remove("up"); }, delay);
    }

    function hideAll() {
        for (var i = 0; i < holes.length; i++) {
            holes[i].active = false;
            holes[i].moleEl.classList.remove("up", "bomb");
            clearTimeout(holes[i].hideTimer);
        }
    }

    function popMole() {
        if (!running) { return; }

        // find an inactive hole
        var free = [];
        for (var i = 0; i < holes.length; i++) { if (!holes[i].active) { free.push(holes[i]); } }
        if (free.length) {
            var rec = free[Math.floor(Math.random() * free.length)];
            var isBomb = Math.random() < 0.18;
            rec.active = true;
            rec.isBomb = isBomb;
            rec.faceEl.textContent = isBomb ? "💣" : "🐹";
            rec.moleEl.classList.toggle("bomb", isBomb);
            rec.moleEl.classList.add("up");

            // time visible shrinks as game progresses
            var progress = 1 - timeLeft / GAME_TIME;
            var visible = 900 - progress * 500 + Math.random() * 300;
            rec.hideTimer = setTimeout(function () {
                rec.active = false;
                rec.moleEl.classList.remove("up");
            }, visible);
        }

        // schedule next pop
        var progress2 = 1 - timeLeft / GAME_TIME;
        var gap = 700 - progress2 * 450 + Math.random() * 250;
        popTimer = setTimeout(popMole, gap);
    }

    // ---- Game flow ----
    function startGame() {
        score = 0;
        timeLeft = GAME_TIME;
        el.score.textContent = 0;
        el.time.textContent = timeLeft;
        running = true;
        hideAll();
        el.overlay.classList.add("wam-hidden");

        clearInterval(countdownTimer);
        countdownTimer = setInterval(function () {
            timeLeft--;
            el.time.textContent = timeLeft;
            if (timeLeft <= 0) { endGame(); }
        }, 1000);

        clearTimeout(popTimer);
        popTimer = setTimeout(popMole, 600);
    }

    function endGame() {
        running = false;
        clearInterval(countdownTimer);
        clearTimeout(popTimer);
        hideAll();

        var isRecord = score > record;
        if (isRecord) { record = score; saveRecord(); el.record.textContent = record; }

        var medal, title;
        if (isRecord && score > 0) { medal = "🏆"; title = "NEW RECORD!"; }
        else if (score >= 300) { medal = "🥇"; title = "AWESOME!"; }
        else if (score >= 180) { medal = "🥈"; title = "GREAT JOB!"; }
        else if (score >= 80) { medal = "🥉"; title = "NICE!"; }
        else { medal = "🔨"; title = "TIME'S UP"; }

        el.overTitle.innerHTML = '<span class="wam-medal">' + medal + '</span><br>' + title;
        el.overText.innerHTML =
            '<div class="wam-scoreboard">' +
                '<div class="wam-score-row"><span>⭐ Score</span><b>' + score + '</b></div>' +
                '<div class="wam-score-row"><span>🏅 Record</span><b>' + record + '</b></div>' +
            '</div>';
        el.start.textContent = "PLAY AGAIN";
        el.overlay.classList.remove("wam-hidden");

        if (isRecord && score > 0) { launchConfetti(90); }
    }

    function launchConfetti(count) {
        var colors = ["#f5a623", "#2bb3d6", "#6ab04c", "#e74c3c", "#5a9fd4", "#9b59b6"];
        var layer = document.createElement("div");
        layer.className = "wam-confetti";
        el.overlay.appendChild(layer);
        for (var i = 0; i < count; i++) {
            var piece = document.createElement("span");
            piece.className = "wam-confetti-piece";
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
    el.start.addEventListener("click", startGame);
    el.restart.addEventListener("click", startGame);

    loadRecord();
    buildGrid();
})();
