/* EDK2 BUILD_REPORT.txt viewer
 * Vanilla JS, no dependencies. Parses the report into a tree and renders sections.
 */
(function () {
  "use strict";

  // ---- DOM refs ----
  var dropZone = document.getElementById("brDropZone");
  var fileInput = document.getElementById("brFileInput");
  var fileInfo = document.getElementById("brFileInfo");
  var treeEl = document.getElementById("brTree");
  var treeScroll = document.getElementById("brTreeScroll");
  var treeFilter = document.getElementById("brTreeFilter");
  var filterMode = document.getElementById("brFilterMode");
  var treeCase = document.getElementById("brTreeCase");
  var treeWord = document.getElementById("brTreeWord");
  var searchCase = document.getElementById("brSearchCase");
  var searchWord = document.getElementById("brSearchWord");
  var resizer = document.getElementById("brResizer");
  var treePanel = document.getElementById("brTreePanel");
  var detailHeader = document.getElementById("brDetailHeader");
  var detailTitle = document.getElementById("brDetailTitle");
  var crumbEl = document.getElementById("brCrumb");
  var detailBody = document.getElementById("brDetailBody");
  var welcome = document.getElementById("brWelcome");
  var contentSearch = document.getElementById("brContentSearch");
  var searchCount = document.getElementById("brSearchCount");
  var searchPrev = document.getElementById("brSearchPrev");
  var searchNext = document.getElementById("brSearchNext");
  var copyBtn = document.getElementById("brCopyBtn");

  var nodeMap = {};   // id -> node
  var idCounter = 0;
  var selectedId = null;
  var searchMatches = [];
  var searchIndex = -1;

  // ---- Marker predicates ----
  function isSecStart(l) { return /^>=+<\s*$/.test(l); }
  function isSecEnd(l) { return /^<=+>\s*$/.test(l); }
  function isSubStart(l) { return /^>-+<\s*$/.test(l); }
  function isSubEnd(l) { return /^<-+>\s*$/.test(l); }
  function isMarker(l) { return isSecStart(l) || isSecEnd(l) || isSubStart(l) || isSubEnd(l); }

  // ---- Search matcher helpers (match-case / whole-word) ----
  function isOn(btn) { return !!btn && btn.classList.contains("active"); }
  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  // Returns a predicate (text) -> boolean honoring case / whole-word options.
  function makeMatcher(q, caseSensitive, wholeWord) {
    if (wholeWord) {
      var pre = /^\w/.test(q) ? "\\b" : "";
      var post = /\w$/.test(q) ? "\\b" : "";
      var re = new RegExp(pre + escapeRe(q) + post, caseSensitive ? "" : "i");
      return function (t) { return re.test(t); };
    }
    if (caseSensitive) return function (t) { return t.indexOf(q) !== -1; };
    var ql = q.toLowerCase();
    return function (t) { return t.toLowerCase().indexOf(ql) !== -1; };
  }

  // Returns a global RegExp for highlighting, honoring case / whole-word options.
  function buildSearchRegex(q, caseSensitive, wholeWord) {
    var pre = wholeWord && /^\w/.test(q) ? "\\b" : "";
    var post = wholeWord && /\w$/.test(q) ? "\\b" : "";
    return new RegExp(pre + escapeRe(q) + post, "g" + (caseSensitive ? "" : "i"));
  }

  function firstNonEmpty(arr) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].trim() !== "") return arr[i].trim();
    }
    return "";
  }

  // Trim leading/trailing blank and plain underline (====/----) lines
  function trimContent(arr) {
    var start = 0, end = arr.length;
    while (start < end && (arr[start].trim() === "" || /^[=-]+$/.test(arr[start].trim()))) start++;
    while (end > start && (arr[end - 1].trim() === "" || /^[=-]+$/.test(arr[end - 1].trim()))) end--;
    return arr.slice(start, end);
  }

  // ---- Parser ----
  function parse(text) {
    var lines = text.split(/\r?\n/);
    var i = 0, n = lines.length;

    // Preamble (Platform Summary) = everything before first section marker
    var preamble = [];
    while (i < n && !isSecStart(lines[i])) { preamble.push(lines[i]); i++; }

    var topSections = [];
    while (i < n) {
      if (isSecStart(lines[i])) {
        i++;
        var r = parseSection(lines, i, n);
        topSections.push(r.node);
        i = r.i;
      } else {
        i++;
      }
    }
    return { preamble: preamble, topSections: topSections };
  }

  // A section ends at the next section-end marker. It may contain balanced
  // sub-sections (>---< ... <--->) and degenerate section-start headers
  // (>===< with no matching close, as EDK2 emits inside modules).
  function parseSection(lines, i, n) {
    var node = { title: "", content: [], children: [], kind: "section" };
    var headerDone = false;
    while (i < n) {
      var l = lines[i];
      if (isSecEnd(l)) { i++; break; }
      if (isSubStart(l)) { headerDone = true; i++; var s = parseSub(lines, i, n); node.children.push(s.node); i = s.i; continue; }
      if (isSecStart(l)) { headerDone = true; i++; var d = parseDegenerate(lines, i, n); node.children.push(d.node); i = d.i; continue; }
      if (!headerDone) node.content.push(l);
      i++;
    }
    node.title = firstNonEmpty(node.content);
    node.content = trimContent(node.content);
    return { node: node, i: i };
  }

  function parseSub(lines, i, n) {
    var node = { title: "", content: [], children: [], kind: "sub" };
    while (i < n) {
      var l = lines[i];
      if (isSubEnd(l)) { i++; break; }
      if (isSubStart(l)) { i++; var s = parseSub(lines, i, n); node.children.push(s.node); i = s.i; continue; }
      node.content.push(l);
      i++;
    }
    node.title = firstNonEmpty(node.content);
    return { node: node, i: i };
  }

  // Degenerate header: content until the next marker of any kind (not consumed).
  function parseDegenerate(lines, i, n) {
    var node = { title: "", content: [], children: [], kind: "subheader" };
    while (i < n && !isMarker(lines[i])) { node.content.push(lines[i]); i++; }
    node.title = firstNonEmpty(node.content);
    return { node: node, i: i };
  }

  // ---- Helpers to read "Key:  value" fields from content ----
  function field(content, key) {
    var re = new RegExp("^\\s*" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*:\\s*(.*)$");
    for (var i = 0; i < content.length; i++) {
      var m = content[i].match(re);
      if (m) return m[1].trim();
    }
    return "";
  }

  // ---- Build display tree from parsed sections ----
  function makeNode(label, opts) {
    opts = opts || {};
    var node = {
      id: "n" + (idCounter++),
      label: label,
      icon: opts.icon || "",
      content: opts.content || null,     // array of lines OR null
      children: opts.children || [],
      badge: opts.badge || "",
      render: opts.render || "auto",     // 'auto' | 'kv' | 'pre' | 'overview'
      meta: opts.meta || null
    };
    nodeMap[node.id] = node;
    return node;
  }

  function buildTree(parsed) {
    nodeMap = {};
    idCounter = 0;
    var roots = [];

    // 1) Platform Summary (preamble)
    var pre = trimContent(parsed.preamble);
    if (pre.length) {
      roots.push(makeNode("Platform Summary", { icon: "📄", content: pre, render: "kv" }));
    }

    var platformSections = [];
    var firmwareDevices = [];
    var modules = [];

    parsed.topSections.forEach(function (sec) {
      var t = sec.title || "";
      if (t === "Module Summary") {
        modules.push(sec);
      } else if (/^Firmware Device/i.test(t)) {
        firmwareDevices.push(sec);
      } else {
        platformSections.push(sec);
      }
    });

    // 2) Platform PCDs group
    if (platformSections.length) {
      var pchildren = platformSections.map(function (sec) {
        return makeNode(sec.title || "(section)", {
          icon: "⚙️",
          content: sec.content,
          children: sec.children.map(subToNode),
          render: "pre"
        });
      });
      roots.push(makeNode("Platform PCDs", { icon: "⚙️", children: pchildren, badge: String(platformSections.length) }));
    }

    // 3) Firmware Devices group
    if (firmwareDevices.length) {
      var fchildren = firmwareDevices.map(function (sec) {
        var name = field(sec.content, "FD Name") || sec.title;
        var regions = sec.children.map(function (reg) {
          var rt = reg.title || "Region";
          var extra = field(reg.content, "Fv Name") || field(reg.content, "Type");
          var rlabel = rt + (extra ? " — " + extra : "");
          return makeNode(rlabel, { icon: "▪️", content: reg.content, render: "pre" });
        });
        return makeNode(name, {
          icon: "💽",
          content: sec.content,
          children: regions,
          render: "kv",
          badge: regions.length ? String(regions.length) : ""
        });
      });
      roots.push(makeNode("Firmware Devices", { icon: "💾", children: fchildren, badge: String(firmwareDevices.length) }));
    }

    // 4) Modules group
    if (modules.length) {
      var mchildren = modules.map(function (sec) {
        var name = field(sec.content, "Module Name") || sec.title;
        var arch = field(sec.content, "Module Arch");
        var dtype = field(sec.content, "Driver Type");
        var subs = sec.children.map(subToNode);
        return makeNode(name, {
          icon: "📦",
          content: sec.content,
          children: subs,
          render: "kv",
          badge: arch || "",
          meta: {
            name: name,
            arch: arch,
            inf: field(sec.content, "Module INF Path"),
            guid: field(sec.content, "File GUID"),
            size: field(sec.content, "Size"),
            type: dtype,
            buildTime: field(sec.content, "Module Build Time")
          }
        });
      });
      mchildren.sort(function (a, b) {
        return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
      });
      roots.push(makeNode("Modules", { icon: "📦", children: mchildren, badge: String(modules.length) }));
    }

    return roots;
  }

  function subToNode(sub) {
    var t = sub.title || "(section)";
    var icon = "•";
    if (/^PCD/i.test(t)) icon = "🔧";
    else if (/^Library/i.test(t)) icon = "📚";
    else if (/DEPEX|Dependency Expression/i.test(t)) icon = "🔗";
    else if (/Build Flags/i.test(t)) icon = "🚩";
    else if (/Conditional Directives/i.test(t)) icon = "🔀";
    else if (/PCDs not used/i.test(t)) icon = "🚫";
    else if (/Platform Configuration Database/i.test(t)) icon = "🗄️";
    return makeNode(t, {
      icon: icon,
      content: sub.content,
      children: sub.children.map(subToNode),
      render: "pre"
    });
  }

  // ---- Tree rendering ----
  function renderTree(roots) {
    treeEl.innerHTML = "";
    roots.forEach(function (node) {
      treeEl.appendChild(renderTreeNode(node, 0));
    });
    // Auto-expand the top-level roots
    Array.prototype.forEach.call(treeEl.children, function (li) {
      var arrow = li.querySelector(":scope > .br-tree-label > .br-tree-arrow");
      var kids = li.querySelector(":scope > .br-tree-children");
      if (arrow && kids && !arrow.classList.contains("leaf")) {
        if (!li._rendered && li._node) {
          var frag = document.createDocumentFragment();
          li._node.children.forEach(function (c) { frag.appendChild(renderTreeNode(c, 0)); });
          kids.appendChild(frag);
          li._rendered = true;
        }
        arrow.classList.add("expanded");
        kids.classList.add("open");
      }
    });
  }

  function renderTreeNode(node, depth) {
    var li = document.createElement("li");

    var label = document.createElement("div");
    label.className = "br-tree-label";
    label.dataset.id = node.id;

    var arrow = document.createElement("span");
    arrow.className = "br-tree-arrow" + (node.children.length ? "" : " leaf");
    arrow.textContent = "▶";
    label.appendChild(arrow);

    var text = document.createElement("span");
    text.className = "br-tree-text";
    text.textContent = (node.icon ? node.icon + " " : "") + node.label;
    text.title = node.label;
    label.appendChild(text);

    if (node.badge) {
      var badge = document.createElement("span");
      badge.className = "br-tree-badge";
      badge.textContent = node.badge;
      label.appendChild(badge);
    }

    li.appendChild(label);

    var childrenUl = null;
    if (node.children.length) {
      childrenUl = document.createElement("ul");
      childrenUl.className = "br-tree-children";
      li._rendered = false;
      // Lazy-render children on first expand for performance
      li._node = node;
      li._childrenUl = childrenUl;
      li.appendChild(childrenUl);
    }

    label.addEventListener("click", function (e) {
      if (node.children.length && (e.target === arrow || label.dataset.toggle === "1")) {
        toggle(li, arrow, childrenUl, node);
        return;
      }
      selectNode(node, label);
      // Also expand when clicking a parent's label body
      if (node.children.length && !childrenUl.classList.contains("open")) {
        toggle(li, arrow, childrenUl, node);
      }
    });
    arrow.addEventListener("click", function (e) {
      e.stopPropagation();
      toggle(li, arrow, childrenUl, node);
    });

    return li;
  }

  function toggle(li, arrow, childrenUl, node) {
    if (!childrenUl) return;
    if (!li._rendered) {
      var frag = document.createDocumentFragment();
      node.children.forEach(function (c) { frag.appendChild(renderTreeNode(c, 0)); });
      childrenUl.appendChild(frag);
      li._rendered = true;
    }
    var open = childrenUl.classList.toggle("open");
    arrow.classList.toggle("expanded", open);
  }

  function selectNode(node, labelEl) {
    selectedId = node.id;
    // clear old selection
    var prev = treeEl.querySelector(".br-tree-label.selected");
    if (prev) prev.classList.remove("selected");
    if (labelEl) labelEl.classList.add("selected");
    else {
      var l = treeEl.querySelector('.br-tree-label[data-id="' + node.id + '"]');
      if (l) l.classList.add("selected");
    }
    renderDetail(node);
  }

  // ---- Detail rendering ----
  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Light per-line syntax highlighting for report content.
  function highlightLine(line) {
    var out = esc(line);
    // GUID token space lines (start with 'g' + Guid)
    if (/^g[A-Za-z0-9_]+Guid\s*$/.test(line)) {
      return '<span class="br-tok-guid">' + out + "</span>";
    }
    // separator / underline
    if (/^\s*[=-]{5,}\s*$/.test(line)) {
      return '<span class="br-tok-sep">' + out + "</span>";
    }
    // Override flag prefix (*B *P *F *M) at start (after optional spaces)
    out = out.replace(/^(\s*)(\*[BPFM])(\s)/, '$1<span class="br-tok-flag">$2</span>$3');
    // "Key:  value" -> color the key
    out = out.replace(/^(\s*(?:\*[BPFM]\s+)?[\w][\w .()\/\\-]*?)(\s*:\s)/, function (m, k, sep) {
      // avoid double-wrapping if flag span already inserted before key; k may contain span
      return '<span class="br-tok-key">' + k + "</span>" + sep;
    });
    // PCD storage types
    out = out.replace(/\b(FIXED|PATCH|FLAG|DYN|DYNEX|DEX|DYNHII|DYNVPD)\b/g, '<span class="br-tok-type">$1</span>');
    // hex numbers
    out = out.replace(/\b(0x[0-9A-Fa-f_]+)\b/g, '<span class="br-tok-hex">$1</span>');
    return out;
  }

  function renderKV(content) {
    // Render leading "Key: value" lines as a table, remaining lines as pre.
    // Leading non-KV, non-blank lines (e.g. the section title) become a heading.
    var heading = [];
    var kv = [];
    var rest = [];
    var stillKV = true;
    content.forEach(function (line) {
      var m = stillKV ? line.match(/^\s*([\w][\w .()\/\\-]*?)\s*:\s{1,}(.*)$/) : null;
      if (m && line.trim() !== "") {
        kv.push([m[1].trim(), m[2].trim()]);
      } else if (line.trim() === "" && stillKV) {
        // skip blanks within header
      } else if (stillKV && kv.length === 0) {
        // leading heading line(s) before the first key/value pair
        heading.push(line.trim());
      } else {
        stillKV = false;
        rest.push(line);
      }
    });
    var html = "";
    if (heading.length) {
      html += '<div class="br-kv" style="padding-bottom:0;font-weight:bold;color:#24292e">' + esc(heading.join(" ")) + "</div>";
    }
    if (kv.length) {
      html += '<div class="br-kv"><table>';
      kv.forEach(function (p) {
        html += "<tr><td class='k'>" + esc(p[0]) + "</td><td class='v'>" + esc(p[1]) + "</td></tr>";
      });
      html += "</table></div>";
    }
    var restTrim = trimContent(rest);
    if (restTrim.length) html += renderPre(restTrim);
    if (!html) html = '<div class="br-placeholder">(no additional content)</div>';
    return html;
  }

  function renderPre(content) {
    var big = content.length > 6000;
    var body;
    if (big) {
      body = esc(content.join("\n"));
    } else {
      body = content.map(highlightLine).join("\n");
    }
    return '<pre class="br-pre">' + body + "</pre>";
  }

  function renderOverview(node) {
    var html = '<div class="br-overview"><table><thead><tr><th>Name</th><th></th></tr></thead><tbody>';
    node.children.forEach(function (c) {
      var badge = c.badge ? " <span style='color:#888'>[" + esc(c.badge) + "]</span>" : "";
      html += "<tr><td><a data-goto='" + c.id + "'>" + esc((c.icon ? c.icon + " " : "") + c.label) + "</a></td><td>" + badge + "</td></tr>";
    });
    html += "</tbody></table></div>";
    return html;
  }

  // ---- Library page (entries sorted by library name) ----
  // A module's "Library" sub-section lists, per instance, an .inf path line
  // followed by a "{LibraryClass:  ... Time = Xms}" line (the trailing details
  // vary: "C = ...", "Depex = ...", etc.). We do NOT parse those details; we
  // simply keep each entry's raw lines intact and reorder entries by name so
  // the list is easy to navigate.
  function isLibraryPage(node) {
    return /^Library\b/i.test(node.label || "");
  }

  function sortLibraryContent(lines) {
    // Preamble = header/separator lines before the first .inf path line.
    var firstPath = -1;
    for (var i = 0; i < lines.length; i++) {
      if (/\.inf\s*$/i.test(lines[i])) { firstPath = i; break; }
    }
    if (firstPath === -1) return null;
    var preamble = lines.slice(0, firstPath);
    var rest = lines.slice(firstPath);

    // Group into entries, each ending at a "{Name ...}" line.
    var entries = [];
    var buf = [];
    for (var j = 0; j < rest.length; j++) {
      buf.push(rest[j]);
      var m = rest[j].trim().match(/^\{\s*([^:}]+?)\s*[:}]/);
      if (m) { entries.push({ name: m[1].trim(), lines: buf }); buf = []; }
    }
    var trailing = buf; // any leftover lines without a closing "{...}"
    if (entries.length < 2) return null; // nothing meaningful to reorder

    entries.sort(function (a, b) {
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });

    var out = preamble.slice();
    entries.forEach(function (e) { out = out.concat(e.lines); });
    return out.concat(trailing);
  }

  var currentContentText = "";

  // True when the node is a PCD-related page (module PCD sub-section or a
  // platform PCD section), where the *B/*P/*F/*M override flags appear.
  function isPcdPage(node) {
    if (/^PCD$/i.test(node.label)) return true;
    if (/Conditional Directives|PCDs not used|Platform Configuration Database/i.test(node.label)) return true;
    var content = node.content || [];
    for (var i = 0; i < content.length; i++) {
      if (/^\s*\*[BPFM]\s/.test(content[i])) return true;
    }
    return false;
  }

  function renderFlagLegend() {
    return (
      '<div class="br-legend">' +
      '<div class="br-legend-title">Conditional Directives used by the build system</div>' +
      "<div><code>*B</code> &mdash; PCD override in the build option</div>" +
      "<div><code>*P</code> &mdash; Platform scoped PCD override in DSC file</div>" +
      "<div><code>*F</code> &mdash; Platform scoped PCD override in FDF file</div>" +
      "<div><code>*M</code> &mdash; Module scoped PCD override</div>" +
      "</div>"
    );
  }

  function renderDetail(node) {
    if (welcome) welcome.style.display = "none";
    detailHeader.style.display = "flex";
    detailTitle.textContent = (node.icon ? node.icon + " " : "") + node.label;
    crumbEl.textContent = node.badge && node.render !== "kv" ? "" : "";

    var html = "";
    var hasContent = node.content && trimContent(node.content).length;

    if (isLibraryPage(node) && hasContent) {
      var libContent = trimContent(node.content);
      var sorted = sortLibraryContent(libContent);
      html += renderPre(sorted || libContent);
    } else if (node.render === "kv" && hasContent) {
      html += renderKV(trimContent(node.content));
    } else if (hasContent) {
      html += renderPre(trimContent(node.content));
    }

    if (node.children.length && !hasContent) {
      html += renderOverview(node);
    } else if (node.children.length && node.render === "kv") {
      // For parent nodes with metadata, also list children as an overview.
      html += renderOverview(node);
    }

    if (!html) html = '<div class="br-placeholder">(empty section)</div>';

    if (isPcdPage(node)) html += renderFlagLegend();

    detailBody.innerHTML = html;
    detailBody.scrollTop = 0;
    currentContentText = node.content ? trimContent(node.content).join("\n") : "";

    // wire overview links
    Array.prototype.forEach.call(detailBody.querySelectorAll("a[data-goto]"), function (a) {
      a.addEventListener("click", function () {
        var target = nodeMap[a.dataset.goto];
        if (target) gotoNode(target);
      });
    });

    // reset content search
    resetSearch();
    if (contentSearch.value.trim()) runContentSearch();
  }

  // Expand ancestors in the tree and select a node by id.
  function gotoNode(node) {
    expandToNode(node.id);
    var label = treeEl.querySelector('.br-tree-label[data-id="' + node.id + '"]');
    selectNode(node, label);
    if (label) label.scrollIntoView({ block: "nearest" });
  }

  // Find the DOM path to a node id, expanding lazily-rendered branches as needed.
  function expandToNode(id) {
    // BFS/DFS through nodeMap tree to find ancestor chain
    var chain = findChain(currentRoots, id, []);
    if (!chain) return;
    // Walk chain, ensure each level rendered/expanded
    var container = treeEl;
    for (var d = 0; d < chain.length; d++) {
      var wantId = chain[d].id;
      var li = findLiByIdIn(container, wantId);
      if (!li) return;
      if (d < chain.length - 1) {
        var arrow = li.querySelector(":scope > .br-tree-label > .br-tree-arrow");
        var kids = li.querySelector(":scope > .br-tree-children");
        if (!li._rendered && kids) {
          var frag = document.createDocumentFragment();
          li._node.children.forEach(function (c) { frag.appendChild(renderTreeNode(c, 0)); });
          kids.appendChild(frag);
          li._rendered = true;
        }
        if (kids) kids.classList.add("open");
        if (arrow) arrow.classList.add("expanded");
        container = kids;
      }
    }
  }

  function findLiByIdIn(container, id) {
    var labels = container.querySelectorAll(':scope > li > .br-tree-label[data-id="' + id + '"]');
    if (labels.length) return labels[0].parentElement;
    return null;
  }

  function findChain(roots, id, acc) {
    for (var i = 0; i < roots.length; i++) {
      var node = roots[i];
      var next = acc.concat([node]);
      if (node.id === id) return next;
      if (node.children.length) {
        var r = findChain(node.children, id, next);
        if (r) return r;
      }
    }
    return null;
  }

  // ---- Content search ----
  function resetSearch() {
    searchMatches = [];
    searchIndex = -1;
    searchCount.textContent = "";
  }

  function clearHighlights() {
    var marks = detailBody.querySelectorAll("mark.br-hl");
    marks.forEach(function (m) {
      var parent = m.parentNode;
      parent.replaceChild(document.createTextNode(m.textContent), m);
      parent.normalize();
    });
  }

  function runContentSearch() {
    clearHighlights();
    resetSearch();
    var q = contentSearch.value;
    if (!q) { updateSearchCount(); return; }
    var re = buildSearchRegex(q, isOn(searchCase), isOn(searchWord));
    var pre = detailBody.querySelector(".br-pre");
    var scope = pre || detailBody;
    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null);
    var textNodes = [];
    var node;
    while ((node = walker.nextNode())) textNodes.push(node);

    textNodes.forEach(function (tn) {
      var text = tn.nodeValue;
      re.lastIndex = 0;
      var m, ranges = [];
      while ((m = re.exec(text)) !== null) {
        ranges.push([m.index, m.index + m[0].length]);
        if (m[0].length === 0) re.lastIndex++;  // guard against zero-length matches
      }
      if (!ranges.length) return;
      var frag = document.createDocumentFragment();
      var last = 0;
      ranges.forEach(function (r) {
        if (r[0] > last) frag.appendChild(document.createTextNode(text.slice(last, r[0])));
        var mark = document.createElement("mark");
        mark.className = "br-hl";
        mark.textContent = text.slice(r[0], r[1]);
        frag.appendChild(mark);
        searchMatches.push(mark);
        last = r[1];
      });
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      tn.parentNode.replaceChild(frag, tn);
    });

    if (searchMatches.length) {
      searchIndex = 0;
      focusMatch();
    }
    updateSearchCount();
  }

  function updateSearchCount() {
    if (!searchMatches.length) {
      searchCount.textContent = contentSearch.value ? "0" : "";
    } else {
      searchCount.textContent = (searchIndex + 1) + "/" + searchMatches.length;
    }
  }

  function focusMatch() {
    searchMatches.forEach(function (m, i) { m.classList.toggle("active", i === searchIndex); });
    var m = searchMatches[searchIndex];
    if (m) m.scrollIntoView({ block: "center", inline: "nearest" });
    updateSearchCount();
  }

  function stepMatch(delta) {
    if (!searchMatches.length) return;
    searchIndex = (searchIndex + delta + searchMatches.length) % searchMatches.length;
    focusMatch();
  }

  // ---- Tree filter ----
  var currentRoots = [];
  function applyFilter(raw) {
    var q = (raw || "").trim();
    var mode = filterMode ? filterMode.value : "name";
    if (!q) {
      renderTree(currentRoots);
      return;
    }
    var match = makeMatcher(q, isOn(treeCase), isOn(treeWord));
    if (mode === "library" || mode === "pcd") {
      applyModuleContentFilter(match, mode, q);
      return;
    }
    // Default: filter nodes by label (keep a node if it or any descendant matches).
    var filtered = filterNodes(currentRoots, match);
    treeEl.innerHTML = "";
    filtered.forEach(function (node) { treeEl.appendChild(renderTreeNodeExpanded(node)); });
  }

  // Does a module use a Library / PCD matching the predicate? Searches the
  // relevant sub-section content of the module node.
  function moduleMatches(moduleNode, match, mode) {
    var titleRe = mode === "library" ? /^Library$/i : /^PCD$/i;
    for (var i = 0; i < moduleNode.children.length; i++) {
      var c = moduleNode.children[i];
      if (titleRe.test(c.label) && c.content) {
        for (var j = 0; j < c.content.length; j++) {
          if (match(c.content[j])) return true;
        }
      }
    }
    return false;
  }

  // Show only the Modules group, narrowed to modules that use a matching
  // Library or PCD. Modules render collapsed (expand to inspect).
  function applyModuleContentFilter(match, mode, q) {
    var modulesRoot = null;
    for (var i = 0; i < currentRoots.length; i++) {
      if (currentRoots[i].label === "Modules") { modulesRoot = currentRoots[i]; break; }
    }
    treeEl.innerHTML = "";
    if (!modulesRoot) return;
    var matched = modulesRoot.children.filter(function (m) { return moduleMatches(m, match, mode); });
    var clone = Object.create(modulesRoot);
    clone.children = matched;
    clone.badge = String(matched.length);
    clone.label = "Modules using " + (mode === "library" ? "library" : "PCD") + " \u201c" + q + "\u201d";
    renderTree([clone]);
  }

  function filterNodes(nodes, match) {
    var out = [];
    nodes.forEach(function (node) {
      var selfMatch = match(node.label);
      var kids = node.children.length ? filterNodes(node.children, match) : [];
      if (selfMatch || kids.length) {
        // shallow clone with filtered children (keep all children if self matched)
        var clone = Object.create(node);
        clone.children = selfMatch ? node.children : kids;
        out.push(clone);
      }
    });
    return out;
  }

  // Render a filtered node fully expanded (children pre-rendered) so matches show.
  function renderTreeNodeExpanded(node) {
    var li = renderTreeNode(node, 0);
    if (node.children.length) {
      var arrow = li.querySelector(":scope > .br-tree-label > .br-tree-arrow");
      var kids = li.querySelector(":scope > .br-tree-children");
      var frag = document.createDocumentFragment();
      node.children.forEach(function (c) { frag.appendChild(renderTreeNodeExpanded(c)); });
      kids.appendChild(frag);
      li._rendered = true;
      kids.classList.add("open");
      if (arrow) arrow.classList.add("expanded");
    }
    return li;
  }

  // ---- File loading ----
  function loadText(text, name, size) {
    var parsed = parse(text);
    currentRoots = buildTree(parsed);
    renderTree(currentRoots);
    fileInfo.textContent = name + "  •  " + formatSize(size) + "  •  " + text.split(/\r?\n/).length.toLocaleString() + " lines";
    // Select the first root by default
    if (currentRoots.length) {
      var first = currentRoots[0];
      var label = treeEl.querySelector('.br-tree-label[data-id="' + first.id + '"]');
      selectNode(first, label);
    }
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  }

  function handleFile(file) {
    if (!file) return;
    fileInfo.textContent = "Loading " + file.name + "…";
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        loadText(e.target.result, file.name, file.size);
      } catch (err) {
        fileInfo.textContent = "Error: " + err.message;
        console.error(err);
      }
    };
    reader.onerror = function () { fileInfo.textContent = "Failed to read file."; };
    reader.readAsText(file);
  }

  // ---- Wire up UI ----
  dropZone.addEventListener("click", function () { fileInput.click(); });
  fileInput.addEventListener("change", function () {
    if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
  });
  dropZone.addEventListener("dragover", function (e) { e.preventDefault(); dropZone.classList.add("dragover"); });
  dropZone.addEventListener("dragleave", function () { dropZone.classList.remove("dragover"); });
  dropZone.addEventListener("drop", function (e) {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  var filterTimer = null;
  treeFilter.addEventListener("input", function () {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(function () { applyFilter(treeFilter.value); }, 180);
  });
  treeFilter.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { treeFilter.value = ""; applyFilter(""); }
  });
  if (filterMode) {
    filterMode.addEventListener("change", function () {
      var mode = filterMode.value;
      treeFilter.placeholder =
        mode === "library" ? "Filter modules by library (e.g. BaseLib)\u2026" :
        mode === "pcd" ? "Filter modules by PCD (e.g. PcdDebugPropertyMask)\u2026" :
        "Filter tree (e.g. module name)\u2026";
      applyFilter(treeFilter.value);
    });
  }

  function makeToggle(btn, onChange) {
    if (!btn) return;
    btn.addEventListener("click", function () {
      var active = btn.classList.toggle("active");
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      onChange();
    });
  }
  makeToggle(treeCase, function () { applyFilter(treeFilter.value); });
  makeToggle(treeWord, function () { applyFilter(treeFilter.value); });
  makeToggle(searchCase, function () { runContentSearch(); });
  makeToggle(searchWord, function () { runContentSearch(); });

  var searchTimer = null;
  contentSearch.addEventListener("input", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(runContentSearch, 150);
  });
  contentSearch.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); e.shiftKey ? stepMatch(-1) : stepMatch(1); }
    else if (e.key === "Escape") { contentSearch.value = ""; runContentSearch(); }
  });
  searchNext.addEventListener("click", function () { stepMatch(1); });
  searchPrev.addEventListener("click", function () { stepMatch(-1); });
  copyBtn.addEventListener("click", function () {
    if (!currentContentText) return;
    navigator.clipboard.writeText(currentContentText).then(function () {
      var old = copyBtn.textContent;
      copyBtn.textContent = "Copied!";
      setTimeout(function () { copyBtn.textContent = old; }, 1200);
    });
  });

  // ---- Resizer ----
  var dragging = false;
  resizer.addEventListener("mousedown", function (e) { dragging = true; e.preventDefault(); document.body.style.cursor = "col-resize"; });
  window.addEventListener("mousemove", function (e) {
    if (!dragging) return;
    var rect = treePanel.parentElement.getBoundingClientRect();
    var w = e.clientX - rect.left;
    w = Math.max(180, Math.min(w, rect.width - 200));
    treePanel.style.width = w + "px";
  });
  window.addEventListener("mouseup", function () { dragging = false; document.body.style.cursor = ""; });
})();
