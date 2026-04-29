(function () {
    /* ── palette ─────────────────────────────────────────────────────── */
    var PALETTE = [
        { fill: 'rgba(52,152,219,0.13)',  stroke: '#2980b9', label: '#1a5276' },
        { fill: 'rgba(39,174,96,0.13)',   stroke: '#27ae60', label: '#1e8449' },
        { fill: 'rgba(231,76,60,0.13)',   stroke: '#e74c3c', label: '#922b21' },
        { fill: 'rgba(155,89,182,0.13)',  stroke: '#9b59b6', label: '#76448a' },
        { fill: 'rgba(230,126,34,0.13)',  stroke: '#e67e22', label: '#935116' },
        { fill: 'rgba(26,188,156,0.13)',  stroke: '#1abc9c', label: '#148f77' },
        { fill: 'rgba(241,196,15,0.18)',  stroke: '#f39c12', label: '#9a7d0a' },
        { fill: 'rgba(189,195,199,0.25)', stroke: '#95a5a6', label: '#566573' },
    ];

    /* ── layout constants ────────────────────────────────────────────── */
    var CHIP_H      = 26;
    var CHIP_PAD_X  = 14;
    var CHIP_PAD_Y  = 8;
    var CHIP_RX     = 13;
    var COL_GAP     = 12;
    var ROW_GAP     = 10;
    var SET_PAD     = 48;      // padding inside set rect around chips
    var SET_TITLE_H = 28;      // space for set label at top
    var SET_GAP     = 36;      // horizontal gap between sibling sets
    var NEST_INDENT = 28;      // extra left offset per nesting level

    /* ── text measurement ────────────────────────────────────────────── */
    var _ctx = (function () {
        var c = document.createElement('canvas');
        var ctx = c.getContext('2d');
        ctx.font = "500 12px 'Segoe UI',system-ui,sans-serif";
        return ctx;
    })();
    var _ctxLabel = (function () {
        var c = document.createElement('canvas');
        var ctx = c.getContext('2d');
        ctx.font = "700 13px 'Segoe UI',system-ui,sans-serif";
        return ctx;
    })();

    function chipWidth(text) {
        return Math.ceil(_ctx.measureText(text).width) + CHIP_PAD_X * 2;
    }

    /* ── state ───────────────────────────────────────────────────────── */
    var sets = [];        // [{ name, items:[] }]
    var selectedName = null;

    var svgEl    = document.getElementById('sv-svg');
    var canvasEl = document.getElementById('sv-canvas-wrap');
    var mainGrp  = d3.select('#sv-main');
    var svg      = d3.select(svgEl);

    /* ── zoom / pan ──────────────────────────────────────────────────── */
    var zoom = d3.zoom().scaleExtent([0.05, 4])
        .on('start', function () { canvasEl.classList.add('sv-panning'); })
        .on('zoom',  function (ev) { mainGrp.attr('transform', ev.transform); })
        .on('end',   function () { canvasEl.classList.remove('sv-panning'); });
    svg.call(zoom);
    svg.on('click', function (ev) {
        if (ev.target === svgEl) setSelected(null);
    });

    /* ── selection ───────────────────────────────────────────────────── */
    function setSelected(name) {
        selectedName = name;
        render(0);
    }

    /* ── parse ───────────────────────────────────────────────────────── */
    function parseSets(text) {
        var result = [];
        text.split('\n').forEach(function (line) {
            line = line.trim();
            if (!line) return;
            var m = line.match(/^([^:]+):\s*(.*)/);
            if (!m) return;
            var name  = m[1].trim();
            var items = m[2].split(',').map(function (s) { return s.trim(); }).filter(Boolean);
            result.push({ name: name, items: items });
        });
        sets = result;
        selectedName = null;
    }

    /* ────────────────────────────────────────────────────────────────────
       LAYOUT
       Strategy: sets are sorted by size (largest first = outermost).
       Each set is drawn as a rounded-rect that contains:
         - its own-exclusive chips (items not in any superset)
         - nested sub-set rects for every proper subset in the list
       We detect subset relationships: set B is a subset of set A if
       every item in B also appears in A.
       ──────────────────────────────────────────────────────────────────── */

    /* build a tree of subset relationships among the parsed sets */
    function buildSetTree() {
        /* sort by item-count descending so supersets come first */
        var sorted = sets.slice().sort(function (a, b) {
            return b.items.length - a.items.length;
        });

        /* nodes: { set, children, parent } */
        var nodes = sorted.map(function (s) {
            return { set: s, children: [], parent: null };
        });

        function isSubset(small, large) {
            return small.items.every(function (x) { return large.items.indexOf(x) >= 0; });
        }

        /* For each node find the tightest parent (direct superset) */
        nodes.forEach(function (node, i) {
            /* candidate supersets: all nodes with strictly more items */
            var candidates = nodes.filter(function (n, j) {
                return j !== i && n.set.items.length > node.set.items.length && isSubset(node.set, n.set);
            });
            if (candidates.length === 0) return;
            /* pick the one with fewest items (tightest superset) */
            candidates.sort(function (a, b) { return a.set.items.length - b.set.items.length; });
            node.parent = candidates[0];
            candidates[0].children.push(node);
        });

        return nodes.filter(function (n) { return n.parent === null; });
    }

    /* items that belong to this set but NOT to any direct child set
       (each item is shown in the innermost/most-specific set that contains it) */
    function ownItems(node) {
        var childItems = {};
        node.children.forEach(function (child) {
            child.set.items.forEach(function (x) { childItems[x] = true; });
        });
        return node.set.items.filter(function (x) {
            return !childItems[x];
        });
    }

    /* ── chip layout helpers ─────────────────────────────────────────── */

    /*  Given an array of chip labels, pack them into rows that fit within
        maxW.  Returns { rows: [[label,...]], totalH, totalW } */
    function packChips(labels, maxW) {
        var rows = [];
        var cur = [], curW = 0;
        labels.forEach(function (lbl) {
            var cw = chipWidth(lbl) + (cur.length ? COL_GAP : 0);
            if (cur.length > 0 && curW + cw > maxW) {
                rows.push(cur);
                cur = [lbl];
                curW = chipWidth(lbl);
            } else {
                cur.push(lbl);
                curW += cw;
            }
        });
        if (cur.length) rows.push(cur);
        var totalW = 0;
        rows.forEach(function (row) {
            var rw = row.reduce(function (acc, lbl, i) {
                return acc + chipWidth(lbl) + (i ? COL_GAP : 0);
            }, 0);
            if (rw > totalW) totalW = rw;
        });
        return {
            rows: rows,
            totalH: rows.length * CHIP_H + Math.max(0, rows.length - 1) * ROW_GAP,
            totalW: totalW
        };
    }

    /*  Recursively compute a layout box for a node tree.
        Returns a layout object { w, h, node, chipLayout, childLayouts }
        minWidth hint so children can expand to parent width. */
    function computeLayout(node, depth) {
        depth = depth || 0;
        var own = ownItems(node);

        /* first lay out children to know their sizes */
        var childLayouts = node.children.map(function (c) {
            return computeLayout(c, depth + 1);
        });

        /* children sit side-by-side with SET_GAP between them */
        var childrenW = childLayouts.reduce(function (acc, cl, i) {
            return acc + cl.w + (i ? SET_GAP : 0);
        }, 0);
        var childrenH = childLayouts.reduce(function (acc, cl) {
            return Math.max(acc, cl.h);
        }, 0);

        /* inner available width for own chips: at least childrenW */
        var innerW = Math.max(childrenW, 200);

        /* pack own chips */
        var chipLayout = packChips(own, innerW);

        /* expand innerW to chipLayout.totalW if needed */
        if (chipLayout.totalW > innerW) innerW = chipLayout.totalW;

        /* total inner height: chips on top, children below */
        var innerH = chipLayout.totalH
            + (chipLayout.rows.length > 0 && childLayouts.length > 0 ? ROW_GAP * 2 : 0)
            + childrenH;

        var w = innerW + SET_PAD * 2;
        var h = innerH + SET_TITLE_H + SET_PAD * 2;

        return { w: w, h: h, node: node, chipLayout: chipLayout, childLayouts: childLayouts, own: own };
    }

    /* ── render ──────────────────────────────────────────────────────── */

    /* place all layout boxes as DOM data and produce flat arrays */
    var rectData  = [];
    var chipData  = [];
    var labelData = [];

    function flattenLayout(layout, ox, oy, depth) {
        depth = depth || 0;
        var palette = PALETTE[depth % PALETTE.length];
        var setName = layout.node.set.name;

        rectData.push({
            id:      'rect-' + setName,
            name:    setName,
            x: ox, y: oy, w: layout.w, h: layout.h,
            depth:   depth,
            fill:    palette.fill,
            stroke:  palette.stroke,
            labelColor: palette.label
        });

        /* own chips */
        var cx = ox + SET_PAD;
        var cy = oy + SET_TITLE_H + SET_PAD;
        layout.chipLayout.rows.forEach(function (row) {
            var rx = cx;
            row.forEach(function (lbl) {
                chipData.push({
                    id:     setName + '-chip-' + lbl,
                    setName: setName,
                    label:  lbl,
                    x: rx, y: cy,
                    w: chipWidth(lbl)
                });
                rx += chipWidth(lbl) + COL_GAP;
            });
            cy += CHIP_H + ROW_GAP;
        });

        /* extra gap after chips before children */
        if (layout.chipLayout.rows.length > 0 && layout.childLayouts.length > 0) {
            cy += ROW_GAP;
        }

        /* children side by side */
        var childX = ox + SET_PAD;
        layout.childLayouts.forEach(function (cl) {
            flattenLayout(cl, childX, cy, depth + 1);
            childX += cl.w + SET_GAP;
        });
    }

    function render(duration) {
        duration = duration || 0;

        rectData  = [];
        chipData  = [];

        /* build tree & layouts */
        var roots = buildSetTree();
        var rootLayouts = roots.map(function (r) { return computeLayout(r, 0); });

        /* place roots side by side with a gap */
        var xCursor = 20;
        rootLayouts.forEach(function (rl) {
            flattenLayout(rl, xCursor, 20, 0);
            xCursor += rl.w + SET_GAP * 2;
        });

        /* ── set rectangles ───────────────────────────────────────────── */
        var rects = mainGrp.selectAll('g.sv-set').data(rectData, function (d) { return d.id; });

        var rectsEnter = rects.enter().append('g').attr('class', 'sv-set')
            .attr('cursor', 'pointer')
            .on('click', function (ev, d) { ev.stopPropagation(); setSelected(d.name); });

        rectsEnter.append('rect').attr('class', 'sv-set-rect')
            .attr('rx', 14).attr('ry', 14)
            .attr('filter', 'url(#sv-shadow)');
        rectsEnter.append('text').attr('class', 'sv-set-label')
            .attr('font-size', '13px').attr('font-weight', '700')
            .attr('font-family', "'Segoe UI',system-ui,sans-serif");

        var rectsAll = rectsEnter.merge(rects);

        function applyRect(sel) {
            sel.select('.sv-set-rect')
                .attr('x',      function (d) { return d.x; })
                .attr('y',      function (d) { return d.y; })
                .attr('width',  function (d) { return d.w; })
                .attr('height', function (d) { return d.h; })
                .attr('fill',   function (d) { return d.fill; })
                .attr('stroke', function (d) {
                    return d.name === selectedName ? '#e74c3c' : d.stroke;
                })
                .attr('stroke-width', function (d) {
                    return d.name === selectedName ? 2.5 : 1.5;
                });
            sel.select('.sv-set-label')
                .attr('x',    function (d) { return d.x + 16; })
                .attr('y',    function (d) { return d.y + 19; })
                .attr('fill', function (d) {
                    return d.name === selectedName ? '#c0392b' : d.labelColor;
                })
                .text(function (d) { return d.name; });
        }

        if (duration > 0) {
            rectsAll.transition().duration(duration).ease(d3.easeCubicInOut)
                .call(applyRect);
        } else {
            rectsAll.call(applyRect);
        }
        rects.exit().remove();

        /* ── chips ────────────────────────────────────────────────────── */
        var chips = mainGrp.selectAll('g.sv-chip').data(chipData, function (d) { return d.id; });

        var chipsEnter = chips.enter().append('g').attr('class', 'sv-chip')
            .on('click', function (ev, d) { ev.stopPropagation(); setSelected(d.setName); });

        chipsEnter.append('rect').attr('class', 'sv-chip-rect')
            .attr('height', CHIP_H).attr('rx', CHIP_RX).attr('ry', CHIP_RX);
        chipsEnter.append('text').attr('class', 'sv-chip-text')
            .attr('y', CHIP_H / 2).attr('dy', '0.35em')
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px').attr('font-weight', '500')
            .attr('font-family', "'Segoe UI',system-ui,sans-serif")
            .attr('pointer-events', 'none');

        var chipsAll = chipsEnter.merge(chips);

        function applyChip(sel) {
            sel.select('.sv-chip-rect')
                .attr('x',      function (d) { return d.x; })
                .attr('y',      function (d) { return d.y; })
                .attr('width',  function (d) { return d.w; })
                .attr('fill',   function (d) {
                    return d.setName === selectedName ? '#fef9e7' : '#ffffff';
                })
                .attr('stroke', function (d) {
                    return d.setName === selectedName ? '#f39c12' : '#b0c4de';
                })
                .attr('stroke-width', function (d) {
                    return d.setName === selectedName ? 2 : 1.5;
                });
            sel.select('.sv-chip-text')
                .attr('x',    function (d) { return d.x + d.w / 2; })
                .attr('y',    function (d) { return d.y + CHIP_H / 2; })
                .attr('fill', function (d) {
                    return d.setName === selectedName ? '#9a7d0a' : '#2c3e50';
                })
                .text(function (d) { return d.label; });
        }

        if (duration > 0) {
            chipsAll.transition().duration(duration).ease(d3.easeCubicInOut)
                .call(applyChip);
        } else {
            chipsAll.call(applyChip);
        }
        chips.exit().remove();

        /* bring set rects behind chips */
        mainGrp.selectAll('g.sv-set').lower();
    }

    /* ── draw from editor ────────────────────────────────────────────── */
    function drawFromText() {
        if (!monacoEditor) return;
        var text = monacoEditor.getValue();
        if (!text.trim()) return;
        parseSets(text);
        render(400);
    }

    /* ── Monaco editor ───────────────────────────────────────────────── */
    var monacoEditor = null;
    var DEFAULT_TEXT = [
        'TINY_SHA: SHA1, SHA256, SHA384',
        'MINIMAL_SHA_SM3: HMACSHA256, SHA1, SHA256, SHA384, SHA512, SM3',
        'SMALL_SHA_RSA: HMACSHA256, SHA1, SHA256, SHA384, SHA512, SM3, RSA',
        'STANDARD: HMACSHA256, PKCS, RANDOM, SHA1, SHA256, SHA384, SHA512, X509, TLS, TLSSET, TLSGET, RSA, EC',
        'ALL: HMACSHA256, PKCS, RANDOM, SHA1, SHA256, SHA384, SHA512, X509, AES, TLS, TLSSET, TLSGET, RSA, EC',
    ].join('\n');

    require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' } });
    require(['vs/editor/editor.main'], function () {
        monacoEditor = monaco.editor.create(document.getElementById('sv-editor'), {
            value: DEFAULT_TEXT,
            language: 'plaintext',
            theme: 'vs',
            minimap:               { enabled: false },
            lineNumbers:           'off',
            scrollBeyondLastLine:  false,
            wordWrap:              'off',
            renderLineHighlight:   'none',
            renderWhitespace:      'none',
            occurrencesHighlight:  'on',
            selectionHighlight:    false,
            overviewRulerLanes:    0,
            hideCursorInOverviewRuler: true,
            scrollbar:             { vertical: 'auto', horizontal: 'hidden' },
            automaticLayout:       true,
            tabSize:               4,
            insertSpaces:          true,
        });

        monacoEditor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
            function () { drawFromText(); }
        );

        drawFromText();
    });

    document.getElementById('sv-btn-draw').addEventListener('click', drawFromText);

    /* ── Export PNG ──────────────────────────────────────────────────── */
    document.getElementById('sv-btn-export').addEventListener('click', function () {
        if (sets.length === 0) { alert('Nothing to export.'); return; }

        var PAD = 24;
        var allRects = [];
        mainGrp.selectAll('g.sv-set').each(function (d) { allRects.push(d); });
        if (allRects.length === 0) { alert('Nothing to export.'); return; }

        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        allRects.forEach(function (d) {
            if (d.x       < minX) minX = d.x;
            if (d.y       < minY) minY = d.y;
            if (d.x + d.w > maxX) maxX = d.x + d.w;
            if (d.y + d.h > maxY) maxY = d.y + d.h;
        });

        var imgW = Math.ceil(maxX - minX + PAD * 2);
        var imgH = Math.ceil(maxY - minY + PAD * 2);
        var dx   = PAD - minX;
        var dy   = PAD - minY;

        var cl = svgEl.cloneNode(true);
        cl.setAttribute('width',  imgW);
        cl.setAttribute('height', imgH);
        cl.setAttribute('xmlns',  'http://www.w3.org/2000/svg');
        var mainClone = cl.getElementById('sv-main');
        if (mainClone) mainClone.setAttribute('transform', 'translate(' + dx + ',' + dy + ')');

        var blob = new Blob(
            [new XMLSerializer().serializeToString(cl)],
            { type: 'image/svg+xml;charset=utf-8' }
        );
        var url = URL.createObjectURL(blob);
        var img = new Image();
        img.onload = function () {
            var c = document.createElement('canvas');
            c.width = imgW; c.height = imgH;
            var ctx = c.getContext('2d');
            ctx.fillStyle = '#f5f7fa';
            ctx.fillRect(0, 0, imgW, imgH);
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            var a = document.createElement('a');
            a.download = 'sets.png';
            a.href = c.toDataURL('image/png');
            a.click();
        };
        img.onerror = function () {
            URL.revokeObjectURL(url);
            alert('Export failed. Try a Chromium-based browser.');
        };
        img.src = url;
    });

    render(0);

    /* ── editor resize handle ────────────────────────────────────────── */
    (function () {
        var handle   = document.getElementById('sv-resize-handle');
        var editorEl = document.getElementById('sv-editor');
        var startY, startH;

        handle.addEventListener('mousedown', function (e) {
            startY = e.clientY;
            startH = editorEl.offsetHeight;
            handle.classList.add('sv-resizing');
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
            e.preventDefault();
        });

        function onMove(e) {
            var h = Math.max(60, startH + (e.clientY - startY));
            editorEl.style.height = h + 'px';
        }

        function onUp() {
            handle.classList.remove('sv-resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }
    })();
})();
