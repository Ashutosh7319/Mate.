// =================================
// GAME UI INITIALIZER
// =================================

document.addEventListener("DOMContentLoaded", () => {
    createBoard();
});

let selectedSquare = null;
let promotionSquare = null;

let moveHistory = [];
let capturedByWhite = [];
let capturedByBlack = [];
let moveCoordinates = [];

let movedPieces = {
    wK: false, bK: false,
    wR0: false, wR7: false,
    bR0: false, bR7: false
};

let enPassantTarget = null;

let gameMode = "local"; // "local" or "bot"
let botThinking = false;

// =================================
// BOARD RENDERER
// =================================

function createBoard() {
    const board = document.getElementById("chessBoard");

    if (!board) return; // safety check

    board.innerHTML = "";

    for (let row = 8; row >= 1; row--) {
        for (let col = 0; col < 8; col++) {

            const square = document.createElement("div");
            square.classList.add("square");

            square.dataset.index = (8 - row) * 8 + col;
            square.addEventListener("click", onSquareClick);

            if ((row + col) % 2 === 0)
                square.classList.add("light");
            else
                square.classList.add("dark");

            board.appendChild(square);
        }
    }
}

// Bot Declaration

const BOT_LEVELS = [
    { name: "Beginner", elo: 300, depth: 1 },
    { name: "Casual", elo: 600, depth: 1 },
    { name: "Learner", elo: 900, depth: 2 },
    { name: "Intermediate", elo: 1200, depth: 2 },
    { name: "Advanced", elo: 1500, depth: 3 },
    { name: "Expert", elo: 1800, depth: 3 },
    { name: "Master", elo: 2100, depth: 4 },
    { name: "Grandmaster", elo: 2400, depth: 4 },
    { name: "Magnus", elo: 2880, depth: 5 }
];

let selectedBot = null;

// ================================
// INITIAL CHESS POSITION
// ================================

const startPosition = [
    "bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR",
    "bP", "bP", "bP", "bP", "bP", "bP", "bP", "bP",
    null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, null, null,
    "wP", "wP", "wP", "wP", "wP", "wP", "wP", "wP",
    "wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR"
];
window.START_POSITION = startPosition;

let boardState = [...startPosition];

function renderPieces() {

    const squares = document.querySelectorAll(".square");

    squares.forEach(square => square.innerHTML = "");

    squares.forEach((square, index) => {

        const piece = boardState[index];
        if (!piece) return;

        const img = document.createElement("img");
        img.src = `imgs/${piece}.svg`;
        img.classList.add("piece");

        square.appendChild(img);
    });

}

document.addEventListener("DOMContentLoaded", () => {
    createBoard();
    renderPieces();

    // gameMode = "bot";
    // selectedBot = BOT_LEVELS[0];
});

// ================================
// GAME SESSION STATE
// ================================

let gameState = {
    mode: null,
    whiteTime: 0,
    blackTime: 0,
    currentTurn: "white",
    timerInterval: null,
    gameStarted: false,
    timerStarted: false   // ⭐ NEW
};

// ================================
// MODE SELECTION
// ================================

function startGame(mode, seconds) {

    // Save selected mode + time
    gameState.mode = mode;
    gameState.whiteTime = seconds;
    gameState.blackTime = seconds;
    gameState.gameStarted = true;
    gameState.timerStarted = false;

    // Update header label safely
    const label = document.getElementById("modeIndicator");
    if (label) {
        label.innerText = mode.charAt(0).toUpperCase() + mode.slice(1);
    }

    // 🔥 Hide mode modal
    const modal = document.getElementById("modeModal");
    if (modal) {
        modal.classList.add("hidden");
    }

    // 🔥 Remove blur lock if applied
    document.body.classList.remove("blur-active");

    // 🔥 Show timers with correct starting time
    updateTimerUI();
}

function startTimerIfNeeded() {
    if (gameState.timerStarted) return;
    gameState.timerStarted = true;
    startTimer();
}



// ================================
// TIMER ENGINE
// ================================

function startTimer() {

    if (gameState.timerInterval)
        clearInterval(gameState.timerInterval);

    gameState.timerInterval = setInterval(() => {

        if (gameState.currentTurn === "white")
            gameState.whiteTime--;
        else
            gameState.blackTime--;

        updateTimerUI();
        checkTimeOver();

    }, 1000);
}

function updateTimerUI() {
    document.getElementById("whiteTimer").innerText =
        formatTime(gameState.whiteTime);

    document.getElementById("blackTimer").innerText =
        formatTime(gameState.blackTime);
}

function formatTime(seconds) {
    let m = Math.floor(seconds / 60);
    let s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function checkTimeOver() {

    if (gameState.whiteTime <= 0) {
        endGame("lose"); // white lost
    }

    if (gameState.blackTime <= 0) {
        endGame("win"); // white won
    }
}

function saveCurrentGame(result) {
    console.log("Saving game...");

    const gameData = {

        id: Date.now(),
        opponent: selectedBot ? selectedBot.id : "local",
        mode: gameMode,
        result: result,
        date: new Date().toISOString(),
        moves: moveCoordinates,
        finalBoard: [...boardState]

    };

    saveGameToHistory(gameData);
}

function endGame(result) {

    clearInterval(gameState.timerInterval);

    const title = document.getElementById("gameResultTitle");
    const subtitle = document.getElementById("gameResultSubtitle");
    const modal = document.getElementById("gameOverModal");

    
    if (result === "checkmate") {

        title.innerText = "Checkmate";

        playCheckmateSound();

        const winner =
            gameState.currentTurn === "white" ? "Black" : "White";

        subtitle.innerText = winner + " wins";

        if (gameMode === "bot") {

            if (winner === "White") {
                registerBotWin(selectedBot);
            }
            else {
                registerBotLoss();
            }

        }

        if (gameMode === "local") {

            if (winner === "White") {
                updateLocalWin();
            }
            else {
                updateLocalLoss();
            }

        }
    }

    if (result === "stalemate") {
        title.innerText = "Stalemate";
        subtitle.innerText = "Draw";
    }

    if (result === "timeout") {
        title.innerText = "Time Over";

        const winner = gameState.currentTurn === "white" ? "Black" : "White";
        subtitle.innerText = winner + " wins";
    }

    modal.classList.remove("hidden");
    saveCurrentGame(result);
}

// ================================
// TURN SWITCH HANDLER
// ================================

function switchTurn() {

    gameState.currentTurn =
        gameState.currentTurn === "white" ? "black" : "white";

    updateBoardOrientation();
}

function updateBoardOrientation() {

    const board = document.getElementById("chessBoard");

    if (!board) return;

    if (gameState.currentTurn === "black") {
        board.classList.add("board-rotated");
    } else {
        board.classList.remove("board-rotated");
    }

}

async function onSquareClick(e) {

    const square = e.currentTarget;
    const index = Number(square.dataset.index);
    const piece = boardState[index];

    // CLICKING OWN PIECE → SELECT
    if (piece) {
        if (gameState.currentTurn === "white" && piece.startsWith("w") ||
            gameState.currentTurn === "black" && piece.startsWith("b")) {

            selectSquare(index);
            return;
        }
    }

    // CLICKING EMPTY OR ENEMY → MOVE
    if (selectedSquare !== null) {
        await makeMove(selectedSquare, index);
    }
}

function selectSquare(index) {

    clearHighlights();

    selectedSquare = index;

    document.querySelector(`.square[data-index='${index}']`)
        .classList.add("selected");

    const legalMoves = getLegalMoves(index);

    legalMoves.forEach(moveIndex => {
        document.querySelector(
            `.square[data-index='${moveIndex}']`
        ).classList.add("legal");
    });
}

function clearHighlights() {
    document.querySelectorAll(".square")
        .forEach(s => {
            s.classList.remove("selected");
            s.classList.remove("legal");
        });
}

function recordMoveCoordinates(from, to, promotion=null){

    moveCoordinates.push({
        from: from,
        to: to,
        promotion: promotion
    });

}


async function makeMove(from, to) {

    const legalMoves = getLegalMoves(from);
    if (!legalMoves.includes(to)) {
        clearHighlights();
        selectedSquare = null;
        return;
    }

    const movingPiece = boardState[from];
    const previousEnPassant = enPassantTarget;

    // reset en passant every move
    enPassantTarget = null;

    // if pawn moves two squares, mark en passant square
    if (movingPiece[1] === "P" && Math.abs(to - from) === 16) {
        enPassantTarget = (from + to) / 2;
    }

    const capturedPiece = boardState[to];   // ⭐ must be here

    // ======================
    // PAWN PROMOTION CHECK (before notation!)
    // ======================
    const targetRow = Math.floor(to / 8);
    if (movingPiece[1] === "P" && (targetRow === 0 || targetRow === 7)) {

        boardState[to] = movingPiece;
        boardState[from] = null;

        promotionSquare = to;
        moveFromSquare = from;

        showPromotionModal(movingPiece[0]);
        renderPieces();
        return;
    }

    // ======================
    // CHESS NOTATION
    // ======================
    const pieceLetter = getPieceLetter(movingPiece);
    const toSquare = indexToSquare(to);

    let notation = pieceLetter + toSquare;
    if (capturedPiece) notation = pieceLetter + "x" + toSquare;

    recordMove(notation);
    recordMoveCoordinates(from, to);

    // ======================
    // HANDLE EN PASSANT CAPTURE
    // ======================
    if (movingPiece[1] === "P" && to === previousEnPassant) {

        const direction = movingPiece[0] === "w" ? 1 : -1;
        const capturedIndex = to + (direction * 8);

        const capturedPawn = boardState[capturedIndex];

        if (capturedPawn) {
            if (movingPiece[0] === "w")
                capturedByWhite.push(capturedPawn);
            else
                capturedByBlack.push(capturedPawn);

            boardState[capturedIndex] = null;
            updateCaptureUI();
            playCaptureSound();
        }
    }

    // ======================
    // CAPTURE TRACKING
    // ======================
    if (capturedPiece) {
        playCaptureSound();   // ⭐ add this
        if (movingPiece[0] === "w")
            capturedByWhite.push(capturedPiece);
        else
            capturedByBlack.push(capturedPiece);

        updateCaptureUI();
    } else {
        playMoveSound();      // ⭐ normal move sound
    }

    // ======================
    // HANDLE CASTLING MOVE
    // ======================
    if (movingPiece[1] === "K" && Math.abs(to - from) === 2) {

        // white king side
        if (to === 62) { boardState[61] = "wR"; boardState[63] = null; }

        // white queen side
        if (to === 58) { boardState[59] = "wR"; boardState[56] = null; }

        // black king side
        if (to === 6) { boardState[5] = "bR"; boardState[7] = null; }

        // black queen side
        if (to === 2) { boardState[3] = "bR"; boardState[0] = null; }
    }
    // ======================
    // APPLY MOVE
    // ======================
    await animateMove(from, to, movingPiece);

    boardState[to] = movingPiece;
    boardState[from] = null;

    // track moved pieces
    if (movingPiece === "wK") movedPieces.wK = true;
    if (movingPiece === "bK") movedPieces.bK = true;

    if (from === 56) movedPieces.wR0 = true;
    if (from === 63) movedPieces.wR7 = true;
    if (from === 0) movedPieces.bR0 = true;
    if (from === 7) movedPieces.bR7 = true;

    clearHighlights();
    selectedSquare = null;

    renderPieces();

    startTimerIfNeeded();

    // ======================
    // SET NEW EN PASSANT TARGET
    // ======================
    enPassantTarget = null;

    if (movingPiece[1] === "P" && Math.abs(to - from) === 16) {
        enPassantTarget = (from + to) / 2;
    }

    switchTurn();
    evaluateGameState();

    console.log("Mode:", gameMode);
    console.log("Turn:", gameState.currentTurn);
}

function indexToRowCol(index) {
    return {
        row: Math.floor(index / 8),
        col: index % 8
    };
}

function rowColToIndex(row, col) {
    return row * 8 + col;
}

function isInsideBoard(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function getSlidingMoves(row, col, color, directions) {

    let moves = [];

    directions.forEach(([dr, dc]) => {

        let r = row + dr;
        let c = col + dc;

        while (isInsideBoard(r, c)) {

            const idx = rowColToIndex(r, c);
            const target = boardState[idx];

            // empty square
            if (!target) {
                moves.push(idx);
            }
            else {
                // enemy piece → capture allowed
                if (target[0] !== color) {
                    moves.push(idx);
                }
                // stop sliding after hitting any piece
                break;
            }

            r += dr;
            c += dc;
        }

    });

    return moves;
}

function getPsuedoMoves(index) {

    const piece = boardState[index];
    if (!piece) return [];

    const { row, col } = indexToRowCol(index);
    const color = piece[0];   // "w" or "b"
    const type = piece[1];    // "P", "R", "N", etc.

    let moves = [];

    // ======================
    // PAWN
    // ======================
    if (type === "P") {

        const direction = color === "w" ? -1 : 1;
        const startRow = color === "w" ? 6 : 1;


        // forward move
        let forwardRow = row + direction;
        if (isInsideBoard(forwardRow, col)) {
            let forwardIndex = rowColToIndex(forwardRow, col);
            if (!boardState[forwardIndex]) {
                moves.push(forwardIndex);

                // double move
                if (row === startRow) {
                    let doubleRow = row + direction * 2;
                    let doubleIndex = rowColToIndex(doubleRow, col);
                    if (!boardState[doubleIndex]) {
                        moves.push(doubleIndex);
                    }
                }
            }
        }


        // capture diagonals
        for (let dc of [-1, 1]) {
            let r = row + direction;
            let c = col + dc;

            if (isInsideBoard(r, c)) {
                let captureIndex = rowColToIndex(r, c);
                let target = boardState[captureIndex];
                if (target && target[0] !== color) {
                    moves.push(captureIndex);
                }
            }
        }

        // ======================
        // EN PASSANT
        // ======================
        for (let dc of [-1, 1]) {

            let r = row + direction;
            let c = col + dc;

            if (isInsideBoard(r, c)) {
                let idx = rowColToIndex(r, c);

                if (idx === enPassantTarget) {
                    moves.push(idx);
                }
            }
        }
    }

    // ======================
    // KNIGHT
    // ======================
    if (type === "N") {

        const knightMoves = [
            [2, 1], [2, -1], [-2, 1], [-2, -1],
            [1, 2], [1, -2], [-1, 2], [-1, -2]
        ];

        knightMoves.forEach(([dr, dc]) => {
            let r = row + dr;
            let c = col + dc;

            if (isInsideBoard(r, c)) {
                let idx = rowColToIndex(r, c);
                let target = boardState[idx];

                if (!target || target[0] !== color) {
                    moves.push(idx);
                }
            }
        });
    }

    // ======================
    // ROOK
    // ======================
    if (type === "R") {

        const directions = [
            [1, 0], [-1, 0], [0, 1], [0, -1]
        ];

        moves.push(...getSlidingMoves(row, col, color, directions));
    }

    // ======================
    // BISHOP
    // ======================
    if (type === "B") {

        const directions = [
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ];

        moves.push(...getSlidingMoves(row, col, color, directions));
    }

    // ======================
    // QUEEN
    // ======================
    if (type === "Q") {

        const directions = [
            [1, 0], [-1, 0], [0, 1], [0, -1],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ];

        moves.push(...getSlidingMoves(row, col, color, directions));
    }

    // ======================
    // KING
    // ======================
    if (type === "K") {

        const directions = [
            [1, 0], [-1, 0], [0, 1], [0, -1],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ];

        directions.forEach(([dr, dc]) => {

            let r = row + dr;
            let c = col + dc;

            if (isInsideBoard(r, c)) {
                let idx = rowColToIndex(r, c);
                let target = boardState[idx];

                // empty OR enemy piece allowed
                if (!target || target[0] !== color) {
                    moves.push(idx);
                }
            }

        });
    }

    // ======================
    // CASTLING MOVES
    // ======================
    if (type === "K") {

        if (color === "w" && !movedPieces.wK) {
            // king side
            if (!movedPieces.wR7 &&
                !boardState[61] && !boardState[62]) {
                moves.push(62);
            }
            // queen side
            if (!movedPieces.wR0 &&
                !boardState[59] && !boardState[58] && !boardState[57]) {
                moves.push(58);
            }
        }

        if (color === "b" && !movedPieces.bK) {
            if (!movedPieces.bR7 &&
                !boardState[5] && !boardState[6]) {
                moves.push(6);
            }
            if (!movedPieces.bR0 &&
                !boardState[3] && !boardState[2] && !boardState[1]) {
                moves.push(2);
            }
        }
    }

    // moves = moves.filter(move => isMoveSafe(index, move));
    return moves;
}

function getLegalMoves(index) {

    const pseudoMoves = getPsuedoMoves(index);

    return pseudoMoves.filter(move =>
        isMoveSafe(index, move)
    );
}


function findKing(color) {
    return boardState.findIndex(
        piece => piece === color + "K"
    );
}

function getAllAttackedSquares(attackerColor) {

    let attacked = [];

    boardState.forEach((piece, index) => {
        if (!piece) return;
        if (piece[0] !== attackerColor) return;

        attacked.push(...getPsuedoMoves(index));
    });

    return attacked;
}

function isKingInCheck(color) {

    const kingIndex = findKing(color);
    const enemyColor = color === "w" ? "b" : "w";

    const attackedSquares = getAllAttackedSquares(enemyColor);

    return attackedSquares.includes(kingIndex);
}

function isMoveSafe(from, to) {

    const backupFrom = boardState[from];
    const backupTo = boardState[to];

    // simulate move
    boardState[to] = boardState[from];
    boardState[from] = null;

    const inCheck = isKingInCheck(gameState.currentTurn[0]);

    // undo move
    boardState[from] = backupFrom;
    boardState[to] = backupTo;

    return !inCheck;
}

function playerHasLegalMoves(color) {

    for (let i = 0; i < 64; i++) {
        const piece = boardState[i];
        if (!piece) continue;
        if (piece[0] !== color) continue;

        const moves = getLegalMoves(i);
        if (moves.length > 0) return true;
    }

    return false;
}

function evaluateGameState() {

    const color = gameState.currentTurn[0]; // "w" or "b"
    const inCheck = isKingInCheck(color);
    const hasMoves = playerHasLegalMoves(color);

    if (inCheck && !hasMoves) {
        endGame("checkmate");
        return;
    }

    if (!inCheck && !hasMoves) {
        endGame("stalemate");
        return;
    }

    if (inCheck) {
        showCheckAlert();
    }
    else {
        hideCheckAlert();
    }
}

function showCheckAlert() {
    const alert = document.getElementById("checkAlert");
    alert.classList.remove("hidden");
    alert.classList.add("show");
}

function hideCheckAlert() {
    const alert = document.getElementById("checkAlert");
    alert.classList.remove("show");
    alert.classList.add("hidden");
}

function showPromotionModal(color) {

    const modal = document.getElementById("promotionModal");
    modal.classList.remove("hidden");

    // update images based on pawn color
    document.querySelectorAll(".promotion-grid img")
        .forEach(img => {
            const piece = img.getAttribute("onclick").match(/'(.*)'/)[1];
            img.src = `imgs/${color}${piece}.svg`;
        });
}

function promotePawn(pieceType) {

    const color = gameState.currentTurn === "white" ? "w" : "b";

    const from = moveFromSquare;
    const to = promotionSquare;

    // replace pawn with promoted piece
    boardState[to] = color + pieceType;

    // record promotion move
    recordMoveCoordinates(from, to, pieceType);

    document.getElementById("promotionModal").classList.add("hidden");

    renderPieces();

    // reset promotion tracking
    promotionSquare = null;
    moveFromSquare = null;

    // resume normal game flow
    startTimerIfNeeded();
    switchTurn();
    evaluateGameState();
}

function resetGame() {

    // fresh board copy
    boardState = [...startPosition];

    gameState.currentTurn = "white";
    gameState.timerStarted = false;
    gameState.gameStarted = false;

    clearInterval(gameState.timerInterval);

    clearHighlights();
    renderPieces();
    capturedByWhite = [];
    capturedByBlack = [];
    updateCaptureUI();
    moveHistory = [];
    moveCoordinates = [];
    renderMoveHistory();
    enPassantTarget = null;
}

function rematchGame() {

    document.getElementById("gameOverModal").classList.add("hidden");

    resetGame();

    // show mode selector again
    document.getElementById("modeModal").classList.remove("hidden");
}

function goHome() {
    window.location.href = "index.html";
}

function updateCaptureUI() {

    const whiteBox = document.getElementById("whiteCaptures");
    const blackBox = document.getElementById("blackCaptures");

    whiteBox.innerHTML = "";
    blackBox.innerHTML = "";

    capturedByWhite.forEach(piece => {
        const img = document.createElement("img");
        img.src = `imgs/${piece}.svg`;
        whiteBox.appendChild(img);
    });

    capturedByBlack.forEach(piece => {
        const img = document.createElement("img");
        img.src = `imgs/${piece}.svg`;
        blackBox.appendChild(img);
    });
}

function indexToSquare(index) {
    const file = "abcdefgh"[index % 8];
    const rank = 8 - Math.floor(index / 8);
    return file + rank;
}

function getPieceLetter(piece) {
    const map = {
        P: "",
        R: "R",
        N: "N",
        B: "B",
        Q: "Q",
        K: "K"
    };
    return map[piece[1]];
}

function recordMove(move) {

    if (gameState.currentTurn === "white") {
        moveHistory.push([move]);
    } else {
        moveHistory[moveHistory.length - 1].push(move);
    }

    renderMoveHistory();
}

function renderMoveHistory() {

    const container = document.getElementById("moveList");
    container.innerHTML = "";

    const maxMoves = 5;

    const start = Math.max(0, moveHistory.length - maxMoves);
    const recentMoves = moveHistory.slice(start);

    recentMoves.forEach((turn, index) => {

        const row = document.createElement("div");
        row.className = "move-row";

        const num = document.createElement("div");
        num.className = "move-number";
        num.innerText = (start + index + 1) + ".";

        const white = document.createElement("div");
        white.className = "move white-move";
        white.innerText = turn[0] || "";

        const black = document.createElement("div");
        black.className = "move black-move";
        black.innerText = turn[1] || "";

        row.appendChild(num);
        row.appendChild(white);
        row.appendChild(black);

        container.appendChild(row);
    });
    container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
    });
}


function playMoveSound() {
    document.getElementById("moveSound").play();
}

function playCaptureSound() {
    document.getElementById("captureSound").play();
}

function playCheckmateSound() {
    document.getElementById("checkmateSound").play();
}

function getSquareCenter(index) {
    const board = document.getElementById("chessBoard");
    const rect = board.getBoundingClientRect();

    const row = Math.floor(index / 8);
    const col = index % 8;

    const squareSize = rect.width / 8;

    return {
        x: col * squareSize,
        y: row * squareSize,
        size: squareSize
    };
}

function animateMove(from, to, piece) {

    return new Promise(resolve => {

        const layer = document.getElementById("animationLayer");
        const fromPos = getSquareCenter(from);
        const toPos = getSquareCenter(to);

        const img = document.createElement("img");
        img.src = `imgs/${piece}.svg`;
        img.className = "flying-piece";

        img.style.left = fromPos.x + "px";
        img.style.top = fromPos.y + "px";
        img.style.width = fromPos.size + "px";
        img.style.height = fromPos.size + "px";

        layer.appendChild(img);

        requestAnimationFrame(() => {
            img.style.transform =
                `translate(${toPos.x - fromPos.x}px, ${toPos.y - fromPos.y}px)`;
        });

        setTimeout(() => {
            layer.removeChild(img);
            resolve();
        }, 250);
    });
}

function makeBotMove() {

    if (botThinking) return;
    botThinking = true;

    // get all legal moves for black
    let allMoves = [];

    for (let i = 0; i < 64; i++) {
        const piece = boardState[i];
        if (!piece || piece[0] !== "b") continue;

        const moves = getLegalMoves(i);
        moves.forEach(m => allMoves.push({ from: i, to: m }));
    }

    if (allMoves.length === 0) {
        botThinking = false;
        return;
    }

    // TEMP: random move (we upgrade to AI next)
    const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];

    makeMove(randomMove.from, randomMove.to);
    botThinking = false;
}
