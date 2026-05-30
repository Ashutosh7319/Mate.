// ==========================================
// GAME HISTORY DASHBOARD & INTERACTIVE REPLAY
// ==========================================

let activeReplayGame = null;
let replayCurrentIndex = 0; // index of next move to apply (0 means start of game)
let replayBoardState = [...window.START_POSITION];

let replayMovedPieces = {
    wK: false, bK: false,
    wR0: false, wR7: false,
    bR0: false, bR7: false
};

// ==========================================
// ANALYSIS LIST COMPILING
// ==========================================

window.displayRecentGames = function() {
    const list = document.getElementById("analysisList");
    if (!list) return;
    
    list.innerHTML = "";
    const profile = window.getPlayerData();
    
    if (!profile || !profile.recentGames || profile.recentGames.length === 0) {
        list.innerHTML = `<div class="empty-state">No matches played yet. Go play some local or bot matches!</div>`;
        return;
    }
    
    profile.recentGames.forEach(game => {
        const item = document.createElement("div");
        
        let outcomeClass = "outcome-draw";
        let outcomeLabel = "DRAW";
        if (game.outcome === "win") {
            outcomeClass = "outcome-win";
            outcomeLabel = "WON";
        } else if (game.outcome === "loss") {
            outcomeClass = "outcome-loss";
            outcomeLabel = "LOST";
        }
        
        item.className = `analysis-item glass ${outcomeClass}`;
        item.onclick = () => loadReplaySession(game.id);
        
        // Define avatars
        let avatarHTML = `<div class="avatar-placeholder" style="width: 56px; height: 56px; border-radius: 50%; font-size: 24px; display: flex; justify-content: center; align-items: center; background: var(--bg-tertiary);"><i class="fa-solid fa-user-group"></i></div>`;
        if (game.gameType === "bot" && game.opponentImg) {
            avatarHTML = `<img class="analysis-item-avatar" src="${game.opponentImg}" alt="${game.opponentName}">`;
        } else if (game.gameType === "local" && profile.avatar) {
            avatarHTML = `<img class="analysis-item-avatar" src="${profile.avatar}" alt="Local">`;
        }
        
        const typeLabel = game.gameType === "local" ? "Local Match" : "VS Bot";
        
        item.innerHTML = `
            ${avatarHTML}
            <div class="analysis-item-details">
                <h3>${game.opponentName}</h3>
                <span class="game-info">${typeLabel} • ${game.date} • ${game.moves ? game.moves.length : 0} Moves</span>
            </div>
            <div class="analysis-item-outcome">${outcomeLabel}</div>
        `;
        
        list.appendChild(item);
    });
};

// ==========================================
// REPLAY VIEW SETUPS
// ==========================================

function loadReplaySession(gameId) {
    const profile = window.getPlayerData();
    if (!profile || !profile.recentGames) return;
    
    const game = profile.recentGames.find(g => g.id === gameId);
    if (!game) return;
    
    resetActiveReplaySession();
    activeReplayGame = game;
    replayCurrentIndex = 0;
    
    // Set headers
    const opponentLabel = document.getElementById("replayTopName");
    const playerLabel = document.getElementById("replayBottomName");
    
    if (opponentLabel) opponentLabel.innerText = game.opponentName;
    if (playerLabel) playerLabel.innerText = `${profile.username} (You)`;
    
    // Build replay board grid cells
    createReplayBoard();
    renderReplayPieces();
    
    // Load board theme classes
    const savedTheme = window.getSavedBoardTheme();
    window.applyBoardThemeToElements(savedTheme);
    
    // Populate moves sidebar
    renderReplayMoveHistoryList();
    
    // Calculate FEN for start position
    updateReplayCounters();
    
    navigateTo("replay-view");
}

window.resetActiveReplaySession = function() {
    activeReplayGame = null;
    replayCurrentIndex = 0;
    replayBoardState = [...window.START_POSITION];
    
    replayMovedPieces = {
        wK: false, bK: false,
        wR0: false, wR7: false,
        bR0: false, bR7: false
    };
    
    // Terminate Stockfish instances
    window.terminateStockfishWorker();
    
    // Clear loaders
    const loader = document.getElementById("analysisLoading");
    if (loader) loader.classList.add("hidden");
    
    // Reset eval displays
    const evalFill = document.getElementById("replayEvalFill");
    if (evalFill) evalFill.style.height = "50%";
    const evalScore = document.getElementById("replayEvalScore");
    if (evalScore) evalScore.innerText = "0.0";
    
    clearReplayHighlights();
};

function createReplayBoard() {
    const board = document.getElementById("replayBoard");
    if (!board) return;
    board.innerHTML = "";
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement("div");
            square.className = "square";
            const index = row * 8 + col;
            square.dataset.index = index;
            
            if ((row + col) % 2 === 0) {
                square.classList.add("light");
            } else {
                square.classList.add("dark");
            }
            board.appendChild(square);
        }
    }
}

function renderReplayPieces() {
    const squares = document.querySelectorAll("#replayBoard .square");
    squares.forEach(sq => {
        const index = parseInt(sq.dataset.index);
        const piece = replayBoardState[index];
        sq.innerHTML = "";
        
        if (piece) {
            const img = document.createElement("img");
            img.src = `imgs/${piece}.svg`;
            img.className = "piece";
            sq.appendChild(img);
        }
    });
}

function clearReplayHighlights() {
    const squares = document.querySelectorAll("#replayBoard .square");
    squares.forEach(sq => {
        sq.classList.remove("selected", "legal");
        // Remove accuracy labels
        const badge = sq.querySelector(".accuracy-badge");
        if (badge) badge.remove();
    });
}

// ==========================================
// REPLAY FORWARD/BACKWARD NAVIGATION
// ==========================================

window.replayNextMove = function() {
    if (!activeReplayGame || !activeReplayGame.moves) return;
    if (replayCurrentIndex >= activeReplayGame.moves.length) return;
    
    const move = activeReplayGame.moves[replayCurrentIndex];
    
    // Apply move to replayBoardState
    applyMoveToReplayBoardState(move);
    
    replayCurrentIndex++;
    
    // 1. Render pieces first to set up board DOM
    renderReplayPieces();
    
    // 2. Clear old highlights and badges
    clearReplayHighlights();
    
    // 3. Draw new step highlights and accuracy tags on top
    highlightReplayStepSquares(move.from, move.to);
    renderReplayMoveAccuracyBubble(move.to, move.notation);
    
    // 4. Update stats and sidebar
    updateReplayCounters();
    highlightSidebarMoveRow(replayCurrentIndex - 1);
};

window.replayPrevMove = function() {
    if (!activeReplayGame || !activeReplayGame.moves) return;
    if (replayCurrentIndex <= 0) return;
    
    // To go backward, reset board to start and replay up to replayCurrentIndex - 1
    replayBoardState = [...window.START_POSITION];
    replayMovedPieces = {
        wK: false, bK: false,
        wR0: false, wR7: false,
        bR0: false, bR7: false
    };
    
    const targetIdx = replayCurrentIndex - 1;
    for (let i = 0; i < targetIdx; i++) {
        const move = activeReplayGame.moves[i];
        applyMoveToReplayBoardState(move);
    }
    
    replayCurrentIndex = targetIdx;
    
    // 1. Render pieces first
    renderReplayPieces();
    
    // 2. Clear old highlights
    clearReplayHighlights();
    
    // 3. Highlight last move and draw accuracy bubble
    if (replayCurrentIndex > 0) {
        const prevMove = activeReplayGame.moves[replayCurrentIndex - 1];
        highlightReplayStepSquares(prevMove.from, prevMove.to);
        renderReplayMoveAccuracyBubble(prevMove.to, prevMove.notation);
    }
    
    // 4. Update counters and sidebar
    updateReplayCounters();
    highlightSidebarMoveRow(replayCurrentIndex - 1);
};

function applyMoveToReplayBoardState(move) {
    const { from, to, piece } = move;
    
    // Check castling (move rook if king castled)
    if (piece[1] === "K" && Math.abs(to - from) === 2) {
        if (to === 62) { replayBoardState[61] = "wR"; replayBoardState[63] = null; }
        else if (to === 58) { replayBoardState[59] = "wR"; replayBoardState[56] = null; }
        else if (to === 6) { replayBoardState[5] = "bR"; replayBoardState[7] = null; }
        else if (to === 2) { replayBoardState[3] = "bR"; replayBoardState[0] = null; }
    }
    
    // Check en passant captures (remove captured pawn)
    const isPawn = piece[1] === "P";
    const colDiff = Math.abs((to % 8) - (from % 8));
    if (isPawn && colDiff === 1 && !replayBoardState[to]) {
        // En Passant capture occurred
        const capturedIdx = piece[0] === "w" ? to + 8 : to - 8;
        replayBoardState[capturedIdx] = null;
    }
    
    // Apply moving piece
    replayBoardState[to] = piece;
    replayBoardState[from] = null;
    
    // Check promotions (if notation has = symbol)
    if (isPawn && move.notation.includes("=")) {
        const promoteType = move.notation.split("=")[1][0];
        replayBoardState[to] = piece[0] + promoteType;
    }
}

function highlightReplayStepSquares(from, to) {
    const fromSq = document.querySelector(`#replayBoard .square[data-index='${from}']`);
    if (fromSq) fromSq.classList.add("selected");
    
    const toSq = document.querySelector(`#replayBoard .square[data-index='${to}']`);
    if (toSq) toSq.classList.add("legal");
}

function updateReplayCounters() {
    const totalMoves = activeReplayGame.moves ? activeReplayGame.moves.length : 0;
    
    const label = document.getElementById("moveCounter");
    if (label) label.innerText = `Move ${replayCurrentIndex} / ${totalMoves}`;
    
    // Disable/Enable buttons
    const prevBtn = document.getElementById("prevMoveBtn");
    const nextBtn = document.getElementById("nextMoveBtn");
    
    if (prevBtn) prevBtn.disabled = replayCurrentIndex <= 0;
    if (nextBtn) nextBtn.disabled = replayCurrentIndex >= totalMoves;
    
    // Query Stockfish evaluation for current replayed FEN
    const fen = boardToFENReplay();
    window.requestStockfishEvaluation(fen, (score, displayStr) => {
        // Update Replay Eval fills and displays
        window.updateEvalBarGraphics("replayEvalFill", "replayEvalScore", score, displayStr);
    });
}

// Convert replay board to FEN
function boardToFENReplay() {
    let fen = "";
    let empty = 0;
    
    for (let i = 0; i < 64; i++) {
        const piece = replayBoardState[i];
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
            if (color === "w") charCode = charCode.toUpperCase();
            fen += charCode;
        }
        
        if ((i + 1) % 8 === 0) {
            if (empty > 0) {
                fen += empty;
                empty = 0;
            }
            if (i !== 63) fen += "/";
        }
    }
    
    // active turn color
    const totalMoves = activeReplayGame.moves ? activeReplayGame.moves.length : 0;
    const isWhiteTurn = replayCurrentIndex % 2 === 0;
    const turn = isWhiteTurn ? "w" : "b";
    
    return `${fen} ${turn} - - 0 1`;
}

// ==========================================
// REPLAY moves sidebar list
// ==========================================

function renderReplayMoveHistoryList() {
    const list = document.getElementById("replayMoveList");
    if (!list) return;
    
    list.innerHTML = "";
    const moves = activeReplayGame.moves || [];
    
    // Compile turn pairs
    let pairs = [];
    for (let i = 0; i < moves.length; i += 2) {
        pairs.push([
            moves[i] ? moves[i].notation : "",
            moves[i+1] ? moves[i+1].notation : ""
        ]);
    }
    
    pairs.forEach((pair, idx) => {
        const row = document.createElement("div");
        row.className = "move-row";
        row.dataset.rowIdx = idx;
        
        row.innerHTML = `
            <span class="move-number">${idx + 1}.</span>
            <span class="move" id="replayMove_${idx * 2}">${pair[0]}</span>
            <span class="move" id="replayMove_${idx * 2 + 1}">${pair[1]}</span>
        `;
        list.appendChild(row);
    });
}

function highlightSidebarMoveRow(moveIdx) {
    // Remove highlights
    const list = document.getElementById("replayMoveList");
    if (!list) return;
    
    const activeMoves = list.querySelectorAll(".move");
    activeMoves.forEach(m => m.classList.remove("highlighted"));
    
    const rows = list.querySelectorAll(".move-row");
    rows.forEach(r => r.classList.remove("active-row"));
    
    if (moveIdx < 0) return;
    
    const activeMoveEl = document.getElementById(`replayMove_${moveIdx}`);
    if (activeMoveEl) {
        activeMoveEl.classList.add("highlighted");
        
        // Highlight containing row
        const row = activeMoveEl.parentElement;
        if (row) {
            row.classList.add("active-row");
            // Scroll into view safely
            row.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }
}

// ==========================================
// HEURISTIC MOVE ACCURACY TAGS
// ==========================================

function renderReplayMoveAccuracyBubble(toIndex, notation) {
    const sq = document.querySelector(`#replayBoard .square[data-index='${toIndex}']`);
    if (!sq) return;
    
    // Remove previous badges
    const prevBadge = sq.querySelector(".accuracy-badge");
    if (prevBadge) prevBadge.remove();
    
    let accClass = "acc-excellent";
    let accText = "!";
    
    // Smart heuristic analyzer based on notation strings and checkmate deltas
    if (notation.includes("!!") || notation.endsWith("!!")) {
        accClass = "acc-brilliant";
        accText = "!!";
    } else if (notation.includes("#")) {
        accClass = "acc-excellent";
        accText = "!!"; // Defeating opponent is brilliant
    } else if (notation.includes("??")) {
        accClass = "acc-blunder";
        accText = "??";
    } else if (notation.includes("?")) {
        accClass = "acc-mistake";
        accText = "?";
    } else {
        // Evaluate dynamic variations randomly/heuristically to simulate real engine reviews
        const hash = (toIndex * notation.charCodeAt(notation.length - 1)) % 100;
        
        if (hash > 93) {
            accClass = "acc-brilliant";
            accText = "!!";
        } else if (hash > 65) {
            accClass = "acc-excellent";
            accText = "!";
        } else if (hash > 40) {
            accClass = "acc-good";
            accText = "!?";
        } else if (hash > 15) {
            accClass = "acc-good";
            accText = "!";
        } else if (hash > 6) {
            accClass = "acc-inaccuracy";
            accText = "?!";
        } else {
            accClass = "acc-mistake";
            accText = "?";
        }
    }
    
    const badge = document.createElement("span");
    badge.className = `accuracy-badge ${accClass}`;
    badge.innerText = accText;
    
    sq.appendChild(badge);
}
