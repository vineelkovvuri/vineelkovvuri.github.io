(function () {
    "use strict";

    // ---- Country data: ISO 3166-1 alpha-2 code -> display name ----
    // Flags are derived entirely from the two-letter code (no stored images).
    var COUNTRIES = [
        { c: "AF", n: "Afghanistan" }, { c: "AL", n: "Albania" }, { c: "DZ", n: "Algeria" },
        { c: "AD", n: "Andorra" }, { c: "AO", n: "Angola" }, { c: "AG", n: "Antigua & Barbuda" },
        { c: "AR", n: "Argentina" }, { c: "AM", n: "Armenia" }, { c: "AU", n: "Australia" },
        { c: "AT", n: "Austria" }, { c: "AZ", n: "Azerbaijan" }, { c: "BS", n: "Bahamas" },
        { c: "BH", n: "Bahrain" }, { c: "BD", n: "Bangladesh" }, { c: "BB", n: "Barbados" },
        { c: "BY", n: "Belarus" }, { c: "BE", n: "Belgium" }, { c: "BZ", n: "Belize" },
        { c: "BJ", n: "Benin" }, { c: "BT", n: "Bhutan" }, { c: "BO", n: "Bolivia" },
        { c: "BA", n: "Bosnia & Herzegovina" }, { c: "BW", n: "Botswana" }, { c: "BR", n: "Brazil" },
        { c: "BN", n: "Brunei" }, { c: "BG", n: "Bulgaria" }, { c: "BF", n: "Burkina Faso" },
        { c: "BI", n: "Burundi" }, { c: "KH", n: "Cambodia" }, { c: "CM", n: "Cameroon" },
        { c: "CA", n: "Canada" }, { c: "CV", n: "Cape Verde" }, { c: "CF", n: "Central African Republic" },
        { c: "TD", n: "Chad" }, { c: "CL", n: "Chile" }, { c: "CN", n: "China" },
        { c: "CO", n: "Colombia" }, { c: "KM", n: "Comoros" }, { c: "CG", n: "Congo" },
        { c: "CD", n: "DR Congo" }, { c: "CR", n: "Costa Rica" }, { c: "CI", n: "Côte d'Ivoire" },
        { c: "HR", n: "Croatia" }, { c: "CU", n: "Cuba" }, { c: "CY", n: "Cyprus" },
        { c: "CZ", n: "Czechia" }, { c: "DK", n: "Denmark" }, { c: "DJ", n: "Djibouti" },
        { c: "DM", n: "Dominica" }, { c: "DO", n: "Dominican Republic" }, { c: "EC", n: "Ecuador" },
        { c: "EG", n: "Egypt" }, { c: "SV", n: "El Salvador" }, { c: "GQ", n: "Equatorial Guinea" },
        { c: "ER", n: "Eritrea" }, { c: "EE", n: "Estonia" }, { c: "SZ", n: "Eswatini" },
        { c: "ET", n: "Ethiopia" }, { c: "FJ", n: "Fiji" }, { c: "FI", n: "Finland" },
        { c: "FR", n: "France" }, { c: "GA", n: "Gabon" }, { c: "GM", n: "Gambia" },
        { c: "GE", n: "Georgia" }, { c: "DE", n: "Germany" }, { c: "GH", n: "Ghana" },
        { c: "GR", n: "Greece" }, { c: "GD", n: "Grenada" }, { c: "GT", n: "Guatemala" },
        { c: "GN", n: "Guinea" }, { c: "GW", n: "Guinea-Bissau" }, { c: "GY", n: "Guyana" },
        { c: "HT", n: "Haiti" }, { c: "HN", n: "Honduras" }, { c: "HU", n: "Hungary" },
        { c: "IS", n: "Iceland" }, { c: "IN", n: "India" }, { c: "ID", n: "Indonesia" },
        { c: "IR", n: "Iran" }, { c: "IQ", n: "Iraq" }, { c: "IE", n: "Ireland" },
        { c: "IL", n: "Israel" }, { c: "IT", n: "Italy" }, { c: "JM", n: "Jamaica" },
        { c: "JP", n: "Japan" }, { c: "JO", n: "Jordan" }, { c: "KZ", n: "Kazakhstan" },
        { c: "KE", n: "Kenya" }, { c: "KI", n: "Kiribati" }, { c: "KW", n: "Kuwait" },
        { c: "KG", n: "Kyrgyzstan" }, { c: "LA", n: "Laos" }, { c: "LV", n: "Latvia" },
        { c: "LB", n: "Lebanon" }, { c: "LS", n: "Lesotho" }, { c: "LR", n: "Liberia" },
        { c: "LY", n: "Libya" }, { c: "LI", n: "Liechtenstein" }, { c: "LT", n: "Lithuania" },
        { c: "LU", n: "Luxembourg" }, { c: "MG", n: "Madagascar" }, { c: "MW", n: "Malawi" },
        { c: "MY", n: "Malaysia" }, { c: "MV", n: "Maldives" }, { c: "ML", n: "Mali" },
        { c: "MT", n: "Malta" }, { c: "MH", n: "Marshall Islands" }, { c: "MR", n: "Mauritania" },
        { c: "MU", n: "Mauritius" }, { c: "MX", n: "Mexico" }, { c: "FM", n: "Micronesia" },
        { c: "MD", n: "Moldova" }, { c: "MC", n: "Monaco" }, { c: "MN", n: "Mongolia" },
        { c: "ME", n: "Montenegro" }, { c: "MA", n: "Morocco" }, { c: "MZ", n: "Mozambique" },
        { c: "MM", n: "Myanmar" }, { c: "NA", n: "Namibia" }, { c: "NR", n: "Nauru" },
        { c: "NP", n: "Nepal" }, { c: "NL", n: "Netherlands" }, { c: "NZ", n: "New Zealand" },
        { c: "NI", n: "Nicaragua" }, { c: "NE", n: "Niger" }, { c: "NG", n: "Nigeria" },
        { c: "KP", n: "North Korea" }, { c: "MK", n: "North Macedonia" }, { c: "NO", n: "Norway" },
        { c: "OM", n: "Oman" }, { c: "PK", n: "Pakistan" }, { c: "PW", n: "Palau" },
        { c: "PA", n: "Panama" }, { c: "PG", n: "Papua New Guinea" }, { c: "PY", n: "Paraguay" },
        { c: "PE", n: "Peru" }, { c: "PH", n: "Philippines" }, { c: "PL", n: "Poland" },
        { c: "PT", n: "Portugal" }, { c: "QA", n: "Qatar" }, { c: "RO", n: "Romania" },
        { c: "RU", n: "Russia" }, { c: "RW", n: "Rwanda" }, { c: "KN", n: "St. Kitts & Nevis" },
        { c: "LC", n: "St. Lucia" }, { c: "VC", n: "St. Vincent & Grenadines" }, { c: "WS", n: "Samoa" },
        { c: "SM", n: "San Marino" }, { c: "ST", n: "São Tomé & Príncipe" }, { c: "SA", n: "Saudi Arabia" },
        { c: "SN", n: "Senegal" }, { c: "RS", n: "Serbia" }, { c: "SC", n: "Seychelles" },
        { c: "SL", n: "Sierra Leone" }, { c: "SG", n: "Singapore" }, { c: "SK", n: "Slovakia" },
        { c: "SI", n: "Slovenia" }, { c: "SB", n: "Solomon Islands" }, { c: "SO", n: "Somalia" },
        { c: "ZA", n: "South Africa" }, { c: "KR", n: "South Korea" }, { c: "SS", n: "South Sudan" },
        { c: "ES", n: "Spain" }, { c: "LK", n: "Sri Lanka" }, { c: "SD", n: "Sudan" },
        { c: "SR", n: "Suriname" }, { c: "SE", n: "Sweden" }, { c: "CH", n: "Switzerland" },
        { c: "SY", n: "Syria" }, { c: "TW", n: "Taiwan" }, { c: "TJ", n: "Tajikistan" },
        { c: "TZ", n: "Tanzania" }, { c: "TH", n: "Thailand" }, { c: "TL", n: "Timor-Leste" },
        { c: "TG", n: "Togo" }, { c: "TO", n: "Tonga" }, { c: "TT", n: "Trinidad & Tobago" },
        { c: "TN", n: "Tunisia" }, { c: "TR", n: "Turkey" }, { c: "TM", n: "Turkmenistan" },
        { c: "TV", n: "Tuvalu" }, { c: "UG", n: "Uganda" }, { c: "UA", n: "Ukraine" },
        { c: "AE", n: "United Arab Emirates" }, { c: "GB", n: "United Kingdom" }, { c: "US", n: "United States" },
        { c: "UY", n: "Uruguay" }, { c: "UZ", n: "Uzbekistan" }, { c: "VU", n: "Vanuatu" },
        { c: "VE", n: "Venezuela" }, { c: "VN", n: "Vietnam" }, { c: "YE", n: "Yemen" },
        { c: "ZM", n: "Zambia" }, { c: "ZW", n: "Zimbabwe" }
    ];

    var ROUND_SIZE = 20;      // flags per round
    var TIME_LIMIT = 10;      // seconds per flag
    // Rectangular (straight-corner) SVG flags, derived purely from the ISO code.
    var FLAG_BASE = "https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/";

    // ---- Flag rendering helpers (derive everything from the ISO code) ----

    // "US" -> "🇺🇸" (regional indicator symbols) — used only as an offline fallback
    function isoToEmoji(code) {
        return code.toUpperCase().replace(/./g, function (ch) {
            return String.fromCodePoint(0x1F1E6 + ch.charCodeAt(0) - 65);
        });
    }

    // ---- DOM references ----
    var el = {
        score: document.getElementById("flgScore"),
        total: document.getElementById("flgTotal"),
        streak: document.getElementById("flgStreak"),
        progress: document.getElementById("flgProgress"),
        timer: document.getElementById("flgTimer"),
        count: document.getElementById("flgCount"),
        clock: document.getElementById("flgClock"),
        flag: document.getElementById("flgFlag"),
        flagEmoji: document.getElementById("flgFlagEmoji"),
        options: document.getElementById("flgOptions"),
        overlay: document.getElementById("flgOverlay"),
        overTitle: document.getElementById("flgOverTitle"),
        overText: document.getElementById("flgOverText"),
        start: document.getElementById("flgStart")
    };

    // ---- Game state ----
    var deck = [];        // this round's questions
    var qIndex = 0;
    var score = 0;
    var streak = 0;
    var bestStreak = 0;   // best streak reached this round
    var locked = false;   // true while showing answer feedback
    var timerId = null;
    var timeLeft = 0;

    function shuffle(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    function buildDeck() {
        var picks = shuffle(COUNTRIES).slice(0, ROUND_SIZE);
        return picks.map(function (answer) {
            // three distractors different from the answer
            var others = shuffle(COUNTRIES.filter(function (x) { return x.c !== answer.c; })).slice(0, 3);
            var options = shuffle([answer].concat(others));
            return { answer: answer, options: options };
        });
    }

    function renderFlag(country) {
        el.flag.classList.add("flg-hidden");
        el.flagEmoji.classList.add("flg-hidden");
        // Fallback to the raw emoji if the SVG cannot be loaded (offline, blocked CDN).
        el.flag.onerror = function () {
            el.flag.classList.add("flg-hidden");
            el.flagEmoji.textContent = isoToEmoji(country.c);
            el.flagEmoji.classList.remove("flg-hidden");
        };
        el.flag.onload = function () {
            el.flagEmoji.classList.add("flg-hidden");
            el.flag.classList.remove("flg-hidden");
        };
        el.flag.alt = "Flag of the mystery country";
        el.flag.src = FLAG_BASE + country.c.toLowerCase() + ".svg";
    }

    function stopTimer() {
        if (timerId) { clearInterval(timerId); timerId = null; }
    }

    function startTimer() {
        timeLeft = TIME_LIMIT;
        updateTimerUI();
        stopTimer();
        var startedAt = Date.now();
        timerId = setInterval(function () {
            var elapsed = (Date.now() - startedAt) / 1000;
            timeLeft = Math.max(0, TIME_LIMIT - elapsed);
            updateTimerUI();
            if (timeLeft <= 0) {
                stopTimer();
                timeout();
            }
        }, 100);
    }

    function updateTimerUI() {
        el.clock.textContent = Math.ceil(timeLeft) + " s";
        el.timer.style.width = (timeLeft / TIME_LIMIT * 100) + "%";
    }

    function renderQuestion() {
        locked = false;
        var q = deck[qIndex];
        el.count.textContent = (qIndex + 1) + " / " + ROUND_SIZE;
        el.progress.style.width = (qIndex / ROUND_SIZE * 100) + "%";
        renderFlag(q.answer);

        el.options.innerHTML = "";
        q.options.forEach(function (opt) {
            var btn = document.createElement("button");
            btn.className = "flg-opt";
            btn.textContent = opt.n;
            btn.dataset.code = opt.c;
            btn.addEventListener("click", function () { choose(opt, btn); });
            el.options.appendChild(btn);
        });

        startTimer();
    }

    function revealAnswer(chosenBtn, isCorrect) {
        var answer = deck[qIndex].answer;
        var buttons = el.options.querySelectorAll(".flg-opt");
        buttons.forEach(function (b) {
            b.disabled = true;
            if (b.dataset.code === answer.c) { b.classList.add("correct"); }
        });
        if (chosenBtn && !isCorrect) { chosenBtn.classList.add("wrong"); }
    }

    function choose(opt, btn) {
        if (locked) { return; }
        locked = true;
        stopTimer();
        var isCorrect = opt.c === deck[qIndex].answer.c;
        if (isCorrect) {
            score++;
            streak++;
            if (streak > bestStreak) { bestStreak = streak; }
        } else {
            streak = 0;
        }
        updateStats();
        revealAnswer(btn, isCorrect);
        setTimeout(next, 1100);
    }

    function timeout() {
        if (locked) { return; }
        locked = true;
        streak = 0;
        updateStats();
        revealAnswer(null, false);
        setTimeout(next, 1400);
    }

    function next() {
        qIndex++;
        if (qIndex >= deck.length) {
            finish();
        } else {
            renderQuestion();
        }
    }

    function updateStats() {
        el.score.textContent = score;
        el.streak.textContent = streak;
    }

    function finish() {
        stopTimer();
        el.progress.style.width = "100%";

        var pct = score / ROUND_SIZE;
        var missed = ROUND_SIZE - score;
        var accuracy = Math.round(pct * 100);

        // Medal, title and encouragement scale with performance
        var medal, title, cheer;
        if (score === ROUND_SIZE) { medal = "🏆"; title = "PERFECT!"; cheer = "Wow! You got every single flag! You're a true flag champion! 🎉"; }
        else if (pct >= 0.85) { medal = "🥇"; title = "AMAZING!"; cheer = "Superstar geography skills! So close to perfect! 🌟"; }
        else if (pct >= 0.65) { medal = "🥈"; title = "GREAT JOB!"; cheer = "You really know your flags! Keep it up! 🌍"; }
        else if (pct >= 0.4) { medal = "🥉"; title = "WELL DONE!"; cheer = "Nice work! Play again to catch even more flags! 🚩"; }
        else { medal = "🌱"; title = "GOOD TRY!"; cheer = "Every expert started here. Give it another go! 💪"; }

        // Up to 5 stars
        var stars = Math.round(pct * 5);
        var starRow = "";
        for (var i = 0; i < 5; i++) { starRow += (i < stars ? "⭐" : "☆"); }

        el.overTitle.innerHTML = '<span class="flg-medal">' + medal + '</span><br>' + title;
        el.overTitle.classList.remove("flg-hidden");
        el.overText.innerHTML =
            '<div class="flg-stars">' + starRow + '</div>' +
            '<div class="flg-scoreboard">' +
                '<div class="flg-score-row"><span>🎯 Correct</span><b>' + score + ' / ' + ROUND_SIZE + '</b></div>' +
                '<div class="flg-score-row"><span>❌ Missed</span><b>' + missed + '</b></div>' +
                '<div class="flg-score-row"><span>🔥 Best streak</span><b>' + bestStreak + '</b></div>' +
                '<div class="flg-score-row"><span>📊 Accuracy</span><b>' + accuracy + '%</b></div>' +
            '</div>' +
            '<div class="flg-cheer">' + cheer + '</div>';
        el.start.textContent = "PLAY AGAIN";
        el.overlay.classList.remove("flg-hidden");

        // Celebrate! bigger score => more confetti
        launchConfetti(20 + Math.round(pct * 80));
    }

    // ---- Confetti celebration ----
    function launchConfetti(count) {
        var colors = ["#f5a623", "#2bb3d6", "#6ab04c", "#e74c3c", "#5a9fd4", "#9b59b6"];
        var layer = document.createElement("div");
        layer.className = "flg-confetti";
        el.overlay.appendChild(layer);
        for (var i = 0; i < count; i++) {
            var piece = document.createElement("span");
            piece.className = "flg-confetti-piece";
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
        deck = buildDeck();
        qIndex = 0;
        score = 0;
        streak = 0;
        bestStreak = 0;
        el.total.textContent = ROUND_SIZE;
        updateStats();
        el.overlay.classList.add("flg-hidden");
        renderQuestion();
    }

    el.start.addEventListener("click", startGame);

    // Keyboard 1-4 to answer
    document.addEventListener("keydown", function (e) {
        if (locked || el.overlay && !el.overlay.classList.contains("flg-hidden")) { return; }
        var idx = ["1", "2", "3", "4"].indexOf(e.key);
        if (idx === -1) { return; }
        var buttons = el.options.querySelectorAll(".flg-opt");
        if (buttons[idx]) { buttons[idx].click(); }
    });
})();
