(function () {
    "use strict";

    var RECORD_KEY = "simonRecord";
    var TONES = [329.63, 261.63, 220.00, 164.81]; // green, red, yellow, blue (E4, C4, A3, E3)

    // ---- DOM ----
    var pad = document.getElementById("simPad");
    var quads = pad.querySelectorAll(".sim-quad");
    var el = {
        round: document.getElementById("simRound"),
        best: document.getElementById("simBest"),
        record: document.getElementById("simRecord"),
        center: document.getElementById("simCenter"),
        status: document.getElementById("simStatus"),
        overlay: document.getElementById("simOverlay"),
        overTitle: document.getElementById("simOverTitle"),
        overText: document.getElementById("simOverText"),
        start: document.getElementById("simStart"),
        restart: document.getElementById("simRestart"),
        strict: document.getElementById("simStrict")
    };

    // ---- State ----
    var sequence, inputIndex, round, best, record;
    var acceptingInput = false;
    var playing = false;
    var strict = false;
    var audioCtx = null;

    function loadRecord() {
        try { var v = parseInt(localStorage.getItem(RECORD_KEY), 10); record = isNaN(v) ? 0 : v; }
        catch (e) { record = 0; }
        el.record.textContent = record;
    }
    function saveRecord() {
        try { localStorage.setItem(RECORD_KEY, String(record)); } catch (e) { /* ignore */ }
    }

    function getAudio() {
        if (!audioCtx) {
            try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
            catch (e) { audioCtx = null; }
        }
        return audioCtx;
    }

    function playTone(color, duration) {
        var ac = getAudio();
        if (!ac) { return; }
        if (ac.state === "suspended") { ac.resume(); }
        var osc = ac.createOscillator();
        var gain = ac.createGain();
        osc.type = "sine";
        osc.frequency.value = TONES[color];
        gain.gain.setValueAtTime(0.0001, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration / 1000);
        osc.connect(gain).connect(ac.destination);
        osc.start();
        osc.stop(ac.currentTime + duration / 1000 + 0.02);
    }

    function flash(color, duration) {
        var q = quads[color];
        q.classList.add("lit");
        playTone(color, duration);
        setTimeout(function () { q.classList.remove("lit"); }, duration);
    }

    function setStatus(text) { el.status.textContent = text; }

    function updateStats() {
        el.round.textContent = round;
        el.best.textContent = best;
        el.center.textContent = round;
    }

    // ---- Game flow ----
    function newGame() {
        sequence = [];
        round = 0;
        best = 0;
        playing = true;
        acceptingInput = false;
        el.overlay.classList.add("sim-hidden");
        updateStats();
        getAudio();
        setTimeout(nextRound, 500);
    }

    function nextRound() {
        round++;
        if (round > best) { best = round; }
        updateStats();
        sequence.push(Math.floor(Math.random() * 4));
        inputIndex = 0;
        playSequence();
    }

    function playSequence() {
        acceptingInput = false;
        setStatus("Watch…");
        var speed = Math.max(280, 620 - round * 25);
        var i = 0;
        var interval = setInterval(function () {
            if (i >= sequence.length) {
                clearInterval(interval);
                acceptingInput = true;
                setStatus("Your turn!");
                return;
            }
            flash(sequence[i], speed * 0.6);
            i++;
        }, speed);
    }

    function handlePress(color) {
        if (!acceptingInput || !playing) { return; }
        flash(color, 200);

        if (color === sequence[inputIndex]) {
            inputIndex++;
            if (inputIndex >= sequence.length) {
                acceptingInput = false;
                setStatus("Nice!");
                setTimeout(nextRound, 800);
            }
        } else {
            wrongAnswer();
        }
    }

    function wrongAnswer() {
        acceptingInput = false;
        playTone(1, 500);
        // flash all red-ish
        for (var i = 0; i < quads.length; i++) { quads[i].classList.add("lit"); }
        setTimeout(function () {
            for (var j = 0; j < quads.length; j++) { quads[j].classList.remove("lit"); }
        }, 400);

        if (strict) {
            setTimeout(endGame, 500);
        } else {
            setStatus("Oops! Try again…");
            inputIndex = 0;
            setTimeout(playSequence, 1000);
        }
    }

    function endGame() {
        playing = false;
        acceptingInput = false;
        setStatus("");

        var reached = round - 1; // last fully-completed round
        if (reached < 0) { reached = 0; }
        var isRecord = reached > record;
        if (isRecord) { record = reached; saveRecord(); el.record.textContent = record; }

        var medal, title;
        if (isRecord && reached > 0) { medal = "🏆"; title = "NEW RECORD!"; }
        else if (reached >= 15) { medal = "🥇"; title = "AMAZING MEMORY!"; }
        else if (reached >= 8) { medal = "🥈"; title = "GREAT MEMORY!"; }
        else if (reached >= 4) { medal = "🥉"; title = "NICE!"; }
        else { medal = "🎵"; title = "GAME OVER"; }

        el.overTitle.innerHTML = '<span class="sim-medal">' + medal + '</span><br>' + title;
        el.overText.innerHTML =
            '<div class="sim-scoreboard">' +
                '<div class="sim-score-row"><span>🎯 Rounds</span><b>' + reached + '</b></div>' +
                '<div class="sim-score-row"><span>🏅 Record</span><b>' + record + '</b></div>' +
            '</div>';
        el.start.textContent = "PLAY AGAIN";
        el.overlay.classList.remove("sim-hidden");

        if (isRecord && reached > 0) { launchConfetti(80); }
    }

    function launchConfetti(count) {
        var colors = ["#f5a623", "#2bb3d6", "#6ab04c", "#e74c3c", "#5a9fd4", "#9b59b6"];
        var layer = document.createElement("div");
        layer.className = "sim-confetti";
        el.overlay.appendChild(layer);
        for (var i = 0; i < count; i++) {
            var piece = document.createElement("span");
            piece.className = "sim-confetti-piece";
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
    el.start.addEventListener("click", newGame);
    el.restart.addEventListener("click", newGame);
    el.strict.addEventListener("click", function () {
        strict = !strict;
        el.strict.textContent = strict ? "Strict: ON" : "Strict: OFF";
        el.strict.classList.toggle("active", strict);
    });

    for (var i = 0; i < quads.length; i++) {
        (function (q) {
            var color = parseInt(q.dataset.color, 10);
            q.addEventListener("click", function () { handlePress(color); });
        })(quads[i]);
    }

    loadRecord();
})();
