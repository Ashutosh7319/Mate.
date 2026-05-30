// ==========================================
// PRE-SET BOARD THEMES & GLOBAL CONTROLLER
// ==========================================

const BOARD_THEMES = [
    { id: "classic", name: "Classic Wood" },
    { id: "neon", name: "Cyber Neon" },
    { id: "ocean", name: "Deep Ocean" },
    { id: "midnight", name: "Midnight Purple" },
    { id: "mono", name: "Monochrome" }
];

// Initialize theme states
function initializeTheme() {
    // 1. Light/Dark Mode Load
    const mode = localStorage.getItem("royalChessLightMode");
    if (mode === "true") {
        document.body.classList.add("light-mode");
        updateThemeTogglerIcon(true);
    } else {
        document.body.classList.remove("light-mode");
        updateThemeTogglerIcon(false);
    }
    
    // 2. Board Theme Load
    const boardTheme = getSavedBoardTheme();
    applyBoardThemeToElements(boardTheme);
}

// Toggle light/dark layout
window.toggleDarkMode = function() {
    const isLightNow = document.body.classList.toggle("light-mode");
    localStorage.setItem("royalChessLightMode", isLightNow ? "true" : "false");
    updateThemeTogglerIcon(isLightNow);
};

function updateThemeTogglerIcon(isLight) {
    const icon = document.getElementById("themeIcon");
    if (icon) {
        if (isLight) {
            icon.className = "fa-solid fa-sun";
        } else {
            icon.className = "fa-solid fa-moon";
        }
    }
}

// Get/Set board themes in local storage
function getSavedBoardTheme() {
    return localStorage.getItem("royalChessBoardTheme") || "classic";
}

function saveBoardTheme(themeId) {
    localStorage.setItem("royalChessBoardTheme", themeId);
}

// Apply selected theme to active board structures
function applyBoardThemeToElements(themeId) {
    // Apply prefix theme classes
    const boards = [document.getElementById("chessBoard"), document.getElementById("replayBoard")];
    boards.forEach(board => {
        if (board) {
            // Remove previous theme classes
            BOARD_THEMES.forEach(t => board.classList.remove(`theme-${t.id}`));
            // Add new theme class
            board.classList.add(`theme-${themeId}`);
        }
    });
}

// Dynamically render the settings themes catalog
window.renderThemeOptions = function() {
    const grid = document.getElementById("themeGrid");
    if (!grid) return;
    
    grid.innerHTML = "";
    const activeTheme = getSavedBoardTheme();
    
    BOARD_THEMES.forEach(theme => {
        const card = document.createElement("div");
        card.className = `theme-card glass ${activeTheme === theme.id ? "theme-selected" : ""}`;
        card.setAttribute("data-theme", theme.id);
        card.onclick = () => selectBoardTheme(theme.id);
        
        card.innerHTML = `
            <h4>${theme.name}</h4>
            <div class="mini-board">
                <div class="mini-square light"></div>
                <div class="mini-square dark"></div>
                <div class="mini-square dark"></div>
                <div class="mini-square light"></div>
            </div>
        `;
        grid.appendChild(card);
    });
};

// Handle clicks in themes settings card
window.selectBoardTheme = function(themeId) {
    saveBoardTheme(themeId);
    applyBoardThemeToElements(themeId);
    
    // Refresh theme selection states
    renderThemeOptions();
    
    // Micro-toast confirmation
    console.log(`Board theme updated to: ${themeId}`);
};

// Expose theme functions globally
window.initializeTheme = initializeTheme;
window.getSavedBoardTheme = getSavedBoardTheme;
window.applyBoardThemeToElements = applyBoardThemeToElements;