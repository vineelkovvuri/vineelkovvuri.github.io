/*
 * Family Calendar — weekly schedule stored as plain JSON in your own OneDrive.
 *
 * Auth:   MSAL.js (Microsoft login) -> Microsoft Graph.
 * Storage: a JSON file in the app folder:
 *          /Apps/<AppName>/schedule.json
 * Access is gated by your Microsoft sign-in — only you can read the file.
 *
 * ------------------------------------------------------------------
 *  ONE-TIME MICROSOFT / AZURE SETUP (free, no client secret needed)
 * ------------------------------------------------------------------
 *  1. Go to https://entra.microsoft.com -> Applications ->
 *     App registrations -> New registration.
 *  2. Name: "Family Calendar"
 *     (this becomes the OneDrive folder /Apps/Family Calendar/).
 *  3. Supported account types: "Accounts in any organizational
 *     directory and personal Microsoft accounts" (personal OneDrive).
 *  4. Redirect URI: platform = "Single-page application (SPA)", value:
 *       https://vineelkovvuri.github.io/tools/family-calendar/
 *     then click Register.
 *  5. Authentication page -> add a second SPA redirect URI for local
 *     testing (Hugo dev server, e.g. `hugo serve --port 55555`):
 *       http://localhost:55555/tools/family-calendar/
 *     Both must be under the "Single-page application" platform.
 *     (The tool derives its own redirectUri from window.location, so
 *     just make sure the port here matches the one you serve on.)
 *  6. API permissions -> Add a permission -> Microsoft Graph ->
 *     Delegated permissions -> add "Files.ReadWrite.AppFolder".
 *     (No admin consent needed; you consent at first sign-in.)
 *  7. Overview page -> copy the "Application (client) ID".
 *  8. Paste it into CLIENT_ID below, rebuild (hugo) and commit.
 *
 *  Notes:
 *   - No client secret is required (SPA uses PKCE); the client ID is
 *     safe to commit publicly.
 *   - "Files.ReadWrite.AppFolder" scopes the app to its own folder
 *     only, not your whole drive.
 *   - First sign-in shows a Microsoft consent screen; approve once.
 * ------------------------------------------------------------------
 */
(function () {
    "use strict";

    // ==========================================================
    //  CONFIG — replace with your own Azure app registration ID
    // ==========================================================
    var CLIENT_ID = "01e74af9-5995-4829-bf9a-14d2dd794f6e";

    var GRAPH_SCOPES = ["Files.ReadWrite.AppFolder"];
    var FILE_NAME = "schedule.json";
    // App-folder content endpoint (auto-created folder scoped to this app).
    var FILE_URL =
        "https://graph.microsoft.com/v1.0/me/drive/special/approot:/" +
        FILE_NAME + ":/content";

    var DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    var KID_COLORS = ["#5a9fd4", "#e07a5f", "#81b29a", "#c589e8",
                      "#f2a541", "#4d908e", "#e56399", "#8ac926"];

    // ==========================================================
    //  State
    // ==========================================================
    var msalApp = null;
    var account = null;
    var data = null;           // schedule object
    var hiddenKids = {};       // map of kid name -> true when filtered out of the view
    var fileExists = false;    // whether schedule.json already exists
    var dirty = false;         // unsaved changes
    var editingId = null;      // id of entry being edited, or null
    var remindersOn = false;   // whether 15-min reminders are enabled
    var notified = {};         // keys of reminders already fired (entryId|YYYY-MM-DD)
    var audioCtx = null;       // lazily created AudioContext for the beep

    // ==========================================================
    //  DOM
    // ==========================================================
    var $ = function (id) { return document.getElementById(id); };
    var el = {
        signIn: $("fcSignIn"), signOut: $("fcSignOut"), reload: $("fcReload"),
        account: $("fcAccount"), status: $("fcStatus"),
        app: $("fcApp"), addBtn: $("fcAddBtn"), manageKids: $("fcManageKids"),
        remindBtn: $("fcRemindBtn"),
        saveBtn: $("fcSaveBtn"), exportBtn: $("fcExportBtn"),
        importBtn: $("fcImportBtn"), importFile: $("fcImportFile"),
        legend: $("fcLegend"), week: $("fcWeek"),
        form: $("fcForm"), formTitle: $("fcFormTitle"),
        kid: $("fcKid"), day: $("fcDay"), start: $("fcStart"), end: $("fcEnd"),
        title: $("fcTitle"), location: $("fcLocation"), notes: $("fcNotes"),
        formSave: $("fcFormSave"), formCancel: $("fcFormCancel"),
        kidsPanel: $("fcKidsPanel"), kidsList: $("fcKidsList"),
        newKid: $("fcNewKid"), addKid: $("fcAddKid"), kidsDone: $("fcKidsDone")
    };

    function setStatus(msg, kind) {
        el.status.textContent = msg || "";
        el.status.className = "fc-status" + (kind ? " " + kind : "");
    }

    // ==========================================================
    //  MSAL / Graph
    // ==========================================================
    function initMsal() {
        if (typeof msal === "undefined" || !msal.PublicClientApplication) {
            setStatus("Could not load the Microsoft sign-in library (check your network / ad-blocker and reload).", "error");
            el.signIn.disabled = true;
            return false;
        }
        if (CLIENT_ID === "PASTE_YOUR_CLIENT_ID_HERE") {
            setStatus("Setup needed: paste your Azure app Client ID into index.js.", "error");
            el.signIn.disabled = true;
            return false;
        }
        msalApp = new msal.PublicClientApplication({
            auth: {
                clientId: CLIENT_ID,
                authority: "https://login.microsoftonline.com/common",
                redirectUri: window.location.origin + window.location.pathname
            },
            cache: { cacheLocation: "sessionStorage" }
        });
        var accts = msalApp.getAllAccounts();
        if (accts.length) { account = accts[0]; onSignedIn(); }
        return true;
    }

    function signIn() {
        if (!msalApp) { setStatus("Sign-in unavailable — the Microsoft library didn't load. Reload the page.", "error"); return; }
        setStatus("Opening Microsoft sign-in…");
        try {
            msalApp.loginPopup({ scopes: GRAPH_SCOPES })
                .then(function (res) {
                    account = res.account;
                    onSignedIn();
                })
                .catch(function (e) { setStatus("Sign-in failed: " + e.message, "error"); });
        } catch (e) {
            setStatus("Sign-in failed: " + e.message, "error");
        }
    }

    function signOut() {
        lockCalendar();
        var acct = account;
        account = null;
        el.account.textContent = "";
        el.signIn.classList.remove("fc-hidden");
        el.signOut.classList.add("fc-hidden");
        el.reload.classList.add("fc-hidden");
        setStatus("");
        if (msalApp && acct) msalApp.logoutPopup({ account: acct }).catch(function () {});
    }

    function getToken() {
        return msalApp.acquireTokenSilent({ scopes: GRAPH_SCOPES, account: account })
            .then(function (r) { return r.accessToken; })
            .catch(function () {
                return msalApp.acquireTokenPopup({ scopes: GRAPH_SCOPES })
                    .then(function (r) { return r.accessToken; });
            });
    }

    function onSignedIn() {
        el.account.textContent = account.username || account.name || "";
        el.signIn.classList.add("fc-hidden");
        el.signOut.classList.remove("fc-hidden");
        el.reload.classList.remove("fc-hidden");
        loadFile();
    }

    // GET the JSON file; 404 => first run (create an empty calendar).
    function loadFile() {
        setStatus("Loading calendar from OneDrive…");
        el.reload.disabled = true;
        getToken().then(function (token) {
            return fetch(FILE_URL, { headers: { Authorization: "Bearer " + token } });
        }).then(function (res) {
            el.reload.disabled = false;
            if (res.status === 404) {
                fileExists = false;
                data = { version: 1, kids: [], entries: [] };
                dirty = false;
                openApp();
                setStatus("No calendar yet — add kids & entries (or Import), then Save.");
                return null;
            }
            if (!res.ok) throw new Error("Graph " + res.status);
            fileExists = true;
            return res.text();
        }).then(function (text) {
            if (text === null) return;
            var obj;
            try { obj = JSON.parse(text); } catch (e) { obj = {}; }
            data = normalize(obj);
            dirty = false;
            openApp();
            setStatus("Calendar loaded ✓", "ok");
        }).catch(function (e) {
            el.reload.disabled = false;
            setStatus("Failed to load: " + e.message, "error");
        });
    }

    function saveFile() {
        if (!data) { setStatus("Sign in before saving.", "error"); return; }
        setStatus("Saving to OneDrive…");
        el.saveBtn.disabled = true;
        getToken().then(function (token) {
            return fetch(FILE_URL, {
                method: "PUT",
                headers: {
                    Authorization: "Bearer " + token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data, null, 2)
            });
        }).then(function (res) {
            if (!res.ok) throw new Error("Graph " + res.status);
            fileExists = true;
            dirty = false;
            el.saveBtn.disabled = true;
            setStatus("Saved to OneDrive ✓", "ok");
        }).catch(function (e) {
            el.saveBtn.disabled = false;
            setStatus("Save failed: " + e.message, "error");
        });
    }

    function exportData() {
        if (!data) { setStatus("Sign in before exporting.", "error"); return; }
        var json = JSON.stringify(data, null, 2);
        var blob = new Blob([json], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var stamp = new Date().toISOString().slice(0, 10);
        var a = document.createElement("a");
        a.href = url;
        a.download = "family-calendar-" + stamp + ".json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setStatus("Exported JSON ↓", "ok");
    }

    function importData(file) {
        if (!data) { setStatus("Sign in before importing.", "error"); return; }
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
            var obj;
            try {
                obj = JSON.parse(reader.result);
            } catch (e) {
                setStatus("Import failed: not valid JSON.", "error");
                return;
            }
            if (!obj || !Array.isArray(obj.entries) || !Array.isArray(obj.kids)) {
                setStatus("Import failed: unrecognized calendar file.", "error");
                return;
            }
            if (!confirm("Replace the current calendar with the imported file? This overwrites everything in view (not yet saved to OneDrive).")) return;
            data = normalize(obj);
            markDirty();
            render();
            setStatus("Imported " + data.entries.length + " ent" + (data.entries.length === 1 ? "ry" : "ries") + " — review, then Save to OneDrive.", "ok");
        };
        reader.onerror = function () { setStatus("Import failed: could not read file.", "error"); };
        reader.readAsText(file);
    }

    // ==========================================================
    //  Data helpers
    // ==========================================================
    function normalize(obj) {
        obj = obj || {};
        obj.version = obj.version || 1;
        obj.kids = Array.isArray(obj.kids) ? obj.kids : [];
        obj.entries = Array.isArray(obj.entries) ? obj.entries : [];
        return obj;
    }

    function lockCalendar() {
        data = null;
        el.app.classList.add("fc-hidden");
    }

    // ==========================================================
    //  App / rendering
    // ==========================================================
    function openApp() {
        el.app.classList.remove("fc-hidden");
        el.saveBtn.disabled = !dirty;
        hideForms();
        render();
        checkReminders();
    }

    function markDirty() {
        dirty = true;
        el.saveBtn.disabled = false;
    }

    function kidColor(name) {
        var i = data.kids.indexOf(name);
        return i >= 0 ? KID_COLORS[i % KID_COLORS.length] : "#5a9fd4";
    }

    function todayKey() {
        // JS: 0=Sun..6=Sat  ->  our Mon-first labels
        var map = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return map[new Date().getDay()];
    }

    // ==========================================================
    //  Reminders (15-min heads-up while the tab is open)
    // ==========================================================
    function updateRemindLabel() {
        el.remindBtn.textContent = "🔔 Reminders: " + (remindersOn ? "On" : "Off");
        el.remindBtn.classList.toggle("primary", remindersOn);
    }

    function toggleReminders() {
        if (remindersOn) {
            remindersOn = false;
            try { localStorage.setItem("fcReminders", "0"); } catch (e) {}
            updateRemindLabel();
            setStatus("Reminders off.");
            return;
        }
        // Turning on — this click is a user gesture, so prime audio + ask permission.
        primeAudio();
        var enable = function () {
            remindersOn = true;
            try { localStorage.setItem("fcReminders", "1"); } catch (e) {}
            updateRemindLabel();
            setStatus("Reminders on — beep & notification 15 min before each activity (while this tab is open).", "ok");
            checkReminders();
        };
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission().then(function () { enable(); });
        } else {
            enable();
        }
    }

    function primeAudio() {
        try {
            if (!audioCtx) {
                var AC = window.AudioContext || window.webkitAudioContext;
                if (AC) audioCtx = new AC();
            }
            if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
        } catch (e) {}
    }

    function beep() {
        primeAudio();
        if (!audioCtx) return;
        var t0 = audioCtx.currentTime;
        [0, 0.25, 0.5].forEach(function (t) {
            var osc = audioCtx.createOscillator();
            var gain = audioCtx.createGain();
            osc.type = "sine";
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.0001, t0 + t);
            gain.gain.exponentialRampToValueAtTime(0.3, t0 + t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + t + 0.2);
            osc.connect(gain).connect(audioCtx.destination);
            osc.start(t0 + t);
            osc.stop(t0 + t + 0.22);
        });
    }

    function fireReminder(e, mins) {
        var when = mins <= 0 ? "now" : "in " + mins + " min";
        var who = e.kid ? e.kid + ": " : "";
        var msg = who + (e.title || "Activity") + " " + when +
                  " (" + fmtTime(e.start) + (e.location ? " · " + e.location : "") + ")";
        beep();
        if ("Notification" in window && Notification.permission === "granted") {
            try { new Notification("⏰ Family Calendar", { body: msg }); } catch (ex) {}
        }
        setStatus("⏰ " + msg, "ok");
    }

    function checkReminders() {
        if (!remindersOn || !data) return;
        var now = new Date();
        var tk = todayKey();
        var stamp = now.toISOString().slice(0, 10);
        data.entries.forEach(function (e) {
            if (e.day !== tk || !e.start) return;
            var parts = e.start.split(":");
            var h = parseInt(parts[0], 10), m = parseInt(parts[1], 10);
            if (isNaN(h) || isNaN(m)) return;
            var start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
            var mins = Math.round((start - now) / 60000);
            var key = e.id + "|" + stamp;
            if (mins >= 0 && mins <= 15 && !notified[key]) {
                notified[key] = true;
                fireReminder(e, mins);
            }
        });
    }

    function initReminders() {
        try { remindersOn = localStorage.getItem("fcReminders") === "1"; } catch (e) { remindersOn = false; }
        updateRemindLabel();
        setInterval(checkReminders, 30000);
    }

    function render() {
        renderLegend();
        renderWeek();
    }

    function renderLegend() {
        el.legend.innerHTML = "";
        if (!data.kids.length) {
            var hint = document.createElement("span");
            hint.className = "fc-chip";
            hint.textContent = "No people yet — use “Manage people” to add some.";
            el.legend.appendChild(hint);
            return;
        }
        data.kids.forEach(function (name) {
            var chip = document.createElement("label");
            chip.className = "fc-chip";
            var box = document.createElement("input");
            box.type = "checkbox";
            box.className = "fc-filter";
            box.checked = !hiddenKids[name];
            box.addEventListener("change", function () {
                if (box.checked) { delete hiddenKids[name]; }
                else { hiddenKids[name] = true; }
                renderWeek();
            });
            chip.appendChild(box);
            var dot = document.createElement("span");
            dot.className = "fc-dot";
            dot.style.background = kidColor(name);
            chip.appendChild(dot);
            chip.appendChild(document.createTextNode(name));
            el.legend.appendChild(chip);
        });
    }

    function renderWeek() {
        el.week.innerHTML = "";
        var tk = todayKey();
        var labels = {
            Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday",
            Fri: "Friday", Sat: "Saturday", Sun: "Sunday"
        };
        DAYS.forEach(function (d) {
            var col = document.createElement("div");
            col.className = "fc-day" + (d === tk ? " today" : "");
            var head = document.createElement("div");
            head.className = "fc-day-head";
            head.textContent = labels[d];
            col.appendChild(head);
            var body = document.createElement("div");
            body.className = "fc-day-body";

            var items = data.entries.filter(function (e) { return e.day === d && !hiddenKids[e.kid]; })
                .sort(function (a, b) { return (a.start || "").localeCompare(b.start || ""); });

            if (!items.length) {
                var empty = document.createElement("div");
                empty.className = "fc-empty";
                empty.textContent = "—";
                body.appendChild(empty);
            } else {
                items.forEach(function (e) { body.appendChild(eventCard(e)); });
            }
            col.appendChild(body);
            el.week.appendChild(col);
        });
    }

    function fmtTime(t) {
        if (!t) return "";
        var parts = t.split(":");
        var h = parseInt(parts[0], 10);
        var m = parts[1] || "00";
        if (isNaN(h)) return t;
        var suffix = h < 12 ? "AM" : "PM";
        var h12 = h % 12;
        if (h12 === 0) h12 = 12;
        return h12 + ":" + m + " " + suffix;
    }

    function eventCard(e) {
        var card = document.createElement("div");
        card.className = "fc-event";
        card.style.borderLeftColor = kidColor(e.kid);

        var time = document.createElement("div");
        time.className = "fc-ev-time";
        time.textContent = fmtTime(e.start) + (e.end ? "–" + fmtTime(e.end) : "");
        card.appendChild(time);

        var title = document.createElement("div");
        title.className = "fc-ev-title";
        title.textContent = (e.kid ? e.kid + ": " : "") + (e.title || "");
        card.appendChild(title);

        if (e.location || e.notes) {
            var meta = document.createElement("div");
            meta.className = "fc-ev-meta";
            meta.textContent = [e.location, e.notes].filter(Boolean).join(" · ");
            card.appendChild(meta);
        }

        var actions = document.createElement("div");
        actions.className = "fc-ev-actions";
        var edit = document.createElement("span");
        edit.className = "fc-ev-link";
        edit.textContent = "Edit";
        edit.onclick = function () { openForm(e); };
        var del = document.createElement("span");
        del.className = "fc-ev-link del";
        del.textContent = "Delete";
        del.onclick = function () { deleteEntry(e.id); };
        actions.appendChild(edit);
        actions.appendChild(del);
        card.appendChild(actions);
        return card;
    }

    // ==========================================================
    //  Entry form
    // ==========================================================
    function hideForms() {
        el.form.classList.add("fc-hidden");
        el.kidsPanel.classList.add("fc-hidden");
    }

    function fillKidSelect() {
        el.kid.innerHTML = "";
        data.kids.forEach(function (name) {
            var o = document.createElement("option");
            o.value = name; o.textContent = name;
            el.kid.appendChild(o);
        });
    }

    function openForm(entry) {
        if (!data.kids.length) {
            setStatus("Add a person first (Manage people).", "error");
            openKids();
            return;
        }
        hideForms();
        fillKidSelect();
        el.form.classList.remove("fc-hidden");
        if (entry) {
            editingId = entry.id;
            el.formTitle.textContent = "Edit entry";
            el.kid.value = entry.kid;
            el.day.value = entry.day;
            el.start.value = entry.start || "";
            el.end.value = entry.end || "";
            el.title.value = entry.title || "";
            el.location.value = entry.location || "";
            el.notes.value = entry.notes || "";
        } else {
            editingId = null;
            el.formTitle.textContent = "Add entry";
            el.kid.selectedIndex = 0;
            el.day.value = todayKey();
            el.start.value = "";
            el.end.value = "";
            el.title.value = "";
            el.location.value = "";
            el.notes.value = "";
        }
        el.title.focus();
    }

    function saveForm() {
        var title = el.title.value.trim();
        if (!title) { setStatus("Enter an activity name.", "error"); return; }
        var rec = {
            kid: el.kid.value,
            day: el.day.value,
            start: el.start.value,
            end: el.end.value,
            title: title,
            location: el.location.value.trim(),
            notes: el.notes.value.trim()
        };
        if (editingId) {
            for (var i = 0; i < data.entries.length; i++) {
                if (data.entries[i].id === editingId) {
                    rec.id = editingId;
                    data.entries[i] = rec;
                    break;
                }
            }
        } else {
            rec.id = newId();
            data.entries.push(rec);
        }
        editingId = null;
        markDirty();
        hideForms();
        render();
        setStatus("Entry saved (remember to Save to OneDrive).", "ok");
    }

    function deleteEntry(id) {
        if (!confirm("Delete this entry?")) return;
        data.entries = data.entries.filter(function (e) { return e.id !== id; });
        markDirty();
        render();
    }

    function newId() {
        if (crypto.randomUUID) return crypto.randomUUID();
        return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
    }

    // ==========================================================
    //  Manage kids
    // ==========================================================
    function openKids() {
        hideForms();
        el.kidsPanel.classList.remove("fc-hidden");
        renderKidsList();
        el.newKid.focus();
    }

    function renderKidsList() {
        el.kidsList.innerHTML = "";
        if (!data.kids.length) {
            var p = document.createElement("div");
            p.className = "fc-empty";
            p.textContent = "No one added yet.";
            el.kidsList.appendChild(p);
            return;
        }
        data.kids.forEach(function (name) {
            var row = document.createElement("div");
            row.className = "fc-chip";
            row.style.justifyContent = "space-between";
            row.style.width = "100%";
            row.style.padding = "6px 0";
            var left = document.createElement("span");
            left.className = "fc-chip";
            var dot = document.createElement("span");
            dot.className = "fc-dot";
            dot.style.background = kidColor(name);
            left.appendChild(dot);
            left.appendChild(document.createTextNode(name));
            var rm = document.createElement("span");
            rm.className = "fc-ev-link del";
            rm.textContent = "Remove";
            rm.onclick = function () { removeKid(name); };
            row.appendChild(left);
            row.appendChild(rm);
            el.kidsList.appendChild(row);
        });
    }

    function addKid() {
        var name = el.newKid.value.trim();
        if (!name) return;
        if (data.kids.indexOf(name) >= 0) {
            setStatus("That name already exists.", "error"); return;
        }
        data.kids.push(name);
        el.newKid.value = "";
        markDirty();
        renderKidsList();
        renderLegend();
    }

    function removeKid(name) {
        var count = data.entries.filter(function (e) { return e.kid === name; }).length;
        var msg = count
            ? "Remove " + name + " and their " + count + " entr" + (count === 1 ? "y" : "ies") + "?"
            : "Remove " + name + "?";
        if (!confirm(msg)) return;
        data.kids = data.kids.filter(function (k) { return k !== name; });
        data.entries = data.entries.filter(function (e) { return e.kid !== name; });
        markDirty();
        renderKidsList();
        render();
    }

    // ==========================================================
    //  Wire up events
    // ==========================================================
    el.signIn.onclick = signIn;
    el.signOut.onclick = signOut;
    el.reload.onclick = loadFile;

    el.addBtn.onclick = function () { openForm(null); };
    el.manageKids.onclick = openKids;
    el.remindBtn.onclick = toggleReminders;
    el.saveBtn.onclick = saveFile;
    el.exportBtn.onclick = exportData;
    el.importBtn.onclick = function () { el.importFile.value = ""; el.importFile.click(); };
    el.importFile.addEventListener("change", function () { importData(el.importFile.files[0]); });

    el.formSave.onclick = saveForm;
    el.formCancel.onclick = function () { editingId = null; hideForms(); };
    el.title.addEventListener("keydown", function (e) { if (e.key === "Enter") saveForm(); });

    el.addKid.onclick = addKid;
    el.newKid.addEventListener("keydown", function (e) { if (e.key === "Enter") addKid(); });
    el.kidsDone.onclick = function () { hideForms(); };

    window.addEventListener("beforeunload", function (e) {
        if (dirty) { e.preventDefault(); e.returnValue = ""; }
    });

    // ==========================================================
    //  Boot
    // ==========================================================
    initReminders();
    initMsal();
})();
