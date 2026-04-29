(function () {
    var NW = 130, NH = 44, NR = 8;       // node width, height, border-radius
    var H_GAP = NW + 40;                 // horizontal spacing (center-to-center)
    var V_GAP = NH + 80;                 // vertical spacing   (level-to-level)
    var nodes = [], edges = [];
    var selectedId = null, editingId = null;
    var nodeSeq = 0, edgeSeq = 0;

    var svgEl    = document.getElementById('tv-svg');
    var canvasEl = document.getElementById('tv-canvas-wrap');
    var editEl   = document.getElementById('tv-edit-input');
    var statusEl = document.getElementById('tv-status');

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
        if (ev.target === svgEl) { commitEdit(); setSelected(null); }
    });

    /* ── helpers ─────────────────────────────────────────────────────── */
    function nodeById(id) {
        return nodes.find(function (n) { return n.id === id; });
    }

    function edgePath(s, t) {
        var sx = s.x + NW / 2, sy = s.y + NH;
        var tx = t.x + NW / 2, ty = t.y;
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
        var childIds = new Set(edges.map(function (e) { return e.target; }));
        var roots = nodes.filter(function (n) { return !childIds.has(n.id); });
        if (roots.length === 0) return;

        var xCursor = 20;
        roots.forEach(function (root) {
            var hier = d3.hierarchy(buildHierData(root.id));
            d3.tree().nodeSize([H_GAP, V_GAP])
                .separation(function () { return 1; })(hier);

            var minX = Infinity;
            hier.each(function (d) { minX = Math.min(minX, d.x); });

            var shift = xCursor - minX;
            var maxX = -Infinity;
            hier.each(function (d) {
                var n = nodeById(d.data.id);
                if (!n) return;
                n.x = d.x + shift;
                n.y = d.y + 20;
                if (n.x > maxX) maxX = n.x;
            });
            xCursor = maxX + NW + H_GAP;
        });
    }

    /* ── selection ───────────────────────────────────────────────────── */
    function updateStatus() {
        if (selectedId != null) {
            var n = nodeById(selectedId);
            statusEl.textContent = 'Selected: ' + (n ? n.label : '');
            statusEl.classList.add('tv-sel');
        } else {
            statusEl.textContent = 'No node selected';
            statusEl.classList.remove('tv-sel');
        }
    }

    function setSelected(id) {
        selectedId = id;
        updateStatus();
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
                // new edges start collapsed at the source bottom so they can animate out
                var s = nodeById(d.source);
                if (!s) return '';
                var sx = s.x + NW / 2, sy = s.y + NH;
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
                // new child nodes start at their parent's position for a smooth entrance
                var pe = edges.find(function (e) { return e.target === d.id; });
                if (pe) {
                    var par = nodeById(pe.source);
                    if (par) return 'translate(' + par.x + ',' + par.y + ')';
                }
                return 'translate(' + d.x + ',' + d.y + ')';
            })
            .call(
                d3.drag()
                    .on('start', onDragStart)
                    .on('drag',  onDrag)
            )
            .on('click',    function (ev, d) { ev.stopPropagation(); commitEdit(); setSelected(d.id); })
            .on('dblclick', function (ev, d) { ev.stopPropagation(); startEdit(d.id); });

        ne.append('rect').attr('class', 'tv-nr')
            .attr('width', NW).attr('height', NH)
            .attr('rx', NR).attr('ry', NR)
            .attr('filter', 'url(#tv-shadow)');

        ne.append('text').attr('class', 'tv-nt')
            .attr('x', NW / 2).attr('y', NH / 2).attr('dy', '0.35em')
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

        // selection styles are always applied immediately (not transitioned)
        nm.select('.tv-nr')
            .attr('fill',         function (d) { return d.id === selectedId ? '#f0fff4' : '#ffffff'; })
            .attr('stroke',       function (d) { return d.id === selectedId ? '#27ae60' : '#b0c4de'; })
            .attr('stroke-width', function (d) { return d.id === selectedId ? 2.5 : 1.5; });

        nm.select('.tv-nt')
            .attr('fill', function (d) { return d.id === selectedId ? '#1e8449' : '#2c3e50'; })
            .text(function (d) { return d.id === editingId ? '' : d.label; });

        np.exit().remove();
    }

    /* ── drag ────────────────────────────────────────────────────────── */
    function onDragStart(ev, d) {
        ev.sourceEvent.stopPropagation();
        commitEdit();
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

    /* ── inline label editing ────────────────────────────────────────── */
    function startEdit(id) {
        var n = nodeById(id);
        if (!n) return;
        editingId = id;
        setSelected(id);
        placeEditInput(n);
        editEl.value = n.label;
        editEl.style.display = 'block';
        editEl.focus();
        editEl.select();
        render(0);
    }

    function placeEditInput(n) {
        var r = svgEl.getBoundingClientRect();
        var t = d3.zoomTransform(svgEl);
        editEl.style.left       = (r.left + t.x + t.k * n.x) + 'px';
        editEl.style.top        = (r.top  + t.y + t.k * n.y) + 'px';
        editEl.style.width      = (t.k * NW) + 'px';
        editEl.style.height     = (t.k * NH) + 'px';
        editEl.style.fontSize   = Math.max(10, Math.round(13 * t.k)) + 'px';
        editEl.style.lineHeight = (t.k * NH - 2) + 'px';
    }

    function commitEdit() {
        if (editingId == null) return;
        var n = nodeById(editingId);
        if (n) { var v = editEl.value.trim(); if (v) n.label = v; }
        editingId = null;
        editEl.style.display = 'none';
        editEl.value = '';
        render(0);
        if (selectedId != null) {
            var s = nodeById(selectedId);
            if (s) statusEl.textContent = 'Selected: ' + s.label;
        }
    }

    editEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter')  { e.preventDefault(); commitEdit(); }
        if (e.key === 'Escape') { editingId = null; editEl.style.display = 'none'; render(0); }
    });
    editEl.addEventListener('blur', function () { if (editingId != null) commitEdit(); });

    /* ── toolbar: Add Node ───────────────────────────────────────────── */
    document.getElementById('tv-btn-add').addEventListener('click', function () {
        var id = ++nodeSeq;
        nodes.push({ id: id, x: 0, y: 0, label: 'Node ' + id });
        autoLayout();
        selectedId = id;
        updateStatus();
        render(400);
    });

    /* ── toolbar: Add Child ──────────────────────────────────────────── */
    document.getElementById('tv-btn-child').addEventListener('click', function () {
        if (selectedId == null) { alert('Select a node first.'); return; }
        var p = nodeById(selectedId);
        if (!p) return;
        var cid = ++nodeSeq;
        nodes.push({ id: cid, x: p.x, y: p.y, label: 'Node ' + cid });
        edges.push({ id: 'e' + (++edgeSeq), source: selectedId, target: cid });
        autoLayout();
        selectedId = cid;
        updateStatus();
        render(400);
    });

    /* ── toolbar: Realign ────────────────────────────────────────────── */
    document.getElementById('tv-btn-realign').addEventListener('click', function () {
        autoLayout();
        render(400);
    });

    /* ── toolbar: Delete ─────────────────────────────────────────────── */
    document.getElementById('tv-btn-delete').addEventListener('click', function () {
        if (selectedId == null) { alert('Select a node first.'); return; }
        var del = new Set();
        (function collect(nid) {
            del.add(nid);
            edges.filter(function (e) { return e.source === nid; })
                 .forEach(function (e) { collect(e.target); });
        })(selectedId);
        nodes = nodes.filter(function (n) { return !del.has(n.id); });
        edges = edges.filter(function (e) { return !del.has(e.source) && !del.has(e.target); });
        selectedId = null;
        autoLayout();
        updateStatus();
        render(400);
    });

    /* ── toolbar: Export PNG ─────────────────────────────────────────── */
    document.getElementById('tv-btn-export').addEventListener('click', function () {
        commitEdit();
        if (nodes.length === 0) { alert('Nothing to export.'); return; }
        var w = svgEl.clientWidth, h = svgEl.clientHeight;
        var cl = svgEl.cloneNode(true);
        cl.setAttribute('width', w);
        cl.setAttribute('height', h);
        cl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        var blob = new Blob(
            [new XMLSerializer().serializeToString(cl)],
            { type: 'image/svg+xml;charset=utf-8' }
        );
        var url = URL.createObjectURL(blob);
        var img = new Image();
        img.onload = function () {
            var c = document.createElement('canvas');
            c.width = w; c.height = h;
            var ctx = c.getContext('2d');
            ctx.fillStyle = '#f5f7fa';
            ctx.fillRect(0, 0, w, h);
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
})();
