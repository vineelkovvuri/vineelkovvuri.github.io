(function () {
    "use strict";

    var STORAGE_KEY = "typingTutorBest_v1";

    var LEVELS = {
        beginner: { name: "Beginner", targetWpm: 20, multiplier: 1.0 },
        intermediate: { name: "Intermediate", targetWpm: 35, multiplier: 1.2 },
        advanced: { name: "Advanced", targetWpm: 50, multiplier: 1.45 },
        expert: { name: "Expert", targetWpm: 65, multiplier: 1.75 }
    };

    var LESSONS = [
        {
            id: "home-row",
            title: "Home Row Focus",
            focus: "Rhythm on asdf jkl;",
            text: "asdf jkl; asdf jkl; keep your fingers light and return to home row after every key stroke."
        },
        {
            id: "top-row",
            title: "Top Row Reach",
            focus: "qwerty uiop",
            text: "quick typists use smooth reaches to the top row, then glide back to center without looking down."
        },
        {
            id: "bottom-row",
            title: "Bottom Row Control",
            focus: "zxcvbn m,./",
            text: "zip, zap, zoom. practice short bursts on the bottom row while keeping wrists relaxed and steady."
        },
        {
            id: "numbers",
            title: "Numbers and Punctuation",
            focus: "12345 and symbols",
            text: "in 2026, typing 12345 quickly is useful, but accuracy on commas, periods, and colons matters just as much."
        },
        {
            id: "coding",
            title: "Coding Snippet",
            focus: "common developer words",
            text: "function updateScore(value) { return value >= 0 ? value + 1 : 0; }"
        },
        {
            id: "sentence-flow",
            title: "Sentence Flow",
            focus: "longer natural paragraph",
            text: "steady speed wins over frantic tapping. breathe, keep your eyes ahead of the cursor, and type one clean word at a time."
        },
        {
            id: "focus-mode",
            title: "Focus Mode",
            focus: "concentration and consistency",
            text: "the fastest typists are not always the loudest. they are calm, precise, and consistent from start to finish."
        },
        {
            id: "advanced-mix",
            title: "Advanced Mixed Drill",
            focus: "mixed letters, numbers, symbols",
            text: "debug log: user_id=42; status=ok; retries=0. keep pace, avoid slips, and finish strong."
        }
    ];

    var els = {
        lesson: document.getElementById("ttLesson"),
        lessonMeta: document.getElementById("ttLessonMeta"),
        levelsWrap: document.getElementById("ttLevels"),
        startBtn: document.getElementById("ttStart"),
        resetBtn: document.getElementById("ttReset"),
        text: document.getElementById("ttText"),
        input: document.getElementById("ttInput"),
        bar: document.getElementById("ttBar"),
        wpm: document.getElementById("ttWpm"),
        acc: document.getElementById("ttAcc"),
        err: document.getElementById("ttErr"),
        time: document.getElementById("ttTime"),
        result: document.getElementById("ttResult"),
        best: document.getElementById("ttBestBadge")
    };

    var selectedLessonId = LESSONS[0].id;
    var selectedLevel = "beginner";
    var running = false;
    var startTs = 0;
    var tick = null;
    var currentText = "";
    var bestScores = loadBestScores();

    function loadBestScores() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) { return {}; }
            var parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch (e) {
            return {};
        }
    }

    function saveBestScores() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(bestScores));
        } catch (e) {
            // Ignore localStorage failures.
        }
    }

    function getLessonById(id) {
        for (var i = 0; i < LESSONS.length; i++) {
            if (LESSONS[i].id === id) { return LESSONS[i]; }
        }
        return LESSONS[0];
    }

    function keyFor(lessonId, levelId) {
        return lessonId + "::" + levelId;
    }

    function formatPercent(value) {
        return value.toFixed(1) + "%";
    }

    function formatSeconds(value) {
        return value.toFixed(1) + "s";
    }

    function lessonWordCount(text) {
        var words = text.trim().split(/\s+/).filter(Boolean);
        return words.length;
    }

    function populateLessons() {
        var html = "";
        for (var i = 0; i < LESSONS.length; i++) {
            var lesson = LESSONS[i];
            html += '<option value="' + lesson.id + '">' + lesson.title + "</option>";
        }
        els.lesson.innerHTML = html;
        els.lesson.value = selectedLessonId;
        updateLessonMeta();
    }

    function updateLessonMeta() {
        var lesson = getLessonById(selectedLessonId);
        var words = lessonWordCount(lesson.text);
        var chars = lesson.text.length;
        els.lessonMeta.innerHTML =
            "Focus: <b>" + lesson.focus + "</b><br>" +
            words + " words · " + chars + " chars";
        renderPrompt("");
        updateBestBadge();
    }

    function updateBestBadge() {
        var k = keyFor(selectedLessonId, selectedLevel);
        var best = bestScores[k];
        if (!best) {
            els.best.textContent = "Best: --";
            return;
        }
        els.best.textContent =
            "Best: " + best.netWpm.toFixed(1) + " WPM / " + best.accuracy.toFixed(1) + "%";
    }

    function setActiveLevel(levelId) {
        selectedLevel = levelId;
        var buttons = els.levelsWrap.querySelectorAll(".tt-level");
        for (var i = 0; i < buttons.length; i++) {
            var btn = buttons[i];
            btn.classList.toggle("active", btn.dataset.level === levelId);
        }
        updateBestBadge();
    }

    function renderPrompt(typed) {
        var lesson = getLessonById(selectedLessonId);
        currentText = lesson.text;

        var frag = document.createDocumentFragment();
        for (var i = 0; i < currentText.length; i++) {
            var span = document.createElement("span");
            span.className = "tt-char";
            span.textContent = currentText.charAt(i);

            if (i < typed.length) {
                if (typed.charAt(i) === currentText.charAt(i)) {
                    span.classList.add("ok");
                } else {
                    span.classList.add("bad");
                }
            } else if (running && i === typed.length) {
                span.classList.add("current");
            }

            frag.appendChild(span);
        }

        els.text.innerHTML = "";
        els.text.appendChild(frag);
    }

    function clearTick() {
        if (tick) {
            clearInterval(tick);
            tick = null;
        }
    }

    function resetStats() {
        els.wpm.textContent = "0";
        els.acc.textContent = "100%";
        els.err.textContent = "0";
        els.time.textContent = "0.0s";
        els.bar.style.width = "0%";
    }

    function startLesson() {
        clearTick();
        running = true;
        startTs = Date.now();

        els.result.classList.add("tt-hidden");
        els.result.textContent = "";

        els.input.disabled = false;
        els.input.value = "";
        els.input.setAttribute("maxlength", String(getLessonById(selectedLessonId).text.length));
        els.input.focus();

        resetStats();
        renderPrompt("");

        tick = setInterval(function () {
            if (!running) { return; }
            updateLiveMetrics();
        }, 80);
    }

    function resetLesson() {
        clearTick();
        running = false;
        els.input.disabled = true;
        els.input.value = "";
        renderPrompt("");
        resetStats();
        els.result.classList.add("tt-hidden");
        els.result.textContent = "";
    }

    function calculateStats(typedValue) {
        var correct = 0;
        var wrong = 0;
        var len = typedValue.length;

        for (var i = 0; i < len; i++) {
            if (typedValue.charAt(i) === currentText.charAt(i)) {
                correct++;
            } else {
                wrong++;
            }
        }

        var elapsedSec = Math.max((Date.now() - startTs) / 1000, 0.001);
        var elapsedMin = elapsedSec / 60;
        var grossWpm = (len / 5) / elapsedMin;
        var netWpm = Math.max(((correct / 5) / elapsedMin) - (wrong / elapsedMin), 0);
        var accuracy = len > 0 ? (correct / len) * 100 : 100;
        var progress = Math.min((len / currentText.length) * 100, 100);

        return {
            correct: correct,
            wrong: wrong,
            elapsedSec: elapsedSec,
            grossWpm: grossWpm,
            netWpm: netWpm,
            accuracy: accuracy,
            progress: progress
        };
    }

    function updateLiveMetrics() {
        if (!running) { return; }

        var typed = els.input.value;
        var stats = calculateStats(typed);

        els.wpm.textContent = stats.netWpm.toFixed(1);
        els.acc.textContent = formatPercent(stats.accuracy);
        els.err.textContent = String(stats.wrong);
        els.time.textContent = formatSeconds(stats.elapsedSec);
        els.bar.style.width = stats.progress.toFixed(2) + "%";

        renderPrompt(typed);

        if (typed.length >= currentText.length) {
            finishLesson(stats);
        }
    }

    function finishLesson(stats) {
        running = false;
        clearTick();
        els.input.disabled = true;

        var levelCfg = LEVELS[selectedLevel] || LEVELS.beginner;
        var speedBonus = Math.max(stats.netWpm - levelCfg.targetWpm, 0) * 6;
        var accuracyBonus = stats.accuracy * 3;
        var score = Math.round((speedBonus + accuracyBonus) * levelCfg.multiplier);

        var k = keyFor(selectedLessonId, selectedLevel);
        var prev = bestScores[k];
        var isNewBest = !prev || score > prev.score;
        if (isNewBest) {
            bestScores[k] = {
                score: score,
                netWpm: stats.netWpm,
                accuracy: stats.accuracy,
                time: stats.elapsedSec
            };
            saveBestScores();
        }
        updateBestBadge();

        var rank;
        if (stats.netWpm >= levelCfg.targetWpm + 12 && stats.accuracy >= 96) {
            rank = "Master";
        } else if (stats.netWpm >= levelCfg.targetWpm && stats.accuracy >= 92) {
            rank = "Pro";
        } else if (stats.netWpm >= levelCfg.targetWpm * 0.75) {
            rank = "Rising";
        } else {
            rank = "Warm-Up";
        }

        var lesson = getLessonById(selectedLessonId);
        els.result.innerHTML =
            "Lesson complete: <b>" + lesson.title + "</b> (<b>" + levelCfg.name + "</b>)<br>" +
            "Net WPM: <b>" + stats.netWpm.toFixed(1) + "</b> · Accuracy: <b>" + stats.accuracy.toFixed(1) + "%</b> · Score: <b>" + score + "</b><br>" +
            "Rank: <b>" + rank + "</b>" + (isNewBest ? " · <b>New personal best!</b>" : "");
        els.result.classList.remove("tt-hidden");
    }

    function bindEvents() {
        els.lesson.addEventListener("change", function () {
            selectedLessonId = els.lesson.value;
            resetLesson();
            updateLessonMeta();
        });

        els.levelsWrap.addEventListener("click", function (e) {
            var btn = e.target.closest(".tt-level");
            if (!btn) { return; }
            setActiveLevel(btn.dataset.level);
            resetLesson();
        });

        els.startBtn.addEventListener("click", function () {
            startLesson();
        });

        els.resetBtn.addEventListener("click", function () {
            resetLesson();
        });

        els.input.addEventListener("input", function () {
            if (!running) { return; }
            updateLiveMetrics();
        });
    }

    function init() {
        populateLessons();
        setActiveLevel(selectedLevel);
        resetLesson();
        bindEvents();
    }

    init();
})();
