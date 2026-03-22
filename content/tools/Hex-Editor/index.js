// ============================================================
// Hex Editor — Standalone hex viewer with tabbed multi-file support
// ============================================================

// ============================================================
// Section A: Global State
// ============================================================

var tabs = [];           // Array of tab objects
var activeTabIndex = -1; // Index of currently active tab (-1 = none)
var nextTabId = 1;       // Auto-incrementing tab ID

// Hex view constants
var hexRowHeight = 18;   // Must match CSS .hex-row height
var hexBytesPerRow = 16;

// Cached DOM elements (set once in initHexView)
var hexScrollEl = null;
var hexRowsEl = null;
var hexSpacerEl = null;

// rAF throttle guard
var hexRafPending = false;

// Drag-selection state
var hexSelecting = false;
var hexSelAnchor = -1;

// ============================================================
// Section B: Utilities
// ============================================================

function hex(val, width) {
  if (val === undefined || val === null) return "N/A";
  var s = val.toString(16).toUpperCase();
  if (width) {
    while (s.length < width) s = "0" + s;
  }
  return "0x" + s;
}

function escapeHtmlChar(charCode) {
  if (charCode === 38) return "&amp;";   // &
  if (charCode === 60) return "&lt;";    // <
  if (charCode === 62) return "&gt;";    // >
  if (charCode === 34) return "&quot;";  // "
  return String.fromCharCode(charCode);
}

// ============================================================
// Section C: Tab Management
// ============================================================

function createTab(fileName, arrayBuffer) {
  var tab = {
    id: nextTabId++,
    fileName: fileName,
    fileSize: arrayBuffer.byteLength,
    data: arrayBuffer,
    scrollTop: 0,
    highlightOffset: -1,
    highlightSize: 0,
    findLastPos: 0,
    findQuery: ""
  };
  tabs.push(tab);
  activateTab(tabs.length - 1);
}

function activateTab(index) {
  // Save current tab state
  if (activeTabIndex >= 0 && activeTabIndex < tabs.length) {
    var cur = tabs[activeTabIndex];
    cur.scrollTop = hexScrollEl ? hexScrollEl.scrollTop : 0;
    var findInput = document.getElementById("hexFindInput");
    if (findInput) cur.findQuery = findInput.value;
  }

  activeTabIndex = index;
  renderTabs();

  if (index < 0 || index >= tabs.length) {
    // No active tab — show placeholder
    showPlaceholder(true);
    updateHeader(null);
    updateFileInfo(null);
    return;
  }

  showPlaceholder(false);
  var tab = tabs[index];

  // Update header title
  updateHeader(tab);

  // Restore find query
  var findInput = document.getElementById("hexFindInput");
  if (findInput) findInput.value = tab.findQuery || "";

  // Update spacer height for this file's size
  var totalRows = Math.ceil(tab.fileSize / hexBytesPerRow);
  hexSpacerEl.style.height = (totalRows * hexRowHeight) + "px";

  // Restore scroll position
  hexScrollEl.scrollTop = tab.scrollTop;

  // Render immediately (in case scrollTop didn't change and no scroll event fires)
  renderHexRows();

  // Update file info
  updateFileInfo(tab);
}

function closeTab(index) {
  if (index < 0 || index >= tabs.length) return;
  tabs.splice(index, 1);

  if (tabs.length === 0) {
    activeTabIndex = -1;
    activateTab(-1);
  } else if (index === activeTabIndex) {
    var newIndex = Math.min(index, tabs.length - 1);
    activeTabIndex = -1; // force re-activation
    activateTab(newIndex);
  } else if (index < activeTabIndex) {
    activeTabIndex--;
    renderTabs();
  }
}

function renderTabs() {
  var bar = document.getElementById("tabBar");
  bar.innerHTML = "";
  for (var i = 0; i < tabs.length; i++) {
    (function (idx) {
      var tab = tabs[idx];
      var div = document.createElement("div");
      div.className = "hex-tab" + (idx === activeTabIndex ? " active" : "");
      div.textContent = tab.fileName;
      div.addEventListener("click", function () { activateTab(idx); });

      var closeBtn = document.createElement("span");
      closeBtn.className = "hex-tab-close";
      closeBtn.innerHTML = "&times;";
      closeBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        closeTab(idx);
      });
      div.appendChild(closeBtn);
      bar.appendChild(div);
    })(i);
  }
}

function showPlaceholder(show) {
  var placeholder = document.getElementById("hexPlaceholder");
  var header = document.getElementById("hexHeader");
  var scroll = document.getElementById("hexScroll");

  if (show) {
    placeholder.style.display = "flex";
    header.style.display = "none";
    scroll.style.display = "none";
  } else {
    placeholder.style.display = "none";
    header.style.display = "flex";
    scroll.style.display = "block";
  }
}

function updateHeader(tab) {
  var titleEl = document.getElementById("hexHeaderTitle");
  if (!titleEl) return;
  if (!tab) {
    titleEl.textContent = "Hex View";
  } else {
    titleEl.textContent = "Hex View \u2014 " + tab.fileName + " \u2014 " +
      tab.fileSize + " bytes (" + hex(tab.fileSize, 8) + ")";
  }
}

function updateFileInfo(tab) {
  var info = document.getElementById("fileInfo");
  if (!tab) {
    info.textContent = "";
  } else {
    info.textContent = tab.fileName + " (" + tab.fileSize.toLocaleString() + " bytes)";
  }
}

// ============================================================
// Section D: Hex Rendering
// ============================================================

function getActiveData() {
  if (activeTabIndex < 0 || activeTabIndex >= tabs.length) return null;
  return tabs[activeTabIndex].data;
}

function getActiveTab() {
  if (activeTabIndex < 0 || activeTabIndex >= tabs.length) return null;
  return tabs[activeTabIndex];
}

function renderHexRows() {
  var data = getActiveData();
  if (!hexScrollEl || !hexRowsEl || !data) return;

  var tab = getActiveTab();
  var scrollTop = hexScrollEl.scrollTop;
  var viewHeight = hexScrollEl.clientHeight;
  var totalRows = Math.ceil(data.byteLength / hexBytesPerRow);

  var firstVisible = Math.floor(scrollTop / hexRowHeight);
  var visibleCount = Math.ceil(viewHeight / hexRowHeight) + 1;

  // Buffer a few rows above and below
  var buffer = 5;
  var startRow = Math.max(0, firstVisible - buffer);
  var endRow = Math.min(totalRows, firstVisible + visibleCount + buffer);

  // Position the rows container
  hexRowsEl.style.top = (startRow * hexRowHeight) + "px";

  // Build HTML for visible rows
  var view = new Uint8Array(data);
  var html = "";
  for (var r = startRow; r < endRow; r++) {
    html += formatHexRow(view, r, tab.highlightOffset, tab.highlightSize);
  }
  hexRowsEl.innerHTML = html;
}

function formatHexRow(view, rowIndex, highlightOffset, highlightSize) {
  var fileOffset = rowIndex * hexBytesPerRow;
  var end = Math.min(fileOffset + hexBytesPerRow, view.length);

  // Offset column
  var offsetStr = '<span class="hex-offset">' + hex(fileOffset, 8) + '</span>  ';

  // Hex bytes + ASCII
  var hexParts = [];
  var asciiParts = [];

  for (var i = 0; i < hexBytesPerRow; i++) {
    var byteOffset = fileOffset + i;
    if (byteOffset < end) {
      var b = view[byteOffset];
      var hexByte = (b < 16 ? "0" : "") + b.toString(16).toUpperCase();
      var asciiChar = (b >= 32 && b <= 126) ? escapeHtmlChar(b) : ".";

      // Check if this byte is in the highlight range
      var inHighlight = highlightOffset >= 0 &&
        byteOffset >= highlightOffset &&
        byteOffset < highlightOffset + highlightSize;

      var hlClass = inHighlight ? " hex-highlight" : "";
      hexParts.push('<span class="hb' + hlClass + '" data-byte="' + byteOffset + '">' + hexByte + '</span>');
      asciiParts.push('<span class="ab' + hlClass + '" data-byte="' + byteOffset + '">' + asciiChar + '</span>');
    } else {
      hexParts.push("  ");
      asciiParts.push(" ");
    }
    // Extra gap after byte 8
    if (i === 7) {
      hexParts.push(" ");
    }
  }

  return '<div class="hex-row">' + offsetStr +
    hexParts.join(" ") + "  " +
    '<span class="hex-ascii">' + asciiParts.join("") + '</span></div>';
}

function highlightHexBytes(offset, size) {
  var tab = getActiveTab();
  if (!tab) return;

  tab.highlightOffset = offset;
  tab.highlightSize = size;

  if (!hexScrollEl) return;

  // Scroll to center the highlighted row
  var targetRow = Math.floor(offset / hexBytesPerRow);
  var viewHeight = hexScrollEl.clientHeight;
  var targetScrollTop = (targetRow * hexRowHeight) - (viewHeight / 2) + hexRowHeight;
  targetScrollTop = Math.max(0, targetScrollTop);
  hexScrollEl.scrollTop = targetScrollTop;

  // renderHexRows will be called by scroll event, but call it if scroll didn't change
  renderHexRows();
}

// ============================================================
// Section E: Hex View Setup (called once)
// ============================================================

function initHexView() {
  // Cache DOM elements
  hexScrollEl = document.getElementById("hexScroll");
  hexRowsEl = document.getElementById("hexRows");
  hexSpacerEl = document.getElementById("hexSpacer");

  // Build the hex header bar with Goto/Find toolbar
  var headerEl = document.getElementById("hexHeader");
  headerEl.className = "hex-header";

  var titleSpan = document.createElement("span");
  titleSpan.className = "hex-header-title";
  titleSpan.id = "hexHeaderTitle";
  titleSpan.textContent = "Hex View";
  headerEl.appendChild(titleSpan);

  var toolbar = document.createElement("span");
  toolbar.className = "hex-toolbar";

  // Goto
  var gotoLabel = document.createElement("label");
  gotoLabel.textContent = "Goto:";
  toolbar.appendChild(gotoLabel);

  var gotoInput = document.createElement("input");
  gotoInput.type = "text";
  gotoInput.id = "hexGotoInput";
  gotoInput.placeholder = "0x offset";
  gotoInput.title = "Enter hex offset (e.g. 0x1A0 or 1A0) — Ctrl+G";
  toolbar.appendChild(gotoInput);

  // Separator
  var sep1 = document.createElement("span");
  sep1.className = "hex-sep";
  toolbar.appendChild(sep1);

  // Find
  var findLabel = document.createElement("label");
  findLabel.textContent = "Find:";
  toolbar.appendChild(findLabel);

  var findInput = document.createElement("input");
  findInput.type = "text";
  findInput.id = "hexFindInput";
  findInput.placeholder = "hex or text";
  findInput.title = "Hex bytes (e.g. 4D5A) or text (e.g. .text) — Ctrl+F";
  findInput.style.width = "120px";
  toolbar.appendChild(findInput);

  var findBtn = document.createElement("button");
  findBtn.textContent = "Next";
  findBtn.title = "Find next occurrence";
  toolbar.appendChild(findBtn);

  headerEl.appendChild(toolbar);

  // Goto handler
  gotoInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      var tab = getActiveTab();
      if (!tab) return;
      var val = gotoInput.value.trim().replace(/^0x/i, "");
      var offset = parseInt(val, 16);
      if (isNaN(offset) || offset < 0 || offset >= tab.fileSize) return;
      highlightHexBytes(offset, 1);
    }
  });

  // Find handler
  function doFind() {
    var tab = getActiveTab();
    if (!tab) return;
    var query = findInput.value.trim();
    if (!query) return;

    var searchBytes = null;

    // Try to parse as hex bytes first (all hex chars, even length)
    var hexOnly = query.replace(/\s+/g, "").replace(/^0x/i, "");
    if (/^[0-9a-fA-F]+$/.test(hexOnly) && hexOnly.length % 2 === 0 && hexOnly.length >= 2) {
      searchBytes = [];
      for (var i = 0; i < hexOnly.length; i += 2) {
        searchBytes.push(parseInt(hexOnly.substring(i, i + 2), 16));
      }
    }

    // Fall back to ASCII text search
    if (!searchBytes) {
      searchBytes = [];
      for (var i = 0; i < query.length; i++) {
        searchBytes.push(query.charCodeAt(i) & 0xFF);
      }
    }

    if (searchBytes.length === 0) return;

    // Search from last position + 1 (wrap around)
    var view = new Uint8Array(tab.data);
    var startPos = tab.findLastPos;
    var found = -1;

    for (var pos = startPos; pos <= view.length - searchBytes.length; pos++) {
      var match = true;
      for (var j = 0; j < searchBytes.length; j++) {
        if (view[pos + j] !== searchBytes[j]) { match = false; break; }
      }
      if (match) { found = pos; break; }
    }

    // Wrap around if not found
    if (found === -1 && startPos > 0) {
      for (var pos = 0; pos < startPos && pos <= view.length - searchBytes.length; pos++) {
        var match = true;
        for (var j = 0; j < searchBytes.length; j++) {
          if (view[pos + j] !== searchBytes[j]) { match = false; break; }
        }
        if (match) { found = pos; break; }
      }
    }

    if (found >= 0) {
      tab.findLastPos = found + 1;
      highlightHexBytes(found, searchBytes.length);
    }
  }

  findBtn.addEventListener("click", doFind);
  findInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") doFind();
  });

  // Global keyboard shortcuts: Ctrl+G = Goto, Ctrl+F = Find
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && e.key === "g") {
      e.preventDefault();
      gotoInput.focus();
      gotoInput.select();
    } else if (e.ctrlKey && e.key === "f") {
      e.preventDefault();
      findInput.focus();
      findInput.select();
    }
  });

  // Scroll listener with rAF throttle
  hexScrollEl.addEventListener("scroll", function () {
    if (!hexRafPending) {
      hexRafPending = true;
      requestAnimationFrame(function () {
        hexRafPending = false;
        renderHexRows();
      });
    }
  });

  // Manual byte selection via click-and-drag
  hexScrollEl.addEventListener("mousedown", function (e) {
    var span = e.target.closest(".hb");
    if (!span) return;
    var byteOff = parseInt(span.getAttribute("data-byte"), 10);
    if (isNaN(byteOff)) return;
    var tab = getActiveTab();
    if (!tab) return;
    hexSelecting = true;
    hexSelAnchor = byteOff;
    tab.highlightOffset = byteOff;
    tab.highlightSize = 1;
    renderHexRows();
    e.preventDefault();
  });

  hexScrollEl.addEventListener("mousemove", function (e) {
    if (!hexSelecting) return;
    var span = e.target.closest(".hb");
    if (!span) return;
    var byteOff = parseInt(span.getAttribute("data-byte"), 10);
    if (isNaN(byteOff)) return;
    var tab = getActiveTab();
    if (!tab) return;
    var lo = Math.min(hexSelAnchor, byteOff);
    var hi = Math.max(hexSelAnchor, byteOff);
    tab.highlightOffset = lo;
    tab.highlightSize = hi - lo + 1;
    renderHexRows();
  });

  document.addEventListener("mouseup", function () {
    if (hexSelecting) hexSelecting = false;
  });
}

// ============================================================
// Section F: File Loading and Drop Zone
// ============================================================

function loadFile(file) {
  var reader = new FileReader();
  reader.onload = function (e) {
    createTab(file.name, e.target.result);
  };
  reader.readAsArrayBuffer(file);
}

(function setupFileDropZone() {
  var dropZone = document.getElementById("fileDropZone");
  var fileInput = document.getElementById("fileInput");

  dropZone.addEventListener("click", function () { fileInput.click(); });

  fileInput.addEventListener("change", function () {
    for (var i = 0; i < fileInput.files.length; i++) {
      loadFile(fileInput.files[i]);
    }
    fileInput.value = "";
  });

  dropZone.addEventListener("dragenter", function (e) {
    e.preventDefault();
    dropZone.style.borderColor = "#198754";
    dropZone.style.background = "rgba(25,135,84,0.08)";
    dropZone.style.color = "#198754";
  });
  dropZone.addEventListener("dragleave", function (e) {
    e.preventDefault();
    dropZone.style.borderColor = "#0d6efd";
    dropZone.style.background = "rgba(13,110,253,0.04)";
    dropZone.style.color = "#0d6efd";
  });
  dropZone.addEventListener("dragover", function (e) {
    e.preventDefault();
  });
  dropZone.addEventListener("drop", function (e) {
    e.preventDefault();
    dropZone.style.borderColor = "#0d6efd";
    dropZone.style.background = "rgba(13,110,253,0.04)";
    dropZone.style.color = "#0d6efd";
    var files = e.dataTransfer.files;
    for (var i = 0; i < files.length; i++) {
      loadFile(files[i]);
    }
  });
})();

// ============================================================
// Section G: Initialize
// ============================================================

initHexView();
