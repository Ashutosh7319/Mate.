// ==========================================
// STOCKFISH ENGINE CONNECTOR (UCI PROTOCOL)
// ==========================================

let stockfishWorker = null;
let evalWorker = null;
let bestMoveCallback = null;
let evalCallback = null;

// Initialise Stockfish web worker for moves generation
function getStockfishWorker() {
    if (!stockfishWorker) {
        stockfishWorker = new Worker("js/stockfish.js");
        stockfishWorker.postMessage("uci");
        stockfishWorker.postMessage("isready");
        
        stockfishWorker.onmessage = function(e) {
            const line = e.data;
            // console.log("Bot Engine Output:", line);
            
            if (line.startsWith("bestmove")) {
                const parts = line.split(" ");
                const bestmove = parts[1];
                if (bestMoveCallback && bestmove && bestmove !== "(none)") {
                    const callback = bestMoveCallback;
                    bestMoveCallback = null;
                    callback(bestmove);
                }
            }
        };
    }
    return stockfishWorker;
}

// Initialise a separate Stockfish worker for eval evaluations (prevents process locks)
function getEvalWorker() {
    if (!evalWorker) {
        evalWorker = new Worker("js/stockfish.js");
        evalWorker.postMessage("uci");
        evalWorker.postMessage("isready");
        
        evalWorker.onmessage = function(e) {
            const line = e.data;
            // console.log("Eval Engine Output:", line);
            
            if (line.includes("score")) {
                parseEvaluationScoreLine(line);
            }
        };
    }
    return evalWorker;
}

// Terminate workers on exit
window.terminateStockfishWorker = function() {
    if (stockfishWorker) {
        stockfishWorker.terminate();
        stockfishWorker = null;
    }
    if (evalWorker) {
        evalWorker.terminate();
        evalWorker = null;
    }
    bestMoveCallback = null;
    evalCallback = null;
};

// ==========================================
// EVALUATION PARSER & UI fill bar
// ==========================================

function parseEvaluationScoreLine(line) {
    // line format: "info depth 8 seldepth 8 score cp 24 nodes..." or "score mate -2"
    const parts = line.split(" ");
    const scoreIdx = parts.indexOf("score");
    if (scoreIdx === -1) return;
    
    const type = parts[scoreIdx + 1]; // "cp" or "mate"
    const value = parseInt(parts[scoreIdx + 2]);
    
    if (isNaN(value)) return;
    
    let evaluationScore = 0.0;
    let displayScore = "0.0";
    let isWhiteAdvantage = true;
    
    // Check active side from turn
    const activeColor = gameState.currentTurn;
    const isWhiteActive = activeColor === "white";
    
    if (type === "cp") {
        // Centipawns to score converter (100 cp = 1.0 pawn score)
        let cp = value;
        // Stockfish scores are from the perspective of the side moving
        if (!isWhiteActive) {
            cp = -cp;
        }
        
        evaluationScore = cp / 100;
        displayScore = evaluationScore > 0 ? `+${evaluationScore.toFixed(1)}` : evaluationScore.toFixed(1);
    } else if (type === "mate") {
        let mate = value;
        if (!isWhiteActive) {
            mate = -mate;
        }
        evaluationScore = mate > 0 ? 10.0 : -10.0; // Max out height for mate
        displayScore = mate > 0 ? `+M${Math.abs(mate)}` : `-M${Math.abs(mate)}`;
    }
    
    // Call analysis handlers if active
    if (evalCallback) {
        evalCallback(evaluationScore, displayScore);
        return;
    }
    
    // Update Active Game UI Eval fill bar
    updateEvalBarGraphics("evalFill", "evalScore", evaluationScore, displayScore);
}

function updateEvalBarGraphics(fillId, scoreId, score, displayStr) {
    const fill = document.getElementById(fillId);
    const text = document.getElementById(scoreId);
    if (!text) return;
    
    text.innerText = displayStr;
    
    if (!fill) return;
    
    // Map score -5.0 to +5.0 into height percentages 10% to 90%
    let percentage = 50 + (score * 8);
    percentage = Math.max(10, Math.min(90, percentage));
    
    // Invert because the fill element represents WHITE's advantage from the bottom
    fill.style.height = `${percentage}%`;
}

// Request Stockfish analysis evaluation
window.requestStockfishEvaluation = function(fen, callback = null) {
    const worker = getEvalWorker();
    evalCallback = callback;
    
    worker.postMessage("stop");
    worker.postMessage(`position fen ${fen}`);
    worker.postMessage("go depth 10"); // fast calculation depth
};

// ==========================================
// BOT MOVES GENERATION
// ==========================================

// Triggered by turn-switching, requests bot moves
window.triggerBotMoveTask = function() {
    if (!selectedBot || gameMode !== "bot" || gameState.currentTurn !== "black") return;
    
    const fen = boardToFEN();
    const elo = selectedBot.elo;
    const thinkTime = selectedBot.thinking;
    
    const botSpeech = document.getElementById("botSpeech");
    if (botSpeech) {
        // Randomise dialogue triggers
        const dialogueList = BOT_DIALOGUES[selectedBot.id] || ["Let's see...", "A logical step.", "My turn!"];
        botSpeech.innerText = dialogueList[Math.floor(Math.random() * dialogueList.length)];
        botSpeech.style.opacity = 1;
    }
    
    requestBotMove(fen, elo, thinkTime, (bestmove) => {
        // Parse move indices e.g. "e2e4" -> fromIdx, toIdx
        const fromSquare = bestmove.substring(0, 2);
        const toSquare = bestmove.substring(2, 4);
        
        const fromIdx = algebraicSquareToIndex(fromSquare);
        const toIdx = algebraicSquareToIndex(toSquare);
        
        // Execute move on the active board
        setTimeout(() => {
            executePawnPieceMove(fromIdx, toIdx);
            
            // Fade speech bubs slightly after moving
            setTimeout(() => {
                if (botSpeech) botSpeech.style.opacity = 0.85;
            }, 600);
        }, 150);
    });
};

function requestBotMove(fen, elo, thinkTime, callback) {
    const worker = getStockfishWorker();
    bestMoveCallback = callback;
    
    worker.postMessage("stop");
    worker.postMessage(`position fen ${fen}`);
    
    // Configure ELO and skill caps to scale bot difficulty
    worker.postMessage("setoption name UCI_LimitStrength value true");
    worker.postMessage(`setoption name UCI_Elo value ${elo}`);
    
    worker.postMessage(`go movetime ${thinkTime}`);
}

function algebraicSquareToIndex(squareStr) {
    const file = squareStr.charCodeAt(0) - 97; // "a" is 97
    const rank = 8 - parseInt(squareStr[1]);
    return rank * 8 + file;
}

// Expose evaluation UI updates globally
window.updateEvalBarGraphics = updateEvalBarGraphics;