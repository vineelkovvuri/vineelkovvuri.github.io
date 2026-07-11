(function () {
    "use strict";

    // Paper sizes in millimetres (portrait: width x height).
    var PAPER = {
        A2: [420, 594],
        A3: [297, 420],
        A4: [210, 297],
        A5: [148, 210],
        Letter: [215.9, 279.4],
        Legal: [215.9, 355.6]
    };

    var EXPORT_DPI = 300;
    var MM_PER_INCH = 25.4;
    // On-screen scale: pixels per millimetre for the live preview.
    var PREVIEW_PX_PER_MM = 2.4;

    var $ = function (id) { return document.getElementById(id); };

    var canvas = $("gp-canvas");
    var ctx = canvas.getContext("2d");

    var state = {
        paper: "A4",
        customW: 210,
        customH: 297,
        orient: "portrait",
        fit: "contain",
        gridMode: "cell",
        cell: 20,
        cols: 10,
        rows: 14,
        square: true,
        lineColor: "#ff0000",
        lineWidth: 0.8,
        lineOpacity: 0.9,
        labels: false,
        margin: false,
        image: null
    };

    // ---- Geometry helpers ----------------------------------------------

    function paperMM() {
        var dims;
        if (state.paper === "custom") {
            dims = [state.customW, state.customH];
        } else {
            dims = PAPER[state.paper];
        }
        var w = dims[0], h = dims[1];
        if (state.orient === "landscape") {
            return [Math.max(w, h), Math.min(w, h)];
        }
        return [Math.min(w, h), Math.max(w, h)];
    }

    // Returns { cols, rows, cellW (mm), cellH (mm) } for the current grid.
    function gridLayout(wMM, hMM) {
        var cols, rows, cellW, cellH;
        if (state.gridMode === "cell") {
            var c = Math.max(1, state.cell);
            cols = Math.max(1, Math.round(wMM / c));
            rows = Math.max(1, Math.round(hMM / c));
            cellW = wMM / cols;
            cellH = hMM / rows;
        } else {
            cols = Math.max(1, state.cols);
            rows = Math.max(1, state.rows);
            if (state.square) {
                // Use the smaller cell dimension so cells stay square,
                // derive the other count from it.
                var size = Math.min(wMM / cols, hMM / rows);
                cols = Math.max(1, Math.round(wMM / size));
                rows = Math.max(1, Math.round(hMM / size));
            }
            cellW = wMM / cols;
            cellH = hMM / rows;
        }
        return { cols: cols, rows: rows, cellW: cellW, cellH: cellH };
    }

    // ---- Rendering ------------------------------------------------------

    // Width (mm) of the ruler gutter reserved on the top and left edges
    // when labels are shown.
    var GUTTER_MM = 10;

    // Draws the full scene onto an arbitrary context at a given px-per-mm.
    function draw(targetCtx, wMM, hMM, pxPerMM) {
        var W = wMM * pxPerMM;
        var H = hMM * pxPerMM;

        targetCtx.save();
        targetCtx.fillStyle = "#ffffff";
        targetCtx.fillRect(0, 0, W, H);

        // Reserve a gutter for the row/column rulers when labels are enabled.
        var gutterMM = state.labels ? GUTTER_MM : 0;
        var off = gutterMM * pxPerMM;
        var innerW = W - off;
        var innerH = H - off;

        // Grid layout is computed over the inner (drawable) area.
        var g = gridLayout(wMM - gutterMM, hMM - gutterMM);

        // Image — clipped to the inner area.
        if (state.image) {
            targetCtx.save();
            targetCtx.beginPath();
            targetCtx.rect(off, off, innerW, innerH);
            targetCtx.clip();
            targetCtx.translate(off, off);
            drawImageFitted(targetCtx, state.image, innerW, innerH);
            targetCtx.restore();
        }

        // Grid
        targetCtx.save();
        targetCtx.translate(off, off);
        drawGrid(targetCtx, innerW, innerH, g, pxPerMM);
        targetCtx.restore();

        // Ruler labels in the gutter
        if (state.labels) {
            drawRuler(targetCtx, off, innerW, innerH, g, pxPerMM);
        }

        targetCtx.restore();
        return g;
    }

    function drawImageFitted(c, img, W, H) {
        var iw = img.naturalWidth, ih = img.naturalHeight;
        var dx = 0, dy = 0, dw = W, dh = H;

        if (state.fit === "contain") {
            var s = Math.min(W / iw, H / ih);
            dw = iw * s; dh = ih * s;
            dx = (W - dw) / 2; dy = (H - dh) / 2;
            c.drawImage(img, dx, dy, dw, dh);
        } else if (state.fit === "cover") {
            var sc = Math.max(W / iw, H / ih);
            var sw = W / sc, sh = H / sc;
            var sx = (iw - sw) / 2, sy = (ih - sh) / 2;
            c.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
        } else { // stretch
            c.drawImage(img, 0, 0, W, H);
        }
    }

    function drawGrid(c, W, H, g, pxPerMM) {
        c.save();
        c.globalAlpha = state.lineOpacity;
        c.strokeStyle = state.lineColor;
        // Line width scales with resolution so it looks the same at any DPI.
        c.lineWidth = Math.max(0.5, state.lineWidth * pxPerMM / PREVIEW_PX_PER_MM);

        var x, y, i;
        // Vertical lines
        for (i = 0; i <= g.cols; i++) {
            x = Math.round(i * g.cellW * pxPerMM) + 0.5;
            c.beginPath();
            c.moveTo(x, 0);
            c.lineTo(x, H);
            c.stroke();
        }
        // Horizontal lines
        for (i = 0; i <= g.rows; i++) {
            y = Math.round(i * g.cellH * pxPerMM) + 0.5;
            c.beginPath();
            c.moveTo(0, y);
            c.lineTo(W, y);
            c.stroke();
        }

        if (state.margin) {
            c.globalAlpha = Math.min(1, state.lineOpacity + 0.1);
            c.lineWidth = c.lineWidth * 2;
            c.strokeRect(0.5, 0.5, W - 1, H - 1);
        }
        c.restore();
    }

    // Draws column letters along the top gutter and row numbers down the
    // left gutter, outside the grid. (off, off) is the grid origin.
    function drawRuler(c, off, innerW, innerH, g, pxPerMM) {
        var fs = Math.max(9, Math.min(
            off * 0.55,
            Math.min(g.cellW, g.cellH) * pxPerMM * 0.45
        ));
        c.save();

        // Gutter background and separator lines.
        c.fillStyle = "#f4f6f8";
        c.fillRect(0, 0, off + innerW, off);       // top strip
        c.fillRect(0, 0, off, off + innerH);       // left strip

        c.globalAlpha = Math.min(1, state.lineOpacity + 0.1);
        c.strokeStyle = state.lineColor;
        c.lineWidth = Math.max(0.5, state.lineWidth * pxPerMM / PREVIEW_PX_PER_MM);
        c.beginPath();
        c.moveTo(off + 0.5, 0);
        c.lineTo(off + 0.5, off + innerH);         // vertical separator
        c.moveTo(0, off + 0.5);
        c.lineTo(off + innerW, off + 0.5);         // horizontal separator
        c.stroke();

        // Tick marks aligned with each grid line.
        c.beginPath();
        var i, x, y;
        for (i = 0; i <= g.cols; i++) {
            x = off + Math.round(i * g.cellW * pxPerMM) + 0.5;
            c.moveTo(x, off * 0.62);
            c.lineTo(x, off);
        }
        for (i = 0; i <= g.rows; i++) {
            y = off + Math.round(i * g.cellH * pxPerMM) + 0.5;
            c.moveTo(off * 0.62, y);
            c.lineTo(off, y);
        }
        c.stroke();

        // Labels.
        c.globalAlpha = 1;
        c.fillStyle = state.lineColor;
        c.font = "700 " + fs + "px 'Segoe UI', sans-serif";
        c.textBaseline = "middle";
        c.textAlign = "center";
        for (i = 0; i < g.cols; i++) {
            x = off + (i + 0.5) * g.cellW * pxPerMM;
            c.fillText(String(i + 1), x, off * 0.5);
        }
        for (i = 0; i < g.rows; i++) {
            y = off + (i + 0.5) * g.cellH * pxPerMM;
            c.fillText(String(i + 1), off * 0.5, y);
        }
        c.restore();
    }

    // ---- Live preview ---------------------------------------------------

    function render() {
        var p = paperMM();
        var wMM = p[0], hMM = p[1];
        var W = Math.round(wMM * PREVIEW_PX_PER_MM);
        var H = Math.round(hMM * PREVIEW_PX_PER_MM);
        canvas.width = W;
        canvas.height = H;
        // Cap on-screen display width so big papers still fit the page.
        canvas.style.width = Math.min(W, 900) + "px";

        var g = draw(ctx, wMM, hMM, PREVIEW_PX_PER_MM);

        var gridInfo = g.cols + " × " + g.rows + " cells · " +
            g.cellW.toFixed(1) + " × " + g.cellH.toFixed(1) + " mm each";
        $("gp-grid-info").textContent = gridInfo;
        $("gp-dim-info").textContent =
            wMM.toFixed(0) + " × " + hMM.toFixed(0) + " mm — " + g.cols + "×" + g.rows + " grid";
    }

    // ---- Export ---------------------------------------------------------

    function buildExportCanvas() {
        var p = paperMM();
        var wMM = p[0], hMM = p[1];
        var pxPerMM = EXPORT_DPI / MM_PER_INCH;
        var ex = document.createElement("canvas");
        ex.width = Math.round(wMM * pxPerMM);
        ex.height = Math.round(hMM * pxPerMM);
        var exCtx = ex.getContext("2d");
        exCtx.imageSmoothingQuality = "high";
        draw(exCtx, wMM, hMM, pxPerMM);
        return ex;
    }

    function savePNG() {
        var ex = buildExportCanvas();
        var name = "grid-" + state.paper.toLowerCase() + "-" + state.orient + ".png";
        ex.toBlob(function (blob) {
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        }, "image/png");
    }

    function printSheet() {
        var ex = buildExportCanvas();
        var dataUrl = ex.toDataURL("image/png");
        var p = paperMM();
        var win = window.open("", "_blank");
        if (!win) { return; }
        var size = (state.paper === "custom" || !PAPER[state.paper])
            ? (p[0] + "mm " + p[1] + "mm")
            : (state.paper + " " + state.orient);
        win.document.write(
            "<!DOCTYPE html><html><head><title>Grid Painter</title><style>" +
            "@page { size: " + size + "; margin: 0; }" +
            "html,body { margin:0; padding:0; }" +
            "img { width: " + p[0] + "mm; height: " + p[1] + "mm; display:block; }" +
            "</style></head><body><img src='" + dataUrl + "'></body></html>"
        );
        win.document.close();
        win.focus();
        var img = win.document.querySelector("img");
        if (img && !img.complete) {
            img.onload = function () { win.print(); };
        } else {
            setTimeout(function () { win.print(); }, 250);
        }
    }

    // ---- Events ---------------------------------------------------------

    $("gp-paper").addEventListener("change", function () {
        state.paper = this.value;
        $("gp-custom-size").style.display = (state.paper === "custom") ? "flex" : "none";
        render();
    });
    $("gp-custom-w").addEventListener("input", function () {
        state.customW = clampNum(this.value, 10, 2000, 210); render();
    });
    $("gp-custom-h").addEventListener("input", function () {
        state.customH = clampNum(this.value, 10, 2000, 297); render();
    });

    Array.prototype.forEach.call($("gp-orient").children, function (btn) {
        btn.addEventListener("click", function () {
            setSegmented($("gp-orient"), btn);
            state.orient = btn.getAttribute("data-orient");
            render();
        });
    });

    $("gp-fit").addEventListener("change", function () {
        state.fit = this.value; render();
    });

    Array.prototype.forEach.call($("gp-grid-mode").children, function (btn) {
        btn.addEventListener("click", function () {
            setSegmented($("gp-grid-mode"), btn);
            state.gridMode = btn.getAttribute("data-mode");
            $("gp-mode-cell").style.display = (state.gridMode === "cell") ? "flex" : "none";
            $("gp-mode-count").style.display = (state.gridMode === "count") ? "flex" : "none";
            render();
        });
    });

    $("gp-cell").addEventListener("input", function () {
        state.cell = clampNum(this.value, 2, 200, 20); render();
    });
    $("gp-cols").addEventListener("input", function () {
        state.cols = clampNum(this.value, 1, 200, 10); render();
    });
    $("gp-rows").addEventListener("input", function () {
        state.rows = clampNum(this.value, 1, 200, 14); render();
    });
    $("gp-square").addEventListener("change", function () {
        state.square = this.checked; render();
    });

    $("gp-line-color").addEventListener("input", function () {
        state.lineColor = this.value; render();
    });
    $("gp-line-width").addEventListener("input", function () {
        state.lineWidth = parseFloat(this.value); render();
    });
    $("gp-line-opacity").addEventListener("input", function () {
        state.lineOpacity = parseFloat(this.value); render();
    });
    $("gp-labels").addEventListener("change", function () {
        state.labels = this.checked; render();
    });
    $("gp-margin").addEventListener("change", function () {
        state.margin = this.checked; render();
    });

    $("gp-upload-btn").addEventListener("click", function () {
        $("gp-file").click();
    });
    $("gp-file").addEventListener("change", function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) { return; }
        var reader = new FileReader();
        reader.onload = function (ev) {
            var img = new Image();
            img.onload = function () {
                state.image = img;
                $("gp-clear-img").disabled = false;
                render();
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        this.value = "";
    });
    $("gp-clear-img").addEventListener("click", function () {
        state.image = null;
        this.disabled = true;
        render();
    });

    $("gp-save").addEventListener("click", savePNG);
    $("gp-print").addEventListener("click", printSheet);

    // ---- Utils ----------------------------------------------------------

    function clampNum(v, min, max, fallback) {
        var n = parseFloat(v);
        if (isNaN(n)) { return fallback; }
        return Math.min(max, Math.max(min, n));
    }

    function setSegmented(group, active) {
        Array.prototype.forEach.call(group.children, function (b) {
            b.classList.toggle("active", b === active);
        });
    }

    render();
})();
