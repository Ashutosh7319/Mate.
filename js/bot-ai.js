const PIECE_VALUES = {
    P: 100,
    N: 320,
    B: 330,
    R: 500,
    Q: 900,
    K: 20000
};

const TRANSPOSITION_TABLE = new Map();
function hashBoard() {

    return boardState.join("");
}

const BOTS = [

    {
        id: "levy",
        name: "Levy Rozman",
        elo: 900,
        depth: 2,
        style: "tricky",
        thinking: 400,
        img: "bots/levy.jpg"
    },

    {
        id: "anna",
        name: "Anna Cramling",
        elo: 1200,
        depth: 3,
        style: "positional",
        thinking: 500,
        img: "bots/anna.jpg"
    },

    {
        id: "eric",
        name: "Eric Rosen",
        elo: 1500,
        depth: 3,
        style: "creative",
        thinking: 600,
        img: "bots/eric.jpeg"
    },

    {
        id: "hikaru",
        name: "Hikaru Nakamura",
        elo: 2200,
        depth: 4,
        style: "aggressive",
        thinking: 700,
        img: "bots/hikaru.jpg"
    },

    {
        id: "fabi",
        name: "Fabiano Caruana",
        elo: 2400,
        depth: 5,
        style: "classical",
        thinking: 800,
        img: "bots/fabi.jpg"
    },

    {
        id: "ding",
        name: "Ding Liren",
        elo: 2600,
        depth: 5,
        style: "solid",
        thinking: 900,
        img: "bots/ding.jpg"
    },

    {
        id: "anand",
        name: "Viswanathan Anand",
        elo: 2700,
        depth: 5,
        style: "rapid",
        thinking: 900,
        img: "bots/anand.jpeg"
    },

    {
        id: "kasparov",
        name: "Garry Kasparov",
        elo: 2800,
        depth: 6,
        style: "attacking",
        thinking: 1000,
        img: "bots/kasparov.jpg"
    },

    {
        id: "magnus",
        name: "Magnus Carlsen",
        elo: 2880,
        depth: 7,
        style: "universal",
        thinking: 1200,
        img: "bots/magnus.jpg"
    }

];

const BOT_DIALOGUE = {

    levy: [
        "Interesting move!",
        "You fell into my trap!",
        "That looks suspicious..."
    ],

    anna: [
        "Let’s keep it calm.",
        "I like this position.",
        "This feels strategic."
    ],

    eric: [
        "Tricky position!",
        "You didn’t see that coming.",
        "Gambits are fun!"
    ],

    hikaru: [
        "Speed chess time.",
        "That was fast.",
        "I see tactics."
    ],

    magnus: [
        "Hmm...",
        "Let’s play some real chess.",
        "This position is mine."
    ]

};

function makeBotMove() {

    if (!selectedBot) return;
    if (gameMode !== "bot") return;
    if (gameState.currentTurn !== botColor) return;
    if (botThinking) return;

    botThinking = true;

    setTimeout(() => {

        let move = null;

        // ⭐ Opening phase (first move for bot)
        if (moveHistory.length === 0 && botColor === "white") {

            const openings = OPENING_BOOK.start;
            move = openings[Math.floor(Math.random() * openings.length)];

        }

        // ⭐ Bot reply to player's first move
        else if (moveHistory.length === 1 && botColor === "black") {

            const firstMove = moveHistory[0][0];

            if (OPENING_BOOK[firstMove]) {

                const replies = OPENING_BOOK[firstMove];
                move = replies[Math.floor(Math.random() * replies.length)];

            }

        }

        if (move) {

            makeMove(move.from, move.to);

        } else {

            // fallback to stockfish
            requestStockfishMove();

        }

        botSpeak();
        botThinking = false;

    }, selectedBot?.thinking || 600);
}

function generateAllMoves(color) {

    const moves = [];

    for (let i = 0; i < 64; i++) {

        const piece = boardState[i];

        if (!piece) continue;

        if (piece[0] !== color) continue;

        const legalMoves = getLegalMoves(i);

        legalMoves.forEach(move => {

            moves.push({
                from: i,
                to: move
            });

        });

    }

    return moves;
}

const PAWN_TABLE = [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0
];

const KNIGHT_TABLE = [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50
];

const BISHOP_TABLE = [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20
];

function evaluateBoard() {

    let score = 0;

    // checkmate detection
    if (isKingInCheck("w") && !playerHasLegalMoves("w")) {
        return 999999;
    }

    if (isKingInCheck("b") && !playerHasLegalMoves("b")) {
        return -999999;
    }

    boardState.forEach((piece, index) => {

        if (!piece) return;

        const type = piece[1];
        const value = PIECE_VALUES[type];

        let positional = 0;

        if (type === "P") positional = PAWN_TABLE[index];
        if (type === "N") positional = KNIGHT_TABLE[index];
        if (type === "B") positional = BISHOP_TABLE[index];

        const total = value + positional;

        if (piece[0] === "b")
            score += total;
        else
            score -= total;

        if (moveHistory.length > 6) {
            score -= 5;
        }

    });

    // MOBILITY EVALUATION

    let whiteMobility = 0;
    let blackMobility = 0;

    for (let i = 0; i < 64; i++) {

        const piece = boardState[i];

        if (!piece) continue;

        const moves = getPsuedoMoves(i).length;

        if (piece[0] === "w")
            whiteMobility += moves;
        else
            blackMobility += moves;
    }

    // mobility weight
    score += (blackMobility - whiteMobility) * 5;
    // KING SAFETY

    const whiteKingDanger = evaluateKingSafety("w");
    const blackKingDanger = evaluateKingSafety("b");

    score += whiteKingDanger;
    score -= blackKingDanger;

    return score;
}

function evaluateKingSafety(color) {

    const kingIndex = findKing(color);
    if (kingIndex === -1) return 0;

    const { row, col } = indexToRowCol(kingIndex);

    let penalty = 0;

    const directions = [
        [-1, 0], [1, 0], [0, -1], [0, 1],
        [-1, -1], [-1, 1], [1, -1], [1, 1]
    ];

    directions.forEach(([dr, dc]) => {

        const r = row + dr;
        const c = col + dc;

        if (!isInsideBoard(r, c)) return;

        const idx = rowColToIndex(r, c);
        const piece = boardState[idx];

        // empty square near king = slightly unsafe
        if (!piece) penalty += 5;

        // enemy piece near king = very unsafe
        if (piece && piece[0] !== color) penalty += 15;

    });

    return penalty;
}

function minimax(depth, alpha, beta, isMaximizing) {

    const key = hashBoard() + depth + isMaximizing;

    if (TRANSPOSITION_TABLE.has(key)) {
        return TRANSPOSITION_TABLE.get(key);
    }

    if (depth === 0)
        return quiescence(alpha, beta);

    if (isMaximizing) {

        let bestScore = -Infinity;
        const moves = generateAllMoves("b");

        for (const move of moves) {

            const captured = boardState[move.to];

            boardState[move.to] = boardState[move.from];
            boardState[move.from] = null;

            const score = minimax(depth - 1, alpha, beta, false);

            boardState[move.from] = boardState[move.to];
            boardState[move.to] = captured;

            bestScore = Math.max(bestScore, score);
            alpha = Math.max(alpha, score);

            if (beta <= alpha) break; // prune branch
        }

        TRANSPOSITION_TABLE.set(key, bestScore);
        return bestScore;

    } else {

        let bestScore = Infinity;
        const moves = generateAllMoves("w");

        for (const move of moves) {

            const captured = boardState[move.to];

            boardState[move.to] = boardState[move.from];
            boardState[move.from] = null;

            const score = minimax(depth - 1, alpha, beta, true);

            boardState[move.from] = boardState[move.to];
            boardState[move.to] = captured;

            bestScore = Math.min(bestScore, score);
            beta = Math.min(beta, score);

            if (beta <= alpha) break; // prune branch
        }

        TRANSPOSITION_TABLE.set(key, bestScore);
        return bestScore;
    }
}


function findBestMove(depth) {

    let bestScore = -Infinity;
    let bestMove = null;

    const moves = generateAllMoves("b");

    // ⭐ Move ordering (captures first)
    moves.sort((a, b) => {

        const captureA = boardState[a.to];
        const captureB = boardState[b.to];

        if (captureA && !captureB) return -1;
        if (!captureA && captureB) return 1;

        return 0;
    });

    for (const move of moves) {

        const movingPiece = boardState[move.from];
        const capturedPiece = boardState[move.to];

        // simulate move
        boardState[move.to] = movingPiece;
        boardState[move.from] = null;

        const score = minimax(depth - 1, -Infinity, Infinity, false);

        // undo move
        boardState[move.from] = movingPiece;
        boardState[move.to] = capturedPiece;

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    return bestMove;
}

function quiescence(alpha, beta) {

    let standPat = evaluateBoard();

    if (standPat >= beta) return beta;

    if (alpha < standPat) alpha = standPat;

    const moves = generateAllMoves("b");

    for (const move of moves) {

        // only consider captures
        if (!boardState[move.to]) continue;

        const moving = boardState[move.from];
        const captured = boardState[move.to];

        boardState[move.to] = moving;
        boardState[move.from] = null;

        const score = -quiescence(-beta, -alpha);

        boardState[move.from] = moving;
        boardState[move.to] = captured;

        if (score >= beta) return beta;

        if (score > alpha) alpha = score;
    }

    return alpha;
}