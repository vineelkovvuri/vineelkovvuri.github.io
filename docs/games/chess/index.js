(function () {
    "use strict";

    var SIZE = 8;
    var WHITE = "w";
    var BLACK = "b";
    var PIECE_ASSET_BASE = "./image/";

    var FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

    var boardEl = document.getElementById("chBoard");
    var el = {
        status: document.getElementById("chStatus"),
        sub: document.getElementById("chSub"),
        newBtn: document.getElementById("chNew"),
        undoBtn: document.getElementById("chUndo"),
        moves: document.getElementById("chMoves"),
        promo: document.getElementById("chPromo"),
        promoText: document.getElementById("chPromoText")
    };

    var state;
    var selected;
    var selectedMoves;
    var pendingPromotion;
    var history;
    var moveLog;
    var cells;

    function inBounds(r, c) {
        return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
    }

    function other(color) {
        return color === WHITE ? BLACK : WHITE;
    }

    function pieceColor(piece) {
        return piece ? piece.charAt(0) : null;
    }

    function pieceType(piece) {
        return piece ? piece.charAt(1) : null;
    }

    function squareName(r, c) {
        return FILES[c] + String(8 - r);
    }

    function pieceImageMarkup(piece) {
        var src = PIECE_ASSET_BASE + piece + ".svg";
        return '<img class="piece piece-img" src="' + src + '" alt="" draggable="false" loading="eager" decoding="sync">';
    }

    function deepCloneState(src) {
        return {
            board: src.board.map(function (row) { return row.slice(); }),
            turn: src.turn,
            castling: {
                wK: src.castling.wK,
                wQ: src.castling.wQ,
                bK: src.castling.bK,
                bQ: src.castling.bQ
            },
            enPassant: src.enPassant ? {
                r: src.enPassant.r,
                c: src.enPassant.c,
                pawnR: src.enPassant.pawnR,
                pawnC: src.enPassant.pawnC,
                pawnColor: src.enPassant.pawnColor
            } : null,
            lastMove: src.lastMove ? {
                fromR: src.lastMove.fromR,
                fromC: src.lastMove.fromC,
                toR: src.lastMove.toR,
                toC: src.lastMove.toC
            } : null,
            gameOver: src.gameOver,
            winner: src.winner,
            reason: src.reason
        };
    }

    function initialBoard() {
        return [
            ["bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR"],
            ["bP", "bP", "bP", "bP", "bP", "bP", "bP", "bP"],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ["wP", "wP", "wP", "wP", "wP", "wP", "wP", "wP"],
            ["wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR"]
        ];
    }

    function resetGame() {
        state = {
            board: initialBoard(),
            turn: WHITE,
            castling: { wK: true, wQ: true, bK: true, bQ: true },
            enPassant: null,
            lastMove: null,
            gameOver: false,
            winner: null,
            reason: ""
        };
        selected = null;
        selectedMoves = [];
        pendingPromotion = null;
        history = [];
        moveLog = [];
        el.promo.classList.add("chx-hidden");
        renderAll();
    }

    function buildBoardDom() {
        cells = [];
        boardEl.innerHTML = "";
        for (var r = 0; r < SIZE; r++) {
            var row = [];
            for (var c = 0; c < SIZE; c++) {
                var btn = document.createElement("button");
                btn.type = "button";
                btn.className = "chx-cell " + (((r + c) % 2 === 0) ? "light" : "dark");
                btn.dataset.r = String(r);
                btn.dataset.c = String(c);
                btn.setAttribute("aria-label", "Square " + squareName(r, c));
                boardEl.appendChild(btn);
                row.push(btn);
            }
            cells.push(row);
        }
    }

    function findKing(board, color) {
        var target = color + "K";
        for (var r = 0; r < SIZE; r++) {
            for (var c = 0; c < SIZE; c++) {
                if (board[r][c] === target) {
                    return { r: r, c: c };
                }
            }
        }
        return null;
    }

    function isSquareAttacked(testState, row, col, byColor) {
        for (var r = 0; r < SIZE; r++) {
            for (var c = 0; c < SIZE; c++) {
                var piece = testState.board[r][c];
                if (!piece || pieceColor(piece) !== byColor) { continue; }
                var pseudo = getPseudoMoves(testState, r, c, true);
                for (var i = 0; i < pseudo.length; i++) {
                    if (pseudo[i].toR === row && pseudo[i].toC === col) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function inCheck(testState, color) {
        var king = findKing(testState.board, color);
        if (!king) { return false; }
        return isSquareAttacked(testState, king.r, king.c, other(color));
    }

    function slideMoves(testState, r, c, color, deltas) {
        var out = [];
        for (var i = 0; i < deltas.length; i++) {
            var dr = deltas[i][0];
            var dc = deltas[i][1];
            var nr = r + dr;
            var nc = c + dc;
            while (inBounds(nr, nc)) {
                var target = testState.board[nr][nc];
                if (!target) {
                    out.push({ fromR: r, fromC: c, toR: nr, toC: nc });
                } else {
                    if (pieceColor(target) !== color) {
                        out.push({ fromR: r, fromC: c, toR: nr, toC: nc, capture: true });
                    }
                    break;
                }
                nr += dr;
                nc += dc;
            }
        }
        return out;
    }

    function getPseudoMoves(testState, r, c, forAttack) {
        var board = testState.board;
        var piece = board[r][c];
        if (!piece) { return []; }

        var color = pieceColor(piece);
        var type = pieceType(piece);
        var out = [];

        if (type === "P") {
            var dir = color === WHITE ? -1 : 1;
            var startRow = color === WHITE ? 6 : 1;
            var promoRow = color === WHITE ? 0 : 7;

            if (!forAttack) {
                var oneR = r + dir;
                if (inBounds(oneR, c) && !board[oneR][c]) {
                    out.push({ fromR: r, fromC: c, toR: oneR, toC: c, promotion: oneR === promoRow });
                    var twoR = r + (2 * dir);
                    if (r === startRow && !board[twoR][c]) {
                        out.push({ fromR: r, fromC: c, toR: twoR, toC: c, doublePawn: true });
                    }
                }
            }

            for (var dc = -1; dc <= 1; dc += 2) {
                var nr = r + dir;
                var nc = c + dc;
                if (!inBounds(nr, nc)) { continue; }

                if (forAttack) {
                    out.push({ fromR: r, fromC: c, toR: nr, toC: nc, attackOnly: true });
                    continue;
                }

                var target = board[nr][nc];
                if (target && pieceColor(target) !== color) {
                    out.push({ fromR: r, fromC: c, toR: nr, toC: nc, capture: true, promotion: nr === promoRow });
                } else if (testState.enPassant && testState.enPassant.r === nr && testState.enPassant.c === nc && testState.enPassant.pawnColor !== color) {
                    out.push({
                        fromR: r,
                        fromC: c,
                        toR: nr,
                        toC: nc,
                        capture: true,
                        enPassant: true,
                        captureR: testState.enPassant.pawnR,
                        captureC: testState.enPassant.pawnC
                    });
                }
            }

            return out;
        }

        if (type === "N") {
            var jumps = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
            for (var j = 0; j < jumps.length; j++) {
                var nrN = r + jumps[j][0];
                var ncN = c + jumps[j][1];
                if (!inBounds(nrN, ncN)) { continue; }
                var tN = board[nrN][ncN];
                if (!tN || pieceColor(tN) !== color) {
                    out.push({ fromR: r, fromC: c, toR: nrN, toC: ncN, capture: !!tN });
                }
            }
            return out;
        }

        if (type === "B") {
            return slideMoves(testState, r, c, color, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
        }

        if (type === "R") {
            return slideMoves(testState, r, c, color, [[1, 0], [-1, 0], [0, 1], [0, -1]]);
        }

        if (type === "Q") {
            return slideMoves(testState, r, c, color, [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
        }

        if (type === "K") {
            for (var dr = -1; dr <= 1; dr++) {
                for (var dcK = -1; dcK <= 1; dcK++) {
                    if (dr === 0 && dcK === 0) { continue; }
                    var nrK = r + dr;
                    var ncK = c + dcK;
                    if (!inBounds(nrK, ncK)) { continue; }
                    var tK = board[nrK][ncK];
                    if (!tK || pieceColor(tK) !== color) {
                        out.push({ fromR: r, fromC: c, toR: nrK, toC: ncK, capture: !!tK });
                    }
                }
            }

            if (forAttack) {
                return out;
            }

            var enemy = other(color);
            var homeRow = color === WHITE ? 7 : 0;

            if (r === homeRow && c === 4 && !inCheck(testState, color)) {
                if ((color === WHITE ? testState.castling.wK : testState.castling.bK) &&
                    !board[homeRow][5] && !board[homeRow][6] &&
                    board[homeRow][7] === (color + "R") &&
                    !isSquareAttacked(testState, homeRow, 5, enemy) &&
                    !isSquareAttacked(testState, homeRow, 6, enemy)) {
                    out.push({ fromR: r, fromC: c, toR: homeRow, toC: 6, castle: "K" });
                }

                if ((color === WHITE ? testState.castling.wQ : testState.castling.bQ) &&
                    !board[homeRow][1] && !board[homeRow][2] && !board[homeRow][3] &&
                    board[homeRow][0] === (color + "R") &&
                    !isSquareAttacked(testState, homeRow, 3, enemy) &&
                    !isSquareAttacked(testState, homeRow, 2, enemy)) {
                    out.push({ fromR: r, fromC: c, toR: homeRow, toC: 2, castle: "Q" });
                }
            }
        }

        return out;
    }

    function applyMoveInPlace(targetState, move, promotionPiece) {
        var board = targetState.board;
        var piece = board[move.fromR][move.fromC];
        var color = pieceColor(piece);
        var type = pieceType(piece);
        var enemy = other(color);

        targetState.enPassant = null;

        if (move.castle) {
            var row = move.fromR;
            board[row][move.fromC] = null;
            board[row][move.toC] = color + "K";
            if (move.castle === "K") {
                board[row][7] = null;
                board[row][5] = color + "R";
            } else {
                board[row][0] = null;
                board[row][3] = color + "R";
            }
        } else {
            if (move.enPassant) {
                board[move.captureR][move.captureC] = null;
            }

            var targetPiece = board[move.toR][move.toC];
            board[move.fromR][move.fromC] = null;

            var placed = piece;
            if (type === "P" && (move.toR === 0 || move.toR === 7)) {
                placed = color + (promotionPiece || "Q");
                move.promotionChoice = placed.charAt(1);
            }
            board[move.toR][move.toC] = placed;

            if (targetPiece === enemy + "R") {
                if (move.toR === 7 && move.toC === 0) { targetState.castling.wQ = false; }
                if (move.toR === 7 && move.toC === 7) { targetState.castling.wK = false; }
                if (move.toR === 0 && move.toC === 0) { targetState.castling.bQ = false; }
                if (move.toR === 0 && move.toC === 7) { targetState.castling.bK = false; }
            }
        }

        if (type === "K") {
            if (color === WHITE) {
                targetState.castling.wK = false;
                targetState.castling.wQ = false;
            } else {
                targetState.castling.bK = false;
                targetState.castling.bQ = false;
            }
        }

        if (type === "R") {
            if (color === WHITE && move.fromR === 7 && move.fromC === 0) { targetState.castling.wQ = false; }
            if (color === WHITE && move.fromR === 7 && move.fromC === 7) { targetState.castling.wK = false; }
            if (color === BLACK && move.fromR === 0 && move.fromC === 0) { targetState.castling.bQ = false; }
            if (color === BLACK && move.fromR === 0 && move.fromC === 7) { targetState.castling.bK = false; }
        }

        if (type === "P" && move.doublePawn) {
            targetState.enPassant = {
                r: (move.fromR + move.toR) / 2,
                c: move.fromC,
                pawnR: move.toR,
                pawnC: move.toC,
                pawnColor: color
            };
        }

        targetState.lastMove = {
            fromR: move.fromR,
            fromC: move.fromC,
            toR: move.toR,
            toC: move.toC
        };
        targetState.turn = enemy;
    }

    function isMoveLegal(testState, move, color) {
        var clone = deepCloneState(testState);
        applyMoveInPlace(clone, {
            fromR: move.fromR,
            fromC: move.fromC,
            toR: move.toR,
            toC: move.toC,
            capture: move.capture,
            enPassant: move.enPassant,
            captureR: move.captureR,
            captureC: move.captureC,
            castle: move.castle,
            doublePawn: move.doublePawn,
            promotion: move.promotion
        }, "Q");
        return !inCheck(clone, color);
    }

    function getLegalMovesForSquare(testState, r, c) {
        var piece = testState.board[r][c];
        if (!piece) { return []; }
        var color = pieceColor(piece);
        var pseudo = getPseudoMoves(testState, r, c, false);
        var legal = [];
        for (var i = 0; i < pseudo.length; i++) {
            if (isMoveLegal(testState, pseudo[i], color)) {
                legal.push(pseudo[i]);
            }
        }
        return legal;
    }

    function allLegalMoves(testState, color) {
        var out = [];
        for (var r = 0; r < SIZE; r++) {
            for (var c = 0; c < SIZE; c++) {
                var piece = testState.board[r][c];
                if (!piece || pieceColor(piece) !== color) { continue; }
                var moves = getLegalMovesForSquare(testState, r, c);
                for (var i = 0; i < moves.length; i++) {
                    out.push(moves[i]);
                }
            }
        }
        return out;
    }

    function moveText(beforeState, move, afterState) {
        if (move.castle === "K") {
            return "O-O" + statusSuffix(afterState);
        }
        if (move.castle === "Q") {
            return "O-O-O" + statusSuffix(afterState);
        }

        var piece = beforeState.board[move.fromR][move.fromC];
        var type = pieceType(piece);
        var toSq = squareName(move.toR, move.toC);
        var isCapture = !!move.capture;

        if (type === "P") {
            var prefix = isCapture ? (FILES[move.fromC] + "x") : "";
            var promotion = move.promotionChoice ? ("=" + move.promotionChoice) : "";
            return prefix + toSq + promotion + statusSuffix(afterState);
        }

        var letter = type;
        return letter + (isCapture ? "x" : "") + toSq + statusSuffix(afterState);
    }

    function statusSuffix(afterState) {
        var side = afterState.turn;
        var legal = allLegalMoves(afterState, side);
        var check = inCheck(afterState, side);
        if (check && legal.length === 0) { return "#"; }
        if (check) { return "+"; }
        return "";
    }

    function updateOutcomeFlags() {
        var side = state.turn;
        var legal = allLegalMoves(state, side);
        var check = inCheck(state, side);

        state.gameOver = false;
        state.winner = null;
        state.reason = "";

        if (legal.length === 0) {
            state.gameOver = true;
            if (check) {
                state.winner = other(side);
                state.reason = "checkmate";
            } else {
                state.reason = "stalemate";
            }
        }
    }

    function selectSquare(r, c) {
        if (state.gameOver || pendingPromotion) { return; }

        var piece = state.board[r][c];
        if (!piece || pieceColor(piece) !== state.turn) {
            selected = null;
            selectedMoves = [];
            renderBoard();
            renderStatus();
            return;
        }

        selected = { r: r, c: c };
        selectedMoves = getLegalMovesForSquare(state, r, c);
        renderBoard();
        renderStatus();
    }

    function findSelectedMove(toR, toC) {
        for (var i = 0; i < selectedMoves.length; i++) {
            var m = selectedMoves[i];
            if (m.toR === toR && m.toC === toC) {
                return m;
            }
        }
        return null;
    }

    function commitMove(move, promotionPiece) {
        var before = deepCloneState(state);
        var beforeLog = moveLog.slice();

        history.push({ state: before, moveLog: beforeLog });

        applyMoveInPlace(state, {
            fromR: move.fromR,
            fromC: move.fromC,
            toR: move.toR,
            toC: move.toC,
            capture: move.capture,
            enPassant: move.enPassant,
            captureR: move.captureR,
            captureC: move.captureC,
            castle: move.castle,
            doublePawn: move.doublePawn,
            promotion: move.promotion,
            promotionChoice: move.promotionChoice
        }, promotionPiece);

        updateOutcomeFlags();

        var lastText = moveText(before, move, state);
        moveLog.push(lastText);

        selected = null;
        selectedMoves = [];
        pendingPromotion = null;
        el.promo.classList.add("chx-hidden");

        renderAll();
    }

    function beginPromotion(move) {
        pendingPromotion = {
            move: {
                fromR: move.fromR,
                fromC: move.fromC,
                toR: move.toR,
                toC: move.toC,
                capture: move.capture,
                enPassant: move.enPassant,
                captureR: move.captureR,
                captureC: move.captureC,
                castle: move.castle,
                doublePawn: move.doublePawn,
                promotion: true
            }
        };

        var colorName = state.turn === WHITE ? "White" : "Black";
        el.promoText.textContent = colorName + " pawn reaches last rank.";
        el.promo.classList.remove("chx-hidden");
    }

    function tryMove(targetR, targetC) {
        if (!selected || pendingPromotion || state.gameOver) { return; }

        var move = findSelectedMove(targetR, targetC);
        if (!move) {
            selectSquare(targetR, targetC);
            return;
        }

        if (move.promotion) {
            beginPromotion(move);
            renderBoard();
            return;
        }

        commitMove(move, "Q");
    }

    function handleBoardClick(e) {
        var cell = e.target.closest(".chx-cell");
        if (!cell) { return; }

        var r = parseInt(cell.dataset.r, 10);
        var c = parseInt(cell.dataset.c, 10);

        if (!selected) {
            selectSquare(r, c);
            return;
        }

        if (selected.r === r && selected.c === c) {
            selected = null;
            selectedMoves = [];
            renderBoard();
            renderStatus();
            return;
        }

        tryMove(r, c);
    }

    function renderBoard() {
        var currentInCheck = inCheck(state, state.turn);
        var kingPos = currentInCheck ? findKing(state.board, state.turn) : null;

        for (var r = 0; r < SIZE; r++) {
            for (var c = 0; c < SIZE; c++) {
                var cell = cells[r][c];
                var piece = state.board[r][c];

                cell.classList.remove("selected", "legal", "capture", "in-check", "last");

                if (state.lastMove &&
                    ((state.lastMove.fromR === r && state.lastMove.fromC === c) ||
                     (state.lastMove.toR === r && state.lastMove.toC === c))) {
                    cell.classList.add("last");
                }

                if (kingPos && kingPos.r === r && kingPos.c === c) {
                    cell.classList.add("in-check");
                }

                var html = "";
                if (piece) {
                    html = pieceImageMarkup(piece);
                }
                cell.innerHTML = html;
            }
        }

        if (selected) {
            cells[selected.r][selected.c].classList.add("selected");
            for (var i = 0; i < selectedMoves.length; i++) {
                var m = selectedMoves[i];
                var targetCell = cells[m.toR][m.toC];
                targetCell.classList.add("legal");
                if (m.capture) {
                    targetCell.classList.add("capture");
                }
            }
        }
    }

    function renderStatus() {
        if (state.gameOver) {
            if (state.reason === "checkmate") {
                var winnerName = state.winner === WHITE ? "White" : "Black";
                el.status.textContent = "Checkmate - " + winnerName + " wins";
                el.sub.textContent = "No legal moves remain for " + (state.turn === WHITE ? "White" : "Black") + ".";
            } else {
                el.status.textContent = "Stalemate";
                el.sub.textContent = "Draw by no legal moves and no check.";
            }
            return;
        }

        var turnName = state.turn === WHITE ? "White" : "Black";
        var check = inCheck(state, state.turn);
        el.status.textContent = turnName + " to move" + (check ? " - Check" : "");

        if (pendingPromotion) {
            el.sub.textContent = "Choose a promotion piece to continue.";
        } else if (selected) {
            var piece = state.board[selected.r][selected.c];
            var pType = pieceType(piece);
            var map = { K: "King", Q: "Queen", R: "Rook", B: "Bishop", N: "Knight", P: "Pawn" };
            el.sub.textContent = map[pType] + " selected from " + squareName(selected.r, selected.c) + ".";
        } else {
            el.sub.textContent = "Select a piece to move.";
        }
    }

    function renderMoves() {
        el.moves.innerHTML = "";
        for (var i = 0; i < moveLog.length; i += 2) {
            var li = document.createElement("li");
            var whiteMove = moveLog[i] || "";
            var blackMove = moveLog[i + 1] || "";
            li.textContent = whiteMove + (blackMove ? ("  " + blackMove) : "");
            el.moves.appendChild(li);
        }
        el.moves.scrollTop = el.moves.scrollHeight;
    }

    function renderAll() {
        renderBoard();
        renderStatus();
        renderMoves();
    }

    function undoMove() {
        if (pendingPromotion) {
            pendingPromotion = null;
            el.promo.classList.add("chx-hidden");
            renderStatus();
            return;
        }

        if (!history.length) {
            return;
        }

        var prev = history.pop();
        state = deepCloneState(prev.state);
        moveLog = prev.moveLog.slice();
        selected = null;
        selectedMoves = [];
        pendingPromotion = null;
        el.promo.classList.add("chx-hidden");
        renderAll();
    }

    function onPromotionPick(e) {
        var btn = e.target.closest("[data-piece]");
        if (!btn || !pendingPromotion) { return; }
        var piece = btn.dataset.piece;
        commitMove(pendingPromotion.move, piece);
    }

    boardEl.addEventListener("click", handleBoardClick);
    el.newBtn.addEventListener("click", resetGame);
    el.undoBtn.addEventListener("click", undoMove);
    el.promo.addEventListener("click", onPromotionPick);

    buildBoardDom();
    resetGame();
})();
