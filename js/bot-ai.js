// ==========================================
// BOT Opponent CATALOG & AI REGISTRY
// ==========================================

const BOTS = [
    {
        id: "levy",
        name: "Levy Rozman",
        elo: 900,
        thinking: 500, // milliseconds
        img: "bots/levy.jpg"
    },
    {
        id: "anna",
        name: "Anna Cramling",
        elo: 1200,
        thinking: 600,
        img: "bots/anna.jpg"
    },
    {
        id: "eric",
        name: "Eric Rosen",
        elo: 1500,
        thinking: 700,
        img: "bots/eric.jpeg"
    },
    {
        id: "hikaru",
        name: "Hikaru Nakamura",
        elo: 2200,
        thinking: 800,
        img: "bots/hikaru.jpg"
    },
    {
        id: "fabi",
        name: "Fabiano Caruana",
        elo: 2400,
        thinking: 950,
        img: "bots/fabi.jpg"
    },
    {
        id: "ding",
        name: "Ding Liren",
        elo: 2600,
        thinking: 1000,
        img: "bots/ding.jpg"
    },
    {
        id: "anand",
        name: "Viswanathan Anand",
        elo: 2700,
        thinking: 1000,
        img: "bots/anand.jpeg"
    },
    {
        id: "kasparov",
        name: "Garry Kasparov",
        elo: 2800,
        thinking: 1100,
        img: "bots/kasparov.jpg"
    },
    {
        id: "magnus",
        name: "Magnus Carlsen",
        elo: 2880,
        thinking: 1200,
        img: "bots/magnus.jpg"
    }
];

// Dialogue pools triggered during bot turns
const BOT_DIALOGUES = {
    levy: [
        "Interesting move... but did you see my trap?",
        "Oh no! My queen!",
        "You are playing some decent chess, I must admit.",
        "That looks highly suspicious...",
        "Are we blundering or is this brilliant?"
    ],
    anna: [
        "Let's play solid and see who breaks first.",
        "I like my position here.",
        "Very interesting! Let's keep it calm.",
        "Ah! A tactical skirmish, nice!",
        "This is going to be a very structural match."
    ],
    eric: [
        "Oh, wow. That was a tricky move!",
        "Let's see if we can find a chess.com puzzle here.",
        "Gambits are just much more fun!",
        "Is this a Rosen trap?",
        "Beautiful piece coordination from your side."
    ],
    hikaru: [
        "Let's speed up the tempo, chess time!",
        "I literally see everything. Literally.",
        "Okay, you take, I take, then checkmate. Simple.",
        "Wait, is that a blunder? Yes it is, let's go.",
        "We are playing fast chess now!"
    ],
    fabi: [
        "A classical approach. Very logical.",
        "I am ready to enter the deep lines.",
        "Calculations show my structure is solid.",
        "Let's explore this variation.",
        "You are defending remarkably well."
    ],
    ding: [
        "Let's play a quiet, solid game.",
        "My pieces are finding their squares.",
        "This position requires deep patience.",
        "A solid move, let's keep playing.",
        "Let's maintain structural balance."
    ],
    anand: [
        "Ah, speed and intuition combined!",
        "A fast response. Let's see your continuation.",
        "I've seen this line in Madras, long ago.",
        "Excellent piece coordination.",
        "Let's test your calculation speed."
    ],
    kasparov: [
        "Attack! The initiative must be seized!",
        "You dare play against my Garry line?",
        "This board is mine to control!",
        "A fierce battle, just as I like it!",
        "Your king looks extremely exposed."
    ],
    magnus: [
        "Hmm... let's play some real chess.",
        "I will squeeze this endgame advantage.",
        "There is always a tiny weakness to press.",
        "Let's see if you can hold this structure.",
        "I am quite comfortable in this position."
    ]
};

// Compile bot selection catalog list
window.renderBotCatalog = function() {
    const grid = document.getElementById("botGrid");
    if (!grid) return;
    
    grid.innerHTML = "";
    const profile = getPlayerData();
    const botProgress = (profile && profile.botProgress) ? profile.botProgress : {};
    
    BOTS.forEach(bot => {
        const progress = botProgress[bot.id] || { wins: 0, rewardClaimed: false };
        const winsCount = progress.wins;
        const isComplete = winsCount >= 5;
        
        const card = document.createElement("div");
        card.className = `bot-card glass ${isComplete ? "bot-challenge-complete" : ""}`;
        
        card.innerHTML = `
            <img class="bot-card-avatar" src="${bot.img}" alt="${bot.name}">
            <div class="bot-card-info">
                <h3>${bot.name}</h3>
                <span class="bot-rating">${bot.elo} ELO</span>
            </div>
            <div class="bot-wins-badge">
                ${isComplete ? `<i class="fa-solid fa-trophy" style="color: var(--accent-green);"></i> Defeated` : `Wins: ${winsCount}/5`}
            </div>
            <button class="btn-primary" onclick="challengeBot('${bot.id}')">Challenge</button>
        `;
        grid.appendChild(card);
    });
};

// Challenge button trigger
window.challengeBot = function(botId) {
    const targetBot = BOTS.find(b => b.id === botId);
    if (!targetBot) return;
    
    selectedBot = targetBot;
    
    // Open time selector prompt modal
    promptGameMode("bot");
};

// Expose bot catalog globally
window.BOTS = BOTS;
window.BOT_DIALOGUES = BOT_DIALOGUES;