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
        image: null,
        // Dual-page (separate print/drawing sizes) mode.
        dual: false,
        dstPaper: "A3",
        dstCustomW: 297,
        dstCustomH: 420,
        dstOrient: "portrait"
    };

    // ---- Pan & zoom view -----------------------------------------------
    var frame = $("gp-frame");
    var stage = document.querySelector(".gp-stage");
    var scale = 1, panX = 0, panY = 0;
    var lastW = 0, lastH = 0;
    var SCALE_MIN = 0.2, SCALE_MAX = 8;

    function clampScale(s) { return Math.min(SCALE_MAX, Math.max(SCALE_MIN, s)); }

    function baseWidth() { return Math.min(canvas.width, 900); }

    function applyTransform() {
        frame.style.transform =
            "translate(" + panX + "px, " + panY + "px) scale(" + scale + ")";
    }

    function updateZoomLabel() {
        var el = $("gp-zoom-level");
        if (el) { el.textContent = Math.round(scale * 100) + "%"; }
    }

    function centerView() {
        var base = baseWidth();
        var w = base * scale;
        var h = (canvas.height / canvas.width) * base * scale;
        panX = Math.round((stage.clientWidth - w) / 2);
        panY = Math.round((stage.clientHeight - h) / 2);
        applyTransform();
    }

    // Called after each render. Recenters only when the page dimensions
    // change, so the user's pan/zoom is preserved across option tweaks.
    function updateView() {
        canvas.style.width = baseWidth() + "px";
        if (canvas.width !== lastW || canvas.height !== lastH) {
            lastW = canvas.width;
            lastH = canvas.height;
            centerView();
        } else {
            applyTransform();
        }
        updateZoomLabel();
    }

    // Zooms toward a point given in client (viewport) coordinates.
    function zoomAtClient(newScale, clientX, clientY) {
        var z1 = clampScale(newScale);
        if (z1 === scale) { return; }
        var rect = stage.getBoundingClientRect();
        var ax = clientX - rect.left, ay = clientY - rect.top;
        panX = ax - (ax - panX) * (z1 / scale);
        panY = ay - (ay - panY) * (z1 / scale);
        scale = z1;
        applyTransform();
        updateZoomLabel();
    }

    // ---- Geometry helpers ----------------------------------------------

    function paperMMOf(paper, orient, cw, ch) {
        var dims = (paper === "custom") ? [cw, ch] : PAPER[paper];
        var w = dims[0], h = dims[1];
        if (orient === "landscape") {
            return [Math.max(w, h), Math.min(w, h)];
        }
        return [Math.min(w, h), Math.max(w, h)];
    }

    function paperMM() {
        return paperMMOf(state.paper, state.orient, state.customW, state.customH);
    }

    function dstPaperMM() {
        return paperMMOf(state.dstPaper, state.dstOrient, state.dstCustomW, state.dstCustomH);
    }

    // The grid counts derived from the source (print) page. In dual mode the
    // drawing page always reuses these so cells map 1:1 between pages, whether
    // the grid was specified by cell size or by count.
    function sourceGridCounts() {
        var s = paperMM();
        var gutterMM = state.labels ? GUTTER_MM : 0;
        var g = gridLayout(s[0] - gutterMM, s[1] - gutterMM);
        return { cols: g.cols, rows: g.rows };
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

    // A grid with explicit counts, sized to the given area (used for the
    // drawing page so it mirrors the source page's cell count).
    function gridFromCount(wMM, hMM, cols, rows) {
        cols = Math.max(1, cols);
        rows = Math.max(1, rows);
        return { cols: cols, rows: rows, cellW: wMM / cols, cellH: hMM / rows };
    }

    // ---- Rendering ------------------------------------------------------

    // Width (mm) of the ruler gutter reserved on the top and left edges
    // when labels are shown.
    var GUTTER_MM = 10;

    // Draws one page (white sheet + optional image + grid + ruler) at the
    // given origin (ox, oy) and px-per-mm. imgAlpha controls image opacity
    // (1 for the source/single page, 0 to omit the image entirely).
    // countOverride forces an exact cols/rows count (drawing page in dual mode).
    function drawPage(targetCtx, ox, oy, wMM, hMM, pxPerMM, imgAlpha, countOverride) {
        var W = wMM * pxPerMM;
        var H = hMM * pxPerMM;

        targetCtx.save();
        targetCtx.translate(ox, oy);
        targetCtx.fillStyle = "#ffffff";
        targetCtx.fillRect(0, 0, W, H);

        // Reserve a gutter for the row/column rulers when labels are enabled.
        var gutterMM = state.labels ? GUTTER_MM : 0;
        var off = gutterMM * pxPerMM;
        var innerW = W - off;
        var innerH = H - off;

        // Grid layout is computed over the inner (drawable) area.
        var g = countOverride
            ? gridFromCount(wMM - gutterMM, hMM - gutterMM, countOverride.cols, countOverride.rows)
            : gridLayout(wMM - gutterMM, hMM - gutterMM);

        // Image — clipped to the inner area.
        if (state.image && imgAlpha > 0) {
            targetCtx.save();
            targetCtx.globalAlpha = imgAlpha;
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

    // Paints a soft drop shadow behind a page rect so the two sheets read as
    // separate pieces of paper in the side-by-side comparison view.
    function paintPageShadow(c, ox, oy, W, H) {
        c.save();
        c.shadowColor = "rgba(0, 0, 0, 0.22)";
        c.shadowBlur = 16;
        c.shadowOffsetY = 6;
        c.fillStyle = "#ffffff";
        c.fillRect(ox, oy, W, H);
        c.restore();
    }

    function labelFor(paper) {
        return paper === "custom" ? "Custom" : paper;
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

    // Reflects the grid counts that were actually drawn back into the
    // Columns/Rows inputs (they can differ from what was typed when "Square
    // cells" is on or when the grid is set by cell size).
    function syncGridInputs(g) {
        state.cols = g.cols;
        state.rows = g.rows;
        var colsEl = $("gp-cols"), rowsEl = $("gp-rows");
        if (document.activeElement !== colsEl) { colsEl.value = g.cols; }
        if (document.activeElement !== rowsEl) { rowsEl.value = g.rows; }
    }

    function render() {
        if (state.dual) {
            renderDual();
            return;
        }

        var p = paperMM();
        var wMM = p[0], hMM = p[1];
        var PAD = 8, CAP = 12;
        var pxPerMM = PREVIEW_PX_PER_MM;
        var W = Math.round((PAD * 2 + wMM) * pxPerMM);
        var H = Math.round((PAD * 2 + CAP + hMM) * pxPerMM);
        canvas.width = W;
        canvas.height = H;
        updateView();

        ctx.clearRect(0, 0, W, H);

        var ox = PAD * pxPerMM, oy = (PAD + CAP) * pxPerMM;
        paintPageShadow(ctx, ox, oy, wMM * pxPerMM, hMM * pxPerMM);
        var g = drawPage(ctx, ox, oy, wMM, hMM, pxPerMM, 1);
        drawCaption(ctx, ox, oy,
            labelFor(state.paper) + " · " + wMM.toFixed(0) + "×" + hMM.toFixed(0) + "mm", pxPerMM);

        syncGridInputs(g);

        var gridInfo = g.cols + " × " + g.rows + " cells · " +
            g.cellW.toFixed(1) + " × " + g.cellH.toFixed(1) + " mm each";
        $("gp-grid-info").textContent = gridInfo;
        $("gp-dim-info").textContent =
            wMM.toFixed(0) + " × " + hMM.toFixed(0) + " mm — " + g.cols + "×" + g.rows + " grid";
    }

    // Renders the source (print) and destination (drawing) pages side by side
    // at a shared px-per-mm so their true relative sizes are visible.
    function renderDual() {
        var s = paperMM();
        var d = dstPaperMM();
        var sw = s[0], sh = s[1], dw = d[0], dh = d[1];

        var PAD = 8;      // mm of breathing room so shadows aren't clipped
        var GAP = 20;     // mm between the two sheets
        var CAP = 12;     // mm reserved above each sheet for its label
        var pxPerMM = PREVIEW_PX_PER_MM;

        var totalWmm = PAD * 2 + sw + GAP + dw;
        var totalHmm = PAD * 2 + CAP + Math.max(sh, dh);
        var W = Math.round(totalWmm * pxPerMM);
        var H = Math.round(totalHmm * pxPerMM);
        canvas.width = W;
        canvas.height = H;
        updateView();

        ctx.clearRect(0, 0, W, H);

        var sx = PAD * pxPerMM, sy = (PAD + CAP) * pxPerMM;
        var dx = (PAD + sw + GAP) * pxPerMM, dy = (PAD + CAP) * pxPerMM;

        paintPageShadow(ctx, sx, sy, sw * pxPerMM, sh * pxPerMM);
        paintPageShadow(ctx, dx, dy, dw * pxPerMM, dh * pxPerMM);

        var gs = drawPage(ctx, sx, sy, sw, sh, pxPerMM, 1);
        var gd = drawPage(ctx, dx, dy, dw, dh, pxPerMM, 1, { cols: gs.cols, rows: gs.rows });

        drawCaption(ctx, sx, sy,
            "Source " + labelFor(state.paper) + " · " + sw.toFixed(0) + "×" + sh.toFixed(0) + "mm", pxPerMM);
        drawCaption(ctx, dx, dy,
            "Destination " + labelFor(state.dstPaper) + " · " + dw.toFixed(0) + "×" + dh.toFixed(0) + "mm", pxPerMM);

        syncGridInputs(gs);

        $("gp-grid-info").textContent = "Source " + gs.cols + "×" + gs.rows + " cells (" +
            gs.cellW.toFixed(1) + "×" + gs.cellH.toFixed(1) + "mm) · Drawing " + gd.cols + "×" + gd.rows +
            " cells (" + gd.cellW.toFixed(1) + "×" + gd.cellH.toFixed(1) + "mm)";
        $("gp-dim-info").innerHTML = "Print " + labelFor(state.paper) + " (" +
            sw.toFixed(0) + "×" + sh.toFixed(0) + "mm) → Draw " + labelFor(state.dstPaper) + " (" +
            dw.toFixed(0) + "×" + dh.toFixed(0) + "mm)" +
            "<br>Source " + gs.cols + " × " + gs.rows + " cells · " +
            gs.cellW.toFixed(1) + "×" + gs.cellH.toFixed(1) + "mm each &nbsp;·&nbsp; Drawing " +
            gd.cols + " × " + gd.rows + " cells · " +
            gd.cellW.toFixed(1) + "×" + gd.cellH.toFixed(1) + "mm each";
    }

    function drawCaption(c, x, pageTopY, text, pxPerMM) {
        c.save();
        c.fillStyle = "#2c3e50";
        c.font = "700 " + Math.max(17, Math.round(5.4 * pxPerMM)) + "px 'Segoe UI', sans-serif";
        c.textBaseline = "bottom";
        c.textAlign = "left";
        c.fillText(text, x, pageTopY - 2 * pxPerMM);
        c.restore();
    }

    // ---- Export ---------------------------------------------------------

    function buildExportCanvas(role) {
        var p = (role === "dst") ? dstPaperMM() : paperMM();
        var wMM = p[0], hMM = p[1];
        var pxPerMM = EXPORT_DPI / MM_PER_INCH;
        var ex = document.createElement("canvas");
        ex.width = Math.round(wMM * pxPerMM);
        ex.height = Math.round(hMM * pxPerMM);
        var exCtx = ex.getContext("2d");
        exCtx.imageSmoothingQuality = "high";
        var override = (role === "dst" && state.dual) ? sourceGridCounts() : null;
        drawPage(exCtx, 0, 0, wMM, hMM, pxPerMM, 1, override);
        return ex;
    }

    function savePNG(role) {
        var ex = buildExportCanvas(role);
        var paper = (role === "dst") ? state.dstPaper : state.paper;
        var orient = (role === "dst") ? state.dstOrient : state.orient;
        var tag = state.dual ? (role === "dst" ? "-drawing" : "-source") : "";
        var name = "grid-" + paper.toLowerCase() + "-" + orient + tag + ".png";
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

    function printSheet(role) {
        var ex = buildExportCanvas(role);
        var dataUrl = ex.toDataURL("image/png");
        var p = (role === "dst") ? dstPaperMM() : paperMM();
        var paper = (role === "dst") ? state.dstPaper : state.paper;
        var orient = (role === "dst") ? state.dstOrient : state.orient;
        var win = window.open("", "_blank");
        if (!win) { return; }
        var size = (paper === "custom" || !PAPER[paper])
            ? (p[0] + "mm " + p[1] + "mm")
            : (paper + " " + orient);
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

    Array.prototype.forEach.call($("gp-page-mode").children, function (btn) {
        btn.addEventListener("click", function () {
            setSegmented($("gp-page-mode"), btn);
            state.dual = btn.getAttribute("data-page") === "diff";
            applyPageMode();
            render();
        });
    });

    // Toggles the UI between single-page and dual (source/drawing) modes.
    function applyPageMode() {
        var dual = state.dual;
        $("gp-dst-panel").style.display = dual ? "flex" : "none";
        $("gp-paper-label").textContent = dual ? "Source paper (print)" : "Paper Size";
        $("gp-page-mode-hint").innerHTML = dual
            ? "Print on one paper size and draw on another (e.g. print <b>A4</b>, draw on <b>A3</b>). Set the grid by <b>cell size</b> or by <b>count</b> — the cell size applies to the source page, and the drawing page keeps the same number of cells scaled to its size."
            : "Print and draw on the <b>same</b> paper size. The grid is measured on that single page — set cells by real-world <b>size</b> or by <b>count</b>.";

        $("gp-save-dst").style.display = dual ? "" : "none";
        $("gp-print-dst").style.display = dual ? "" : "none";
        $("gp-save").textContent = dual ? "⬇ Save Source PNG" : "⬇ Save PNG (300 DPI)";
        $("gp-print").textContent = dual ? "🖨 Print Source" : "🖨 Print";
    }

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

    $("gp-dst-paper").addEventListener("change", function () {
        state.dstPaper = this.value;
        $("gp-dst-custom-size").style.display = (state.dstPaper === "custom") ? "flex" : "none";
        render();
    });
    $("gp-dst-custom-w").addEventListener("input", function () {
        state.dstCustomW = clampNum(this.value, 10, 2000, 297); render();
    });
    $("gp-dst-custom-h").addEventListener("input", function () {
        state.dstCustomH = clampNum(this.value, 10, 2000, 420); render();
    });

    Array.prototype.forEach.call($("gp-orient").children, function (btn) {
        btn.addEventListener("click", function () {
            setSegmented($("gp-orient"), btn);
            state.orient = btn.getAttribute("data-orient");
            // Orientation is shared between the source and drawing pages.
            state.dstOrient = state.orient;
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

    $("gp-save").addEventListener("click", function () { savePNG(state.dual ? "src" : undefined); });
    $("gp-print").addEventListener("click", function () { printSheet(state.dual ? "src" : undefined); });
    $("gp-save-dst").addEventListener("click", function () { savePNG("dst"); });
    $("gp-print-dst").addEventListener("click", function () { printSheet("dst"); });

    $("gp-zoom-in").addEventListener("click", function () { zoomByCenter(1.25); });
    $("gp-zoom-out").addEventListener("click", function () { zoomByCenter(1 / 1.25); });
    $("gp-zoom-reset").addEventListener("click", function () {
        scale = 1; centerView(); updateZoomLabel();
    });

    function zoomByCenter(factor) {
        var rect = stage.getBoundingClientRect();
        zoomAtClient(scale * factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    // Wheel to zoom toward the cursor.
    stage.addEventListener("wheel", function (e) {
        e.preventDefault();
        zoomAtClient(scale * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX, e.clientY);
    }, { passive: false });

    // Pointer-based pan (one pointer) and pinch-zoom (two pointers) covering
    // mouse, touch and pen.
    var pointers = new Map();
    var gesture = null; // { dist, midX, midY } while two pointers are down

    function startGesture() {
        var pts = Array.prototype.slice.call(pointers.values());
        var dx = pts[1].x - pts[0].x, dy = pts[1].y - pts[0].y;
        gesture = {
            dist: Math.hypot(dx, dy) || 1,
            midX: (pts[0].x + pts[1].x) / 2,
            midY: (pts[0].y + pts[1].y) / 2
        };
    }

    stage.addEventListener("pointerdown", function (e) {
        stage.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 2) { startGesture(); }
        stage.classList.add("gp-grabbing");
    });

    stage.addEventListener("pointermove", function (e) {
        var p = pointers.get(e.pointerId);
        if (!p) { return; }
        var prevX = p.x, prevY = p.y;
        p.x = e.clientX; p.y = e.clientY;

        if (pointers.size === 1) {
            panX += p.x - prevX;
            panY += p.y - prevY;
            applyTransform();
        } else if (pointers.size === 2 && gesture) {
            var pts = Array.prototype.slice.call(pointers.values());
            var dx = pts[1].x - pts[0].x, dy = pts[1].y - pts[0].y;
            var dist = Math.hypot(dx, dy);
            var midX = (pts[0].x + pts[1].x) / 2;
            var midY = (pts[0].y + pts[1].y) / 2;
            var z1 = clampScale(scale * (dist / gesture.dist));
            var rect = stage.getBoundingClientRect();
            var ax = midX - rect.left, ay = midY - rect.top;
            // Zoom about the pinch midpoint…
            panX = ax - (ax - panX) * (z1 / scale);
            panY = ay - (ay - panY) * (z1 / scale);
            // …and pan with the midpoint's movement (two-finger drag).
            panX += midX - gesture.midX;
            panY += midY - gesture.midY;
            scale = z1;
            gesture.dist = dist;
            gesture.midX = midX;
            gesture.midY = midY;
            applyTransform();
            updateZoomLabel();
        }
    });

    function endPointer(e) {
        pointers.delete(e.pointerId);
        if (pointers.size < 2) { gesture = null; }
        if (pointers.size === 0) { stage.classList.remove("gp-grabbing"); }
    }
    stage.addEventListener("pointerup", endPointer);
    stage.addEventListener("pointercancel", endPointer);

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

    applyPageMode();
    render();
})();
