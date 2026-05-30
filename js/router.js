// ==========================================
// SPA ROUTER & CLIENT-SIDE NAVIGATION
// ==========================================

const VIEWS = ["home-view", "bots-view", "game-view", "settings-view", "analysis-view", "replay-view"];

// Navigate to a specific view
window.navigateTo = function(viewId) {
    if (!VIEWS.includes(viewId)) return;
    
    // Deactivate all views
    VIEWS.forEach(id => {
        const viewEl = document.getElementById(id);
        if (viewEl) {
            viewEl.classList.add("hidden");
        }
    });
    
    // Activate target view
    const targetEl = document.getElementById(viewId);
    if (targetEl) {
        targetEl.classList.remove("hidden");
    }
    
    // Specific view triggers
    if (viewId === "home-view") {
        displayProfileInUI();
    } else if (viewId === "bots-view") {
        renderBotCatalog();
    } else if (viewId === "settings-view") {
        renderThemeOptions();
    } else if (viewId === "analysis-view") {
        displayRecentGames();
    }
};

// Global Onboarding Initializer
document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialise player profile check
    if (!window.hasProfile()) {
        const onboardingEl = document.getElementById("onboardingModal");
        if (onboardingEl) {
            onboardingEl.classList.remove("hidden");
        }
        document.body.classList.add("blur-active");
    } else {
        displayProfileInUI();
    }
    
    // 2. Initialise Theme
    window.initializeTheme();
});

// Display player profile data in home view
window.displayProfileInUI = function() {
    const profile = getPlayerData();
    if (!profile) return;
    
    // Set username & custom greeting card
    const nameEl = document.getElementById("username");
    if (nameEl) nameEl.innerText = profile.username;
    
    const greetEl = document.getElementById("greeting");
    if (greetEl) greetEl.innerHTML = `<i class="fa-solid fa-sparkles" style="color: #fbbf24;"></i> Hey ${profile.username}, ready to checkmate players!`;
    
    // Set avatar
    const avatarEl = document.getElementById("avatar");
    if (avatarEl) {
        if (profile.avatar) {
            avatarEl.innerHTML = `<img src="${profile.avatar}" alt="Avatar">`;
        } else {
            avatarEl.innerHTML = `<div class="avatar-placeholder"><i class="fa-solid fa-chess-pawn"></i></div>`;
        }
    }
    
    // Render ratings in cards
    displayEloRatings();
};

// Display ratings inside homepage cards
window.displayEloRatings = function() {
    const profile = getPlayerData();
    if (!profile) return;
    
    const rapidEl = document.getElementById("rapidElo");
    if (rapidEl) rapidEl.innerText = profile.ratings.rapid;
    
    const blitzEl = document.getElementById("blitzElo");
    if (blitzEl) blitzEl.innerText = profile.ratings.blitz;
    
    const bulletEl = document.getElementById("bulletElo");
    if (bulletEl) bulletEl.innerText = profile.ratings.bullet;
};

// Handle onboarding form submits
window.submitOnboardingProfile = function() {
    const nameInput = document.getElementById("nameInput");
    const name = nameInput ? nameInput.value.trim() : "";
    const imageInput = document.getElementById("imageInput");
    const file = imageInput && imageInput.files ? imageInput.files[0] : null;
    
    if (!name) {
        alert("Please enter your name to proceed.");
        return;
    }
    
    if (file) {
        // Compress and encode upload
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement("canvas");
                const MAX_SIZE = 120;
                canvas.width = MAX_SIZE;
                canvas.height = MAX_SIZE;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, MAX_SIZE, MAX_SIZE);
                
                const base64 = canvas.toDataURL("image/jpeg", 0.7);
                window.createPlayerProfile(name, base64);
                
                document.getElementById("onboardingModal").classList.add("hidden");
                document.body.classList.remove("blur-active");
                displayProfileInUI();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        // Create profile without image (uses chess pawn icon default)
        window.createPlayerProfile(name, "");
        document.getElementById("onboardingModal").classList.add("hidden");
        document.body.classList.remove("blur-active");
        displayProfileInUI();
    }
};

// Profile edit Modal openers
window.openProfileEdit = function() {
    const profile = getPlayerData();
    if (!profile) return;
    
    const editNameInput = document.getElementById("editNameInput");
    if (editNameInput) editNameInput.value = profile.username;
    
    const editModal = document.getElementById("profileEditModal");
    if (editModal) editModal.classList.remove("hidden");
    document.body.classList.add("blur-active");
};

window.closeProfileEdit = function() {
    const editModal = document.getElementById("profileEditModal");
    if (editModal) editModal.classList.add("hidden");
    document.body.classList.remove("blur-active");
};

// Handle profile edits saves
window.submitProfileEdit = function() {
    const nameInput = document.getElementById("editNameInput");
    const name = nameInput ? nameInput.value.trim() : "";
    const imageInput = document.getElementById("editImageInput");
    const file = imageInput && imageInput.files ? imageInput.files[0] : null;
    
    if (!name) {
        alert("Name cannot be blank.");
        return;
    }
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement("canvas");
                const MAX_SIZE = 120;
                canvas.width = MAX_SIZE;
                canvas.height = MAX_SIZE;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, MAX_SIZE, MAX_SIZE);
                
                const base64 = canvas.toDataURL("image/jpeg", 0.7);
                window.updatePlayerProfile(name, base64);
                
                closeProfileEdit();
                displayProfileInUI();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        window.updatePlayerProfile(name, null);
        closeProfileEdit();
        displayProfileInUI();
    }
};

// exit match cleanup
window.exitGameSession = function() {
    resetActiveGameSession();
    navigateTo("home-view");
};

// exit review cleanup
window.exitReplaySession = function() {
    resetActiveReplaySession();
    navigateTo("analysis-view");
};
