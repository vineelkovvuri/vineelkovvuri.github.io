(function () {
    'use strict';

    var UNITS = [
        { name: 'B', exp: 0 },
        { name: 'KB', exp: 10 },
        { name: 'MB', exp: 20 },
        { name: 'GB', exp: 30 },
        { name: 'TB', exp: 40 }
    ];

    // DOM
    var elHex = document.getElementById('hsqHex');
    var elSub = document.getElementById('hsqSub');
    var elOptions = document.getElementById('hsqOptions');
    var elScore = document.getElementById('hsqScore');
    var elLevel = document.getElementById('hsqLevel');
    var elStreak = document.getElementById('hsqStreak');
    var elLives = document.getElementById('hsqLives');
    var elBest = document.getElementById('hsqBest');
    var elOverlay = document.getElementById('hsqOverlay');
    var elOverTitle = document.getElementById('hsqOverTitle');
    var elOverText = document.getElementById('hsqOverText');
    var elOverlayBtn = document.getElementById('hsqOverlayBtn');
    var btnStart = document.getElementById('hsqStart');
    var btnEnd = document.getElementById('hsqEnd');

    // state
    var score = 0, level = 1, streak = 0, lives = 3, matches = 0;
    var running = false, reviewing = false;
    var reviewTO = null;
    var current = null; // { bytes, hex, correct, options }

    var best = 0;
    try { best = parseInt(localStorage.getItem('hexSizeBest') || '0', 10) || 0; } catch (e) {}
    elBest.textContent = best;

    // ---- helpers ----
    function rand(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

    function fmtNum(v) {
        if (Number.isInteger(v)) return v.toString();
        return (Math.round(v * 100) / 100).toString();
    }

    function formatSize(bytes) {
        for (var i = UNITS.length - 1; i >= 0; i--) {
            var div = Math.pow(2, UNITS[i].exp);
            if (bytes >= div || UNITS[i].name === 'B') {
                return fmtNum(bytes / div) + ' ' + UNITS[i].name;
            }
        }
        return bytes + ' B';
    }

    function hexGroup(v) {
        var s = v.toString(16).toUpperCase();
        while (s.length % 4 !== 0) s = '0' + s;
        return '0x' + s.match(/.{1,4}/g).join('_');
    }

    function maxUnitIdx() {
        if (level <= 1) return 1;       // B / KB
        if (level === 2) return 2;      // + MB
        if (level === 3) return 3;      // + GB
        return 4;                       // + TB
    }

    function genMantissa() {
        if (level <= 2) return 1 << rand(0, 9);   // 1..512 powers of two
        var r = Math.random();
        if (r < 0.55) return 1 << rand(0, 9);     // still mostly clean powers
        if (r < 0.85) return rand(2, 64);         // arbitrary integers
        return rand(1, 12) + 0.5;                 // half sizes e.g. 1.5 MB
    }

    function newRound() {
        var prevBytes = current ? current.bytes : -1;
        var bytes, exp, mant, guard = 0;
        do {
            var unit = UNITS[rand(0, maxUnitIdx())];
            exp = unit.exp;
            mant = genMantissa();
            if (!Number.isInteger(mant) && exp < 10) exp = 10; // no fractional bytes
            bytes = mant * Math.pow(2, exp);
            guard++;
        } while ((bytes === prevBytes || bytes < 1) && guard < 30);

        var correct = formatSize(bytes);
        var options = buildOptions(bytes, correct);

        current = { bytes: bytes, hex: hexGroup(bytes), correct: correct, options: options };

        elHex.textContent = current.hex;
        elSub.innerHTML = '&nbsp;';
        renderOptions(false);
    }

    function buildOptions(bytes, correct) {
        var set = {};
        set[correct] = true;
        var opts = [correct];

        var factors = [2, 0.5, 4, 0.25, 8, 0.125, 16, 0.0625];
        // shuffle factors
        for (var i = factors.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = factors[i]; factors[i] = factors[j]; factors[j] = t;
        }
        for (var k = 0; k < factors.length && opts.length < 4; k++) {
            var b = bytes * factors[k];
            if (b >= 1 && Number.isInteger(b)) {
                var s = formatSize(b);
                if (!set[s]) { set[s] = true; opts.push(s); }
            }
        }
        // pad if needed by shifting whole units
        var pad = 1;
        while (opts.length < 4) {
            var s2 = formatSize(bytes * (pad + 2));
            if (!set[s2]) { set[s2] = true; opts.push(s2); }
            pad++;
            if (pad > 12) break;
        }

        // shuffle options
        for (var a = opts.length - 1; a > 0; a--) {
            var bI = Math.floor(Math.random() * (a + 1));
            var tmp = opts[a]; opts[a] = opts[bI]; opts[bI] = tmp;
        }
        return opts;
    }

    function renderOptions(disabled) {
        elOptions.innerHTML = '';
        current.options.forEach(function (label, i) {
            var btn = document.createElement('button');
            btn.className = 'hsq-opt';
            btn.disabled = !!disabled;
            btn.innerHTML = '<span class="k">' + (i + 1) + '</span>' + label;
            btn.addEventListener('click', function () { answer(i, btn); });
            elOptions.appendChild(btn);
        });
    }

    function setLivesUI() {
        var s = '';
        for (var i = 0; i < 3; i++) s += i < lives ? '\u2665' : '\u2661';
        elLives.innerHTML = s;
    }

    function showBreakdown() {
        var b = current.bytes;
        elSub.innerHTML = current.hex.replace(/_/g, '_') + ' = <b style="color:#fff">' +
            current.correct + '</b> = ' + b.toLocaleString() + ' bytes';
    }

    function answer(idx, btn) {
        if (!running || reviewing) return;
        var picked = current.options[idx];
        var correct = picked === current.correct;
        reviewing = true;

        // highlight
        var optBtns = elOptions.querySelectorAll('.hsq-opt');
        optBtns.forEach(function (b, i) {
            b.disabled = true;
            if (current.options[i] === current.correct) b.classList.add('correct');
            else if (i === idx) b.classList.add('wrong');
        });

        if (correct) {
            matches++;
            streak++;
            score += Math.round((50 + streak * 5) * (1 + level * 0.1));
            if (matches % 5 === 0) level++;
            if (score > best) {
                best = score;
                try { localStorage.setItem('hexSizeBest', String(best)); } catch (e) {}
            }
        } else {
            streak = 0;
            lives--;
        }

        showBreakdown();
        updateStats();
        var delay = correct ? 700 : 1600;

        if (!correct && lives <= 0) {
            // let the review show, then game over
            delay = 1400;
            pendingGameOver = true;
        }
        reviewTO = setTimeout(advance, delay);
    }

    function advance() {
        if (pendingGameOver) { gameOver(); return; }
        if (!running) return;
        reviewing = false;
        newRound();
    }

    var pendingGameOver = false;

    function updateStats() {
        elScore.textContent = score;
        elLevel.textContent = level;
        elStreak.textContent = streak;
        elBest.textContent = best;
        setLivesUI();
    }

    function gameOver() {
        running = false;
        reviewing = false;
        pendingGameOver = false;
        clearTimeout(reviewTO);
        elOverTitle.textContent = 'GAME OVER';
        elOverText.innerHTML = 'You scored <b style="color:#f5a623">' + score +
            '</b> and reached level ' + level + '.<br>Keep practicing those powers of two!';
        elOverlayBtn.textContent = 'PLAY AGAIN';
        elOverlay.classList.remove('hsq-hidden');
    }

    function start() {
        clearTimeout(reviewTO);
        score = 0; level = 1; streak = 0; lives = 3; matches = 0;
        running = true; reviewing = false; pendingGameOver = false;
        current = null;
        updateStats();
        elOverlay.classList.add('hsq-hidden');
        newRound();
    }

    function endGame() {
        if (!running) return;
        gameOver();
    }

    // events
    btnStart.addEventListener('click', start);
    btnEnd.addEventListener('click', endGame);
    elOverlayBtn.addEventListener('click', start);

    document.addEventListener('keydown', function (evt) {
        if (evt.key >= '1' && evt.key <= '4') {
            if (running && !reviewing && current) {
                var i = parseInt(evt.key, 10) - 1;
                var btns = elOptions.querySelectorAll('.hsq-opt');
                if (btns[i]) answer(i, btns[i]);
            }
            evt.preventDefault();
        } else if (evt.key === ' ') {
            if (!running) start();
            evt.preventDefault();
        }
    });

    setLivesUI();
})();
