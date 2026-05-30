let stockfish = null;
// let selectedBot = null;

function initStockfish() {

    if (stockfish) return;

    stockfish = new Worker("js/stockfish.js");

    stockfish.postMessage("uci");

    stockfish.onmessage = function (event) {

        const line = event.data;

        // ======================
        // BOT MOVE
        // ======================
        if (line.startsWith("bestmove")) {

            // Do not play moves during analysis mode
            if (typeof analysisMoves !== "undefined") return;

            const move = line.split(" ")[1];

            playStockfishMove(move);

            if (typeof showBestMoveArrow === "function") {

                const move = line.split(" ")[1];

                const from = squareToIndex(move.substring(0, 2));
                const to = squareToIndex(move.substring(2, 4));

                showBestMoveArrow(from, to);
            }
        }

        // ======================
        // STOCKFISH EVALUATION
        // ======================
        if (line.includes("score cp")) {

            const score = parseInt(line.split("score cp ")[1]);

            if (!isNaN(score) && typeof updateEvaluation === "function") {
                updateEvaluation(score / 100);
            }
        }

        if (line.includes("score mate")) {

            const mate = parseInt(line.split("score mate ")[1]);

            if (!isNaN(mate)) {
                updateEvaluation(mate > 0 ? 10 : -10);
            }
        }
    };
}

function boardToFEN() {

    let fen = "";
    let empty = 0;

    for (let i = 0; i < 64; i++) {

        const piece = boardState[i];

        if (!piece) {
            empty++;
        } else {

            if (empty) {
                fen += empty;
                empty = 0;
            }

            const color = piece[0];
            const type = piece[1];

            const map = {
                P: "p",
                R: "r",
                N: "n",
                B: "b",
                Q: "q",
                K: "k"
            };

            let char = map[type];

            if (color === "w")
                char = char.toUpperCase();

            fen += char;
        }

        if ((i + 1) % 8 === 0) {

            if (empty) {
                fen += empty;
                empty = 0;
            }

            if (i !== 63) fen += "/";
        }
    }

    // turn
    const turn = gameState.currentTurn === "white" ? "w" : "b";

    // castling rights
    let castling = "";

    if (!movedPieces.wK && !movedPieces.wR7) castling += "K";
    if (!movedPieces.wK && !movedPieces.wR0) castling += "Q";
    if (!movedPieces.bK && !movedPieces.bR7) castling += "k";
    if (!movedPieces.bK && !movedPieces.bR0) castling += "q";

    if (castling === "") castling = "-";

    // en passant
    let ep = "-";
    if (enPassantTarget !== null) {
        ep = indexToSquare(enPassantTarget);
    }

    return `${fen} ${turn} ${castling} ${ep} 0 1`;
}

function requestStockfishMove() {

    initStockfish();

    if (!selectedBot) return; // safety check

    const fen = boardToFEN();
    // const thinkTime = selectedBot.thinking || 600;
    const thinkTime = Math.max(selectedBot.thinking || 600, 400);
    const elo = selectedBot.elo || 1200;

    // send board position
    stockfish.postMessage("position fen " + fen);

    // limit engine strength
    stockfish.postMessage("setoption name UCI_LimitStrength value true");
    stockfish.postMessage("setoption name UCI_Elo value " + elo);

    // start calculation
    stockfish.postMessage("go movetime " + thinkTime);
}

function getBotSkill() {

    if (!selectedBot) return 5; // default skill

    const skillMap = {
        levy: 2,
        anna: 5,
        eric: 8,
        hikaru: 12,
        fabi: 15,
        ding: 16,
        anand: 17,
        kasparov: 18,
        magnus: 20
    };

    return skillMap[selectedBot.id] || 10;
}

function squareToIndex(square) {

    const file = square.charCodeAt(0) - 97;
    const rank = 8 - parseInt(square[1]);

    return rank * 8 + file;
}

function playStockfishMove(move) {

    const from = squareToIndex(move.substring(0, 2));
    const to = squareToIndex(move.substring(2, 4));

    makeMove(from, to);
}