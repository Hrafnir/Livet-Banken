/* Version: #1 - script_core.js */

// === KONFIGURASJON ===
const CONFIG = {
    HOURS_IN_WEEK: 168,
    XP_PER_LEVEL: 100,
    LOAN_INTEREST_RATE: 0.045,
    LOAN_TERM_MONTHS: 300,
    RECIPIENTS: {
        RENT: { name: "Utleier AS", account: "1234.56.78901" },
        BANK: { name: "NordBanken Lån", account: "9999.88.77777" },
        POWER: { name: "Fjordkraft", account: "9876.54.32109" },
        PHONE: { name: "Telenor", account: "5555.44.33333" }
    },
    FOOD_COST: { low: 500, medium: 1500, high: 3500 }
};

// === GLOBAL STATE ===
let gameState = {
    month: 1, week: 1,
    balance: 2000, savings: 0, bsu: 0, loans: [],
    health: 90, happiness: 90,
    jobId: "job_newspaper", housingId: "rent_basement",
    skills: {}, inventory: [],
    bills: [], mailbox: [], efakturaAgreements: [],
    currentBankID: null, activeStudy: null, pendingEfaktura: null,
    parentsPaid: false
};

// === INITIALISERING ===
document.addEventListener('DOMContentLoaded', () => {
    console.log("Core: Initierer system...");
    loadGame();
    
    // Dataintegritet
    if (!gameState.housingId) gameState.housingId = "rent_basement";
    if (!gameState.loans) gameState.loans = [];
    if (!gameState.inventory) gameState.inventory = [];
    if (!gameState.skills) gameState.skills = {};
    if (gameState.parentsPaid === undefined) gameState.parentsPaid = false;

    // Start moduler
    if (window.initLife) window.initLife();
    if (window.initBank) window.initBank();

    // Navigasjon
    setupNavigation();
});

function setupNavigation() {
    ['nav-life', 'nav-jobs', 'nav-housing', 'nav-edu', 'nav-store', 'nav-bank'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('click', () => switchView(id.replace('nav-', '')));
    });
}

// === HJELPEFUNKSJONER (GLOBAL) ===

function switchView(viewName) {
    const views = document.querySelectorAll('.view');
    const btns = document.querySelectorAll('.nav-btn');
    
    views.forEach(v => {
        v.classList.remove('active-view');
        v.classList.add('hidden-view');
        v.style.display = 'none';
    });
    btns.forEach(b => b.classList.remove('active'));

    const activeView = document.getElementById('view-' + viewName);
    const activeBtn = document.getElementById('nav-' + viewName);
    
    if (activeView) {
        activeView.classList.add('active-view');
        activeView.classList.remove('hidden-view');
        activeView.style.display = 'flex';
    }
    if (activeBtn) activeBtn.classList.add('active');
}

function showToast(msg, type="info") {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
}

function formatMoney(amount) {
    return Math.floor(amount).toLocaleString('no-NO') + " kr";
}

function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

function hasItem(id) { return gameState.inventory.includes(id); }

function getSkillLevel(cat) { 
    return Math.floor((gameState.skills[cat] || 0) / CONFIG.XP_PER_LEVEL); 
}

function saveGame() {
    localStorage.setItem('livetBankenV22', JSON.stringify(gameState));
}

function loadGame() {
    const data = localStorage.getItem('livetBankenV22');
    if (data) gameState = { ...gameState, ...JSON.parse(data) };
}

function resetGame() {
    localStorage.removeItem('livetBankenV22');
    location.reload();
}

function checkGameOver() {
    if (gameState.balance < -20000) triggerBankruptcy();
    if (gameState.health <= 0) showGameOver("Helsekollaps!");
    if (gameState.happiness <= 0) showGameOver("Depresjon.");
}

function triggerBankruptcy() {
    gameState.housingId = "rent_basement";
    gameState.loans = [];
    gameState.inventory = [];
    gameState.balance = 2000; 
    gameState.savings = 0; gameState.bsu = 0;
    gameState.happiness = 10;
    
    const modal = document.getElementById('modal-gameover');
    document.getElementById('gameover-reason').textContent = "Personlig Konkurs";
    modal.classList.remove('hidden');
    
    const btn = document.getElementById('btn-restart');
    btn.textContent = "Flytt hjem";
    btn.onclick = () => {
        modal.classList.add('hidden');
        if(window.renderHousing) window.renderHousing();
        if(window.updateUI) window.updateUI();
        btn.onclick = resetGame; 
        btn.textContent = "Start på nytt";
    };
}

function showGameOver(reason) {
    document.getElementById('gameover-reason').textContent = reason;
    document.getElementById('modal-gameover').classList.remove('hidden');
    document.getElementById('btn-restart').onclick = resetGame;
}

function getImgHTML(imgSrc, altText) {
    if (imgSrc && imgSrc !== "") {
        return `<img src="${imgSrc}" class="housing-img" alt="${altText}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                <div class="housing-img" style="display:none; align-items:center; justify-content:center; color:#999;">Bilde mangler</div>`;
    }
    return `<div class="housing-img" style="display:flex; align-items:center; justify-content:center; color:#999;">Ingen bilde</div>`;
}

// Bill Factory
function createBill(recipient, amount, m, w) {
    const isEfaktura = gameState.efakturaAgreements.includes(recipient.name);
    const kid = Math.floor(Math.random() * 100000000).toString();
    const bill = {
        id: Date.now() + Math.random(),
        recipient: recipient.name,
        account: recipient.account,
        kid: kid,
        amount: Math.floor(amount),
        dueMonth: m, dueWeek: w, isPaid: false, isEfaktura: isEfaktura
    };
    gameState.bills.push(bill);
    if (!isEfaktura) gameState.mailbox.push(bill.id);
}
/* Version: #1 */
