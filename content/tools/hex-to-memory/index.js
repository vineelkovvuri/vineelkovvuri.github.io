const TB = BigInt(1) << BigInt(40);
const GB = BigInt(1) << BigInt(30);
const MB = BigInt(1) << BigInt(20);
const KB = BigInt(1) << BigInt(10);
const MASK64 = (BigInt(1) << BigInt(64)) - BigInt(1);

let sectionCounter = 0;

// --- Parsing helpers ---

function parseTerm(term) {
  if (!term) return BigInt(0);
  term = term.trim().replaceAll("_", "").replaceAll(" ", "");
  if (!term) return BigInt(0);

  const suffixMatch = term.match(/^(\d+)(TB|GB|MB|KB|T|G|M|K|B)$/i);
  if (suffixMatch) {
    const num = BigInt(parseInt(suffixMatch[1]));
    const suffix = suffixMatch[2].toUpperCase();
    if (suffix === "TB" || suffix === "T") return num * TB;
    if (suffix === "GB" || suffix === "G") return num * GB;
    if (suffix === "MB" || suffix === "M") return num * MB;
    if (suffix === "KB" || suffix === "K") return num * KB;
    if (suffix === "B") return num;
  }

  if (term.startsWith("0x") || term.startsWith("0X")) {
    term = term.substring(2);
    if (!term) return BigInt(0);
    try {
      return BigInt("0x" + term);
    } catch {
      return BigInt(0);
    }
  }
  // Trailing 'h' / 'H' → hex (e.g. FFh, 1234h, 0FFh)
  if (/^[0-9a-fA-F]+[hH]$/.test(term)) {
    try {
      return BigInt("0x" + term.slice(0, -1));
    } catch {
      return BigInt(0);
    }
  }
  if (!term) return BigInt(0);
  // Contains hex letters (a-f) → treat as hex; otherwise decimal
  if (/[a-fA-F]/.test(term)) {
    try {
      return BigInt("0x" + term);
    } catch {
      return BigInt(0);
    }
  }
  try {
    return BigInt(term);
  } catch {
    return BigInt(0);
  }
}

function ipow(base, exp) {
  let pow = BigInt(1);
  while (exp > BigInt(0)) {
    pow *= base;
    exp -= BigInt(1);
  }
  return pow;
}

// Split an expression into tokens: operators, parentheses and value runs.
// Whitespace and underscores are treated as insignificant separators, so
// grouped numbers like "0xFFFF FFFF" and "0x1000_0000" collapse into one value.
function tokenize(expr) {
  expr = expr.replaceAll(" ", "").replaceAll("_", "");
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if ("+-*^~()".indexOf(c) !== -1) {
      tokens.push(c);
      i++;
    } else if (/[0-9a-zA-Z]/.test(c)) {
      let val = "";
      while (i < expr.length && /[0-9a-zA-Z]/.test(expr[i])) {
        val += expr[i];
        i++;
      }
      tokens.push({ value: val });
    } else {
      i++; // skip anything unrecognized
    }
  }
  return tokens;
}

// Recursive-descent parser.
// Grammar (lowest to highest precedence):
//   expression := term (('+' | '-') term)*
//   term       := power ('*' power)*
//   power      := unary ('^' power)?          (right-associative)
//   unary      := ('~' | '-') unary | '(' expression ')' | value
function parseHexExpression(input) {
  if (!input) return BigInt(0);
  const tokens = tokenize(input);
  let pos = 0;

  function peek() { return tokens[pos]; }
  function next() { return tokens[pos++]; }

  function parseExpression() {
    let left = parseTermLevel();
    while (peek() === "+" || peek() === "-") {
      const op = next();
      const right = parseTermLevel();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseTermLevel() {
    let left = parsePower();
    while (peek() === "*") {
      next();
      left *= parsePower();
    }
    return left;
  }

  function parsePower() {
    const base = parseUnary();
    if (peek() === "^") {
      next();
      return ipow(base, parsePower());
    }
    return base;
  }

  function parseUnary() {
    if (peek() === "~") {
      next();
      return (~parseUnary()) & MASK64;
    }
    if (peek() === "-") {
      next();
      return -parseUnary();
    }
    if (peek() === "(") {
      next();
      const val = parseExpression();
      if (peek() === ")") next();
      return val;
    }
    const tok = next();
    if (tok && typeof tok === "object") return parseTerm(tok.value);
    return BigInt(0);
  }

  return parseExpression();
}


function breakdownSize(val) {
  const parts = [];
  const t = val / TB; val = val % TB;
  const g = val / GB; val = val % GB;
  const m = val / MB; val = val % MB;
  const k = val / KB; val = val % KB;
  if (t > BigInt(0)) parts.push(t + " TB");
  if (g > BigInt(0)) parts.push(g + " GB");
  if (m > BigInt(0)) parts.push(m + " MB");
  if (k > BigInt(0)) parts.push(k + " KB");
  if (val > BigInt(0)) parts.push(val + " Bytes");
  return parts.length > 0 ? parts.join(" + ") : "0 Bytes";
}

function formatCleanSize(val) {
  const units = [
    [TB, "TB"], [GB, "GB"], [MB, "MB"], [KB, "KB"]
  ];
  for (const [unit, label] of units) {
    if (val >= unit && val % unit === BigInt(0)) {
      return (val / unit) + " " + label;
    }
  }
  return val + " Bytes";
}

function nextPowerOf2(n) {
  if (n <= BigInt(0)) return BigInt(1);
  let p = BigInt(1);
  while (p < n) {
    p <<= BigInt(1);
  }
  return p;
}

function signedInterpretation(val) {
  const widths = [8, 16, 32, 64];
  for (const bits of widths) {
    const max = BigInt(1) << BigInt(bits);
    const signBit = BigInt(1) << BigInt(bits - 1);
    if (val > BigInt(0) && val < max && val >= signBit) {
      const signed = val - max;
      const abs = -signed;
      return "-0x" + abs.toString(16).toUpperCase() + " (" + withThousands(signed) + ") as " + bits + "-bit";
    }
  }
  return "";
}

function withThousands(val) {
  return val.toString(10).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function renderRows(rows) {
  return rows.map(function ([label, value]) {
    return '<span class="hm-row"><span class="hm-label">' + label +
      '</span><span class="hm-value">' + value + '</span></span>';
  }).join("");
}

// --- Hex-to-Size section creation ---

function createHexSection() {
  const id = sectionCounter++;
  const section = document.createElement("div");
  section.className = "hm-section";
  section.dataset.id = id;

  const canClose = document.querySelectorAll(".hm-section").length > 0;

  section.innerHTML = `
    ${canClose ? '<button class="hm-close" title="Remove this section">&times;</button>' : ''}
    <table style="margin: 0 !important;">
      <tr>
        <td style="text-align: right; padding-right: 10px;">
          <label>Hex:</label>
        </td>
        <td>
          <input type="text" class="hexInput" value="0x0" placeholder="e.g. 0xFEC00000 + 64K + 2MB" />
        </td>
      </tr>
      <tr>
        <td style="text-align: right; padding-right: 10px; vertical-align: top;">
          <label>Result:</label>
        </td>
        <td>
          <pre class="hexToSizeResult hm-result">0 Bytes</pre>
        </td>
      </tr>
    </table>
  `;

  const hexInput = section.querySelector(".hexInput");
  const hexResult = section.querySelector(".hexToSizeResult");
  hexInput.addEventListener("input", function () {
    const originalValue = parseHexExpression(hexInput.value);
    if (originalValue === BigInt(0)) {
      hexResult.innerHTML = renderRows([["Value", "0 Bytes"]]);
      return;
    }

    const rows = [];
    rows.push(["Hex", "0x" + originalValue.toString(16).toUpperCase()]);
    rows.push(["Decimal", withThousands(originalValue)]);

    const signed = signedInterpretation(originalValue);
    if (signed) rows.push(["Signed", signed]);

    rows.push(["Size", breakdownSize(originalValue)]);

    const next = nextPowerOf2(originalValue);
    const diff = next - originalValue;
    if (diff > BigInt(0)) {
      rows.push([
        "To 2ⁿ",
        breakdownSize(diff) + " below " + formatCleanSize(next) +
        " (0x" + diff.toString(16).toUpperCase() + " below 0x" + next.toString(16).toUpperCase() + ")"
      ]);
    }

    hexResult.innerHTML = renderRows(rows);
  });

  const closeBtn = section.querySelector(".hm-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      section.remove();
    });
  }

  document.getElementById("sections-container").appendChild(section);
}

// Create the first hex section on page load
createHexSection();

// Add hex section button
document.getElementById("hm-add-btn").addEventListener("click", createHexSection);
