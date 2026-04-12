const TB = BigInt(1) << BigInt(40);
const GB = BigInt(1) << BigInt(30);
const MB = BigInt(1) << BigInt(20);
const KB = BigInt(1) << BigInt(10);

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

function parseMultiplicative(expr) {
  const factors = expr.split("*");
  let product = BigInt(1);
  for (const f of factors) {
    product *= parseTerm(f);
  }
  return product;
}

function parseHexExpression(expr) {
  if (!expr) return BigInt(0);
  const tokens = expr.match(/[+-]?[^+-]+/g);
  if (!tokens) return BigInt(0);
  let total = BigInt(0);
  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i].trim();
    if (!token) continue;
    if (token.startsWith("-")) {
      total -= parseMultiplicative(token.substring(1));
    } else if (token.startsWith("+")) {
      total += parseMultiplicative(token.substring(1));
    } else {
      total += parseMultiplicative(token);
    }
  }
  return total;
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
      return " | signed" + bits + ": -0x" + abs.toString(16).toUpperCase() + " (" + signed.toString(10) + ")";
    }
  }
  return "";
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
      hexResult.innerText = "0 Bytes";
      return;
    }
    let result = "= 0x" + originalValue.toString(16).toUpperCase() + " (" + originalValue.toString(10) + ")" + signedInterpretation(originalValue) + "\n";
    result += breakdownSize(originalValue);
    const next = nextPowerOf2(originalValue);
    const diff = next - originalValue;
    if (diff > BigInt(0)) {
      result += "\n" + breakdownSize(diff) + " below " + formatCleanSize(next);
      result += " (0x" + diff.toString(16).toUpperCase() + " below 0x" + next.toString(16).toUpperCase() + ")";
    }
    hexResult.innerText = result;
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
