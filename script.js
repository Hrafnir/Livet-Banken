/* Version: #7 */

// === KONFIGURASJON ===
const CONFIG = {
    HOURS_IN_WEEK: 168,
    SALARY_BASE: 15000, // Utbetales uke 1 (Netto)
    HOURLY_RATE: 210,   // Ekstra per time jobb
    SHOPPING_COST: 200, // Pris per time shopping/sosialt
    
    // Krav
    SLEEP_REQ: 49,      // 7 timer * 7 dager
    CHORES_REQ: 5,      // Timer husarbeid for å unngå forfall
    
    // Faste mottakere
    RECIPIENTS: {
        RENT: { name: "Utleier AS", account: "1234.56.78901" },
        POWER: { name: "Fjordkraft", account: "9876.54.32109" },
        PHONE: { name: "Telenor", account: "5555.44.33333" },
        STREAMING: { name: "Netflix & Chill", account: "4444.33.22111" }
    },

    // Matbudsjett (Pris per uke)
    FOOD_COST: {
        low: 600,
        medium: 1500,
        high: 3500
    }
};

// === STATE MANAGEMENT ===
let gameState = {
    month: 1,
    week: 1,
    balance: 20000, // Startkapital
    savings: 5000,
    bsu: 0,
    
    health: 85,
    happiness: 85,
    jobTitle: "Avisbud",
    skills: 0,
    
    bills: [],
    mailbox: [], // IDer til uåpnede brev
    efakturaAgreements: [],
    
    currentBankID: null
};

// === DOM ELEMENTER ===
// Views
const viewLife = document.getElementById('view-life');
const viewBank = document.getElementById('view-bank');
const navLife = document.getElementById('nav-life');
const navBank = document.getElementById('nav-bank');

// Stats
const dispMonth = document.getElementById('disp-month');
const dispWeek = document.getElementById('disp-week');
const dispJob = document.getElementById('disp-job');
const dispCash = document.getElementById('disp-cash');
const barHealth = document.getElementById('bar-health');
const barHappiness = document.getElementById('bar-happiness');
const statSkills = document.getElementById('stat-skills');

// Planner Inputs
const inputSleep = document.getElementById('input-sleep');
const inputWork = document.getElementById('input-work');
const inputStudy = document.getElementById('input-study');
const inputExercise = document.getElementById('input-exercise');
const inputShopping = document.getElementById('input-shopping');
const inputChores = document.getElementById('input-chores');
const selectFood = document.getElementById('select-food-budget');

const calcFreeTime = document.getElementById('calc-free-time');
const btnRunWeek = document.getElementById('btn-run-week');

// Mailbox
const mailboxList = document.getElementById('mailbox-list');
const mailCountBadge = document.getElementById('mail-count');

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
const efakturaList = document.getElementById('efaktura-list');

// Bank Payment Form
const payFrom = document.getElementById('pay-from');
const payToAcc = document.getElementById('pay-to-acc');
const payKid = document.getElementById('pay-kid');
const payAmount = document.getElementById('pay-amount');
const btnPayManual = document.getElementById('btn-pay-manual');

// Modals
const modalBankID = document.getElementById('modal-bankid');
const displayBankIDCode = document.getElementById('display-bankid-code');
const btnGetBankID = document.getElementById('btn-get-bankid');
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
    console.log("System: Starter Livet & Banken...");
    loadGame();
    
    // Sjekk om vi skal generere start-regninger (Husleie)
    if (gameState.month === 1 && gameState.week === 1 && gameState.bills.length === 0) {
        console.log("System: Genererer første husleie.");
        createBill(CONFIG.RECIPIENTS.RENT, 6500, 1, 1);
    }

    setupListeners();
    updateUI();
    updatePlannerCalc(); // Kjør kalkulatoren en gang ved start
}

function setupListeners() {
    // Navigasjon
    navLife.addEventListener('click', () => switchView('life'));
    navBank.addEventListener('click', () => switchView('bank'));

    // Planlegger: Lytt på alle inputs
    const plannerInputs = [inputSleep, inputWork, inputStudy, inputExercise, inputShopping, inputChores];
    plannerInputs.forEach(input => {
        input.addEventListener('input', updatePlannerCalc);
    });
    btnRunWeek.addEventListener('click', runWeek);

    // BankID
    btnGetBankID.addEventListener('click', generateBankID);
    btnCloseBankID.addEventListener('click', () => modalBankID.classList.add('hidden'));

    // Bank
    loginForm.addEventListener('submit', handleBankLogin);
    btnLogout.addEventListener('click', handleBankLogout);
    btnPayManual.addEventListener('click', handleManualPayment);

    // Modals
    btnCloseBill.addEventListener('click', () => modalPaperBill.classList.add('hidden'));
    btnAcceptEfaktura.addEventListener('click', () => handleEfakturaResponse(true));
    btnDeclineEfaktura.addEventListener('click', () => handleEfakturaResponse(false));
    btnRestart.addEventListener('click', resetGame);
}

// === SPILL-LOGIKK (UKES-HJUL) ===

function updatePlannerCalc() {
    // Hent verdier (default til 0 hvis tom)
    const sleep = parseInt(inputSleep.value) || 0;
    const work = parseInt(inputWork.value) || 0;
    const study = parseInt(inputStudy.value) || 0;
    const exercise = parseInt(inputExercise.value) || 0;
    const shopping = parseInt(inputShopping.value) || 0;
    const chores = parseInt(inputChores.value) || 0;
    
    // Beregn totalt forbruk (søvn er per natt, resten er per uke)
    const totalUsed = (sleep * 7) + work + study + exercise + shopping + chores;
    const freeTime = CONFIG.HOURS_IN_WEEK - totalUsed;

    calcFreeTime.textContent = freeTime;
    
    if (freeTime < 0) {
        calcFreeTime.style.color = '#e74c3c'; // Rød
        btnRunWeek.disabled = true;
        btnRunWeek.textContent = "Ugyldig timeplan (Over 168t)";
        btnRunWeek.style.backgroundColor = '#95a5a6';
    } else {
        calcFreeTime.style.color = 'inherit';
        btnRunWeek.disabled = false;
        btnRunWeek.textContent = "Start Uken 🚀";
        btnRunWeek.style.backgroundColor = ''; // Reset til CSS default
    }
}

function runWeek() {
    // Hent input-verdier
    const sleepPerNight = parseInt(inputSleep.value) || 0;
    const workHours = parseInt(inputWork.value) || 0;
    const studyHours = parseInt(inputStudy.value) || 0;
    const exerciseHours = parseInt(inputExercise.value) || 0;
    const shoppingHours = parseInt(inputShopping.value) || 0;
    const choresHours = parseInt(inputChores.value) || 0;
    const foodType = selectFood.value;
    const freeTime = parseInt(calcFreeTime.textContent);

    console.log(`Kjører uke: M${gameState.month}U${gameState.week}`);

    // --- 1. ØKONOMI ---
    
    // Mat
    let foodCost = CONFIG.FOOD_COST[foodType];
    gameState.balance -= foodCost;
    
    // Lønn (Utbetales KUN i uke 1)
    if (gameState.week === 1) {
        gameState.balance += CONFIG.SALARY_BASE;
        showToast(`Månedslønn: +${CONFIG.SALARY_BASE} kr`, "success");
    }
    
    // Arbeidsinntekt (Timebetalt for alt arbeid)
    if (workHours > 0) {
        const salary = workHours * CONFIG.HOURLY_RATE;
        gameState.balance += salary;
    }

    // Shopping kostnad
    if (shoppingHours > 0) {
        const shopCost = shoppingHours * CONFIG.SHOPPING_COST;
        gameState.balance -= shopCost;
        // showToast(`Shopping: -${shopCost} kr`, "info");
    }

    // --- 2. KONSEKVENSER (HELSE/LYKKE) ---
    let healthChange = 0;
    let happinessChange = 0;

    // Søvn
    const weeklySleep = sleepPerNight * 7;
    if (weeklySleep < CONFIG.SLEEP_REQ) {
        healthChange -= 4;
        happinessChange -= 4;
        showToast("Lite søvn gjør deg gretten og sliten.", "error");
    } else {
        healthChange += 1;
    }

    // Mat
    if (foodType === 'low') healthChange -= 2;
    if (foodType === 'high') { happinessChange += 3; healthChange += 1; }

    // Trening
    if (exerciseHours > 3) {
        healthChange += 3;
        happinessChange += 1; // Endorfiner
    } else if (exerciseHours === 0) {
        healthChange -= 1; // Forfall
    }

    // Shopping / Sosialt
    if (shoppingHours > 2) {
        happinessChange += 4;
    } else if (freeTime < 5) {
        happinessChange -= 5;
        showToast("Du har ingen fritid. Stresset øker!", "error");
    }

    // Husarbeid (Risiko for uhell)
    if (choresHours < CONFIG.CHORES_REQ) {
        // 10% sjanse for at noe ryker
        if (Math.random() < 0.1) {
            const repairCost = 1500;
            gameState.balance -= repairCost;
            happinessChange -= 10;
            showToast(`Vaskemaskinen røk! Reparasjon: -${repairCost} kr.`, "error");
        }
    }

    // Studier
    if (studyHours > 0) {
        gameState.skills += (studyHours * 0.5);
    }

    // Påfør endringer
    gameState.health = Math.max(0, Math.min(100, gameState.health + healthChange));
    gameState.happiness = Math.max(0, Math.min(100, gameState.happiness + happinessChange));

    // --- 3. PROGRESJON ---
    gameState.week++;
    if (gameState.week > 4) {
        gameState.week = 1;
        gameState.month++;
        showToast("Ny måned starter nå.", "info");
    }

    // Generer nye regninger for den nye uken/måneden
    generateWeeklyBills();

    // Sjekk tapskriterier
    checkGameOver();

    // Lagre og oppdater
    saveGame();
    updateUI();
}

function checkGameOver() {
    if (gameState.balance < -15000) {
        triggerGameOver("Gjelden ble uhåndterbar. Namsmannen tok alt.");
    } else if (gameState.health <= 0) {
        triggerGameOver("Helsen din kollapset. Du ligger på sykehus.");
    } else if (gameState.happiness <= 0) {
        triggerGameOver("Du ga opp. Depresjonen tok overhånd.");
    }
}

// === FAKTURA SYSTEM ===

function generateWeeklyBills() {
    const m = gameState.month;
    const w = gameState.week;

    // Husleie: Alltid Uke 1
    if (w === 1) {
        createBill(CONFIG.RECIPIENTS.RENT, 6500, m, 1);
    }

    // Strøm: Uke 3 (Variabel sum)
    if (w === 3) {
        const cost = Math.floor(Math.random() * 800) + 400;
        createBill(CONFIG.RECIPIENTS.POWER, cost, m, 3);
    }

    // Mobil: Uke 4
    if (w === 4) {
        createBill(CONFIG.RECIPIENTS.PHONE, 449, m, 4);
    }
}

function createBill(recipientInfo, amount, dueMonth, dueWeek) {
    // Sjekk om eFaktura-avtale eksisterer
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
        showToast(`eFaktura mottatt fra ${recipientInfo.name}`, "info");
    } else {
        gameState.mailbox.push(bill.id);
        showToast(`Ny post fra ${recipientInfo.name}`, "info");
    }
}

function generateKID() {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
}

// === BANK SYSTEM (MANUELL & EFAKTURA) ===

// Hjelpefunksjon: Fjerner alt som ikke er tall (punktum, mellomrom)
function cleanString(str) {
    if (!str) return "";
    return str.toString().replace(/[^0-9]/g, '');
}

function handleManualPayment() {
    // 1. Hent og vask input
    const inputAcc = cleanString(payToAcc.value);
    const inputKID = cleanString(payKid.value);
    const inputAmt = parseFloat(payAmount.value);
    const fromType = payFrom.value;

    console.log(`Prøver betaling: Acc=${inputAcc}, KID=${inputKID}, Amt=${inputAmt}`);

    if (!inputAcc || !inputKID || isNaN(inputAmt)) {
        showToast("Fyll ut Kontonummer, KID og Beløp.", "error");
        return;
    }

    // 2. Finn matchende regning
    // Vi sammenligner "vaskede" versjoner av kontonummer og KID
    const bill = gameState.bills.find(b => {
        if (b.isPaid) return false;
        
        const billAcc = cleanString(b.account);
        const billKID = cleanString(b.kid);
        
        return (billAcc === inputAcc && billKID === inputKID);
    });

    if (!bill) {
        showToast("Fant ingen ubetalt regning med denne KID/Konto.", "error");
        return;
    }

    if (Math.abs(inputAmt - bill.amount) > 1) { // Tillat 1 kr diff
        showToast(`Feil beløp! Regningen er på ${bill.amount} kr.`, "error");
        return;
    }

    // 3. Utfør transaksjon
    const balanceKey = fromType === 'savings' ? 'savings' : 'balance';
    
    if (gameState[balanceKey] < inputAmt) {
        showToast("Ikke nok dekning på konto.", "error");
        return;
    }

    gameState[balanceKey] -= inputAmt;
    bill.isPaid = true;
    
    // Fjern fra postkasse (hvis den var der)
    gameState.mailbox = gameState.mailbox.filter(id => id !== bill.id);

    // Tøm input
    payToAcc.value = "";
    payKid.value = "";
    payAmount.value = "";

    showToast("Betaling utført!", "success");
    updateUI();

    // 4. Tilby eFaktura hvis vi ikke har det
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
        showToast(`Betalte ${bill.recipient} (eFaktura).`, "success");
        updateUI();
    } else {
        showToast("Ikke nok dekning på Brukskonto.", "error");
    }
}

// === EFAKTURA AVTALE ===
let pendingRecipient = null;

function offerEfakturaModal(name) {
    pendingRecipient = name;
    offerRecipient.textContent = name;
    modalEfaktura.classList.remove('hidden');
}

function handleEfakturaResponse(accepted) {
    modalEfaktura.classList.add('hidden');
    if (accepted && pendingRecipient) {
        gameState.efakturaAgreements.push(pendingRecipient);
        showToast(`AvtaleGiro opprettet med ${pendingRecipient}.`, "success");
    }
    pendingRecipient = null;
}

// === UI & DISPLAY ===

function updateUI() {
    // Header Stats
    dispMonth.textContent = gameState.month;
    dispWeek.textContent = gameState.week;
    dispJob.textContent = gameState.jobTitle;
    dispCash.textContent = formatMoney(gameState.balance);
    statSkills.textContent = Math.floor(gameState.skills);

    // Bars
    barHealth.style.width = `${gameState.health}%`;
    barHealth.style.backgroundColor = gameState.health < 30 ? '#e74c3c' : '#2ecc71';
    
    barHappiness.style.width = `${gameState.happiness}%`;
    barHappiness.style.backgroundColor = gameState.happiness < 30 ? '#e74c3c' : '#4ecdc4';

    // Mailbox
    renderMailbox();

    // Bank
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
        mailboxList.innerHTML = '<div class="empty-msg">Ingen ny post.</div>';
        return;
    }
    
    mailCountBadge.classList.remove('hidden');

    // Vis nyeste post først
    const activeMail = gameState.mailbox.map(id => gameState.bills.find(b => b.id === id)).filter(b => b); // Filter undefined
    
    activeMail.forEach(bill => {
        const div = document.createElement('div');
        div.className = 'mail-item unread';
        div.innerHTML = `<span>Regning: ${bill.recipient}</span> <span style="font-size:0.8rem">Uke ${bill.dueWeek}</span>`;
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
    const dueBills = gameState.bills.filter(b => b.isEfaktura && !b.isPaid);

    if (dueBills.length === 0) {
        efakturaList.innerHTML = '<div class="empty-bills">Ingen eFakturaer til forfall.</div>';
        return;
    }

    dueBills.forEach(bill => {
        const div = document.createElement('div');
        div.className = 'bill-item';
        div.innerHTML = `
            <div>
                <strong>${bill.recipient}</strong><br>
                <small>Forfall: Mnd ${bill.dueMonth}, Uke ${bill.dueWeek}</small>
            </div>
            <div style="text-align:right">
                <div>${bill.amount} kr</div>
                <button class="bank-action-btn" style="margin-top:5px; padding: 4px 8px;" onclick="handlePayEfaktura(${bill.id})">Betal</button>
            </div>
        `;
        // Fix scope issue for inline onclick
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
    if (parseInt(inputBankIDLogin.value) === gameState.currentBankID) {
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

function showToast(msg, type = "info") {
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
    localStorage.setItem('livetBankenV3', JSON.stringify(gameState));
}

function loadGame() {
    const data = localStorage.getItem('livetBankenV3');
    if (data) {
        try {
            const parsed = JSON.parse(data);
            gameState = { ...gameState, ...parsed };
        } catch (e) { console.error("Save error"); }
    }
}

function resetGame() {
    localStorage.removeItem('livetBankenV3');
    location.reload();
}

function triggerGameOver(reason) {
    modalGameOver.classList.remove('hidden');
    gameOverReason.textContent = reason;
}

// Start
init();
/* Version: #7 */
