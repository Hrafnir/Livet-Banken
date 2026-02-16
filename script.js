/* Version: #6 */

// === KONFIGURASJON ===
const CONFIG = {
    HOURS_IN_WEEK: 168,
    SALARY_BASE: 15000, // Utbetales uke 1
    HOURLY_RATE: 180,   // Ekstra per time overtid/jobb
    
    // Faste mottakere for realisme
    RECIPIENTS: {
        RENT: { name: "Utleier AS", account: "1234.56.78901" },
        POWER: { name: "Fjordkraft", account: "9876.54.32109" },
        PHONE: { name: "Telenor", account: "5555.44.33333" },
        INKASSO: { name: "Lindorff", account: "6666.66.66666" }
    },

    // Matbudsjett (Pris per uke)
    FOOD_COST: {
        low: 500,
        medium: 1500,
        high: 3000
    }
};

// === STATE MANAGEMENT ===
let gameState = {
    // Tid
    month: 1,
    week: 1,
    
    // Økonomi
    balance: 25000, // Starter med litt penger for å overleve første uke
    savings: 5000,
    bsu: 0,
    
    // Spiller
    health: 80,
    happiness: 80,
    jobTitle: "Butikkmedarbeider",
    skills: 0, // Øker ved studier
    
    // Data
    bills: [],          // Alle regninger
    mailbox: [],        // IDer til uåpnede brev
    efakturaAgreements: [], // Navn på mottakere vi har avtale med
    
    // BankID
    currentBankID: null
};

// === DOM CACHE ===
// Views
const viewLife = document.getElementById('view-life');
const viewBank = document.getElementById('view-bank');
const navLife = document.getElementById('nav-life');
const navBank = document.getElementById('nav-bank');

// Life Stats
const dispMonth = document.getElementById('disp-month');
const dispWeek = document.getElementById('disp-week');
const dispJob = document.getElementById('disp-job');
const dispCash = document.getElementById('disp-cash');
const barHealth = document.getElementById('bar-health');
const barHappiness = document.getElementById('bar-happiness');

// Planner
const inputSleep = document.getElementById('input-sleep');
const inputWork = document.getElementById('input-work');
const inputStudy = document.getElementById('input-study');
const calcFreeTime = document.getElementById('calc-free-time');
const selectFood = document.getElementById('select-food-budget');
const btnRunWeek = document.getElementById('btn-run-week');

// Mailbox & Tools
const mailboxList = document.getElementById('mailbox-list');
const mailCountBadge = document.getElementById('mail-count');
const btnGetBankID = document.getElementById('btn-get-bankid');
const inventoryList = document.getElementById('inventory-list');

// Bank
const bankLoginScreen = document.getElementById('bank-login-screen');
const bankDashboard = document.getElementById('bank-dashboard-screen');
const loginForm = document.getElementById('login-form');
const inputBankIDLogin = document.getElementById('input-bankid-login');
const loginError = document.getElementById('login-error');
const btnLogout = document.getElementById('btn-logout');

// Bank Dashboard
const balChecking = document.getElementById('bal-checking');
const balSavings = document.getElementById('bal-savings');
const balBsu = document.getElementById('bal-bsu');

// Bank Payment Form
const payFrom = document.getElementById('pay-from');
const payToAcc = document.getElementById('pay-to-acc');
const payKid = document.getElementById('pay-kid');
const payAmount = document.getElementById('pay-amount');
const btnPayManual = document.getElementById('btn-pay-manual');
const efakturaList = document.getElementById('efaktura-list');

// Modals
const modalBankID = document.getElementById('modal-bankid');
const displayBankIDCode = document.getElementById('display-bankid-code');
const btnCloseBankID = document.getElementById('btn-close-bankid');

const modalPaperBill = document.getElementById('modal-paper-bill');
const billSender = document.getElementById('bill-sender');
const billDueWeek = document.getElementById('bill-due-week');
const billAmountDisplay = document.getElementById('bill-amount-display');
const billAccountDisplay = document.getElementById('bill-account-display');
const billKidDisplay = document.getElementById('bill-kid-display');
const btnCloseBill = document.getElementById('btn-close-bill');

const modalEfaktura = document.getElementById('modal-efaktura-offer');
const offerRecipient = document.getElementById('offer-recipient');
const btnAcceptEfaktura = document.getElementById('btn-accept-efaktura');
const btnDeclineEfaktura = document.getElementById('btn-decline-efaktura');

const modalGameOver = document.getElementById('modal-gameover');
const gameOverReason = document.getElementById('gameover-reason');
const btnRestart = document.getElementById('btn-restart');


// === INITIALISERING ===
function init() {
    loadGame();
    setupListeners();
    updateUI();
    updatePlannerCalc(); // Initier kalkulator
}

function setupListeners() {
    // Navigasjon
    navLife.addEventListener('click', () => switchView('life'));
    navBank.addEventListener('click', () => switchView('bank'));

    // Planlegger
    [inputSleep, inputWork, inputStudy].forEach(input => {
        input.addEventListener('input', updatePlannerCalc);
    });
    btnRunWeek.addEventListener('click', runWeek);

    // BankID
    btnGetBankID.addEventListener('click', generateBankID);
    btnCloseBankID.addEventListener('click', () => modalBankID.classList.add('hidden'));

    // Bank Login
    loginForm.addEventListener('submit', handleBankLogin);
    btnLogout.addEventListener('click', handleBankLogout);

    // Bank Betaling
    btnPayManual.addEventListener('click', handleManualPayment);

    // Modaler
    btnCloseBill.addEventListener('click', () => modalPaperBill.classList.add('hidden'));
    
    // eFaktura Tilbud
    btnAcceptEfaktura.addEventListener('click', () => handleEfakturaResponse(true));
    btnDeclineEfaktura.addEventListener('click', () => handleEfakturaResponse(false));

    // Game Over
    btnRestart.addEventListener('click', resetGame);
}

// === SPILL-LOGIKK (UKES-HJUL) ===

function updatePlannerCalc() {
    const sleep = parseInt(inputSleep.value) || 0;
    const work = parseInt(inputWork.value) || 0;
    const study = parseInt(inputStudy.value) || 0;
    
    // Totalt 168 timer i uka
    const totalUsed = (sleep * 7) + work + study;
    const freeTime = CONFIG.HOURS_IN_WEEK - totalUsed;

    calcFreeTime.textContent = freeTime;
    
    if (freeTime < 0) {
        calcFreeTime.style.color = 'red';
        btnRunWeek.disabled = true;
        btnRunWeek.textContent = "Du har ikke nok timer! 🕒";
    } else {
        calcFreeTime.style.color = 'inherit';
        btnRunWeek.disabled = false;
        btnRunWeek.textContent = "Start Uken 🚀";
    }
}

function runWeek() {
    // Hent verdier
    const sleepPerNight = parseInt(inputSleep.value) || 0;
    const workHours = parseInt(inputWork.value) || 0;
    const studyHours = parseInt(inputStudy.value) || 0;
    const foodType = selectFood.value;
    const freeTime = parseInt(calcFreeTime.textContent);

    console.log(`Starter Måned ${gameState.month}, Uke ${gameState.week}`);

    // 1. ØKONOMI
    // Matkostnad
    let foodCost = CONFIG.FOOD_COST[foodType];
    gameState.balance -= foodCost;
    showToast(`Matbudsjett trukket: -${foodCost} kr`, "info");

    // Lønn (Kun uke 1)
    if (gameState.week === 1) {
        gameState.balance += CONFIG.SALARY_BASE;
        showToast(`Månedslønn utbetalt: +${CONFIG.SALARY_BASE} kr`, "success");
    }
    // Overtid / Timebetaling (Hver uke hvis man jobber)
    if (workHours > 0) {
        const extraPay = workHours * CONFIG.HOURLY_RATE; // Forenklet: Får betalt for timer hver uke
        gameState.balance += extraPay;
        // showToast(`Lønn for timer: +${extraPay} kr`, "success");
    }

    // 2. HELSE & LYKKE BEREGNING
    let healthChange = 0;
    let happinessChange = 0;

    // Søvn (Mål: 7 timer * 7 dager = 49 timer)
    const weeklySleep = sleepPerNight * 7;
    if (weeklySleep < 49) {
        healthChange -= 5;
        happinessChange -= 5;
        showToast("Du sover for lite! Helse og humør synker.", "error");
    } else {
        healthChange += 1; // God søvn gir litt helse
    }

    // Mat
    if (foodType === 'low') {
        healthChange -= 3; // Nudler er ikke bra i lengden
    } else if (foodType === 'high') {
        healthChange += 2;
        happinessChange += 2;
    }

    // Fritid (Mindre enn 10 timer fri i uka er stressende)
    if (freeTime < 10) {
        happinessChange -= 10;
        showToast("Stresset! Du har nesten ingen fritid.", "error");
    } else {
        happinessChange += 2;
    }

    // Jobb (For mye jobb sliter)
    if (workHours > 50) {
        healthChange -= 5;
        happinessChange -= 5;
    }

    // Studier (Gir ingen umiddelbar glede, men nødvendig)
    if (studyHours > 0) {
        gameState.skills += (studyHours / 10); // Øk kompetanse
    }

    applyStatChanges(healthChange, happinessChange);

    // 3. GENERER REGNINGER
    generateWeeklyBills();

    // 4. TIDSHÅNDTERING
    gameState.week++;
    if (gameState.week > 4) {
        gameState.week = 1;
        gameState.month++;
        showToast("Ny måned! Husleien forfaller snart.", "info");
    }

    // 5. GAME OVER SJEKK
    if (gameState.balance < -10000) {
        triggerGameOver("Gjelden din ble for stor. Luksusfellen neste.");
        return;
    }
    if (gameState.health <= 0) {
        triggerGameOver("Du ble utbrent og havnet på sykehus.");
        return;
    }

    saveGame();
    updateUI();
}

function applyStatChanges(healthDelta, happinessDelta) {
    gameState.health = Math.max(0, Math.min(100, gameState.health + healthDelta));
    gameState.happiness = Math.max(0, Math.min(100, gameState.happiness + happinessDelta));
}

// === FAKTURA & POST ===

function generateWeeklyBills() {
    const m = gameState.month;
    const w = gameState.week; // Dette er uken som nettopp var

    // Husleie forfaller Uke 1
    if (w === 1) {
        createBill(CONFIG.RECIPIENTS.RENT, 6500, m, 1);
    }

    // Strøm forfaller Uke 3
    if (w === 3) {
        const amount = Math.floor(Math.random() * 800) + 400;
        createBill(CONFIG.RECIPIENTS.POWER, amount, m, 3);
    }

    // Mobil forfaller Uke 4
    if (w === 4) {
        createBill(CONFIG.RECIPIENTS.PHONE, 499, m, 4);
    }
}

function createBill(recipientInfo, amount, dueMonth, dueWeek) {
    // Sjekk om vi har eFaktura-avtale
    const hasEfaktura = gameState.efakturaAgreements.includes(recipientInfo.name);

    const bill = {
        id: Date.now() + Math.random(),
        recipient: recipientInfo.name,
        account: recipientInfo.account,
        kid: generateKID(),
        amount: amount,
        dueMonth: dueMonth,
        dueWeek: dueWeek,
        isPaid: false,
        isEfaktura: hasEfaktura
    };

    gameState.bills.push(bill);

    if (hasEfaktura) {
        showToast(`Ny eFaktura fra ${recipientInfo.name} i nettbanken.`, "info");
    } else {
        // Legg i postkassen
        gameState.mailbox.push(bill.id);
        showToast(`Du har fått post fra ${recipientInfo.name}!`, "info");
    }
}

function generateKID() {
    // Generer 8-sifret KID
    return Math.floor(10000000 + Math.random() * 90000000).toString();
}

// === BANK LOGIKK ===

function handleManualPayment() {
    // 1. Hent input
    const toAccount = payToAcc.value.trim();
    const kid = payKid.value.trim();
    const amount = parseFloat(payAmount.value);
    const fromAccountType = payFrom.value;

    if (!toAccount || !kid || isNaN(amount)) {
        showToast("Fyll ut alle feltene.", "error");
        return;
    }

    // 2. Finn regningen som matcher
    // Vi tillater at man betaler selv om man ikke har åpnet brevet i postkassen (hvis man gjettet KID?), 
    // men i praksis må man ha dataene.
    const bill = gameState.bills.find(b => 
        !b.isPaid && 
        b.account === toAccount && 
        b.kid == kid // Loose equality for string/number mix
    );

    if (!bill) {
        showToast("Fant ingen ubetalt regning med denne KID og Kontonummer.", "error");
        return;
    }

    if (amount < bill.amount) {
        showToast("Beløpet er for lavt til å dekke regningen.", "error");
        return;
    }

    // 3. Utfør betaling
    let balanceVar = fromAccountType === 'savings' ? 'savings' : 'balance';
    
    if (gameState[balanceVar] < amount) {
        showToast("Ikke nok dekning på konto.", "error");
        return;
    }

    // Trekk penger
    gameState[balanceVar] -= amount;
    bill.isPaid = true;
    
    // Fjern fra postkasse hvis den lå der
    gameState.mailbox = gameState.mailbox.filter(id => id !== bill.id);

    // Tøm skjema
    payToAcc.value = "";
    payKid.value = "";
    payAmount.value = "";

    showToast(`Betaling til ${bill.recipient} utført.`, "success");
    updateUI();

    // 4. Tilby eFaktura?
    if (!bill.isEfaktura && !gameState.efakturaAgreements.includes(bill.recipient)) {
        offerEfakturaModal(bill.recipient);
    }
}

function handlePayEfaktura(billId) {
    const bill = gameState.bills.find(b => b.id === billId);
    if (!bill) return;

    if (gameState.balance >= bill.amount) {
        gameState.balance -= bill.amount;
        bill.isPaid = true;
        showToast(`eFaktura til ${bill.recipient} betalt.`, "success");
        updateUI();
    } else {
        showToast("Ikke nok penger på brukskonto.", "error");
    }
}

// === EFAKTURA ===

let pendingEfakturaRecipient = null;

function offerEfakturaModal(recipientName) {
    pendingEfakturaRecipient = recipientName;
    offerRecipient.textContent = recipientName;
    modalEfaktura.classList.remove('hidden');
}

function handleEfakturaResponse(accepted) {
    modalEfaktura.classList.add('hidden');
    if (accepted && pendingEfakturaRecipient) {
        gameState.efakturaAgreements.push(pendingEfakturaRecipient);
        showToast(`AvtaleGiro opprettet med ${pendingEfakturaRecipient}.`, "success");
        // Heretter kommer regninger rett i banken
    }
}

// === UI OPPDATERING ===

function updateUI() {
    // Header
    dispMonth.textContent = gameState.month;
    dispWeek.textContent = gameState.week;
    dispCash.textContent = formatMoney(gameState.balance); // Viser saldo som "penger tilgjengelig" i livet også
    dispJob.textContent = gameState.jobTitle;

    // Bars
    barHealth.style.width = `${gameState.health}%`;
    barHealth.style.backgroundColor = gameState.health < 30 ? '#e74c3c' : '#2ecc71';
    
    barHappiness.style.width = `${gameState.happiness}%`;
    
    // Mailbox
    renderMailbox();

    // Bank Dashboard
    balChecking.textContent = formatMoney(gameState.balance, false);
    balSavings.textContent = formatMoney(gameState.savings, false);
    balBsu.textContent = formatMoney(gameState.bsu, false);
    
    renderEfakturaList();
}

function renderMailbox() {
    mailboxList.innerHTML = "";
    mailCountBadge.textContent = gameState.mailbox.length;
    
    if (gameState.mailbox.length === 0) {
        mailCountBadge.classList.add('hidden');
        mailboxList.innerHTML = '<div class="empty-msg">Postkassen er tom.</div>';
        return;
    }

    mailCountBadge.classList.remove('hidden');

    gameState.mailbox.forEach(billId => {
        const bill = gameState.bills.find(b => b.id === billId);
        if (!bill) return;

        const div = document.createElement('div');
        div.className = 'mail-item unread';
        div.textContent = `Regning fra ${bill.recipient}`;
        div.onclick = () => openPaperBill(bill);
        mailboxList.appendChild(div);
    });
}

function openPaperBill(bill) {
    billSender.textContent = bill.recipient;
    billDueWeek.textContent = `${bill.dueMonth} (Uke ${bill.dueWeek})`;
    billAmountDisplay.textContent = bill.amount.toFixed(2);
    billAccountDisplay.textContent = bill.account;
    billKidDisplay.textContent = bill.kid;
    
    modalPaperBill.classList.remove('hidden');
}

function renderEfakturaList() {
    efakturaList.innerHTML = "";
    
    // Finn ubetalte eFakturaer
    const bills = gameState.bills.filter(b => b.isEfaktura && !b.isPaid);

    if (bills.length === 0) {
        efakturaList.innerHTML = '<div class="empty-bills">Ingen eFakturaer til forfall.</div>';
        return;
    }

    bills.forEach(bill => {
        const div = document.createElement('div');
        div.className = 'bill-item';
        div.innerHTML = `
            <span><strong>${bill.recipient}</strong> (Forfall: Mnd ${bill.dueMonth})</span>
            <div style="display:flex; gap:10px; align-items:center;">
                <span>${bill.amount} kr</span>
                <button class="bank-action-btn" onclick="handlePayEfaktura(${bill.id})">Betal</button>
            </div>
        `;
        // Merk: onclick i HTML string krever at funksjonen er global. 
        // Vi løser dette med addEventListener under opprettelse for å holde scope rent.
        const btn = div.querySelector('button');
        btn.onclick = () => handlePayEfaktura(bill.id);
        
        efakturaList.appendChild(div);
    });
}

// === HJELPEFUNKSJONER ===

function generateBankID() {
    const code = Math.floor(100000 + Math.random() * 900000);
    gameState.currentBankID = code;
    displayBankIDCode.textContent = code;
    modalBankID.classList.remove('hidden');
}

function handleBankLogin(e) {
    e.preventDefault();
    const input = parseInt(inputBankIDLogin.value);
    if (input === gameState.currentBankID) {
        bankLoginScreen.classList.add('hidden');
        bankDashboard.classList.remove('hidden');
        loginError.classList.add('hidden');
        inputBankIDLogin.value = "";
        updateUI();
    } else {
        loginError.classList.remove('hidden');
    }
}

function handleBankLogout() {
    bankDashboard.classList.add('hidden');
    bankLoginScreen.classList.remove('hidden');
    gameState.currentBankID = null;
}

function switchView(view) {
    if (view === 'life') {
        viewLife.classList.add('active-view');
        viewLife.classList.remove('hidden-view');
        viewLife.style.display = 'flex';
        viewBank.classList.remove('active-view');
        viewBank.classList.add('hidden-view');
        viewBank.style.display = 'none';
        navLife.classList.add('active');
        navBank.classList.remove('active');
    } else {
        viewLife.classList.remove('active-view');
        viewLife.classList.add('hidden-view');
        viewLife.style.display = 'none';
        viewBank.classList.add('active-view');
        viewBank.classList.remove('hidden-view');
        viewBank.style.display = 'block';
        navLife.classList.remove('active');
        navBank.classList.add('active');
    }
}

function formatMoney(amount, suffix = true) {
    let s = amount.toLocaleString('no-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return suffix ? `${s} kr` : s;
}

function showToast(msg, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    const container = document.getElementById('toast-container');
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function saveGame() {
    localStorage.setItem('livetBankenSaveV2', JSON.stringify(gameState));
}

function loadGame() {
    const data = localStorage.getItem('livetBankenSaveV2');
    if (data) {
        try {
            const parsed = JSON.parse(data);
            gameState = { ...gameState, ...parsed }; // Merge default and saved
        } catch (e) {
            console.error("Save file corrupted");
        }
    }
}

function resetGame() {
    localStorage.removeItem('livetBankenSaveV2');
    location.reload();
}

function triggerGameOver(reason) {
    modalGameOver.classList.remove('hidden');
    gameOverReason.textContent = reason;
}

// Start
init();
/* Version: #6 */
