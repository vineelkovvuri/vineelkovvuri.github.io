// PE Editor - Pure JavaScript PE parser with tree view + detail table UI
// Parses: DOS Header, NT Headers (File Header, Optional Header), Data Directories, Section Headers

var peData = null;    // ArrayBuffer of loaded file
var peView = null;    // DataView for reading
var parsedPE = null;  // Parsed structure
var selectedLabel = null; // Currently selected tree label element

// ============================================================
// PE Constants
// ============================================================

var IMAGE_FILE_MACHINE = {
  0x0: "Unknown", 0x14c: "i386", 0x166: "R4000 (MIPS)", 0x169: "WCE MIPS v2",
  0x1a2: "SH3", 0x1a3: "SH3 DSP", 0x1a6: "SH4", 0x1a8: "SH5",
  0x1c0: "ARM", 0x1c2: "ARM Thumb", 0x1c4: "ARM NT", 0x1d3: "AM33",
  0x200: "IA64", 0x266: "MIPS16", 0x366: "MIPS w/FPU", 0x466: "MIPS16 w/FPU",
  0x5032: "RISC-V (32-bit)", 0x5064: "RISC-V (64-bit)", 0x5128: "RISC-V (128-bit)",
  0x6232: "LoongArch (32-bit)", 0x6264: "LoongArch (64-bit)",
  0x8664: "AMD64", 0xaa64: "ARM64", 0xebc: "EFI Byte Code",
};

var IMAGE_FILE_CHARACTERISTICS = {
  0x0001: "RELOCS_STRIPPED", 0x0002: "EXECUTABLE_IMAGE", 0x0004: "LINE_NUMS_STRIPPED",
  0x0008: "LOCAL_SYMS_STRIPPED", 0x0010: "AGGRESSIVE_WS_TRIM", 0x0020: "LARGE_ADDRESS_AWARE",
  0x0080: "BYTES_REVERSED_LO", 0x0100: "32BIT_MACHINE", 0x0200: "DEBUG_STRIPPED",
  0x0400: "REMOVABLE_RUN_FROM_SWAP", 0x0800: "NET_RUN_FROM_SWAP", 0x1000: "SYSTEM",
  0x2000: "DLL", 0x4000: "UP_SYSTEM_ONLY", 0x8000: "BYTES_REVERSED_HI",
};

var IMAGE_SUBSYSTEM = {
  0: "Unknown", 1: "Native", 2: "Windows GUI", 3: "Windows CUI",
  5: "OS/2 CUI", 7: "POSIX CUI", 9: "Windows CE GUI",
  10: "EFI Application", 11: "EFI Boot Service Driver", 12: "EFI Runtime Driver",
  13: "EFI ROM", 14: "XBOX", 16: "Windows Boot Application",
};

var IMAGE_DLLCHARACTERISTICS = {
  0x0020: "HIGH_ENTROPY_VA", 0x0040: "DYNAMIC_BASE", 0x0080: "FORCE_INTEGRITY",
  0x0100: "NX_COMPAT", 0x0200: "NO_ISOLATION", 0x0400: "NO_SEH",
  0x0800: "NO_BIND", 0x1000: "APPCONTAINER", 0x2000: "WDM_DRIVER",
  0x4000: "GUARD_CF", 0x8000: "TERMINAL_SERVER_AWARE",
};

var DATA_DIRECTORY_NAMES = [
  "Export Table", "Import Table", "Resource Table", "Exception Table",
  "Certificate Table", "Base Relocation Table", "Debug", "Architecture",
  "Global Ptr", "TLS Table", "Load Config Table", "Bound Import",
  "IAT", "Delay Import Descriptor", "CLR Runtime Header", "Reserved",
];

var IMAGE_DEBUG_TYPE = {
  0: "Unknown", 1: "COFF", 2: "CodeView", 3: "FPO", 4: "Misc",
  5: "Exception", 6: "Fixup", 7: "OMAP_TO_SRC", 8: "OMAP_FROM_SRC",
  9: "Borland", 10: "Reserved10", 11: "CLSID", 12: "VC_FEATURE",
  13: "POGO", 14: "ILTCG", 15: "MPX", 16: "Repro",
  20: "Ex DLL Characteristics",
};

// CodeView signatures
var CODEVIEW_SIGNATURE_NB10 = 0x3031424E; // "NB10"
var CODEVIEW_SIGNATURE_RSDS = 0x53445352; // "RSDS"
var CODEVIEW_SIGNATURE_MTOC = 0x434F544D; // "MTOC"

var SECTION_CHARACTERISTICS = {
  0x00000008: "TYPE_NO_PAD", 0x00000020: "CNT_CODE", 0x00000040: "CNT_INITIALIZED_DATA",
  0x00000080: "CNT_UNINITIALIZED_DATA", 0x00000100: "LNK_OTHER", 0x00000200: "LNK_INFO",
  0x00000800: "LNK_REMOVE", 0x00001000: "LNK_COMDAT", 0x00004000: "NO_DEFER_SPEC_EXC",
  0x00008000: "GPREL", 0x00100000: "ALIGN_1BYTES", 0x00200000: "ALIGN_2BYTES",
  0x00300000: "ALIGN_4BYTES", 0x00400000: "ALIGN_8BYTES", 0x00500000: "ALIGN_16BYTES",
  0x00600000: "ALIGN_32BYTES", 0x00700000: "ALIGN_64BYTES", 0x00800000: "ALIGN_128BYTES",
  0x00900000: "ALIGN_256BYTES", 0x00A00000: "ALIGN_512BYTES", 0x00B00000: "ALIGN_1024BYTES",
  0x00C00000: "ALIGN_2048BYTES", 0x00D00000: "ALIGN_4096BYTES", 0x00E00000: "ALIGN_8192BYTES",
  0x01000000: "LNK_NRELOC_OVFL", 0x02000000: "MEM_DISCARDABLE", 0x04000000: "MEM_NOT_CACHED",
  0x08000000: "MEM_NOT_PAGED", 0x10000000: "MEM_SHARED", 0x20000000: "MEM_EXECUTE",
  0x40000000: "MEM_READ", 0x80000000: "MEM_WRITE",
};

// ============================================================
// Helper functions
// ============================================================

function hex(val, width) {
  if (val === undefined || val === null) return "N/A";
  var s = val.toString(16).toUpperCase();
  if (width) {
    while (s.length < width) s = "0" + s;
  }
  return "0x" + s;
}

function hex64(lo, hi) {
  var high = hi.toString(16).toUpperCase();
  var low = lo.toString(16).toUpperCase();
  while (low.length < 8) low = "0" + low;
  return "0x" + high + low;
}

function decodeFlags(val, flagMap) {
  var flags = [];
  for (var bit in flagMap) {
    if (val & parseInt(bit)) {
      flags.push(flagMap[bit]);
    }
  }
  return flags.length > 0 ? flags.join(" | ") : "(none)";
}

function readAscii(view, offset, maxLen) {
  var str = "";
  for (var i = 0; i < maxLen; i++) {
    var ch = view.getUint8(offset + i);
    if (ch === 0) break;
    str += String.fromCharCode(ch);
  }
  return str;
}

function formatTimestamp(val) {
  if (val === 0) return "0 (not set)";
  var d = new Date(val * 1000);
  return d.toUTCString();
}

// Convert RVA to file offset using section table
function rvaToFileOffset(rva, sections) {
  for (var i = 0; i < sections.length; i++) {
    var sec = sections[i];
    var va = sec.fields[2].value;   // VirtualAddress
    var vs = sec.fields[1].value;   // VirtualSize
    var rawOff = sec.fields[4].value; // PointerToRawData
    if (rva >= va && rva < va + vs) {
      return rawOff + (rva - va);
    }
  }
  // Fallback: treat RVA as file offset (works for headers region)
  return rva;
}

// Format a 16-byte GUID from a DataView at a given offset
// Layout: Data1(4) Data2(2) Data3(2) Data4(8)
function formatGuid(view, offset) {
  var d1 = view.getUint32(offset, true).toString(16).toUpperCase();
  while (d1.length < 8) d1 = "0" + d1;
  var d2 = view.getUint16(offset + 4, true).toString(16).toUpperCase();
  while (d2.length < 4) d2 = "0" + d2;
  var d3 = view.getUint16(offset + 6, true).toString(16).toUpperCase();
  while (d3.length < 4) d3 = "0" + d3;
  var d4 = "";
  for (var i = 0; i < 8; i++) {
    var b = view.getUint8(offset + 8 + i).toString(16).toUpperCase();
    if (b.length < 2) b = "0" + b;
    d4 += b;
    if (i === 1) d4 += "-";
  }
  return d1 + "-" + d2 + "-" + d3 + "-" + d4;
}

// Read a null-terminated UTF-8 string from a DataView
function readNullTerminatedString(view, offset, maxLen) {
  var str = "";
  var end = Math.min(offset + maxLen, view.byteLength);
  for (var i = offset; i < end; i++) {
    var ch = view.getUint8(i);
    if (ch === 0) break;
    str += String.fromCharCode(ch);
  }
  return str;
}

// ============================================================
// PE Parser
// ============================================================

function parsePE(buffer) {
  var view = new DataView(buffer);
  var result = {};

  // --- DOS Header ---
  var dosMagic = view.getUint16(0, true);
  if (dosMagic !== 0x5A4D) {
    throw new Error("Not a valid PE file: missing MZ signature (got " + hex(dosMagic, 4) + ")");
  }

  result.dosHeader = {
    offset: 0,
    fields: [
      { name: "e_magic",    offset: 0,  size: 2, value: view.getUint16(0, true) },
      { name: "e_cblp",     offset: 2,  size: 2, value: view.getUint16(2, true) },
      { name: "e_cp",       offset: 4,  size: 2, value: view.getUint16(4, true) },
      { name: "e_crlc",     offset: 6,  size: 2, value: view.getUint16(6, true) },
      { name: "e_cparhdr",  offset: 8,  size: 2, value: view.getUint16(8, true) },
      { name: "e_minalloc", offset: 10, size: 2, value: view.getUint16(10, true) },
      { name: "e_maxalloc", offset: 12, size: 2, value: view.getUint16(12, true) },
      { name: "e_ss",       offset: 14, size: 2, value: view.getUint16(14, true) },
      { name: "e_sp",       offset: 16, size: 2, value: view.getUint16(16, true) },
      { name: "e_csum",     offset: 18, size: 2, value: view.getUint16(18, true) },
      { name: "e_ip",       offset: 20, size: 2, value: view.getUint16(20, true) },
      { name: "e_cs",       offset: 22, size: 2, value: view.getUint16(22, true) },
      { name: "e_lfarlc",   offset: 24, size: 2, value: view.getUint16(24, true) },
      { name: "e_ovno",     offset: 26, size: 2, value: view.getUint16(26, true) },
      { name: "e_res[0]",   offset: 28, size: 2, value: view.getUint16(28, true) },
      { name: "e_res[1]",   offset: 30, size: 2, value: view.getUint16(30, true) },
      { name: "e_res[2]",   offset: 32, size: 2, value: view.getUint16(32, true) },
      { name: "e_res[3]",   offset: 34, size: 2, value: view.getUint16(34, true) },
      { name: "e_oemid",    offset: 36, size: 2, value: view.getUint16(36, true) },
      { name: "e_oeminfo",  offset: 38, size: 2, value: view.getUint16(38, true) },
      { name: "e_res2[0]",  offset: 40, size: 2, value: view.getUint16(40, true) },
      { name: "e_res2[1]",  offset: 42, size: 2, value: view.getUint16(42, true) },
      { name: "e_res2[2]",  offset: 44, size: 2, value: view.getUint16(44, true) },
      { name: "e_res2[3]",  offset: 46, size: 2, value: view.getUint16(46, true) },
      { name: "e_res2[4]",  offset: 48, size: 2, value: view.getUint16(48, true) },
      { name: "e_res2[5]",  offset: 50, size: 2, value: view.getUint16(50, true) },
      { name: "e_res2[6]",  offset: 52, size: 2, value: view.getUint16(52, true) },
      { name: "e_res2[7]",  offset: 54, size: 2, value: view.getUint16(54, true) },
      { name: "e_res2[8]",  offset: 56, size: 2, value: view.getUint16(56, true) },
      { name: "e_res2[9]",  offset: 58, size: 2, value: view.getUint16(58, true) },
      { name: "e_lfanew",   offset: 60, size: 4, value: view.getUint32(60, true) },
    ],
  };

  var e_lfanew = view.getUint32(60, true);

  // --- NT Headers (PE Signature) ---
  if (e_lfanew + 4 > buffer.byteLength) {
    throw new Error("e_lfanew points beyond file end");
  }

  var peSignature = view.getUint32(e_lfanew, true);
  if (peSignature !== 0x00004550) {
    throw new Error("Invalid PE signature at offset " + hex(e_lfanew) + " (got " + hex(peSignature, 8) + ")");
  }

  result.ntSignature = {
    offset: e_lfanew,
    fields: [
      { name: "Signature", offset: e_lfanew, size: 4, value: peSignature },
    ],
  };

  // --- File Header (COFF) ---
  var fhOff = e_lfanew + 4;
  var machine = view.getUint16(fhOff, true);
  var numSections = view.getUint16(fhOff + 2, true);
  var timeDateStamp = view.getUint32(fhOff + 4, true);
  var characteristics = view.getUint16(fhOff + 18, true);

  result.fileHeader = {
    offset: fhOff,
    fields: [
      { name: "Machine",              offset: fhOff,      size: 2, value: machine },
      { name: "NumberOfSections",      offset: fhOff + 2,  size: 2, value: numSections },
      { name: "TimeDateStamp",         offset: fhOff + 4,  size: 4, value: timeDateStamp },
      { name: "PointerToSymbolTable",  offset: fhOff + 8,  size: 4, value: view.getUint32(fhOff + 8, true) },
      { name: "NumberOfSymbols",       offset: fhOff + 12, size: 4, value: view.getUint32(fhOff + 12, true) },
      { name: "SizeOfOptionalHeader",  offset: fhOff + 16, size: 2, value: view.getUint16(fhOff + 16, true) },
      { name: "Characteristics",       offset: fhOff + 18, size: 2, value: characteristics },
    ],
  };

  // --- Optional Header ---
  var ohOff = fhOff + 20;
  var optMagic = view.getUint16(ohOff, true);
  var is64 = (optMagic === 0x20B);
  result.is64 = is64;

  var optFields = [];
  if (is64) {
    optFields = parseOptionalHeader64(view, ohOff);
  } else {
    optFields = parseOptionalHeader32(view, ohOff);
  }

  result.optionalHeader = {
    offset: ohOff,
    fields: optFields,
  };

  // --- Data Directories ---
  var numRvaAndSizes;
  var ddOff;
  if (is64) {
    numRvaAndSizes = view.getUint32(ohOff + 108, true);
    ddOff = ohOff + 112;
  } else {
    numRvaAndSizes = view.getUint32(ohOff + 92, true);
    ddOff = ohOff + 96;
  }

  result.dataDirectories = [];
  var count = Math.min(numRvaAndSizes, 16);
  for (var i = 0; i < count; i++) {
    var rva = view.getUint32(ddOff + i * 8, true);
    var dirSize = view.getUint32(ddOff + i * 8 + 4, true);
    result.dataDirectories.push({
      name: DATA_DIRECTORY_NAMES[i] || ("Directory " + i),
      offset: ddOff + i * 8,
      rva: rva,
      size: dirSize,
    });
  }

  // --- Section Headers ---
  var sizeOfOptionalHeader = view.getUint16(fhOff + 16, true);
  var shOff = ohOff + sizeOfOptionalHeader;

  result.sections = [];
  for (var s = 0; s < numSections; s++) {
    var secOff = shOff + s * 40;
    var secName = readAscii(view, secOff, 8);
    var secChars = view.getUint32(secOff + 36, true);

    result.sections.push({
      offset: secOff,
      name: secName,
      fields: [
        { name: "Name",                 offset: secOff,      size: 8, value: secName, isString: true },
        { name: "VirtualSize",           offset: secOff + 8,  size: 4, value: view.getUint32(secOff + 8, true) },
        { name: "VirtualAddress",        offset: secOff + 12, size: 4, value: view.getUint32(secOff + 12, true) },
        { name: "SizeOfRawData",         offset: secOff + 16, size: 4, value: view.getUint32(secOff + 16, true) },
        { name: "PointerToRawData",      offset: secOff + 20, size: 4, value: view.getUint32(secOff + 20, true) },
        { name: "PointerToRelocations",  offset: secOff + 24, size: 4, value: view.getUint32(secOff + 24, true) },
        { name: "PointerToLinenumbers",  offset: secOff + 28, size: 4, value: view.getUint32(secOff + 28, true) },
        { name: "NumberOfRelocations",   offset: secOff + 32, size: 2, value: view.getUint16(secOff + 32, true) },
        { name: "NumberOfLinenumbers",   offset: secOff + 34, size: 2, value: view.getUint16(secOff + 34, true) },
        { name: "Characteristics",       offset: secOff + 36, size: 4, value: secChars },
      ],
    });
  }

  // --- Debug Directory ---
  result.debugEntries = parseDebugDirectory(view, buffer, result.dataDirectories, result.sections);

  // --- Export Table ---
  result.exportTable = parseExportTable(view, buffer, result.dataDirectories, result.sections);

  // --- Import Table ---
  result.importTable = parseImportTable(view, buffer, result.dataDirectories, result.sections);

  return result;
}

// Parse the Debug Directory and decode CodeView structures
function parseDebugDirectory(view, buffer, dataDirectories, sections) {
  // Debug directory is index 6
  if (dataDirectories.length <= 6) return [];
  var debugDir = dataDirectories[6];
  if (debugDir.rva === 0 || debugDir.size === 0) return [];

  var fileOffset = rvaToFileOffset(debugDir.rva, sections);
  var numEntries = Math.floor(debugDir.size / 28); // each entry is 28 bytes
  var entries = [];

  for (var i = 0; i < numEntries; i++) {
    var off = fileOffset + i * 28;
    if (off + 28 > buffer.byteLength) break;

    var type = view.getUint32(off + 12, true);
    var sizeOfData = view.getUint32(off + 16, true);
    var addressOfRawData = view.getUint32(off + 20, true);
    var pointerToRawData = view.getUint32(off + 24, true);

    var entry = {
      index: i,
      offset: off,
      fields: [
        { name: "Characteristics",    offset: off,      size: 4, value: view.getUint32(off, true) },
        { name: "TimeDateStamp",      offset: off + 4,  size: 4, value: view.getUint32(off + 4, true) },
        { name: "MajorVersion",       offset: off + 8,  size: 2, value: view.getUint16(off + 8, true) },
        { name: "MinorVersion",       offset: off + 10, size: 2, value: view.getUint16(off + 10, true) },
        { name: "Type",               offset: off + 12, size: 4, value: type },
        { name: "SizeOfData",         offset: off + 16, size: 4, value: sizeOfData },
        { name: "AddressOfRawData",   offset: off + 20, size: 4, value: addressOfRawData },
        { name: "PointerToRawData",   offset: off + 24, size: 4, value: pointerToRawData },
      ],
      type: type,
      typeName: IMAGE_DEBUG_TYPE[type] || ("Unknown (" + type + ")"),
      codeView: null,
    };

    // Decode CodeView structure if this is a CodeView entry
    if (type === 2 && pointerToRawData > 0 && sizeOfData > 0 && pointerToRawData + sizeOfData <= buffer.byteLength) {
      entry.codeView = parseCodeView(view, pointerToRawData, sizeOfData);
    }

    entries.push(entry);
  }

  return entries;
}

// Parse a CodeView debug info structure (NB10, RSDS, or MTOC)
function parseCodeView(view, offset, size) {
  if (offset + 4 > view.byteLength) return null;
  var signature = view.getUint32(offset, true);

  if (signature === CODEVIEW_SIGNATURE_RSDS) {
    // RSDS: Signature(4) + GUID(16) + Age(4) + PdbFileName(variable)
    if (offset + 24 > view.byteLength) return null;
    var guid = formatGuid(view, offset + 4);
    var age = view.getUint32(offset + 20, true);
    var pdbPath = readNullTerminatedString(view, offset + 24, size - 24);
    return {
      signatureType: "RSDS",
      signatureValue: signature,
      offset: offset,
      fields: [
        { name: "CvSignature", offset: offset,      size: 4, value: signature, meaning: "RSDS (PDB 7.0)" },
        { name: "GUID",        offset: offset + 4,   size: 16, value: guid, isString: true, meaning: "PDB GUID identifier" },
        { name: "Age",         offset: offset + 20,  size: 4, value: age, meaning: "PDB age (increments on rebuild)" },
        { name: "PdbFileName", offset: offset + 24,  size: pdbPath.length + 1, value: pdbPath, isString: true, meaning: "Path to PDB file" },
      ],
    };
  }

  if (signature === CODEVIEW_SIGNATURE_NB10) {
    // NB10: Signature(4) + Offset(4) + TimeDateStamp(4) + Age(4) + PdbFileName(variable)
    if (offset + 16 > view.byteLength) return null;
    var nb10Offset = view.getUint32(offset + 4, true);
    var timestamp = view.getUint32(offset + 8, true);
    var age = view.getUint32(offset + 12, true);
    var pdbPath = readNullTerminatedString(view, offset + 16, size - 16);
    return {
      signatureType: "NB10",
      signatureValue: signature,
      offset: offset,
      fields: [
        { name: "CvSignature",   offset: offset,      size: 4, value: signature, meaning: "NB10 (PDB 2.0)" },
        { name: "Offset",        offset: offset + 4,   size: 4, value: nb10Offset, meaning: "CodeView debug info offset" },
        { name: "TimeDateStamp", offset: offset + 8,   size: 4, value: timestamp, meaning: formatTimestamp(timestamp) },
        { name: "Age",           offset: offset + 12,  size: 4, value: age, meaning: "PDB age (increments on rebuild)" },
        { name: "PdbFileName",   offset: offset + 16,  size: pdbPath.length + 1, value: pdbPath, isString: true, meaning: "Path to PDB file" },
      ],
    };
  }

  if (signature === CODEVIEW_SIGNATURE_MTOC) {
    // MTOC: Signature(4) + UUID(16) + PdbFileName(variable)
    if (offset + 20 > view.byteLength) return null;
    var uuid = formatGuid(view, offset + 4);
    var pdbPath = readNullTerminatedString(view, offset + 20, size - 20);
    return {
      signatureType: "MTOC",
      signatureValue: signature,
      offset: offset,
      fields: [
        { name: "CvSignature", offset: offset,      size: 4, value: signature, meaning: "MTOC (Mach-O to COFF)" },
        { name: "UUID",        offset: offset + 4,   size: 16, value: uuid, isString: true, meaning: "Mach-O UUID" },
        { name: "PdbFileName", offset: offset + 20,  size: pdbPath.length + 1, value: pdbPath, isString: true, meaning: "Path to PDB/dSYM file" },
      ],
    };
  }

  // Unknown CodeView signature
  var sigBytes = String.fromCharCode(
    signature & 0xFF, (signature >> 8) & 0xFF,
    (signature >> 16) & 0xFF, (signature >> 24) & 0xFF
  );
  return {
    signatureType: "Unknown (" + sigBytes + ")",
    signatureValue: signature,
    offset: offset,
    fields: [
      { name: "CvSignature", offset: offset, size: 4, value: signature, meaning: "Unknown CodeView signature: " + sigBytes },
    ],
  };
}

// Parse the Export Directory Table (Data Directory index 0)
// IMAGE_EXPORT_DIRECTORY is 40 bytes at the RVA specified in the data directory.
// It contains pointers to the Export Address Table (EAT), Export Name Pointer Table (ENPT),
// and Export Ordinal Table (EOT).
function parseExportTable(view, buffer, dataDirectories, sections) {
  if (dataDirectories.length < 1) return null;
  var exportDir = dataDirectories[0];
  if (exportDir.rva === 0 || exportDir.size === 0) return null;

  var off = rvaToFileOffset(exportDir.rva, sections);
  if (off + 40 > buffer.byteLength) return null;

  var nameRva = view.getUint32(off + 12, true);
  var dllName = "";
  if (nameRva !== 0) {
    var nameOff = rvaToFileOffset(nameRva, sections);
    if (nameOff < buffer.byteLength) {
      dllName = readNullTerminatedString(view, nameOff, 256);
    }
  }

  var numberOfFunctions = view.getUint32(off + 20, true);
  var numberOfNames = view.getUint32(off + 24, true);
  var addressTableRva = view.getUint32(off + 28, true);
  var namePointerRva = view.getUint32(off + 32, true);
  var ordinalTableRva = view.getUint32(off + 36, true);
  var ordinalBase = view.getUint32(off + 16, true);

  var header = {
    offset: off,
    fields: [
      { name: "Characteristics",      offset: off,      size: 4, value: view.getUint32(off, true) },
      { name: "TimeDateStamp",        offset: off + 4,  size: 4, value: view.getUint32(off + 4, true) },
      { name: "MajorVersion",         offset: off + 8,  size: 2, value: view.getUint16(off + 8, true) },
      { name: "MinorVersion",         offset: off + 10, size: 2, value: view.getUint16(off + 10, true) },
      { name: "Name (RVA)",           offset: off + 12, size: 4, value: nameRva },
      { name: "OrdinalBase",          offset: off + 16, size: 4, value: ordinalBase },
      { name: "NumberOfFunctions",    offset: off + 20, size: 4, value: numberOfFunctions },
      { name: "NumberOfNames",        offset: off + 24, size: 4, value: numberOfNames },
      { name: "AddressOfFunctions",   offset: off + 28, size: 4, value: addressTableRva },
      { name: "AddressOfNames",       offset: off + 32, size: 4, value: namePointerRva },
      { name: "AddressOfNameOrdinals", offset: off + 36, size: 4, value: ordinalTableRva },
    ],
    dllName: dllName,
  };

  // Build the exported functions list
  var functions = [];
  var eatOff = rvaToFileOffset(addressTableRva, sections);
  var enptOff = namePointerRva !== 0 ? rvaToFileOffset(namePointerRva, sections) : 0;
  var eotOff = ordinalTableRva !== 0 ? rvaToFileOffset(ordinalTableRva, sections) : 0;

  // Build ordinal-to-name map from the name pointer table and ordinal table
  var ordinalToName = {};
  for (var n = 0; n < numberOfNames; n++) {
    if (enptOff + n * 4 + 4 > buffer.byteLength) break;
    if (eotOff + n * 2 + 2 > buffer.byteLength) break;
    var fnNameRva = view.getUint32(enptOff + n * 4, true);
    var ordIndex = view.getUint16(eotOff + n * 2, true);
    var fnName = "";
    if (fnNameRva !== 0) {
      var fnNameOff = rvaToFileOffset(fnNameRva, sections);
      if (fnNameOff < buffer.byteLength) {
        fnName = readNullTerminatedString(view, fnNameOff, 512);
      }
    }
    ordinalToName[ordIndex] = fnName;
  }

  // Walk the Export Address Table
  var exportDirRva = exportDir.rva;
  var exportDirEnd = exportDir.rva + exportDir.size;
  for (var i = 0; i < numberOfFunctions; i++) {
    if (eatOff + i * 4 + 4 > buffer.byteLength) break;
    var funcRva = view.getUint32(eatOff + i * 4, true);
    if (funcRva === 0) continue; // unused entry

    var ordinal = ordinalBase + i;
    var name = ordinalToName[i] || "";
    // Detect forwarder: RVA points inside the export directory itself
    var forwarder = "";
    if (funcRva >= exportDirRva && funcRva < exportDirEnd) {
      var fwdOff = rvaToFileOffset(funcRva, sections);
      if (fwdOff < buffer.byteLength) {
        forwarder = readNullTerminatedString(view, fwdOff, 256);
      }
    }

    functions.push({
      ordinal: ordinal,
      rva: funcRva,
      name: name,
      forwarder: forwarder,
    });
  }

  return {
    header: header,
    functions: functions,
  };
}

// Parse the Import Directory Table (Data Directory index 1)
// An array of IMAGE_IMPORT_DESCRIPTOR (20 bytes each), terminated by an all-zero entry.
// Each descriptor points to an Import Lookup Table (ILT) with the imported functions.
function parseImportTable(view, buffer, dataDirectories, sections) {
  if (dataDirectories.length < 2) return null;
  var importDir = dataDirectories[1];
  if (importDir.rva === 0 || importDir.size === 0) return null;

  var baseOff = rvaToFileOffset(importDir.rva, sections);
  if (baseOff + 20 > buffer.byteLength) return null;

  // Determine if PE32+ by checking optional header magic at a known location.
  // We can infer this from the data directory layout. For simplicity, check if
  // result.is64 was set — but we don't have it here, so detect from ILT entry size.
  // We'll try PE32+ first (8-byte ILT entries) and fall back.
  // Actually, we pass is64 via the sections array — let's use a global check instead.
  // parsePE sets result.is64, and we call parseImportTable from parsePE, so we can
  // check the optional header magic ourselves.
  var e_lfanew = view.getUint32(60, true);
  var optMagic = view.getUint16(e_lfanew + 4 + 20, true);
  var is64 = (optMagic === 0x20B);

  var dlls = [];
  var off = baseOff;
  var maxDescriptors = 1000; // safety limit

  for (var d = 0; d < maxDescriptors; d++) {
    if (off + 20 > buffer.byteLength) break;

    var iltRva = view.getUint32(off, true);       // OriginalFirstThunk / Import Lookup Table RVA
    var timeDateStamp = view.getUint32(off + 4, true);
    var forwarderChain = view.getUint32(off + 8, true);
    var nameRva = view.getUint32(off + 12, true);
    var iatRva = view.getUint32(off + 16, true);   // FirstThunk / Import Address Table RVA

    // All-zero entry marks end
    if (iltRva === 0 && nameRva === 0 && iatRva === 0) break;

    var dllName = "";
    if (nameRva !== 0) {
      var nameOff = rvaToFileOffset(nameRva, sections);
      if (nameOff < buffer.byteLength) {
        dllName = readNullTerminatedString(view, nameOff, 256);
      }
    }

    var descriptor = {
      offset: off,
      dllName: dllName,
      fields: [
        { name: "OriginalFirstThunk (ILT RVA)", offset: off,      size: 4, value: iltRva },
        { name: "TimeDateStamp",                 offset: off + 4,  size: 4, value: timeDateStamp },
        { name: "ForwarderChain",                offset: off + 8,  size: 4, value: forwarderChain },
        { name: "Name (RVA)",                    offset: off + 12, size: 4, value: nameRva },
        { name: "FirstThunk (IAT RVA)",          offset: off + 16, size: 4, value: iatRva },
      ],
      functions: [],
    };

    // Parse the Import Lookup Table (ILT) to get imported function names/ordinals.
    // Use OriginalFirstThunk if available, otherwise FirstThunk.
    var lookupRva = iltRva !== 0 ? iltRva : iatRva;
    if (lookupRva !== 0) {
      var lookupOff = rvaToFileOffset(lookupRva, sections);
      var entrySize = is64 ? 8 : 4;
      var maxFuncs = 10000; // safety

      for (var f = 0; f < maxFuncs; f++) {
        if (lookupOff + f * entrySize + entrySize > buffer.byteLength) break;

        var entryLo, entryHi, isOrdinal, ordinal, hintNameRva, hint, funcName;
        if (is64) {
          entryLo = view.getUint32(lookupOff + f * 8, true);
          entryHi = view.getUint32(lookupOff + f * 8 + 4, true);
          if (entryLo === 0 && entryHi === 0) break; // null terminator
          isOrdinal = (entryHi & 0x80000000) !== 0;
          ordinal = entryLo & 0xFFFF;
          hintNameRva = entryLo; // lower 31 bits when not ordinal
        } else {
          entryLo = view.getUint32(lookupOff + f * 4, true);
          if (entryLo === 0) break; // null terminator
          isOrdinal = (entryLo & 0x80000000) !== 0;
          ordinal = entryLo & 0xFFFF;
          hintNameRva = entryLo & 0x7FFFFFFF;
        }

        if (isOrdinal) {
          descriptor.functions.push({ ordinal: ordinal, hint: null, name: "(ordinal " + ordinal + ")" });
        } else {
          hint = 0;
          funcName = "";
          var hnOff = rvaToFileOffset(hintNameRva, sections);
          if (hnOff + 2 < buffer.byteLength) {
            hint = view.getUint16(hnOff, true);
            funcName = readNullTerminatedString(view, hnOff + 2, 512);
          }
          descriptor.functions.push({ ordinal: null, hint: hint, name: funcName });
        }
      }
    }

    dlls.push(descriptor);
    off += 20;
  }

  return dlls;
}

function parseOptionalHeader32(view, off) {
  return [
    { name: "Magic",                       offset: off,      size: 2, value: view.getUint16(off, true) },
    { name: "MajorLinkerVersion",          offset: off + 2,  size: 1, value: view.getUint8(off + 2) },
    { name: "MinorLinkerVersion",          offset: off + 3,  size: 1, value: view.getUint8(off + 3) },
    { name: "SizeOfCode",                  offset: off + 4,  size: 4, value: view.getUint32(off + 4, true) },
    { name: "SizeOfInitializedData",       offset: off + 8,  size: 4, value: view.getUint32(off + 8, true) },
    { name: "SizeOfUninitializedData",     offset: off + 12, size: 4, value: view.getUint32(off + 12, true) },
    { name: "AddressOfEntryPoint",         offset: off + 16, size: 4, value: view.getUint32(off + 16, true) },
    { name: "BaseOfCode",                  offset: off + 20, size: 4, value: view.getUint32(off + 20, true) },
    { name: "BaseOfData",                  offset: off + 24, size: 4, value: view.getUint32(off + 24, true) },
    { name: "ImageBase",                   offset: off + 28, size: 4, value: view.getUint32(off + 28, true) },
    { name: "SectionAlignment",            offset: off + 32, size: 4, value: view.getUint32(off + 32, true) },
    { name: "FileAlignment",              offset: off + 36, size: 4, value: view.getUint32(off + 36, true) },
    { name: "MajorOperatingSystemVersion", offset: off + 40, size: 2, value: view.getUint16(off + 40, true) },
    { name: "MinorOperatingSystemVersion", offset: off + 42, size: 2, value: view.getUint16(off + 42, true) },
    { name: "MajorImageVersion",           offset: off + 44, size: 2, value: view.getUint16(off + 44, true) },
    { name: "MinorImageVersion",           offset: off + 46, size: 2, value: view.getUint16(off + 46, true) },
    { name: "MajorSubsystemVersion",       offset: off + 48, size: 2, value: view.getUint16(off + 48, true) },
    { name: "MinorSubsystemVersion",       offset: off + 50, size: 2, value: view.getUint16(off + 50, true) },
    { name: "Win32VersionValue",           offset: off + 52, size: 4, value: view.getUint32(off + 52, true) },
    { name: "SizeOfImage",                 offset: off + 56, size: 4, value: view.getUint32(off + 56, true) },
    { name: "SizeOfHeaders",               offset: off + 60, size: 4, value: view.getUint32(off + 60, true) },
    { name: "CheckSum",                    offset: off + 64, size: 4, value: view.getUint32(off + 64, true) },
    { name: "Subsystem",                   offset: off + 68, size: 2, value: view.getUint16(off + 68, true) },
    { name: "DllCharacteristics",          offset: off + 70, size: 2, value: view.getUint16(off + 70, true) },
    { name: "SizeOfStackReserve",          offset: off + 72, size: 4, value: view.getUint32(off + 72, true) },
    { name: "SizeOfStackCommit",           offset: off + 76, size: 4, value: view.getUint32(off + 76, true) },
    { name: "SizeOfHeapReserve",           offset: off + 80, size: 4, value: view.getUint32(off + 80, true) },
    { name: "SizeOfHeapCommit",            offset: off + 84, size: 4, value: view.getUint32(off + 84, true) },
    { name: "LoaderFlags",                 offset: off + 88, size: 4, value: view.getUint32(off + 88, true) },
    { name: "NumberOfRvaAndSizes",         offset: off + 92, size: 4, value: view.getUint32(off + 92, true) },
  ];
}

function parseOptionalHeader64(view, off) {
  return [
    { name: "Magic",                       offset: off,       size: 2, value: view.getUint16(off, true) },
    { name: "MajorLinkerVersion",          offset: off + 2,   size: 1, value: view.getUint8(off + 2) },
    { name: "MinorLinkerVersion",          offset: off + 3,   size: 1, value: view.getUint8(off + 3) },
    { name: "SizeOfCode",                  offset: off + 4,   size: 4, value: view.getUint32(off + 4, true) },
    { name: "SizeOfInitializedData",       offset: off + 8,   size: 4, value: view.getUint32(off + 8, true) },
    { name: "SizeOfUninitializedData",     offset: off + 12,  size: 4, value: view.getUint32(off + 12, true) },
    { name: "AddressOfEntryPoint",         offset: off + 16,  size: 4, value: view.getUint32(off + 16, true) },
    { name: "BaseOfCode",                  offset: off + 20,  size: 4, value: view.getUint32(off + 20, true) },
    { name: "ImageBase",                   offset: off + 24,  size: 8, valueLo: view.getUint32(off + 24, true), valueHi: view.getUint32(off + 28, true) },
    { name: "SectionAlignment",            offset: off + 32,  size: 4, value: view.getUint32(off + 32, true) },
    { name: "FileAlignment",              offset: off + 36,  size: 4, value: view.getUint32(off + 36, true) },
    { name: "MajorOperatingSystemVersion", offset: off + 40,  size: 2, value: view.getUint16(off + 40, true) },
    { name: "MinorOperatingSystemVersion", offset: off + 42,  size: 2, value: view.getUint16(off + 42, true) },
    { name: "MajorImageVersion",           offset: off + 44,  size: 2, value: view.getUint16(off + 44, true) },
    { name: "MinorImageVersion",           offset: off + 46,  size: 2, value: view.getUint16(off + 46, true) },
    { name: "MajorSubsystemVersion",       offset: off + 48,  size: 2, value: view.getUint16(off + 48, true) },
    { name: "MinorSubsystemVersion",       offset: off + 50,  size: 2, value: view.getUint16(off + 50, true) },
    { name: "Win32VersionValue",           offset: off + 52,  size: 4, value: view.getUint32(off + 52, true) },
    { name: "SizeOfImage",                 offset: off + 56,  size: 4, value: view.getUint32(off + 56, true) },
    { name: "SizeOfHeaders",               offset: off + 60,  size: 4, value: view.getUint32(off + 60, true) },
    { name: "CheckSum",                    offset: off + 64,  size: 4, value: view.getUint32(off + 64, true) },
    { name: "Subsystem",                   offset: off + 68,  size: 2, value: view.getUint16(off + 68, true) },
    { name: "DllCharacteristics",          offset: off + 70,  size: 2, value: view.getUint16(off + 70, true) },
    { name: "SizeOfStackReserve",          offset: off + 72,  size: 8, valueLo: view.getUint32(off + 72, true), valueHi: view.getUint32(off + 76, true) },
    { name: "SizeOfStackCommit",           offset: off + 80,  size: 8, valueLo: view.getUint32(off + 80, true), valueHi: view.getUint32(off + 84, true) },
    { name: "SizeOfHeapReserve",           offset: off + 88,  size: 8, valueLo: view.getUint32(off + 88, true), valueHi: view.getUint32(off + 92, true) },
    { name: "SizeOfHeapCommit",            offset: off + 96,  size: 8, valueLo: view.getUint32(off + 96, true), valueHi: view.getUint32(off + 100, true) },
    { name: "LoaderFlags",                 offset: off + 104, size: 4, value: view.getUint32(off + 104, true) },
    { name: "NumberOfRvaAndSizes",         offset: off + 108, size: 4, value: view.getUint32(off + 108, true) },
  ];
}

// ============================================================
// Meaning resolvers — give human-readable descriptions for field values
// ============================================================

function getMeaning(section, fieldName, value, field) {
  // DOS Header
  if (fieldName === "e_magic") return value === 0x5A4D ? "MZ (valid)" : "Invalid";
  if (fieldName === "e_lfanew") return "Offset to PE header";
  if (fieldName === "e_cblp") return "Bytes on last page";
  if (fieldName === "e_cp") return "Pages in file";
  if (fieldName === "e_crlc") return "Relocations";
  if (fieldName === "e_cparhdr") return "Size of header in paragraphs";
  if (fieldName === "e_minalloc") return "Min extra paragraphs";
  if (fieldName === "e_maxalloc") return "Max extra paragraphs";
  if (fieldName === "e_ss") return "Initial SS value";
  if (fieldName === "e_sp") return "Initial SP value";
  if (fieldName === "e_csum") return "Checksum";
  if (fieldName === "e_ip") return "Initial IP value";
  if (fieldName === "e_cs") return "Initial CS value";
  if (fieldName === "e_lfarlc") return "File address of relocation table";
  if (fieldName === "e_ovno") return "Overlay number";
  if (fieldName === "e_oemid") return "OEM identifier";
  if (fieldName === "e_oeminfo") return "OEM information";
  if (fieldName.startsWith("e_res")) return "Reserved";

  // PE Signature
  if (fieldName === "Signature") return value === 0x4550 ? "PE\\0\\0 (valid)" : "Invalid";

  // File Header
  if (fieldName === "Machine") return IMAGE_FILE_MACHINE[value] || "Unknown (" + hex(value, 4) + ")";
  if (fieldName === "NumberOfSections") return value + " section(s)";
  if (fieldName === "TimeDateStamp") return formatTimestamp(value);
  if (fieldName === "PointerToSymbolTable") return value === 0 ? "No COFF symbol table" : "";
  if (fieldName === "NumberOfSymbols") return "";
  if (fieldName === "SizeOfOptionalHeader") return value + " bytes";
  if (fieldName === "Characteristics" && section === "fileHeader") return decodeFlags(value, IMAGE_FILE_CHARACTERISTICS);

  // Optional Header
  if (fieldName === "Magic") {
    if (value === 0x10B) return "PE32";
    if (value === 0x20B) return "PE32+ (64-bit)";
    if (value === 0x107) return "ROM image";
    return "Unknown";
  }
  if (fieldName === "MajorLinkerVersion" || fieldName === "MinorLinkerVersion") return "Linker version";
  if (fieldName === "SizeOfCode") return value + " bytes";
  if (fieldName === "SizeOfInitializedData") return value + " bytes";
  if (fieldName === "SizeOfUninitializedData") return value + " bytes";
  if (fieldName === "AddressOfEntryPoint") return "RVA of entry point";
  if (fieldName === "BaseOfCode") return "RVA of code section";
  if (fieldName === "BaseOfData") return "RVA of data section";
  if (fieldName === "ImageBase") return "Preferred load address";
  if (fieldName === "SectionAlignment") return value + " bytes";
  if (fieldName === "FileAlignment") return value + " bytes";
  if (fieldName === "SizeOfImage") return value + " bytes";
  if (fieldName === "SizeOfHeaders") return value + " bytes";
  if (fieldName === "CheckSum") return value === 0 ? "Not set" : "";
  if (fieldName === "Subsystem") return IMAGE_SUBSYSTEM[value] || "Unknown (" + value + ")";
  if (fieldName === "DllCharacteristics") return decodeFlags(value, IMAGE_DLLCHARACTERISTICS);
  if (fieldName === "NumberOfRvaAndSizes") return value + " data directories";
  if (fieldName.indexOf("Version") !== -1) return "";
  if (fieldName === "Win32VersionValue") return "Reserved, must be 0";
  if (fieldName === "LoaderFlags") return "Reserved, must be 0";
  if (fieldName.indexOf("SizeOf") === 0) return "";

  // Section characteristics
  if (fieldName === "Characteristics" && section === "section") return decodeFlags(value, SECTION_CHARACTERISTICS);
  if (fieldName === "Name" && section === "section") return "";
  if (fieldName === "VirtualSize") return value + " bytes";
  if (fieldName === "VirtualAddress") return "RVA";
  if (fieldName === "SizeOfRawData") return value + " bytes";
  if (fieldName === "PointerToRawData") return "File offset";
  if (fieldName === "PointerToRelocations") return value === 0 ? "None" : "File offset";
  if (fieldName === "PointerToLinenumbers") return value === 0 ? "None" : "File offset";
  if (fieldName === "NumberOfRelocations") return "";
  if (fieldName === "NumberOfLinenumbers") return "";

  return "";
}

// ============================================================
// UI: Tree view
// ============================================================

function buildTree(pe) {
  var tree = document.getElementById("peTree");
  tree.innerHTML = "";

  // Build debug directory child nodes
  var debugChildren = pe.debugEntries.map(function (entry) {
    var label = "#" + entry.index + " " + entry.typeName;
    if (entry.codeView) label += " (" + entry.codeView.signatureType + ")";
    return createTreeNode(label, function () { showDebugEntry(entry); });
  });

  // Build import table child nodes (one per DLL)
  var importChildren = [];
  if (pe.importTable && pe.importTable.length > 0) {
    importChildren = pe.importTable.map(function (dll) {
      return createTreeNode(dll.dllName || "(unknown)", function () { showImportDll(dll); });
    });
  }

  // Root node
  var root = createTreeNode("PE File", null, [
    createTreeNode("DOS Header", function () { showFields("DOS Header", "dosHeader", pe.dosHeader.fields); }),
    createTreeNode("NT Headers", function () { showFields("NT Signature", "ntSignature", pe.ntSignature.fields); }, [
      createTreeNode("File Header", function () { showFields("File Header", "fileHeader", pe.fileHeader.fields); }),
      createTreeNode("Optional Header", function () { showFields("Optional Header", "optionalHeader", pe.optionalHeader.fields); }),
    ]),
    createTreeNode("Data Directories", function () { showDataDirectories(pe.dataDirectories); },
      pe.dataDirectories.map(function (dir, idx) {
        return createTreeNode(dir.name, function () { showSingleDataDirectory(dir, idx); });
      })
    ),
    createTreeNode("Export Table", function () { showExportTable(pe.exportTable); }),
    createTreeNode("Import Table", function () { showImportTableOverview(pe.importTable); }, importChildren),
    createTreeNode("Debug Directory", function () { showDebugDirectoryOverview(pe.debugEntries); }, debugChildren),
    createTreeNode("Section Headers", null,
      pe.sections.map(function (sec) {
        return createTreeNode(sec.name, function () { showFields("Section: " + sec.name, "section", sec.fields); });
      })
    ),
  ]);

  tree.appendChild(root);

  // Expand all nodes
  expandAllNodes(root);
}

function createTreeNode(label, onClick, children) {
  var li = document.createElement("li");

  var labelDiv = document.createElement("div");
  labelDiv.className = "pe-tree-label";

  var arrow = document.createElement("span");
  arrow.className = "pe-tree-arrow" + (children && children.length > 0 ? "" : " leaf");
  arrow.textContent = "\u25B6"; // right-pointing triangle
  labelDiv.appendChild(arrow);

  var text = document.createElement("span");
  text.textContent = label;
  labelDiv.appendChild(text);

  li.appendChild(labelDiv);

  if (children && children.length > 0) {
    var childUl = document.createElement("ul");
    childUl.className = "pe-tree-children";
    children.forEach(function (child) { childUl.appendChild(child); });
    li.appendChild(childUl);

    // Toggle expand/collapse on arrow click
    arrow.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleNode(li);
    });
  }

  // Click label -> select + show detail
  labelDiv.addEventListener("click", function () {
    // Toggle expand if has children
    if (children && children.length > 0) {
      toggleNode(li);
    }
    // Select this node
    if (selectedLabel) selectedLabel.classList.remove("selected");
    labelDiv.classList.add("selected");
    selectedLabel = labelDiv;
    // Fire callback
    if (onClick) onClick();
  });

  return li;
}

function toggleNode(li) {
  var childUl = li.querySelector(":scope > ul");
  var arrow = li.querySelector(":scope > .pe-tree-label > .pe-tree-arrow");
  if (!childUl) return;
  var isOpen = childUl.classList.contains("open");
  childUl.classList.toggle("open");
  if (arrow) arrow.classList.toggle("expanded", !isOpen);
}

function expandNode(li) {
  var childUl = li.querySelector(":scope > ul");
  var arrow = li.querySelector(":scope > .pe-tree-label > .pe-tree-arrow");
  if (childUl) {
    childUl.classList.add("open");
    if (arrow) arrow.classList.add("expanded");
  }
}

function expandAllNodes(li) {
  expandNode(li);
  var children = li.querySelectorAll(":scope > ul > li");
  children.forEach(function (child) {
    expandAllNodes(child);
  });
}

// ============================================================
// UI: Detail panel
// ============================================================

function showFields(title, sectionKey, fields) {
  var panel = document.getElementById("detailPanel");
  var html = '<div class="pe-detail-header">' + escapeHtml(title) + '</div>';
  html += '<table class="pe-detail-table"><thead><tr>';
  html += '<th class="col-member">Member</th>';
  html += '<th class="col-offset">Offset</th>';
  html += '<th class="col-size">Size</th>';
  html += '<th class="col-value">Value</th>';
  html += '<th class="col-meaning">Meaning</th>';
  html += '</tr></thead><tbody>';

  fields.forEach(function (f) {
    var valStr;
    if (f.isString) {
      valStr = '"' + escapeHtml(f.value) + '"';
    } else if (f.valueLo !== undefined && f.valueHi !== undefined) {
      valStr = hex64(f.valueLo, f.valueHi);
    } else {
      valStr = hex(f.value, f.size * 2);
    }

    var rawVal = (f.valueLo !== undefined) ? (f.valueHi * 0x100000000 + f.valueLo) : f.value;
    var meaning = getMeaning(sectionKey, f.name, rawVal, f);

    html += '<tr>';
    html += '<td>' + escapeHtml(f.name) + '</td>';
    html += '<td>' + hex(f.offset, 8) + '</td>';
    html += '<td>' + f.size + '</td>';
    html += '<td>' + valStr + '</td>';
    html += '<td>' + escapeHtml(meaning) + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table>';
  panel.innerHTML = html;
}

function showDataDirectories(dirs) {
  var panel = document.getElementById("detailPanel");
  var html = '<div class="pe-detail-header">Data Directories</div>';
  html += '<table class="pe-detail-table"><thead><tr>';
  html += '<th style="width:5%">#</th>';
  html += '<th style="width:30%">Name</th>';
  html += '<th style="width:10%">Offset</th>';
  html += '<th style="width:20%">RVA</th>';
  html += '<th style="width:20%">Size</th>';
  html += '<th style="width:15%">Present</th>';
  html += '</tr></thead><tbody>';

  dirs.forEach(function (dir, idx) {
    var present = (dir.rva !== 0 || dir.size !== 0) ? "Yes" : "No";
    html += '<tr>';
    html += '<td>' + idx + '</td>';
    html += '<td>' + escapeHtml(dir.name) + '</td>';
    html += '<td>' + hex(dir.offset, 8) + '</td>';
    html += '<td>' + hex(dir.rva, 8) + '</td>';
    html += '<td>' + hex(dir.size, 8) + ' (' + dir.size + ')' + '</td>';
    html += '<td>' + present + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table>';
  panel.innerHTML = html;
}

function showSingleDataDirectory(dir, idx) {
  var panel = document.getElementById("detailPanel");
  var html = '<div class="pe-detail-header">Data Directory: ' + escapeHtml(dir.name) + ' (#' + idx + ')</div>';
  html += '<table class="pe-detail-table"><thead><tr>';
  html += '<th class="col-member">Member</th>';
  html += '<th class="col-offset">Offset</th>';
  html += '<th class="col-size">Size</th>';
  html += '<th class="col-value">Value</th>';
  html += '<th class="col-meaning">Meaning</th>';
  html += '</tr></thead><tbody>';

  html += '<tr><td>VirtualAddress (RVA)</td><td>' + hex(dir.offset, 8) + '</td><td>4</td><td>' + hex(dir.rva, 8) + '</td><td>' + (dir.rva === 0 ? "Not present" : "RVA of " + dir.name) + '</td></tr>';
  html += '<tr><td>Size</td><td>' + hex(dir.offset + 4, 8) + '</td><td>4</td><td>' + hex(dir.size, 8) + '</td><td>' + dir.size + ' bytes' + '</td></tr>';

  html += '</tbody></table>';
  panel.innerHTML = html;
}

function showExportTable(exportTable) {
  var panel = document.getElementById("detailPanel");
  if (!exportTable) {
    panel.innerHTML = '<div class="pe-detail-header">Export Table</div>' +
      '<div class="pe-welcome"><p>No export table found in this PE file.</p></div>';
    return;
  }

  // Show the Export Directory header fields
  var html = '<div class="pe-detail-header">Export Directory: ' + escapeHtml(exportTable.header.dllName) + '</div>';
  html += '<table class="pe-detail-table"><thead><tr>';
  html += '<th class="col-member">Member</th>';
  html += '<th class="col-offset">Offset</th>';
  html += '<th class="col-size">Size</th>';
  html += '<th class="col-value">Value</th>';
  html += '<th class="col-meaning">Meaning</th>';
  html += '</tr></thead><tbody>';

  exportTable.header.fields.forEach(function (f) {
    var valStr = hex(f.value, f.size * 2);
    var meaning = "";
    if (f.name === "Name (RVA)") meaning = exportTable.header.dllName;
    else if (f.name === "TimeDateStamp") meaning = formatTimestamp(f.value);
    else if (f.name === "OrdinalBase") meaning = "First ordinal number";
    else if (f.name === "NumberOfFunctions") meaning = f.value + " exported function(s)";
    else if (f.name === "NumberOfNames") meaning = f.value + " named export(s)";
    else if (f.name === "AddressOfFunctions") meaning = "RVA of Export Address Table";
    else if (f.name === "AddressOfNames") meaning = "RVA of Export Name Pointer Table";
    else if (f.name === "AddressOfNameOrdinals") meaning = "RVA of Export Ordinal Table";

    html += '<tr>';
    html += '<td>' + escapeHtml(f.name) + '</td>';
    html += '<td>' + hex(f.offset, 8) + '</td>';
    html += '<td>' + f.size + '</td>';
    html += '<td>' + valStr + '</td>';
    html += '<td>' + escapeHtml(meaning) + '</td>';
    html += '</tr>';
  });
  html += '</tbody></table>';

  // Show the exported functions list
  if (exportTable.functions.length > 0) {
    html += '<div class="pe-detail-header" style="margin-top: 0; border-top: 1px solid #ced4da;">Exported Functions (' + exportTable.functions.length + ')</div>';
    html += '<table class="pe-detail-table"><thead><tr>';
    html += '<th style="width:10%">Ordinal</th>';
    html += '<th style="width:15%">RVA</th>';
    html += '<th style="width:40%">Name</th>';
    html += '<th style="width:35%">Forwarder</th>';
    html += '</tr></thead><tbody>';

    exportTable.functions.forEach(function (fn) {
      html += '<tr>';
      html += '<td>' + fn.ordinal + '</td>';
      html += '<td>' + hex(fn.rva, 8) + '</td>';
      html += '<td>' + escapeHtml(fn.name || "(by ordinal only)") + '</td>';
      html += '<td>' + (fn.forwarder ? escapeHtml(fn.forwarder) : "-") + '</td>';
      html += '</tr>';
    });

    html += '</tbody></table>';
  }

  panel.innerHTML = html;
}

function showImportTableOverview(importTable) {
  var panel = document.getElementById("detailPanel");
  if (!importTable || importTable.length === 0) {
    panel.innerHTML = '<div class="pe-detail-header">Import Table</div>' +
      '<div class="pe-welcome"><p>No import table found in this PE file.</p></div>';
    return;
  }

  var html = '<div class="pe-detail-header">Import Table (' + importTable.length + ' DLLs)</div>';
  html += '<table class="pe-detail-table"><thead><tr>';
  html += '<th style="width:5%">#</th>';
  html += '<th style="width:30%">DLL Name</th>';
  html += '<th style="width:12%">ILT RVA</th>';
  html += '<th style="width:12%">IAT RVA</th>';
  html += '<th style="width:12%">Name RVA</th>';
  html += '<th style="width:10%">Functions</th>';
  html += '<th style="width:19%">TimeDateStamp</th>';
  html += '</tr></thead><tbody>';

  importTable.forEach(function (dll, idx) {
    html += '<tr>';
    html += '<td>' + idx + '</td>';
    html += '<td>' + escapeHtml(dll.dllName) + '</td>';
    html += '<td>' + hex(dll.fields[0].value, 8) + '</td>';
    html += '<td>' + hex(dll.fields[4].value, 8) + '</td>';
    html += '<td>' + hex(dll.fields[3].value, 8) + '</td>';
    html += '<td>' + dll.functions.length + '</td>';
    html += '<td>' + (dll.fields[1].value === 0 ? "Not bound" : formatTimestamp(dll.fields[1].value)) + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table>';
  panel.innerHTML = html;
}

function showImportDll(dll) {
  var panel = document.getElementById("detailPanel");
  var html = '<div class="pe-detail-header">Import: ' + escapeHtml(dll.dllName) + '</div>';

  // Show the import descriptor fields
  html += '<table class="pe-detail-table"><thead><tr>';
  html += '<th class="col-member">Member</th>';
  html += '<th class="col-offset">Offset</th>';
  html += '<th class="col-size">Size</th>';
  html += '<th class="col-value">Value</th>';
  html += '<th class="col-meaning">Meaning</th>';
  html += '</tr></thead><tbody>';

  dll.fields.forEach(function (f) {
    var valStr = hex(f.value, f.size * 2);
    var meaning = "";
    if (f.name === "Name (RVA)") meaning = dll.dllName;
    else if (f.name === "TimeDateStamp") meaning = f.value === 0 ? "Not bound" : formatTimestamp(f.value);
    else if (f.name === "ForwarderChain") meaning = f.value === 0 ? "No forwarder" : f.value === 0xFFFFFFFF ? "No forwarder (-1)" : "";
    else if (f.name === "OriginalFirstThunk (ILT RVA)") meaning = f.value === 0 ? "Not set" : "RVA of Import Lookup Table";
    else if (f.name === "FirstThunk (IAT RVA)") meaning = "RVA of Import Address Table";

    html += '<tr>';
    html += '<td>' + escapeHtml(f.name) + '</td>';
    html += '<td>' + hex(f.offset, 8) + '</td>';
    html += '<td>' + f.size + '</td>';
    html += '<td>' + valStr + '</td>';
    html += '<td>' + escapeHtml(meaning) + '</td>';
    html += '</tr>';
  });
  html += '</tbody></table>';

  // Show imported functions
  if (dll.functions.length > 0) {
    html += '<div class="pe-detail-header" style="margin-top: 0; border-top: 1px solid #ced4da;">Imported Functions (' + dll.functions.length + ')</div>';
    html += '<table class="pe-detail-table"><thead><tr>';
    html += '<th style="width:10%">Hint</th>';
    html += '<th style="width:15%">Ordinal</th>';
    html += '<th style="width:75%">Name</th>';
    html += '</tr></thead><tbody>';

    dll.functions.forEach(function (fn) {
      html += '<tr>';
      html += '<td>' + (fn.hint !== null ? hex(fn.hint, 4) : "-") + '</td>';
      html += '<td>' + (fn.ordinal !== null ? fn.ordinal : "-") + '</td>';
      html += '<td>' + escapeHtml(fn.name) + '</td>';
      html += '</tr>';
    });

    html += '</tbody></table>';
  }

  panel.innerHTML = html;
}

function showDebugDirectoryOverview(entries) {
  var panel = document.getElementById("detailPanel");
  if (entries.length === 0) {
    panel.innerHTML = '<div class="pe-detail-header">Debug Directory</div>' +
      '<div class="pe-welcome"><p>No debug directory entries found.</p></div>';
    return;
  }

  var html = '<div class="pe-detail-header">Debug Directory (' + entries.length + ' entries)</div>';
  html += '<table class="pe-detail-table"><thead><tr>';
  html += '<th style="width:5%">#</th>';
  html += '<th style="width:15%">Type</th>';
  html += '<th style="width:12%">Offset</th>';
  html += '<th style="width:12%">RawDataPtr</th>';
  html += '<th style="width:10%">Size</th>';
  html += '<th style="width:15%">CodeView</th>';
  html += '<th style="width:31%">PDB Path</th>';
  html += '</tr></thead><tbody>';

  entries.forEach(function (entry) {
    var cvType = entry.codeView ? entry.codeView.signatureType : "-";
    var pdbPath = "-";
    if (entry.codeView) {
      var pdbField = entry.codeView.fields.find(function (f) { return f.name === "PdbFileName"; });
      if (pdbField) pdbPath = pdbField.value;
    }
    html += '<tr>';
    html += '<td>' + entry.index + '</td>';
    html += '<td>' + escapeHtml(entry.typeName) + '</td>';
    html += '<td>' + hex(entry.offset, 8) + '</td>';
    html += '<td>' + hex(entry.fields[7].value, 8) + '</td>';
    html += '<td>' + entry.fields[5].value + '</td>';
    html += '<td>' + escapeHtml(cvType) + '</td>';
    html += '<td>' + escapeHtml(pdbPath) + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table>';
  panel.innerHTML = html;
}

function showDebugEntry(entry) {
  var panel = document.getElementById("detailPanel");
  var title = "Debug Entry #" + entry.index + ": " + entry.typeName;
  var html = '<div class="pe-detail-header">' + escapeHtml(title) + '</div>';

  // Debug directory entry fields
  html += '<table class="pe-detail-table"><thead><tr>';
  html += '<th class="col-member">Member</th>';
  html += '<th class="col-offset">Offset</th>';
  html += '<th class="col-size">Size</th>';
  html += '<th class="col-value">Value</th>';
  html += '<th class="col-meaning">Meaning</th>';
  html += '</tr></thead><tbody>';

  entry.fields.forEach(function (f) {
    var valStr = hex(f.value, f.size * 2);
    var meaning = "";
    if (f.name === "Type") meaning = IMAGE_DEBUG_TYPE[f.value] || "Unknown";
    else if (f.name === "TimeDateStamp") meaning = formatTimestamp(f.value);
    else if (f.name === "SizeOfData") meaning = f.value + " bytes";
    else if (f.name === "AddressOfRawData") meaning = f.value === 0 ? "Not set" : "RVA of debug data";
    else if (f.name === "PointerToRawData") meaning = f.value === 0 ? "Not set" : "File offset of debug data";
    else if (f.name === "Characteristics") meaning = "Reserved, should be 0";

    html += '<tr>';
    html += '<td>' + escapeHtml(f.name) + '</td>';
    html += '<td>' + hex(f.offset, 8) + '</td>';
    html += '<td>' + f.size + '</td>';
    html += '<td>' + valStr + '</td>';
    html += '<td>' + escapeHtml(meaning) + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table>';

  // CodeView details
  if (entry.codeView) {
    html += '<div class="pe-detail-header" style="margin-top: 0; border-top: 1px solid #ced4da;">CodeView: ' + escapeHtml(entry.codeView.signatureType) + '</div>';
    html += '<table class="pe-detail-table"><thead><tr>';
    html += '<th class="col-member">Member</th>';
    html += '<th class="col-offset">Offset</th>';
    html += '<th class="col-size">Size</th>';
    html += '<th class="col-value">Value</th>';
    html += '<th class="col-meaning">Meaning</th>';
    html += '</tr></thead><tbody>';

    entry.codeView.fields.forEach(function (f) {
      var valStr;
      if (f.isString) {
        valStr = escapeHtml(f.value);
      } else {
        valStr = hex(f.value, f.size * 2);
      }
      html += '<tr>';
      html += '<td>' + escapeHtml(f.name) + '</td>';
      html += '<td>' + hex(f.offset, 8) + '</td>';
      html += '<td>' + f.size + '</td>';
      html += '<td>' + valStr + '</td>';
      html += '<td>' + escapeHtml(f.meaning || "") + '</td>';
      html += '</tr>';
    });

    html += '</tbody></table>';
  }

  panel.innerHTML = html;
}

function escapeHtml(str) {
  var div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================
// UI: Resizer
// ============================================================

(function setupResizer() {
  var resizer = document.getElementById("resizer");
  var treePanel = document.getElementById("treePanel");
  var startX, startWidth;

  resizer.addEventListener("mousedown", function (e) {
    startX = e.clientX;
    startWidth = treePanel.offsetWidth;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    e.preventDefault();
  });

  function onMouseMove(e) {
    var newWidth = startWidth + (e.clientX - startX);
    if (newWidth < 150) newWidth = 150;
    if (newWidth > 600) newWidth = 600;
    treePanel.style.width = newWidth + "px";
  }

  function onMouseUp() {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  }
})();

// ============================================================
// File loading
// ============================================================

document.getElementById("fileInput").addEventListener("change", function (event) {
  var file = event.target.files[0];
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function (e) {
    peData = e.target.result;
    peView = new DataView(peData);
    selectedLabel = null;

    try {
      parsedPE = parsePE(peData);
    } catch (err) {
      document.getElementById("detailPanel").innerHTML =
        '<div class="pe-welcome"><h2>Error</h2><p style="color: #c53030;">' + escapeHtml(err.message) + '</p></div>';
      document.getElementById("peTree").innerHTML = "";
      document.getElementById("fileInfo").textContent = "";
      return;
    }

    // Show file info
    var machine = parsedPE.fileHeader.fields[0].value;
    var machineStr = IMAGE_FILE_MACHINE[machine] || "Unknown";
    var bitness = parsedPE.is64 ? "PE32+" : "PE32";
    document.getElementById("fileInfo").textContent =
      file.name + " | " + (file.size / 1024).toFixed(1) + " KB | " + bitness + " | " + machineStr;

    // Build tree and show DOS header by default
    buildTree(parsedPE);
    showFields("DOS Header", "dosHeader", parsedPE.dosHeader.fields);

    // Select the DOS Header node in the tree
    var labels = document.querySelectorAll(".pe-tree-label");
    for (var i = 0; i < labels.length; i++) {
      if (labels[i].textContent.trim() === "DOS Header") {
        labels[i].classList.add("selected");
        selectedLabel = labels[i];
        break;
      }
    }
  };
  reader.readAsArrayBuffer(file);
});
