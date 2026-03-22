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

// Byte editing state
var editingByteOffset = -1;  // Offset of byte currently being edited (-1 = none)
var editNibbleHigh = true;   // True = waiting for high nibble, false = waiting for low nibble
var editPendingNibble = 0;   // High nibble value while waiting for low nibble
var editByteOriginal = -1;   // Original byte value when editing started on current byte

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
    originalData: new Uint8Array(new Uint8Array(arrayBuffer)).buffer, // snapshot of original bytes
    scrollTop: 0,
    highlightOffset: -1,
    highlightSize: 0,
    findLastPos: 0,
    findQuery: "",
    modifiedBytes: {},  // offset -> true for bytes that differ from original
    isModified: false,
    undoStack: [],      // each entry: [{offset, oldByte, newByte}, ...]
    redoStack: []
  };
  tabs.push(tab);
  activateTab(tabs.length - 1);
}

function activateTab(index) {
  // Flush any pending byte edit and cancel editing
  flushByteEdit();
  editingByteOffset = -1;

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

  // Update save button
  updateSaveButton(tab);
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

      var nameSpan = document.createElement("span");
      nameSpan.textContent = tab.fileName;
      div.appendChild(nameSpan);

      if (tab.isModified) {
        var modDot = document.createElement("span");
        modDot.className = "hex-tab-modified";
        modDot.textContent = "\u25CF"; // filled circle
        modDot.title = "Modified";
        div.appendChild(modDot);
      }

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

function updateSaveButton(tab) {
  var btn = document.getElementById("saveBtn");
  if (!tab || !tab.isModified) {
    btn.style.display = "none";
  } else {
    btn.style.display = "inline-block";
  }
}

function markModified(tab, offset) {
  // Compare current byte against original to decide modified status
  var cur = new Uint8Array(tab.data)[offset];
  var orig = new Uint8Array(tab.originalData)[offset];
  if (cur !== orig) {
    tab.modifiedBytes[offset] = true;
  } else {
    delete tab.modifiedBytes[offset];
  }
  refreshModifiedState(tab);
}

function refreshModifiedState(tab) {
  var wasModified = tab.isModified;
  // File is modified if any byte differs from original
  var hasKeys = false;
  for (var k in tab.modifiedBytes) {
    if (tab.modifiedBytes.hasOwnProperty(k)) { hasKeys = true; break; }
  }
  tab.isModified = hasKeys;
  if (wasModified !== tab.isModified) {
    renderTabs();
    updateSaveButton(tab);
  }
}

function pushUndo(tab, changes) {
  tab.undoStack.push(changes);
  tab.redoStack = [];
}

function doUndo() {
  var tab = getActiveTab();
  if (!tab || tab.undoStack.length === 0) return;
  var changes = tab.undoStack.pop();
  tab.redoStack.push(changes);
  var view = new Uint8Array(tab.data);
  for (var i = 0; i < changes.length; i++) {
    view[changes[i].offset] = changes[i].oldByte;
    markModified(tab, changes[i].offset);
  }
  editingByteOffset = -1;
  renderHexRows();
}

function doRedo() {
  var tab = getActiveTab();
  if (!tab || tab.redoStack.length === 0) return;
  var changes = tab.redoStack.pop();
  tab.undoStack.push(changes);
  var view = new Uint8Array(tab.data);
  for (var i = 0; i < changes.length; i++) {
    view[changes[i].offset] = changes[i].newByte;
    markModified(tab, changes[i].offset);
  }
  editingByteOffset = -1;
  renderHexRows();
}

// Flush a pending byte edit as an undo entry (call when leaving a byte or cancelling)
function flushByteEdit() {
  if (editByteOriginal < 0 || editingByteOffset < 0) return;
  var tab = getActiveTab();
  if (!tab) return;
  var curByte = new Uint8Array(tab.data)[editingByteOffset];
  if (curByte !== editByteOriginal) {
    pushUndo(tab, [{ offset: editingByteOffset, oldByte: editByteOriginal, newByte: curByte }]);
  }
  editByteOriginal = -1;
}

function saveFile() {
  var tab = getActiveTab();
  if (!tab) return;
  var blob = new Blob([tab.data], { type: "application/octet-stream" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = tab.fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
    html += formatHexRow(view, r, tab.highlightOffset, tab.highlightSize, tab.modifiedBytes);
  }
  hexRowsEl.innerHTML = html;
}

function formatHexRow(view, rowIndex, highlightOffset, highlightSize, modifiedBytes) {
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

      var isMod = modifiedBytes[byteOffset] === true;
      var isEditing = byteOffset === editingByteOffset;

      var cls = "hb";
      if (isMod) cls += " hex-modified";
      if (inHighlight) cls += " hex-highlight";
      if (isEditing) cls += " hex-editing";

      var acls = "ab";
      if (isMod) acls += " hex-modified";
      if (inHighlight) acls += " hex-highlight";

      hexParts.push('<span class="' + cls + '" data-byte="' + byteOffset + '">' + hexByte + '</span>');
      asciiParts.push('<span class="' + acls + '" data-byte="' + byteOffset + '">' + asciiChar + '</span>');
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

function ensureByteVisible(offset) {
  if (!hexScrollEl) return;
  var targetRow = Math.floor(offset / hexBytesPerRow);
  var scrollTop = hexScrollEl.scrollTop;
  var viewHeight = hexScrollEl.clientHeight;
  var rowTop = targetRow * hexRowHeight;
  var rowBottom = rowTop + hexRowHeight;

  if (rowTop < scrollTop) {
    hexScrollEl.scrollTop = rowTop;
  } else if (rowBottom > scrollTop + viewHeight) {
    hexScrollEl.scrollTop = rowBottom - viewHeight;
  }
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

  // Separator
  var sep2 = document.createElement("span");
  sep2.className = "hex-sep";
  toolbar.appendChild(sep2);

  // Replace
  var replaceLabel = document.createElement("label");
  replaceLabel.textContent = "Replace:";
  toolbar.appendChild(replaceLabel);

  var replaceInput = document.createElement("input");
  replaceInput.type = "text";
  replaceInput.id = "hexReplaceInput";
  replaceInput.placeholder = "hex bytes";
  replaceInput.title = "Replacement hex bytes (e.g. 90 90) — Ctrl+H";
  replaceInput.style.width = "120px";
  toolbar.appendChild(replaceInput);

  var replaceBtn = document.createElement("button");
  replaceBtn.textContent = "Replace";
  replaceBtn.title = "Replace current match";
  toolbar.appendChild(replaceBtn);

  var replaceAllBtn = document.createElement("button");
  replaceAllBtn.textContent = "All";
  replaceAllBtn.title = "Replace all occurrences";
  toolbar.appendChild(replaceAllBtn);

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

  // Parse input string into byte array (hex bytes or ASCII text)
  function parseInputBytes(query) {
    if (!query) return null;
    var hexOnly = query.replace(/\s+/g, "").replace(/^0x/i, "");
    if (/^[0-9a-fA-F]+$/.test(hexOnly) && hexOnly.length % 2 === 0 && hexOnly.length >= 2) {
      var bytes = [];
      for (var i = 0; i < hexOnly.length; i += 2) {
        bytes.push(parseInt(hexOnly.substring(i, i + 2), 16));
      }
      return bytes;
    }
    // Fall back to ASCII text
    var bytes = [];
    for (var i = 0; i < query.length; i++) {
      bytes.push(query.charCodeAt(i) & 0xFF);
    }
    return bytes.length > 0 ? bytes : null;
  }

  // Find handler — returns found offset or -1
  function doFind() {
    var tab = getActiveTab();
    if (!tab) return -1;
    var searchBytes = parseInputBytes(findInput.value.trim());
    if (!searchBytes) return -1;

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
    return found;
  }

  // Replace current match
  function doReplace() {
    var tab = getActiveTab();
    if (!tab) return;
    var searchBytes = parseInputBytes(findInput.value.trim());
    var replaceBytes = parseInputBytes(replaceInput.value.trim());
    if (!searchBytes || !replaceBytes) return;

    // Check if current highlight is a match
    var view = new Uint8Array(tab.data);
    var off = tab.highlightOffset;
    if (off < 0 || tab.highlightSize !== searchBytes.length) {
      doFind();
      return;
    }
    var isMatch = true;
    for (var j = 0; j < searchBytes.length; j++) {
      if (view[off + j] !== searchBytes[j]) { isMatch = false; break; }
    }
    if (!isMatch) {
      doFind();
      return;
    }

    // Overwrite the matched bytes with replacement (truncate or pad if different length)
    var len = Math.min(replaceBytes.length, searchBytes.length);
    var changes = [];
    for (var j = 0; j < len; j++) {
      changes.push({ offset: off + j, oldByte: view[off + j], newByte: replaceBytes[j] });
      view[off + j] = replaceBytes[j];
      markModified(tab, off + j);
    }
    if (changes.length > 0) pushUndo(tab, changes);
    // If replace is shorter, leave remaining bytes unchanged
    // If replace is longer, ignore extra bytes (same-length replacement for hex editing)

    renderHexRows();
    // Find next
    doFind();
  }

  // Replace all
  function doReplaceAll() {
    var tab = getActiveTab();
    if (!tab) return;
    var searchBytes = parseInputBytes(findInput.value.trim());
    var replaceBytes = parseInputBytes(replaceInput.value.trim());
    if (!searchBytes || !replaceBytes) return;

    var view = new Uint8Array(tab.data);
    var len = Math.min(replaceBytes.length, searchBytes.length);
    var count = 0;
    var changes = [];

    for (var pos = 0; pos <= view.length - searchBytes.length; pos++) {
      var match = true;
      for (var j = 0; j < searchBytes.length; j++) {
        if (view[pos + j] !== searchBytes[j]) { match = false; break; }
      }
      if (match) {
        for (var j = 0; j < len; j++) {
          changes.push({ offset: pos + j, oldByte: view[pos + j], newByte: replaceBytes[j] });
          view[pos + j] = replaceBytes[j];
          markModified(tab, pos + j);
        }
        count++;
        pos += searchBytes.length - 1; // skip past this match
      }
    }

    if (count > 0) {
      pushUndo(tab, changes);
      renderHexRows();
    }
  }

  findBtn.addEventListener("click", doFind);
  findInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") doFind();
  });
  replaceBtn.addEventListener("click", doReplace);
  replaceAllBtn.addEventListener("click", doReplaceAll);
  replaceInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") doReplace();
  });

  // Global keyboard shortcuts: Ctrl+G = Goto, Ctrl+F = Find, Ctrl+H = Replace
  document.addEventListener("keydown", function (e) {
    // Skip shortcuts when editing bytes
    if (editingByteOffset >= 0 && !e.ctrlKey) return;

    if (e.ctrlKey && e.key === "g") {
      e.preventDefault();
      gotoInput.focus();
      gotoInput.select();
    } else if (e.ctrlKey && e.key === "f") {
      e.preventDefault();
      findInput.focus();
      findInput.select();
    } else if (e.ctrlKey && e.key === "h") {
      e.preventDefault();
      replaceInput.focus();
      replaceInput.select();
    } else if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      saveFile();
    } else if (e.ctrlKey && e.key === "z") {
      e.preventDefault();
      flushByteEdit();
      doUndo();
    } else if (e.ctrlKey && e.key === "y") {
      e.preventDefault();
      doRedo();
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
    // Flush any pending edit on previous byte before switching
    flushByteEdit();
    hexSelecting = true;
    hexSelAnchor = byteOff;
    // Enter edit mode on the clicked byte
    editingByteOffset = byteOff;
    editNibbleHigh = true;
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
    // If dragging across multiple bytes, exit edit mode (it's a selection)
    if (hi > lo) editingByteOffset = -1;
    renderHexRows();
  });

  document.addEventListener("mouseup", function () {
    if (hexSelecting) hexSelecting = false;
  });

  // Keyboard handler for hex byte editing
  document.addEventListener("keydown", function (e) {
    if (editingByteOffset < 0) return;
    // Don't intercept when user is typing in an input field
    var ae = document.activeElement;
    if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) return;
    var tab = getActiveTab();
    if (!tab) return;

    // Escape cancels editing
    if (e.key === "Escape") {
      flushByteEdit();
      editingByteOffset = -1;
      renderHexRows();
      e.preventDefault();
      return;
    }

    // Arrow keys navigate between bytes
    if (e.key === "ArrowRight") {
      flushByteEdit();
      if (editingByteOffset < tab.fileSize - 1) {
        editingByteOffset++;
        editNibbleHigh = true;
        tab.highlightOffset = editingByteOffset;
        tab.highlightSize = 1;
        ensureByteVisible(editingByteOffset);
        renderHexRows();
      }
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowLeft") {
      flushByteEdit();
      if (editingByteOffset > 0) {
        editingByteOffset--;
        editNibbleHigh = true;
        tab.highlightOffset = editingByteOffset;
        tab.highlightSize = 1;
        ensureByteVisible(editingByteOffset);
        renderHexRows();
      }
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown") {
      flushByteEdit();
      var newOff = editingByteOffset + hexBytesPerRow;
      if (newOff < tab.fileSize) {
        editingByteOffset = newOff;
        editNibbleHigh = true;
        tab.highlightOffset = editingByteOffset;
        tab.highlightSize = 1;
        ensureByteVisible(editingByteOffset);
        renderHexRows();
      }
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowUp") {
      flushByteEdit();
      var newOff = editingByteOffset - hexBytesPerRow;
      if (newOff >= 0) {
        editingByteOffset = newOff;
        editNibbleHigh = true;
        tab.highlightOffset = editingByteOffset;
        tab.highlightSize = 1;
        ensureByteVisible(editingByteOffset);
        renderHexRows();
      }
      e.preventDefault();
      return;
    }

    // Tab moves to next byte
    if (e.key === "Tab") {
      flushByteEdit();
      if (e.shiftKey && editingByteOffset > 0) {
        editingByteOffset--;
      } else if (!e.shiftKey && editingByteOffset < tab.fileSize - 1) {
        editingByteOffset++;
      }
      editNibbleHigh = true;
      tab.highlightOffset = editingByteOffset;
      tab.highlightSize = 1;
      ensureByteVisible(editingByteOffset);
      renderHexRows();
      e.preventDefault();
      return;
    }

    // Hex digit input (0-9, a-f, A-F)
    var hexChar = e.key.toLowerCase();
    if (/^[0-9a-f]$/.test(hexChar) && !e.ctrlKey && !e.altKey && !e.metaKey) {
      var nibbleVal = parseInt(hexChar, 16);
      var view = new Uint8Array(tab.data);
      var curByte = view[editingByteOffset];

      if (editNibbleHigh) {
        // Starting to edit this byte — capture original value
        editByteOriginal = curByte;
        // Replace high nibble immediately, keep low nibble
        view[editingByteOffset] = (nibbleVal << 4) | (curByte & 0x0F);
        markModified(tab, editingByteOffset);
        editNibbleHigh = false;
      } else {
        // Replace low nibble, then auto-advance to next byte
        view[editingByteOffset] = (curByte & 0xF0) | nibbleVal;
        markModified(tab, editingByteOffset);

        // Flush undo entry for completed byte edit
        flushByteEdit();

        if (editingByteOffset < tab.fileSize - 1) {
          editingByteOffset++;
          ensureByteVisible(editingByteOffset);
        }
        editNibbleHigh = true;
        tab.highlightOffset = editingByteOffset;
        tab.highlightSize = 1;
      }
      renderHexRows();
      e.preventDefault();
      return;
    }
  });

  // Save button handler
  document.getElementById("saveBtn").addEventListener("click", saveFile);
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
