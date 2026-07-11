(function () {
    'use strict';

    var PLACE = [128, 64, 32, 16, 8, 4, 2, 1];

    // DOM refs
    var elPlaces = document.getElementById('bbPlaces');
    var elBits = document.getElementById('bbBits');
    var elTarget = document.getElementById('bbTarget');
    var elSub = document.getElementById('bbSub');
    var elValue = document.getElementById('bbValue');
    var elBinary = document.getElementById('bbBinary');
    var elScore = document.getElementById('bbScore');
    var elLevel = document.getElementById('bbLevel');
    var elStreak = document.getElementById('bbStreak');
    var elBest = document.getElementById('bbBest');
    var elOverlay = document.getElementById('bbOverlay');
    var elOverTitle = document.getElementById('bbOverTitle');
    var elOverText = document.getElementById('bbOverText');
    var elOverlayBtn = document.getElementById('bbOverlayBtn');
    var btnStart = document.getElementById('bbStart');
    var btnEnd = document.getElementById('bbEnd');

    // state
    var bits = [0, 0, 0, 0, 0, 0, 0, 0];
    var cellEls = [];
    var target = 0;
    var score = 0;
    var level = 1;
    var streak = 0;
    var matches = 0;
    var running = false;

    var best = 0;
    try { best = parseInt(localStorage.getItem('binaryBlitzBest') || '0', 10) || 0; } catch (e) {}
    elBest.textContent = best;

    // build place headers + bit cells
    PLACE.forEach(function (p, i) {
        var ph = document.createElement('div');
        ph.className = 'bblitz-place';
        ph.textContent = p;
        elPlaces.appendChild(ph);

        var c = document.createElement('div');
        c.className = 'bblitz-bit';
        c.textContent = '0';
        c.dataset.index = i;
        c.addEventListener('click', function () { toggleBit(i); });
        elBits.appendChild(c);
        cellEls.push(c);
    });

    function value() {
        var v = 0;
        for (var i = 0; i < 8; i++) v |= (bits[i] << (7 - i));
        return v;
    }

    function bin8(v) {
        var s = v.toString(2);
        while (s.length < 8) s = '0' + s;
        return s.slice(0, 4) + ' ' + s.slice(4);
    }

    function renderBits() {
        for (var i = 0; i < 8; i++) {
            cellEls[i].textContent = bits[i] ? '1' : '0';
            cellEls[i].classList.toggle('on', bits[i] === 1);
        }
        var v = value();
        elValue.textContent = v;
        elBinary.textContent = bin8(v);
    }

    function newTarget() {
        var prev = target;
        do { target = Math.floor(Math.random() * 256); } while (target === prev);
        elTarget.textContent = target;
        elSub.textContent = '0x' + (target < 16 ? '0' : '') + target.toString(16).toUpperCase();
        bits = [0, 0, 0, 0, 0, 0, 0, 0];
        renderBits();
    }

    function toggleBit(i) {
        if (!running) return;
        bits[i] ^= 1;
        renderBits();
        if (value() === target) onMatch();
    }

    function onMatch() {
        matches++;
        streak++;
        // score: base + streak bonus, scaled by level
        var gained = (50 + streak * 5) * level / 10;
        score += Math.round(gained);

        if (matches % 5 === 0) level++;

        elScore.textContent = score;
        elLevel.textContent = level;
        elStreak.textContent = streak;

        if (score > best) {
            best = score;
            elBest.textContent = best;
            try { localStorage.setItem('binaryBlitzBest', String(best)); } catch (e) {}
        }

        // celebrate
        cellEls.forEach(function (c) {
            c.classList.remove('correct');
            void c.offsetWidth;
            c.classList.add('correct');
        });

        newTarget();
    }

    function gameOver() {
        running = false;
        // flash wrong on cells
        cellEls.forEach(function (c) {
            c.classList.remove('wrong');
            void c.offsetWidth;
            c.classList.add('wrong');
        });
        elOverTitle.textContent = 'GAME OVER';
        elOverText.innerHTML = 'You scored <b style="color:#f5a623">' + score +
            '</b> &middot; reached level ' + level + '.';
        elOverlayBtn.textContent = 'PLAY AGAIN';
        elOverlay.classList.remove('bblitz-hidden');
    }

    function start() {
        score = 0; level = 1; streak = 0; matches = 0;
        elScore.textContent = 0;
        elLevel.textContent = 1;
        elStreak.textContent = 0;
        running = true;
        elOverlay.classList.add('bblitz-hidden');
        target = -1;
        newTarget();
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
        if (evt.key >= '1' && evt.key <= '8') {
            toggleBit(parseInt(evt.key, 10) - 1);
            evt.preventDefault();
        } else if (evt.key === 'Backspace') {
            if (running) { bits = [0, 0, 0, 0, 0, 0, 0, 0]; renderBits(); }
            evt.preventDefault();
        } else if (evt.key === ' ') {
            if (!running) start();
            evt.preventDefault();
        }
    });

    renderBits();
})();
