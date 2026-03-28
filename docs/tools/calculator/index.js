(function () {
    var instanceId = 0;

    // Button layout: [label, type, action]
    var BUTTONS = [
        ['Mod', 'op', 'mod'],   ['A', 'hex', 'A'],     ['MC', 'fn', 'mc'],  ['MR', 'fn', 'mr'],  ['MS', 'fn', 'ms'],  ['M+', 'fn', 'mplus'], ['M\u2212', 'fn', 'mminus'],
        ['(', 'fn', 'lparen'],  [')', 'fn', 'rparen'],  ['B', 'hex', 'B'],   ['\u2190', 'fn', 'back'],  ['CE', 'fn', 'ce'],  ['C', 'fn', 'c'],     ['\xB1', 'fn', 'negate'],
        ['RoL', 'op', 'rol'],   ['RoR', 'op', 'ror'],   ['C', 'hex', 'C'],   ['7', 'num', '7'],   ['8', 'num', '8'],   ['9', 'num', '9'],    ['/', 'op', 'div'],
        ['Or', 'op', 'or'],     ['Xor', 'op', 'xor'],   ['D', 'hex', 'D'],   ['4', 'num', '4'],   ['5', 'num', '5'],   ['6', 'num', '6'],    ['*', 'op', 'mul'],
        ['Lsh', 'op', 'lsh'],   ['Rsh', 'op', 'rsh'],   ['E', 'hex', 'E'],   ['1', 'num', '1'],   ['2', 'num', '2'],   ['3', 'num', '3'],    ['-', 'op', 'sub'],
        ['Not', 'fn', 'not'],   ['And', 'op', 'and'],    ['F', 'hex', 'F'],   ['0', 'num', '0'],   ['.', 'fn', 'dot'],  ['=', 'fn eq', 'eq'], ['+', 'op', 'add'],
    ];

    var OP_SYMBOLS = {
        add: '+', sub: '\u2212', mul: '\u00D7', div: '\u00F7',
        mod: 'Mod', and: 'And', or: 'Or', xor: 'Xor',
        lsh: 'Lsh', rsh: 'Rsh', rol: 'RoL', ror: 'RoR'
    };

    function sizeMask(bits) {
        return (BigInt(1) << BigInt(bits)) - BigInt(1);
    }

    function createCalc(container, closable) {
        var id = instanceId++;
        var radixName = 'calcRadix_' + id;

        // Build DOM
        var root = document.createElement('div');
        root.className = 'calc';

        // Title bar
        var titlebar = document.createElement('div');
        titlebar.className = 'calc-titlebar';
        titlebar.innerHTML =
            '<div class="calc-titlebar-icon">\uD83D\uDD23</div>' +
            '<span>Calculator</span>';
        var btnsWrap = document.createElement('div');
        btnsWrap.className = 'calc-titlebar-btns';
        if (closable) {
            var closeBtn = document.createElement('div');
            closeBtn.className = 'calc-titlebar-btn close';
            closeBtn.title = 'Close calculator';
            closeBtn.textContent = '\u2715';
            closeBtn.addEventListener('click', function () {
                root.remove();
            });
            btnsWrap.appendChild(closeBtn);
        }
        titlebar.appendChild(btnsWrap);
        root.appendChild(titlebar);

        // Body
        var body = document.createElement('div');
        body.className = 'calc-body';

        // Display
        var displayWrap = document.createElement('div');
        displayWrap.className = 'calc-display-wrap';
        var exprEl = document.createElement('div');
        exprEl.className = 'calc-display-expr';
        var display = document.createElement('div');
        display.className = 'calc-display';
        display.textContent = '0';
        displayWrap.appendChild(exprEl);
        displayWrap.appendChild(display);
        body.appendChild(displayWrap);

        // Multi-base readout
        var readout = document.createElement('div');
        readout.className = 'calc-radix-readout';
        var readoutEntries = {};
        [['HEX', 16], ['DEC', 10], ['OCT', 8], ['BIN', 2]].forEach(function (r) {
            var lbl = document.createElement('div');
            lbl.className = 'calc-radix-readout-label';
            lbl.textContent = r[0];
            var val = document.createElement('div');
            val.className = 'calc-radix-readout-val';
            val.textContent = '0';
            readout.appendChild(lbl);
            readout.appendChild(val);
            readoutEntries[r[1]] = val;
        });
        body.appendChild(readout);

        // Radix row
        var radixRow = document.createElement('div');
        radixRow.className = 'calc-radix-row';
        [['16', 'Hex'], ['10', 'Dec'], ['8', 'Oct'], ['2', 'Bin']].forEach(function (r) {
            var lbl = document.createElement('label');
            var inp = document.createElement('input');
            inp.type = 'radio';
            inp.name = radixName;
            inp.value = r[0];
            if (r[0] === '10') inp.checked = true;
            lbl.appendChild(inp);
            lbl.appendChild(document.createTextNode(' ' + r[1]));
            radixRow.appendChild(lbl);
        });
        body.appendChild(radixRow);

        // Bits display
        var bitsEl = document.createElement('div');
        bitsEl.className = 'calc-bits';
        body.appendChild(bitsEl);

        // Button grid
        var gridEl = document.createElement('div');
        gridEl.className = 'calc-grid';
        body.appendChild(gridEl);

        root.appendChild(body);
        container.appendChild(root);

        // --- Calculator state ---
        var radix = 10;
        var currentVal = BigInt(0);
        var pendingOp = null;
        var pendingVal = null;
        var freshEntry = true;
        var memory = BigInt(0);

        function clampVal(v) {
            return v & sizeMask(64);
        }

        function toSigned(v, bits) {
            var mask = sizeMask(bits);
            v = v & mask;
            var signBit = BigInt(1) << BigInt(bits - 1);
            if (v & signBit) {
                return v - (mask + BigInt(1));
            }
            return v;
        }

        function formatVal(v) {
            v = clampVal(v);
            if (radix === 10) {
                return toSigned(v, 64).toString(10);
            }
            return v.toString(radix).toUpperCase();
        }

        function updateDisplay() {
            display.textContent = formatVal(currentVal);
            updateReadout();
            updateBits();
            updateButtonStates();
        }

        function updateReadout() {
            var v = clampVal(currentVal);
            var signed = toSigned(v, 64);
            readoutEntries[16].textContent = v.toString(16).toUpperCase();
            readoutEntries[10].textContent = signed.toString(10);
            readoutEntries[8].textContent = v.toString(8);
            readoutEntries[2].textContent = v.toString(2);
            // Highlight the active radix
            [16, 10, 8, 2].forEach(function (r) {
                readoutEntries[r].classList.toggle('active', r === radix);
            });
        }

        function updateBits() {
            bitsEl.innerHTML = '';
            var v = clampVal(currentVal);
            for (var g = 7; g >= 0; g--) {
                var group = document.createElement('div');
                group.className = 'calc-bit-group';
                var labelEl = document.createElement('div');
                labelEl.className = 'calc-bit-label';
                labelEl.textContent = (g * 8 + 7) + '';
                group.appendChild(labelEl);

                var valEl = document.createElement('div');
                valEl.className = 'calc-bit-val';

                for (var b = 7; b >= 0; b--) {
                    var bitIdx = g * 8 + b;
                    var bitOn = (v >> BigInt(bitIdx)) & BigInt(1);

                    var span = document.createElement('span');
                    span.className = 'calc-bit';
                    span.textContent = bitOn ? '1' : '0';

                    if (bitIdx >= 64) {
                        span.style.color = '#ccc';
                        span.style.cursor = 'default';
                    } else {
                        (function (idx) {
                            span.addEventListener('click', function () {
                                currentVal = clampVal(currentVal ^ (BigInt(1) << BigInt(idx)));
                                freshEntry = true;
                                updateDisplay();
                            });
                        })(bitIdx);
                    }

                    valEl.appendChild(span);

                    if (b === 4) {
                        var spacer = document.createElement('span');
                        spacer.className = 'calc-bit-space';
                        valEl.appendChild(spacer);
                    }
                }

                if (g * 8 >= 64) {
                    labelEl.style.color = '#ccc';
                }

                group.appendChild(valEl);
                bitsEl.appendChild(group);
            }
        }

        function buildButtons() {
            gridEl.innerHTML = '';
            BUTTONS.forEach(function (def) {
                var label = def[0];
                var type = def[1];
                var action = def[2];
                var btn = document.createElement('button');
                btn.className = 'calc-btn';
                if (!label) {
                    btn.style.visibility = 'hidden';
                    gridEl.appendChild(btn);
                    return;
                }
                btn.textContent = label;
                btn.setAttribute('data-action', action);

                if (type === 'num') btn.classList.add('num');
                if (type === 'hex') btn.classList.add('num', 'hex-digit');
                if (type && type.indexOf('eq') !== -1) btn.classList.add('op-eq');
                if (action === 'c' || action === 'ce') btn.classList.add('op-red');

                btn.addEventListener('click', function () {
                    handleAction(action);
                });

                gridEl.appendChild(btn);
            });
        }

        function updateButtonStates() {
            var btns = gridEl.querySelectorAll('.calc-btn');
            btns.forEach(function (btn) {
                var action = btn.getAttribute('data-action');
                if (!action) return;

                if ('ABCDEF'.indexOf(action) !== -1) {
                    btn.classList.toggle('disabled', radix < 16);
                }
                if (action === '8' || action === '9') {
                    btn.classList.toggle('disabled', radix < 10);
                }
                if ('234567'.indexOf(action) !== -1 && action.length === 1) {
                    btn.classList.toggle('disabled', radix < 8);
                }
                if (action === 'dot') {
                    btn.classList.add('disabled');
                }
            });
        }

        function performOp(op, a, b) {
            a = clampVal(a);
            b = clampVal(b);
            switch (op) {
                case 'add': return a + b;
                case 'sub': return clampVal(a) - clampVal(b);
                case 'mul': return a * b;
                case 'div': return b !== BigInt(0) ? toSigned(a, 64) / toSigned(b, 64) : BigInt(0);
                case 'mod': return b !== BigInt(0) ? toSigned(a, 64) % toSigned(b, 64) : BigInt(0);
                case 'and': return a & b;
                case 'or':  return a | b;
                case 'xor': return a ^ b;
                case 'lsh': return a << b;
                case 'rsh': return a >> b;
                case 'rol': {
                    var shift = Number(b % BigInt(64));
                    return (a << BigInt(shift)) | (a >> BigInt(64 - shift));
                }
                case 'ror': {
                    var shift2 = Number(b % BigInt(64));
                    return (a >> BigInt(shift2)) | (a << BigInt(64 - shift2));
                }
                default: return b;
            }
        }

        function handleAction(action) {
            if (action.length === 1 && '0123456789ABCDEF'.indexOf(action) !== -1) {
                var digitVal = parseInt(action, 16);
                if (digitVal >= radix) return;

                if (freshEntry) {
                    currentVal = BigInt(digitVal);
                    freshEntry = false;
                } else {
                    currentVal = clampVal(currentVal * BigInt(radix) + BigInt(digitVal));
                }
                updateDisplay();
                return;
            }

            switch (action) {
                case 'c':
                    currentVal = BigInt(0);
                    pendingOp = null;
                    pendingVal = null;
                    freshEntry = true;
                    exprEl.textContent = '';
                    updateDisplay();
                    break;

                case 'ce':
                    currentVal = BigInt(0);
                    freshEntry = true;
                    updateDisplay();
                    break;

                case 'back':
                    if (!freshEntry) {
                        var s = formatVal(currentVal);
                        if (s.length <= 1 || (s.length === 2 && s[0] === '-')) {
                            currentVal = BigInt(0);
                        } else {
                            s = s.slice(0, -1);
                            currentVal = clampVal(BigInt(parseInt(s, radix)));
                        }
                        updateDisplay();
                    }
                    break;

                case 'negate':
                    currentVal = clampVal(-toSigned(clampVal(currentVal), 64));
                    updateDisplay();
                    break;

                case 'not':
                    currentVal = clampVal(~currentVal);
                    freshEntry = true;
                    updateDisplay();
                    break;

                case 'mc':
                    memory = BigInt(0);
                    break;

                case 'mr':
                    currentVal = clampVal(memory);
                    freshEntry = true;
                    updateDisplay();
                    break;

                case 'ms':
                    memory = clampVal(currentVal);
                    break;

                case 'mplus':
                    memory = clampVal(memory + currentVal);
                    break;

                case 'mminus':
                    memory = clampVal(memory - currentVal);
                    break;

                case 'eq':
                    if (pendingOp && pendingVal !== null) {
                        currentVal = clampVal(performOp(pendingOp, pendingVal, currentVal));
                        pendingOp = null;
                        pendingVal = null;
                        exprEl.textContent = '';
                        freshEntry = true;
                        updateDisplay();
                    }
                    break;

                case 'add':
                case 'sub':
                case 'mul':
                case 'div':
                case 'mod':
                case 'and':
                case 'or':
                case 'xor':
                case 'lsh':
                case 'rsh':
                case 'rol':
                case 'ror':
                    if (pendingOp && pendingVal !== null && !freshEntry) {
                        currentVal = clampVal(performOp(pendingOp, pendingVal, currentVal));
                        updateDisplay();
                    }
                    pendingVal = clampVal(currentVal);
                    pendingOp = action;
                    freshEntry = true;
                    exprEl.textContent = formatVal(pendingVal) + ' ' + (OP_SYMBOLS[action] || action);
                    break;

                default:
                    break;
            }
        }

        // Radix change
        root.querySelectorAll('input[name="' + radixName + '"]').forEach(function (el) {
            el.addEventListener('change', function () {
                radix = parseInt(el.value);
                freshEntry = true;
                if (pendingOp && pendingVal !== null) {
                    exprEl.textContent = formatVal(pendingVal) + ' ' + (OP_SYMBOLS[pendingOp] || pendingOp);
                }
                updateDisplay();
            });
        });

        // Keyboard support — only when this calculator has focus
        root.setAttribute('tabindex', '0');
        root.style.outline = 'none';
        root.addEventListener('keydown', function (e) {
            var key = e.key;

            if (e.ctrlKey && key === 'c') {
                navigator.clipboard.writeText(formatVal(currentVal));
                e.preventDefault();
                return;
            } else if (e.ctrlKey && key === 'v') {
                navigator.clipboard.readText().then(function (text) {
                    text = text.trim().replace(/[\s_,]/g, '');
                    if (!text) return;
                    var parsed;
                    try {
                        if (/^0x/i.test(text)) {
                            parsed = BigInt(text);
                        } else if (/^0b/i.test(text)) {
                            parsed = BigInt(text);
                        } else if (/^0o/i.test(text)) {
                            parsed = BigInt(text);
                        } else {
                            parsed = BigInt(parseInt(text, radix));
                        }
                    } catch (err) {
                        return;
                    }
                    currentVal = clampVal(parsed);
                    freshEntry = true;
                    updateDisplay();
                });
                e.preventDefault();
                return;
            } else if ('0123456789'.indexOf(key) !== -1) {
                handleAction(key);
                e.preventDefault();
            } else if (radix === 16 && 'abcdefABCDEF'.indexOf(key) !== -1) {
                handleAction(key.toUpperCase());
                e.preventDefault();
            } else if (key === '+') {
                handleAction('add');
                e.preventDefault();
            } else if (key === '-') {
                handleAction('sub');
                e.preventDefault();
            } else if (key === '*') {
                handleAction('mul');
                e.preventDefault();
            } else if (key === '/') {
                handleAction('div');
                e.preventDefault();
            } else if (key === '%') {
                handleAction('mod');
                e.preventDefault();
            } else if (key === 'Enter' || key === '=') {
                handleAction('eq');
                e.preventDefault();
            } else if (key === 'Backspace') {
                handleAction('back');
                e.preventDefault();
            } else if (key === 'Escape') {
                handleAction('c');
                e.preventDefault();
            } else if (key === 'Delete') {
                handleAction('ce');
                e.preventDefault();
            }
        });

        // Init
        buildButtons();
        updateDisplay();

        return root;
    }

    // --- Bootstrap ---
    var container = document.getElementById('calcContainer');

    // Initialize the primary calculator from the existing HTML
    // Remove the static HTML and replace with a dynamic instance
    var staticCalc = document.getElementById('calcApp');
    if (staticCalc) staticCalc.remove();

    createCalc(container, false);

    // "+" button is in the first calculator's titlebar
    // We need to wire it up after creation
    // Since we build DOM dynamically now, add the "+" to the first instance
    var firstCalc = container.querySelector('.calc');
    var addBtn = document.createElement('div');
    addBtn.className = 'calc-titlebar-btn';
    addBtn.title = 'New calculator';
    addBtn.textContent = '+';
    addBtn.addEventListener('click', function () {
        var newCalc = createCalc(container, true);
        newCalc.focus();
    });
    // Replace existing btns wrap content with just the + button
    var firstBtns = firstCalc.querySelector('.calc-titlebar-btns');
    firstBtns.innerHTML = '';
    firstBtns.appendChild(addBtn);
    firstCalc.focus();
})();
