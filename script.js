/* Version: #3 */

// === KONFIGURASJON & KONSTANTER ===
const CONFIG = {
    SALARY: 1500,       // Lønn for avisbud
    WORK_PAY: 200,      // Penger tjent per ekstrajobb
    WORK_COST: 10,      // Lykke tapt per ekstrajobb
    RENT: 3500,         // Månedlig husleie (trekkes automatisk eller kommer som regning? Vi lager regning)
    GAME_OVER_LIMIT: -5000 // Hvor mye minus man kan ha før game over (eller 2 mnd regel)
};

// === STATE MANAGEMENT (TILSTAND) ===
// Vi starter med en standard tilstand, men sjekker localStorage først.
let gameState = {
    balance: 2000,      // Brukskonto
    savings: 5000,      // Sparekonto
    bsu: 0,             // BSU
    cash: 500,          // Kontanter (Lommepenger)
    month: 1,
    happiness: 90,
    jobTitle: "Avisbud",
    inventory: [],
    bills: [],          // Array av regning-objekter
    negativeMonths: 0,  // Teller for game over logikk
    currentBankID: null // Midlertidig lagring av generert kode
};

// === DOM ELEMENTER ===
// Navigasjon
const navLife = document.getElementById('nav-life');
const navBank = document.getElementById('nav-bank');
const viewLife = document.getElementById('view-life');
const viewBank = document.getElementById('view-bank');

// Livet - Display
const displayMonth = document.getElementById('display-month');
const displayJob = document.getElementById('display-job');
const happinessBar = document.getElementById('happiness-bar');
const displayCash = document.getElementById('display-cash');
const inventoryList = document.getElementById('inventory-list');

// Livet - Knapper
const btnWork = document.getElementById('btn-work');
const btnNextMonth = document.getElementById('btn-next-month');
const btnGetBankID = document.getElementById('btn-get-bankid');

// Bank - Login
const bankLoginScreen = document.getElementById('bank-login-screen');
const bankDashboardScreen = document.getElementById('bank-dashboard-screen');
const loginForm = document.getElementById('login-form');
const inputBankID = document.getElementById('input-bankid');
const loginError = document.getElementById('login-error');
const btnLogout = document.getElementById('btn-logout');

// Bank - Dashboard
const balChecking = document.getElementById('balance-checking');
const balSavings = document.getElementById('balance-savings');
const balBsu = document.getElementById('balance-bsu');
const billsList = document.getElementById('bills-list');
const paymentZone = document.getElementById('payment-zone');
const transferAmount = document.getElementById('transfer-amount');
const btnTransferSave = document.getElementById('btn-transfer-save');

// Modaler
const modalBankID = document.getElementById('modal-bankid');
const displayBankIDCode = document.getElementById('display-bankid-code');
const btnCloseModal = document.getElementById('btn-close-modal');
const modalGameOver = document.getElementById('modal-gameover');
const gameOverReason = document.getElementById('gameover-reason');
const btnRestart = document.getElementById('btn-restart');

// Toast Container
const toastContainer = document.getElementById('toast-container');

// === INITIALISERING ===
function init() {
    console.log("System: Starter applikasjon...");
    
    // Sjekk om vi har lagret spilldata
    const savedData = localStorage.getItem('livetBankenSave');
    if (savedData) {
        try {
            gameState = JSON.parse(savedData);
            console.log("System: Lastet lagret spill.", gameState);
        } catch (e) {
            console.error("System: Kunne ikke laste lagret spill, starter på nytt.");
        }
    } else {
        console.log("System: Nytt spill opprettet.");
    }

    // Nullstill midlertidige verdier (BankID skal ikke huskes mellom sessions på den måten)
    gameState.currentBankID = null;

    updateUI();
    setupEventListeners();
}

// === EVENT LISTENERS ===
function setupEventListeners() {
    // Navigasjon
    navLife.addEventListener('click', () => switchView('life'));
    navBank.addEventListener('click', () => switchView('bank'));

    // Livet Handlinger
    btnWork.addEventListener('click', handleWork);
    btnNextMonth.addEventListener('click', handleNextMonth);
    btnGetBankID.addEventListener('click', generateBankID);
    
    // Modal
    btnCloseModal.addEventListener('click', () => modalBankID.classList.add('hidden'));
    btnRestart.addEventListener('click', resetGame);

    // Bank Handlinger
    loginForm.addEventListener('submit', handleBankLogin);
    btnLogout.addEventListener('click', handleBankLogout);
    btnTransferSave.addEventListener('click', handleTransferToSavings);

    // Drag & Drop for regninger
    paymentZone.addEventListener('dragover', (e) => {
        e.preventDefault(); // Nødvendig for å tillate drop
        paymentZone.classList.add('drag-over');
    });

    paymentZone.addEventListener('dragleave', () => {
        paymentZone.classList.remove('drag-over');
    });

    paymentZone.addEventListener('drop', handleBillDrop);
}

// === CORE GAME LOGIC ===

function updateUI() {
    // Oppdater Livet Dashboard
    displayMonth.textContent = gameState.month;
    displayJob.textContent = gameState.jobTitle;
    displayCash.textContent = formatMoney(gameState.cash);
    
    happinessBar.style.width = `${gameState.happiness}%`;
    if (gameState.happiness < 30) happinessBar.style.backgroundColor = '#e74c3c'; // Rød
    else if (gameState.happiness < 60) happinessBar.style.backgroundColor = '#f1c40f'; // Gul
    else happinessBar.style.backgroundColor = '#4ecdc4'; // Grønn

    // Oppdater Bank Dashboard (hvis logget inn)
    balChecking.textContent = formatMoney(gameState.balance, false);
    balSavings.textContent = formatMoney(gameState.savings, false);
    balBsu.textContent = formatMoney(gameState.bsu, false);

    renderBills();
    saveGame();
}

function handleWork() {
    if (gameState.happiness <= 10) {
        showToast("Du er for utslitt til å jobbe! Ta en pause (neste måned).", "error");
        return;
    }

    // Logikk
    gameState.cash += CONFIG.WORK_PAY;
    gameState.happiness = Math.max(0, gameState.happiness - CONFIG.WORK_COST);
    
    console.log(`Handling: Jobbet. Cash: ${gameState.cash}, Lykke: ${gameState.happiness}`);
    
    showToast(`Du jobbet ekstra! Tjent: ${CONFIG.WORK_PAY} kr. Lykke: -${CONFIG.WORK_COST}`, "success");
    
    // Visuell feedback
    updateUI();
}

function handleNextMonth() {
    console.log("System: Skifter måned...");

    // 1. Øk måned
    gameState.month++;

    // 2. Lønn (kommer på konto)
    gameState.balance += CONFIG.SALARY;
    showToast(`Lønn mottatt: ${CONFIG.SALARY} kr på Brukskonto`, "success");

    // 3. Generer Regninger
    generateMonthlyBills();

    // 4. Tilfeldige hendelser (20% sjanse)
    handleRandomEvents();

    // 5. Sjekk Game Over kriterier (Saldo)
    if (gameState.balance < 0) {
        gameState.negativeMonths++;
        showToast("Advarsel: Kontoen din er i minus!", "error");
    } else {
        gameState.negativeMonths = 0;
    }

    if (gameState.negativeMonths >= 2) {
        triggerGameOver("Du har hatt negativ saldo i to måneder på rad. Banken har stengt kontoen din.");
        return;
    }

    // 6. Regenerer lykke litt (ny måned, nye muligheter)
    gameState.happiness = Math.min(100, gameState.happiness + 10);

    console.log(`Status Måned ${gameState.month}: Saldo ${gameState.balance}, Regninger: ${gameState.bills.length}`);
    updateUI();
}

function generateMonthlyBills() {
    // Husleie (Alltid)
    const rentBill = {
        id: Date.now() + Math.random(),
        recipient: "Husleie",
        amount: 3500,
        dueDate: gameState.month, // Forfaller denne måneden
        isPaid: false
    };
    gameState.bills.push(rentBill);

    // Strøm (Varierer)
    const electricity = Math.floor(Math.random() * 500) + 200;
    const powerBill = {
        id: Date.now() + Math.random() + 1,
        recipient: "Fjordkraft",
        amount: electricity,
        dueDate: gameState.month,
        isPaid: false
    };
    gameState.bills.push(powerBill);

    // Mobil (Annenhver måned kanskje? Vi tar hver for enkelhet)
    const phoneBill = {
        id: Date.now() + Math.random() + 2,
        recipient: "Telenor",
        amount: 399,
        dueDate: gameState.month,
        isPaid: false
    };
    gameState.bills.push(phoneBill);
}

function handleRandomEvents() {
    const chance = Math.random();
    
    if (chance < 0.15) { // 15% Bad luck
        const loss = 500;
        gameState.cash = Math.max(0, gameState.cash - loss);
        gameState.happiness -= 10;
        showToast(`Uflaks! Du mistet ${loss} kr på bussen.`, "error");
        console.log("Event: Bad luck triggered");
    } else if (chance > 0.85) { // 15% Good luck
        const gain = 500;
        gameState.cash += gain;
        gameState.happiness += 10;
        showToast(`Flaks! Bestemor vippset deg ${gain} kr.`, "info");
        console.log("Event: Good luck triggered");
    }
}

// === BANKID & SECURITY ===

function generateBankID() {
    // Generer 6-sifret kode
    const code = Math.floor(100000 + Math.random() * 900000);
    gameState.currentBankID = code; // Lagre midlertidig i minnet
    
    console.log(`Sikkerhet: BankID generert: ${code}`);
    
    displayBankIDCode.textContent = code;
    modalBankID.classList.remove('hidden');
}

function handleBankLogin(e) {
    e.preventDefault();
    const inputCode = parseInt(inputBankID.value);

    console.log(`Login forsøk: Input=${inputCode}, Faktisk=${gameState.currentBankID}`);

    if (inputCode === gameState.currentBankID) {
        // Suksess
        loginError.classList.add('hidden');
        bankLoginScreen.classList.add('hidden');
        bankDashboardScreen.classList.remove('hidden');
        inputBankID.value = ""; // Clear input
        showToast("Velkommen inn i nettbanken", "success");
        updateUI(); // Sørg for at banktallene er oppdatert
    } else {
        // Feil
        loginError.classList.remove('hidden');
        showToast("Feil engangskode!", "error");
    }
}

function handleBankLogout() {
    bankDashboardScreen.classList.add('hidden');
    bankLoginScreen.classList.remove('hidden');
    gameState.currentBankID = null; // Nullstill koden for sikkerhet
    showToast("Du er logget ut.", "info");
}

// === BANK FUNKSJONALITET ===

function handleTransferToSavings() {
    const amount = parseFloat(transferAmount.value);

    if (isNaN(amount) || amount <= 0) {
        showToast("Ugyldig beløp.", "error");
        return;
    }

    if (gameState.balance >= amount) {
        gameState.balance -= amount;
        gameState.savings += amount;
        transferAmount.value = "";
        showToast(`Overførte ${amount} kr til Sparekonto.`, "success");
        updateUI();
    } else {
        showToast("Ikke nok dekning på brukskonto.", "error");
    }
}

function renderBills() {
    billsList.innerHTML = "";
    
    // Filtrer ut betalte regninger (eller vis dem som arkivert, her fjerner vi dem for enkelhet)
    const unpaidBills = gameState.bills.filter(bill => !bill.isPaid);

    if (unpaidBills.length === 0) {
        billsList.innerHTML = '<div class="empty-bills">Ingen regninger forfaller. Godt jobba!</div>';
        return;
    }

    unpaidBills.forEach(bill => {
        const div = document.createElement('div');
        div.className = 'bill-item';
        div.draggable = true;
        div.dataset.id = bill.id; // Lagre ID for drag & drop
        
        // Sjekk om forfalt
        let statusClass = "";
        let statusText = "";
        if (bill.dueDate < gameState.month) {
            statusClass = "overdue";
            statusText = "(FORFALT!)";
            // Legg til purregebyr logikk hvis vi vil være strenge, men vi holder det visuelt nå
        }

        if (statusClass) div.classList.add(statusClass);

        div.innerHTML = `
            <span><strong>${bill.recipient}</strong> ${statusText}</span>
            <span>${bill.amount} kr</span>
        `;

        // Click to pay (alternativ til drag & drop)
        div.addEventListener('click', () => payBill(bill.id));
        
        // Drag events
        div.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', bill.id);
            div.style.opacity = '0.5';
        });

        div.addEventListener('dragend', () => {
            div.style.opacity = '1';
        });

        billsList.appendChild(div);
    });
}

function handleBillDrop(e) {
    e.preventDefault();
    paymentZone.classList.remove('drag-over');
    
    const billId = e.dataTransfer.getData('text/plain');
    if (billId) {
        payBill(parseFloat(billId));
    }
}

function payBill(billId) {
    const billIndex = gameState.bills.findIndex(b => b.id === billId);
    if (billIndex === -1) return;

    const bill = gameState.bills[billIndex];

    if (gameState.balance >= bill.amount) {
        gameState.balance -= bill.amount;
        bill.isPaid = true; // Marker som betalt
        
        // Fjern fra arrayet eller hold den som "betalt"? 
        // For spillets del fjerner vi den fra visningen ved neste render, 
        // men beholder i state hvis vi vil ha historikk.
        
        console.log(`Betaling: Betalte ${bill.recipient} på ${bill.amount} kr.`);
        showToast(`Betalte regning til ${bill.recipient}.`, "success");
        updateUI();
    } else {
        showToast("Ikke nok penger på konto!", "error");
    }
}

// === HJELPEFUNKSJONER ===

function switchView(viewName) {
    if (viewName === 'life') {
        viewLife.classList.add('active-view');
        viewLife.classList.remove('hidden-view'); // Sikre
        viewLife.style.display = 'flex'; // Force flex via JS for animation reset
        
        viewBank.classList.remove('active-view');
        viewBank.classList.add('hidden-view'); // Hide
        viewBank.style.display = 'none';

        navLife.classList.add('active');
        navBank.classList.remove('active');
    } else {
        viewLife.classList.remove('active-view');
        viewLife.classList.add('hidden-view');
        viewLife.style.display = 'none';

        viewBank.classList.add('active-view');
        viewBank.classList.remove('hidden-view');
        viewBank.style.display = 'block'; // Block for bank wrapper

        navLife.classList.remove('active');
        navBank.classList.add('active');
    }
}

function formatMoney(amount, withCurrency = true) {
    // Norsk format: 1 500
    let s = amount.toLocaleString('no-NO');
    return withCurrency ? `${s} kr` : s;
}

function showToast(message, type = "info") {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);

    // Fjern etter 3 sekunder
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function saveGame() {
    localStorage.setItem('livetBankenSave', JSON.stringify(gameState));
}

function triggerGameOver(reason) {
    modalGameOver.classList.remove('hidden');
    gameOverReason.textContent = reason;
    console.log("GAME OVER triggered");
}

function resetGame() {
    localStorage.removeItem('livetBankenSave');
    location.reload(); // Enkleste måte å resette alt rent
}

// Start spillet
init();
/* Version: #3 */
