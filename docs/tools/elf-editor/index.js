// ELF Editor - Pure JavaScript ELF parser with tree view + detail table UI
// Parses: ELF Header, Program Headers, Section Headers, Symbol Tables, Dynamic,
//         Relocations, Notes, String Tables (ELF32 and ELF64)

var elfData = null;       // ArrayBuffer of loaded file
var elfView = null;       // DataView for reading
var parsedELF = null;     // Parsed structure
var selectedLabel = null; // Currently selected tree label element
var isModified = false;   // Tracks whether any field has been changed
var loadedFileName = null; // Stores the original file name for download
var currentSection = null; // Currently displayed section key (for edit re-render)
var isLittleEndian = true; // ELF endianness

// ============================================================
// ELF Constants
// ============================================================

var ELF_CLASS = {
  0: "ELFCLASSNONE", 1: "ELFCLASS32 (32-bit)", 2: "ELFCLASS64 (64-bit)",
};

var ELF_DATA = {
  0: "ELFDATANONE", 1: "ELFDATA2LSB (Little-endian)", 2: "ELFDATA2MSB (Big-endian)",
};

var ELF_OSABI = {
  0: "ELFOSABI_NONE / System V", 1: "ELFOSABI_HPUX", 2: "ELFOSABI_NETBSD",
  3: "ELFOSABI_LINUX / GNU", 6: "ELFOSABI_SOLARIS", 7: "ELFOSABI_AIX",
  8: "ELFOSABI_IRIX", 9: "ELFOSABI_FREEBSD", 10: "ELFOSABI_TRU64",
  11: "ELFOSABI_MODESTO", 12: "ELFOSABI_OPENBSD", 64: "ELFOSABI_ARM_AEABI",
  97: "ELFOSABI_ARM", 255: "ELFOSABI_STANDALONE",
};

var ELF_TYPE = {
  0: "ET_NONE (No file type)", 1: "ET_REL (Relocatable)",
  2: "ET_EXEC (Executable)", 3: "ET_DYN (Shared object)",
  4: "ET_CORE (Core file)",
};

var ELF_MACHINE = {
  0: "EM_NONE", 2: "EM_SPARC", 3: "EM_386 (x86)",
  8: "EM_MIPS", 15: "EM_PARISC", 20: "EM_PPC",
  21: "EM_PPC64", 22: "EM_S390", 40: "EM_ARM",
  42: "EM_SH", 43: "EM_SPARCV9", 50: "EM_IA_64 (Itanium)",
  62: "EM_X86_64 (AMD64)", 183: "EM_AARCH64 (ARM64)",
  243: "EM_RISCV", 247: "EM_BPF", 258: "EM_LOONGARCH",
};

var PT_TYPE = {
  0: "PT_NULL", 1: "PT_LOAD", 2: "PT_DYNAMIC", 3: "PT_INTERP",
  4: "PT_NOTE", 5: "PT_SHLIB", 6: "PT_PHDR", 7: "PT_TLS",
  0x6474e550: "PT_GNU_EH_FRAME", 0x6474e551: "PT_GNU_STACK",
  0x6474e552: "PT_GNU_RELRO", 0x6474e553: "PT_GNU_PROPERTY",
  0x70000001: "PT_ARCH (processor-specific)",
};

var PF_FLAGS = {
  0x1: "PF_X (Execute)", 0x2: "PF_W (Write)", 0x4: "PF_R (Read)",
};

var SHT_TYPE = {
  0: "SHT_NULL", 1: "SHT_PROGBITS", 2: "SHT_SYMTAB", 3: "SHT_STRTAB",
  4: "SHT_RELA", 5: "SHT_HASH", 6: "SHT_DYNAMIC", 7: "SHT_NOTE",
  8: "SHT_NOBITS", 9: "SHT_REL", 10: "SHT_SHLIB", 11: "SHT_DYNSYM",
  14: "SHT_INIT_ARRAY", 15: "SHT_FINI_ARRAY", 16: "SHT_PREINIT_ARRAY",
  17: "SHT_GROUP", 18: "SHT_SYMTAB_SHNDX",
  0x6ffffff6: "SHT_GNU_HASH", 0x6ffffffd: "SHT_GNU_VERDEF",
  0x6ffffffe: "SHT_GNU_VERNEED", 0x6fffffff: "SHT_GNU_VERSYM",
  0x70000001: "SHT_ARM_EXIDX / SHT_ARCH",
  0x70000003: "SHT_ARM_ATTRIBUTES / SHT_ARCH",
};

var SHF_FLAGS = {
  0x1: "SHF_WRITE", 0x2: "SHF_ALLOC", 0x4: "SHF_EXECINSTR",
  0x10: "SHF_MERGE", 0x20: "SHF_STRINGS", 0x40: "SHF_INFO_LINK",
  0x80: "SHF_LINK_ORDER", 0x100: "SHF_OS_NONCONFORMING",
  0x200: "SHF_GROUP", 0x400: "SHF_TLS",
};

var STB_BINDING = {
  0: "STB_LOCAL", 1: "STB_GLOBAL", 2: "STB_WEAK",
  10: "STB_LOOS", 12: "STB_HIOS", 13: "STB_LOPROC", 15: "STB_HIPROC",
};

var STT_TYPE = {
  0: "STT_NOTYPE", 1: "STT_OBJECT", 2: "STT_FUNC", 3: "STT_SECTION",
  4: "STT_FILE", 5: "STT_COMMON", 6: "STT_TLS",
  10: "STT_LOOS", 12: "STT_HIOS", 13: "STT_LOPROC", 15: "STT_HIPROC",
};

var STV_VISIBILITY = {
  0: "STV_DEFAULT", 1: "STV_INTERNAL", 2: "STV_HIDDEN", 3: "STV_PROTECTED",
};

var SHN_SPECIAL = {
  0: "SHN_UNDEF", 0xfff1: "SHN_ABS", 0xfff2: "SHN_COMMON", 0xffff: "SHN_XINDEX",
};

var DT_TAG = {
  0: "DT_NULL", 1: "DT_NEEDED", 2: "DT_PLTRELSZ", 3: "DT_PLTGOT",
  4: "DT_HASH", 5: "DT_STRTAB", 6: "DT_SYMTAB", 7: "DT_RELA",
  8: "DT_RELASZ", 9: "DT_RELAENT", 10: "DT_STRSZ", 11: "DT_SYMENT",
  12: "DT_INIT", 13: "DT_FINI", 14: "DT_SONAME", 15: "DT_RPATH",
  16: "DT_SYMBOLIC", 17: "DT_REL", 18: "DT_RELSZ", 19: "DT_RELENT",
  20: "DT_PLTREL", 21: "DT_DEBUG", 22: "DT_TEXTREL", 23: "DT_JMPREL",
  24: "DT_BIND_NOW", 25: "DT_INIT_ARRAY", 26: "DT_FINI_ARRAY",
  27: "DT_INIT_ARRAYSZ", 28: "DT_FINI_ARRAYSZ", 29: "DT_RUNPATH",
  30: "DT_FLAGS", 32: "DT_PREINIT_ARRAY", 33: "DT_PREINIT_ARRAYSZ",
  0x6ffffef5: "DT_GNU_HASH", 0x6ffffff0: "DT_VERSYM",
  0x6ffffffe: "DT_VERNEED", 0x6fffffff: "DT_VERNEEDNUM",
  0x6ffffff9: "DT_RELACOUNT", 0x6ffffffa: "DT_RELCOUNT",
  0x6ffffffb: "DT_FLAGS_1",
};

var DT_FLAGS = {
  0x1: "DF_ORIGIN", 0x2: "DF_SYMBOLIC", 0x4: "DF_TEXTREL",
  0x8: "DF_BIND_NOW", 0x10: "DF_STATIC_TLS",
};

var DT_FLAGS_1 = {
  0x1: "DF_1_NOW", 0x2: "DF_1_GLOBAL", 0x8: "DF_1_NODELETE",
  0x10: "DF_1_LOADFLTR", 0x20: "DF_1_INITFIRST",
  0x40: "DF_1_NOOPEN", 0x80: "DF_1_ORIGIN",
  0x100: "DF_1_DIRECT", 0x800: "DF_1_INTERPOSE",
  0x1000: "DF_1_NODEFLIB", 0x2000: "DF_1_NODUMP",
  0x4000: "DF_1_CONFALT", 0x8000000: "DF_1_PIE",
};

// x86_64 relocation types
var R_X86_64_TYPE = {
  0: "R_X86_64_NONE", 1: "R_X86_64_64", 2: "R_X86_64_PC32",
  3: "R_X86_64_GOT32", 4: "R_X86_64_PLT32", 5: "R_X86_64_COPY",
  6: "R_X86_64_GLOB_DAT", 7: "R_X86_64_JUMP_SLOT", 8: "R_X86_64_RELATIVE",
  9: "R_X86_64_GOTPCREL", 10: "R_X86_64_32", 11: "R_X86_64_32S",
  14: "R_X86_64_PC16", 20: "R_X86_64_DTPMOD64", 21: "R_X86_64_DTPOFF64",
  22: "R_X86_64_TPOFF64", 23: "R_X86_64_TLSGD", 24: "R_X86_64_TLSLD",
  25: "R_X86_64_DTPOFF32", 37: "R_X86_64_IRELATIVE",
};

// i386 relocation types
var R_386_TYPE = {
  0: "R_386_NONE", 1: "R_386_32", 2: "R_386_PC32",
  3: "R_386_GOT32", 4: "R_386_PLT32", 5: "R_386_COPY",
  6: "R_386_GLOB_DAT", 7: "R_386_JMP_SLOT", 8: "R_386_RELATIVE",
  9: "R_386_GOTOFF", 10: "R_386_GOTPC",
};

// AArch64 relocation types
var R_AARCH64_TYPE = {
  0: "R_AARCH64_NONE", 257: "R_AARCH64_ABS64", 258: "R_AARCH64_ABS32",
  261: "R_AARCH64_PREL64", 262: "R_AARCH64_PREL32",
  275: "R_AARCH64_ADR_PREL_PG_HI21", 282: "R_AARCH64_ADD_ABS_LO12_NC",
  283: "R_AARCH64_LDST8_ABS_LO12_NC",
  311: "R_AARCH64_JUMP26", 312: "R_AARCH64_CALL26",
  1024: "R_AARCH64_COPY", 1025: "R_AARCH64_GLOB_DAT",
  1026: "R_AARCH64_JUMP_SLOT", 1027: "R_AARCH64_RELATIVE",
  1032: "R_AARCH64_IRELATIVE",
};

// ARM relocation types
var R_ARM_TYPE = {
  0: "R_ARM_NONE", 2: "R_ARM_ABS32", 3: "R_ARM_REL32",
  20: "R_ARM_COPY", 21: "R_ARM_GLOB_DAT", 22: "R_ARM_JUMP_SLOT",
  23: "R_ARM_RELATIVE",
};

// Note types
var NT_GNU_TYPE = {
  1: "NT_GNU_ABI_TAG", 2: "NT_GNU_HWCAP", 3: "NT_GNU_BUILD_ID",
  4: "NT_GNU_GOLD_VERSION", 5: "NT_GNU_PROPERTY_TYPE_0",
};

var NT_CORE_TYPE = {
  1: "NT_PRSTATUS", 2: "NT_FPREGSET", 3: "NT_PRPSINFO",
  4: "NT_TASKSTRUCT", 6: "NT_AUXV",
};

// ============================================================
// Helper functions
// ============================================================

function hex(val, width) {
  if (val === undefined || val === null) return "N/A";
  var s = (val >>> 0).toString(16).toUpperCase();
  if (width) {
    while (s.length < width) s = "0" + s;
  }
  return "0x" + s;
}

function hex64(lo, hi) {
  var high = (hi >>> 0).toString(16).toUpperCase();
  var low = (lo >>> 0).toString(16).toUpperCase();
  while (low.length < 8) low = "0" + low;
  if (high === "0") return "0x" + low;
  return "0x" + high + low;
}

function decodeFlags(val, flagMap) {
  var flags = [];
  for (var bit in flagMap) {
    if ((val >>> 0) & (parseInt(bit) >>> 0)) {
      flags.push(flagMap[bit]);
    }
  }
  return flags.length > 0 ? flags.join(" | ") : "(none)";
}

function readAscii(view, offset, maxLen) {
  var str = "";
  for (var i = 0; i < maxLen; i++) {
    if (offset + i >= view.byteLength) break;
    var ch = view.getUint8(offset + i);
    if (ch === 0) break;
    str += String.fromCharCode(ch);
  }
  return str;
}

// Read a string from the string table at given offset
function readStringTable(view, strtabOffset, strtabSize, nameOffset) {
  if (nameOffset >= strtabSize) return "<invalid>";
  return readAscii(view, strtabOffset + nameOffset, strtabSize - nameOffset);
}

function readU16(view, offset) { return view.getUint16(offset, isLittleEndian); }
function readU32(view, offset) { return view.getUint32(offset, isLittleEndian); }
function readS32(view, offset) { return view.getInt32(offset, isLittleEndian); }

// Read 64-bit as {lo, hi} pair
function readU64(view, offset) {
  if (isLittleEndian) {
    return { lo: view.getUint32(offset, true), hi: view.getUint32(offset + 4, true) };
  } else {
    return { lo: view.getUint32(offset + 4, false), hi: view.getUint32(offset, false) };
  }
}

// Read 64-bit signed for addends
function readS64(view, offset) {
  var val = readU64(view, offset);
  // For display as signed, check high bit of hi word
  return val;
}

function formatPfFlags(val) {
  var s = "";
  s += (val & 4) ? "R" : "-";
  s += (val & 2) ? "W" : "-";
  s += (val & 1) ? "X" : "-";
  return s;
}

function getRelocTypeName(machine, type) {
  if (machine === 62) return R_X86_64_TYPE[type] || ("R_X86_64_" + type);
  if (machine === 3) return R_386_TYPE[type] || ("R_386_" + type);
  if (machine === 183) return R_AARCH64_TYPE[type] || ("R_AARCH64_" + type);
  if (machine === 40) return R_ARM_TYPE[type] || ("R_ARM_" + type);
  return "TYPE_" + type;
}

// ============================================================
// ELF Parser
// ============================================================

function parseELF(buffer) {
  var view = new DataView(buffer);
  var result = {};

  // --- ELF Identification ---
  var magic0 = view.getUint8(0);
  var magic1 = view.getUint8(1);
  var magic2 = view.getUint8(2);
  var magic3 = view.getUint8(3);
  if (magic0 !== 0x7f || magic1 !== 0x45 || magic2 !== 0x4c || magic3 !== 0x46) {
    throw new Error("Not a valid ELF file: missing \\x7fELF magic (got " +
      hex(magic0, 2) + " " + hex(magic1, 2) + " " + hex(magic2, 2) + " " + hex(magic3, 2) + ")");
  }

  var elfClass = view.getUint8(4);
  var elfDataEncoding = view.getUint8(5);
  var is64 = (elfClass === 2);
  isLittleEndian = (elfDataEncoding === 1);
  result.is64 = is64;

  // --- ELF Header ---
  var ehdrSize = is64 ? 64 : 52;
  var ident = [];
  for (var i = 0; i < 16; i++) ident.push(view.getUint8(i));

  var fields = [
    { name: "e_ident[EI_MAG]",      offset: 0,  size: 4, value: "\\x7fELF", isString: true },
    { name: "e_ident[EI_CLASS]",     offset: 4,  size: 1, value: view.getUint8(4) },
    { name: "e_ident[EI_DATA]",      offset: 5,  size: 1, value: view.getUint8(5) },
    { name: "e_ident[EI_VERSION]",   offset: 6,  size: 1, value: view.getUint8(6) },
    { name: "e_ident[EI_OSABI]",     offset: 7,  size: 1, value: view.getUint8(7) },
    { name: "e_ident[EI_ABIVERSION]",offset: 8,  size: 1, value: view.getUint8(8) },
    { name: "e_ident[EI_PAD]",       offset: 9,  size: 7, value: "00 00 00 00 00 00 00", isString: true },
    { name: "e_type",      offset: 16, size: 2, value: readU16(view, 16) },
    { name: "e_machine",   offset: 18, size: 2, value: readU16(view, 18) },
    { name: "e_version",   offset: 20, size: 4, value: readU32(view, 20) },
  ];

  var off;
  if (is64) {
    var entry64 = readU64(view, 24);
    var phoff64 = readU64(view, 32);
    var shoff64 = readU64(view, 40);
    fields.push({ name: "e_entry",     offset: 24, size: 8, valueLo: entry64.lo, valueHi: entry64.hi });
    fields.push({ name: "e_phoff",     offset: 32, size: 8, valueLo: phoff64.lo, valueHi: phoff64.hi });
    fields.push({ name: "e_shoff",     offset: 40, size: 8, valueLo: shoff64.lo, valueHi: shoff64.hi });
    fields.push({ name: "e_flags",     offset: 48, size: 4, value: readU32(view, 48) });
    fields.push({ name: "e_ehsize",    offset: 52, size: 2, value: readU16(view, 52) });
    fields.push({ name: "e_phentsize", offset: 54, size: 2, value: readU16(view, 54) });
    fields.push({ name: "e_phnum",     offset: 56, size: 2, value: readU16(view, 56) });
    fields.push({ name: "e_shentsize", offset: 58, size: 2, value: readU16(view, 58) });
    fields.push({ name: "e_shnum",     offset: 60, size: 2, value: readU16(view, 60) });
    fields.push({ name: "e_shstrndx",  offset: 62, size: 2, value: readU16(view, 62) });
    result.e_phoff = phoff64.lo;
    result.e_shoff = shoff64.lo;
    result.e_phnum = readU16(view, 56);
    result.e_shnum = readU16(view, 60);
    result.e_phentsize = readU16(view, 54);
    result.e_shentsize = readU16(view, 58);
    result.e_shstrndx = readU16(view, 62);
    result.e_entry = entry64;
    result.e_machine = readU16(view, 18);
    result.e_type = readU16(view, 16);
    result.e_flags = readU32(view, 48);
  } else {
    fields.push({ name: "e_entry",     offset: 24, size: 4, value: readU32(view, 24) });
    fields.push({ name: "e_phoff",     offset: 28, size: 4, value: readU32(view, 28) });
    fields.push({ name: "e_shoff",     offset: 32, size: 4, value: readU32(view, 32) });
    fields.push({ name: "e_flags",     offset: 36, size: 4, value: readU32(view, 36) });
    fields.push({ name: "e_ehsize",    offset: 40, size: 2, value: readU16(view, 40) });
    fields.push({ name: "e_phentsize", offset: 42, size: 2, value: readU16(view, 42) });
    fields.push({ name: "e_phnum",     offset: 44, size: 2, value: readU16(view, 44) });
    fields.push({ name: "e_shentsize", offset: 46, size: 2, value: readU16(view, 46) });
    fields.push({ name: "e_shnum",     offset: 48, size: 2, value: readU16(view, 48) });
    fields.push({ name: "e_shstrndx",  offset: 50, size: 2, value: readU16(view, 50) });
    result.e_phoff = readU32(view, 28);
    result.e_shoff = readU32(view, 32);
    result.e_phnum = readU16(view, 44);
    result.e_shnum = readU16(view, 48);
    result.e_phentsize = readU16(view, 42);
    result.e_shentsize = readU16(view, 46);
    result.e_shstrndx = readU16(view, 50);
    result.e_entry = { lo: readU32(view, 24), hi: 0 };
    result.e_machine = readU16(view, 18);
    result.e_type = readU16(view, 16);
    result.e_flags = readU32(view, 36);
  }

  result.elfHeader = { offset: 0, fields: fields };

  // --- Section Headers (parse early so we can get string table) ---
  result.sections = [];
  var shstrtabOffset = 0;
  var shstrtabSize = 0;

  if (result.e_shnum > 0 && result.e_shoff > 0) {
    // First pass: read raw section headers to find shstrtab
    for (var si = 0; si < result.e_shnum; si++) {
      var soff = result.e_shoff + si * result.e_shentsize;
      if (soff + result.e_shentsize > buffer.byteLength) break;

      if (si === result.e_shstrndx) {
        if (is64) {
          shstrtabOffset = readU64(view, soff + 24).lo;
          shstrtabSize = readU64(view, soff + 32).lo;
        } else {
          shstrtabOffset = readU32(view, soff + 16);
          shstrtabSize = readU32(view, soff + 20);
        }
      }
    }

    // Second pass: build section header entries with resolved names
    for (var si = 0; si < result.e_shnum; si++) {
      var soff = result.e_shoff + si * result.e_shentsize;
      if (soff + result.e_shentsize > buffer.byteLength) break;

      var sec = {};
      if (is64) {
        var sh_name_idx = readU32(view, soff);
        var sh_name_str = shstrtabSize > 0 ? readStringTable(view, shstrtabOffset, shstrtabSize, sh_name_idx) : ("[" + sh_name_idx + "]");
        var sh_type = readU32(view, soff + 4);
        var sh_flags64 = readU64(view, soff + 8);
        var sh_addr64 = readU64(view, soff + 16);
        var sh_offset64 = readU64(view, soff + 24);
        var sh_size64 = readU64(view, soff + 32);
        var sh_link = readU32(view, soff + 40);
        var sh_info = readU32(view, soff + 44);
        var sh_addralign64 = readU64(view, soff + 48);
        var sh_entsize64 = readU64(view, soff + 56);

        sec.nameStr = sh_name_str;
        sec.typeVal = sh_type;
        sec.sh_offset = sh_offset64.lo;
        sec.sh_size = sh_size64.lo;
        sec.sh_link = sh_link;
        sec.sh_info = sh_info;
        sec.sh_entsize = sh_entsize64.lo;
        sec.sh_flags = sh_flags64.lo;
        sec.sh_addr = sh_addr64.lo;

        sec.fields = [
          { name: "sh_name",      offset: soff,      size: 4, value: sh_name_idx },
          { name: "sh_type",      offset: soff + 4,  size: 4, value: sh_type },
          { name: "sh_flags",     offset: soff + 8,  size: 8, valueLo: sh_flags64.lo, valueHi: sh_flags64.hi },
          { name: "sh_addr",      offset: soff + 16, size: 8, valueLo: sh_addr64.lo, valueHi: sh_addr64.hi },
          { name: "sh_offset",    offset: soff + 24, size: 8, valueLo: sh_offset64.lo, valueHi: sh_offset64.hi },
          { name: "sh_size",      offset: soff + 32, size: 8, valueLo: sh_size64.lo, valueHi: sh_size64.hi },
          { name: "sh_link",      offset: soff + 40, size: 4, value: sh_link },
          { name: "sh_info",      offset: soff + 44, size: 4, value: sh_info },
          { name: "sh_addralign", offset: soff + 48, size: 8, valueLo: sh_addralign64.lo, valueHi: sh_addralign64.hi },
          { name: "sh_entsize",   offset: soff + 56, size: 8, valueLo: sh_entsize64.lo, valueHi: sh_entsize64.hi },
        ];
      } else {
        var sh_name_idx = readU32(view, soff);
        var sh_name_str = shstrtabSize > 0 ? readStringTable(view, shstrtabOffset, shstrtabSize, sh_name_idx) : ("[" + sh_name_idx + "]");
        var sh_type = readU32(view, soff + 4);
        var sh_flags = readU32(view, soff + 8);
        var sh_addr = readU32(view, soff + 12);
        var sh_offset = readU32(view, soff + 16);
        var sh_size = readU32(view, soff + 20);
        var sh_link = readU32(view, soff + 24);
        var sh_info = readU32(view, soff + 28);
        var sh_addralign = readU32(view, soff + 32);
        var sh_entsize = readU32(view, soff + 36);

        sec.nameStr = sh_name_str;
        sec.typeVal = sh_type;
        sec.sh_offset = sh_offset;
        sec.sh_size = sh_size;
        sec.sh_link = sh_link;
        sec.sh_info = sh_info;
        sec.sh_entsize = sh_entsize;
        sec.sh_flags = sh_flags;
        sec.sh_addr = sh_addr;

        sec.fields = [
          { name: "sh_name",      offset: soff,      size: 4, value: sh_name_idx },
          { name: "sh_type",      offset: soff + 4,  size: 4, value: sh_type },
          { name: "sh_flags",     offset: soff + 8,  size: 4, value: sh_flags },
          { name: "sh_addr",      offset: soff + 12, size: 4, value: sh_addr },
          { name: "sh_offset",    offset: soff + 16, size: 4, value: sh_offset },
          { name: "sh_size",      offset: soff + 20, size: 4, value: sh_size },
          { name: "sh_link",      offset: soff + 24, size: 4, value: sh_link },
          { name: "sh_info",      offset: soff + 28, size: 4, value: sh_info },
          { name: "sh_addralign", offset: soff + 32, size: 4, value: sh_addralign },
          { name: "sh_entsize",   offset: soff + 36, size: 4, value: sh_entsize },
        ];
      }
      sec.index = si;
      result.sections.push(sec);
    }
  }

  // --- Program Headers ---
  result.programHeaders = [];
  if (result.e_phnum > 0 && result.e_phoff > 0) {
    for (var pi = 0; pi < result.e_phnum; pi++) {
      var poff = result.e_phoff + pi * result.e_phentsize;
      if (poff + result.e_phentsize > buffer.byteLength) break;

      var phdr = {};
      if (is64) {
        var p_type = readU32(view, poff);
        var p_flags = readU32(view, poff + 4);
        var p_offset64 = readU64(view, poff + 8);
        var p_vaddr64 = readU64(view, poff + 16);
        var p_paddr64 = readU64(view, poff + 24);
        var p_filesz64 = readU64(view, poff + 32);
        var p_memsz64 = readU64(view, poff + 40);
        var p_align64 = readU64(view, poff + 48);

        phdr.typeVal = p_type;
        phdr.p_offset = p_offset64.lo;
        phdr.p_filesz = p_filesz64.lo;
        phdr.fields = [
          { name: "p_type",   offset: poff,      size: 4, value: p_type },
          { name: "p_flags",  offset: poff + 4,  size: 4, value: p_flags },
          { name: "p_offset", offset: poff + 8,  size: 8, valueLo: p_offset64.lo, valueHi: p_offset64.hi },
          { name: "p_vaddr",  offset: poff + 16, size: 8, valueLo: p_vaddr64.lo, valueHi: p_vaddr64.hi },
          { name: "p_paddr",  offset: poff + 24, size: 8, valueLo: p_paddr64.lo, valueHi: p_paddr64.hi },
          { name: "p_filesz", offset: poff + 32, size: 8, valueLo: p_filesz64.lo, valueHi: p_filesz64.hi },
          { name: "p_memsz",  offset: poff + 40, size: 8, valueLo: p_memsz64.lo, valueHi: p_memsz64.hi },
          { name: "p_align",  offset: poff + 48, size: 8, valueLo: p_align64.lo, valueHi: p_align64.hi },
        ];
      } else {
        var p_type = readU32(view, poff);
        var p_offset32 = readU32(view, poff + 4);
        var p_vaddr32 = readU32(view, poff + 8);
        var p_paddr32 = readU32(view, poff + 12);
        var p_filesz32 = readU32(view, poff + 16);
        var p_memsz32 = readU32(view, poff + 20);
        var p_flags = readU32(view, poff + 24);
        var p_align32 = readU32(view, poff + 28);

        phdr.typeVal = p_type;
        phdr.p_offset = p_offset32;
        phdr.p_filesz = p_filesz32;
        phdr.fields = [
          { name: "p_type",   offset: poff,      size: 4, value: p_type },
          { name: "p_offset", offset: poff + 4,  size: 4, value: p_offset32 },
          { name: "p_vaddr",  offset: poff + 8,  size: 4, value: p_vaddr32 },
          { name: "p_paddr",  offset: poff + 12, size: 4, value: p_paddr32 },
          { name: "p_filesz", offset: poff + 16, size: 4, value: p_filesz32 },
          { name: "p_memsz",  offset: poff + 20, size: 4, value: p_memsz32 },
          { name: "p_flags",  offset: poff + 24, size: 4, value: p_flags },
          { name: "p_align",  offset: poff + 28, size: 4, value: p_align32 },
        ];
      }
      phdr.index = pi;
      result.programHeaders.push(phdr);
    }
  }

  // --- Parse sections data: symbols, dynamic, relocations, notes, string tables ---
  result.symbolTables = [];
  result.dynamicSection = null;
  result.relocationTables = [];
  result.noteSections = [];
  result.stringTables = [];

  for (var si = 0; si < result.sections.length; si++) {
    var sec = result.sections[si];

    // Symbol tables (SHT_SYMTAB=2, SHT_DYNSYM=11)
    if (sec.typeVal === 2 || sec.typeVal === 11) {
      var symtab = parseSymbolTable(view, sec, result, is64);
      result.symbolTables.push(symtab);
    }

    // Dynamic section (SHT_DYNAMIC=6)
    if (sec.typeVal === 6) {
      result.dynamicSection = parseDynamic(view, sec, result, is64);
    }

    // Relocations (SHT_REL=9, SHT_RELA=4)
    if (sec.typeVal === 9 || sec.typeVal === 4) {
      var reloc = parseRelocations(view, sec, result, is64);
      result.relocationTables.push(reloc);
    }

    // Notes (SHT_NOTE=7)
    if (sec.typeVal === 7) {
      var notes = parseNotes(view, sec);
      result.noteSections.push({ section: sec, notes: notes });
    }

    // String tables (SHT_STRTAB=3)
    if (sec.typeVal === 3) {
      result.stringTables.push(sec);
    }
  }

  // --- Parse INTERP segment ---
  for (var pi = 0; pi < result.programHeaders.length; pi++) {
    var ph = result.programHeaders[pi];
    if (ph.typeVal === 3 && ph.p_filesz > 0) { // PT_INTERP
      result.interpreter = readAscii(view, ph.p_offset, ph.p_filesz);
    }
  }

  return result;
}

// ============================================================
// Section Parsers
// ============================================================

function parseSymbolTable(view, sec, elf, is64) {
  var symbols = [];
  var entsize = sec.sh_entsize || (is64 ? 24 : 16);
  var count = sec.sh_size > 0 ? Math.floor(sec.sh_size / entsize) : 0;

  // String table for this symbol table
  var strtabSec = (sec.sh_link < elf.sections.length) ? elf.sections[sec.sh_link] : null;
  var strtabOff = strtabSec ? strtabSec.sh_offset : 0;
  var strtabSz = strtabSec ? strtabSec.sh_size : 0;

  for (var i = 0; i < count; i++) {
    var off = sec.sh_offset + i * entsize;
    if (off + entsize > view.byteLength) break;

    var sym = {};
    if (is64) {
      var st_name = readU32(view, off);
      var st_info = view.getUint8(off + 4);
      var st_other = view.getUint8(off + 5);
      var st_shndx = readU16(view, off + 6);
      var st_value = readU64(view, off + 8);
      var st_size = readU64(view, off + 16);

      sym.nameStr = strtabSz > 0 ? readStringTable(view, strtabOff, strtabSz, st_name) : ("[" + st_name + "]");
      sym.binding = (st_info >> 4) & 0xf;
      sym.type = st_info & 0xf;
      sym.visibility = st_other & 0x3;
      sym.shndx = st_shndx;

      sym.fields = [
        { name: "st_name",  offset: off,      size: 4, value: st_name },
        { name: "st_info",  offset: off + 4,  size: 1, value: st_info },
        { name: "st_other", offset: off + 5,  size: 1, value: st_other },
        { name: "st_shndx", offset: off + 6,  size: 2, value: st_shndx },
        { name: "st_value", offset: off + 8,  size: 8, valueLo: st_value.lo, valueHi: st_value.hi },
        { name: "st_size",  offset: off + 16, size: 8, valueLo: st_size.lo, valueHi: st_size.hi },
      ];
    } else {
      var st_name = readU32(view, off);
      var st_value = readU32(view, off + 4);
      var st_size = readU32(view, off + 8);
      var st_info = view.getUint8(off + 12);
      var st_other = view.getUint8(off + 13);
      var st_shndx = readU16(view, off + 14);

      sym.nameStr = strtabSz > 0 ? readStringTable(view, strtabOff, strtabSz, st_name) : ("[" + st_name + "]");
      sym.binding = (st_info >> 4) & 0xf;
      sym.type = st_info & 0xf;
      sym.visibility = st_other & 0x3;
      sym.shndx = st_shndx;

      sym.fields = [
        { name: "st_name",  offset: off,      size: 4, value: st_name },
        { name: "st_value", offset: off + 4,  size: 4, value: st_value },
        { name: "st_size",  offset: off + 8,  size: 4, value: st_size },
        { name: "st_info",  offset: off + 12, size: 1, value: st_info },
        { name: "st_other", offset: off + 13, size: 1, value: st_other },
        { name: "st_shndx", offset: off + 14, size: 2, value: st_shndx },
      ];
    }
    sym.index = i;
    symbols.push(sym);
  }

  return { section: sec, symbols: symbols };
}

function parseDynamic(view, sec, elf, is64) {
  var entries = [];
  var entsize = is64 ? 16 : 8;
  var count = sec.sh_size > 0 ? Math.floor(sec.sh_size / entsize) : 0;

  // Dynamic string table
  var dynstrSec = (sec.sh_link < elf.sections.length) ? elf.sections[sec.sh_link] : null;
  var dynstrOff = dynstrSec ? dynstrSec.sh_offset : 0;
  var dynstrSz = dynstrSec ? dynstrSec.sh_size : 0;

  for (var i = 0; i < count; i++) {
    var off = sec.sh_offset + i * entsize;
    if (off + entsize > view.byteLength) break;

    var entry = {};
    if (is64) {
      var d_tag64 = readU64(view, off);
      var d_val64 = readU64(view, off + 8);
      entry.tag = d_tag64.lo; // tags fit in 32 bits
      entry.tagHi = d_tag64.hi;
      entry.val = d_val64;
      entry.fields = [
        { name: "d_tag", offset: off,     size: 8, valueLo: d_tag64.lo, valueHi: d_tag64.hi },
        { name: "d_val", offset: off + 8, size: 8, valueLo: d_val64.lo, valueHi: d_val64.hi },
      ];
    } else {
      var d_tag = readS32(view, off);
      var d_val = readU32(view, off + 4);
      entry.tag = d_tag;
      entry.tagHi = 0;
      entry.val = { lo: d_val, hi: 0 };
      entry.fields = [
        { name: "d_tag", offset: off,     size: 4, value: d_tag },
        { name: "d_val", offset: off + 4, size: 4, value: d_val },
      ];
    }

    // Resolve string value for DT_NEEDED, DT_SONAME, DT_RPATH, DT_RUNPATH
    var tag = entry.tag;
    if ((tag === 1 || tag === 14 || tag === 15 || tag === 29) && dynstrSz > 0) {
      entry.strValue = readStringTable(view, dynstrOff, dynstrSz, entry.val.lo);
    }

    entry.index = i;
    entries.push(entry);

    // Stop at DT_NULL
    if (tag === 0) break;
  }

  return { section: sec, entries: entries, dynstrOff: dynstrOff, dynstrSz: dynstrSz };
}

function parseRelocations(view, sec, elf, is64) {
  var entries = [];
  var isRela = (sec.typeVal === 4); // SHT_RELA
  var entsize = sec.sh_entsize;
  if (!entsize) {
    if (is64) entsize = isRela ? 24 : 16;
    else entsize = isRela ? 12 : 8;
  }
  var count = sec.sh_size > 0 ? Math.floor(sec.sh_size / entsize) : 0;

  // Associated symbol table
  var symtabSec = (sec.sh_link < elf.sections.length) ? elf.sections[sec.sh_link] : null;

  for (var i = 0; i < count; i++) {
    var off = sec.sh_offset + i * entsize;
    if (off + entsize > view.byteLength) break;

    var rel = {};
    if (is64) {
      var r_offset64 = readU64(view, off);
      var r_info64 = readU64(view, off + 8);
      rel.r_offset = r_offset64;
      rel.r_sym = r_info64.hi;
      rel.r_type = r_info64.lo;
      rel.fields = [
        { name: "r_offset", offset: off,     size: 8, valueLo: r_offset64.lo, valueHi: r_offset64.hi },
        { name: "r_info",   offset: off + 8, size: 8, valueLo: r_info64.lo, valueHi: r_info64.hi },
      ];
      if (isRela) {
        var r_addend64 = readU64(view, off + 16);
        rel.r_addend = r_addend64;
        rel.fields.push({ name: "r_addend", offset: off + 16, size: 8, valueLo: r_addend64.lo, valueHi: r_addend64.hi });
      }
    } else {
      var r_offset32 = readU32(view, off);
      var r_info32 = readU32(view, off + 4);
      rel.r_offset = { lo: r_offset32, hi: 0 };
      rel.r_sym = (r_info32 >>> 8) & 0xffffff;
      rel.r_type = r_info32 & 0xff;
      rel.fields = [
        { name: "r_offset", offset: off,     size: 4, value: r_offset32 },
        { name: "r_info",   offset: off + 4, size: 4, value: r_info32 },
      ];
      if (isRela) {
        var r_addend32 = readS32(view, off + 8);
        rel.r_addend = { lo: r_addend32, hi: 0 };
        rel.fields.push({ name: "r_addend", offset: off + 8, size: 4, value: r_addend32 });
      }
    }
    rel.isRela = isRela;
    rel.index = i;
    entries.push(rel);
  }

  return { section: sec, entries: entries, symtabSec: symtabSec, isRela: isRela };
}

function parseNotes(view, sec) {
  var notes = [];
  var pos = sec.sh_offset;
  var end = sec.sh_offset + sec.sh_size;

  while (pos + 12 <= end && pos + 12 <= view.byteLength) {
    var namesz = readU32(view, pos);
    var descsz = readU32(view, pos + 4);
    var ntype = readU32(view, pos + 8);
    var noteStart = pos;

    pos += 12;
    var name = "";
    if (namesz > 0 && pos + namesz <= view.byteLength) {
      name = readAscii(view, pos, namesz);
    }
    pos += align4(namesz);

    var descOffset = pos;
    var descBytes = [];
    if (descsz > 0 && pos + descsz <= view.byteLength) {
      for (var i = 0; i < descsz && i < 256; i++) {
        descBytes.push(view.getUint8(pos + i));
      }
    }
    pos += align4(descsz);

    notes.push({
      offset: noteStart,
      namesz: namesz,
      descsz: descsz,
      type: ntype,
      name: name,
      descOffset: descOffset,
      descBytes: descBytes,
      totalSize: pos - noteStart,
    });
  }
  return notes;
}

function align4(n) {
  return (n + 3) & ~3;
}

// ============================================================
// Meaning resolver
// ============================================================

function getMeaning(sectionKey, fieldName, value, field) {
  // ELF Header fields
  if (fieldName === "e_ident[EI_CLASS]") return ELF_CLASS[value] || "Unknown";
  if (fieldName === "e_ident[EI_DATA]") return ELF_DATA[value] || "Unknown";
  if (fieldName === "e_ident[EI_VERSION]") return value === 1 ? "EV_CURRENT" : "Unknown";
  if (fieldName === "e_ident[EI_OSABI]") return ELF_OSABI[value] || "Unknown (" + value + ")";
  if (fieldName === "e_type") return ELF_TYPE[value] || ("Unknown (" + hex(value) + ")");
  if (fieldName === "e_machine") return ELF_MACHINE[value] || ("Unknown (" + hex(value) + ")");
  if (fieldName === "e_version") return value === 1 ? "EV_CURRENT" : hex(value);

  // Program header fields
  if (fieldName === "p_type") return PT_TYPE[value] || ("Unknown (" + hex(value, 8) + ")");
  if (fieldName === "p_flags") return formatPfFlags(value) + " (" + decodeFlags(value, PF_FLAGS) + ")";

  // Section header fields
  if (fieldName === "sh_type") return SHT_TYPE[value] || ("Unknown (" + hex(value, 8) + ")");
  if (fieldName === "sh_flags") {
    var v = field && field.valueLo !== undefined ? field.valueLo : value;
    return decodeFlags(v, SHF_FLAGS);
  }
  if (fieldName === "sh_name" && sectionKey && sectionKey.indexOf("section_") === 0) {
    // Try to resolve section name string
    if (parsedELF) {
      var sec = parsedELF.sections[parseInt(sectionKey.split("_")[1])];
      if (sec) return '"' + sec.nameStr + '"';
    }
  }

  // Symbol table fields
  if (fieldName === "st_info") {
    var bind = (value >> 4) & 0xf;
    var type = value & 0xf;
    return (STB_BINDING[bind] || "STB_" + bind) + " | " + (STT_TYPE[type] || "STT_" + type);
  }
  if (fieldName === "st_other") {
    var vis = value & 0x3;
    return STV_VISIBILITY[vis] || "STV_" + vis;
  }
  if (fieldName === "st_shndx") {
    return SHN_SPECIAL[value] || ("Section " + value);
  }

  // Dynamic section fields
  if (fieldName === "d_tag") {
    var v = field && field.valueLo !== undefined ? field.valueLo : value;
    return DT_TAG[v] || ("Unknown (" + hex(v, 8) + ")");
  }

  return "";
}

// ============================================================
// Editing support
// ============================================================

var EDITABLE_SECTIONS = ["elfHeader"];

var FIELD_EDIT_TYPE = {
  "elfHeader": {
    "e_type": { type: "dropdown", options: ELF_TYPE },
    "e_machine": { type: "dropdown", options: ELF_MACHINE },
    "e_ident[EI_CLASS]": { type: "dropdown", options: ELF_CLASS },
    "e_ident[EI_DATA]": { type: "dropdown", options: ELF_DATA },
    "e_ident[EI_OSABI]": { type: "dropdown", options: ELF_OSABI },
  },
};

function writeFieldValue(field, newValue) {
  if (!elfView || !elfData) return;
  var view = new DataView(elfData);
  if (field.size === 1) view.setUint8(field.offset, newValue & 0xFF);
  else if (field.size === 2) view.setUint16(field.offset, newValue & 0xFFFF, isLittleEndian);
  else if (field.size === 4) view.setUint32(field.offset, newValue >>> 0, isLittleEndian);
}

function writeField64(field, hexStr) {
  if (!elfView || !elfData) return;
  var view = new DataView(elfData);
  var val = hexStr.replace(/^0x/i, "").toUpperCase();
  while (val.length < 16) val = "0" + val;
  var hi = parseInt(val.substring(0, 8), 16) >>> 0;
  var lo = parseInt(val.substring(8, 16), 16) >>> 0;
  if (isLittleEndian) {
    view.setUint32(field.offset, lo, true);
    view.setUint32(field.offset + 4, hi, true);
  } else {
    view.setUint32(field.offset, hi, false);
    view.setUint32(field.offset + 4, lo, false);
  }
}

function onFieldModified(sectionKey) {
  isModified = true;
  elfView = new DataView(elfData);

  // Re-parse to update all structures
  try {
    parsedELF = parseELF(elfData);
  } catch (e) { /* keep old parse if re-parse fails */ }

  updateFileInfoBar();
  renderHexRows();

  // Show download button
  var dlBtn = document.getElementById("downloadBtn");
  if (dlBtn) dlBtn.style.display = "inline-block";

  // Re-render the current detail view if it matches
  if (currentSection === sectionKey) {
    if (sectionKey === "elfHeader") {
      showFields("ELF Header", "elfHeader", parsedELF.elfHeader.fields);
    }
  }
}

function downloadModifiedELF() {
  if (!elfData) return;
  var blob = new Blob([elfData], { type: "application/octet-stream" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  var baseName = loadedFileName || "output.elf";
  var dotIdx = baseName.lastIndexOf(".");
  if (dotIdx > 0) {
    a.download = baseName.substring(0, dotIdx) + "_modified" + baseName.substring(dotIdx);
  } else {
    a.download = baseName + "_modified";
  }
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
}

function updateFileInfoBar() {
  if (!parsedELF || !elfData) return;
  var eh = parsedELF.elfHeader.fields;
  var classStr = parsedELF.is64 ? "ELF64" : "ELF32";
  var typeStr = ELF_TYPE[parsedELF.e_type] || hex(parsedELF.e_type);
  var machineStr = ELF_MACHINE[parsedELF.e_machine] || hex(parsedELF.e_machine);
  var endian = isLittleEndian ? "LE" : "BE";
  var info = classStr + " | " + typeStr + " | " + machineStr + " | " + endian + " | " + elfData.byteLength + " bytes";
  if (isModified) info += " (modified)";
  document.getElementById("fileInfo").textContent = info;
}

// ============================================================
// UI: Tree view
// ============================================================

function buildTree(elf) {
  var treeEl = document.getElementById("elfTree");
  treeEl.innerHTML = "";

  // ELF Header
  var headerNode = createTreeNode("ELF Header", function () {
    showFields("ELF Header", "elfHeader", elf.elfHeader.fields);
  });
  treeEl.appendChild(headerNode);

  // Program Headers
  if (elf.programHeaders.length > 0) {
    var phChildren = [];
    phChildren.push(createTreeNode("Overview", function () {
      showProgramHeadersOverview(elf);
    }));
    for (var i = 0; i < elf.programHeaders.length; i++) {
      (function (idx) {
        var ph = elf.programHeaders[idx];
        var typeName = PT_TYPE[ph.typeVal] || hex(ph.typeVal, 8);
        phChildren.push(createTreeNode("[" + idx + "] " + typeName, function () {
          showFields("Program Header [" + idx + "]", "phdr_" + idx, ph.fields);
        }));
      })(i);
    }
    treeEl.appendChild(createTreeNode("Program Headers (" + elf.programHeaders.length + ")", null, phChildren));
  }

  // Section Headers
  if (elf.sections.length > 0) {
    var shChildren = [];
    shChildren.push(createTreeNode("Overview", function () {
      showSectionHeadersOverview(elf);
    }));
    for (var i = 0; i < elf.sections.length; i++) {
      (function (idx) {
        var sec = elf.sections[idx];
        var name = sec.nameStr || ("[" + idx + "]");
        shChildren.push(createTreeNode("[" + idx + "] " + name, function () {
          showFields("Section Header [" + idx + "] " + name, "section_" + idx, sec.fields);
        }));
      })(i);
    }
    treeEl.appendChild(createTreeNode("Section Headers (" + elf.sections.length + ")", null, shChildren));
  }

  // Separator
  var sep = document.createElement("li");
  sep.innerHTML = '<hr style="border: none; border-top: 1px solid #ced4da; margin: 6px 4px;">';
  treeEl.appendChild(sep);

  // Symbol Tables
  for (var t = 0; t < elf.symbolTables.length; t++) {
    (function (tIdx) {
      var st = elf.symbolTables[tIdx];
      var secName = st.section.nameStr || ("symtab_" + tIdx);
      var symChildren = [];
      symChildren.push(createTreeNode("Overview", function () {
        showSymbolTableOverview(st);
      }));
      var limit = Math.min(st.symbols.length, 500);
      for (var si = 0; si < limit; si++) {
        (function (sIdx) {
          var sym = st.symbols[sIdx];
          var label = sym.nameStr || ("[" + sIdx + "]");
          if (label.length > 40) label = label.substring(0, 37) + "...";
          symChildren.push(createTreeNode("[" + sIdx + "] " + label, function () {
            showFields("Symbol [" + sIdx + "] " + sym.nameStr, "sym_" + tIdx + "_" + sIdx, sym.fields);
          }));
        })(si);
      }
      if (st.symbols.length > 500) {
        symChildren.push(createTreeNode("... (" + (st.symbols.length - 500) + " more)", function () {
          showSymbolTableOverview(st);
        }));
      }
      treeEl.appendChild(createTreeNode(secName + " (" + st.symbols.length + ")", null, symChildren));
    })(t);
  }

  // Dynamic Section
  if (elf.dynamicSection) {
    var dynChildren = [];
    dynChildren.push(createTreeNode("Overview", function () {
      showDynamicOverview(elf.dynamicSection);
    }));
    var dynEntries = elf.dynamicSection.entries;
    for (var i = 0; i < dynEntries.length; i++) {
      (function (idx) {
        var entry = dynEntries[idx];
        var tagName = DT_TAG[entry.tag] || hex(entry.tag, 8);
        dynChildren.push(createTreeNode("[" + idx + "] " + tagName, function () {
          showFields("Dynamic Entry [" + idx + "]", "dyn_" + idx, entry.fields);
        }));
      })(i);
    }
    treeEl.appendChild(createTreeNode(".dynamic (" + dynEntries.length + ")", null, dynChildren));
  }

  // Relocation Tables
  for (var r = 0; r < elf.relocationTables.length; r++) {
    (function (rIdx) {
      var rtab = elf.relocationTables[rIdx];
      var secName = rtab.section.nameStr || ("reltab_" + rIdx);
      var relChildren = [];
      relChildren.push(createTreeNode("Overview", function () {
        showRelocationOverview(rtab);
      }));
      var limit = Math.min(rtab.entries.length, 200);
      for (var i = 0; i < limit; i++) {
        (function (idx) {
          var entry = rtab.entries[idx];
          var typeName = getRelocTypeName(parsedELF.e_machine, entry.r_type);
          relChildren.push(createTreeNode("[" + idx + "] " + typeName, function () {
            showFields("Relocation [" + idx + "]", "rel_" + rIdx + "_" + idx, entry.fields);
          }));
        })(i);
      }
      if (rtab.entries.length > 200) {
        relChildren.push(createTreeNode("... (" + (rtab.entries.length - 200) + " more)", function () {
          showRelocationOverview(rtab);
        }));
      }
      treeEl.appendChild(createTreeNode(secName + " (" + rtab.entries.length + ")", null, relChildren));
    })(r);
  }

  // Note Sections
  for (var n = 0; n < elf.noteSections.length; n++) {
    (function (nIdx) {
      var nsec = elf.noteSections[nIdx];
      var secName = nsec.section.nameStr || ("note_" + nIdx);
      var noteChildren = [];
      for (var i = 0; i < nsec.notes.length; i++) {
        (function (idx) {
          var note = nsec.notes[idx];
          noteChildren.push(createTreeNode("[" + idx + "] " + note.name, function () {
            showNote(note, secName);
          }));
        })(i);
      }
      treeEl.appendChild(createTreeNode(secName + " (" + nsec.notes.length + ")", null, noteChildren));
    })(n);
  }

  // String Tables
  for (var s = 0; s < elf.stringTables.length; s++) {
    (function (sIdx) {
      var stab = elf.stringTables[sIdx];
      var secName = stab.nameStr || ("strtab_" + sIdx);
      treeEl.appendChild(createTreeNode(secName, function () {
        showStringTable(stab);
      }));
    })(s);
  }
}

function createTreeNode(label, onClick, children) {
  var li = document.createElement("li");
  var labelEl = document.createElement("div");
  labelEl.className = "elf-tree-label";

  var arrow = document.createElement("span");
  arrow.className = "elf-tree-arrow" + (children && children.length > 0 ? "" : " leaf");
  arrow.textContent = "\u25B6";
  labelEl.appendChild(arrow);

  var text = document.createElement("span");
  text.textContent = label;
  labelEl.appendChild(text);

  li.appendChild(labelEl);

  if (children && children.length > 0) {
    var childUl = document.createElement("ul");
    childUl.className = "elf-tree-children";
    for (var i = 0; i < children.length; i++) {
      childUl.appendChild(children[i]);
    }
    li.appendChild(childUl);

    // Toggle expand/collapse on arrow click
    arrow.addEventListener("click", function (e) {
      e.stopPropagation();
      var isOpen = childUl.classList.contains("open");
      childUl.classList.toggle("open");
      arrow.classList.toggle("expanded");
    });

    // If there's also an onClick (for parent nodes), handle label click
    labelEl.addEventListener("click", function (e) {
      if (e.target === arrow) return;
      // Toggle children
      childUl.classList.toggle("open");
      arrow.classList.toggle("expanded");
      // Also fire onClick if provided
      if (onClick) {
        selectTreeLabel(labelEl);
        onClick();
      }
    });
  } else if (onClick) {
    labelEl.addEventListener("click", function () {
      selectTreeLabel(labelEl);
      onClick();
    });
  }

  return li;
}

function selectTreeLabel(labelEl) {
  if (selectedLabel) selectedLabel.classList.remove("selected");
  labelEl.classList.add("selected");
  selectedLabel = labelEl;
}

// ============================================================
// UI: Detail panel rendering
// ============================================================

function showFields(title, sectionKey, fields) {
  currentSection = sectionKey;
  var panel = document.getElementById("detailPanel");
  var isEditable = EDITABLE_SECTIONS.indexOf(sectionKey) !== -1;
  var editConfig = FIELD_EDIT_TYPE[sectionKey] || {};

  var html = '<div class="elf-detail-header">' + escapeHtml(title) + '</div>';
  html += '<table class="elf-detail-table"><thead><tr>';
  html += '<th class="col-member">Member</th>';
  html += '<th class="col-offset">Offset</th>';
  html += '<th class="col-size">Size</th>';
  html += '<th class="col-value">Value</th>';
  html += '<th class="col-meaning">Meaning</th>';
  html += '</tr></thead><tbody>';

  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    var valStr;
    var is64bit = f.valueLo !== undefined;

    if (f.isString) {
      valStr = escapeHtml(f.value);
    } else if (is64bit) {
      valStr = hex64(f.valueLo, f.valueHi);
    } else {
      valStr = hex(f.value, f.size * 2);
    }

    var meaning = getMeaning(sectionKey, f.name, is64bit ? f.valueLo : f.value, f);

    html += '<tr data-hex-offset="' + f.offset + '" data-hex-size="' + f.size + '">';
    html += '<td>' + escapeHtml(f.name) + '</td>';
    html += '<td>' + hex(f.offset, 8) + '</td>';
    html += '<td>' + f.size + '</td>';

    if (isEditable && !f.isString && editConfig[f.name]) {
      var ec = editConfig[f.name];
      if (ec.type === "dropdown") {
        html += '<td>' + renderDropdown(sectionKey, f, ec.options) + '</td>';
        html += '<td>' + escapeHtml(meaning) + '</td>';
      } else {
        html += '<td>' + valStr + '</td>';
        html += '<td>' + escapeHtml(meaning) + '</td>';
      }
    } else if (isEditable && !f.isString && f.size <= 8) {
      html += '<td>' + renderHexInput(sectionKey, f) + '</td>';
      html += '<td>' + escapeHtml(meaning) + '</td>';
    } else {
      html += '<td>' + valStr + '</td>';
      html += '<td>' + escapeHtml(meaning) + '</td>';
    }

    html += '</tr>';
  }

  html += '</tbody></table>';
  panel.innerHTML = html;
  attachEditHandlers(panel, sectionKey);
}

function renderHexInput(sectionKey, field) {
  var is64bit = field.valueLo !== undefined;
  var valStr = is64bit ? hex64(field.valueLo, field.valueHi) : hex(field.value, field.size * 2);
  return '<input class="elf-edit-input" type="text" ' +
    'data-field-name="' + escapeHtml(field.name) + '" ' +
    'data-field-offset="' + field.offset + '" ' +
    'data-field-size="' + field.size + '" ' +
    'data-is-64="' + (is64bit ? "1" : "0") + '" ' +
    'value="' + valStr + '">';
}

function renderDropdown(sectionKey, field, options) {
  var currentVal = field.valueLo !== undefined ? field.valueLo : field.value;
  var html = '<select class="elf-edit-select" ' +
    'data-field-name="' + escapeHtml(field.name) + '" ' +
    'data-field-offset="' + field.offset + '" ' +
    'data-field-size="' + field.size + '">';
  for (var key in options) {
    var sel = (parseInt(key) === currentVal) ? ' selected' : '';
    html += '<option value="' + key + '"' + sel + '>' + hex(parseInt(key), field.size * 2) + ' - ' + escapeHtml(options[key]) + '</option>';
  }
  html += '</select>';
  return html;
}

function attachEditHandlers(panel, sectionKey) {
  // Hex input handlers
  var inputs = panel.querySelectorAll(".elf-edit-input");
  for (var i = 0; i < inputs.length; i++) {
    (function (inp) {
      inp.addEventListener("change", function () {
        var val = inp.value.trim().replace(/^0x/i, "");
        var parsed = parseInt(val, 16);
        if (isNaN(parsed)) {
          inp.classList.add("invalid");
          return;
        }
        inp.classList.remove("invalid");

        var fieldOffset = parseInt(inp.getAttribute("data-field-offset"));
        var fieldSize = parseInt(inp.getAttribute("data-field-size"));
        var is64 = inp.getAttribute("data-is-64") === "1";

        var field = { offset: fieldOffset, size: fieldSize };
        if (is64) {
          writeField64(field, val);
        } else {
          writeFieldValue(field, parsed);
        }
        onFieldModified(sectionKey);
      });
    })(inputs[i]);
  }

  // Dropdown handlers
  var selects = panel.querySelectorAll(".elf-edit-select");
  for (var i = 0; i < selects.length; i++) {
    (function (sel) {
      sel.addEventListener("change", function () {
        var newVal = parseInt(sel.value);
        var fieldOffset = parseInt(sel.getAttribute("data-field-offset"));
        var fieldSize = parseInt(sel.getAttribute("data-field-size"));
        var field = { offset: fieldOffset, size: fieldSize };
        writeFieldValue(field, newVal);
        onFieldModified(sectionKey);
      });
    })(selects[i]);
  }
}

// ============================================================
// Specialized detail views
// ============================================================

function showProgramHeadersOverview(elf) {
  currentSection = "phdrOverview";
  var panel = document.getElementById("detailPanel");
  var html = '<div class="elf-detail-header">Program Headers Overview (' + elf.programHeaders.length + ' entries)</div>';

  if (elf.interpreter) {
    html += '<div style="padding: 6px 12px; background: #f0f8ff; font-family: Consolas, monospace; font-size: 0.82rem;">';
    html += 'Interpreter: <strong>' + escapeHtml(elf.interpreter) + '</strong></div>';
  }

  html += '<table class="elf-detail-table"><thead><tr>';
  html += '<th style="width:5%">#</th>';
  html += '<th style="width:18%">Type</th>';
  html += '<th style="width:12%">Offset</th>';
  html += '<th style="width:15%">VirtAddr</th>';
  html += '<th style="width:12%">FileSize</th>';
  html += '<th style="width:12%">MemSize</th>';
  html += '<th style="width:8%">Flags</th>';
  html += '<th style="width:12%">Align</th>';
  html += '</tr></thead><tbody>';

  for (var i = 0; i < elf.programHeaders.length; i++) {
    var ph = elf.programHeaders[i];
    var f = ph.fields;
    var ptype = PT_TYPE[ph.typeVal] || hex(ph.typeVal, 8);

    var flagsField = findField(f, "p_flags");
    var flagsVal = flagsField ? (flagsField.value !== undefined ? flagsField.value : flagsField.valueLo) : 0;

    html += '<tr>';
    html += '<td>' + i + '</td>';
    html += '<td>' + escapeHtml(ptype) + '</td>';
    html += '<td>' + fieldHex(findField(f, "p_offset")) + '</td>';
    html += '<td>' + fieldHex(findField(f, "p_vaddr")) + '</td>';
    html += '<td>' + fieldHex(findField(f, "p_filesz")) + '</td>';
    html += '<td>' + fieldHex(findField(f, "p_memsz")) + '</td>';
    html += '<td>' + formatPfFlags(flagsVal) + '</td>';
    html += '<td>' + fieldHex(findField(f, "p_align")) + '</td>';
    html += '</tr>';
  }

  html += '</tbody></table>';
  panel.innerHTML = html;
}

function showSectionHeadersOverview(elf) {
  currentSection = "shdrOverview";
  var panel = document.getElementById("detailPanel");
  var html = '<div class="elf-detail-header">Section Headers Overview (' + elf.sections.length + ' entries)</div>';
  html += '<table class="elf-detail-table"><thead><tr>';
  html += '<th style="width:5%">#</th>';
  html += '<th style="width:16%">Name</th>';
  html += '<th style="width:14%">Type</th>';
  html += '<th style="width:12%">Addr</th>';
  html += '<th style="width:10%">Offset</th>';
  html += '<th style="width:10%">Size</th>';
  html += '<th style="width:25%">Flags</th>';
  html += '</tr></thead><tbody>';

  for (var i = 0; i < elf.sections.length; i++) {
    var sec = elf.sections[i];
    var typeName = SHT_TYPE[sec.typeVal] || hex(sec.typeVal, 8);
    var flags = decodeFlags(sec.sh_flags, SHF_FLAGS);

    html += '<tr>';
    html += '<td>' + i + '</td>';
    html += '<td>' + escapeHtml(sec.nameStr) + '</td>';
    html += '<td>' + escapeHtml(typeName) + '</td>';
    html += '<td>' + hex(sec.sh_addr, 8) + '</td>';
    html += '<td>' + hex(sec.sh_offset, 8) + '</td>';
    html += '<td>' + hex(sec.sh_size, 8) + '</td>';
    html += '<td style="font-size: 0.75rem">' + escapeHtml(flags) + '</td>';
    html += '</tr>';
  }

  html += '</tbody></table>';
  panel.innerHTML = html;
}

function showSymbolTableOverview(st) {
  currentSection = "symOverview";
  var panel = document.getElementById("detailPanel");
  var secName = st.section.nameStr || "Symbol Table";
  var html = '<div class="elf-detail-header">' + escapeHtml(secName) + ' (' + st.symbols.length + ' symbols)</div>';
  html += '<table class="elf-detail-table"><thead><tr>';
  html += '<th style="width:5%">#</th>';
  html += '<th style="width:15%">Value</th>';
  html += '<th style="width:10%">Size</th>';
  html += '<th style="width:10%">Bind</th>';
  html += '<th style="width:10%">Type</th>';
  html += '<th style="width:8%">Vis</th>';
  html += '<th style="width:6%">Ndx</th>';
  html += '<th style="width:36%">Name</th>';
  html += '</tr></thead><tbody>';

  var limit = Math.min(st.symbols.length, 1000);
  for (var i = 0; i < limit; i++) {
    var sym = st.symbols[i];
    var valField = findField(sym.fields, "st_value");
    var sizeField = findField(sym.fields, "st_size");
    var bindStr = STB_BINDING[sym.binding] || ("STB_" + sym.binding);
    var typeStr = STT_TYPE[sym.type] || ("STT_" + sym.type);
    var visStr = STV_VISIBILITY[sym.visibility] || ("STV_" + sym.visibility);
    var ndxStr = SHN_SPECIAL[sym.shndx] || ("" + sym.shndx);

    html += '<tr>';
    html += '<td>' + i + '</td>';
    html += '<td>' + fieldHex(valField) + '</td>';
    html += '<td>' + fieldHex(sizeField) + '</td>';
    html += '<td>' + escapeHtml(bindStr) + '</td>';
    html += '<td>' + escapeHtml(typeStr) + '</td>';
    html += '<td>' + escapeHtml(visStr) + '</td>';
    html += '<td>' + escapeHtml(ndxStr) + '</td>';
    html += '<td>' + escapeHtml(sym.nameStr) + '</td>';
    html += '</tr>';
  }

  if (st.symbols.length > 1000) {
    html += '<tr><td colspan="8" style="text-align:center; color:#888;">... ' + (st.symbols.length - 1000) + ' more symbols (use tree to browse individually)</td></tr>';
  }

  html += '</tbody></table>';
  panel.innerHTML = html;
}

function showDynamicOverview(dyn) {
  currentSection = "dynOverview";
  var panel = document.getElementById("detailPanel");
  var html = '<div class="elf-detail-header">.dynamic (' + dyn.entries.length + ' entries)</div>';
  html += '<table class="elf-detail-table"><thead><tr>';
  html += '<th style="width:5%">#</th>';
  html += '<th style="width:22%">Tag</th>';
  html += '<th style="width:18%">Value / Ptr</th>';
  html += '<th style="width:55%">Meaning</th>';
  html += '</tr></thead><tbody>';

  for (var i = 0; i < dyn.entries.length; i++) {
    var entry = dyn.entries[i];
    var tagName = DT_TAG[entry.tag] || hex(entry.tag, 8);
    var valStr = hex64(entry.val.lo, entry.val.hi);
    var meaning = "";

    if (entry.strValue) {
      meaning = '"' + entry.strValue + '"';
    } else if (entry.tag === 30) { // DT_FLAGS
      meaning = decodeFlags(entry.val.lo, DT_FLAGS);
    } else if (entry.tag === 0x6ffffffb) { // DT_FLAGS_1
      meaning = decodeFlags(entry.val.lo, DT_FLAGS_1);
    } else if (entry.tag === 20) { // DT_PLTREL
      meaning = entry.val.lo === 7 ? "DT_RELA" : (entry.val.lo === 17 ? "DT_REL" : hex(entry.val.lo));
    }

    html += '<tr data-hex-offset="' + entry.fields[0].offset + '" data-hex-size="' + (entry.fields[0].size + entry.fields[1].size) + '">';
    html += '<td>' + i + '</td>';
    html += '<td>' + escapeHtml(tagName) + '</td>';
    html += '<td>' + valStr + '</td>';
    html += '<td>' + escapeHtml(meaning) + '</td>';
    html += '</tr>';
  }

  html += '</tbody></table>';
  panel.innerHTML = html;
}

function showRelocationOverview(rtab) {
  currentSection = "relOverview";
  var panel = document.getElementById("detailPanel");
  var secName = rtab.section.nameStr || "Relocations";
  var html = '<div class="elf-detail-header">' + escapeHtml(secName) + ' (' + rtab.entries.length + ' entries)</div>';
  html += '<table class="elf-detail-table"><thead><tr>';
  html += '<th style="width:5%">#</th>';
  html += '<th style="width:18%">Offset</th>';
  html += '<th style="width:8%">Sym</th>';
  html += '<th style="width:25%">Type</th>';
  if (rtab.isRela) html += '<th style="width:15%">Addend</th>';
  html += '<th>' + (rtab.isRela ? 'Info' : 'Info') + '</th>';
  html += '</tr></thead><tbody>';

  var limit = Math.min(rtab.entries.length, 500);
  for (var i = 0; i < limit; i++) {
    var entry = rtab.entries[i];
    var typeName = getRelocTypeName(parsedELF.e_machine, entry.r_type);

    // Try to resolve symbol name
    var symName = "";
    if (rtab.symtabSec) {
      for (var t = 0; t < parsedELF.symbolTables.length; t++) {
        if (parsedELF.symbolTables[t].section.index === rtab.symtabSec.index) {
          var symtab = parsedELF.symbolTables[t];
          if (entry.r_sym < symtab.symbols.length) {
            symName = symtab.symbols[entry.r_sym].nameStr;
          }
          break;
        }
      }
    }

    html += '<tr data-hex-offset="' + entry.fields[0].offset + '" data-hex-size="' + (rtab.isRela ? 24 : 16) + '">';
    html += '<td>' + i + '</td>';
    html += '<td>' + hex64(entry.r_offset.lo, entry.r_offset.hi) + '</td>';
    html += '<td>' + entry.r_sym + '</td>';
    html += '<td>' + escapeHtml(typeName) + '</td>';
    if (rtab.isRela) {
      html += '<td>' + hex64(entry.r_addend.lo, entry.r_addend.hi) + '</td>';
    }
    html += '<td>' + escapeHtml(symName) + '</td>';
    html += '</tr>';
  }

  if (rtab.entries.length > 500) {
    var colspan = rtab.isRela ? 6 : 5;
    html += '<tr><td colspan="' + colspan + '" style="text-align:center; color:#888;">... ' + (rtab.entries.length - 500) + ' more entries</td></tr>';
  }

  html += '</tbody></table>';
  panel.innerHTML = html;
}

function showNote(note, secName) {
  currentSection = "note";
  var panel = document.getElementById("detailPanel");
  var html = '<div class="elf-detail-header">Note: ' + escapeHtml(note.name) + ' (in ' + escapeHtml(secName) + ')</div>';

  html += '<table class="elf-detail-table"><thead><tr>';
  html += '<th class="col-member">Field</th>';
  html += '<th class="col-offset">Offset</th>';
  html += '<th class="col-size">Size</th>';
  html += '<th class="col-value">Value</th>';
  html += '<th class="col-meaning">Meaning</th>';
  html += '</tr></thead><tbody>';

  html += '<tr data-hex-offset="' + note.offset + '" data-hex-size="4">';
  html += '<td>n_namesz</td><td>' + hex(note.offset, 8) + '</td><td>4</td><td>' + hex(note.namesz) + '</td><td></td></tr>';

  html += '<tr data-hex-offset="' + (note.offset + 4) + '" data-hex-size="4">';
  html += '<td>n_descsz</td><td>' + hex(note.offset + 4, 8) + '</td><td>4</td><td>' + hex(note.descsz) + '</td><td></td></tr>';

  var typeMeaning = "";
  if (note.name === "GNU") {
    typeMeaning = NT_GNU_TYPE[note.type] || ("GNU type " + note.type);
  } else if (note.name === "CORE") {
    typeMeaning = NT_CORE_TYPE[note.type] || ("Core type " + note.type);
  } else {
    typeMeaning = "Type " + note.type;
  }
  html += '<tr data-hex-offset="' + (note.offset + 8) + '" data-hex-size="4">';
  html += '<td>n_type</td><td>' + hex(note.offset + 8, 8) + '</td><td>4</td><td>' + hex(note.type) + '</td><td>' + escapeHtml(typeMeaning) + '</td></tr>';

  html += '<tr data-hex-offset="' + (note.offset + 12) + '" data-hex-size="' + note.namesz + '">';
  html += '<td>name</td><td>' + hex(note.offset + 12, 8) + '</td><td>' + note.namesz + '</td><td>' + escapeHtml(note.name) + '</td><td></td></tr>';

  // Description
  var descHex = "";
  for (var i = 0; i < note.descBytes.length; i++) {
    descHex += (note.descBytes[i] < 16 ? "0" : "") + note.descBytes[i].toString(16).toUpperCase();
    if (i < note.descBytes.length - 1) descHex += " ";
  }
  var descMeaning = "";
  if (note.name === "GNU" && note.type === 3) { // NT_GNU_BUILD_ID
    descMeaning = "Build ID: " + descHex.replace(/ /g, "").toLowerCase();
  } else if (note.name === "GNU" && note.type === 1 && note.descBytes.length >= 16) { // NT_GNU_ABI_TAG
    var os = readU32(elfView, note.descOffset);
    var major = readU32(elfView, note.descOffset + 4);
    var minor = readU32(elfView, note.descOffset + 8);
    var patch = readU32(elfView, note.descOffset + 12);
    var osName = os === 0 ? "Linux" : os === 1 ? "Hurd" : os === 2 ? "Solaris" : "OS " + os;
    descMeaning = osName + " " + major + "." + minor + "." + patch;
  }

  html += '<tr data-hex-offset="' + note.descOffset + '" data-hex-size="' + note.descsz + '">';
  html += '<td>desc</td><td>' + hex(note.descOffset, 8) + '</td><td>' + note.descsz + '</td>';
  html += '<td style="word-break: break-all; font-size: 0.75rem">' + escapeHtml(descHex) + '</td>';
  html += '<td>' + escapeHtml(descMeaning) + '</td></tr>';

  html += '</tbody></table>';
  panel.innerHTML = html;
}

function showStringTable(stab) {
  currentSection = "strtab";
  var panel = document.getElementById("detailPanel");
  var html = '<div class="elf-detail-header">String Table: ' + escapeHtml(stab.nameStr) + ' (' + stab.sh_size + ' bytes)</div>';
  html += '<table class="elf-detail-table"><thead><tr>';
  html += '<th style="width:12%">Offset</th>';
  html += '<th style="width:12%">Index</th>';
  html += '<th>String</th>';
  html += '</tr></thead><tbody>';

  var pos = 0;
  var count = 0;
  var maxEntries = 2000;
  while (pos < stab.sh_size && count < maxEntries) {
    var str = readAscii(elfView, stab.sh_offset + pos, stab.sh_size - pos);
    if (str.length > 0) {
      html += '<tr data-hex-offset="' + (stab.sh_offset + pos) + '" data-hex-size="' + (str.length + 1) + '">';
      html += '<td>' + hex(stab.sh_offset + pos, 8) + '</td>';
      html += '<td>' + pos + '</td>';
      html += '<td>' + escapeHtml(str) + '</td>';
      html += '</tr>';
      pos += str.length + 1;
    } else {
      pos++;
    }
    count++;
  }

  if (pos < stab.sh_size) {
    html += '<tr><td colspan="3" style="text-align:center; color:#888;">... truncated (table too large)</td></tr>';
  }

  html += '</tbody></table>';
  panel.innerHTML = html;
}

// Helper: find a field by name in a fields array
function findField(fields, name) {
  for (var i = 0; i < fields.length; i++) {
    if (fields[i].name === name) return fields[i];
  }
  return null;
}

// Helper: format field value as hex
function fieldHex(f) {
  if (!f) return "N/A";
  if (f.valueLo !== undefined) return hex64(f.valueLo, f.valueHi);
  return hex(f.value, f.size * 2);
}

function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  var div = document.createElement("div");
  div.textContent = String(str);
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

function loadELFFile(file) {
  var reader = new FileReader();
  reader.onload = function (e) {
    elfData = e.target.result;
    elfView = new DataView(elfData);
    selectedLabel = null;
    isModified = false;
    loadedFileName = file.name;

    // Hide download button
    var dlBtn = document.getElementById("downloadBtn");
    if (dlBtn) dlBtn.style.display = "none";

    try {
      parsedELF = parseELF(elfData);
    } catch (err) {
      document.getElementById("detailPanel").innerHTML =
        '<div class="elf-welcome"><h2>Error</h2><p style="color: #c53030;">' + escapeHtml(err.message) + '</p></div>';
      document.getElementById("elfTree").innerHTML = "";
      document.getElementById("fileInfo").textContent = "";
      document.getElementById("hexPanel").innerHTML = '<div class="elf-hex-placeholder">Load an ELF file to see its hex dump.</div>';
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

    // Build tree and show ELF header by default
    buildTree(parsedELF);
    showFields("ELF Header", "elfHeader", parsedELF.elfHeader.fields);
    initHexPanel();

    // Select the ELF Header node in the tree
    var labels = document.querySelectorAll(".elf-tree-label");
    for (var i = 0; i < labels.length; i++) {
      if (labels[i].textContent.trim() === "ELF Header") {
        labels[i].classList.add("selected");
        selectedLabel = labels[i];
        break;
      }
    }
  };
  reader.readAsArrayBuffer(file);
}

// Drop zone for ELF file (click + drag & drop)
(function setupFileDropZone() {
  var dropZone = document.getElementById("fileDropZone");
  var fileInput = document.getElementById("fileInput");

  dropZone.addEventListener("click", function () {
    fileInput.click();
  });

  fileInput.addEventListener("change", function () {
    if (fileInput.files.length > 0) {
      loadELFFile(fileInput.files[0]);
    }
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
      loadELFFile(files[0]);
    }
  });
})();

// Download button
document.getElementById("downloadBtn").addEventListener("click", downloadModifiedELF);

// ============================================================
// Hex View: virtual scrolling hex dump with click-to-highlight
// ============================================================

var hexRowHeight = 18;
var hexBytesPerRow = 16;
var hexHighlightOffset = -1;
var hexHighlightSize = 0;
var hexScrollEl = null;
var hexRowsEl = null;
var hexSpacerEl = null;
var hexHeaderEl = null;
var hexRafPending = false;
var hexSelecting = false;
var hexSelAnchor = -1;

function initHexPanel() {
  var panel = document.getElementById("hexPanel");
  panel.innerHTML = "";

  // Header bar with Goto/Find toolbar
  var header = document.createElement("div");
  header.className = "elf-hex-header";

  var titleSpan = document.createElement("span");
  titleSpan.className = "elf-hex-header-title";
  titleSpan.textContent = "Hex View \u2014 " + elfData.byteLength + " bytes (" + hex(elfData.byteLength, 8) + ")";
  header.appendChild(titleSpan);

  var toolbar = document.createElement("span");
  toolbar.className = "elf-hex-toolbar";

  // Goto
  var gotoLabel = document.createElement("label");
  gotoLabel.textContent = "Goto:";
  toolbar.appendChild(gotoLabel);

  var gotoInput = document.createElement("input");
  gotoInput.type = "text";
  gotoInput.placeholder = "0x offset";
  gotoInput.title = "Enter hex offset (e.g. 0x1A0 or 1A0)";
  toolbar.appendChild(gotoInput);

  var sep1 = document.createElement("span");
  sep1.className = "elf-hex-sep";
  toolbar.appendChild(sep1);

  // Find
  var findLabel = document.createElement("label");
  findLabel.textContent = "Find:";
  toolbar.appendChild(findLabel);

  var findInput = document.createElement("input");
  findInput.type = "text";
  findInput.placeholder = "hex or text";
  findInput.title = "Hex bytes (e.g. 7F454C46) or text (e.g. .text)";
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
      if (isNaN(offset) || offset < 0 || offset >= elfData.byteLength) return;
      highlightHexBytes(offset, 1);
    }
  });

  // Find handler
  function doFind() {
    var query = findInput.value.trim();
    if (!query || !elfData) return;

    var searchBytes = null;

    var hexOnly = query.replace(/\s+/g, "").replace(/^0x/i, "");
    if (/^[0-9a-fA-F]+$/.test(hexOnly) && hexOnly.length % 2 === 0 && hexOnly.length >= 2) {
      searchBytes = [];
      for (var i = 0; i < hexOnly.length; i += 2) {
        searchBytes.push(parseInt(hexOnly.substring(i, i + 2), 16));
      }
    }

    if (!searchBytes) {
      searchBytes = [];
      for (var i = 0; i < query.length; i++) {
        searchBytes.push(query.charCodeAt(i) & 0xFF);
      }
    }

    if (searchBytes.length === 0) return;

    var view = new Uint8Array(elfData);
    var startPos = hexFindLastPos;
    var found = -1;

    for (var pos = startPos; pos <= view.length - searchBytes.length; pos++) {
      var match = true;
      for (var j = 0; j < searchBytes.length; j++) {
        if (view[pos + j] !== searchBytes[j]) { match = false; break; }
      }
      if (match) { found = pos; break; }
    }

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
  scroll.className = "elf-hex-scroll";
  panel.appendChild(scroll);
  hexScrollEl = scroll;

  // Spacer for virtual scroll height
  var totalRows = Math.ceil(elfData.byteLength / hexBytesPerRow);
  var spacer = document.createElement("div");
  spacer.className = "elf-hex-spacer";
  spacer.style.height = (totalRows * hexRowHeight) + "px";
  scroll.appendChild(spacer);
  hexSpacerEl = spacer;

  // Rows container
  var rows = document.createElement("div");
  rows.className = "elf-hex-rows";
  scroll.appendChild(rows);
  hexRowsEl = rows;

  hexHighlightOffset = -1;
  hexHighlightSize = 0;

  scroll.addEventListener("scroll", function () {
    if (!hexRafPending) {
      hexRafPending = true;
      requestAnimationFrame(function () {
        hexRafPending = false;
        renderHexRows();
      });
    }
  });

  // Manual byte selection via click-and-drag
  scroll.addEventListener("mousedown", function (e) {
    var span = e.target.closest(".elf-hb");
    if (!span) return;
    var byteOff = parseInt(span.getAttribute("data-byte"), 10);
    if (isNaN(byteOff)) return;
    hexSelecting = true;
    hexSelAnchor = byteOff;
    hexHighlightOffset = byteOff;
    hexHighlightSize = 1;
    renderHexRows();
    e.preventDefault();
  });

  scroll.addEventListener("mousemove", function (e) {
    if (!hexSelecting) return;
    var span = e.target.closest(".elf-hb");
    if (!span) return;
    var byteOff = parseInt(span.getAttribute("data-byte"), 10);
    if (isNaN(byteOff)) return;
    var lo = Math.min(hexSelAnchor, byteOff);
    var hi = Math.max(hexSelAnchor, byteOff);
    hexHighlightOffset = lo;
    hexHighlightSize = hi - lo + 1;
    renderHexRows();
  });

  document.addEventListener("mouseup", function () {
    if (hexSelecting) hexSelecting = false;
  });

  renderHexRows();
}

function renderHexRows() {
  if (!hexScrollEl || !hexRowsEl || !elfData) return;

  var scrollTop = hexScrollEl.scrollTop;
  var viewHeight = hexScrollEl.clientHeight;
  var totalRows = Math.ceil(elfData.byteLength / hexBytesPerRow);

  var firstVisible = Math.floor(scrollTop / hexRowHeight);
  var visibleCount = Math.ceil(viewHeight / hexRowHeight) + 1;

  var buffer = 5;
  var startRow = Math.max(0, firstVisible - buffer);
  var endRow = Math.min(totalRows, firstVisible + visibleCount + buffer);

  hexRowsEl.style.top = (startRow * hexRowHeight) + "px";

  var view = new Uint8Array(elfData);
  var html = "";
  for (var r = startRow; r < endRow; r++) {
    html += formatHexRow(view, r);
  }
  hexRowsEl.innerHTML = html;
}

function formatHexRow(view, rowIndex) {
  var fileOffset = rowIndex * hexBytesPerRow;
  var end = Math.min(fileOffset + hexBytesPerRow, view.length);

  var offsetStr = '<span class="elf-hex-offset">' + hex(fileOffset, 8) + '</span>  ';

  var hexParts = [];
  var asciiParts = [];

  for (var i = 0; i < hexBytesPerRow; i++) {
    var byteOffset = fileOffset + i;
    if (byteOffset < end) {
      var b = view[byteOffset];
      var hexByte = (b < 16 ? "0" : "") + b.toString(16).toUpperCase();
      var asciiChar = (b >= 32 && b <= 126) ? escapeHtmlChar(b) : ".";

      var inHighlight = hexHighlightOffset >= 0 &&
        byteOffset >= hexHighlightOffset &&
        byteOffset < hexHighlightOffset + hexHighlightSize;

      var hlClass = inHighlight ? " elf-hex-highlight" : "";
      hexParts.push('<span class="elf-hb' + hlClass + '" data-byte="' + byteOffset + '">' + hexByte + '</span>');
      asciiParts.push('<span class="elf-ab' + hlClass + '" data-byte="' + byteOffset + '">' + asciiChar + '</span>');
    } else {
      hexParts.push("  ");
      asciiParts.push(" ");
    }
    if (i === 7) {
      hexParts.push(" ");
    }
  }

  return '<div class="elf-hex-row">' + offsetStr +
    hexParts.join(" ") + "  " +
    '<span class="elf-hex-ascii">' + asciiParts.join("") + '</span></div>';
}

function escapeHtmlChar(charCode) {
  if (charCode === 38) return "&amp;";
  if (charCode === 60) return "&lt;";
  if (charCode === 62) return "&gt;";
  if (charCode === 34) return "&quot;";
  return String.fromCharCode(charCode);
}

function highlightHexBytes(offset, size) {
  hexHighlightOffset = offset;
  hexHighlightSize = size;

  if (!hexScrollEl || !elfData) return;

  var targetRow = Math.floor(offset / hexBytesPerRow);
  var viewHeight = hexScrollEl.clientHeight;
  var targetScrollTop = (targetRow * hexRowHeight) - (viewHeight / 2) + hexRowHeight;
  targetScrollTop = Math.max(0, targetScrollTop);
  hexScrollEl.scrollTop = targetScrollTop;

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
    var delta = startY - e.clientY;
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

    var prev = detailPanel.querySelector(".elf-field-selected");
    if (prev) prev.classList.remove("elf-field-selected");

    row.classList.add("elf-field-selected");
    highlightHexBytes(offset, size);
  });
})();
