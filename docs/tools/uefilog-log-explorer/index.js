let editor;
let unresolvedEditor;
let guidMap = new Map();
let originalContent = ""; // Always keep original (unconverted) content for phase scanning
let isConverted = false;  // Track whether GUIDs are currently converted to names

// Ctrl+Click highlight tracking: word -> { decorationIds, className }
let highlightedWords = new Map();
let colorIndex = 0;
const HIGHLIGHT_COLORS = [
  "rgba(255, 255, 0, 0.4)",
  "rgba(0, 255, 170, 0.4)",
  "rgba(255, 150, 50, 0.4)",
  "rgba(150, 100, 255, 0.4)",
  "rgba(255, 100, 150, 0.4)",
  "rgba(0, 200, 255, 0.4)",
  "rgba(200, 255, 0, 0.4)",
  "rgba(255, 80, 80, 0.4)",
  "rgba(80, 255, 80, 0.4)",
  "rgba(180, 180, 255, 0.4)",
];

// UEFI boot phase definitions
// Each phase has a marker string to search for, a label, a color, and a level (0=main, 1=sub)
// Markers are always matched against the original (unconverted) content so only raw GUIDs are needed
var UEFI_PHASES = [
  // --- FSP-T / Early Init ---
  { marker: "FSP-T: CAR Init",                                              label: "FSP-T Start",          level: 0, color: "rgba(255, 140, 60, 0.25)",  borderColor: "#dd6b20" },

  // --- SEC ---
  { marker: "SecStartup() TempRAM Base",                                    label: "SEC Start",            level: 0, color: "rgba(255, 100, 100, 0.25)", borderColor: "#e53e3e" },

  // --- PEI ---
  { marker: "SecStartupPhase2() PeiCoreEntryPoint",                         label: "PEI Start",            level: 0, color: "rgba(100, 180, 255, 0.25)", borderColor: "#3182ce" },
  { marker: "CPU Pre-Mem Entry",                                            label: "CPU Pre-Mem",          level: 1, color: "rgba(100, 180, 255, 0.15)", borderColor: "#63a4e8" },
  { marker: "Install PPI: F894643D-C449-42D1-8EA8-85BDD8C65BDE",            label: "Permanent RAM Ready",  level: 1, color: "rgba(100, 180, 255, 0.15)", borderColor: "#63a4e8" },
  { marker: "MemoryInit Complete.",                                          label: "Memory Init Done",     level: 1, color: "rgba(100, 180, 255, 0.15)", borderColor: "#63a4e8" },
  { marker: "CPU Post-Mem Entry",                                           label: "CPU Post-Mem",         level: 1, color: "rgba(100, 180, 255, 0.15)", borderColor: "#63a4e8" },
  { marker: "Install PPI: BAE23646-BD60-4F8B-B3F9-F391EE7EE6C8",            label: "Temp RAM Exit",        level: 1, color: "rgba(100, 180, 255, 0.15)", borderColor: "#63a4e8" },
  { marker: "Install PPI: 605EA650-C65C-42E1-BA80-91A52AB618C6",            label: "End of PEI",           level: 1, color: "rgba(100, 180, 255, 0.15)", borderColor: "#63a4e8" },
  { marker: "DXE IPL Entry",                                                label: "DXE IPL Entry",        level: 1, color: "rgba(100, 180, 255, 0.15)", borderColor: "#63a4e8" },
  { marker: "Loading DXE CORE at",                                          label: "DXE Load",             level: 1, color: "rgba(100, 220, 100, 0.25)", borderColor: "#63a4e8" },

  // --- MM / SMM ---
  { marker: "SMM IPL loading SMM Core",                                     label: "SMM Core Load",        level: 1, color: "rgba(200, 130, 255, 0.15)", borderColor: "#805ad5" },
  { marker: "MmMain - ",                                                    label: "MM Start",             level: 1, color: "rgba(200, 130, 255, 0.15)", borderColor: "#805ad5" },
  { marker: "MmMain Done!",                                                 label: "MM End",               level: 1, color: "rgba(200, 130, 255, 0.15)", borderColor: "#805ad5" },
  { marker: "MmDriverDispatchHandler Entry",                                label: "MM Dispatcher Start",  level: 1, color: "rgba(200, 130, 255, 0.15)", borderColor: "#805ad5" },
  { marker: "SMM IPL locked SMRAM window",                                  label: "SMRAM Locked",         level: 1, color: "rgba(200, 130, 255, 0.15)", borderColor: "#805ad5" },
  { marker: "MmDriverDispatchHandler Exit",                                 label: "MM Dispatcher End",    level: 1, color: "rgba(200, 130, 255, 0.15)", borderColor: "#805ad5" },

  // --- DXE ---
  { marker: "DXE Core Platform Binary",                                     label: "DXE Start",            level: 0, color: "rgba(100, 220, 100, 0.25)", borderColor: "#38a169" },
  { marker: "PCI Bus First Scanning",                                       label: "PCI Enumeration",      level: 1, color: "rgba(100, 220, 100, 0.15)", borderColor: "#68d391" },
  { marker: "PciHostBridge: NotifyPhase (AllocateResources)",                label: "PCI Resource Alloc",   level: 1, color: "rgba(100, 220, 100, 0.15)", borderColor: "#68d391" },
  { marker: "Graphics Console Started",                                     label: "Console Ready",        level: 1, color: "rgba(100, 220, 100, 0.15)", borderColor: "#68d391" },
  { marker: "All EndOfDxe callbacks have returned successfully",             label: "End of DXE",           level: 0, color: "rgba(100, 220, 100, 0.25)", borderColor: "#38a169" },
  { marker: "MmReadyToLockHandler",                                         label: "SMM Ready to Lock",    level: 1, color: "rgba(200, 130, 255, 0.15)", borderColor: "#805ad5" },

  // --- BDS ---
  { marker: "[Bds] Entry",                                                  label: "BDS Start",            level: 0, color: "rgba(220, 180, 50, 0.25)",  borderColor: "#d69e2e" },
  { marker: "OnPreReadyToBoot:",                                            label: "Pre-ReadyToBoot",      level: 1, color: "rgba(220, 180, 50, 0.15)",  borderColor: "#ecc94b" },
  { marker: "TPM2 Tcg2Dxe Measure Data when ReadyToBoot",                   label: "Ready to Boot",        level: 0, color: "rgba(220, 150, 50, 0.25)",  borderColor: "#c05621" },
  { marker: "FSOpen: Open '\\EFI\\Microsoft\\Boot\\bootmgfw.efi' Success",  label: "OS Loader Found",      level: 1, color: "rgba(220, 180, 50, 0.15)",  borderColor: "#ecc94b" },
  { marker: "[Bds]=============End Load Options Dumping",                    label: "BDS End",              level: 0, color: "rgba(220, 180, 50, 0.25)",  borderColor: "#d69e2e" },

  // --- ExitBootServices ---
  { marker: "INFO - EBS initiated.",                                        label: "ExitBootServices",     level: 0, color: "rgba(255, 80, 80, 0.25)",   borderColor: "#c53030" },
  { marker: "======== TestPointExitBootServices - Enter",                    label: "EBS Validation",       level: 1, color: "rgba(255, 80, 80, 0.15)",   borderColor: "#fc8181" },
];

// Phase decoration tracking
let phaseDecorationIds = [];
let detectedPhases = []; // { label, lineNumber }

// Summary stats
let driverCounts = {}; // { "PEI Drivers": N, ... }
let ppiCount = 0;
let fvCount = 0;

// Inject phase marker CSS classes
function injectPhaseCss() {
  var style = document.createElement("style");
  var css = "";
  UEFI_PHASES.forEach(function (phase, i) {
    var border = phase.level === 0 ? "border-bottom: 2px solid " + phase.borderColor + ";" : "border-bottom: 1px dashed " + phase.borderColor + ";";
    css += ".phase-line-" + i + " { background-color: " + phase.color + "; " + border + " }\n";
    var glyph = "\\25B6";
    css += ".phase-glyph-" + i + "::before { content: '" + glyph + "'; color: " + phase.borderColor + "; font-size: 14px; display: flex; align-items: center; justify-content: center; height: 100%; }\n";
  });
  style.textContent = css;
  document.head.appendChild(style);

  // Override default blue hover on phase dropdown options
  var hoverStyle = document.createElement("style");
  hoverStyle.textContent =
    "#phaseJump option:hover, #phaseJump option:focus, #phaseJump option:checked:not([value='']) { " +
    "  background: linear-gradient(0deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.05) 100%) !important; " +
    "}";
  document.head.appendChild(hoverStyle);
}
injectPhaseCss();

// Make current line highlight more visible
(function injectCurrentLineHighlightCss() {
  var style = document.createElement("style");
  style.textContent =
    ".monaco-editor .current-line-margin { background-color: rgba(0, 120, 215, 0.15) !important; }" +
    ".monaco-editor .current-line { background-color: rgba(0, 120, 215, 0.1) !important; border: 1px solid rgba(0, 120, 215, 0.3) !important; }" +
    ".monaco-editor.vs-dark .current-line-margin { background-color: rgba(40, 140, 255, 0.2) !important; }" +
    ".monaco-editor.vs-dark .current-line { background-color: rgba(40, 140, 255, 0.15) !important; border: 1px solid rgba(40, 140, 255, 0.4) !important; }";
  document.head.appendChild(style);
})();

// Inject a dynamic CSS class for a highlight color and return the class name
let styleSheet = null;
function getHighlightClass(index) {
  var className = "ctrl-click-highlight-" + index;
  if (!styleSheet) {
    var style = document.createElement("style");
    document.head.appendChild(style);
    styleSheet = style.sheet;
  }
  styleSheet.insertRule(
    "." + className + " { background-color: " + HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length] + "; }",
    styleSheet.cssRules.length
  );
  return className;
}

// Build the GUID map from the inlined data
function loadGuids() {
  GUID_DATA.forEach(function (entry) {
    var name = entry[0];
    var guid = entry[1];
    if (name && guid) guidMap.set(name, guid);
  });
}

// Configure Monaco loader
require.config({
  paths: {
    vs: "./monaco/min/vs",
  },
});

// Scan original (unconverted) content for UEFI phase boundaries,
// apply decorations to the editor, and populate the jump-to dropdown.
// Since markers use raw GUIDs, we always search originalContent to find
// line numbers, then apply decorations at those same line numbers in the editor.
function scanForPhases() {
  // Clear previous phase decorations
  if (phaseDecorationIds.length > 0) {
    editor.removeDecorations(phaseDecorationIds);
    phaseDecorationIds = [];
  }
  detectedPhases = [];

  if (!originalContent) return;

  var originalLines = originalContent.split("\n");
  var decorations = [];

  UEFI_PHASES.forEach(function (phase, phaseIndex) {
    var matchCount = 0;
    originalLines.forEach(function (line, idx) {
      if (line.indexOf(phase.marker) === -1) return;
      matchCount++;
      var lineNumber = idx + 1; // 1-based
      detectedPhases.push({ label: phase.label, lineNumber: lineNumber, level: phase.level || 0, matchCount: matchCount, borderColor: phase.borderColor });
      decorations.push({
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          className: "phase-line-" + phaseIndex,
          glyphMarginClassName: "phase-glyph-" + phaseIndex,
          minimap: { color: phase.borderColor, position: monaco.editor.MinimapPosition.Inline },
          overviewRuler: { color: phase.borderColor, position: monaco.editor.OverviewRulerLane.Full },
        },
      });
    });
    // Add occurrence suffix if there were multiple matches
    if (matchCount > 1) {
      detectedPhases.forEach(function (dp) {
        if (dp.label === phase.label && dp.matchCount !== undefined) {
          dp.label = phase.label + " (" + dp.matchCount + ")";
        }
      });
    }
    // Clean up matchCount
    detectedPhases.forEach(function (dp) { delete dp.matchCount; });
  });

  if (decorations.length > 0) {
    phaseDecorationIds = editor.deltaDecorations([], decorations);
  }

  // Sort detected phases by line number
  detectedPhases.sort(function (a, b) { return a.lineNumber - b.lineNumber; });

  // Populate the jump-to dropdown
  var select = document.getElementById("phaseJump");
  select.innerHTML = '<option value="">Jump to phase...</option>';
  detectedPhases.forEach(function (phase) {
    var opt = document.createElement("option");
    opt.value = phase.lineNumber;
    var indent = phase.level > 0 ? "\u00A0\u00A0\u00A0\u00A0" : "";
    opt.textContent = indent + phase.label + " (line " + phase.lineNumber + ")";
    opt.style.backgroundColor = phase.borderColor + "30";
    opt.style.fontWeight = phase.level === 0 ? "bold" : "normal";
    select.appendChild(opt);
  });
  select.disabled = detectedPhases.length === 0;
}

// Driver load patterns: { regex, group label, color }
var DRIVER_PATTERNS = [
  { regex: /Loading PEIM at (0x[0-9A-Fa-f]+)\s+EntryPoint=\S+\s+(\S+?\.efi)/i,     group: "PEI Drivers",  color: "#3182ce30" },
  { regex: /Loading MM driver at (0x[0-9A-Fa-f]+)\s+EntryPoint=\S+\s+(\S+?\.efi)/i, group: "MM Drivers",   color: "#805ad530" },
  { regex: /Loaded image at (0x[0-9A-Fa-f]+)\s+Size=\S+\s+EntryPoint=\S+\s+(\S+?\.efi)/i, group: "DXE Drivers", color: "#38a16930" },
];

// Scan original content for driver loads and populate the driver jump dropdown
function scanForDrivers() {
  if (!originalContent) return;

  var originalLines = originalContent.split("\n");
  // { groupName: [ { name, address, lineNumber } ] }
  var groups = {};
  DRIVER_PATTERNS.forEach(function (pat) { groups[pat.group] = []; });

  originalLines.forEach(function (line, idx) {
    DRIVER_PATTERNS.forEach(function (pat) {
      var match = line.match(pat.regex);
      if (match) {
        groups[pat.group].push({
          name: match[2],
          address: match[1],
          lineNumber: idx + 1,
        });
      }
    });
  });

  var select = document.getElementById("driverJump");
  select.innerHTML = '<option value="">Jump to driver load...</option>';
  var totalCount = 0;

  DRIVER_PATTERNS.forEach(function (pat) {
    var drivers = groups[pat.group];
    driverCounts[pat.group] = drivers.length;
    if (drivers.length === 0) return;
    totalCount += drivers.length;
    var optgroup = document.createElement("optgroup");
    optgroup.label = pat.group + " (" + drivers.length + ")";
    drivers.forEach(function (drv) {
      var opt = document.createElement("option");
      opt.value = drv.lineNumber;
      opt.textContent = drv.name + " [" + drv.address + "] (line " + drv.lineNumber + ")";
      opt.style.backgroundColor = pat.color;
      optgroup.appendChild(opt);
    });
    select.appendChild(optgroup);
  });

  select.disabled = totalCount === 0;
}

// Scan editor content for PPI installs and populate the PPI jump dropdown.
// Uses editor content (not originalContent) so friendly names show after conversion.
function scanForPpiInstalls() {
  var content = editor.getValue();
  var lines = content.split("\n");
  var select = document.getElementById("ppiJump");
  select.innerHTML = '<option value="">Jump to PPI install...</option>';
  var count = 0;

  lines.forEach(function (line, idx) {
    var match = line.match(/Install PPI:\s+(\S+)/);
    if (match) {
      count++;
      var opt = document.createElement("option");
      opt.value = idx + 1;
      opt.textContent = match[1] + " (line " + (idx + 1) + ")";
      select.appendChild(opt);
    }
  });

  select.disabled = count === 0;
  ppiCount = count;
}

// Scan original content for FV (Firmware Volume) loads and populate the FV jump dropdown.
// Correlates "Installing ... FV @" lines with "The Nth FV start address" lines via handle.
function scanForFvLoads() {
  if (!originalContent) return;

  var lines = originalContent.split("\n");
  var select = document.getElementById("fvJump");
  select.innerHTML = '<option value="">Jump to FV load...</option>';

  // First pass: collect "Installing ... FV @" entries keyed by handle
  var installRegex = /Installing\s+(.+?)\s+FV\s+@\s+(0x[0-9A-Fa-f]+),\s*size:\s*(0x[0-9A-Fa-f]+)/i;
  var fvByHandle = {}; // handle -> { name, handle, size, lineNumber }

  lines.forEach(function (line, idx) {
    var match = line.match(installRegex);
    if (match) {
      var handle = match[2].toUpperCase();
      fvByHandle[handle] = {
        name: match[1],
        handle: match[2],
        size: match[3],
        loadAddress: null,
        lineNumber: idx + 1,
      };
    }
  });

  // Second pass: correlate with "The Nth FV start address" lines.
  // If no matching "Installing" line exists (e.g. 0th FV), create a new entry.
  var fvAddrRegex = /The\s+(\d+)(?:st|nd|rd|th)\s+FV\s+start\s+address\s+is\s+(0x[0-9A-Fa-f]+),\s*size\s+is\s+(0x[0-9A-Fa-f]+),\s*handle\s+is\s+(0x[0-9A-Fa-f]+)/i;

  lines.forEach(function (line, idx) {
    var match = line.match(fvAddrRegex);
    if (match) {
      var handle = match[4].toUpperCase();
      if (fvByHandle[handle]) {
        fvByHandle[handle].loadAddress = match[2];
      } else {
        // No "Installing" line for this FV (e.g. 0th FV)
        fvByHandle[handle] = {
          name: "FV #" + match[1],
          handle: match[4],
          size: match[3],
          loadAddress: match[2],
          lineNumber: idx + 1,
        };
      }
    }
  });

  // Build dropdown entries sorted by line number
  var fvList = Object.values(fvByHandle);
  fvList.sort(function (a, b) { return a.lineNumber - b.lineNumber; });

  fvList.forEach(function (fv) {
    var opt = document.createElement("option");
    opt.value = fv.lineNumber;
    var addr = fv.loadAddress || fv.handle;
    opt.textContent = fv.name + " [addr:" + addr + " size:" + fv.size + " handle:" + fv.handle + "] (line " + fv.lineNumber + ")";
    select.appendChild(opt);
  });

  fvCount = fvList.length;
  select.disabled = fvCount === 0;
}

// Update the summary section with stats
function updateSummary() {
  var section = document.getElementById("summarySection");
  var pei = driverCounts["PEI Drivers"] || 0;
  var mm = driverCounts["MM Drivers"] || 0;
  var dxe = driverCounts["DXE Drivers"] || 0;
  var total = pei + mm + dxe;

  if (total === 0 && ppiCount === 0 && fvCount === 0) {
    section.style.display = "none";
    return;
  }

  var sep = ' &nbsp;<span style="color: #aaa;">&bull;</span>&nbsp; ';
  var html = '<span style="font-weight: bold; font-size: 0.85rem;">Summary</span> &nbsp; ';
  html += '<span style="color: #3182ce;">PEI Drivers: ' + pei + '</span>';
  html += sep;
  html += '<span style="color: #805ad5;">MM Drivers: ' + mm + '</span>';
  html += sep;
  html += '<span style="color: #38a169;">DXE Drivers: ' + dxe + '</span>';
  html += sep;
  html += '<span style="color: #3182ce;">PPIs: ' + ppiCount + '</span>';
  html += sep;
  html += '<span style="color: #d69e2e;">FVs: ' + fvCount + '</span>';

  section.innerHTML = html;
  section.style.display = "block";
}

// Load Monaco Editor and GUIDs
require(["vs/editor/editor.main"], function () {
  editor = monaco.editor.create(document.getElementById("editor"), {
    value: [
      "UEFI Log Explorer",
      "========================",
      "",
      "Getting Started:",
      "  - Use 'UEFI Log' file picker to load a log file, or paste log content directly",
      "  - Click 'GUID <-> Name' to toggle between GUIDs and friendly names",
      "",
      "GUID Management:",
      "  - 3500+ built-in UEFI GUIDs are preloaded",
      "  - Use 'GUID CSV' file picker to load additional GUIDs (format: GUID,Name per line)",
      "",
      "Investigation Features:",
      "  - Ctrl+Click a word to highlight all occurrences (each word gets a unique color)",
      "  - Ctrl+Click the same word again to remove the highlight",
      "  - Boot phase markers (SEC, PEI, DXE, MM, BDS) are auto-detected and underlined",
      "  - Use 'Jump to phase' dropdown to navigate between boot phases",
      "  - Use 'Jump to driver load' dropdown to navigate to PEI, MM, and DXE driver loads",
      "  - Use 'Jump to PPI install' dropdown to navigate to PPI installations (updates on GUID <-> Name toggle)",
      "  - Use 'Jump to FV load' dropdown to navigate to Firmware Volume load locations",
      "",
      "Editor:",
      "  - Use the moon/sun button to toggle dark/light mode",
      "  - Ctrl+F to search, Ctrl+H to find and replace",
      "",
    ].join("\n"),
    language: "plaintext",
    theme: "vs-light",
    wordWrap: "off",
    scrollBeyondLastColumn: true,
    glyphMargin: true,
    renderLineHighlight: "all",
    // rulers: [
    //   { column: 80, color: "rgba(255, 0, 0, 0.5)" },
    //   { column: 100, color: "rgba(0, 0, 255, 0.5)" },
    // ],
    automaticLayout: true,
  });

  // Load GUIDs after editor is ready
  loadGuids();

  // Create the unresolved GUIDs editor (hidden initially)
  unresolvedEditor = monaco.editor.create(document.getElementById("unresolvedEditor"), {
    value: "",
    language: "plaintext",
    theme: "vs-light",
    wordWrap: "off",
    minimap: { enabled: false },
    lineNumbers: "on",
    glyphMargin: false,
    automaticLayout: true,
  });

  // Ctrl+Click to highlight/unhighlight all occurrences of clicked word
  editor.onMouseDown(function (e) {
    if (!e.event.ctrlKey) return;
    if (e.target.type !== monaco.editor.MouseTargetType.CONTENT_TEXT) return;

    e.event.preventDefault();
    e.event.stopPropagation();

    var position = e.target.position;
    if (!position) return;

    var model = editor.getModel();
    var wordAtPos = model.getWordAtPosition(position);
    if (!wordAtPos) return;

    var word = wordAtPos.word;

    // If already highlighted, remove it
    if (highlightedWords.has(word)) {
      var entry = highlightedWords.get(word);
      editor.removeDecorations(entry.decorationIds);
      highlightedWords.delete(word);
      return;
    }

    // Pick a unique color and create a CSS class for it
    var className = getHighlightClass(colorIndex);
    colorIndex++;

    // Find all occurrences of this word (whole word, case-sensitive)
    var matches = model.findMatches(word, true, false, true, null, false);
    if (matches.length === 0) return;

    var decorations = matches.map(function (match) {
      return {
        range: match.range,
        options: { className: className },
      };
    });

    // Use deltaDecorations to add highlights
    var ids = editor.deltaDecorations([], decorations);
    highlightedWords.set(word, { decorationIds: ids, className: className });
  });
});

// Load a file into the editor (shared by file input and drag & drop)
function loadFile(file) {
  var reader = new FileReader();
  reader.onload = function (e) {
    // Reset all state
    highlightedWords.forEach(function (entry) {
      editor.removeDecorations(entry.decorationIds);
    });
    highlightedWords.clear();
    colorIndex = 0;

    // Hide unresolved GUIDs section
    document.getElementById("unresolvedSection").style.display = "none";
    unresolvedEditor.setValue("");

    // Load new content
    originalContent = e.target.result;
    editor.setValue(originalContent);
    isConverted = false;

    // Hide editor drop overlay
    var overlay = document.getElementById("editorDropOverlay");
    if (overlay) overlay.style.display = "none";

    scanForPhases();
    scanForDrivers();
    scanForPpiInstalls();
    scanForFvLoads();
    updateSummary();
  };
  reader.readAsText(file);
}

// Handle File Input Change
document
  .getElementById("fileInput")
  .addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) loadFile(file);
  });

// Drop zone for UEFI log file (click + drag & drop)
(function setupFileDropZone() {
  var dropZone = document.getElementById("fileDropZone");
  var fileInput = document.getElementById("fileInput");

  // Click to open file browser
  dropZone.addEventListener("click", function () {
    fileInput.click();
  });

  // Drag hover styling
  dropZone.addEventListener("dragenter", function (e) {
    e.preventDefault();
    dropZone.style.borderColor = "#0b5ed7";
    dropZone.style.background = "rgba(13,110,253,0.12)";
  });

  dropZone.addEventListener("dragleave", function (e) {
    e.preventDefault();
    dropZone.style.borderColor = "#0d6efd";
    dropZone.style.background = "rgba(13,110,253,0.04)";
  });

  dropZone.addEventListener("dragover", function (e) {
    e.preventDefault();
  });

  dropZone.addEventListener("drop", function (e) {
    e.preventDefault();
    dropZone.style.borderColor = "#0d6efd";
    dropZone.style.background = "rgba(13,110,253,0.04)";
    var files = e.dataTransfer.files;
    if (files.length > 0) {
      loadFile(files[0]);
      dropZone.textContent = files[0].name;
      dropZone.style.color = "#333";
    }
  });

  // Update drop zone text when file is chosen via dialog
  fileInput.addEventListener("change", function () {
    if (fileInput.files.length > 0) {
      dropZone.textContent = fileInput.files[0].name;
      dropZone.style.color = "#333";
    }
  });
})();

// Drag & drop support on the editor area
(function setupEditorDragDrop() {
  var editorEl = document.getElementById("editor");
  var overlay = document.createElement("div");
  overlay.id = "editorDropOverlay";
  overlay.style.cssText = "display:flex; position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(13,110,253,0.08); border:2px dashed #0d6efd; border-radius:0.375rem; z-index:100; pointer-events:none; align-items:center; justify-content:center;";
  overlay.innerHTML = '<span style="font-size:1.1rem; font-weight:bold; color:#0d6efd; font-family:Consolas,monospace; background:rgba(255,255,255,0.9); padding:0.4rem 1rem; border-radius:0.25rem;">Drop UEFI log file here</span>';
  editorEl.style.position = "relative";
  editorEl.appendChild(overlay);

  var dragCounter = 0;

  editorEl.addEventListener("dragenter", function (e) {
    e.preventDefault();
    dragCounter++;
    overlay.style.display = "flex";
    overlay.style.background = "rgba(13,110,253,0.15)";
  });

  editorEl.addEventListener("dragleave", function (e) {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      // Restore initial state if no file loaded yet
      if (!originalContent) {
        overlay.style.background = "rgba(13,110,253,0.08)";
      } else {
        overlay.style.display = "none";
      }
    }
  });

  editorEl.addEventListener("dragover", function (e) {
    e.preventDefault();
  });

  editorEl.addEventListener("drop", function (e) {
    e.preventDefault();
    dragCounter = 0;
    overlay.style.display = "none";
    var files = e.dataTransfer.files;
    if (files.length > 0) {
      loadFile(files[0]);
      // Update the drop zone text too
      var dropZone = document.getElementById("fileDropZone");
      dropZone.textContent = files[0].name;
      dropZone.style.color = "#333";
    }
  });
})();

// GUID regex pattern
var GUID_REGEX = /[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}/g;

// Find remaining GUIDs after conversion and display in the unresolved editor
function findUnresolvedGuids() {
  var content = editor.getValue();
  var found = {};
  var match;
  while ((match = GUID_REGEX.exec(content)) !== null) {
    var guid = match[0].toUpperCase();
    if (!found[guid]) {
      found[guid] = 0;
    }
    found[guid]++;
  }

  var section = document.getElementById("unresolvedSection");
  var guids = Object.keys(found);

  if (guids.length === 0) {
    section.style.display = "none";
    unresolvedEditor.setValue("");
    return;
  }

  // Sort by occurrence count descending
  guids.sort(function (a, b) { return found[b] - found[a]; });

  var lines = guids.map(function (guid) {
    return guid + ",   # " + found[guid] + " occurrence(s)";
  });

  section.style.display = "block";
  unresolvedEditor.setValue(lines.join("\n"));
}

// Handle Convert Button Click — toggles between GUID→Name and Name→GUID
document.getElementById("convertBtn").addEventListener("click", function () {
  var btn = this;

  if (!isConverted) {
    // GUID → Name
    if (!originalContent) {
      originalContent = editor.getValue();
      scanForDrivers();
    }

    let content = editor.getValue();
    guidMap.forEach((guid, name) => {
      const regex = new RegExp(guid, "gi");
      content = content.replace(regex, name);
    });

    editor.setValue(content);
    scanForPhases();
    scanForPpiInstalls();
    findUnresolvedGuids();
    updateSummary();
    isConverted = true;
  } else {
    // Name → GUID (restore original)
    editor.setValue(originalContent);
    scanForPhases();
    scanForPpiInstalls();
    updateSummary();
    // Hide unresolved section when showing raw GUIDs
    document.getElementById("unresolvedSection").style.display = "none";
    unresolvedEditor.setValue("");
    isConverted = false;
  }
});

// Handle Jump-to-phase dropdown
document.getElementById("phaseJump").addEventListener("change", function () {
  var lineNumber = parseInt(this.value);
  if (!lineNumber || !editor) return;
  editor.revealLineInCenter(lineNumber);
  editor.setPosition({ lineNumber: lineNumber, column: 1 });
  editor.focus();
  this.value = "";
});

// Handle Jump-to-driver dropdown
document.getElementById("driverJump").addEventListener("change", function () {
  var lineNumber = parseInt(this.value);
  if (!lineNumber || !editor) return;
  editor.revealLineInCenter(lineNumber);
  editor.setPosition({ lineNumber: lineNumber, column: 1 });
  editor.focus();
  this.value = "";
});

// Handle Jump-to-PPI dropdown
document.getElementById("ppiJump").addEventListener("change", function () {
  var lineNumber = parseInt(this.value);
  if (!lineNumber || !editor) return;
  editor.revealLineInCenter(lineNumber);
  editor.setPosition({ lineNumber: lineNumber, column: 1 });
  editor.focus();
  this.value = "";
});

// Handle Jump-to-FV dropdown
document.getElementById("fvJump").addEventListener("change", function () {
  var lineNumber = parseInt(this.value);
  if (!lineNumber || !editor) return;
  editor.revealLineInCenter(lineNumber);
  editor.setPosition({ lineNumber: lineNumber, column: 1 });
  editor.focus();
  this.value = "";
});

// Load a GUID CSV file (shared by file input and drag & drop)
function loadGuidCsv(file) {
  var reader = new FileReader();
  reader.onload = function (e) {
    // Reset to built-in GUIDs, then merge CSV on top
    guidMap.clear();
    loadGuids();
    var count = 0;
    var lines = e.target.result.split("\n");
    lines.forEach(function (line) {
      var trimmed = line.trim();
      if (trimmed && trimmed.includes(",")) {
        var parts = trimmed.split(",", 2);
        var guid = parts[0].trim();
        var name = parts[1].trim();
        if (guid && name) {
          guidMap.set(name, guid);
          count++;
        }
      }
    });
    var dropZone = document.getElementById("guidDropZone");
    dropZone.textContent = file.name + " (" + count + " loaded)";
    dropZone.style.color = "#333";
  };
  reader.readAsText(file);
}

// Handle GUID CSV file input
document.getElementById("guidFileInput").addEventListener("change", function (event) {
  var file = event.target.files[0];
  if (file) loadGuidCsv(file);
});

// Drop zone for GUID CSV file (click + drag & drop)
(function setupGuidDropZone() {
  var dropZone = document.getElementById("guidDropZone");
  var fileInput = document.getElementById("guidFileInput");

  dropZone.addEventListener("click", function () {
    fileInput.click();
  });

  dropZone.addEventListener("dragenter", function (e) {
    e.preventDefault();
    dropZone.style.borderColor = "#0b5ed7";
    dropZone.style.background = "rgba(13,110,253,0.12)";
  });

  dropZone.addEventListener("dragleave", function (e) {
    e.preventDefault();
    dropZone.style.borderColor = "#0d6efd";
    dropZone.style.background = "rgba(13,110,253,0.04)";
  });

  dropZone.addEventListener("dragover", function (e) {
    e.preventDefault();
  });

  dropZone.addEventListener("drop", function (e) {
    e.preventDefault();
    dropZone.style.borderColor = "#0d6efd";
    dropZone.style.background = "rgba(13,110,253,0.04)";
    var files = e.dataTransfer.files;
    if (files.length > 0) {
      loadGuidCsv(files[0]);
    }
  });
})();

// Handle theme toggle (light/dark)
var isDark = false;
document.getElementById("themeToggle").addEventListener("click", function () {
  isDark = !isDark;
  monaco.editor.setTheme(isDark ? "vs-dark" : "vs-light");
  this.innerHTML = isDark ? "&#9788;" : "&#9790;";
  this.title = isDark ? "Switch to light mode" : "Switch to dark mode";
});
