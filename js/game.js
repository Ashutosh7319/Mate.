// ============================================================================
// CORE CHESS RULES ENGINE & GAME CONTROLLER
// ============================================================================

// Global chess board position tracker
const START_POSITION = [
    "bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR",
    "bP", "bP", "bP", "bP", "bP", "bP", "bP", "bP",
    null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, null, null,
    "wP", "wP", "wP", "wP", "wP", "wP", "wP", "wP",
    "wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR"
];

window.START_POSITION = START_POSITION;
window.boardState = [...START_POSITION];

// Active game session state variables on window
window.gameMode = "local"; // "local" or "bot"
window.selectedBot = null;
window.playerColor = "white"; // White is human in bot play
window.botColor = "black";

let selectedSquare = null;
let promotionSquare = null;

let capturedByWhite = [];
let capturedByBlack = [];
let gameMovesHistory = []; // raw moves list: { from, to, piece, notation }
let gameHalfMovesHistory = []; // notation tracker: [["e4", "e5"], ["Nf3", "Nc6"]]

let movedPieces = {
    wK: false, bK: false,
    wR0: false, wR7: false, // wR0 is a1 (idx 56), wR7 is h1 (idx 63)
    bR0: false, bR7: false  // bR0 is a8 (idx 0), bR7 is h8 (idx 7)
};

let enPassantTarget = null; // index of empty square behind double-stepped pawn

window.gameState = {
    mode: "rapid", // "rapid", "bullet", "blitz"
    whiteTime: 600,
    blackTime: 600,
    currentTurn: "white",
    timerInterval: null,
    gameStarted: false,
    timerStarted: false,
    isAnimating: false
};

// ==========================================
// BOARD RENDERING & PIECE GRAPHICS
// ==========================================

function createChessBoard() {
    const board = document.getElementById("chessBoard");
    if (!board) return;
    board.innerHTML = "";
    
    // Grid coordinate mapping (idx 0 is a8, idx 63 is h1)
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement("div");
            square.className = "square";
            const index = row * 8 + col;
            square.dataset.index = index;
            
            // Alternating checkerboard cells
            if ((row + col) % 2 === 0) {
                square.classList.add("light");
            } else {
                square.classList.add("dark");
            }
            
            square.addEventListener("click", handleSquareClick);
            board.appendChild(square);
        }
    }
}

function renderChessPieces() {
    const squares = document.querySelectorAll("#chessBoard .square");
    squares.forEach(sq => {
        const index = parseInt(sq.dataset.index);
        const piece = boardState[index];
        sq.innerHTML = "";
        
        if (piece) {
            const img = document.createElement("img");
            img.src = `imgs/${piece}.svg`;
            img.className = "piece";
            sq.appendChild(img);
        }
    });
}

// Initialise boards at page load
document.addEventListener("DOMContentLoaded", () => {
    createChessBoard();
    renderChessPieces();
});

// ==========================================
// SESSION ROUTINES (NAV / CLOCK SELECT)
// ==========================================

// Triggers the time selector modal
window.promptGameMode = function(mode) {
    gameMode = mode;
    
    const modeModal = document.getElementById("modeModal");
    if (modeModal) {
        modeModal.classList.remove("hidden");
    }
    document.body.classList.add("blur-active");
};

window.closeTimePrompt = function() {
    const modeModal = document.getElementById("modeModal");
    if (modeModal) {
        modeModal.classList.add("hidden");
    }
    document.body.classList.remove("blur-active");
};

// Initialise play structures after clock selected
window.initializeGameSession = function(timeMode) {
    closeTimePrompt();
    resetActiveGameSession();
    
    gameState.mode = timeMode;
    let seconds = 600; // Rapid
    if (timeMode === "bullet") seconds = 60;
    if (timeMode === "blitz") seconds = 180;
    
    gameState.whiteTime = seconds;
    gameState.blackTime = seconds;
    gameState.currentTurn = "white";
    gameState.gameStarted = true;
    gameState.timerStarted = false;
    
    // Update headers and UI elements
    updateTimerDisplay();
    
    const topName = document.getElementById("topPlayerName");
    const bottomName = document.getElementById("bottomPlayerName");
    
    const profile = getPlayerData();
    const playerName = profile ? profile.username : "You";
    
    if (gameMode === "local") {
        if (topName) topName.innerText = "Black (Player 2)";
        if (bottomName) bottomName.innerText = "White (Player 1)";
        
        // Hide bot header
        const botHead = document.getElementById("botHeader");
        if (botHead) botHead.classList.add("hidden");
    } else {
        // Bot Challenge Mode
        if (selectedBot) {
            if (topName) topName.innerText = selectedBot.name;
            if (bottomName) bottomName.innerText = playerName;
            
            // Show bot header details
            const botHead = document.getElementById("botHeader");
            if (botHead) botHead.classList.remove("hidden");
            
            const botAvatar = document.getElementById("botAvatar");
            if (botAvatar) botAvatar.src = selectedBot.img;
            
            const botNameLabel = document.getElementById("botName");
            if (botNameLabel) botNameLabel.innerText = selectedBot.name;
            
            const botEloLabel = document.getElementById("botElo");
            if (botEloLabel) botEloLabel.innerText = `${selectedBot.elo} ELO`;
            
            const botSpeech = document.getElementById("botSpeech");
            if (botSpeech) botSpeech.innerText = "Let's see what you've got!";
        }
    }
    
    // Load board themes correctly
    const savedTheme = getSavedBoardTheme();
    applyBoardThemeToElements(savedTheme);
    
    // Clear rotation states
    const board = document.getElementById("chessBoard");
    if (board) board.classList.remove("board-rotated");
    
    navigateTo("game-view");
};

// Full reset cleanup called when exiting or restarting matches
window.resetActiveGameSession = function() {
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = null;
    gameState.gameStarted = false;
    gameState.timerStarted = false;
    gameState.isAnimating = false;
    gameState.currentTurn = "white";
    
    // Reset core states
    boardState = [...START_POSITION];
    selectedSquare = null;
    promotionSquare = null;
    
    capturedByWhite = [];
    capturedByBlack = [];
    gameMovesHistory = [];
    gameHalfMovesHistory = [];
    
    movedPieces = {
        wK: false, bK: false,
        wR0: false, wR7: false,
        bR0: false, bR7: false
    };
    
    enPassantTarget = null;
    
    // Terminate Stockfish instances
    terminateStockfishWorker();
    
    // Clear alerts, visual highlights, and boards
    const checkAlert = document.getElementById("checkAlert");
    if (checkAlert) checkAlert.classList.add("hidden");
    
    clearBoardHighlights();
    renderChessPieces();
    updateCapturesUI();
    renderGameMovesList();
    
    // Hide game-over and modal states
    const modal = document.getElementById("gameOverModal");
    if (modal) modal.classList.add("hidden");
    document.body.classList.remove("blur-active");
};

window.rematchGameSession = function() {
    const modal = document.getElementById("gameOverModal");
    if (modal) modal.classList.add("hidden");
    document.body.classList.remove("blur-active");
    
    promptGameMode(gameMode);
};

// ==========================================
// TIMER CLOCK SYSTEM
// ==========================================

function startClockTimer() {
    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    
    gameState.timerInterval = setInterval(() => {
        if (gameState.currentTurn === "white") {
            gameState.whiteTime--;
        } else {
            gameState.blackTime--;
        }
        
        updateTimerDisplay();
        verifyTimeOverStates();
    }, 1000);
}

function updateTimerDisplay() {
    const whiteTimer = document.getElementById("bottomTimer");
    const blackTimer = document.getElementById("topTimer");
    
    if (whiteTimer) {
        whiteTimer.innerText = formatSecondsToMinutes(gameState.whiteTime);
        if (gameState.whiteTime < 15) {
            whiteTimer.classList.add("low-time");
        } else {
            whiteTimer.classList.remove("low-time");
        }
    }
    
    if (blackTimer) {
        blackTimer.innerText = formatSecondsToMinutes(gameState.blackTime);
        if (gameState.blackTime < 15) {
            blackTimer.classList.add("low-time");
        } else {
            blackTimer.classList.remove("low-time");
        }
    }
}

function formatSecondsToMinutes(seconds) {
    if (seconds <= 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function verifyTimeOverStates() {
    if (gameState.whiteTime <= 0) {
        endActiveGameMatch("timeout", "black");
    } else if (gameState.blackTime <= 0) {
        endActiveGameMatch("timeout", "white");
    }
}

// ==========================================
// INTERACTIVE CLICK HANDLERS
// ==========================================

async function handleSquareClick(e) {
    // Escape early if animations are in-progress
    if (gameState.isAnimating) return;
    if (!gameState.gameStarted) return;
    
    const square = e.currentTarget;
    const index = parseInt(square.dataset.index);
    const piece = boardState[index];
    
    // Human is White in bot mode, block clicking black
    if (gameMode === "bot" && gameState.currentTurn === "black") return;
    
    // Select own piece
    if (piece && isPieceTurnColor(piece)) {
        highlightSquareSelections(index);
    } else if (selectedSquare !== null) {
        // Move to target cell
        await executePawnPieceMove(selectedSquare, index);
    }
}

function isPieceTurnColor(piece) {
    const color = piece[0]; // "w" or "b"
    return (gameState.currentTurn === "white" && color === "w") ||
           (gameState.currentTurn === "black" && color === "b");
}

function highlightSquareSelections(index) {
    clearBoardHighlights();
    selectedSquare = index;
    
    const sq = document.querySelector(`#chessBoard .square[data-index='${index}']`);
    if (sq) sq.classList.add("selected");
    
    const legals = compileLegalMoves(index);
    legals.forEach(idx => {
        const targetSq = document.querySelector(`#chessBoard .square[data-index='${idx}']`);
        if (targetSq) targetSq.classList.add("legal");
    });
}

function clearBoardHighlights() {
    const squares = document.querySelectorAll("#chessBoard .square");
    squares.forEach(sq => {
        sq.classList.remove("selected", "legal");
    });
}

// ==========================================
// MOVES GENERATION & CHESS RULES
// ==========================================

// Returns only the moves that do not leave the king in check
function compileLegalMoves(index) {
    const pseudoMoves = compilePseudoMoves(index);
    return pseudoMoves.filter(to => verifyMoveSafety(index, to));
}

// Full move generators for all piece categories
function compilePseudoMoves(index) {
    const piece = boardState[index];
    if (!piece) return [];
    
    const color = piece[0]; // "w" or "b"
    const type = piece[1]; // "P", "N", "B", "R", "Q", "K"
    
    const row = Math.floor(index / 8);
    const col = index % 8;
    let moves = [];
    
    // PAWN RULES
    if (type === "P") {
        const direction = color === "w" ? -1 : 1;
        const startRow = color === "w" ? 6 : 1;
        
        // Single space forward step
        const stepRow = row + direction;
        if (stepRow >= 0 && stepRow < 8) {
            const stepIdx = stepRow * 8 + col;
            if (!boardState[stepIdx]) {
                moves.push(stepIdx);
                
                // Double space forward step
                const doubleRow = row + (direction * 2);
                if (row === startRow && doubleRow >= 0 && doubleRow < 8) {
                    const doubleIdx = doubleRow * 8 + col;
                    if (!boardState[doubleIdx]) {
                        moves.push(doubleIdx);
                    }
                }
            }
        }
        
        // Capture diagonals
        const colsOffset = [-1, 1];
        colsOffset.forEach(dc => {
            const targetCol = col + dc;
            const targetRow = row + direction;
            if (targetCol >= 0 && targetCol < 8 && targetRow >= 0 && targetRow < 8) {
                const targetIdx = targetRow * 8 + targetCol;
                const targetPiece = boardState[targetIdx];
                if (targetPiece && targetPiece[0] !== color) {
                    moves.push(targetIdx);
                }
                
                // En Passant capturing check
                if (targetIdx === enPassantTarget) {
                    moves.push(targetIdx);
                }
            }
        });
    }
    
    // KNIGHT RULES
    if (type === "N") {
        const offsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        offsets.forEach(([dr, dc]) => {
            const r = row + dr;
            const c = col + dc;
            if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                const targetIdx = r * 8 + c;
                const target = boardState[targetIdx];
                if (!target || target[0] !== color) {
                    moves.push(targetIdx);
                }
            }
        });
    }
    
    // ROOK / SLIDING FILE RULES
    if (type === "R" || type === "Q") {
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        moves.push(...generateSlidingMoves(row, col, color, directions));
    }
    
    // BISHOP / SLIDING DIAGONAL RULES
    if (type === "B" || type === "Q") {
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        moves.push(...generateSlidingMoves(row, col, color, directions));
    }
    
    // KING RULES
    if (type === "K") {
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        directions.forEach(([dr, dc]) => {
            const r = row + dr;
            const c = col + dc;
            if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                const targetIdx = r * 8 + c;
                const target = boardState[targetIdx];
                if (!target || target[0] !== color) {
                    moves.push(targetIdx);
                }
            }
        });
        
        // CASTLING RULES
        if (color === "w" && !movedPieces.wK) {
            // Kingside Castling (e1 to g1: idx 60 to 62)
            if (!movedPieces.wR7 && !boardState[61] && !boardState[62]) {
                // Confirm no checks on intermediate square path
                if (!verifySquareAttacked(60, "b") && !verifySquareAttacked(61, "b") && !verifySquareAttacked(62, "b")) {
                    moves.push(62);
                }
            }
            // Queenside Castling (e1 to c1: idx 60 to 58)
            if (!movedPieces.wR0 && !boardState[59] && !boardState[58] && !boardState[57]) {
                if (!verifySquareAttacked(60, "b") && !verifySquareAttacked(59, "b") && !verifySquareAttacked(58, "b")) {
                    moves.push(58);
                }
            }
        } else if (color === "b" && !movedPieces.bK) {
            // Kingside Castling (e8 to g8: idx 4 to 6)
            if (!movedPieces.bR7 && !boardState[5] && !boardState[6]) {
                if (!verifySquareAttacked(4, "w") && !verifySquareAttacked(5, "w") && !verifySquareAttacked(6, "w")) {
                    moves.push(6);
                }
            }
            // Queenside Castling (e8 to c8: idx 4 to 2)
            if (!movedPieces.bR0 && !boardState[3] && !boardState[2] && !boardState[1]) {
                if (!verifySquareAttacked(4, "w") && !verifySquareAttacked(3, "w") && !verifySquareAttacked(2, "w")) {
                    moves.push(2);
                }
            }
        }
    }
    
    return moves;
}

function generateSlidingMoves(row, col, color, directions) {
    const moves = [];
    directions.forEach(([dr, dc]) => {
        let r = row + dr;
        let c = col + dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const idx = r * 8 + c;
            const piece = boardState[idx];
            if (!piece) {
                moves.push(idx);
            } else {
                if (piece[0] !== color) {
                    moves.push(idx);
                }
                break; // Hitting a piece stops slide sliding path
            }
            r += dr;
            c += dc;
        }
    });
    return moves;
}

// Checks if a square is attacked by any piece of the attackerColor
function verifySquareAttacked(squareIdx, attackerColor) {
    for (let i = 0; i < 64; i++) {
        const piece = boardState[i];
        if (piece && piece[0] === attackerColor) {
            // Check pseudo moves of attacker
            const pseudo = compilePseudoMovesWithoutCastling(i);
            if (pseudo.includes(squareIdx)) {
                return true;
            }
        }
    }
    return false;
}

// Prevent recursion when generating attack lines
function compilePseudoMovesWithoutCastling(index) {
    const piece = boardState[index];
    if (!piece) return [];
    
    const color = piece[0];
    const type = piece[1];
    
    const row = Math.floor(index / 8);
    const col = index % 8;
    let moves = [];
    
    // Pawn
    if (type === "P") {
        const direction = color === "w" ? -1 : 1;
        const colsOffset = [-1, 1];
        colsOffset.forEach(dc => {
            const targetCol = col + dc;
            const targetRow = row + direction;
            if (targetCol >= 0 && targetCol < 8 && targetRow >= 0 && targetRow < 8) {
                moves.push(targetRow * 8 + targetCol);
            }
        });
    }
    
    // Knight
    if (type === "N") {
        const offsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        offsets.forEach(([dr, dc]) => {
            const r = row + dr;
            const c = col + dc;
            if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                moves.push(r * 8 + c);
            }
        });
    }
    
    // Sliders
    if (type === "R" || type === "Q") {
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        moves.push(...generateSlidingMoves(row, col, color, directions));
    }
    if (type === "B" || type === "Q") {
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        moves.push(...generateSlidingMoves(row, col, color, directions));
    }
    
    // King without castling check
    if (type === "K") {
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        directions.forEach(([dr, dc]) => {
            const r = row + dr;
            const c = col + dc;
            if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                moves.push(r * 8 + c);
            }
        });
    }
    
    return moves;
}

// Find king index
function locateKingIndex(color) {
    const kingSymbol = color === "white" ? "wK" : "bK";
    return boardState.indexOf(kingSymbol);
}

// Returns true if King of target color is currently in check
function verifyKingCheck(color) {
    const kingIdx = locateKingIndex(color);
    if (kingIdx === -1) return false; // Safety
    
    const enemyColor = color === "white" ? "b" : "w";
    return verifySquareAttacked(kingIdx, enemyColor);
}

// Move safety evaluator scope FIX - checks scope of actual piece color moving
function verifyMoveSafety(from, to) {
    const movingPiece = boardState[from];
    if (!movingPiece) return false;
    
    const pieceColor = movingPiece[0] === "w" ? "white" : "black";
    const backupFrom = boardState[from];
    const backupTo = boardState[to];
    
    // Simulate board step
    boardState[to] = boardState[from];
    boardState[from] = null;
    
    const isSafe = !verifyKingCheck(pieceColor);
    
    // Revert board step
    boardState[from] = backupFrom;
    boardState[to] = backupTo;
    
    return isSafe;
}

// Verify if color player has any legal moves available
function checkPlayerHasLegalMoves(color) {
    const colorChar = color === "white" ? "w" : "b";
    for (let i = 0; i < 64; i++) {
        const piece = boardState[i];
        if (piece && piece[0] === colorChar) {
            const legals = compileLegalMoves(i);
            if (legals.length > 0) {
                return true;
            }
        }
    }
    return false;
}

// ==========================================
// PIECE ANIMATION & MOVES EXECUTION
// ==========================================

async function executePawnPieceMove(from, to) {
    const legals = compileLegalMoves(from);
    if (!legals.includes(to)) {
        clearBoardHighlights();
        selectedSquare = null;
        return;
    }
    
    // Lock board clicking during animations
    gameState.isAnimating = true;
    
    const movingPiece = boardState[from];
    const capturedPiece = boardState[to];
    
    // Start clock timer if not already ticking
    if (!gameState.timerStarted) {
        gameState.timerStarted = true;
        startClockTimer();
    }
    
    let enPassantCaptured = false;
    let castlingOccurred = false;
    
    // En Passant Capture Checks
    if (movingPiece[1] === "P" && to === enPassantTarget) {
        const capturedIdx = gameState.currentTurn === "white" ? to + 8 : to - 8;
        const targetPawn = boardState[capturedIdx];
        if (targetPawn) {
            if (gameState.currentTurn === "white") {
                capturedByWhite.push(targetPawn);
            } else {
                capturedByBlack.push(targetPawn);
            }
            boardState[capturedIdx] = null;
            enPassantCaptured = true;
        }
    }
    
    // Capture details tracking
    if (capturedPiece) {
        if (gameState.currentTurn === "white") {
            capturedByWhite.push(capturedPiece);
        } else {
            capturedByBlack.push(capturedPiece);
        }
    }
    
    // Castling movements execution
    if (movingPiece[1] === "K" && Math.abs(to - from) === 2) {
        castlingOccurred = true;
        if (to === 62) { // White Kingside
            boardState[61] = "wR"; boardState[63] = null;
            movedPieces.wR7 = true;
        } else if (to === 58) { // White Queenside
            boardState[59] = "wR"; boardState[56] = null;
            movedPieces.wR0 = true;
        } else if (to === 6) { // Black Kingside
            boardState[5] = "bR"; boardState[7] = null;
            movedPieces.bR7 = true;
        } else if (to === 2) { // Black Queenside
            boardState[3] = "bR"; boardState[0] = null;
            movedPieces.bR0 = true;
        }
    }
    
    // Animate move flight
    await runMoveAnimation(from, to, movingPiece);
    
    // Apply state changes to grid
    boardState[to] = movingPiece;
    boardState[from] = null;
    
    // Record castling/kings histories
    if (movingPiece === "wK") movedPieces.wK = true;
    if (movingPiece === "bK") movedPieces.bK = true;
    if (from === 56) movedPieces.wR0 = true;
    if (from === 63) movedPieces.wR7 = true;
    if (from === 0) movedPieces.bR0 = true;
    if (from === 7) movedPieces.bR7 = true;
    
    // En Passant state setter
    enPassantTarget = null;
    if (movingPiece[1] === "P" && Math.abs(to - from) === 16) {
        enPassantTarget = gameState.currentTurn === "white" ? from - 8 : from + 8;
    }
    
    // Pawn promotion evaluator
    const targetRow = Math.floor(to / 8);
    let promotionActive = false;
    if (movingPiece[1] === "P" && (targetRow === 0 || targetRow === 7)) {
        promotionActive = true;
        promotionSquare = to;
        
        // Show Promotion Modal
        displayPromotionModal(movingPiece[0]);
    }
    
    // Notation generator
    const notation = generateChessMoveNotation(from, to, movingPiece, capturedPiece || enPassantCaptured, castlingOccurred);
    
    // Sound clips player
    if (capturedPiece || enPassantCaptured) {
        playCaptureAudioClip();
    } else {
        playMoveAudioClip();
    }
    
    // Record moves history
    recordGameHistoryMove(from, to, movingPiece, notation);
    
    clearBoardHighlights();
    selectedSquare = null;
    renderChessPieces();
    updateCapturesUI();
    
    gameState.isAnimating = false; // Release interaction locks
    
    if (!promotionActive) {
        switchClockTurns();
    }
}

// Generate animated chess pieces path translations
function runMoveAnimation(from, to, piece) {
    return new Promise(resolve => {
        const board = document.getElementById("chessBoard");
        if (!board) {
            resolve(); return;
        }
        
        const layer = document.getElementById("animationLayer");
        if (!layer) {
            resolve(); return;
        }
        
        const boardRect = board.getBoundingClientRect();
        const sqSize = boardRect.width / 8;
        
        // Translate from/to indexes into row/col coordinates
        const fromRow = Math.floor(from / 8);
        const fromCol = from % 8;
        const toRow = Math.floor(to / 8);
        const toCol = to % 8;
        
        // Convert to absolute pixels relative to the board
        const startX = fromCol * sqSize;
        const startY = fromRow * sqSize;
        const endX = toCol * sqSize;
        const endY = toRow * sqSize;
        
        // Handle board rotation adjustments in local mode
        const isFlipped = board.classList.contains("board-rotated");
        
        const animImg = document.createElement("img");
        animImg.src = `imgs/${piece}.svg`;
        animImg.className = "flying-piece";
        
        // Custom dimensions
        animImg.style.width = `${sqSize * 0.85}px`;
        animImg.style.height = `${sqSize * 0.85}px`;
        
        // Setup initial coordinates
        if (isFlipped) {
            animImg.style.right = `${startX + (sqSize * 0.075)}px`;
            animImg.style.bottom = `${startY + (sqSize * 0.075)}px`;
            animImg.style.transform = `rotate(180deg)`;
        } else {
            animImg.style.left = `${startX + (sqSize * 0.075)}px`;
            animImg.style.top = `${startY + (sqSize * 0.075)}px`;
        }
        
        layer.appendChild(animImg);
        
        // Trigger translation
        requestAnimationFrame(() => {
            animImg.style.transition = "all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
            if (isFlipped) {
                animImg.style.right = `${endX + (sqSize * 0.075)}px`;
                animImg.style.bottom = `${endY + (sqSize * 0.075)}px`;
            } else {
                animImg.style.left = `${endX + (sqSize * 0.075)}px`;
                animImg.style.top = `${endY + (sqSize * 0.075)}px`;
            }
        });
        
        setTimeout(() => {
            animImg.remove();
            resolve();
        }, 250);
    });
}

function displayPromotionModal(colorChar) {
    const modal = document.getElementById("promotionModal");
    if (!modal) return;
    
    const grid = document.getElementById("promotionOptions");
    if (!grid) return;
    
    grid.innerHTML = "";
    const options = ["Q", "R", "B", "N"];
    
    options.forEach(type => {
        const img = document.createElement("img");
        img.src = `imgs/${colorChar}${type}.svg`;
        img.alt = type;
        img.onclick = () => executePawnPromotionChoice(type);
        grid.appendChild(img);
    });
    
    modal.classList.remove("hidden");
    document.body.classList.add("blur-active");
}

window.executePawnPromotionChoice = function(pieceType) {
    if (promotionSquare === null) return;
    
    const colorChar = gameState.currentTurn === "white" ? "w" : "b";
    boardState[promotionSquare] = colorChar + pieceType;
    
    const modal = document.getElementById("promotionModal");
    if (modal) modal.classList.add("hidden");
    document.body.classList.remove("blur-active");
    
    // Add promotion notation info to last move record
    if (gameMovesHistory.length > 0) {
        const lastMove = gameMovesHistory[gameMovesHistory.length - 1];
        lastMove.notation += `=${pieceType}`;
        
        const turnIdx = Math.floor((gameMovesHistory.length - 1) / 2);
        const isWhiteTurn = (gameMovesHistory.length - 1) % 2 === 0;
        if (gameHalfMovesHistory[turnIdx]) {
            if (isWhiteTurn) {
                gameHalfMovesHistory[turnIdx][0] = lastMove.notation;
            } else {
                gameHalfMovesHistory[turnIdx][1] = lastMove.notation;
            }
        }
        renderGameMovesList();
    }
    
    promotionSquare = null;
    renderChessPieces();
    
    // Resume standard turn switching
    switchClockTurns();
};

// ==========================================
// TURNS SWITCH & STATUS CHECK
// ==========================================

function switchClockTurns() {
    gameState.currentTurn = gameState.currentTurn === "white" ? "black" : "white";
    
    // 1. Board Rotation Triggers in Local Game Mode
    const board = document.getElementById("chessBoard");
    if (board) {
        if (gameMode === "local") {
            if (gameState.currentTurn === "black") {
                board.classList.add("board-rotated");
            } else {
                board.classList.remove("board-rotated");
            }
        } else {
            // Keep board aligned in bot play
            board.classList.remove("board-rotated");
        }
    }
    
    // 2. Validate End Game checkmates
    checkGameOutcomeEvaluations();
    
    // 3. Start eval calculations using stockfish
    requestStockfishEvaluation(boardToFEN());
    
    // 4. Trigger bot moves
    if (gameMode === "bot" && gameState.currentTurn === "black" && gameState.gameStarted) {
        triggerBotMoveTask();
    }
}

function checkGameOutcomeEvaluations() {
    const activeColor = gameState.currentTurn;
    const inCheck = verifyKingCheck(activeColor);
    const hasLegals = checkPlayerHasLegalMoves(activeColor);
    
    const alert = document.getElementById("checkAlert");
    
    if (inCheck) {
        if (alert) alert.classList.remove("hidden");
    } else {
        if (alert) alert.classList.add("hidden");
    }
    
    if (inCheck && !hasLegals) {
        endActiveGameMatch("checkmate", activeColor === "white" ? "black" : "white");
    } else if (!inCheck && !hasLegals) {
        endActiveGameMatch("stalemate", "draw");
    }
}

// Outcomes and statistics storage
function endActiveGameMatch(outcomeType, winnerColor) {
    gameState.gameStarted = false;
    clearInterval(gameState.timerInterval);
    
    // Record game outcome
    let opponentLabel = gameMode === "local" ? "Friend" : (selectedBot ? selectedBot.name : "Engine Bot");
    let opponentAvatar = gameMode === "local" ? "" : (selectedBot ? selectedBot.img : "");
    
    let recordOutcome = "draw";
    if (outcomeType === "checkmate" || outcomeType === "timeout") {
        if (winnerColor === "white") {
            recordOutcome = "win";
        } else {
            recordOutcome = "loss";
        }
    }
    
    // Save game record history
    saveGameRecord(opponentLabel, opponentAvatar, gameMode, recordOutcome, [...gameMovesHistory]);
    
    // Handle ELO Adjustments
    if (gameMode === "local") {
        // Local mode adjustments
        adjustEloRating(gameState.mode, recordOutcome);
    } else if (gameMode === "bot" && selectedBot) {
        // Bot challenge victories reward logic
        if (recordOutcome === "win") {
            const rewardData = recordBotVictory(selectedBot, gameState.mode);
            if (rewardData.earnedReward) {
                // Show fireworks celebration
                triggerFireworksCelebration();
                
                // Show celebration alert modal
                setTimeout(() => {
                    alert(`CHALLENGE COMPLETED! 🎉\n\nYou defeated ${selectedBot.name} 5 times in ${gameState.mode} mode!\nReward Claimed: +${rewardData.rewardAmount} ELO in ${gameState.mode}!`);
                }, 400);
            } else {
                alert(`Victory against ${selectedBot.name}! (${rewardData.wins}/5 wins completed)`);
            }
        } else if (recordOutcome === "loss") {
            // Deduct slightly for bot losses
            adjustEloRating(gameState.mode, "loss");
        }
    }
    
    // Show End Game Dialog Modal
    const title = document.getElementById("gameResultTitle");
    const subtitle = document.getElementById("gameResultSubtitle");
    
    if (outcomeType === "checkmate") {
        if (title) title.innerText = "Checkmate!";
        if (subtitle) subtitle.innerText = winnerColor === "white" ? "White Wins!" : "Black Wins!";
        playCheckmateAudioClip();
    } else if (outcomeType === "stalemate") {
        if (title) title.innerText = "Draw!";
        if (subtitle) subtitle.innerText = "Stalemate - No moves left.";
    } else if (outcomeType === "timeout") {
        if (title) title.innerText = "Time Over!";
        if (subtitle) subtitle.innerText = winnerColor === "white" ? "White Wins on Time!" : "Black Wins on Time!";
    }
    
    const overModal = document.getElementById("gameOverModal");
    if (overModal) overModal.classList.remove("hidden");
    document.body.classList.add("blur-active");
}

// ==========================================
// NOTATION & CAPTURES UI BUILDERS
// ==========================================

function getSquareAlgebraicCoordinate(idx) {
    const file = "abcdefgh"[idx % 8];
    const rank = 8 - Math.floor(idx / 8);
    return file + rank;
}

function getPieceLetterCode(pieceSymbol) {
    const code = pieceSymbol[1];
    if (code === "P") return "";
    return code;
}

function generateChessMoveNotation(from, to, piece, captured, castling) {
    if (castling) {
        return (to === 62 || to === 6) ? "O-O" : "O-O-O";
    }
    
    const letter = getPieceLetterCode(piece);
    const targetCell = getSquareAlgebraicCoordinate(to);
    
    let notation = letter;
    if (captured) {
        if (piece[1] === "P") {
            // Pawn captures require start file letter (e.g. exd5)
            notation += "abcdefgh"[from % 8];
        }
        notation += "x";
    }
    notation += targetCell;
    
    // Verify check notation triggers (+ symbol)
    const enemyColor = piece[0] === "w" ? "black" : "white";
    
    // Since the move is already applied to boardState, we evaluate the check state directly
    const checkState = verifyKingCheck(enemyColor);
    
    if (checkState) {
        notation += "+";
    }
    
    return notation;
}

function recordGameHistoryMove(from, to, piece, notation) {
    gameMovesHistory.push({
        from: from,
        to: to,
        piece: piece,
        notation: notation
    });
    
    // Group into turns pairs for sidebar notations list
    if (piece[0] === "w") {
        gameHalfMovesHistory.push([notation, ""]);
    } else if (gameHalfMovesHistory.length > 0) {
        gameHalfMovesHistory[gameHalfMovesHistory.length - 1][1] = notation;
    } else {
        gameHalfMovesHistory.push(["", notation]);
    }
    
    renderGameMovesList();
}

function renderGameMovesList() {
    const list = document.getElementById("moveList");
    if (!list) return;
    list.innerHTML = "";
    
    gameHalfMovesHistory.forEach((turn, idx) => {
        const row = document.createElement("div");
        row.className = "move-row";
        
        row.innerHTML = `
            <span class="move-number">${idx + 1}.</span>
            <span class="move highlighted">${turn[0]}</span>
            <span class="moveHighlighted move">${turn[1]}</span>
        `;
        list.appendChild(row);
    });
    list.scrollTop = list.scrollHeight;
}

function updateCapturesUI() {
    const topCaptures = document.getElementById("topCaptures");
    const bottomCaptures = document.getElementById("bottomCaptures");
    
    if (topCaptures) {
        topCaptures.innerHTML = "";
        capturedByBlack.forEach(piece => {
            const img = document.createElement("img");
            img.src = `imgs/${piece}.svg`;
            topCaptures.appendChild(img);
        });
    }
    
    if (bottomCaptures) {
        bottomCaptures.innerHTML = "";
        capturedByWhite.forEach(piece => {
            const img = document.createElement("img");
            img.src = `imgs/${piece}.svg`;
            bottomCaptures.appendChild(img);
        });
    }
}

// Convert board representation to standard FEN syntax string
window.boardToFEN = function() {
    let fen = "";
    let empty = 0;
    
    for (let i = 0; i < 64; i++) {
        const piece = boardState[i];
        if (!piece) {
            empty++;
        } else {
            if (empty > 0) {
                fen += empty;
                empty = 0;
            }
            const color = piece[0];
            const type = piece[1];
            let charCode = type === "P" ? "p" : type.toLowerCase();
            if (color === "w") {
                charCode = charCode.toUpperCase();
            }
            fen += charCode;
        }
        
        // Row ends
        if ((i + 1) % 8 === 0) {
            if (empty > 0) {
                fen += empty;
                empty = 0;
            }
            if (i !== 63) {
                fen += "/";
            }
        }
    }
    
    // active turn
    const turn = gameState.currentTurn === "white" ? "w" : "b";
    
    // castling rights
    let castling = "";
    if (!movedPieces.wK && !movedPieces.wR7) castling += "K";
    if (!movedPieces.wK && !movedPieces.wR0) castling += "Q";
    if (!movedPieces.bK && !movedPieces.bR7) castling += "k";
    if (!movedPieces.bK && !movedPieces.bR0) castling += "q";
    if (castling === "") castling = "-";
    
    // en passant coordinate
    let ep = "-";
    if (enPassantTarget !== null) {
        ep = getSquareAlgebraicCoordinate(enPassantTarget);
    }
    
    return `${fen} ${turn} ${castling} ${ep} 0 1`;
};

// ==========================================
// AUDIO EFFECTS SYSTEM
// ==========================================

function playMoveAudioClip() {
    const audio = document.getElementById("moveSound");
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Audio play blocked", e));
    }
}

function playCaptureAudioClip() {
    const audio = document.getElementById("captureSound");
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Audio play blocked", e));
    }
}

function playCheckmateAudioClip() {
    const audio = document.getElementById("checkmateSound");
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Audio play blocked", e));
    }
}

// ==========================================
// CELEBRATION EFFECTS
// ==========================================

function triggerFireworksCelebration() {
    const container = document.getElementById("celebration");
    if (!container) return;
    
    container.classList.remove("hidden");
    container.innerHTML = "";
    
    const colors = ["#22c55e", "#3b82f6", "#ef4444", "#eab308", "#a855f7", "#06b6d4"];
    
    for (let i = 0; i < 80; i++) {
        const confetti = document.createElement("div");
        confetti.className = "confetti";
        confetti.style.left = `${Math.random() * 100}vw`;
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.transform = `scale(${0.5 + Math.random()})`;
        
        // Random falling properties
        const duration = 1.5 + (Math.random() * 2);
        const delay = Math.random() * 0.5;
        confetti.style.animation = `confettiFall ${duration}s ease-out ${delay}s forwards`;
        
        container.appendChild(confetti);
    }
    
    setTimeout(() => {
        container.classList.add("hidden");
        container.innerHTML = "";
    }, 4500);
}

// Expose core function globally
window.executePawnPieceMove = executePawnPieceMove;
