/* Version: #1 - script_bank.js */

window.initBank = function() {
    console.log("Bank: Initierer...");
    
    document.getElementById('login-form').addEventListener('submit', handleBankLogin);
    document.getElementById('btn-logout').addEventListener('click', () => handleBankLogout(true));
    
    document.getElementById('btn-pay-manual').addEventListener('click', handleManualPayment);
    document.getElementById('btn-transfer').addEventListener('click', handleTransfer);
    
    document.getElementById('btn-accept-efaktura').addEventListener('click', () => handleEfakturaResponse(true));
    document.getElementById('btn-decline-efaktura').addEventListener('click', () => handleEfakturaResponse(false));
    document.getElementById('btn-close-bankid').addEventListener('click', () => document.getElementById('modal-bankid').classList.add('hidden'));
    document.getElementById('btn-get-bankid').addEventListener('click', generateBankID);
};

function generateBankID() {
    gameState.currentBankID = Math.floor(100000 + Math.random() * 900000);
    document.getElementById('display-bankid-code').textContent = gameState.currentBankID;
    document.getElementById('modal-bankid').classList.remove('hidden');
}

function handleBankLogin(e) {
    e.preventDefault();
    const input = document.getElementById('input-bankid-login');
    const dashboard = document.getElementById('bank-dashboard-screen');
    const loginScreen = document.getElementById('bank-login-screen');
    const errorMsg = document.getElementById('login-error');

    if (parseInt(input.value) === gameState.currentBankID) {
        loginScreen.classList.add('hidden');
        dashboard.classList.remove('hidden');
        errorMsg.classList.add('hidden');
        input.value = "";
        updateBankUI();
    } else {
        errorMsg.classList.remove('hidden');
    }
}

window.handleBankLogout = function(showMsg = true) {
    document.getElementById('bank-dashboard-screen').classList.add('hidden');
    document.getElementById('bank-login-screen').classList.remove('hidden');
    gameState.currentBankID = null;
    if(showMsg) showToast("Logget ut av nettbanken", "info");
}

function handleManualPayment() {
    // VIKTIG: Hent elementene NÅR funksjonen kjøres, ikke før.
    const toInput = document.getElementById('pay-to-acc');
    const kidInput = document.getElementById('pay-kid');
    const amtInput = document.getElementById('pay-amount');
    const fromInput = document.getElementById('pay-from');

    if (!toInput || !kidInput || !amtInput) {
        console.error("DOM Error: Fant ikke input-felter i banken.");
        return;
    }

    const acc = toInput.value.replace(/[^0-9]/g, '');
    const kid = kidInput.value.replace(/[^0-9]/g, '');
    const amt = parseFloat(amtInput.value);

    // Finn regning
    const bill = gameState.bills.find(b => !b.isPaid && b.account.replace(/[^0-9]/g, '') === acc && b.kid === kid);

    if (bill && Math.abs(bill.amount - amt) < 2) {
        const fromKey = fromInput.value === "savings" ? "savings" : "balance";
        if (gameState[fromKey] >= amt) {
            gameState[fromKey] -= amt;
            bill.isPaid = true;
            gameState.mailbox = gameState.mailbox.filter(id => id !== bill.id);
            showToast("Betalt!", "success");
            
            // eFaktura tilbud
            if (!bill.isEfaktura && !gameState.efakturaAgreements.includes(bill.recipient)) {
                document.getElementById('offer-text').textContent = `Vil du opprette AvtaleGiro med ${bill.recipient}?`;
                gameState.pendingEfaktura = bill.recipient;
                document.getElementById('modal-efaktura-offer').classList.remove('hidden');
            }
            
            // Tøm felter
            toInput.value = ""; 
            kidInput.value = ""; 
            amtInput.value = "";
            
            if(window.updateUI) window.updateUI(); // Oppdater hoved-UI
        } else {
            showToast("Ikke nok penger på konto.", "error");
        }
    } else {
        showToast("Ugyldig betaling. Sjekk KID/Konto.", "error");
    }
}

function handleTransfer() {
    const from = document.getElementById('trans-from').value;
    const to = document.getElementById('trans-to').value;
    const amtInput = document.getElementById('trans-amount');
    const amt = parseFloat(amtInput.value);
    const map = { "checking": "balance", "savings": "savings", "bsu": "bsu" };
    
    if (from !== to && gameState[map[from]] >= amt && amt > 0) {
        gameState[map[from]] -= amt;
        gameState[map[to]] += amt;
        showToast("Overføring vellykket.", "success");
        amtInput.value = "";
        if(window.updateUI) window.updateUI();
    } else {
        showToast("Feil ved overføring.", "error");
    }
}

function handleEfakturaResponse(accept) {
    document.getElementById('modal-efaktura-offer').classList.add('hidden');
    if (accept && gameState.pendingEfaktura) {
        gameState.efakturaAgreements.push(gameState.pendingEfaktura);
        showToast("AvtaleGiro opprettet.", "success");
    }
    gameState.pendingEfaktura = null;
}

// Globalt tilgjengelig for onclick
window.payEfaktura = function(id) {
    const bill = gameState.bills.find(b => b.id === id);
    if (!bill) return;

    if (gameState.balance >= bill.amount) {
        gameState.balance -= bill.amount;
        bill.isPaid = true;
        showToast("Betalt (eFaktura).", "success");
        if(window.updateUI) window.updateUI();
    } else {
        showToast("Ikke nok penger på brukskonto.", "error");
    }
};

window.generateMonthlyBills = function() {
    const m = gameState.month;
    const house = DATA_HOUSING.find(h => h.id === gameState.housingId);

    // Husleie (hvis ikke kjeller)
    if (house.type === 'rent' && house.id !== 'rent_basement') {
        createBill(CONFIG.RECIPIENTS.RENT, house.price, m, 1);
    } 
    // Boliglån
    else if (house.type === 'buy') {
        const loan = gameState.loans.find(l => l.name === "Boliglån");
        if (loan) {
            const interest = (loan.amount * loan.rate) / 12;
            const principal = loan.originalAmount / CONFIG.LOAN_TERM_MONTHS;
            createBill(CONFIG.RECIPIENTS.BANK, Math.floor(interest+principal), m, 1);
            loan.amount = Math.max(0, loan.amount - principal); 
        }
    }
    
    // Faste utgifter
    createBill(CONFIG.RECIPIENTS.POWER, Math.floor(Math.random()*800)+400, m, 2);
    createBill(CONFIG.RECIPIENTS.PHONE, 449, m, 3);
};

window.updateBankUI = function() {
    document.getElementById('bal-checking').textContent = formatMoney(gameState.balance);
    document.getElementById('bal-savings').textContent = formatMoney(gameState.savings);
    document.getElementById('bal-bsu').textContent = formatMoney(gameState.bsu);

    const loanCont = document.getElementById('loan-container');
    loanCont.innerHTML = "";
    let totalDebt = 0;
    
    if (gameState.loans.length === 0) {
        loanCont.innerHTML = '<div class="empty-bills">Ingen lån.</div>';
    } else {
        gameState.loans.forEach(loan => {
            totalDebt += loan.amount;
            const div = document.createElement('div');
            div.className = 'loan-item';
            div.innerHTML = `<span>${loan.name}</span><span>${formatMoney(loan.amount)}</span>`;
            loanCont.appendChild(div);
        });
    }
    document.getElementById('total-debt').textContent = formatMoney(totalDebt);

    // eFaktura
    const efList = document.getElementById('efaktura-list');
    efList.innerHTML = "";
    const due = gameState.bills.filter(b => b.isEfaktura && !b.isPaid);
    
    if (due.length === 0) {
        efList.innerHTML = '<div class="empty-bills">Ingen krav.</div>';
    } else {
        due.forEach(bill => {
            const div = document.createElement('div');
            div.className = 'mail-item';
            div.innerHTML = `<span>${bill.recipient} (${bill.amount} kr)</span><button class="bank-action-btn" style="width:auto; padding:5px;" onclick="payEfaktura(${bill.id})">Betal</button>`;
            efList.appendChild(div);
        });
    }
};
/* Version: #1 */
