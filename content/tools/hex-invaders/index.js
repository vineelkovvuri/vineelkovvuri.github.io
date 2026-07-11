(function () {
    'use strict';

    var canvas = document.getElementById('hexgCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    var W = canvas.width;   // 480
    var H = canvas.height;  // 760

    // ---- Layout geometry ----
    var HUD_H = 56;
    var FOOTER_H = 96;            // bottom strip with score / lives
    var BIT_ROW_H = 96;           // the 8 bit cells band
    var bitRowTop = H - FOOTER_H - BIT_ROW_H;
    var bitRowBottom = H - FOOTER_H;

    var BIT_MARGIN = 14;
    var BIT_GAP = 6;
    var cellW = (W - 2 * BIT_MARGIN - 7 * BIT_GAP) / 8;
    var cellH = 64;
    var cellY = bitRowTop + (BIT_ROW_H - cellH) / 2;

    var PLACE_VALUES = [128, 64, 32, 16, 8, 4, 2, 1];

    // ---- Game state ----
    var bits = [0, 0, 0, 0, 0, 0, 0, 0];
    var enemies = [];
    var particles = [];
    var stars = [];

    var score = 0;
    var lives = 3;
    var spawnTimer = 0;
    var running = false;
    var gameOver = false;
    var lastTs = 0;
    var flashCell = -1;         // cell index briefly highlighted on toggle
    var flashTimer = 0;
    var hitFlash = 0;           // red screen flash when losing a life

    var highScore = 0;
    try { highScore = parseInt(localStorage.getItem('hexInvadersHigh') || '0', 10) || 0; } catch (e) {}

    var showHints = true;

    // ---- Starfield background ----
    function initStars() {
        stars = [];
        for (var i = 0; i < 60; i++) {
            stars.push({
                x: Math.random() * W,
                y: Math.random() * bitRowTop,
                r: Math.random() * 1.6 + 0.4,
                tw: Math.random() * Math.PI * 2
            });
        }
    }
    initStars();

    // ---- Helpers ----
    function bitsToValue() {
        var v = 0;
        for (var i = 0; i < 8; i++) v |= (bits[i] << (7 - i));
        return v;
    }

    function hex2(v) {
        var s = v.toString(16).toUpperCase();
        return s.length < 2 ? '0' + s : s;
    }

    function spawnEnemy() {
        var maxEnemies = Math.min(4, 1 + Math.floor(score / 5));
        if (enemies.length >= maxEnemies) return;

        // avoid duplicate values and the value currently on the bit board
        var taken = {};
        taken[bitsToValue()] = true;
        for (var i = 0; i < enemies.length; i++) taken[enemies[i].value] = true;

        var value, guard = 0;
        do { value = Math.floor(Math.random() * 256); guard++; }
        while (taken[value] && guard < 40);

        var speed = 26 + score * 1.6;          // px per second
        speed = Math.min(speed, 120);
        enemies.push({
            value: value,
            x: 36 + Math.random() * (W - 72),
            y: HUD_H + 24,
            speed: speed,
            wob: Math.random() * Math.PI * 2,
            scale: 1,
            dying: false,
            t: Math.random() * 100
        });
    }

    function explodeAt(x, y, color) {
        for (var i = 0; i < 18; i++) {
            var a = Math.random() * Math.PI * 2;
            var sp = 40 + Math.random() * 140;
            particles.push({
                x: x, y: y,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp,
                life: 0.5 + Math.random() * 0.4,
                age: 0,
                color: color,
                size: 2 + Math.random() * 3
            });
        }
    }

    function checkMatch() {
        var v = bitsToValue();
        for (var i = 0; i < enemies.length; i++) {
            if (!enemies[i].dying && enemies[i].value === v) {
                var e = enemies[i];
                e.dying = true;
                e.dieAge = 0;
                explodeAt(e.x, e.y, '#ffd23f');
                explodeAt(e.x, e.y, '#ff5d5d');
                score++;
                if (score > highScore) {
                    highScore = score;
                    try { localStorage.setItem('hexInvadersHigh', String(highScore)); } catch (err) {}
                }
                // fresh slate for the next target
                bits = [0, 0, 0, 0, 0, 0, 0, 0];
                return;
            }
        }
    }

    function loseLife(e) {
        lives--;
        hitFlash = 1;
        explodeAt(e.x, bitRowTop, '#ff3b3b');
        if (lives <= 0) {
            lives = 0;
            running = false;
            gameOver = true;
        }
    }

    // ---- Input ----
    function cellAt(px, py) {
        if (py < cellY || py > cellY + cellH) return -1;
        for (var i = 0; i < 8; i++) {
            var cx = BIT_MARGIN + i * (cellW + BIT_GAP);
            if (px >= cx && px <= cx + cellW) return i;
        }
        return -1;
    }

    function toggleBit(i) {
        if (i < 0 || i > 7) return;
        bits[i] ^= 1;
        flashCell = i;
        flashTimer = 0.18;
        if (running) checkMatch();
    }

    function canvasPos(evt) {
        var rect = canvas.getBoundingClientRect();
        var t = evt.touches && evt.touches[0] ? evt.touches[0] : evt;
        var sx = canvas.width / rect.width;
        var sy = canvas.height / rect.height;
        return { x: (t.clientX - rect.left) * sx, y: (t.clientY - rect.top) * sy };
    }

    canvas.addEventListener('mousedown', function (evt) {
        var p = canvasPos(evt);
        var i = cellAt(p.x, p.y);
        if (i >= 0) { toggleBit(i); return; }
        if (!running && (gameOver || score === 0)) startGame();
    });

    canvas.addEventListener('touchstart', function (evt) {
        evt.preventDefault();
        var p = canvasPos(evt);
        var i = cellAt(p.x, p.y);
        if (i >= 0) { toggleBit(i); return; }
        if (!running) startGame();
    }, { passive: false });

    document.addEventListener('keydown', function (evt) {
        if (evt.key >= '1' && evt.key <= '8') {
            toggleBit(parseInt(evt.key, 10) - 1);
            evt.preventDefault();
        } else if (evt.key === 'Backspace') {
            bits = [0, 0, 0, 0, 0, 0, 0, 0];
            evt.preventDefault();
        } else if (evt.key === ' ') {
            startGame();
            evt.preventDefault();
        }
    });

    document.getElementById('hexgStart').addEventListener('click', startGame);
    document.getElementById('hexgReset').addEventListener('click', function () {
        running = false; gameOver = false; score = 0; lives = 3;
        enemies = []; particles = []; bits = [0, 0, 0, 0, 0, 0, 0, 0];
        draw();
    });
    document.getElementById('hexgHints').addEventListener('change', function (e) {
        showHints = e.target.checked;
        if (!running) draw();
    });

    function startGame() {
        score = 0; lives = 3; spawnTimer = 0;
        enemies = []; particles = []; bits = [0, 0, 0, 0, 0, 0, 0, 0];
        gameOver = false; running = true;
        spawnEnemy();
    }

    // ---- Update ----
    function update(dt) {
        if (flashTimer > 0) { flashTimer -= dt; if (flashTimer <= 0) flashCell = -1; }
        if (hitFlash > 0) hitFlash = Math.max(0, hitFlash - dt * 2.5);

        // twinkle
        for (var s = 0; s < stars.length; s++) stars[s].tw += dt * 2;

        // particles
        for (var p = particles.length - 1; p >= 0; p--) {
            var pt = particles[p];
            pt.age += dt;
            if (pt.age >= pt.life) { particles.splice(p, 1); continue; }
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.vy += 220 * dt;
        }

        if (!running) return;

        // spawn cadence shrinks as score grows
        var spawnInterval = Math.max(0.9, 2.6 - score * 0.08);
        spawnTimer += dt;
        if (spawnTimer >= spawnInterval) { spawnTimer = 0; spawnEnemy(); }

        for (var i = enemies.length - 1; i >= 0; i--) {
            var e = enemies[i];
            e.t += dt;
            if (e.dying) {
                e.dieAge += dt;
                e.scale = 1 + e.dieAge * 6;
                if (e.dieAge > 0.18) enemies.splice(i, 1);
                continue;
            }
            e.y += e.speed * dt;
            e.wob += dt * 3;
            if (e.y + 26 >= bitRowTop) {
                loseLife(e);
                enemies.splice(i, 1);
            }
        }
    }

    // ---- Drawing ----
    function drawBackground() {
        var g = ctx.createLinearGradient(0, 0, 0, bitRowTop);
        g.addColorStop(0, '#13315c');
        g.addColorStop(1, '#1d4e89');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, bitRowTop);

        // stars
        for (var i = 0; i < stars.length; i++) {
            var st = stars[i];
            var alpha = 0.4 + 0.6 * Math.abs(Math.sin(st.tw));
            ctx.fillStyle = 'rgba(255,255,255,' + alpha.toFixed(2) + ')';
            ctx.beginPath();
            ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
            ctx.fill();
        }

        // distant hills near the ground
        ctx.fillStyle = 'rgba(10, 30, 55, 0.6)';
        ctx.beginPath();
        ctx.moveTo(0, bitRowTop);
        for (var x = 0; x <= W; x += 40) {
            ctx.lineTo(x, bitRowTop - 30 - 20 * Math.sin(x * 0.05));
        }
        ctx.lineTo(W, bitRowTop);
        ctx.closePath();
        ctx.fill();
    }

    function drawHud() {
        // backing
        ctx.fillStyle = 'rgba(8, 18, 32, 0.55)';
        ctx.fillRect(0, 0, W, HUD_H);

        ctx.font = 'bold 20px Consolas, "Courier New", monospace';
        ctx.textBaseline = 'middle';

        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffd23f';
        ctx.fillText('SCORE ' + score, 14, HUD_H / 2);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#9fd3ff';
        ctx.fillText('HI ' + highScore, W / 2, HUD_H / 2);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('LIVES ' + lives, W - 14, HUD_H / 2);
    }

    function drawEnemy(e) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.scale(e.scale, e.scale);
        var bob = Math.sin(e.wob) * 3;
        ctx.translate(0, bob);

        var alpha = e.dying ? Math.max(0, 1 - e.dieAge * 5) : 1;
        ctx.globalAlpha = alpha;

        var bw = 64, bh = 46;
        // body
        ctx.fillStyle = '#d33b5c';
        roundRect(-bw / 2, -bh / 2, bw, bh, 12);
        ctx.fill();
        // little antennae / horns
        ctx.fillStyle = '#d33b5c';
        ctx.beginPath();
        ctx.moveTo(-16, -bh / 2);
        ctx.lineTo(-22, -bh / 2 - 12);
        ctx.lineTo(-8, -bh / 2 + 2);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(16, -bh / 2);
        ctx.lineTo(22, -bh / 2 - 12);
        ctx.lineTo(8, -bh / 2 + 2);
        ctx.closePath();
        ctx.fill();
        // dark screen
        ctx.fillStyle = '#1a1326';
        roundRect(-bw / 2 + 8, -bh / 2 + 8, bw - 16, bh - 16, 8);
        ctx.fill();
        // hex value
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Consolas, "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hex2(e.value), 0, 1);

        ctx.restore();
    }

    function drawBitRow() {
        // band background (ground / control panel)
        ctx.fillStyle = '#23344a';
        ctx.fillRect(0, bitRowTop, W, BIT_ROW_H);
        ctx.fillStyle = '#3a7d44';
        ctx.fillRect(0, bitRowTop, W, 6);

        for (var i = 0; i < 8; i++) {
            var cx = BIT_MARGIN + i * (cellW + BIT_GAP);
            var on = bits[i] === 1;

            // cell body
            ctx.fillStyle = on ? '#1f6feb' : '#101826';
            roundRect(cx, cellY, cellW, cellH, 8);
            ctx.fill();

            // border / glow when flashed
            ctx.lineWidth = 2;
            if (flashCell === i) ctx.strokeStyle = '#ffd23f';
            else ctx.strokeStyle = on ? '#5a9fd4' : '#2c3e50';
            roundRect(cx, cellY, cellW, cellH, 8);
            ctx.stroke();

            // bit digit
            ctx.fillStyle = on ? '#ffffff' : '#5b6b7d';
            ctx.font = 'bold 28px Consolas, "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(on ? '1' : '0', cx + cellW / 2, cellY + cellH / 2 - (showHints ? 6 : 0));

            // place value hint
            if (showHints) {
                ctx.fillStyle = on ? '#bfe0ff' : '#3f4f61';
                ctx.font = '10px Consolas, "Courier New", monospace';
                ctx.fillText(String(PLACE_VALUES[i]), cx + cellW / 2, cellY + cellH - 12);
            }
        }
    }

    function drawFooter() {
        var fy = H - FOOTER_H;
        ctx.fillStyle = '#5a3d28';
        ctx.fillRect(0, fy, W, FOOTER_H);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(0, fy, W, 4);

        // lives as hearts
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 22px Consolas, "Courier New", monospace';
        var hx = 16;
        for (var i = 0; i < 3; i++) {
            ctx.fillStyle = i < lives ? '#ff5d5d' : '#3a2a1c';
            drawHeart(hx + i * 30, fy + FOOTER_H / 2, 10);
        }

        // current byte readout
        var v = bitsToValue();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd23f';
        ctx.font = 'bold 20px Consolas, "Courier New", monospace';
        ctx.fillText('0x' + hex2(v), W / 2, fy + FOOTER_H / 2 - 8);
        ctx.fillStyle = '#cdb38c';
        ctx.font = '12px Consolas, "Courier New", monospace';
        ctx.fillText('= ' + v, W / 2, fy + FOOTER_H / 2 + 14);

        // build target hint (smallest active enemy)
        ctx.textAlign = 'right';
        ctx.fillStyle = '#e8d9c0';
        ctx.font = '12px Consolas, "Courier New", monospace';
        ctx.fillText('keys 1-8', W - 16, fy + FOOTER_H / 2);
    }

    function drawParticles() {
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1;
    }

    function drawOverlay() {
        if (running) return;
        ctx.fillStyle = 'rgba(5, 12, 22, 0.72)';
        ctx.fillRect(0, HUD_H, W, bitRowTop - HUD_H);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd23f';
        ctx.font = 'bold 34px Consolas, "Courier New", monospace';
        var cy = (HUD_H + bitRowTop) / 2;

        if (gameOver) {
            ctx.fillText('GAME OVER', W / 2, cy - 40);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px Consolas, "Courier New", monospace';
            ctx.fillText('Score ' + score + '   High ' + highScore, W / 2, cy);
        } else {
            ctx.fillText('HEX INVADERS', W / 2, cy - 40);
            ctx.fillStyle = '#cfe6ff';
            ctx.font = '15px Consolas, "Courier New", monospace';
            ctx.fillText('Match the falling byte in binary', W / 2, cy - 6);
        }
        ctx.fillStyle = '#9fd3ff';
        ctx.font = '14px Consolas, "Courier New", monospace';
        ctx.fillText('Press SPACE or tap to start', W / 2, cy + 36);
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        drawBackground();
        for (var i = 0; i < enemies.length; i++) drawEnemy(enemies[i]);
        drawParticles();
        drawBitRow();
        drawFooter();
        drawHud();
        drawOverlay();

        if (hitFlash > 0) {
            ctx.fillStyle = 'rgba(255, 40, 40,' + (hitFlash * 0.4).toFixed(2) + ')';
            ctx.fillRect(0, 0, W, H);
        }
    }

    // ---- canvas primitives ----
    function roundRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function drawHeart(cx, cy, s) {
        ctx.beginPath();
        ctx.moveTo(cx, cy + s * 0.6);
        ctx.bezierCurveTo(cx + s, cy - s * 0.4, cx + s * 0.5, cy - s, cx, cy - s * 0.3);
        ctx.bezierCurveTo(cx - s * 0.5, cy - s, cx - s, cy - s * 0.4, cx, cy + s * 0.6);
        ctx.closePath();
        ctx.fill();
    }

    // ---- main loop ----
    function frame(ts) {
        if (!lastTs) lastTs = ts;
        var dt = Math.min(0.05, (ts - lastTs) / 1000);
        lastTs = ts;
        update(dt);
        draw();
        requestAnimationFrame(frame);
    }

    draw();
    requestAnimationFrame(frame);
})();
