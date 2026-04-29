(function () {
    var NW_MIN = 80, NW_PAD = 20;
    var NH = 36, NR = 8;
    var V_GAP = NH + 40;

    /* ── text measurement ───────────────────────────────────────────── */
    var _measureCtx = (function () {
        var c = document.createElement('canvas');
        var ctx = c.getContext('2d');
        ctx.font = "500 13px 'Segoe UI',system-ui,sans-serif";
        return ctx;
    })();

    function computeNodeWidth(label) {
        return Math.max(NW_MIN, Math.ceil(_measureCtx.measureText(label).width) + NW_PAD * 2);
    }

    var nodes = [], edges = [];
    var selectedId = null;
    var edgeSeq = 0;

    var svgEl    = document.getElementById('tv-svg');
    var canvasEl = document.getElementById('tv-canvas-wrap');

    var svg      = d3.select(svgEl);
    var mainGrp  = svg.select('#tv-main');
    var linksGrp = mainGrp.select('#tv-links');
    var nodesGrp = mainGrp.select('#tv-nodes');

    /* ── zoom / pan ──────────────────────────────────────────────────── */
    var zoom = d3.zoom().scaleExtent([0.1, 4])
        .on('start', function () { canvasEl.classList.add('tv-panning'); })
        .on('zoom',  function (ev) { mainGrp.attr('transform', ev.transform); })
        .on('end',   function () { canvasEl.classList.remove('tv-panning'); });
    svg.call(zoom);

    svg.on('click', function (ev) {
        if (ev.target === svgEl) setSelected(null);
    });

    /* ── helpers ─────────────────────────────────────────────────────── */
    function nodeById(id) {
        return nodes.find(function (n) { return n.id === id; });
    }

    function edgePath(s, t) {
        var sx = s.x + s.w / 2, sy = s.y + NH;
        var tx = t.x + t.w / 2, ty = t.y;
        var my = (sy + ty) / 2;
        return 'M' + sx + ',' + sy +
               'C' + sx + ',' + my + ' ' + tx + ',' + my + ' ' + tx + ',' + ty;
    }

    /* ── auto layout ─────────────────────────────────────────────────── */
    function buildHierData(id) {
        var kids = edges
            .filter(function (e) { return e.source === id; })
            .map(function (e) { return buildHierData(e.target); });
        return kids.length ? { id: id, children: kids } : { id: id };
    }

    function autoLayout() {
        var H_PAD = 20;
        var childIds = new Set(edges.map(function (e) { return e.target; }));
        var roots = nodes.filter(function (n) { return !childIds.has(n.id); });
        if (roots.length === 0) return;

        var xCursor = 20;
        roots.forEach(function (root) {
            var hier = d3.hierarchy(buildHierData(root.id));

            hier.each(function (d) {
                var n = nodeById(d.data.id);
                d.nw = n ? n.w : NW_MIN;
            });

            d3.tree().nodeSize([1, V_GAP])
                .separation(function (a, b) {
                    return (a.nw + b.nw) / 2 + H_PAD;
                })(hier);

            var minLeft = Infinity;
            hier.each(function (d) {
                var left = d.x - d.nw / 2;
                if (left < minLeft) minLeft = left;
            });
            var shift = xCursor - minLeft;

            var maxRight = -Infinity;
            hier.each(function (d) {
                var n = nodeById(d.data.id);
                if (!n) return;
                n.x = d.x + shift - d.nw / 2;
                n.y = d.y + 20;
                var right = d.x + shift + d.nw / 2;
                if (right > maxRight) maxRight = right;
            });
            xCursor = maxRight + 40;
        });
    }

    /* ── selection ───────────────────────────────────────────────────── */
    function setSelected(id) {
        selectedId = id;
        render(0);
    }

    /* ── render ──────────────────────────────────────────────────────── */
    function render(duration) {
        duration = duration || 0;

        /* edges */
        var ep = linksGrp.selectAll('path.tv-e').data(edges, function (d) { return d.id; });

        var epEnter = ep.enter().append('path').attr('class', 'tv-e')
            .attr('fill', 'none')
            .attr('stroke', '#95a5a6')
            .attr('stroke-width', 2)
            .attr('d', function (d) {
                var s = nodeById(d.source);
                if (!s) return '';
                var sx = s.x + s.w / 2, sy = s.y + NH;
                return 'M' + sx + ',' + sy + 'C' + sx + ',' + sy + ' ' + sx + ',' + sy + ' ' + sx + ',' + sy;
            });

        var epAll = epEnter.merge(ep);
        if (duration > 0) {
            epAll.transition().duration(duration).ease(d3.easeCubicInOut)
                .attrTween('d', function (d) {
                    var s = nodeById(d.source), t = nodeById(d.target);
                    if (!s || !t) return function () { return ''; };
                    var target  = edgePath(s, t);
                    var current = d3.select(this).attr('d') || target;
                    return d3.interpolateString(current, target);
                });
        } else {
            epAll.attr('d', function (d) {
                var s = nodeById(d.source), t = nodeById(d.target);
                return s && t ? edgePath(s, t) : '';
            });
        }
        ep.exit().remove();

        /* nodes */
        var np = nodesGrp.selectAll('g.tv-n').data(nodes, function (d) { return d.id; });

        var ne = np.enter().append('g').attr('class', 'tv-n').attr('cursor', 'pointer')
            .attr('transform', function (d) {
                var pe = edges.find(function (e) { return e.target === d.id; });
                if (pe) {
                    var par = nodeById(pe.source);
                    if (par) return 'translate(' + par.x + ',' + par.y + ')';
                }
                return 'translate(' + d.x + ',' + d.y + ')';
            })
            .call(d3.drag().on('start', onDragStart).on('drag', onDrag))
            .on('click', function (ev, d) { ev.stopPropagation(); setSelected(d.id); });

        ne.append('rect').attr('class', 'tv-nr')
            .attr('height', NH)
            .attr('rx', NR).attr('ry', NR)
            .attr('filter', 'url(#tv-shadow)');

        ne.append('text').attr('class', 'tv-nt')
            .attr('y', NH / 2).attr('dy', '0.35em')
            .attr('text-anchor', 'middle')
            .attr('font-size', '13px').attr('font-weight', '500')
            .attr('font-family', "'Segoe UI',system-ui,sans-serif")
            .attr('pointer-events', 'none');

        var nm = ne.merge(np);

        if (duration > 0) {
            nm.transition().duration(duration).ease(d3.easeCubicInOut)
                .attr('transform', function (d) { return 'translate(' + d.x + ',' + d.y + ')'; });
        } else {
            nm.attr('transform', function (d) { return 'translate(' + d.x + ',' + d.y + ')'; });
        }

        nm.select('.tv-nr')
            .attr('width',        function (d) { return d.w; })
            .attr('fill',         function (d) { return d.id === selectedId ? '#f0fff4' : '#ffffff'; })
            .attr('stroke',       function (d) { return d.id === selectedId ? '#27ae60' : '#b0c4de'; })
            .attr('stroke-width', function (d) { return d.id === selectedId ? 2.5 : 1.5; });

        nm.select('.tv-nt')
            .attr('x',    function (d) { return d.w / 2; })
            .attr('fill', function (d) { return d.id === selectedId ? '#1e8449' : '#2c3e50'; })
            .text(function (d) { return d.label; });

        np.exit().remove();
    }

    /* ── drag ────────────────────────────────────────────────────────── */
    function onDragStart(ev, d) {
        ev.sourceEvent.stopPropagation();
        setSelected(d.id);
        d3.select(this).raise();
    }

    function onDrag(ev, d) {
        var k = d3.zoomTransform(svgEl).k;
        d.x += ev.dx / k;
        d.y += ev.dy / k;
        d3.select(this).attr('transform', 'translate(' + d.x + ',' + d.y + ')');
        linksGrp.selectAll('path.tv-e')
            .filter(function (e) { return e.source === d.id || e.target === d.id; })
            .attr('d', function (e) {
                var s = nodeById(e.source), t = nodeById(e.target);
                return s && t ? edgePath(s, t) : '';
            });
    }

    /* ── parse indented text ─────────────────────────────────────────── */
    function parseTree(text) {
        var lines = text.split('\n');
        var newNodes = [], newEdges = [];
        var seq = 0;
        edgeSeq = 0;
        var stack = []; // { id, indent }

        lines.forEach(function (line) {
            if (line.trim() === '') return;
            var indent = line.match(/^(\s*)/)[1].length;
            var label  = line.trim();
            var id = ++seq;
            newNodes.push({ id: id, x: 0, y: 0, label: label, w: computeNodeWidth(label) });

            // pop stack until we find a node with strictly smaller indent
            while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
                stack.pop();
            }
            if (stack.length > 0) {
                newEdges.push({ id: 'e' + (++edgeSeq), source: stack[stack.length - 1].id, target: id });
            }
            stack.push({ id: id, indent: indent });
        });

        nodes = newNodes;
        edges = newEdges;
        selectedId = null;
    }

    /* ── draw from editor text ───────────────────────────────────────── */
    function drawFromText() {
        if (!monacoEditor) return;
        var text = monacoEditor.getValue();
        if (!text.trim()) return;
        parseTree(text);
        autoLayout();
        render(400);
    }

    /* ── Monaco editor ───────────────────────────────────────────────── */
    var monacoEditor = null;
    var DEFAULT_TEXT = [
        'Root',
        '    Node 1',
        '        Child 1',
        '        Child 2',
        '    Node 2',
        '        Child 3'
    ].join('\n');

    require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' } });
    require(['vs/editor/editor.main'], function () {
        monacoEditor = monaco.editor.create(document.getElementById('tv-editor'), {
            value: DEFAULT_TEXT,
            language: 'plaintext',
            theme: 'vs',
            minimap:               { enabled: false },
            lineNumbers:           'off',
            scrollBeyondLastLine:  false,
            wordWrap:              'off',
            renderLineHighlight:   'none',
            renderWhitespace:      'all',
            occurrencesHighlight:  'on',
            selectionHighlight:    false,
            overviewRulerLanes:    0,
            hideCursorInOverviewRuler: true,
            scrollbar:             { vertical: 'auto', horizontal: 'hidden' },
            automaticLayout:       true,
            tabSize:               4,
            insertSpaces:          true,
        });

        // Ctrl+Enter to draw
        monacoEditor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
            function () { drawFromText(); }
        );

        // Auto-draw the default tree on load
        drawFromText();
    });

    /* ── Draw button ─────────────────────────────────────────────────── */
    document.getElementById('tv-btn-draw').addEventListener('click', drawFromText);

    /* ── Export PNG ──────────────────────────────────────────────────── */
    document.getElementById('tv-btn-export').addEventListener('click', function () {
        if (nodes.length === 0) { alert('Nothing to export.'); return; }

        var PAD = 24;
        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach(function (n) {
            if (n.x       < minX) minX = n.x;
            if (n.y       < minY) minY = n.y;
            if (n.x + n.w > maxX) maxX = n.x + n.w;
            if (n.y + NH  > maxY) maxY = n.y + NH;
        });

        var imgW = Math.ceil(maxX - minX + PAD * 2);
        var imgH = Math.ceil(maxY - minY + PAD * 2);
        var dx   = PAD - minX;
        var dy   = PAD - minY;

        var cl = svgEl.cloneNode(true);
        cl.setAttribute('width',  imgW);
        cl.setAttribute('height', imgH);
        cl.setAttribute('xmlns',  'http://www.w3.org/2000/svg');
        var mainClone = cl.getElementById('tv-main');
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
            a.download = 'tree.png';
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
        var handle   = document.getElementById('tv-resize-handle');
        var editorEl = document.getElementById('tv-editor');
        var startY, startH;

        handle.addEventListener('mousedown', function (e) {
            startY = e.clientY;
            startH = editorEl.offsetHeight;
            handle.classList.add('tv-resizing');
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
            handle.classList.remove('tv-resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }
    })();
})();