// PE Editor - Pure JavaScript PE parser with tree view + detail table UI
// Parses: DOS Header, NT Headers (File Header, Optional Header), Data Directories, Section Headers

var peData = null;    // ArrayBuffer of loaded file
var peView = null;    // DataView for reading
var parsedPE = null;  // Parsed structure
var selectedLabel = null; // Currently selected tree label element
var isModified = false;   // Tracks whether any field has been changed
var loadedFileName = null; // Stores the original file name for download
var currentSection = null; // Currently displayed section key (for edit re-render)

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

// Base Relocation types (4-bit type field in relocation entries)
var IMAGE_REL_BASED = {
  0: "ABSOLUTE",        // Padding, skip
  1: "HIGH",            // High 16 bits of 32-bit field
  2: "LOW",             // Low 16 bits of 32-bit field
  3: "HIGHLOW",         // Full 32-bit field
  4: "HIGHADJ",         // High 16 bits, requires parameter
  5: "MIPS_JMPADDR",    // MIPS jump address
  6: "ARM_MOV32",       // ARM MOV32 (also RISCV_HIGH20)
  7: "RISCV_LOW12I",
  9: "MIPS_JMPADDR16",  // MIPS16 jump address
  10: "DIR64",           // Full 64-bit field
};

// Certificate revision and type constants
var WIN_CERT_REVISION = {
  0x0100: "1.0",
  0x0200: "2.0",
};

var WIN_CERT_TYPE = {
  0x0001: "X.509",
  0x0002: "PKCS SignedData",
  0x0003: "Reserved",
  0x0004: "PKCS1_MODULE_SIGN (Terminal Server)",
};

// x64 Unwind operation codes (UWOP)
var UWOP_NAMES = {
  0: "PUSH_NONVOL", 1: "ALLOC_LARGE", 2: "ALLOC_SMALL", 3: "SET_FPREG",
  4: "SAVE_NONVOL", 5: "SAVE_NONVOL_FAR", 8: "SAVE_XMM128",
  9: "SAVE_XMM128_FAR", 10: "PUSH_MACHFRAME",
};

// x64 register names (indexed by register number 0-15)
var X64_REGISTERS = [
  "RAX", "RCX", "RDX", "RBX", "RSP", "RBP", "RSI", "RDI",
  "R8", "R9", "R10", "R11", "R12", "R13", "R14", "R15",
];

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

  // --- Base Relocation Table ---
  result.baseRelocations = parseBaseRelocationTable(view, buffer, result.dataDirectories, result.sections);

  // --- Certificate Table ---
  result.certificates = parseCertificateTable(view, buffer, result.dataDirectories);

  // --- TLS Directory ---
  result.tlsDirectory = parseTlsDirectory(view, buffer, result.dataDirectories, result.sections, result.is64);

  // --- Exception Table (.pdata / .xdata) ---
  result.exceptionTable = parseExceptionTable(view, buffer, result.dataDirectories, result.sections, machine);

  // --- Load Config Directory ---
  result.loadConfig = parseLoadConfigDirectory(view, buffer, result.dataDirectories, result.sections, result.is64);

  // --- Resource Directory ---
  result.resourceDirectory = parseResourceDirectory(view, buffer, result.dataDirectories, result.sections);

  // --- Bound Import ---
  result.boundImport = parseBoundImport(view, buffer, result.dataDirectories);

  // --- IAT ---
  result.iat = parseIAT(view, buffer, result.dataDirectories, result.sections, result.is64);

  // --- Delay Import Descriptor ---
  result.delayImport = parseDelayImportDescriptor(view, buffer, result.dataDirectories, result.sections, result.is64);

  // --- CLR Runtime Header ---
  result.clrHeader = parseCLRHeader(view, buffer, result.dataDirectories, result.sections);

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

// Parse the Base Relocation Table (Data Directory index 5)
// A series of IMAGE_BASE_RELOCATION blocks, each with VirtualAddress + SizeOfBlock
// followed by an array of 2-byte type/offset entries.
function parseBaseRelocationTable(view, buffer, dataDirectories, sections) {
  if (dataDirectories.length <= 5) return null;
  var relocDir = dataDirectories[5];
  if (relocDir.rva === 0 || relocDir.size === 0) return null;

  var baseOff = rvaToFileOffset(relocDir.rva, sections);
  if (baseOff + 8 > buffer.byteLength) return null;

  var blocks = [];
  var pos = baseOff;
  var endPos = baseOff + relocDir.size;
  var maxBlocks = 10000; // safety limit

  for (var b = 0; b < maxBlocks; b++) {
    if (pos + 8 > buffer.byteLength || pos + 8 > endPos) break;

    var pageRva = view.getUint32(pos, true);
    var blockSize = view.getUint32(pos + 4, true);

    // End of relocation data
    if (pageRva === 0 && blockSize === 0) break;
    if (blockSize < 8) break; // invalid block

    var numEntries = Math.floor((blockSize - 8) / 2);
    var entries = [];

    for (var e = 0; e < numEntries; e++) {
      var entryOff = pos + 8 + e * 2;
      if (entryOff + 2 > buffer.byteLength) break;
      var word = view.getUint16(entryOff, true);
      var type = (word >> 12) & 0xF;
      var offset = word & 0xFFF;
      entries.push({
        type: type,
        typeName: IMAGE_REL_BASED[type] || ("Unknown (" + type + ")"),
        offset: offset,
        rva: pageRva + offset,
      });
    }

    blocks.push({
      fileOffset: pos,
      pageRva: pageRva,
      blockSize: blockSize,
      entries: entries,
    });

    pos += blockSize;
    // Align to 4-byte boundary
    if (pos % 4 !== 0) pos += 4 - (pos % 4);
  }

  return blocks;
}

// Parse the Certificate Table (Data Directory index 4)
// Note: Certificate Table uses FILE OFFSET (not RVA!) in the data directory.
// Contains WIN_CERTIFICATE structures: dwLength(4) + wRevision(2) + wCertificateType(2) + bCertificate(variable)
function parseCertificateTable(view, buffer, dataDirectories) {
  if (dataDirectories.length <= 4) return null;
  var certDir = dataDirectories[4];
  if (certDir.rva === 0 || certDir.size === 0) return null;

  // For Certificate Table, the RVA field is actually a file offset!
  var fileOffset = certDir.rva;
  var endOffset = fileOffset + certDir.size;
  if (fileOffset + 8 > buffer.byteLength) return null;

  var certs = [];
  var pos = fileOffset;
  var maxCerts = 100; // safety limit

  for (var c = 0; c < maxCerts; c++) {
    if (pos + 8 > buffer.byteLength || pos + 8 > endOffset) break;

    var dwLength = view.getUint32(pos, true);
    var wRevision = view.getUint16(pos + 4, true);
    var wCertificateType = view.getUint16(pos + 6, true);

    if (dwLength < 8) break; // invalid

    certs.push({
      index: c,
      fileOffset: pos,
      fields: [
        { name: "dwLength",          offset: pos,     size: 4, value: dwLength },
        { name: "wRevision",         offset: pos + 4, size: 2, value: wRevision },
        { name: "wCertificateType",  offset: pos + 6, size: 2, value: wCertificateType },
      ],
      length: dwLength,
      revision: WIN_CERT_REVISION[wRevision] || ("Unknown (" + hex(wRevision, 4) + ")"),
      certType: WIN_CERT_TYPE[wCertificateType] || ("Unknown (" + hex(wCertificateType, 4) + ")"),
      dataOffset: pos + 8,
      dataSize: dwLength - 8,
    });

    // Advance to next certificate, aligned to 8-byte boundary
    pos += dwLength;
    if (pos % 8 !== 0) pos += 8 - (pos % 8);
  }

  return certs;
}

// Parse the TLS Directory (Data Directory index 9)
// IMAGE_TLS_DIRECTORY32 (24 bytes) or IMAGE_TLS_DIRECTORY64 (40 bytes)
function parseTlsDirectory(view, buffer, dataDirectories, sections, is64) {
  if (dataDirectories.length <= 9) return null;
  var tlsDir = dataDirectories[9];
  if (tlsDir.rva === 0 || tlsDir.size === 0) return null;

  var off = rvaToFileOffset(tlsDir.rva, sections);

  if (is64) {
    // IMAGE_TLS_DIRECTORY64: 40 bytes
    if (off + 40 > buffer.byteLength) return null;
    return {
      offset: off,
      is64: true,
      fields: [
        { name: "StartAddressOfRawData", offset: off,      size: 8,
          valueLo: view.getUint32(off, true), valueHi: view.getUint32(off + 4, true) },
        { name: "EndAddressOfRawData",   offset: off + 8,  size: 8,
          valueLo: view.getUint32(off + 8, true), valueHi: view.getUint32(off + 12, true) },
        { name: "AddressOfIndex",        offset: off + 16, size: 8,
          valueLo: view.getUint32(off + 16, true), valueHi: view.getUint32(off + 20, true) },
        { name: "AddressOfCallBacks",    offset: off + 24, size: 8,
          valueLo: view.getUint32(off + 24, true), valueHi: view.getUint32(off + 28, true) },
        { name: "SizeOfZeroFill",        offset: off + 32, size: 4, value: view.getUint32(off + 32, true) },
        { name: "Characteristics",       offset: off + 36, size: 4, value: view.getUint32(off + 36, true) },
      ],
    };
  } else {
    // IMAGE_TLS_DIRECTORY32: 24 bytes
    if (off + 24 > buffer.byteLength) return null;
    return {
      offset: off,
      is64: false,
      fields: [
        { name: "StartAddressOfRawData", offset: off,      size: 4, value: view.getUint32(off, true) },
        { name: "EndAddressOfRawData",   offset: off + 4,  size: 4, value: view.getUint32(off + 4, true) },
        { name: "AddressOfIndex",        offset: off + 8,  size: 4, value: view.getUint32(off + 8, true) },
        { name: "AddressOfCallBacks",    offset: off + 12, size: 4, value: view.getUint32(off + 12, true) },
        { name: "SizeOfZeroFill",        offset: off + 16, size: 4, value: view.getUint32(off + 16, true) },
        { name: "Characteristics",       offset: off + 20, size: 4, value: view.getUint32(off + 20, true) },
      ],
    };
  }
}

// Parse the Exception Table (.pdata) - Data Directory index 3
// x64: RUNTIME_FUNCTION entries (12 bytes each): BeginAddress, EndAddress, UnwindInfoAddress
// ARM64: RUNTIME_FUNCTION entries (8 bytes each): BeginAddress, UnwindData
function parseExceptionTable(view, buffer, dataDirectories, sections, machine) {
  if (dataDirectories.length <= 3) return null;
  var excDir = dataDirectories[3];
  if (excDir.rva === 0 || excDir.size === 0) return null;

  var baseOff = rvaToFileOffset(excDir.rva, sections);
  if (baseOff >= buffer.byteLength) return null;

  var isX64 = (machine === 0x8664);
  var isARM64 = (machine === 0xAA64);
  if (!isX64 && !isARM64) return null;

  var entries = [];
  var entrySize = isX64 ? 12 : 8;
  var numEntries = Math.min(Math.floor(excDir.size / entrySize), 50000);

  for (var i = 0; i < numEntries; i++) {
    var off = baseOff + i * entrySize;
    if (off + entrySize > buffer.byteLength) break;

    var beginAddr = view.getUint32(off, true);

    if (isX64) {
      var endAddr = view.getUint32(off + 4, true);
      var unwindDataRva = view.getUint32(off + 8, true);

      var entry = {
        index: i, fileOffset: off, beginAddress: beginAddr,
        endAddress: endAddr, unwindDataRva: unwindDataRva,
        functionSize: endAddr - beginAddr, architecture: "x64",
        unwindInfo: null,
      };

      if (unwindDataRva !== 0) {
        entry.unwindInfo = parseUnwindInfoX64(view, buffer, unwindDataRva, sections);
      }
      entries.push(entry);
    } else {
      // ARM64
      var unwindWord = view.getUint32(off + 4, true);
      var flag = unwindWord & 0x3; // 2-bit flag

      var entry = {
        index: i, fileOffset: off, beginAddress: beginAddr,
        architecture: "ARM64", isPacked: (flag !== 0),
        unwindInfo: null, packedInfo: null,
      };

      if (flag !== 0) {
        // Packed unwind data
        var funcLen = ((unwindWord >> 2) & 0x7FF) * 4;
        var frameSize = ((unwindWord >> 13) & 0x1FF) * 16;
        var cr = (unwindWord >> 22) & 0x3;
        var h = (unwindWord >> 24) & 0x1;
        var regI = (unwindWord >> 25) & 0xF;
        var regF = (unwindWord >> 29) & 0x7;

        entry.functionSize = funcLen;
        entry.endAddress = beginAddr + funcLen;
        entry.packedInfo = {
          flag: flag, functionLength: funcLen, frameSize: frameSize,
          cr: cr, h: h, regI: regI, regF: regF,
        };
      } else {
        // Exception Information RVA (low 2 bits are flag=0, rest is RVA with low 2 bits implicitly 0)
        entry.unwindDataRva = unwindWord;
        entry.unwindInfo = parseUnwindInfoARM64(view, buffer, unwindWord, sections);
      }
      entries.push(entry);
    }
  }

  return { architecture: isX64 ? "x64" : "ARM64", entries: entries };
}

// Parse x64 UNWIND_INFO structure from .xdata
function parseUnwindInfoX64(view, buffer, unwindRva, sections) {
  var off = rvaToFileOffset(unwindRva, sections);
  if (off + 4 > buffer.byteLength) return null;

  var byte0 = view.getUint8(off);
  var version = byte0 & 0x7;
  var flags = (byte0 >> 3) & 0x1F;
  var sizeOfProlog = view.getUint8(off + 1);
  var countOfCodes = view.getUint8(off + 2);
  var byte3 = view.getUint8(off + 3);
  var frameRegister = byte3 & 0xF;
  var frameOffset = ((byte3 >> 4) & 0xF) * 16;

  // Decode flag names
  var flagNames = [];
  if (flags & 0x1) flagNames.push("EHANDLER");
  if (flags & 0x2) flagNames.push("UHANDLER");
  if (flags & 0x4) flagNames.push("CHAININFO");
  var flagStr = flagNames.length > 0 ? flagNames.join(" | ") : "NHANDLER";

  // Parse unwind codes
  var codes = [];
  var codesOff = off + 4;
  var ci = 0;
  while (ci < countOfCodes) {
    if (codesOff + ci * 2 + 2 > buffer.byteLength) break;
    var codeOffset = view.getUint8(codesOff + ci * 2);
    var opByte = view.getUint8(codesOff + ci * 2 + 1);
    var unwindOp = opByte & 0xF;
    var opInfo = (opByte >> 4) & 0xF;

    var code = {
      codeOffset: codeOffset, unwindOp: unwindOp,
      opName: UWOP_NAMES[unwindOp] || ("Unknown(" + unwindOp + ")"),
      opInfo: opInfo, description: "", slots: 1,
    };

    switch (unwindOp) {
      case 0: // PUSH_NONVOL
        code.description = "push " + (X64_REGISTERS[opInfo] || "reg" + opInfo);
        code.slots = 1;
        break;
      case 1: // ALLOC_LARGE
        if (opInfo === 0) {
          if (codesOff + (ci + 1) * 2 + 2 <= buffer.byteLength) {
            var sz = view.getUint16(codesOff + (ci + 1) * 2, true) * 8;
            code.description = "alloc " + sz + " bytes";
          }
          code.slots = 2;
        } else {
          if (codesOff + (ci + 1) * 2 + 4 <= buffer.byteLength) {
            var sz = view.getUint32(codesOff + (ci + 1) * 2, true);
            code.description = "alloc " + sz + " bytes";
          }
          code.slots = 3;
        }
        break;
      case 2: // ALLOC_SMALL
        code.description = "alloc " + (opInfo * 8 + 8) + " bytes";
        code.slots = 1;
        break;
      case 3: // SET_FPREG
        code.description = "set frame reg " + (X64_REGISTERS[frameRegister] || "reg" + frameRegister) + " = RSP+" + hex(frameOffset);
        code.slots = 1;
        break;
      case 4: // SAVE_NONVOL
        if (codesOff + (ci + 1) * 2 + 2 <= buffer.byteLength) {
          var saveOff = view.getUint16(codesOff + (ci + 1) * 2, true) * 8;
          code.description = "save " + (X64_REGISTERS[opInfo] || "reg" + opInfo) + " at [RSP+" + hex(saveOff) + "]";
        }
        code.slots = 2;
        break;
      case 5: // SAVE_NONVOL_FAR
        if (codesOff + (ci + 1) * 2 + 4 <= buffer.byteLength) {
          var saveOff = view.getUint32(codesOff + (ci + 1) * 2, true);
          code.description = "save " + (X64_REGISTERS[opInfo] || "reg" + opInfo) + " at [RSP+" + hex(saveOff) + "]";
        }
        code.slots = 3;
        break;
      case 8: // SAVE_XMM128
        if (codesOff + (ci + 1) * 2 + 2 <= buffer.byteLength) {
          var saveOff = view.getUint16(codesOff + (ci + 1) * 2, true) * 16;
          code.description = "save XMM" + opInfo + " at [RSP+" + hex(saveOff) + "]";
        }
        code.slots = 2;
        break;
      case 9: // SAVE_XMM128_FAR
        if (codesOff + (ci + 1) * 2 + 4 <= buffer.byteLength) {
          var saveOff = view.getUint32(codesOff + (ci + 1) * 2, true);
          code.description = "save XMM" + opInfo + " at [RSP+" + hex(saveOff) + "]";
        }
        code.slots = 3;
        break;
      case 10: // PUSH_MACHFRAME
        code.description = "machine frame" + (opInfo ? " with error code" : "");
        code.slots = 1;
        break;
      default:
        code.slots = 1;
        break;
    }
    codes.push(code);
    ci += code.slots;
  }

  // After codes: exception handler or chained function
  var afterCodesOff = codesOff + countOfCodes * 2;
  // Align to DWORD boundary (even number of USHORT entries)
  if (countOfCodes % 2 !== 0) afterCodesOff += 2;

  var handlerRva = 0;
  var chainedFunction = null;

  if (flags & 0x4) { // CHAININFO
    if (afterCodesOff + 12 <= buffer.byteLength) {
      chainedFunction = {
        beginAddress: view.getUint32(afterCodesOff, true),
        endAddress: view.getUint32(afterCodesOff + 4, true),
        unwindData: view.getUint32(afterCodesOff + 8, true),
      };
    }
  } else if (flags & 0x3) { // EHANDLER or UHANDLER
    if (afterCodesOff + 4 <= buffer.byteLength) {
      handlerRva = view.getUint32(afterCodesOff, true);
    }
  }

  return {
    fileOffset: off, version: version, flags: flags, flagStr: flagStr,
    sizeOfProlog: sizeOfProlog, countOfCodes: countOfCodes,
    frameRegister: frameRegister,
    frameRegisterName: frameRegister !== 0 ? (X64_REGISTERS[frameRegister] || "reg" + frameRegister) : "(none)",
    frameOffset: frameOffset, unwindCodes: codes,
    handlerRva: handlerRva, chainedFunction: chainedFunction,
  };
}

// Parse ARM64 .xdata unwind info (basic header)
function parseUnwindInfoARM64(view, buffer, unwindRva, sections) {
  var off = rvaToFileOffset(unwindRva, sections);
  if (off + 4 > buffer.byteLength) return null;

  var word0 = view.getUint32(off, true);
  var funcLength = (word0 & 0x3FFFF) * 4;
  var vers = (word0 >> 18) & 0x3;
  var x = (word0 >> 20) & 0x1;
  var e = (word0 >> 21) & 0x1;
  var epilogCount = (word0 >> 22) & 0x1F;
  var codeWords = (word0 >> 27) & 0x1F;

  // If both epilogCount and codeWords are 0, extended header is present
  var extendedHeader = (epilogCount === 0 && codeWords === 0);
  if (extendedHeader && off + 8 <= buffer.byteLength) {
    var word1 = view.getUint32(off + 4, true);
    epilogCount = word1 & 0xFFFF;
    codeWords = (word1 >> 16) & 0xFF;
  }

  var handlerRva = 0;
  if (x) {
    // Exception handler RVA is after epilog scopes + code words
    var headerSize = extendedHeader ? 8 : 4;
    var epilogScopeSize = e ? 0 : epilogCount * 4;
    var handlerOff = off + headerSize + epilogScopeSize + codeWords * 4;
    if (handlerOff + 4 <= buffer.byteLength) {
      handlerRva = view.getUint32(handlerOff, true);
    }
  }

  return {
    fileOffset: off, functionLength: funcLength, version: vers,
    hasExceptionData: x, singleEpilog: e,
    epilogCount: epilogCount, codeWords: codeWords,
    extendedHeader: extendedHeader, handlerRva: handlerRva,
  };
}

// Guard flags for Load Config
var IMAGE_GUARD_FLAGS = {
  0x00000100: "CF_INSTRUMENTED",
  0x00000200: "CFW_INSTRUMENTED",
  0x00000400: "CF_FUNCTION_TABLE_PRESENT",
  0x00000800: "SECURITY_COOKIE_UNUSED",
  0x00001000: "PROTECT_DELAYLOAD_IAT",
  0x00002000: "DELAYLOAD_IAT_IN_ITS_OWN_SECTION",
  0x00004000: "CF_EXPORT_SUPPRESSION_INFO_PRESENT",
  0x00008000: "CF_ENABLE_EXPORT_SUPPRESSION",
  0x00010000: "CF_LONGJUMP_TABLE_PRESENT",
  0x00100000: "EH_CONTINUATION_TABLE_PRESENT",
};

// Resource type names
var RT_NAMES = {
  1: "RT_CURSOR", 2: "RT_BITMAP", 3: "RT_ICON", 4: "RT_MENU",
  5: "RT_DIALOG", 6: "RT_STRING", 7: "RT_FONTDIR", 8: "RT_FONT",
  9: "RT_ACCELERATOR", 10: "RT_RCDATA", 11: "RT_MESSAGETABLE",
  12: "RT_GROUP_CURSOR", 14: "RT_GROUP_ICON", 16: "RT_VERSION",
  17: "RT_DLGINCLUDE", 19: "RT_PLUGPLAY", 20: "RT_VXD",
  21: "RT_ANICURSOR", 22: "RT_ANIICON", 23: "RT_HTML",
  24: "RT_MANIFEST",
};

// Editable section configuration
var EDITABLE_SECTIONS = ["dosHeader", "fileHeader", "optionalHeader", "section"];

var FIELD_EDIT_TYPE = {
  "fileHeader:Machine":                { type: "dropdown", options: IMAGE_FILE_MACHINE },
  "optionalHeader:Magic":              { type: "dropdown", options: { 0x10B: "PE32", 0x20B: "PE32+ (64-bit)", 0x107: "ROM image" } },
  "optionalHeader:Subsystem":          { type: "dropdown", options: IMAGE_SUBSYSTEM },
  "fileHeader:Characteristics":        { type: "bitmask", flags: IMAGE_FILE_CHARACTERISTICS },
  "optionalHeader:DllCharacteristics": { type: "bitmask", flags: IMAGE_DLLCHARACTERISTICS },
  "section:Characteristics":           { type: "bitmask", flags: SECTION_CHARACTERISTICS },
};

function parseLoadConfigDirectory(view, buffer, dataDirectories, sections, is64) {
  // Load Config is data directory index 10
  if (dataDirectories.length <= 10) return null;
  var lcDir = dataDirectories[10];
  if (lcDir.rva === 0 || lcDir.size === 0) return null;

  var off = rvaToFileOffset(lcDir.rva, sections);
  if (off + 4 > buffer.byteLength) return null;

  var structSize = view.getUint32(off, true);
  var fields = [];
  var pos = off;

  function addField4(name, desc) {
    if (pos + 4 - off > structSize || pos + 4 > buffer.byteLength) return;
    var v = view.getUint32(pos, true);
    fields.push({ name: name, offset: hex(pos, 8), rawHex: hex(v, 8), value: v, description: desc || "" });
    pos += 4;
  }
  function addField2(name, desc) {
    if (pos + 2 - off > structSize || pos + 2 > buffer.byteLength) return;
    var v = view.getUint16(pos, true);
    fields.push({ name: name, offset: hex(pos, 8), rawHex: hex(v, 4), value: v, description: desc || "" });
    pos += 2;
  }
  function addFieldPtr(name, desc) {
    if (is64) {
      if (pos + 8 - off > structSize || pos + 8 > buffer.byteLength) return;
      var lo = view.getUint32(pos, true);
      var hi = view.getUint32(pos + 4, true);
      var hx = hex64(lo, hi);
      fields.push({ name: name, offset: hex(pos, 8), rawHex: hx, value: hx, description: desc || "" });
      pos += 8;
    } else {
      if (pos + 4 - off > structSize || pos + 4 > buffer.byteLength) return;
      var v = view.getUint32(pos, true);
      fields.push({ name: name, offset: hex(pos, 8), rawHex: hex(v, 8), value: v, description: desc || "" });
      pos += 4;
    }
  }

  // Common fields (same order on 32 and 64 up to CSDVersion)
  addField4("Size", structSize + " bytes");
  addField4("TimeDateStamp", formatTimestamp(view.getUint32(pos, true)));
  addField2("MajorVersion", "");
  addField2("MinorVersion", "");
  addField4("GlobalFlagsClear", "");
  addField4("GlobalFlagsSet", "");
  addField4("CriticalSectionDefaultTimeout", "");

  if (is64) {
    addFieldPtr("DeCommitFreeBlockThreshold", "");
    addFieldPtr("DeCommitTotalFreeThreshold", "");
    addFieldPtr("LockPrefixTable", "VA");
    addFieldPtr("MaximumAllocationSize", "");
    addFieldPtr("VirtualMemoryThreshold", "");
    addFieldPtr("ProcessAffinityMask", "");
    addField4("ProcessHeapFlags", "");
  } else {
    addField4("DeCommitFreeBlockThreshold", "");
    addField4("DeCommitTotalFreeThreshold", "");
    addField4("LockPrefixTable", "VA");
    addField4("MaximumAllocationSize", "");
    addField4("VirtualMemoryThreshold", "");
    addField4("ProcessHeapFlags", "");
    addField4("ProcessAffinityMask", "");
  }
  addField2("CSDVersion", "Service pack version");
  addField2("DependentLoadFlags", "");
  addFieldPtr("EditList", "VA, reserved");
  addFieldPtr("SecurityCookie", "VA, /GS security cookie");
  addFieldPtr("SEHandlerTable", "VA, SE handler table (x86)");
  addFieldPtr("SEHandlerCount", "");
  addFieldPtr("GuardCFCheckFunctionPointer", "VA, CFG check function");
  addFieldPtr("GuardCFDispatchFunctionPointer", "VA, CFG dispatch function");
  addFieldPtr("GuardCFFunctionTable", "VA, CFG function table");
  addFieldPtr("GuardCFFunctionCount", "");

  // GuardFlags
  if (pos + 4 - off <= structSize && pos + 4 <= buffer.byteLength) {
    var gf = view.getUint32(pos, true);
    var gfDesc = decodeFlags(gf, IMAGE_GUARD_FLAGS);
    fields.push({ name: "GuardFlags", offset: hex(pos, 8), rawHex: hex(gf, 8), value: gf, description: gfDesc || "" });
    pos += 4;
  }

  // CodeIntegrity (12 bytes)
  if (pos + 12 - off <= structSize && pos + 12 <= buffer.byteLength) {
    var ciFlags = view.getUint16(pos, true);
    var ciCatalog = view.getUint16(pos + 2, true);
    var ciOffset = view.getUint32(pos + 4, true);
    var ciReserved = view.getUint32(pos + 8, true);
    fields.push({ name: "CodeIntegrity.Flags", offset: hex(pos, 8), rawHex: hex(ciFlags, 4), value: ciFlags, description: "" });
    fields.push({ name: "CodeIntegrity.Catalog", offset: hex(pos + 2, 8), rawHex: hex(ciCatalog, 4), value: ciCatalog, description: "" });
    fields.push({ name: "CodeIntegrity.CatalogOffset", offset: hex(pos + 4, 8), rawHex: hex(ciOffset, 8), value: ciOffset, description: "" });
    fields.push({ name: "CodeIntegrity.Reserved", offset: hex(pos + 8, 8), rawHex: hex(ciReserved, 8), value: ciReserved, description: "" });
    pos += 12;
  }

  // Remaining pointer fields
  var remainingFields = [
    "GuardAddressTakenIatEntryTable", "GuardAddressTakenIatEntryCount",
    "GuardLongJumpTargetTable", "GuardLongJumpTargetCount",
    "DynamicValueRelocTable", "CHPEMetadataPointer",
    "GuardRFFailureRoutine", "GuardRFFailureRoutineFunctionPointer",
  ];
  for (var i = 0; i < remainingFields.length; i++) {
    addFieldPtr(remainingFields[i], "");
  }

  // DynamicValueRelocTableOffset (DWORD) + Section (WORD) + Reserved2 (WORD)
  addField4("DynamicValueRelocTableOffset", "");
  addField2("DynamicValueRelocTableSection", "");
  addField2("Reserved2", "");

  // More pointer fields
  var moreFields = [
    "GuardRFVerifyStackPointerFunctionPointer",
  ];
  for (var i = 0; i < moreFields.length; i++) {
    addFieldPtr(moreFields[i], "");
  }
  addField4("HotPatchTableOffset", "");
  addField4("Reserved3", "");

  var finalFields = [
    "EnclaveConfigurationPointer", "VolatileMetadataPointer",
    "GuardEHContinuationTable", "GuardEHContinuationCount",
    "GuardXFGCheckFunctionPointer", "GuardXFGDispatchFunctionPointer",
    "GuardXFGTableDispatchFunctionPointer",
    "CastGuardOsDeterminedFailureMode", "GuardMemcpyFunctionPointer",
  ];
  for (var i = 0; i < finalFields.length; i++) {
    addFieldPtr(finalFields[i], "");
  }

  return { fileOffset: off, structSize: structSize, fields: fields };
}

function parseResourceDirectory(view, buffer, dataDirectories, sections) {
  // Resource Directory is data directory index 2
  if (dataDirectories.length <= 2) return null;
  var rsrcDir = dataDirectories[2];
  if (rsrcDir.rva === 0 || rsrcDir.size === 0) return null;

  var rsrcBaseOff = rvaToFileOffset(rsrcDir.rva, sections);
  if (rsrcBaseOff + 16 > buffer.byteLength) return null;

  var rsrcRva = rsrcDir.rva;

  function parseDir(dirOff, level, maxDepth) {
    if (level > maxDepth || dirOff + 16 > buffer.byteLength) return null;

    var characteristics = view.getUint32(dirOff, true);
    var timeDateStamp = view.getUint32(dirOff + 4, true);
    var majorVersion = view.getUint16(dirOff + 8, true);
    var minorVersion = view.getUint16(dirOff + 10, true);
    var numberOfNamedEntries = view.getUint16(dirOff + 12, true);
    var numberOfIdEntries = view.getUint16(dirOff + 14, true);
    var totalEntries = numberOfNamedEntries + numberOfIdEntries;

    // Cap entries to prevent runaway parsing
    if (totalEntries > 1000) totalEntries = 1000;

    var entries = [];
    var entryOff = dirOff + 16;

    for (var i = 0; i < totalEntries; i++) {
      if (entryOff + 8 > buffer.byteLength) break;

      var nameOrId = view.getUint32(entryOff, true);
      var offsetToData = view.getUint32(entryOff + 4, true);

      var entry = { nameOrId: nameOrId, isNamed: false, name: "", id: 0, isDirectory: false, children: null, dataEntry: null };

      // Decode name or ID
      if (nameOrId & 0x80000000) {
        // Named entry - read Unicode string
        entry.isNamed = true;
        var nameOff = rsrcBaseOff + (nameOrId & 0x7FFFFFFF);
        if (nameOff + 2 <= buffer.byteLength) {
          var nameLen = view.getUint16(nameOff, true);
          var nameBuf = [];
          for (var c = 0; c < Math.min(nameLen, 256); c++) {
            if (nameOff + 2 + c * 2 + 2 > buffer.byteLength) break;
            nameBuf.push(String.fromCharCode(view.getUint16(nameOff + 2 + c * 2, true)));
          }
          entry.name = nameBuf.join("");
        }
      } else {
        entry.id = nameOrId & 0xFFFF;
        if (level === 0) {
          entry.name = RT_NAMES[entry.id] || ("Type " + entry.id);
        } else if (level === 2) {
          entry.name = "Lang " + hex(entry.id, 4);
        } else {
          entry.name = "#" + entry.id;
        }
      }

      // Subdirectory or data entry
      if (offsetToData & 0x80000000) {
        entry.isDirectory = true;
        var subDirOff = rsrcBaseOff + (offsetToData & 0x7FFFFFFF);
        entry.children = parseDir(subDirOff, level + 1, maxDepth);
      } else {
        // Data entry (leaf)
        var dataOff = rsrcBaseOff + offsetToData;
        if (dataOff + 16 <= buffer.byteLength) {
          entry.dataEntry = {
            rva: view.getUint32(dataOff, true),
            size: view.getUint32(dataOff + 4, true),
            codePage: view.getUint32(dataOff + 8, true),
            reserved: view.getUint32(dataOff + 12, true),
            fileOffset: dataOff,
          };
        }
      }

      entries.push(entry);
      entryOff += 8;
    }

    return {
      fileOffset: dirOff, characteristics: characteristics,
      timeDateStamp: timeDateStamp, majorVersion: majorVersion,
      minorVersion: minorVersion,
      numberOfNamedEntries: numberOfNamedEntries,
      numberOfIdEntries: numberOfIdEntries,
      entries: entries,
    };
  }

  return parseDir(rsrcBaseOff, 0, 3);
}

// Parse Bound Import Table (Data Directory index 11)
// Uses file offset directly (the RVA field here IS a file offset in practice for bound imports,
// but per spec it's an RVA relative to the image base, typically within headers)
function parseBoundImport(view, buffer, dataDirectories) {
  if (dataDirectories.length <= 11) return null;
  var biDir = dataDirectories[11];
  if (biDir.rva === 0 || biDir.size === 0) return null;

  // Bound import uses RVA that is actually a file offset (within headers)
  var baseOff = biDir.rva;
  if (baseOff + 8 > buffer.byteLength) return null;

  var entries = [];
  var off = baseOff;
  var safeEnd = baseOff + biDir.size;
  var maxEntries = 500;

  for (var i = 0; i < maxEntries; i++) {
    if (off + 8 > buffer.byteLength || off + 8 > safeEnd) break;

    var timeDateStamp = view.getUint32(off, true);
    var offsetModuleName = view.getUint16(off + 4, true);
    var numberOfModuleForwarderRefs = view.getUint16(off + 6, true);

    // All-zero entry terminates
    if (timeDateStamp === 0 && offsetModuleName === 0 && numberOfModuleForwarderRefs === 0) break;

    var moduleName = "";
    var nameOff = baseOff + offsetModuleName;
    if (nameOff < buffer.byteLength) {
      moduleName = readNullTerminatedString(view, nameOff, 256);
    }

    // Parse forwarder refs
    var forwarders = [];
    var fwdOff = off + 8;
    for (var f = 0; f < numberOfModuleForwarderRefs; f++) {
      if (fwdOff + 8 > buffer.byteLength) break;
      var fwdTimestamp = view.getUint32(fwdOff, true);
      var fwdNameOffset = view.getUint16(fwdOff + 4, true);
      var fwdReserved = view.getUint16(fwdOff + 6, true);
      var fwdName = "";
      var fwdNameOff = baseOff + fwdNameOffset;
      if (fwdNameOff < buffer.byteLength) {
        fwdName = readNullTerminatedString(view, fwdNameOff, 256);
      }
      forwarders.push({
        timeDateStamp: fwdTimestamp, moduleName: fwdName,
        offsetModuleName: fwdNameOffset, reserved: fwdReserved,
      });
      fwdOff += 8;
    }

    entries.push({
      index: i, fileOffset: off, timeDateStamp: timeDateStamp,
      offsetModuleName: offsetModuleName, moduleName: moduleName,
      numberOfModuleForwarderRefs: numberOfModuleForwarderRefs,
      forwarders: forwarders,
    });
    off = fwdOff; // skip past forwarder refs
  }

  return entries;
}

// Parse IAT - Import Address Table (Data Directory index 12)
// The IAT is an array of function pointers (4 or 8 bytes each)
function parseIAT(view, buffer, dataDirectories, sections, is64) {
  if (dataDirectories.length <= 12) return null;
  var iatDir = dataDirectories[12];
  if (iatDir.rva === 0 || iatDir.size === 0) return null;

  var baseOff = rvaToFileOffset(iatDir.rva, sections);
  if (baseOff + 4 > buffer.byteLength) return null;

  var entrySize = is64 ? 8 : 4;
  var numEntries = Math.floor(iatDir.size / entrySize);
  var entries = [];

  for (var i = 0; i < numEntries; i++) {
    var off = baseOff + i * entrySize;
    if (off + entrySize > buffer.byteLength) break;

    var value;
    if (is64) {
      var lo = view.getUint32(off, true);
      var hi = view.getUint32(off + 4, true);
      value = { lo: lo, hi: hi, hex: hex64(lo, hi) };
    } else {
      var val = view.getUint32(off, true);
      value = { lo: val, hi: 0, hex: hex(val, 8) };
    }

    entries.push({ index: i, fileOffset: off, rva: iatDir.rva + i * entrySize, value: value });
  }

  return { rva: iatDir.rva, size: iatDir.size, entrySize: entrySize, entries: entries };
}

// Parse Delay Import Descriptor (Data Directory index 13)
// Array of ImgDelayDescr (32 bytes each), terminated by all-zero entry
function parseDelayImportDescriptor(view, buffer, dataDirectories, sections, is64) {
  if (dataDirectories.length <= 13) return null;
  var diDir = dataDirectories[13];
  if (diDir.rva === 0 || diDir.size === 0) return null;

  var baseOff = rvaToFileOffset(diDir.rva, sections);
  if (baseOff + 32 > buffer.byteLength) return null;

  var entries = [];
  var off = baseOff;
  var maxDescriptors = 500;

  for (var d = 0; d < maxDescriptors; d++) {
    if (off + 32 > buffer.byteLength) break;

    var attrs = view.getUint32(off, true);
    var nameRva = view.getUint32(off + 4, true);
    var moduleHandle = view.getUint32(off + 8, true);
    var delayIAT = view.getUint32(off + 12, true);
    var delayINT = view.getUint32(off + 16, true);
    var boundIAT = view.getUint32(off + 20, true);
    var unloadIAT = view.getUint32(off + 24, true);
    var timeDateStamp = view.getUint32(off + 28, true);

    // All-zero terminates
    if (attrs === 0 && nameRva === 0 && delayIAT === 0) break;

    var dllName = "";
    if (nameRva !== 0) {
      var nameOff = rvaToFileOffset(nameRva, sections);
      if (nameOff < buffer.byteLength) {
        dllName = readNullTerminatedString(view, nameOff, 256);
      }
    }

    // Parse delay INT (name table) for imported functions
    var functions = [];
    if (delayINT !== 0) {
      var intOff = rvaToFileOffset(delayINT, sections);
      var entrySize = is64 ? 8 : 4;
      for (var fi = 0; fi < 10000; fi++) {
        if (intOff + entrySize > buffer.byteLength) break;
        var thunk;
        if (is64) {
          var lo = view.getUint32(intOff, true);
          var hi = view.getUint32(intOff + 4, true);
          if (lo === 0 && hi === 0) break;
          var isOrdinal = !!(hi & 0x80000000);
          thunk = { lo: lo, hi: hi, isOrdinal: isOrdinal };
        } else {
          thunk = { lo: view.getUint32(intOff, true), hi: 0 };
          if (thunk.lo === 0) break;
          thunk.isOrdinal = !!(thunk.lo & 0x80000000);
        }

        var func = { index: fi, ordinal: 0, name: "", hint: 0 };
        if (thunk.isOrdinal) {
          func.ordinal = thunk.lo & 0xFFFF;
          func.name = "Ordinal " + func.ordinal;
        } else {
          var hintRva = is64 ? thunk.lo : thunk.lo;
          var hintOff = rvaToFileOffset(hintRva, sections);
          if (hintOff + 2 < buffer.byteLength) {
            func.hint = view.getUint16(hintOff, true);
            func.name = readNullTerminatedString(view, hintOff + 2, 256);
          }
        }
        functions.push(func);
        intOff += entrySize;
      }
    }

    entries.push({
      index: d, fileOffset: off, attributes: attrs, nameRva: nameRva,
      dllName: dllName, moduleHandle: moduleHandle,
      delayIAT: delayIAT, delayINT: delayINT, boundIAT: boundIAT,
      unloadIAT: unloadIAT, timeDateStamp: timeDateStamp,
      functions: functions,
    });
    off += 32;
  }

  return entries;
}

// Parse CLR Runtime Header (Data Directory index 14)
// IMAGE_COR20_HEADER structure
function parseCLRHeader(view, buffer, dataDirectories, sections) {
  if (dataDirectories.length <= 14) return null;
  var clrDir = dataDirectories[14];
  if (clrDir.rva === 0 || clrDir.size === 0) return null;

  var off = rvaToFileOffset(clrDir.rva, sections);
  if (off + 72 > buffer.byteLength) return null;

  var size = view.getUint32(off, true);
  var majorVer = view.getUint16(off + 4, true);
  var minorVer = view.getUint16(off + 6, true);

  // MetaData directory (RVA + Size)
  var metaDataRva = view.getUint32(off + 8, true);
  var metaDataSize = view.getUint32(off + 12, true);
  var flags = view.getUint32(off + 16, true);
  var entryPointToken = view.getUint32(off + 20, true);

  // Resources
  var resourcesRva = view.getUint32(off + 24, true);
  var resourcesSize = view.getUint32(off + 28, true);
  // StrongNameSignature
  var snSigRva = view.getUint32(off + 32, true);
  var snSigSize = view.getUint32(off + 36, true);
  // CodeManagerTable
  var cmTableRva = view.getUint32(off + 40, true);
  var cmTableSize = view.getUint32(off + 44, true);
  // VTableFixups
  var vtFixupsRva = view.getUint32(off + 48, true);
  var vtFixupsSize = view.getUint32(off + 52, true);
  // ExportAddressTableJumps
  var eatJumpsRva = view.getUint32(off + 56, true);
  var eatJumpsSize = view.getUint32(off + 60, true);
  // ManagedNativeHeader
  var mnHeaderRva = view.getUint32(off + 64, true);
  var mnHeaderSize = view.getUint32(off + 68, true);

  // Decode flags
  var CLR_FLAGS = {
    0x00000001: "ILONLY",
    0x00000002: "32BITREQUIRED",
    0x00000004: "IL_LIBRARY",
    0x00000008: "STRONGNAMESIGNED",
    0x00000010: "NATIVE_ENTRYPOINT",
    0x00010000: "TRACKDEBUGDATA",
    0x00020000: "32BITPREFERRED",
  };
  var flagStr = decodeFlags(flags, CLR_FLAGS);

  return {
    fileOffset: off, size: size,
    majorRuntimeVersion: majorVer, minorRuntimeVersion: minorVer,
    metaData: { rva: metaDataRva, size: metaDataSize },
    flags: flags, flagStr: flagStr,
    entryPointToken: entryPointToken,
    resources: { rva: resourcesRva, size: resourcesSize },
    strongNameSignature: { rva: snSigRva, size: snSigSize },
    codeManagerTable: { rva: cmTableRva, size: cmTableSize },
    vTableFixups: { rva: vtFixupsRva, size: vtFixupsSize },
    exportAddressTableJumps: { rva: eatJumpsRva, size: eatJumpsSize },
    managedNativeHeader: { rva: mnHeaderRva, size: mnHeaderSize },
  };
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
  if (fieldName === "Characteristics" && (section === "section" || section.indexOf("section:") === 0)) return decodeFlags(value, SECTION_CHARACTERISTICS);
  if (fieldName === "Name" && (section === "section" || section.indexOf("section:") === 0)) return "";
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

  // Build base relocation child nodes (one per block/page)
  var relocChildren = [];
  if (pe.baseRelocations && pe.baseRelocations.length > 0) {
    relocChildren = pe.baseRelocations.map(function (block, idx) {
      var label = "Page " + hex(block.pageRva, 8) + " (" + block.entries.length + " entries)";
      return createTreeNode(label, function () { showBaseRelocationBlock(block, idx); });
    });
  }

  // Build certificate child nodes
  var certChildren = [];
  if (pe.certificates && pe.certificates.length > 0) {
    certChildren = pe.certificates.map(function (cert) {
      var label = "#" + cert.index + " " + cert.certType;
      return createTreeNode(label, function () { showCertificateEntry(cert); });
    });
  }

  // Build exception table child nodes (limit to first 200 to avoid huge tree)
  var excChildren = [];
  if (pe.exceptionTable && pe.exceptionTable.entries.length > 0) {
    var maxShow = Math.min(pe.exceptionTable.entries.length, 200);
    for (var i = 0; i < maxShow; i++) {
      (function (entry) {
        var label = "#" + entry.index + " " + hex(entry.beginAddress, 8);
        excChildren.push(createTreeNode(label, function () { showExceptionEntry(entry); }));
      })(pe.exceptionTable.entries[i]);
    }
    if (pe.exceptionTable.entries.length > 200) {
      excChildren.push(createTreeNode("... (" + (pe.exceptionTable.entries.length - 200) + " more)", null));
    }
  }

  // Build resource directory tree nodes (recursive)
  function buildResourceTreeNodes(dir) {
    if (!dir || !dir.entries) return [];
    return dir.entries.map(function (entry) {
      var label = entry.isNamed ? entry.name : entry.name;
      if (entry.isDirectory && entry.children) {
        var childNodes = buildResourceTreeNodes(entry.children);
        return createTreeNode(label, function () { showResourceDirEntry(entry); }, childNodes);
      } else if (entry.dataEntry) {
        return createTreeNode(label + " (" + entry.dataEntry.size + " bytes)", function () { showResourceDataEntry(entry); });
      } else {
        return createTreeNode(label, null);
      }
    });
  }
  var resourceChildren = buildResourceTreeNodes(pe.resourceDirectory);

  // Build delay import child nodes (one per DLL)
  var delayImportChildren = [];
  if (pe.delayImport && pe.delayImport.length > 0) {
    delayImportChildren = pe.delayImport.map(function (dll) {
      return createTreeNode(dll.dllName || "(unknown)", function () { showDelayImportDll(dll); });
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
    createTreeNode("Section Headers", function () { showSectionHeadersSummary(pe.sections); },
      pe.sections.map(function (sec, idx) {
        return createTreeNode(sec.name, function () { showFields("Section: " + sec.name, "section:" + idx, sec.fields); });
      })
    ),
    createTreeSeparator(),
    createTreeNode("Export Table (Decoded)", function () { showExportTable(pe.exportTable); }),
    createTreeNode("Import Table (Decoded)", function () { showImportTableOverview(pe.importTable); }, importChildren),
    createTreeNode("Resource Directory (Decoded)", function () { showResourceDirectoryOverview(pe.resourceDirectory); }, resourceChildren),
    createTreeNode("Exception Table (Decoded)", function () { showExceptionTableOverview(pe.exceptionTable); }, excChildren),
    createTreeNode("Base Relocation Table (Decoded)", function () { showBaseRelocationOverview(pe.baseRelocations); }, relocChildren),
    createTreeNode("Certificate Table (Decoded)", function () { showCertificateTableOverview(pe.certificates); }, certChildren),
    createTreeNode("TLS Directory (Decoded)", function () { showTlsDirectory(pe.tlsDirectory); }),
    createTreeNode("Load Config (Decoded)", function () { showLoadConfig(pe.loadConfig); }),
    createTreeNode("Bound Import (Decoded)", function () { showBoundImportOverview(pe.boundImport); }),
    createTreeNode("IAT (Decoded)", function () { showIATOverview(pe.iat); }),
    createTreeNode("Delay Import (Decoded)", function () { showDelayImportOverview(pe.delayImport); }, delayImportChildren),
    createTreeNode("CLR Runtime Header (Decoded)", function () { showCLRHeader(pe.clrHeader); }),
    createTreeNode("Debug Directory (Decoded)", function () { showDebugDirectoryOverview(pe.debugEntries); }, debugChildren),
  ]);

  tree.appendChild(root);

  // Expand only the first level (root node)
  expandNode(root);
}

function createTreeSeparator() {
  var li = document.createElement("li");
  li.style.borderTop = "1px solid #dee2e6";
  li.style.margin = "3px 6px";
  return li;
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
    // Clear current section tracking (showFields will set it for editable sections)
    currentSection = null;
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

// --- Editing support ---

function writeFieldValue(field, newValue) {
  var offset = field.offset;
  var size = field.size;
  if (size === 1) {
    peView.setUint8(offset, newValue & 0xFF);
  } else if (size === 2) {
    peView.setUint16(offset, newValue & 0xFFFF, true);
  } else if (size === 4) {
    peView.setUint32(offset, newValue >>> 0, true);
  }
  // 8-byte fields handled separately in renderHexInput
}

function writeField64(field, hexStr) {
  hexStr = hexStr.replace(/^0x/i, "");
  while (hexStr.length < 16) hexStr = "0" + hexStr;
  var hi = parseInt(hexStr.substring(0, hexStr.length - 8), 16) || 0;
  var lo = parseInt(hexStr.substring(hexStr.length - 8), 16) || 0;
  peView.setUint32(field.offset, lo >>> 0, true);
  peView.setUint32(field.offset + 4, hi >>> 0, true);
}

function updateFileInfoBar() {
  if (!loadedFileName || !parsedPE) return;
  var machine = parsedPE.fileHeader.fields[0].value;
  var machineStr = IMAGE_FILE_MACHINE[machine] || "Unknown";
  var bitness = parsedPE.is64 ? "PE32+" : "PE32";
  var sizeKb = (peData.byteLength / 1024).toFixed(1);
  var text = loadedFileName + " | " + sizeKb + " KB | " + bitness + " | " + machineStr;
  if (isModified) text += " | (Modified)";
  document.getElementById("fileInfo").textContent = text;
}

function onFieldModified(sectionKey) {
  isModified = true;
  updateFileInfoBar();

  // Show download button
  var btn = document.getElementById("downloadBtn");
  if (btn) btn.style.display = "inline-block";

  // Re-parse the PE from modified buffer
  try {
    parsedPE = parsePE(peData);
  } catch (err) {
    console.warn("Re-parse after edit failed:", err.message);
    return;
  }

  // Update hex view to reflect edited bytes
  renderHexRows();

  // Only re-render if the user is still viewing this section
  if (currentSection !== sectionKey) return;

  // Handle section:N keys
  if (sectionKey.indexOf("section:") === 0) {
    var secIdx = parseInt(sectionKey.split(":")[1], 10);
    var sec = parsedPE.sections[secIdx];
    if (sec) {
      showFields("Section: " + sec.name, sectionKey, sec.fields);
    }
    return;
  }

  var titleMap = { dosHeader: "DOS Header", fileHeader: "File Header", optionalHeader: "Optional Header" };
  var sectionData = parsedPE[sectionKey];
  if (sectionData && sectionData.fields) {
    showFields(titleMap[sectionKey] || sectionKey, sectionKey, sectionData.fields);
  }
}

function renderStringInput(container, field, sectionKey) {
  var input = document.createElement("input");
  input.type = "text";
  input.className = "pe-edit-input";
  input.value = field.value;
  input.maxLength = field.size;

  function commit() {
    var newName = input.value;
    // Write as ASCII, null-padded to field.size bytes
    for (var i = 0; i < field.size; i++) {
      peView.setUint8(field.offset + i, i < newName.length ? newName.charCodeAt(i) & 0xFF : 0);
    }
    onFieldModified(sectionKey);
  }

  input.addEventListener("change", commit);
  container.appendChild(input);
}

function renderHexInput(container, field, sectionKey) {
  var input = document.createElement("input");
  input.type = "text";
  input.className = "pe-edit-input";

  if (field.size === 8 && field.valueLo !== undefined) {
    input.value = hex64(field.valueLo, field.valueHi);
  } else {
    input.value = hex(field.value, field.size * 2);
  }

  input.addEventListener("change", function () {
    var raw = input.value.replace(/^0x/i, "");
    if (!/^[0-9a-fA-F]+$/.test(raw)) {
      input.classList.add("invalid");
      return;
    }
    input.classList.remove("invalid");

    if (field.size === 8) {
      if (raw.length > 16) { input.classList.add("invalid"); return; }
      writeField64(field, raw);
    } else {
      var newVal = parseInt(raw, 16);
      var maxVal = (field.size === 1) ? 0xFF : (field.size === 2) ? 0xFFFF : 0xFFFFFFFF;
      if (newVal > maxVal) { input.classList.add("invalid"); return; }
      writeFieldValue(field, newVal);
    }
    onFieldModified(sectionKey);
  });

  container.parentNode.replaceChild(input, container);
}

function renderDropdown(container, field, sectionKey, options) {
  var select = document.createElement("select");
  select.className = "pe-edit-select";

  var currentVal = field.value;
  var foundCurrent = false;

  for (var key in options) {
    var numKey = parseInt(key);
    var opt = document.createElement("option");
    opt.value = numKey;
    opt.textContent = hex(numKey, field.size * 2) + " - " + options[key];
    if (numKey === currentVal) {
      opt.selected = true;
      foundCurrent = true;
    }
    select.appendChild(opt);
  }

  if (!foundCurrent) {
    var customOpt = document.createElement("option");
    customOpt.value = currentVal;
    customOpt.textContent = hex(currentVal, field.size * 2) + " - (custom)";
    customOpt.selected = true;
    select.insertBefore(customOpt, select.firstChild);
  }

  select.addEventListener("change", function () {
    var newVal = parseInt(select.value);
    writeFieldValue(field, newVal);
    onFieldModified(sectionKey);
  });

  container.parentNode.replaceChild(select, container);
}

function renderBitmask(container, field, sectionKey, flags) {
  var combo = document.createElement("div");
  combo.className = "pe-bitmask-combo";

  // Trigger button (looks like a combobox)
  var trigger = document.createElement("div");
  trigger.className = "pe-bitmask-trigger";

  var triggerText = document.createElement("span");
  triggerText.textContent = hex(field.value, field.size * 2);
  trigger.appendChild(triggerText);

  var arrow = document.createElement("span");
  arrow.className = "pe-bitmask-arrow";
  arrow.textContent = "\u25BC"; // down triangle
  trigger.appendChild(arrow);

  combo.appendChild(trigger);

  // Dropdown panel with checkboxes
  var dropdown = document.createElement("div");
  dropdown.className = "pe-bitmask-dropdown";

  var currentVal = field.value;

  for (var bit in flags) {
    var bitNum = parseInt(bit);
    var label = document.createElement("label");

    var cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = bitNum;
    cb.checked = !!(currentVal & bitNum);

    cb.addEventListener("change", (function (txtSpan) {
      return function () {
        var newVal = 0;
        var allCbs = dropdown.querySelectorAll('input[type="checkbox"]');
        for (var i = 0; i < allCbs.length; i++) {
          if (allCbs[i].checked) newVal |= parseInt(allCbs[i].value);
        }
        txtSpan.textContent = hex(newVal, field.size * 2);
        writeFieldValue(field, newVal);
        onFieldModified(sectionKey);
      };
    })(triggerText));

    // Stop label click from closing dropdown
    label.addEventListener("click", function (e) { e.stopPropagation(); });

    label.appendChild(cb);
    label.appendChild(document.createTextNode(hex(bitNum, 4) + " " + flags[bit]));
    dropdown.appendChild(label);
  }

  combo.appendChild(dropdown);

  // Toggle dropdown on trigger click
  trigger.addEventListener("click", function (e) {
    e.stopPropagation();
    var isOpen = dropdown.classList.contains("open");
    // Close any other open bitmask dropdowns
    var allOpen = document.querySelectorAll(".pe-bitmask-dropdown.open");
    for (var i = 0; i < allOpen.length; i++) allOpen[i].classList.remove("open");
    if (!isOpen) dropdown.classList.add("open");
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", function () {
    dropdown.classList.remove("open");
  });

  container.parentNode.replaceChild(combo, container);
}

function downloadModifiedPE() {
  if (!peData) return;
  var blob = new Blob([peData], { type: "application/octet-stream" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  var name = loadedFileName || "output.exe";
  var dotIdx = name.lastIndexOf(".");
  if (dotIdx > 0) {
    a.download = name.substring(0, dotIdx) + "_modified" + name.substring(dotIdx);
  } else {
    a.download = name + "_modified";
  }
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- showFields with editable support ---

function showFields(title, sectionKey, fields) {
  currentSection = sectionKey;
  var panel = document.getElementById("detailPanel");
  var isEditable = EDITABLE_SECTIONS.indexOf(sectionKey) !== -1 ||
    sectionKey.indexOf("section:") === 0;

  var html = '<div class="pe-detail-header">' + escapeHtml(title) + '</div>';
  html += '<table class="pe-detail-table"><thead><tr>';
  html += '<th class="col-member">Member</th>';
  html += '<th class="col-offset">Offset</th>';
  html += '<th class="col-size">Size</th>';
  html += '<th class="col-value">Value</th>';
  html += '<th class="col-meaning">Meaning</th>';
  html += '</tr></thead><tbody>';

  fields.forEach(function (f, idx) {
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

    html += '<tr data-hex-offset="' + f.offset + '" data-hex-size="' + f.size + '">';
    html += '<td>' + escapeHtml(f.name) + '</td>';
    html += '<td>' + hex(f.offset, 8) + '</td>';
    html += '<td>' + f.size + '</td>';

    if (isEditable && (!f.isString || sectionKey.indexOf("section:") === 0)) {
      html += '<td><span id="pe-edit-val-' + idx + '"></span></td>';
    } else {
      html += '<td>' + valStr + '</td>';
    }
    html += '<td>' + escapeHtml(meaning) + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table>';
  panel.innerHTML = html;

  // Attach interactive controls for editable fields
  if (isEditable) {
    fields.forEach(function (f, idx) {
      if (f.isString && sectionKey.indexOf("section:") !== 0) return;
      var valSpan = document.getElementById("pe-edit-val-" + idx);
      if (!valSpan) return;

      if (f.isString) {
        renderStringInput(valSpan, f, sectionKey);
        return;
      }

      var editKey = sectionKey + ":" + f.name;
      var editType = FIELD_EDIT_TYPE[editKey];
      // For section:N keys, also check section:FieldName
      if (!editType && sectionKey.indexOf("section:") === 0) {
        editType = FIELD_EDIT_TYPE["section:" + f.name];
      }

      if (editType && editType.type === "dropdown") {
        renderDropdown(valSpan, f, sectionKey, editType.options);
      } else if (editType && editType.type === "bitmask") {
        renderBitmask(valSpan, f, sectionKey, editType.flags);
      } else {
        renderHexInput(valSpan, f, sectionKey);
      }
    });
  }
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
    html += '<tr data-hex-offset="' + dir.offset + '" data-hex-size="8">';
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

  html += '<tr data-hex-offset="' + dir.offset + '" data-hex-size="4"><td>VirtualAddress (RVA)</td><td>' + hex(dir.offset, 8) + '</td><td>4</td><td>' + hex(dir.rva, 8) + '</td><td>' + (dir.rva === 0 ? "Not present" : "RVA of " + dir.name) + '</td></tr>';
  html += '<tr data-hex-offset="' + (dir.offset + 4) + '" data-hex-size="4"><td>Size</td><td>' + hex(dir.offset + 4, 8) + '</td><td>4</td><td>' + hex(dir.size, 8) + '</td><td>' + dir.size + ' bytes' + '</td></tr>';

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

    html += '<tr data-hex-offset="' + f.offset + '" data-hex-size="' + f.size + '">';
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
    html += '<tr data-hex-offset="' + dll.fields[0].offset + '" data-hex-size="20">';
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

    html += '<tr data-hex-offset="' + f.offset + '" data-hex-size="' + f.size + '">';
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

function showBaseRelocationOverview(blocks) {
  var panel = document.getElementById("detailPanel");
  if (!blocks || blocks.length === 0) {
    panel.innerHTML = '<div class="pe-detail-header">Base Relocation Table</div>' +
      '<div class="pe-welcome"><p>No base relocation table found in this PE file.</p></div>';
    return;
  }

  var totalEntries = 0;
  blocks.forEach(function (b) { totalEntries += b.entries.length; });

  var html = '<div class="pe-detail-header">Base Relocation Table (' + blocks.length + ' blocks, ' + totalEntries + ' total entries)</div>';
  html += '<table class="pe-detail-table"><thead><tr>';
  html += '<th style="width:5%">#</th>';
  html += '<th style="width:20%">Page RVA</th>';
  html += '<th style="width:20%">Block Size</th>';
  html += '<th style="width:15%">Entries</th>';
  html += '<th style="width:20%">File Offset</th>';
  html += '</tr></thead><tbody>';

  blocks.forEach(function (block, idx) {
    html += '<tr data-hex-offset="' + block.fileOffset + '" data-hex-size="' + block.blockSize + '">';
    html += '<td>' + idx + '</td>';
    html += '<td>' + hex(block.pageRva, 8) + '</td>';
    html += '<td>' + hex(block.blockSize, 8) + ' (' + block.blockSize + ')' + '</td>';
    html += '<td>' + block.entries.length + '</td>';
    html += '<td>' + hex(block.fileOffset, 8) + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table>';
  panel.innerHTML = html;
}

function showBaseRelocationBlock(block, idx) {
  var panel = document.getElementById("detailPanel");
  var html = '<div class="pe-detail-header">Base Relocation Block #' + idx + ': Page ' + hex(block.pageRva, 8) + '</div>';

  // Block header fields
  html += '<table class="pe-detail-table"><thead><tr>';
  html += '<th class="col-member">Member</th>';
  html += '<th class="col-offset">Offset</th>';
  html += '<th class="col-size">Size</th>';
  html += '<th class="col-value">Value</th>';
  html += '<th class="col-meaning">Meaning</th>';
  html += '</tr></thead><tbody>';

  html += '<tr data-hex-offset="' + block.fileOffset + '" data-hex-size="4"><td>VirtualAddress</td><td>' + hex(block.fileOffset, 8) + '</td><td>4</td><td>' + hex(block.pageRva, 8) + '</td><td>Page RVA for this block</td></tr>';
  html += '<tr data-hex-offset="' + (block.fileOffset + 4) + '" data-hex-size="4"><td>SizeOfBlock</td><td>' + hex(block.fileOffset + 4, 8) + '</td><td>4</td><td>' + hex(block.blockSize, 8) + '</td><td>' + block.blockSize + ' bytes total (' + block.entries.length + ' entries)</td></tr>';

  html += '</tbody></table>';

  // Relocation entries
  if (block.entries.length > 0) {
    html += '<div class="pe-detail-header" style="margin-top: 0; border-top: 1px solid #ced4da;">Relocation Entries (' + block.entries.length + ')</div>';
    html += '<table class="pe-detail-table"><thead><tr>';
    html += '<th style="width:5%">#</th>';
    html += '<th style="width:15%">Type</th>';
    html += '<th style="width:25%">Type Name</th>';
    html += '<th style="width:15%">Offset</th>';
    html += '<th style="width:20%">Target RVA</th>';
    html += '</tr></thead><tbody>';

    block.entries.forEach(function (entry, eIdx) {
      html += '<tr data-hex-offset="' + (block.fileOffset + 8 + eIdx * 2) + '" data-hex-size="2">';
      html += '<td>' + eIdx + '</td>';
      html += '<td>' + entry.type + '</td>';
      html += '<td>' + escapeHtml(entry.typeName) + '</td>';
      html += '<td>' + hex(entry.offset, 3) + '</td>';
      html += '<td>' + hex(entry.rva, 8) + '</td>';
      html += '</tr>';
    });

    html += '</tbody></table>';
  }

  panel.innerHTML = html;
}

function showCertificateTableOverview(certs) {
  var panel = document.getElementById("detailPanel");
  if (!certs || certs.length === 0) {
    panel.innerHTML = '<div class="pe-detail-header">Certificate Table</div>' +
      '<div class="pe-welcome"><p>No certificate table found in this PE file.</p></div>';
    return;
  }

  var html = '<div class="pe-detail-header">Certificate Table (' + certs.length + ' certificate(s))</div>';
  html += '<table class="pe-detail-table"><thead><tr>';
  html += '<th style="width:5%">#</th>';
  html += '<th style="width:20%">Revision</th>';
  html += '<th style="width:25%">Certificate Type</th>';
  html += '<th style="width:15%">Length</th>';
  html += '<th style="width:15%">Data Size</th>';
  html += '<th style="width:20%">File Offset</th>';
  html += '</tr></thead><tbody>';

  certs.forEach(function (cert) {
    html += '<tr data-hex-offset="' + cert.fileOffset + '" data-hex-size="' + cert.length + '">';
    html += '<td>' + cert.index + '</td>';
    html += '<td>' + escapeHtml(cert.revision) + '</td>';
    html += '<td>' + escapeHtml(cert.certType) + '</td>';
    html += '<td>' + cert.length + ' bytes</td>';
    html += '<td>' + cert.dataSize + ' bytes</td>';
    html += '<td>' + hex(cert.fileOffset, 8) + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table>';
  panel.innerHTML = html;
}

function showCertificateEntry(cert) {
  var panel = document.getElementById("detailPanel");
  var html = '<div class="pe-detail-header">Certificate #' + cert.index + ': ' + escapeHtml(cert.certType) + '</div>';

  html += '<table class="pe-detail-table"><thead><tr>';
  html += '<th class="col-member">Member</th>';
  html += '<th class="col-offset">Offset</th>';
  html += '<th class="col-size">Size</th>';
  html += '<th class="col-value">Value</th>';
  html += '<th class="col-meaning">Meaning</th>';
  html += '</tr></thead><tbody>';

  cert.fields.forEach(function (f) {
    var valStr = hex(f.value, f.size * 2);
    var meaning = "";
    if (f.name === "dwLength") meaning = f.value + " bytes total";
    else if (f.name === "wRevision") meaning = "Revision " + cert.revision;
    else if (f.name === "wCertificateType") meaning = cert.certType;

    html += '<tr data-hex-offset="' + f.offset + '" data-hex-size="' + f.size + '">';
    html += '<td>' + escapeHtml(f.name) + '</td>';
    html += '<td>' + hex(f.offset, 8) + '</td>';
    html += '<td>' + f.size + '</td>';
    html += '<td>' + valStr + '</td>';
    html += '<td>' + escapeHtml(meaning) + '</td>';
    html += '</tr>';
  });

  // Show certificate data info
  html += '<tr data-hex-offset="' + cert.dataOffset + '" data-hex-size="' + cert.dataSize + '"><td>bCertificate</td><td>' + hex(cert.dataOffset, 8) + '</td><td>' + cert.dataSize + '</td><td>(binary data)</td><td>' + cert.dataSize + ' bytes of certificate data</td></tr>';

  html += '</tbody></table>';
  panel.innerHTML = html;
}

function showTlsDirectory(tlsDir) {
  var panel = document.getElementById("detailPanel");
  if (!tlsDir) {
    panel.innerHTML = '<div class="pe-detail-header">TLS Directory</div>' +
      '<div class="pe-welcome"><p>No TLS directory found in this PE file.</p></div>';
    return;
  }

  var bitness = tlsDir.is64 ? "IMAGE_TLS_DIRECTORY64" : "IMAGE_TLS_DIRECTORY32";
  var html = '<div class="pe-detail-header">TLS Directory (' + bitness + ')</div>';

  html += '<table class="pe-detail-table"><thead><tr>';
  html += '<th class="col-member">Member</th>';
  html += '<th class="col-offset">Offset</th>';
  html += '<th class="col-size">Size</th>';
  html += '<th class="col-value">Value</th>';
  html += '<th class="col-meaning">Meaning</th>';
  html += '</tr></thead><tbody>';

  tlsDir.fields.forEach(function (f) {
    var valStr;
    if (f.valueLo !== undefined && f.valueHi !== undefined) {
      valStr = hex64(f.valueLo, f.valueHi);
    } else {
      valStr = hex(f.value, f.size * 2);
    }

    var meaning = "";
    if (f.name === "StartAddressOfRawData") meaning = "VA of TLS template data start";
    else if (f.name === "EndAddressOfRawData") meaning = "VA of TLS template data end";
    else if (f.name === "AddressOfIndex") meaning = "VA of TLS index variable";
    else if (f.name === "AddressOfCallBacks") meaning = "VA of TLS callback function array";
    else if (f.name === "SizeOfZeroFill") {
      var val = (f.valueLo !== undefined) ? f.valueLo : f.value;
      meaning = val + " bytes of zero-fill after template data";
    }
    else if (f.name === "Characteristics") {
      var val = (f.valueLo !== undefined) ? f.valueLo : f.value;
      var align = (val >> 20) & 0xF;
      meaning = align === 0 ? "Default alignment" : "Alignment: " + Math.pow(2, align - 1) + " bytes";
    }

    html += '<tr data-hex-offset="' + f.offset + '" data-hex-size="' + f.size + '">';
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

function showLoadConfig(loadConfig) {
  var panel = document.getElementById("detailPanel");
  if (!loadConfig) {
    panel.innerHTML = '<div class="pe-detail-header">Load Config Directory</div>' +
      '<div class="pe-welcome"><p>No Load Config Directory found in this PE file.</p></div>';
    return;
  }

  var html = '<div class="pe-detail-header">Load Config Directory (Size: ' + loadConfig.structSize + ' bytes)</div>';

  html += '<table class="pe-detail-table"><thead><tr>';
  html += '<th class="col-member">Member</th>';
  html += '<th class="col-offset">Offset</th>';
  html += '<th class="col-rawvalue">Raw Value</th>';
  html += '<th class="col-meaning">Description</th>';
  html += '</tr></thead><tbody>';

  loadConfig.fields.forEach(function (f) {
    html += '<tr data-hex-offset="' + parseInt(f.offset, 16) + '" data-hex-size="' + (f.rawHex.length / 2) + '">';
    html += '<td>' + escapeHtml(f.name) + '</td>';
    html += '<td>' + f.offset + '</td>';
    html += '<td>' + f.rawHex + '</td>';
    html += '<td>' + escapeHtml(f.description) + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table>';
  panel.innerHTML = html;
}

function showResourceDirectoryOverview(dir) {
  var panel = document.getElementById("detailPanel");
  if (!dir) {
    panel.innerHTML = '<div class="pe-detail-header">Resource Directory</div>' +
      '<div class="pe-welcome"><p>No Resource Directory found in this PE file.</p></div>';
    return;
  }

  var html = '<div class="pe-detail-header">Resource Directory (Root)</div>';

  html += '<table class="pe-detail-table"><thead><tr>';
  html += '<th class="col-member">Member</th>';
  html += '<th class="col-value">Value</th>';
  html += '</tr></thead><tbody>';

  html += '<tr data-hex-offset="' + dir.fileOffset + '" data-hex-size="16"><td>File Offset</td><td>' + hex(dir.fileOffset, 8) + '</td></tr>';
  html += '<tr data-hex-offset="' + dir.fileOffset + '" data-hex-size="4"><td>Characteristics</td><td>' + hex(dir.characteristics, 8) + '</td></tr>';
  html += '<tr data-hex-offset="' + (dir.fileOffset + 4) + '" data-hex-size="4"><td>TimeDateStamp</td><td>' + formatTimestamp(dir.timeDateStamp) + '</td></tr>';
  html += '<tr data-hex-offset="' + (dir.fileOffset + 8) + '" data-hex-size="4"><td>Version</td><td>' + dir.majorVersion + '.' + dir.minorVersion + '</td></tr>';
  html += '<tr data-hex-offset="' + (dir.fileOffset + 12) + '" data-hex-size="2"><td>Number of Named Entries</td><td>' + dir.numberOfNamedEntries + '</td></tr>';
  html += '<tr data-hex-offset="' + (dir.fileOffset + 14) + '" data-hex-size="2"><td>Number of ID Entries</td><td>' + dir.numberOfIdEntries + '</td></tr>';
  html += '<tr><td>Total Resource Types</td><td>' + dir.entries.length + '</td></tr>';

  html += '</tbody></table>';

  // Summary table of types
  if (dir.entries.length > 0) {
    html += '<div class="pe-detail-header" style="margin-top:1px">Resource Types</div>';
    html += '<table class="pe-detail-table"><thead><tr>';
    html += '<th style="width:10%">#</th>';
    html += '<th style="width:30%">Type</th>';
    html += '<th style="width:20%">ID / Named</th>';
    html += '<th style="width:20%">Sub-entries</th>';
    html += '</tr></thead><tbody>';

    dir.entries.forEach(function (entry, idx) {
      var subCount = entry.isDirectory && entry.children ? entry.children.entries.length : 0;
      html += '<tr>';
      html += '<td>' + idx + '</td>';
      html += '<td>' + escapeHtml(entry.name) + '</td>';
      html += '<td>' + (entry.isNamed ? "Named" : "ID " + entry.id) + '</td>';
      html += '<td>' + subCount + '</td>';
      html += '</tr>';
    });

    html += '</tbody></table>';
  }

  panel.innerHTML = html;
}

function showResourceDirEntry(entry) {
  var panel = document.getElementById("detailPanel");
  var html = '<div class="pe-detail-header">Resource: ' + escapeHtml(entry.name) + '</div>';

  if (entry.isDirectory && entry.children) {
    var dir = entry.children;
    html += '<table class="pe-detail-table"><thead><tr>';
    html += '<th class="col-member">Member</th>';
    html += '<th class="col-value">Value</th>';
    html += '</tr></thead><tbody>';

    html += '<tr data-hex-offset="' + dir.fileOffset + '" data-hex-size="16"><td>File Offset</td><td>' + hex(dir.fileOffset, 8) + '</td></tr>';
    html += '<tr data-hex-offset="' + dir.fileOffset + '" data-hex-size="4"><td>Characteristics</td><td>' + hex(dir.characteristics, 8) + '</td></tr>';
    html += '<tr data-hex-offset="' + (dir.fileOffset + 4) + '" data-hex-size="4"><td>TimeDateStamp</td><td>' + formatTimestamp(dir.timeDateStamp) + '</td></tr>';
    html += '<tr data-hex-offset="' + (dir.fileOffset + 8) + '" data-hex-size="4"><td>Version</td><td>' + dir.majorVersion + '.' + dir.minorVersion + '</td></tr>';
    html += '<tr data-hex-offset="' + (dir.fileOffset + 12) + '" data-hex-size="2"><td>Named Entries</td><td>' + dir.numberOfNamedEntries + '</td></tr>';
    html += '<tr data-hex-offset="' + (dir.fileOffset + 14) + '" data-hex-size="2"><td>ID Entries</td><td>' + dir.numberOfIdEntries + '</td></tr>';
    html += '</tbody></table>';

    if (dir.entries.length > 0) {
      html += '<div class="pe-detail-header" style="margin-top:1px">Entries (' + dir.entries.length + ')</div>';
      html += '<table class="pe-detail-table"><thead><tr>';
      html += '<th style="width:10%">#</th>';
      html += '<th style="width:30%">Name / ID</th>';
      html += '<th style="width:20%">Type</th>';
      html += '<th style="width:20%">Details</th>';
      html += '</tr></thead><tbody>';

      dir.entries.forEach(function (child, idx) {
        var details = "";
        if (child.isDirectory && child.children) {
          details = child.children.entries.length + " sub-entries";
        } else if (child.dataEntry) {
          details = child.dataEntry.size + " bytes at RVA " + hex(child.dataEntry.rva, 8);
        }
        html += '<tr>';
        html += '<td>' + idx + '</td>';
        html += '<td>' + escapeHtml(child.name) + '</td>';
        html += '<td>' + (child.isDirectory ? "Directory" : "Data") + '</td>';
        html += '<td>' + details + '</td>';
        html += '</tr>';
      });

      html += '</tbody></table>';
    }
  }

  panel.innerHTML = html;
}

function showResourceDataEntry(entry) {
  var panel = document.getElementById("detailPanel");
  var html = '<div class="pe-detail-header">Resource Data: ' + escapeHtml(entry.name) + '</div>';

  if (entry.dataEntry) {
    var de = entry.dataEntry;
    html += '<table class="pe-detail-table"><thead><tr>';
    html += '<th class="col-member">Member</th>';
    html += '<th class="col-value">Value</th>';
    html += '<th class="col-meaning">Description</th>';
    html += '</tr></thead><tbody>';

    html += '<tr data-hex-offset="' + de.fileOffset + '" data-hex-size="4"><td>OffsetToData (RVA)</td><td>' + hex(de.rva, 8) + '</td><td>RVA of resource data</td></tr>';
    html += '<tr data-hex-offset="' + (de.fileOffset + 4) + '" data-hex-size="4"><td>Size</td><td>' + de.size + '</td><td>' + de.size + ' bytes</td></tr>';
    html += '<tr data-hex-offset="' + (de.fileOffset + 8) + '" data-hex-size="4"><td>CodePage</td><td>' + de.codePage + '</td><td>' + (de.codePage === 0 ? "Unicode" : "Code page " + de.codePage) + '</td></tr>';
    html += '<tr data-hex-offset="' + (de.fileOffset + 12) + '" data-hex-size="4"><td>Reserved</td><td>' + hex(de.reserved, 8) + '</td><td>Must be zero</td></tr>';
    html += '<tr data-hex-offset="' + de.fileOffset + '" data-hex-size="16"><td>Entry File Offset</td><td>' + hex(de.fileOffset, 8) + '</td><td>File offset of IMAGE_RESOURCE_DATA_ENTRY</td></tr>';

    html += '</tbody></table>';
  }

  panel.innerHTML = html;
}

function showSectionHeadersSummary(sections) {
  var panel = document.getElementById("detailPanel");
  var html = '<div class="pe-detail-header">Section Headers (' + sections.length + ' sections)</div>';

  html += '<table class="pe-detail-table"><thead><tr>';
  html += '<th style="width:12%">Name</th>';
  html += '<th style="width:12%">Virtual Size</th>';
  html += '<th style="width:13%">Virtual Address</th>';
  html += '<th style="width:13%">Raw Data Size</th>';
  html += '<th style="width:13%">Raw Data Ptr</th>';
  html += '<th style="width:12%">Characteristics</th>';
  html += '<th style="width:25%">Flags</th>';
  html += '</tr></thead><tbody>';

  sections.forEach(function (sec) {
    var f = sec.fields;
    // f[0]=Name, f[1]=VirtualSize, f[2]=VirtualAddress, f[3]=SizeOfRawData,
    // f[4]=PointerToRawData, f[9]=Characteristics
    var chars = f[9].value;
    var flagStr = decodeFlags(chars, SECTION_CHARACTERISTICS);

    html += '<tr data-hex-offset="' + sec.fields[0].offset + '" data-hex-size="40">';
    html += '<td>' + escapeHtml(sec.name) + '</td>';
    html += '<td>' + hex(f[1].value, 8) + '</td>';
    html += '<td>' + hex(f[2].value, 8) + '</td>';
    html += '<td>' + hex(f[3].value, 8) + '</td>';
    html += '<td>' + hex(f[4].value, 8) + '</td>';
    html += '<td>' + hex(chars, 8) + '</td>';
    html += '<td style="font-size:0.75rem">' + escapeHtml(flagStr) + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table>';
  panel.innerHTML = html;
}

function showBoundImportOverview(entries) {
  var panel = document.getElementById("detailPanel");
  if (!entries || entries.length === 0) {
    panel.innerHTML = '<div class="pe-detail-header">Bound Import</div>' +
      '<div class="pe-welcome"><p>No Bound Import table found in this PE file.</p></div>';
    return;
  }

  var html = '<div class="pe-detail-header">Bound Import (' + entries.length + ' entries)</div>';

  html += '<table class="pe-detail-table"><thead><tr>';
  html += '<th style="width:6%">#</th>';
  html += '<th style="width:10%">Offset</th>';
  html += '<th style="width:28%">Module Name</th>';
  html += '<th style="width:18%">TimeDateStamp</th>';
  html += '<th style="width:12%">Forwarders</th>';
  html += '<th style="width:26%">Forwarder Modules</th>';
  html += '</tr></thead><tbody>';

  entries.forEach(function (entry) {
    var fwdNames = entry.forwarders.map(function (f) { return f.moduleName; }).join(", ");
    html += '<tr data-hex-offset="' + entry.fileOffset + '" data-hex-size="8">';
    html += '<td>' + entry.index + '</td>';
    html += '<td>' + hex(entry.fileOffset, 8) + '</td>';
    html += '<td>' + escapeHtml(entry.moduleName) + '</td>';
    html += '<td>' + formatTimestamp(entry.timeDateStamp) + '</td>';
    html += '<td>' + entry.numberOfModuleForwarderRefs + '</td>';
    html += '<td>' + escapeHtml(fwdNames) + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table>';
  panel.innerHTML = html;
}

function showIATOverview(iat) {
  var panel = document.getElementById("detailPanel");
  if (!iat || iat.entries.length === 0) {
    panel.innerHTML = '<div class="pe-detail-header">Import Address Table (IAT)</div>' +
      '<div class="pe-welcome"><p>No IAT found in this PE file.</p></div>';
    return;
  }

  var html = '<div class="pe-detail-header">Import Address Table (' + iat.entries.length + ' entries, ' + iat.entrySize + ' bytes each)</div>';

  html += '<table class="pe-detail-table"><thead><tr>';
  html += '<th style="width:8%">#</th>';
  html += '<th style="width:15%">File Offset</th>';
  html += '<th style="width:15%">RVA</th>';
  html += '<th style="width:20%">Value</th>';
  html += '</tr></thead><tbody>';

  var maxShow = Math.min(iat.entries.length, 500);
  for (var i = 0; i < maxShow; i++) {
    var entry = iat.entries[i];
    html += '<tr data-hex-offset="' + entry.fileOffset + '" data-hex-size="' + iat.entrySize + '">';
    html += '<td>' + entry.index + '</td>';
    html += '<td>' + hex(entry.fileOffset, 8) + '</td>';
    html += '<td>' + hex(entry.rva, 8) + '</td>';
    html += '<td>' + entry.value.hex + '</td>';
    html += '</tr>';
  }
  if (iat.entries.length > 500) {
    html += '<tr><td colspan="4" style="text-align:center;color:#666;">... ' + (iat.entries.length - 500) + ' more entries</td></tr>';
  }

  html += '</tbody></table>';
  panel.innerHTML = html;
}

function showDelayImportOverview(entries) {
  var panel = document.getElementById("detailPanel");
  if (!entries || entries.length === 0) {
    panel.innerHTML = '<div class="pe-detail-header">Delay Import Descriptor</div>' +
      '<div class="pe-welcome"><p>No Delay Import Descriptor found in this PE file.</p></div>';
    return;
  }

  var html = '<div class="pe-detail-header">Delay Import Descriptor (' + entries.length + ' DLLs)</div>';

  html += '<table class="pe-detail-table"><thead><tr>';
  html += '<th style="width:6%">#</th>';
  html += '<th style="width:10%">Offset</th>';
  html += '<th style="width:22%">DLL Name</th>';
  html += '<th style="width:10%">Attributes</th>';
  html += '<th style="width:12%">Delay IAT</th>';
  html += '<th style="width:12%">Delay INT</th>';
  html += '<th style="width:12%">Bound IAT</th>';
  html += '<th style="width:10%">Functions</th>';
  html += '</tr></thead><tbody>';

  entries.forEach(function (entry) {
    html += '<tr data-hex-offset="' + entry.fileOffset + '" data-hex-size="32">';
    html += '<td>' + entry.index + '</td>';
    html += '<td>' + hex(entry.fileOffset, 8) + '</td>';
    html += '<td>' + escapeHtml(entry.dllName) + '</td>';
    html += '<td>' + hex(entry.attributes, 8) + '</td>';
    html += '<td>' + hex(entry.delayIAT, 8) + '</td>';
    html += '<td>' + hex(entry.delayINT, 8) + '</td>';
    html += '<td>' + hex(entry.boundIAT, 8) + '</td>';
    html += '<td>' + entry.functions.length + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table>';
  panel.innerHTML = html;
}

function showDelayImportDll(dll) {
  var panel = document.getElementById("detailPanel");
  var html = '<div class="pe-detail-header">Delay Import: ' + escapeHtml(dll.dllName) + '</div>';

  // Descriptor fields
  html += '<table class="pe-detail-table"><thead><tr>';
  html += '<th class="col-member">Member</th>';
  html += '<th class="col-value">Value</th>';
  html += '<th class="col-meaning">Meaning</th>';
  html += '</tr></thead><tbody>';

  html += '<tr data-hex-offset="' + dll.fileOffset + '" data-hex-size="4"><td>Attributes</td><td>' + hex(dll.attributes, 8) + '</td><td>' + (dll.attributes & 1 ? "RVAs (new style)" : "VAs (old style)") + '</td></tr>';
  html += '<tr data-hex-offset="' + (dll.fileOffset + 4) + '" data-hex-size="4"><td>Name RVA</td><td>' + hex(dll.nameRva, 8) + '</td><td>' + escapeHtml(dll.dllName) + '</td></tr>';
  html += '<tr data-hex-offset="' + (dll.fileOffset + 8) + '" data-hex-size="4"><td>Module Handle</td><td>' + hex(dll.moduleHandle, 8) + '</td><td>RVA of module handle</td></tr>';
  html += '<tr data-hex-offset="' + (dll.fileOffset + 12) + '" data-hex-size="4"><td>Delay IAT</td><td>' + hex(dll.delayIAT, 8) + '</td><td>RVA of delay-load IAT</td></tr>';
  html += '<tr data-hex-offset="' + (dll.fileOffset + 16) + '" data-hex-size="4"><td>Delay INT</td><td>' + hex(dll.delayINT, 8) + '</td><td>RVA of delay-load name table</td></tr>';
  html += '<tr data-hex-offset="' + (dll.fileOffset + 20) + '" data-hex-size="4"><td>Bound IAT</td><td>' + hex(dll.boundIAT, 8) + '</td><td>RVA of bound delay-load IAT</td></tr>';
  html += '<tr data-hex-offset="' + (dll.fileOffset + 24) + '" data-hex-size="4"><td>Unload IAT</td><td>' + hex(dll.unloadIAT, 8) + '</td><td>RVA of unload delay-load IAT</td></tr>';
  html += '<tr data-hex-offset="' + (dll.fileOffset + 28) + '" data-hex-size="4"><td>TimeDateStamp</td><td>' + hex(dll.timeDateStamp, 8) + '</td><td>' + formatTimestamp(dll.timeDateStamp) + '</td></tr>';
  html += '</tbody></table>';

  // Functions
  if (dll.functions.length > 0) {
    html += '<div class="pe-detail-header" style="margin-top:1px">Imported Functions (' + dll.functions.length + ')</div>';
    html += '<table class="pe-detail-table"><thead><tr>';
    html += '<th style="width:8%">#</th>';
    html += '<th style="width:10%">Hint</th>';
    html += '<th style="width:10%">Ordinal</th>';
    html += '<th style="width:72%">Name</th>';
    html += '</tr></thead><tbody>';

    dll.functions.forEach(function (func) {
      html += '<tr>';
      html += '<td>' + func.index + '</td>';
      html += '<td>' + (func.ordinal ? "" : hex(func.hint, 4)) + '</td>';
      html += '<td>' + (func.ordinal ? func.ordinal : "") + '</td>';
      html += '<td>' + escapeHtml(func.name) + '</td>';
      html += '</tr>';
    });

    html += '</tbody></table>';
  }

  panel.innerHTML = html;
}

function showCLRHeader(clr) {
  var panel = document.getElementById("detailPanel");
  if (!clr) {
    panel.innerHTML = '<div class="pe-detail-header">CLR Runtime Header</div>' +
      '<div class="pe-welcome"><p>No CLR Runtime Header found in this PE file. (Not a .NET assembly)</p></div>';
    return;
  }

  var html = '<div class="pe-detail-header">CLR Runtime Header (IMAGE_COR20_HEADER)</div>';

  html += '<table class="pe-detail-table"><thead><tr>';
  html += '<th class="col-member">Member</th>';
  html += '<th class="col-offset">Offset</th>';
  html += '<th class="col-value">Value</th>';
  html += '<th class="col-meaning">Meaning</th>';
  html += '</tr></thead><tbody>';

  html += '<tr data-hex-offset="' + clr.fileOffset + '" data-hex-size="4"><td>cb (Size)</td><td>' + hex(clr.fileOffset, 8) + '</td><td>' + clr.size + '</td><td>' + clr.size + ' bytes</td></tr>';
  html += '<tr data-hex-offset="' + (clr.fileOffset + 4) + '" data-hex-size="2"><td>MajorRuntimeVersion</td><td>' + hex(clr.fileOffset + 4, 8) + '</td><td>' + clr.majorRuntimeVersion + '</td><td></td></tr>';
  html += '<tr data-hex-offset="' + (clr.fileOffset + 6) + '" data-hex-size="2"><td>MinorRuntimeVersion</td><td>' + hex(clr.fileOffset + 6, 8) + '</td><td>' + clr.minorRuntimeVersion + '</td><td>v' + clr.majorRuntimeVersion + '.' + clr.minorRuntimeVersion + '</td></tr>';
  html += '<tr data-hex-offset="' + (clr.fileOffset + 8) + '" data-hex-size="4"><td>MetaData RVA</td><td>' + hex(clr.fileOffset + 8, 8) + '</td><td>' + hex(clr.metaData.rva, 8) + '</td><td>RVA of CLI metadata</td></tr>';
  html += '<tr data-hex-offset="' + (clr.fileOffset + 12) + '" data-hex-size="4"><td>MetaData Size</td><td>' + hex(clr.fileOffset + 12, 8) + '</td><td>' + clr.metaData.size + '</td><td>' + clr.metaData.size + ' bytes</td></tr>';
  html += '<tr data-hex-offset="' + (clr.fileOffset + 16) + '" data-hex-size="4"><td>Flags</td><td>' + hex(clr.fileOffset + 16, 8) + '</td><td>' + hex(clr.flags, 8) + '</td><td>' + escapeHtml(clr.flagStr) + '</td></tr>';
  html += '<tr data-hex-offset="' + (clr.fileOffset + 20) + '" data-hex-size="4"><td>EntryPointToken</td><td>' + hex(clr.fileOffset + 20, 8) + '</td><td>' + hex(clr.entryPointToken, 8) + '</td><td>Method token or native RVA</td></tr>';

  // Directory entries
  var dirs = [
    { name: "Resources", d: clr.resources, off: 24 },
    { name: "StrongNameSignature", d: clr.strongNameSignature, off: 32 },
    { name: "CodeManagerTable", d: clr.codeManagerTable, off: 40 },
    { name: "VTableFixups", d: clr.vTableFixups, off: 48 },
    { name: "ExportAddressTableJumps", d: clr.exportAddressTableJumps, off: 56 },
    { name: "ManagedNativeHeader", d: clr.managedNativeHeader, off: 64 },
  ];
  dirs.forEach(function (dir) {
    var present = (dir.d.rva !== 0 || dir.d.size !== 0) ? "Present" : "Empty";
    html += '<tr data-hex-offset="' + (clr.fileOffset + dir.off) + '" data-hex-size="4"><td>' + dir.name + ' RVA</td><td>' + hex(clr.fileOffset + dir.off, 8) + '</td><td>' + hex(dir.d.rva, 8) + '</td><td>' + present + '</td></tr>';
    html += '<tr data-hex-offset="' + (clr.fileOffset + dir.off + 4) + '" data-hex-size="4"><td>' + dir.name + ' Size</td><td>' + hex(clr.fileOffset + dir.off + 4, 8) + '</td><td>' + dir.d.size + '</td><td>' + dir.d.size + ' bytes</td></tr>';
  });

  html += '</tbody></table>';
  panel.innerHTML = html;
}

function showExceptionTableOverview(excTable) {
  var panel = document.getElementById("detailPanel");
  if (!excTable || excTable.entries.length === 0) {
    panel.innerHTML = '<div class="pe-detail-header">Exception Table</div>' +
      '<div class="pe-welcome"><p>No exception table found in this PE file.</p></div>';
    return;
  }

  var html = '<div class="pe-detail-header">Exception Table (' + excTable.architecture + ', ' + excTable.entries.length + ' entries)</div>';

  html += '<table class="pe-detail-table"><thead><tr>';
  html += '<th style="width:6%">#</th>';
  html += '<th style="width:10%">File Offset</th>';
  html += '<th style="width:12%">Begin Addr</th>';
  html += '<th style="width:12%">End Addr</th>';
  html += '<th style="width:10%">Func Size</th>';
  html += '<th style="width:12%">Unwind RVA</th>';
  html += '<th style="width:38%">Summary</th>';
  html += '</tr></thead><tbody>';

  excTable.entries.forEach(function (entry) {
    var endStr = entry.endAddress !== undefined ? hex(entry.endAddress, 8) : "N/A";
    var sizeStr = entry.functionSize !== undefined ? entry.functionSize + " bytes" : "N/A";
    var unwindRvaStr = entry.unwindDataRva !== undefined ? hex(entry.unwindDataRva, 8) : (entry.isPacked ? "Packed" : "N/A");

    var summary = "";
    if (entry.architecture === "x64" && entry.unwindInfo) {
      var ui = entry.unwindInfo;
      summary = "v" + ui.version + " " + ui.flagStr + " prolog=" + ui.sizeOfProlog + " codes=" + ui.countOfCodes;
      if (ui.frameRegister !== 0) summary += " frame=" + ui.frameRegisterName;
    } else if (entry.architecture === "ARM64") {
      if (entry.isPacked && entry.packedInfo) {
        var p = entry.packedInfo;
        summary = "Packed: frame=" + p.frameSize + " CR=" + p.cr + " H=" + p.h + " RegI=" + p.regI + " RegF=" + p.regF;
      } else if (entry.unwindInfo) {
        var ui = entry.unwindInfo;
        summary = "v" + ui.version + " epilogs=" + ui.epilogCount + " codeWords=" + ui.codeWords;
        if (ui.hasExceptionData) summary += " +handler";
      }
    }

    html += '<tr data-hex-offset="' + entry.fileOffset + '" data-hex-size="' + (entry.architecture === "x64" ? 12 : 8) + '">';
    html += '<td>' + entry.index + '</td>';
    html += '<td>' + hex(entry.fileOffset, 8) + '</td>';
    html += '<td>' + hex(entry.beginAddress, 8) + '</td>';
    html += '<td>' + endStr + '</td>';
    html += '<td>' + sizeStr + '</td>';
    html += '<td>' + unwindRvaStr + '</td>';
    html += '<td>' + escapeHtml(summary) + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table>';
  panel.innerHTML = html;
}

function showExceptionEntry(entry) {
  var panel = document.getElementById("detailPanel");
  var html = '<div class="pe-detail-header">Exception Entry #' + entry.index + ' (' + entry.architecture + ')</div>';

  // RUNTIME_FUNCTION fields
  html += '<table class="pe-detail-table"><thead><tr>';
  html += '<th class="col-member">Member</th>';
  html += '<th class="col-offset">Offset</th>';
  html += '<th class="col-value">Value</th>';
  html += '<th class="col-meaning">Meaning</th>';
  html += '</tr></thead><tbody>';

  html += '<tr data-hex-offset="' + entry.fileOffset + '" data-hex-size="4"><td>BeginAddress</td><td>' + hex(entry.fileOffset, 8) + '</td><td>' + hex(entry.beginAddress, 8) + '</td><td>RVA of function start</td></tr>';
  if (entry.endAddress !== undefined) {
    html += '<tr data-hex-offset="' + (entry.fileOffset + 4) + '" data-hex-size="4"><td>EndAddress</td><td>' + hex(entry.fileOffset + 4, 8) + '</td><td>' + hex(entry.endAddress, 8) + '</td><td>RVA of function end</td></tr>';
  }
  if (entry.functionSize !== undefined) {
    html += '<tr><td>Function Size</td><td></td><td>' + entry.functionSize + '</td><td>' + entry.functionSize + ' bytes</td></tr>';
  }

  if (entry.architecture === "x64") {
    html += '<tr data-hex-offset="' + (entry.fileOffset + 8) + '" data-hex-size="4"><td>UnwindInfoAddress</td><td>' + hex(entry.fileOffset + 8, 8) + '</td><td>' + hex(entry.unwindDataRva, 8) + '</td><td>RVA of UNWIND_INFO</td></tr>';
  } else if (entry.isPacked && entry.packedInfo) {
    var p = entry.packedInfo;
    html += '<tr><td>Flag</td><td></td><td>' + p.flag + '</td><td>Packed unwind data</td></tr>';
    html += '<tr><td>FunctionLength</td><td></td><td>' + p.functionLength + '</td><td>' + p.functionLength + ' bytes</td></tr>';
    html += '<tr><td>FrameSize</td><td></td><td>' + p.frameSize + '</td><td>' + p.frameSize + ' bytes</td></tr>';
    html += '<tr><td>CR</td><td></td><td>' + p.cr + '</td><td>' + ["No chaining", "Chained (PackedCR=1)", "Chained stp x29,lr (PackedCR=2)", "Chaining with context (PackedCR=3)"][p.cr] + '</td></tr>';
    html += '<tr><td>H</td><td></td><td>' + p.h + '</td><td>' + (p.h ? "Homes integer parameter registers" : "No homing") + '</td></tr>';
    html += '<tr><td>RegI</td><td></td><td>' + p.regI + '</td><td>' + p.regI + ' non-volatile INT register(s) saved</td></tr>';
    html += '<tr><td>RegF</td><td></td><td>' + p.regF + '</td><td>' + (p.regF === 7 ? "No FP registers saved" : (p.regF + 1) + " non-volatile FP register(s) saved") + '</td></tr>';
  } else if (entry.unwindDataRva !== undefined) {
    html += '<tr><td>UnwindData</td><td>' + hex(entry.fileOffset + 4, 8) + '</td><td>' + hex(entry.unwindDataRva, 8) + '</td><td>RVA of .xdata record</td></tr>';
  }
  html += '</tbody></table>';

  // UNWIND_INFO detail for x64
  if (entry.architecture === "x64" && entry.unwindInfo) {
    var ui = entry.unwindInfo;
    html += '<div class="pe-detail-header" style="margin-top:1px">UNWIND_INFO at file offset ' + hex(ui.fileOffset, 8) + '</div>';

    html += '<table class="pe-detail-table"><thead><tr>';
    html += '<th class="col-member">Member</th>';
    html += '<th class="col-value">Value</th>';
    html += '<th class="col-meaning">Meaning</th>';
    html += '</tr></thead><tbody>';

    html += '<tr><td>Version</td><td>' + ui.version + '</td><td></td></tr>';
    html += '<tr><td>Flags</td><td>' + hex(ui.flags, 2) + '</td><td>' + escapeHtml(ui.flagStr) + '</td></tr>';
    html += '<tr><td>SizeOfProlog</td><td>' + ui.sizeOfProlog + '</td><td>' + ui.sizeOfProlog + ' bytes</td></tr>';
    html += '<tr><td>CountOfCodes</td><td>' + ui.countOfCodes + '</td><td>' + ui.countOfCodes + ' UNWIND_CODE slot(s)</td></tr>';
    html += '<tr><td>FrameRegister</td><td>' + ui.frameRegister + '</td><td>' + escapeHtml(ui.frameRegisterName) + '</td></tr>';
    html += '<tr><td>FrameOffset</td><td>' + hex(ui.frameOffset, 4) + '</td><td>' + (ui.frameRegister !== 0 ? ui.frameOffset + " bytes from RSP" : "N/A") + '</td></tr>';

    if (ui.handlerRva !== 0) {
      html += '<tr><td>ExceptionHandler</td><td>' + hex(ui.handlerRva, 8) + '</td><td>RVA of exception/termination handler</td></tr>';
    }
    if (ui.chainedFunction) {
      var cf = ui.chainedFunction;
      html += '<tr><td>Chained Begin</td><td>' + hex(cf.beginAddress, 8) + '</td><td>Chained RUNTIME_FUNCTION</td></tr>';
      html += '<tr><td>Chained End</td><td>' + hex(cf.endAddress, 8) + '</td><td></td></tr>';
      html += '<tr><td>Chained Unwind</td><td>' + hex(cf.unwindData, 8) + '</td><td></td></tr>';
    }

    html += '</tbody></table>';

    // Unwind codes
    if (ui.unwindCodes.length > 0) {
      html += '<div class="pe-detail-header" style="margin-top:1px">Unwind Codes (' + ui.unwindCodes.length + ')</div>';

      html += '<table class="pe-detail-table"><thead><tr>';
      html += '<th style="width:10%">Prolog Offset</th>';
      html += '<th style="width:8%">Op Code</th>';
      html += '<th style="width:20%">Operation</th>';
      html += '<th style="width:8%">OpInfo</th>';
      html += '<th style="width:8%">Slots</th>';
      html += '<th style="width:46%">Description</th>';
      html += '</tr></thead><tbody>';

      ui.unwindCodes.forEach(function (c) {
        html += '<tr>';
        html += '<td>' + hex(c.codeOffset, 2) + '</td>';
        html += '<td>' + c.unwindOp + '</td>';
        html += '<td>' + escapeHtml(c.opName) + '</td>';
        html += '<td>' + c.opInfo + '</td>';
        html += '<td>' + c.slots + '</td>';
        html += '<td>' + escapeHtml(c.description) + '</td>';
        html += '</tr>';
      });

      html += '</tbody></table>';
    }
  }

  // UNWIND_INFO detail for ARM64 (non-packed)
  if (entry.architecture === "ARM64" && !entry.isPacked && entry.unwindInfo) {
    var ui = entry.unwindInfo;
    html += '<div class="pe-detail-header" style="margin-top:1px">.xdata Record at file offset ' + hex(ui.fileOffset, 8) + '</div>';

    html += '<table class="pe-detail-table"><thead><tr>';
    html += '<th class="col-member">Member</th>';
    html += '<th class="col-value">Value</th>';
    html += '<th class="col-meaning">Meaning</th>';
    html += '</tr></thead><tbody>';

    html += '<tr><td>FunctionLength</td><td>' + ui.functionLength + '</td><td>' + ui.functionLength + ' bytes</td></tr>';
    html += '<tr><td>Version</td><td>' + ui.version + '</td><td></td></tr>';
    html += '<tr><td>X (Exception Data)</td><td>' + ui.hasExceptionData + '</td><td>' + (ui.hasExceptionData ? "Exception handler present" : "No handler") + '</td></tr>';
    html += '<tr><td>E (Single Epilog)</td><td>' + ui.singleEpilog + '</td><td>' + (ui.singleEpilog ? "Single epilog packed in header" : "Epilog scopes at offset") + '</td></tr>';
    html += '<tr><td>Epilog Count</td><td>' + ui.epilogCount + '</td><td></td></tr>';
    html += '<tr><td>Code Words</td><td>' + ui.codeWords + '</td><td>' + (ui.codeWords * 4) + ' bytes of unwind codes</td></tr>';
    html += '<tr><td>Extended Header</td><td>' + (ui.extendedHeader ? "Yes" : "No") + '</td><td>' + (ui.extendedHeader ? "Extended epilog count and code words" : "Standard header") + '</td></tr>';

    if (ui.handlerRva !== 0) {
      html += '<tr><td>ExceptionHandler</td><td>' + hex(ui.handlerRva, 8) + '</td><td>RVA of exception handler</td></tr>';
    }

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
    html += '<tr data-hex-offset="' + entry.offset + '" data-hex-size="28">';
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

    html += '<tr data-hex-offset="' + f.offset + '" data-hex-size="' + f.size + '">';
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
      html += '<tr data-hex-offset="' + f.offset + '" data-hex-size="' + f.size + '">';
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

function loadPEFile(file) {
  var reader = new FileReader();
  reader.onload = function (e) {
    peData = e.target.result;
    peView = new DataView(peData);
    selectedLabel = null;
    isModified = false;
    loadedFileName = file.name;

    // Hide download button
    var dlBtn = document.getElementById("downloadBtn");
    if (dlBtn) dlBtn.style.display = "none";

    try {
      parsedPE = parsePE(peData);
    } catch (err) {
      document.getElementById("detailPanel").innerHTML =
        '<div class="pe-welcome"><h2>Error</h2><p style="color: #c53030;">' + escapeHtml(err.message) + '</p></div>';
      document.getElementById("peTree").innerHTML = "";
      document.getElementById("fileInfo").textContent = "";
      document.getElementById("hexPanel").innerHTML = '<div class="pe-hex-placeholder">Load a PE file to see its hex dump.</div>';
      hexScrollEl = null;
      hexRowsEl = null;
      return;
    }

    // Show file info
    updateFileInfoBar();

    // Update drop zone text
    var dropZone = document.getElementById("fileDropZone");
    dropZone.textContent = file.name;
    dropZone.style.color = "#333";

    // Build tree and show DOS header by default
    buildTree(parsedPE);
    showFields("DOS Header", "dosHeader", parsedPE.dosHeader.fields);
    initHexPanel();

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
}

// Drop zone for PE file (click + drag & drop)
(function setupFileDropZone() {
  var dropZone = document.getElementById("fileDropZone");
  var fileInput = document.getElementById("fileInput");

  // Click to open file browser
  dropZone.addEventListener("click", function () {
    fileInput.click();
  });

  // File chosen via dialog
  fileInput.addEventListener("change", function () {
    if (fileInput.files.length > 0) {
      loadPEFile(fileInput.files[0]);
    }
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
      loadPEFile(files[0]);
    }
  });
})();

// Download button
document.getElementById("downloadBtn").addEventListener("click", downloadModifiedPE);

// ============================================================
// Hex View: virtual scrolling hex dump with click-to-highlight
// ============================================================

var hexRowHeight = 18;         // Must match CSS .pe-hex-row height
var hexBytesPerRow = 16;
var hexHighlightOffset = -1;   // File offset of highlighted range
var hexHighlightSize = 0;      // Size of highlighted range
var hexScrollEl = null;        // Cached scroll container
var hexRowsEl = null;          // Cached rows container
var hexSpacerEl = null;        // Cached spacer element
var hexHeaderEl = null;        // Cached header element
var hexRafPending = false;     // requestAnimationFrame guard

function initHexPanel() {
  var panel = document.getElementById("hexPanel");
  panel.innerHTML = "";

  // Header bar with Goto/Find toolbar
  var header = document.createElement("div");
  header.className = "pe-hex-header";

  var titleSpan = document.createElement("span");
  titleSpan.className = "pe-hex-header-title";
  titleSpan.textContent = "Hex View \u2014 " + peData.byteLength + " bytes (" + hex(peData.byteLength, 8) + ")";
  header.appendChild(titleSpan);

  var toolbar = document.createElement("span");
  toolbar.className = "pe-hex-toolbar";

  // Goto
  var gotoLabel = document.createElement("label");
  gotoLabel.textContent = "Goto:";
  toolbar.appendChild(gotoLabel);

  var gotoInput = document.createElement("input");
  gotoInput.type = "text";
  gotoInput.placeholder = "0x offset";
  gotoInput.title = "Enter hex offset (e.g. 0x1A0 or 1A0)";
  toolbar.appendChild(gotoInput);

  // separator
  var sep1 = document.createElement("span");
  sep1.className = "pe-hex-sep";
  toolbar.appendChild(sep1);

  // Find
  var findLabel = document.createElement("label");
  findLabel.textContent = "Find:";
  toolbar.appendChild(findLabel);

  var findInput = document.createElement("input");
  findInput.type = "text";
  findInput.placeholder = "hex or text";
  findInput.title = "Hex bytes (e.g. 4D5A) or text (e.g. .text)";
  findInput.style.width = "120px";
  toolbar.appendChild(findInput);

  var findBtn = document.createElement("button");
  findBtn.textContent = "Next";
  findBtn.title = "Find next occurrence";
  toolbar.appendChild(findBtn);

  header.appendChild(toolbar);
  panel.appendChild(header);
  hexHeaderEl = header;

  // Goto handler
  var hexFindLastPos = 0;

  gotoInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      var val = gotoInput.value.trim().replace(/^0x/i, "");
      var offset = parseInt(val, 16);
      if (isNaN(offset) || offset < 0 || offset >= peData.byteLength) return;
      highlightHexBytes(offset, 1);
    }
  });

  // Find handler
  function doFind() {
    var query = findInput.value.trim();
    if (!query || !peData) return;

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
    var view = new Uint8Array(peData);
    var startPos = hexFindLastPos;
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
      hexFindLastPos = found + 1;
      highlightHexBytes(found, searchBytes.length);
    }
  }

  findBtn.addEventListener("click", doFind);
  findInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") doFind();
  });

  // Scroll container
  var scroll = document.createElement("div");
  scroll.className = "pe-hex-scroll";
  panel.appendChild(scroll);
  hexScrollEl = scroll;

  // Spacer for virtual scroll height
  var totalRows = Math.ceil(peData.byteLength / hexBytesPerRow);
  var spacer = document.createElement("div");
  spacer.className = "pe-hex-spacer";
  spacer.style.height = (totalRows * hexRowHeight) + "px";
  scroll.appendChild(spacer);
  hexSpacerEl = spacer;

  // Rows container (absolutely positioned within spacer)
  var rows = document.createElement("div");
  rows.className = "pe-hex-rows";
  scroll.appendChild(rows);
  hexRowsEl = rows;

  // Reset highlight
  hexHighlightOffset = -1;
  hexHighlightSize = 0;

  // Scroll listener with rAF throttle
  scroll.addEventListener("scroll", function () {
    if (!hexRafPending) {
      hexRafPending = true;
      requestAnimationFrame(function () {
        hexRafPending = false;
        renderHexRows();
      });
    }
  });

  renderHexRows();
}

function renderHexRows() {
  if (!hexScrollEl || !hexRowsEl || !peData) return;

  var scrollTop = hexScrollEl.scrollTop;
  var viewHeight = hexScrollEl.clientHeight;
  var totalRows = Math.ceil(peData.byteLength / hexBytesPerRow);

  var firstVisible = Math.floor(scrollTop / hexRowHeight);
  var visibleCount = Math.ceil(viewHeight / hexRowHeight) + 1;

  // Buffer a few rows above and below
  var buffer = 5;
  var startRow = Math.max(0, firstVisible - buffer);
  var endRow = Math.min(totalRows, firstVisible + visibleCount + buffer);

  // Position the rows container
  hexRowsEl.style.top = (startRow * hexRowHeight) + "px";

  // Build HTML for visible rows
  var view = new Uint8Array(peData);
  var html = "";
  for (var r = startRow; r < endRow; r++) {
    html += formatHexRow(view, r);
  }
  hexRowsEl.innerHTML = html;
}

function formatHexRow(view, rowIndex) {
  var fileOffset = rowIndex * hexBytesPerRow;
  var end = Math.min(fileOffset + hexBytesPerRow, view.length);

  // Offset column
  var offsetStr = '<span class="pe-hex-offset">' + hex(fileOffset, 8) + '</span>  ';

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
      var inHighlight = hexHighlightOffset >= 0 &&
        byteOffset >= hexHighlightOffset &&
        byteOffset < hexHighlightOffset + hexHighlightSize;

      if (inHighlight) {
        hexParts.push('<span class="pe-hex-highlight">' + hexByte + '</span>');
        asciiParts.push('<span class="pe-hex-highlight">' + asciiChar + '</span>');
      } else {
        hexParts.push(hexByte);
        asciiParts.push(asciiChar);
      }
    } else {
      hexParts.push("  ");
      asciiParts.push(" ");
    }
    // Extra gap after byte 8
    if (i === 7) {
      hexParts.push(" ");
    }
  }

  return '<div class="pe-hex-row">' + offsetStr +
    hexParts.join(" ") + "  " +
    '<span class="pe-hex-ascii">' + asciiParts.join("") + '</span></div>';
}

function escapeHtmlChar(charCode) {
  if (charCode === 38) return "&amp;";   // &
  if (charCode === 60) return "&lt;";    // <
  if (charCode === 62) return "&gt;";    // >
  if (charCode === 34) return "&quot;";  // "
  return String.fromCharCode(charCode);
}

function highlightHexBytes(offset, size) {
  hexHighlightOffset = offset;
  hexHighlightSize = size;

  if (!hexScrollEl || !peData) return;

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
// Hex view: vertical resizer
// ============================================================

(function setupHexResizer() {
  var resizer = document.getElementById("hexResizer");
  var hexPanel = document.getElementById("hexPanel");
  var startY, startHeight;

  resizer.addEventListener("mousedown", function (e) {
    startY = e.clientY;
    startHeight = hexPanel.offsetHeight;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    e.preventDefault();
  });

  function onMouseMove(e) {
    var delta = startY - e.clientY; // dragging up = bigger hex panel
    var newHeight = startHeight + delta;
    if (newHeight < 80) newHeight = 80;
    if (newHeight > 600) newHeight = 600;
    hexPanel.style.height = newHeight + "px";
    renderHexRows();
  }

  function onMouseUp() {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  }
})();

// ============================================================
// Hex view: click-to-highlight on detail table rows
// ============================================================

(function setupHexClickHandler() {
  var detailPanel = document.getElementById("detailPanel");
  detailPanel.addEventListener("click", function (e) {
    var row = e.target.closest("tr[data-hex-offset]");
    if (!row) return;

    var offset = parseInt(row.getAttribute("data-hex-offset"), 10);
    var size = parseInt(row.getAttribute("data-hex-size"), 10);
    if (isNaN(offset) || isNaN(size)) return;

    // Remove previous selection highlight
    var prev = detailPanel.querySelector(".pe-field-selected");
    if (prev) prev.classList.remove("pe-field-selected");

    // Highlight clicked row
    row.classList.add("pe-field-selected");

    // Highlight in hex view
    highlightHexBytes(offset, size);
  });
})();