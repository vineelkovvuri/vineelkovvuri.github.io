(function () {
    var NW_MIN = 80, NW_PAD = 20;        // min node width, horizontal text padding
    var NH = 36, NR = 8;                 // node height, border-radius
    var V_GAP = NH + 40;                 // vertical spacing (level-to-level)

    /* ── text measurement ───────────────────────────────────────────── */
    var _measureCtx = (function () {
        var c = document.createElement('canvas');
        var ctx = c.getContext('2d');
        ctx.font = '500 13px \'Segoe UI\',system-ui,sans-serif';
        return ctx;
    })();

    function computeNodeWidth(label) {
        return Math.max(NW_MIN, Math.ceil(_measureCtx.measureText(label).width) + NW_PAD * 2);
    }
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
        if (ev.target === svgEl) { commitEdit(); setSelected(null); canvasEl.focus(); }
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
        var H_PAD = 20;   // minimum gap between the edges of adjacent nodes
        var childIds = new Set(edges.map(function (e) { return e.target; }));
        var roots = nodes.filter(function (n) { return !childIds.has(n.id); });
        if (roots.length === 0) return;

        var xCursor = 20;
        roots.forEach(function (root) {
            var hier = d3.hierarchy(buildHierData(root.id));

            // Attach node width to each hierarchy node for use in separation
            hier.each(function (d) {
                var n = nodeById(d.data.id);
                d.nw = n ? n.w : NW_MIN;
            });

            // nodeSize([1, V_GAP]): 1 unit = 1px in x.
            // separation returns the center-to-center distance in px for each pair:
            //   (halfWidth_a + halfWidth_b) + H_PAD
            d3.tree().nodeSize([1, V_GAP])
                .separation(function (a, b) {
                    return (a.nw + b.nw) / 2 + H_PAD;
                })(hier);

            // shift the whole tree so its leftmost node starts at xCursor
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
                n.x = d.x + shift - d.nw / 2;   // center → left edge
                n.y = d.y + 20;
                var right = d.x + shift + d.nw / 2;
                if (right > maxRight) maxRight = right;
            });
            xCursor = maxRight + 40;
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
            .on('click',    function (ev, d) { ev.stopPropagation(); commitEdit(); setSelected(d.id); canvasEl.focus(); })
            .on('dblclick', function (ev, d) { ev.stopPropagation(); startEdit(d.id); });

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

        // selection styles + dynamic width always applied immediately
        nm.select('.tv-nr')
            .attr('width',        function (d) { return d.w; })
            .attr('fill',         function (d) { return d.id === selectedId ? '#f0fff4' : '#ffffff'; })
            .attr('stroke',       function (d) { return d.id === selectedId ? '#27ae60' : '#b0c4de'; })
            .attr('stroke-width', function (d) { return d.id === selectedId ? 2.5 : 1.5; });

        nm.select('.tv-nt')
            .attr('x',    function (d) { return d.w / 2; })
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
        editEl.style.width      = (t.k * n.w) + 'px';
        editEl.style.height     = (t.k * NH) + 'px';
        editEl.style.fontSize   = Math.max(10, Math.round(13 * t.k)) + 'px';
        editEl.style.lineHeight = (t.k * NH - 2) + 'px';
    }

    function commitEdit() {
        if (editingId == null) return;
        var n = nodeById(editingId);
        if (n) {
            var v = editEl.value.trim();
            if (v) { n.label = v; n.w = computeNodeWidth(v); }
        }
        editingId = null;
        editEl.style.display = 'none';
        editEl.value = '';
        autoLayout();
        render(400);
        if (selectedId != null) {
            var s = nodeById(selectedId);
            if (s) statusEl.textContent = 'Selected: ' + s.label;
        }
    }

    editEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter')  { e.preventDefault(); commitEdit(); canvasEl.focus(); }
        if (e.key === 'Escape') { editingId = null; editEl.style.display = 'none'; render(0); canvasEl.focus(); }
        if (e.key === 'Tab') {
            e.preventDefault();
            var prevEditingId = editingId;
            commitEdit();                          // saves label, clears editingId
            canvasEl.focus();
            // navigate to prev/next sibling from the node that was just edited
            var sibs = getSiblings(prevEditingId);
            if (sibs) {
                var idx = sibs.indexOf(prevEditingId);
                var next = e.shiftKey
                    ? (idx > 0 ? sibs[idx - 1] : null)
                    : (idx < sibs.length - 1 ? sibs[idx + 1] : null);
                if (next != null) setSelected(next);
            }
        }
    });
    editEl.addEventListener('blur', function () { if (editingId != null) commitEdit(); });

    /* ── toolbar: Add Node ───────────────────────────────────────────── */
    document.getElementById('tv-btn-add').addEventListener('click', function () {
        var id = ++nodeSeq;
        var label = 'Node ' + id;
        nodes.push({ id: id, x: 0, y: 0, label: label, w: computeNodeWidth(label) });
        autoLayout();
        selectedId = id;
        updateStatus();
        render(400);
        canvasEl.focus();
    });

    /* ── toolbar: Add Child ──────────────────────────────────────────── */
    document.getElementById('tv-btn-child').addEventListener('click', function () {
        if (selectedId == null) { alert('Select a node first.'); return; }
        var p = nodeById(selectedId);
        if (!p) return;
        var cid = ++nodeSeq;
        var clabel = 'Node ' + cid;
        nodes.push({ id: cid, x: p.x, y: p.y, label: clabel, w: computeNodeWidth(clabel) });
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

        var PAD = 24; // padding around the tree in the exported image

        // compute bounding box of all nodes at their actual positions
        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach(function (n) {
            if (n.x           < minX) minX = n.x;
            if (n.y           < minY) minY = n.y;
            if (n.x + n.w     > maxX) maxX = n.x + n.w;
            if (n.y + NH      > maxY) maxY = n.y + NH;
        });

        var treeW = maxX - minX;
        var treeH = maxY - minY;
        var imgW  = Math.ceil(treeW + PAD * 2);
        var imgH  = Math.ceil(treeH + PAD * 2);

        // translate so (minX, minY) maps to (PAD, PAD)
        var dx = PAD - minX;
        var dy = PAD - minY;

        // clone SVG, set explicit size, and override the group transform to the export offset
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

    /* ── keyboard helpers ────────────────────────────────────────────── */
    function getSiblings(id) {
        // returns ordered sibling ids (children of the same parent), sorted by x
        var parentEdge = edges.find(function (e) { return e.target === id; });
        if (!parentEdge) return null;          // root — no siblings list
        var sibs = edges
            .filter(function (e) { return e.source === parentEdge.source; })
            .map(function (e) { return nodeById(e.target); })
            .filter(Boolean);
        sibs.sort(function (a, b) { return a.x - b.x; });
        return sibs.map(function (n) { return n.id; });
    }

    /* ── keyboard: Tab (BFS), arrows (tree nav), Alt+Down (add child) ── */
    canvasEl.addEventListener('keydown', function (ev) {
        if (editingId != null) return;       // don't intercept while editing a label

        /* ── F2: rename selected node ───────────────────────────────── */
        if (ev.key === 'F2') {
            ev.preventDefault();
            if (selectedId != null) startEdit(selectedId);
            return;
        }

        /* ── Delete: delete selected node and its descendants ───────── */
        if (ev.key === 'Delete') {
            ev.preventDefault();
            if (selectedId == null) return;
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
            return;
        }

        /* ── Alt+Down: add child of selected node ───────────────────── */
        if (ev.ctrlKey && ev.key === 'ArrowDown') {
            ev.preventDefault();
            if (selectedId == null) return;
            var p = nodeById(selectedId);
            if (!p) return;
            var cid = ++nodeSeq;
            var klabel = 'Node ' + cid;
            nodes.push({ id: cid, x: p.x, y: p.y, label: klabel, w: computeNodeWidth(klabel) });
            edges.push({ id: 'e' + (++edgeSeq), source: selectedId, target: cid });
            autoLayout();
            selectedId = cid;
            updateStatus();
            render(400);
            return;
        }

        if (ev.altKey || ev.metaKey) return;  // ignore other combos

        /* ── Ctrl+Left/Right: create sibling ────────────────────────── */
        if (ev.ctrlKey && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight')) {
            ev.preventDefault();
            if (selectedId == null) return;
            var parentEdge = edges.find(function (e) { return e.target === selectedId; });
            var sid = ++nodeSeq;
            var slabel = 'Node ' + sid;
            var ref = nodeById(selectedId);
            nodes.push({ id: sid, x: ref ? ref.x : 0, y: ref ? ref.y : 0,
                          label: slabel, w: computeNodeWidth(slabel) });
            if (parentEdge) {
                // splice the new sibling edge at the correct position so buildHierData
                // keeps the children in left→right order
                var parentSrc = parentEdge.source;
                var sibEdges  = edges.filter(function (e) { return e.source === parentSrc; });
                var otherEdges = edges.filter(function (e) { return e.source !== parentSrc; });
                var selPos = sibEdges.findIndex(function (e) { return e.target === selectedId; });
                var insertPos = ev.key === 'ArrowLeft' ? selPos : selPos + 1;
                var newEdge = { id: 'e' + (++edgeSeq), source: parentSrc, target: sid };
                sibEdges.splice(insertPos, 0, newEdge);
                edges = otherEdges.concat(sibEdges);
            }
            // if selected is a root, the new node is also a standalone root (no edge needed)
            autoLayout();
            selectedId = sid;
            updateStatus();
            render(400);
            return;
        }

        /* ── Arrow keys: tree navigation ────────────────────────────── */
        if (!ev.ctrlKey && ev.key === 'ArrowUp') {
            ev.preventDefault();
            if (selectedId == null) return;
            var pe = edges.find(function (e) { return e.target === selectedId; });
            if (pe) setSelected(pe.source);
            return;
        }

        if (!ev.ctrlKey && ev.key === 'ArrowDown') {
            ev.preventDefault();
            if (selectedId == null) return;
            var childEdges = edges.filter(function (e) { return e.source === selectedId; });
            if (childEdges.length === 0) return;
            // pick leftmost child by x position
            var firstChild = childEdges
                .map(function (e) { return nodeById(e.target); })
                .filter(Boolean)
                .reduce(function (a, b) { return a.x <= b.x ? a : b; });
            setSelected(firstChild.id);
            return;
        }

        if (!ev.ctrlKey && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight')) {
            ev.preventDefault();
            if (selectedId == null) return;
            var sibs = getSiblings(selectedId);
            if (!sibs) return;
            var idx = sibs.indexOf(selectedId);
            if (ev.key === 'ArrowLeft') {
                if (idx > 0) setSelected(sibs[idx - 1]);
            } else {
                if (idx < sibs.length - 1) setSelected(sibs[idx + 1]);
            }
            return;
        }

        /* ── Tab: BFS level-by-level ─────────────────────────────────── */
        if (ev.key !== 'Tab') return;
        if (nodes.length === 0) return;
        ev.preventDefault();

        var childSet = new Set(edges.map(function (e) { return e.target; }));
        var roots    = nodes.filter(function (n) { return !childSet.has(n.id); });

        var bfsOrder = [];
        var queue = roots.slice();
        var visited = new Set();
        while (queue.length) {
            var cur = queue.shift();
            if (visited.has(cur.id)) continue;
            visited.add(cur.id);
            bfsOrder.push(cur.id);
            edges
                .filter(function (e) { return e.source === cur.id; })
                .forEach(function (e) {
                    var child = nodeById(e.target);
                    if (child && !visited.has(child.id)) queue.push(child);
                });
        }
        nodes.forEach(function (n) { if (!visited.has(n.id)) bfsOrder.push(n.id); });
        if (bfsOrder.length === 0) return;

        var tidx = bfsOrder.indexOf(selectedId);
        var next = ev.shiftKey
            ? bfsOrder[(tidx - 1 + bfsOrder.length) % bfsOrder.length]
            : bfsOrder[(tidx + 1) % bfsOrder.length];
        setSelected(next);
    });

    render(0);
})();
