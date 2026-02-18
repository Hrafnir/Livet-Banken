/* Version: #21 - The Complete, Unabridged Code */

// === KONFIGURASJON ===
const CONFIG = {
    HOURS_IN_WEEK: 168,
    XP_PER_LEVEL: 100, // 100 timer studier = 1 nivå
    
    // Økonomi
    LOAN_INTEREST_RATE: 0.045, // 4.5% rente
    LOAN_TERM_MONTHS: 300, // 25 år
    
    // Faste mottakere
    RECIPIENTS: {
        RENT: { name: "Utleier AS", account: "1234.56.78901" },
        BANK: { name: "NordBanken Lån", account: "9999.88.77777" },
        POWER: { name: "Fjordkraft", account: "9876.54.32109" },
        PHONE: { name: "Telenor", account: "5555.44.33333" }
    },

    // Matbudsjett (Pris per uke)
    FOOD_COST: {
        low: 500,
        medium: 1500,
        high: 3500
    }
};

// === STATE MANAGEMENT (TILSTAND) ===
let gameState = {
    // Tid
    month: 1,
    week: 1,
    
    // Økonomi
    balance: 2000, 
    savings: 0,
    bsu: 0,
    loans: [], // Array av { id, name, amount, originalAmount, rate }
    
    // Spiller
    health: 90,
    happiness: 90,
    
    // Livsstil
    jobId: "job_newspaper",
    housingId: "rent_basement",
    skills: {}, // Eks: { "service": 250 }
    inventory: [], // Liste av ID-er
    
    // Data
    bills: [],
    mailbox: [],
    efakturaAgreements: [],
    
    // System
    currentBankID: null,
    activeStudy: null,
    pendingEfaktura: null,
    parentsPaid: false // Sjekk for kjeller-leie
};

// === INITIALISERING ===
// Kjøres når scriptet lastes (nederst i body)
function init() {
    console.log("System: Initierer Versjon 21 (Fullversjon)...");
    
    loadGame();
    
    // Sikkerhetssjekk av data (hvis lagret spill mangler felter)
    if (!gameState.housingId) gameState.housingId = "rent_basement";
    if (!gameState.loans) gameState.loans = [];
    if (!gameState.inventory) gameState.inventory = [];
    if (!gameState.skills) gameState.skills = {};
    if (gameState.parentsPaid === undefined) gameState.parentsPaid = false;

    // Generer UI fra datafiler
    renderJobs();
    renderHousing();
    renderEducation();
    renderStore();
    
    // Opprett første husleie HVIS det er nytt spill og man IKKE bor hos foreldre
    if (gameState.month === 1 && gameState.week === 1 && gameState.bills.length === 0) {
        const house = DATA_HOUSING.find(h => h.id === gameState.housingId);
        if (house && house.type === 'rent' && house.id !== 'rent_basement') {
            createBill(CONFIG.RECIPIENTS.RENT, house.price, 1, 1);
        }
    }

    setupListeners();
    updateUI();
    updatePlannerCalc();
}

function setupListeners() {
    // Navigasjon
    document.getElementById('nav-life').addEventListener('click', () => switchView('life'));
    document.getElementById('nav-jobs').addEventListener('click', () => switchView('jobs'));
    document.getElementById('nav-housing').addEventListener('click', () => switchView('housing'));
    document.getElementById('nav-edu').addEventListener('click', () => switchView('edu'));
    document.getElementById('nav-store').addEventListener('click', () => switchView('store'));
    document.getElementById('nav-bank').addEventListener('click', () => switchView('bank'));

    // Planner inputs (lytt på alle endringer)
    const inputs = document.querySelectorAll('.planner-input input, .planner-input select');
    inputs.forEach(inp => {
        inp.addEventListener('input', updatePlannerCalc);
    });
    
    document.getElementById('btn-run-week').addEventListener('click', runWeek);

    // BankID
    document.getElementById('btn-get-bankid').addEventListener('click', generateBankID);
    document.getElementById('btn-close-bankid').addEventListener('click', () => {
        document.getElementById('modal-bankid').classList.add('hidden');
    });

    // Bank Handlinger
    document.getElementById('login-form').addEventListener('submit', handleBankLogin);
    document.getElementById('btn-logout').addEventListener('click', () => handleBankLogout(true));
    
    // VIKTIG: Vi bruker funksjonsreferanser her, men logikken inni henter elementene på nytt
    document.getElementById('btn-pay-manual').addEventListener('click', handleManualPayment);
    document.getElementById('btn-transfer').addEventListener('click', handleTransfer);

    // Modaler
    document.getElementById('btn-close-bill').addEventListener('click', () => {
        document.getElementById('modal-paper-bill').classList.add('hidden');
    });
    document.getElementById('btn-accept-efaktura').addEventListener('click', () => handleEfakturaResponse(true));
    document.getElementById('btn-decline-efaktura').addEventListener('click', () => handleEfakturaResponse(false));
    document.getElementById('btn-close-event').addEventListener('click', () => {
        document.getElementById('modal-event').classList.add('hidden');
    });
    document.getElementById('btn-restart').addEventListener('click', resetGame);
    
    // Foreldre-betaling (hvis knappen finnes i HTML)
    const btnPayParents = document.getElementById('btn-pay-parents');
    if (btnPayParents) {
        btnPayParents.addEventListener('click', payParents);
    }
}

// === SPILL-LOGIKK (UKES-HJUL) ===

function calculateCommuteTime() {
    const job = DATA_JOBS.find(j => j.id === gameState.jobId);
    const workInput = document.getElementById('input-work');
    if (!job || !workInput || parseInt(workInput.value) === 0) return 0;

    let commute = job.commuteBase;

    // Sjekk inventory for effekter (Sykkel, Bil etc)
    gameState.inventory.forEach(itemId => {
        const item = DATA_ITEMS.find(i => i.id === itemId);
        if (item && item.effect && item.effect.commuteReduction) {
            commute -= item.effect.commuteReduction;
        }
    });

    return Math.max(0, commute);
}

function updatePlannerCalc() {
    const job = DATA_JOBS.find(j => j.id === gameState.jobId);
    
    // Hent verdier direkte fra DOM
    const sleep = parseInt(document.getElementById('input-sleep').value) || 0;
    const work = parseInt(document.getElementById('input-work').value) || 0;
    const chores = parseInt(document.getElementById('input-chores').value) || 0;
    const study = parseInt(document.getElementById('input-study').value) || 0;
    const exercise = parseInt(document.getElementById('input-exercise').value) || 0;
    const shopping = parseInt(document.getElementById('input-shopping').value) || 0;

    const commute = calculateCommuteTime();
    document.getElementById('calc-commute').textContent = commute;

    const totalUsed = (sleep * 7) + work + chores + study + exercise + shopping + commute;
    const freeTime = CONFIG.HOURS_IN_WEEK - totalUsed;

    const freeTimeEl = document.getElementById('calc-free-time');
    freeTimeEl.textContent = freeTime;

    // Validering
    let isValid = true;
    let errorMsg = "Start Uken 🚀";

    if (freeTime < 0) {
        isValid = false;
        errorMsg = "Ikke nok timer!";
    } else if (work > 0 && work < job.minHours) {
        isValid = false;
        errorMsg = `Min jobb: ${job.minHours}t`;
    } else if (work > job.maxHours) {
        isValid = false;
        errorMsg = `Maks jobb: ${job.maxHours}t`;
    }

    const btn = document.getElementById('btn-run-week');
    btn.disabled = !isValid;
    btn.textContent = errorMsg;
    freeTimeEl.style.color = freeTime < 0 ? '#e74c3c' : 'inherit';
}

function runWeek() {
    // Hent verdier på nytt
    const sleep = parseInt(document.getElementById('input-sleep').value) || 0;
    const work = parseInt(document.getElementById('input-work').value) || 0;
    const study = parseInt(document.getElementById('input-study').value) || 0;
    const exercise = parseInt(document.getElementById('input-exercise').value) || 0;
    const shopping = parseInt(document.getElementById('input-shopping').value) || 0;
    const chores = parseInt(document.getElementById('input-chores').value) || 0;
    const foodType = document.getElementById('select-food-budget').value;
    const freeTime = parseInt(document.getElementById('calc-free-time').textContent);

    console.log(`Kjører M${gameState.month} U${gameState.week}`);

    // --- 1. ØKONOMI ---
    let expenses = CONFIG.FOOD_COST[foodType];
    
    // Abonnementer & Forsikring (månedspris / 4)
    gameState.inventory.forEach(itemId => {
        const item = DATA_ITEMS.find(i => i.id === itemId);
        if (item && (item.type === "subscription" || item.type === "insurance")) {
            expenses += (item.price / 4);
        }
    });

    // Studieavgift
    if (gameState.activeStudy && study > 0) {
        const edu = DATA_EDUCATION.find(e => e.id === gameState.activeStudy);
        if (edu) expenses += edu.costPerWeek;
    }

    gameState.balance -= expenses;

    // Inntekt
    const job = DATA_JOBS.find(j => j.id === gameState.jobId);
    if (work > 0) {
        gameState.balance += (work * job.salary);
    }

    // --- 2. FERDIGHETER (XP) ---
    if (study > 0 && gameState.activeStudy) {
        const edu = DATA_EDUCATION.find(e => e.id === gameState.activeStudy);
        
        let multiplier = 1;
        if (hasItem("sub_ai")) multiplier = 2;

        const xpGain = study * edu.difficulty * multiplier;
        
        if (!gameState.skills[edu.category]) gameState.skills[edu.category] = 0;
        gameState.skills[edu.category] += xpGain;
        
        console.log(`Studerte ${edu.category}. XP: ${gameState.skills[edu.category]}`);
    }

    // --- 3. HELSE & LYKKE ---
    let dHealth = 0;
    let dHappiness = 0;

    const house = DATA_HOUSING.find(h => h.id === gameState.housingId);
    if (house) dHappiness += house.comfort;

    // Jobb belaster
    if (work > 0) dHappiness -= Math.floor(work / 12); 
    // Studier belaster
    if (study > 0) dHappiness -= Math.floor(study / 15);

    // Søvn
    if ((sleep * 7) < 49) { dHealth -= 2; dHappiness -= 3; } else { dHealth += 1; }
    
    // Mat
    if (foodType === 'low') dHealth -= 2;
    if (foodType === 'high') { dHealth += 1; dHappiness += 2; }
    
    // Trening
    if (exercise > 3) { dHealth += 3; dHappiness += 1; } else if (exercise === 0) { dHealth -= 1; }
    if (hasItem("sub_gym") && exercise > 0) dHealth += 2;
    
    // Sosialt
    if (shopping > 2) dHappiness += 3;
    if (hasItem("sub_netflix") && freeTime > 5) dHappiness += 2;

    // Husarbeid (Risiko for uhell)
    if (chores < 3 && Math.random() < 0.1) {
        if (gameState.housingId === 'rent_basement') {
            showToast("Vannlekkasje! Pappa fikset det.", "info");
        } else {
            createBill({name: "Rørlegger", account: "1111.22.33333"}, 2500, gameState.month, gameState.week);
            showToast("Vannlekkasje! Rørlegger tilkalt.", "error");
        }
    }

    dHappiness += job.happinessImpact;

    // --- 4. HENDELSER ---
    handleRandomEvent();

    // Oppdater stats
    gameState.health = clamp(gameState.health + dHealth, 0, 100);
    gameState.happiness = clamp(gameState.happiness + dHappiness, 0, 100);

    // --- 5. TID & PROGRESJON ---
    gameState.week++;
    if (gameState.week > 4) {
        // Sjekk om foreldre er betalt (hvis man bor i kjelleren)
        if (gameState.housingId === 'rent_basement' && !gameState.parentsPaid) {
            gameState.happiness = Math.max(0, gameState.happiness - 20);
            showToast("Glemte å betale foreldre! De er skuffet.", "error");
        }

        gameState.week = 1;
        gameState.month++;
        gameState.parentsPaid = false; // Reset for ny måned
        
        showToast("Ny måned!", "info");
        generateMonthlyBills();
    }

    // Sikkerhet: Logg ut av nettbanken hver uke
    handleBankLogout(false);

    checkGameOver();
    saveGame();
    updateUI();
    renderJobs(); // Oppdater knapper i tilfelle nytt nivå
}

// === BOLIG & LÅN ===

function payParents() {
    if (gameState.parentsPaid) {
        showToast("Du har allerede betalt denne måneden.", "info");
        return;
    }
    if (gameState.balance >= 2000) {
        gameState.balance -= 2000;
        gameState.parentsPaid = true;
        showToast("Vippset 2000 kr til mat.", "success");
        updateUI();
    } else {
        showToast("Ikke nok penger.", "error");
    }
}

function switchHousing(id) {
    const newHouse = DATA_HOUSING.find(h => h.id === id);
    if (!newHouse) return;

    if (newHouse.type === 'rent') {
        clearHousingLoans();
        gameState.housingId = id;
        showToast(`Flyttet til ${newHouse.title}`, "success");
    } 
    else if (newHouse.type === 'buy') {
        const downPayment = newHouse.price * newHouse.reqEquity;
        const liquidAssets = gameState.balance + gameState.savings;
        
        if (liquidAssets < downPayment) {
            return showToast(`Mangler ${formatMoney(downPayment - liquidAssets)} i egenkapital!`, "error");
        }

        // Trekk penger (først spar, så bruks)
        let remain = downPayment;
        if (gameState.savings >= remain) {
            gameState.savings -= remain;
            remain = 0;
        } else {
            remain -= gameState.savings;
            gameState.savings = 0;
            gameState.balance -= remain;
        }

        const loanAmount = newHouse.price - downPayment;
        clearHousingLoans();
        
        gameState.loans.push({
            id: Date.now(),
            name: "Boliglån",
            amount: loanAmount,
            originalAmount: loanAmount,
            rate: CONFIG.LOAN_INTEREST_RATE
        });

        gameState.housingId = id;
        showToast(`Bolig kjøpt! Lån: ${formatMoney(loanAmount)}`, "success");
    }

    updateUI();
    renderHousing();
}

function clearHousingLoans() {
    gameState.loans = gameState.loans.filter(l => l.name !== "Boliglån");
}

function generateMonthlyBills() {
    const m = gameState.month;
    const house = DATA_HOUSING.find(h => h.id === gameState.housingId);

    // 1. Husleie (Kun hvis man IKKE bor i kjelleren)
    if (house.type === 'rent') {
        if (house.id !== 'rent_basement') {
            createBill(CONFIG.RECIPIENTS.RENT, house.price, m, 1);
        }
    } 
    // 2. Boliglån
    else {
        const loan = gameState.loans.find(l => l.name === "Boliglån");
        if (loan) {
            const interest = (loan.amount * loan.rate) / 12;
            const principal = loan.originalAmount / CONFIG.LOAN_TERM_MONTHS;
            const monthlyPayment = Math.floor(interest + principal);

            createBill(CONFIG.RECIPIENTS.BANK, monthlyPayment, m, 1);
            
            // Forenkling: Reduser lånet nå (i virkeligheten skjer det ved betaling)
            loan.amount = Math.max(0, loan.amount - principal); 
        }
    }

    // Strøm og Mobil
    createBill(CONFIG.RECIPIENTS.POWER, Math.floor(Math.random()*800)+400, m, 2);
    createBill(CONFIG.RECIPIENTS.PHONE, 449, m, 3);
}

function createBill(recipient, amount, m, w) {
    const isEfaktura = gameState.efakturaAgreements.includes(recipient.name);
    const kid = Math.floor(Math.random() * 100000000).toString();
    const bill = {
        id: Date.now() + Math.random(),
        recipient: recipient.name,
        account: recipient.account,
        kid: kid,
        amount: Math.floor(amount),
        dueMonth: m,
        dueWeek: w,
        isPaid: false,
        isEfaktura: isEfaktura
    };
    gameState.bills.push(bill);

    if (!isEfaktura) gameState.mailbox.push(bill.id);
}

// === HENDELSER ===

function handleRandomEvent() {
    if (Math.random() > 0.15) return; // 15% sjanse
    
    // Filtrer hendelser basert på krav (reqItem)
    const possibleEvents = DATA_EVENTS.filter(e => {
        if (!e.reqItem) return true;
        if (e.reqItem.startsWith('!')) {
            // Krav: Skal IKKE ha item
            const item = e.reqItem.substring(1);
            return !hasItem(item);
        } else {
            // Krav: SKAL ha item
            return hasItem(e.reqItem);
        }
    });

    if (possibleEvents.length === 0) return;

    const event = possibleEvents[Math.floor(Math.random() * possibleEvents.length)];
    let cost = event.cost;
    let msg = "";

    if (cost > 0 && event.type !== "none") {
        // Kjeller-forsikring
        if (gameState.housingId === 'rent_basement') {
            cost = 0;
            msg = "Dekket av foreldrenes forsikring.";
        } else {
            const insurance = DATA_ITEMS.find(i => i.type === "insurance" && i.covers?.includes(event.id) && hasItem(i.id));
            if (insurance) {
                cost = 500; // Egenandel
                msg = `Dekket av ${insurance.name}!`;
            } else {
                msg = "Ingen forsikring.";
            }
        }
    }

    document.getElementById('event-text').textContent = event.text;
    document.getElementById('event-cost').textContent = cost !== 0 ? `${cost} kr` : "";
    document.getElementById('event-insurance').textContent = msg;
    document.getElementById('modal-event').classList.remove('hidden');

    if (cost !== 0) createBill({name: "Uforutsett", account: "9999.11.22222"}, cost, gameState.month, gameState.week);
    gameState.happiness = clamp(gameState.happiness + event.happinessImpact, 0, 100);
}

// === BANK FUNKSJONER (SIKKER INPUT-HENTING) ===

function handleManualPayment() {
    // VIKTIG: Hent elementene HER, inne i funksjonen, for å unngå null-referanser
    const toInput = document.getElementById('pay-to-acc');
    const kidInput = document.getElementById('pay-kid');
    const amtInput = document.getElementById('pay-amount');
    const fromInput = document.getElementById('pay-from');

    if (!toInput || !kidInput || !amtInput) {
        console.error("Critical DOM Error: Input fields not found in handleManualPayment");
        return;
    }

    // Vask input
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
            
            // Tilby eFaktura
            if (!bill.isEfaktura && !gameState.efakturaAgreements.includes(bill.recipient)) {
                document.getElementById('offer-recipient').textContent = bill.recipient;
                gameState.pendingEfaktura = bill.recipient;
                document.getElementById('modal-efaktura-offer').classList.remove('hidden');
            }
            
            // Tøm feltene
            toInput.value = ""; 
            kidInput.value = ""; 
            amtInput.value = "";
            updateUI();
        } else {
            showToast("Ikke nok penger på konto.", "error");
        }
    } else {
        showToast("Ugyldig betaling (Sjekk KID/Konto/Beløp)", "error");
    }
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
        updateUI();
    } else {
        errorMsg.classList.remove('hidden');
    }
}

function handleBankLogout(showMsg = true) {
    document.getElementById('bank-dashboard-screen').classList.add('hidden');
    document.getElementById('bank-login-screen').classList.remove('hidden');
    gameState.currentBankID = null;
    if(showMsg) showToast("Logget ut av nettbanken", "info");
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
        updateUI();
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

// === GENERERING AV UI ===

function getImgHTML(imgSrc, altText) {
    // Hvis bilde mangler, vis en boks med tekst. Hvis bilde feiler ved lasting, skjul det.
    if (imgSrc && imgSrc !== "") {
        return `<img src="${imgSrc}" class="housing-img" alt="${altText}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                <div class="housing-img" style="display:none; align-items:center; justify-content:center; color:#999;">Bilde mangler</div>`;
    }
    return `<div class="housing-img" style="display:flex; align-items:center; justify-content:center; color:#999;">Ingen bilde</div>`;
}

function renderJobs() {
    const list = document.getElementById('job-list');
    list.innerHTML = "";
    DATA_JOBS.forEach(job => {
        const card = document.createElement('div');
        card.className = 'card';
        
        let reqHTML = '<div class="req-list"><strong>Krav:</strong><br>';
        let canApply = true;
        
        if (Object.keys(job.reqSkills).length === 0) reqHTML += "Ingen krav.";
        else {
            for (const [skill, level] of Object.entries(job.reqSkills)) {
                const myLevel = getSkillLevel(skill);
                const color = myLevel >= level ? 'green' : 'red';
                if (myLevel < level) canApply = false;
                reqHTML += `<span style="color:${color}">${skill}: Nivå ${level} (Du har ${myLevel})</span><br>`;
            }
        }
        reqHTML += '</div>';
        
        const isCurrent = gameState.jobId === job.id;
        const btnText = isCurrent ? "Din Jobb" : (canApply ? "Søk Jobb" : "Mangler kompetanse");
        const btnClass = isCurrent ? "card-btn active" : "card-btn";
        const disabled = isCurrent || !canApply ? "disabled" : "";

        // Merk: Vi bruker globale funksjoner definert under 'window'
        card.innerHTML = `
            <h4>${job.title}</h4>
            <span class="price-tag">${job.salary} kr/t</span>
            <p class="desc">${job.description}</p>
            <p class="desc" style="font-size:0.8rem">Pendling: ${job.commuteBase}t/uke</p>
            ${reqHTML}
            <button class="${btnClass}" ${disabled} onclick="applyJob('${job.id}')">${btnText}</button>
        `;
        list.appendChild(card);
    });
}

function renderHousing() {
    const list = document.getElementById('housing-list');
    list.innerHTML = "";
    DATA_HOUSING.forEach(house => {
        const card = document.createElement('div');
        card.className = 'card';
        const isCurrent = gameState.housingId === house.id;
        const isRent = house.type === 'rent';
        
        let imgHTML = getImgHTML(house.img, house.title);
        let priceText = isRent ? `${house.price} kr/mnd` : `${formatMoney(house.price)}`;
        let btnText = isCurrent ? "Bor her" : (isRent ? "Leie" : "Kjøp");
        let btnClass = isCurrent ? "card-btn active" : "card-btn";
        let tags = `<span class="tag ${isRent ? 'rent' : 'buy'}">${isRent ? 'Leie' : 'Eie'}</span>`;
        
        let extra = !isRent ? `<p class="desc" style="font-size:0.8rem; color:#8e44ad;">Egenkapital: ${formatMoney(house.price*house.reqEquity)}</p>` : "";

        card.innerHTML = `
            ${imgHTML}
            <h4>${house.title}</h4>
            <div>${tags}</div>
            <span class="price-tag">${priceText}</span>
            <p class="desc">${house.description}</p>
            ${extra}
            <button class="${btnClass}" ${isCurrent ? "disabled" : ""} onclick="switchHousing('${house.id}')">${btnText}</button>
        `;
        list.appendChild(card);
    });
}

function renderEducation() {
    const list = document.getElementById('edu-list');
    list.innerHTML = "";
    DATA_EDUCATION.forEach(edu => {
        const card = document.createElement('div');
        card.className = 'card';
        const isActive = gameState.activeStudy === edu.id;
        const btnClass = isActive ? "card-btn active" : "card-btn";
        const myXP = gameState.skills[edu.category] || 0;
        const myLevel = Math.floor(myXP / CONFIG.XP_PER_LEVEL);
        
        card.innerHTML = `
            <h4>${edu.title}</h4>
            <span class="price-tag">${edu.costPerWeek} kr/uke</span>
            <p class="desc">${edu.description}</p>
            <div class="req-list">Nivå: ${myLevel} (${myXP} XP)</div>
            <button class="${btnClass}" onclick="selectStudy('${edu.id}')">${isActive ? "Valgt" : "Velg"}</button>
        `;
        list.appendChild(card);
    });
}

function renderStore() {
    const list = document.getElementById('store-list');
    list.innerHTML = "";
    DATA_ITEMS.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        const owned = hasItem(item.id);
        let imgHTML = getImgHTML(item.img, item.name);
        
        let btnHTML = "";
        if (owned) {
            if(item.type !== 'one-time') {
                btnHTML = `<button class="card-btn cancel-btn" onclick="cancelItem('${item.id}')">Avslutt</button>`;
            } else {
                btnHTML = `<button class="card-btn active" disabled>Eier</button>`;
            }
        } else {
            let dis = (gameState.balance < item.price && item.type === 'one-time') ? "disabled" : "";
            btnHTML = `<button class="card-btn" ${dis} onclick="buyItem('${item.id}')">Kjøp</button>`;
        }
        
        card.innerHTML = `
            ${imgHTML}
            <h4>${item.name}</h4>
            <span class="price-tag">${item.price} kr${item.type==='one-time'?'':'/mnd'}</span>
            <p class="desc">${item.description}</p>
            ${btnHTML}
        `;
        list.appendChild(card);
    });
}

function updateUI() {
    const disp = {
        month: document.getElementById('disp-month'),
        week: document.getElementById('disp-week'),
        cash: document.getElementById('disp-cash'),
        job: document.getElementById('disp-job-title'),
        home: document.getElementById('disp-home-title'),
        parentsSection: document.getElementById('parents-section'),
        health: document.getElementById('bar-health'),
        happiness: document.getElementById('bar-happiness'),
        skills: document.getElementById('skills-list'),
        inventory: document.getElementById('inventory-list')
    };

    disp.month.textContent = gameState.month;
    disp.week.textContent = gameState.week;
    disp.cash.textContent = formatMoney(gameState.balance);
    
    const job = DATA_JOBS.find(j => j.id === gameState.jobId);
    disp.job.textContent = job ? job.title : "Ukjent";
    
    const house = DATA_HOUSING.find(h => h.id === gameState.housingId);
    disp.home.textContent = house ? house.title : "Ukjent";
    
    // Foreldre-knapp logikk
    if (gameState.housingId === 'rent_basement') {
        disp.parentsSection.classList.remove('hidden');
        const btn = document.getElementById('btn-pay-parents');
        if (gameState.parentsPaid) {
            btn.textContent = "Husleie betalt (Vippset)";
            btn.disabled = true;
            btn.style.backgroundColor = "#27ae60";
        } else {
            btn.textContent = "Vipps 2000 kr for mat/strøm";
            btn.disabled = false;
            btn.style.backgroundColor = "#e67e22";
        }
    } else {
        disp.parentsSection.classList.add('hidden');
    }

    disp.health.style.width = gameState.health + "%";
    disp.health.style.backgroundColor = gameState.health < 30 ? 'red' : '#2ecc71';
    disp.happiness.style.width = gameState.happiness + "%";

    // Skills
    disp.skills.innerHTML = "";
    Object.entries(gameState.skills).forEach(([cat, xp]) => {
        disp.skills.innerHTML += `<li>${cat}: Nivå ${Math.floor(xp/CONFIG.XP_PER_LEVEL)} (${xp} xp)</li>`;
    });

    // Inventory
    disp.inventory.innerHTML = "";
    gameState.inventory.forEach(id => {
        const item = DATA_ITEMS.find(i => i.id === id);
        if(item) disp.inventory.innerHTML += `<li>${item.name}</li>`;
    });

    // Bank UI
    document.getElementById('bal-checking').textContent = formatMoney(gameState.balance);
    document.getElementById('bal-savings').textContent = formatMoney(gameState.savings);
    document.getElementById('bal-bsu').textContent = formatMoney(gameState.bsu);

    // Lån
    const loanCont = document.getElementById('loan-container');
    loanCont.innerHTML = "";
    let totalDebt = 0;
    if(gameState.loans.length === 0) loanCont.innerHTML = '<div class="empty-bills">Ingen lån.</div>';
    else {
        gameState.loans.forEach(loan => {
            totalDebt += loan.amount;
            const div = document.createElement('div');
            div.className = 'loan-item';
            div.innerHTML = `<span>${loan.name}</span><span>${formatMoney(loan.amount)}</span>`;
            loanCont.appendChild(div);
        });
    }
    document.getElementById('total-debt').textContent = formatMoney(totalDebt);

    // Mailbox
    const mailbox = document.getElementById('mailbox-list');
    mailbox.innerHTML = "";
    const unread = gameState.mailbox.length;
    const badge = document.getElementById('mail-count');
    badge.textContent = unread;
    badge.classList.toggle('hidden', unread === 0);
    
    if(unread === 0) mailbox.innerHTML = '<div class="empty-msg">Tomt.</div>';
    
    gameState.mailbox.forEach(id => {
        const bill = gameState.bills.find(b => b.id === id);
        if(bill) {
            const div = document.createElement('div');
            div.className = 'mail-item unread';
            div.innerHTML = `<span>${bill.recipient}</span><span>${bill.amount} kr</span>`;
            div.onclick = () => openBillModal(bill);
            mailbox.appendChild(div);
        }
    });

    // eFaktura List
    const efList = document.getElementById('efaktura-list');
    efList.innerHTML = "";
    const due = gameState.bills.filter(b => b.isEfaktura && !b.isPaid);
    if(due.length === 0) efList.innerHTML = '<div class="empty-bills">Ingen krav.</div>';
    
    due.forEach(bill => {
        const div = document.createElement('div');
        div.className = 'mail-item';
        div.innerHTML = `<span>${bill.recipient} (${bill.amount} kr)</span><button class="bank-action-btn" style="width:auto; padding:5px;" onclick="payEfaktura(${bill.id})">Betal</button>`;
        efList.appendChild(div);
    });
}

// === GLOBAL SCOPE HELPERS (For HTML onclick) ===
// Disse funksjonene MÅ ligge på window-objektet
window.applyJob = function(id) { 
    gameState.jobId = id; 
    showToast("Ny jobb!"); 
    renderJobs(); 
    updateUI(); 
    updatePlannerCalc(); 
};

window.switchHousing = switchHousing; 

window.selectStudy = function(id) { 
    gameState.activeStudy = id; 
    showToast("Studie valgt"); 
    renderEducation(); 
};

window.buyItem = function(id) { 
    const item = DATA_ITEMS.find(i => i.id === id);
    if(gameState.balance >= item.price || item.type !== 'one-time') {
        if(item.type === 'one-time') gameState.balance -= item.price;
        gameState.inventory.push(id);
        showToast("Kjøpt!", "success");
        renderStore(); updateUI(); updatePlannerCalc();
    }
};

window.cancelItem = function(id) {
    gameState.inventory = gameState.inventory.filter(i => i !== id);
    showToast("Avsluttet.", "info");
    renderStore(); updateUI();
};

window.payEfaktura = function(id) {
    const bill = gameState.bills.find(b => b.id === id);
    if(gameState.balance >= bill.amount) {
        gameState.balance -= bill.amount;
        bill.isPaid = true;
        showToast("Betalt", "success");
        updateUI();
    } else showToast("Mangler dekning", "error");
};

window.openBillModal = function(bill) {
    document.getElementById('bill-sender').textContent = bill.recipient;
    document.getElementById('bill-amount-display').textContent = bill.amount.toFixed(2);
    document.getElementById('bill-account-display').textContent = bill.account;
    document.getElementById('bill-kid-display').textContent = bill.kid;
    document.getElementById('modal-paper-bill').classList.remove('hidden');
};

window.switchView = function(key) {
    const views = {
        life: document.getElementById('view-life'),
        jobs: document.getElementById('view-jobs'),
        housing: document.getElementById('view-housing'),
        edu: document.getElementById('view-edu'),
        store: document.getElementById('view-store'),
        bank: document.getElementById('view-bank')
    };
    const navBtns = {
        life: document.getElementById('nav-life'),
        jobs: document.getElementById('nav-jobs'),
        housing: document.getElementById('nav-housing'),
        edu: document.getElementById('nav-edu'),
        store: document.getElementById('nav-store'),
        bank: document.getElementById('nav-bank')
    };

    Object.values(views).forEach(el => { el.classList.remove('active-view'); el.classList.add('hidden-view'); el.style.display = 'none'; });
    Object.values(navBtns).forEach(el => el.classList.remove('active'));
    
    views[key].classList.add('active-view');
    views[key].classList.remove('hidden-view');
    views[key].style.display = 'flex';
    navBtns[key].classList.add('active');
};

// === HJELPEFUNKSJONER ===
function generateBankID() {
    gameState.currentBankID = Math.floor(100000 + Math.random() * 900000);
    document.getElementById('display-bankid-code').textContent = gameState.currentBankID;
    document.getElementById('modal-bankid').classList.remove('hidden');
}

function hasItem(id) { return gameState.inventory.includes(id); }
function getSkillLevel(cat) { return Math.floor((gameState.skills[cat] || 0) / CONFIG.XP_PER_LEVEL); }
function formatMoney(amount) { return Math.floor(amount).toLocaleString('no-NO') + " kr"; }
function clamp(val, min, max) { return Math.min(Math.max(val, min), max); }

function showToast(msg, type="info") {
    const t = document.createElement('div'); t.className = `toast ${type}`; t.textContent = msg;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
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
    document.getElementById('gameover-reason').textContent = "Personlig Konkurs";
    document.getElementById('modal-gameover').classList.remove('hidden');
    
    const btn = document.getElementById('btn-restart');
    btn.textContent = "Flytt hjem";
    btn.onclick = () => {
        document.getElementById('modal-gameover').classList.add('hidden');
        updateUI(); renderHousing();
        btn.onclick = resetGame;
        btn.textContent = "Start på nytt";
    };
}

function showGameOver(reason) {
    document.getElementById('gameover-reason').textContent = reason;
    document.getElementById('modal-gameover').classList.remove('hidden');
}

function saveGame() { localStorage.setItem('livetBankenV21', JSON.stringify(gameState)); }
function loadGame() {
    const data = localStorage.getItem('livetBankenV21');
    if (data) gameState = { ...gameState, ...JSON.parse(data) };
}
function resetGame() { localStorage.removeItem('livetBankenV21'); location.reload(); }

// Start spillet
init();

/* Version: #21 */
