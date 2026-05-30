// ==========================================
// PERSISTENT DATA LAYER & STATE MANAGEMENT
// ==========================================

const STARTING_ELO = 200;
const MIN_ELO = 100;

// Initialize and retrieve player data
function getPlayerData() {
    let data = localStorage.getItem("royalChessProfile");
    if (!data) {
        return null;
    }
    try {
        let profile = JSON.parse(data);
        // Ensure ratings exist
        if (!profile.ratings) {
            profile.ratings = {
                rapid: STARTING_ELO,
                blitz: STARTING_ELO,
                bullet: STARTING_ELO
            };
        }
        // Ensure bot challenges exist
        if (!profile.botProgress) {
            profile.botProgress = {};
        }
        // Ensure recent games exist
        if (!profile.recentGames) {
            profile.recentGames = [];
        }
        return profile;
    } catch (e) {
        console.error("Error parsing player data", e);
        return null;
    }
}

function savePlayerData(profile) {
    localStorage.setItem("royalChessProfile", JSON.stringify(profile));
}

// Check if profile exists
function hasProfile() {
    return localStorage.getItem("royalChessProfile") !== null;
}

// Create new profile from onboarding
function createPlayerProfile(name, avatarBase64) {
    const profile = {
        username: name || "Player",
        avatar: avatarBase64 || "",
        ratings: {
            rapid: STARTING_ELO,
            blitz: STARTING_ELO,
            bullet: STARTING_ELO
        },
        botProgress: {},
        recentGames: []
    };
    savePlayerData(profile);
}

// Update profile name or avatar
function updatePlayerProfile(name, avatarBase64) {
    const profile = getPlayerData();
    if (!profile) return;
    if (name) profile.username = name;
    if (avatarBase64) profile.avatar = avatarBase64;
    savePlayerData(profile);
}

// Update ELO rating based on game outcome
function adjustEloRating(mode, outcome) {
    const profile = getPlayerData();
    if (!profile) return;
    
    // Ensure the ratings object and specific mode rating exists
    if (!profile.ratings) profile.ratings = { rapid: 200, blitz: 200, bullet: 200 };
    if (profile.ratings[mode] === undefined) profile.ratings[mode] = STARTING_ELO;
    
    let change = 0;
    if (outcome === "win") {
        change = 5;
    } else if (outcome === "loss") {
        change = -3;
    } else if (outcome === "draw") {
        change = 1;
    }
    
    profile.ratings[mode] = Math.max(MIN_ELO, profile.ratings[mode] + change);
    savePlayerData(profile);
    
    // Refresh ratings in UI
    displayEloRatings();
}

// Add wins against specific bot and claim rewards if wins = 5
function recordBotVictory(bot, mode) {
    const profile = getPlayerData();
    if (!profile) return false;
    
    if (!profile.botProgress[bot.id]) {
        profile.botProgress[bot.id] = {
            wins: 0,
            rewardClaimed: false
        };
    }
    
    const progress = profile.botProgress[bot.id];
    progress.wins++;
    
    let earnedReward = false;
    let rewardAmount = 0;
    
    if (progress.wins >= 5 && !progress.rewardClaimed) {
        rewardAmount = Math.floor(bot.elo / 2);
        
        // Ensure ratings exist
        if (!profile.ratings) profile.ratings = { rapid: 200, blitz: 200, bullet: 200 };
        if (profile.ratings[mode] === undefined) profile.ratings[mode] = STARTING_ELO;
        
        profile.ratings[mode] += rewardAmount;
        progress.rewardClaimed = true;
        earnedReward = true;
    }
    
    savePlayerData(profile);
    displayEloRatings();
    
    return {
        wins: progress.wins,
        earnedReward: earnedReward,
        rewardAmount: rewardAmount
    };
}

// Store completed game record (max 5)
function saveGameRecord(opponentName, opponentImg, gameType, outcome, movesList) {
    const profile = getPlayerData();
    if (!profile) return;
    
    const newGame = {
        id: Date.now().toString(),
        opponentName: opponentName,
        opponentImg: opponentImg,
        gameType: gameType, // "local" or "bot"
        outcome: outcome, // "win", "loss", "draw"
        date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        moves: movesList // array of { from, to, piece, notation }
    };
    
    if (!profile.recentGames) {
        profile.recentGames = [];
    }
    
    // Prepend to array
    profile.recentGames.unshift(newGame);
    
    // Cap history at 5 matches
    if (profile.recentGames.length > 5) {
        profile.recentGames = profile.recentGames.slice(0, 5);
    }
    
    savePlayerData(profile);
}

// Expose functions globally to window
window.getPlayerData = getPlayerData;
window.savePlayerData = savePlayerData;
window.hasProfile = hasProfile;
window.createPlayerProfile = createPlayerProfile;
window.updatePlayerProfile = updatePlayerProfile;
window.adjustEloRating = adjustEloRating;
window.recordBotVictory = recordBotVictory;
window.saveGameRecord = saveGameRecord;
