/* Version: #10 */

// === KONFIGURASJON ===
const CONFIG = {
    HOURS_IN_WEEK: 168,
    XP_PER_LEVEL: 100, // 100 timer studier = 1 nivå
    
    // Faste mottakere
    RECIPIENTS: {
        RENT: { name: "Utleier AS", account: "1234.56.78901" },
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

// === STATE MANAGEMENT ===
let gameState = {
    // Tid
    month: 1,
    week: 1,
    
    // Økonomi
    balance: 5000,
    savings: 0,
    bsu: 0,
    
    // Spiller
    health: 90,
    happiness: 90,
    
    // Karriere & Ferdigheter
    jobId: "job_newspaper", // Starter som avisbud
    skills: {}, // Eks: { "it_basic": 150, "service": 50 } (XP poeng)
    
    // Eiendeler
    inventory: [], // Liste av ID-er (items og subscriptions)
    
    // Data
    bills: [],
    mailbox: [], 
    efakturaAgreements: [],
    
    // Sikkerhet
    currentBankID: null
};

// === DOM CACHE ===
// Views
const views = {
    life: document.getElementById('view-life'),
    jobs: document.getElementById('view-jobs'),
    edu: document.getElementById('view-edu'),
    store: document.getElementById('view-store'),
    bank: document.getElementById('view-bank')
};
const navBtns = {
    life: document.getElementById('nav-life'),
    jobs: document.getElementById('nav-jobs'),
    edu: document.getElementById('nav-edu'),
    store: document.getElementById('nav-store'),
    bank: document.getElementById('nav-bank')
};

// Life Stats
const disp = {
    month: document.getElementById('disp-month'),
    week: document.getElementById('disp-week'),
    job: document.getElementById('disp-job-title'),
    cash: document.getElementById('disp-cash'),
    health: document.getElementById('bar-health'),
    happiness: document.getElementById('bar-happiness'),
    skills: document.getElementById('skills-list'),
    inventory: document.getElementById('inventory-list'),
    commute: document.getElementById('calc-commute')
};

// Planner
const inputs = {
    sleep: document.getElementById('input-sleep'),
    work: document.getElementById('input-work'),
    chores: document.getElementById('input-chores'),
    study: document.getElementById('input-study'),
    exercise: document.getElementById('input-exercise'),
    shopping: document.getElementById('input-shopping'),
    food: document.getElementById('select-food-budget')
};
const planner = {
    freeTime: document.getElementById('calc-free-time'),
    jobHint: document.getElementById('job-limit-hint'),
    btnRun: document.getElementById('btn-run-week')
};

// Bank
const bank = {
    loginScreen: document.getElementById('bank-login-screen'),
    dashboard: document.getElementById('bank-dashboard-screen'),
    loginForm: document.getElementById('login-form'),
    inputId: document.getElementById('input-bankid-login'),
    error: document.getElementById('login-error'),
    balChecking: document.getElementById('bal-checking'),
    balSavings: document.getElementById('bal-savings'),
    balBsu: document.getElementById('bal-bsu'),
    efakturaList: document.getElementById('efaktura-list'),
    
    // Payment
    payFrom: document.getElementById('pay-from'),
    payTo: document.getElementById('pay-to-acc'),
    payKid: document.getElementById('pay-kid'),
    payAmt: document.getElementById('pay-amount'),
    btnPay: document.getElementById('btn-pay-manual'),

    // Transfer
    transFrom: document.getElementById('trans-from'),
    transTo: document.getElementById('trans-to'),
    transAmt: document.getElementById('trans-amount'),
    btnTrans: document.getElementById('btn-transfer')
};

// Modals
const modals = {
    bankId: document.getElementById('modal-bankid'),
    paperBill: document.getElementById('modal-paper-bill'),
    efaktura: document.getElementById('modal-efaktura-offer'),
    event: document.getElementById('modal-event'),
    gameOver: document.getElementById('modal-gameover')
};

// Containers for dynamic content
const lists = {
    jobs: document.getElementById('job-list'),
    edu: document.getElementById('edu-list'),
    store: document.getElementById('store-list'),
    mailbox: document.getElementById('mailbox-list'),
    mailBadge: document.getElementById('mail-count')
};


// === INITIALISERING ===
function init() {
    console.log("System: Starter Livet & Banken 3.0...");
    
    loadGame();
    
    // Generer innhold fra datafiler
    renderJobs();
    renderEducation();
    renderStore();
    
    // Opprett første husleie hvis nytt spill
    if (gameState.month === 1 && gameState.week === 1 && gameState.bills.length === 0) {
        createBill(CONFIG.RECIPIENTS.RENT, 6500, 1, 1);
    }

    setupListeners();
    updateUI();
    updatePlannerCalc(); // Kjør en gang
}

function setupListeners() {
    // Navigasjon
    Object.keys(navBtns).forEach(key => {
        navBtns[key].addEventListener('click', () => switchView(key));
    });

    // Planner inputs
    Object.values(inputs).forEach(inp => {
        inp.addEventListener('input', updatePlannerCalc);
    });
    planner.btnRun.addEventListener('click', runWeek);

    // BankID
    document.getElementById('btn-get-bankid').addEventListener('click', generateBankID);
    document.getElementById('btn-close-bankid').addEventListener('click', () => modals.bankId.classList.add('hidden'));

    // Bank Actions
    bank.loginForm.addEventListener('submit', handleBankLogin);
    document.getElementById('btn-logout').addEventListener('click', handleBankLogout);
    bank.btnPay.addEventListener('click', handleManualPayment);
    bank.btnTrans.addEventListener('click', handleTransfer);

    // Modals
    document.getElementById('btn-close-bill').addEventListener('click', () => modals.paperBill.classList.add('hidden'));
    document.getElementById('btn-accept-efaktura').addEventListener('click', () => handleEfakturaResponse(true));
    document.getElementById('btn-decline-efaktura').addEventListener('click', () => handleEfakturaResponse(false));
    document.getElementById('btn-close-event').addEventListener('click', () => modals.event.classList.add('hidden'));
    document.getElementById('btn-restart').addEventListener('click', resetGame);
}

// === KJERNE-LOGIKK (UKES-HJUL) ===

function calculateCommuteTime() {
    const job = DATA_JOBS.find(j => j.id === gameState.jobId);
    if (!job) return 0;
    if (parseInt(inputs.work.value) === 0) return 0; // Ingen pendling hvis man ikke jobber

    let commute = job.commuteBase;

    // Sjekk inventory for effekter (Sykkel, El-sykkel)
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
    
    // Oppdater hint for jobb-timer
    planner.jobHint.textContent = `Min: ${job.minHours}t, Maks: ${job.maxHours}t`;

    // Hent verdier
    const sleep = parseInt(inputs.sleep.value) || 0;
    const work = parseInt(inputs.work.value) || 0;
    const chores = parseInt(inputs.chores.value) || 0;
    const study = parseInt(inputs.study.value) || 0;
    const exercise = parseInt(inputs.exercise.value) || 0;
    const shopping = parseInt(inputs.shopping.value) || 0;

    const commute = calculateCommuteTime();
    disp.commute.textContent = commute;

    const totalUsed = (sleep * 7) + work + chores + study + exercise + shopping + commute;
    const freeTime = CONFIG.HOURS_IN_WEEK - totalUsed;

    planner.freeTime.textContent = freeTime;

    // Validering
    let isValid = true;
    let errorMsg = "Start Uken 🚀";

    if (freeTime < 0) {
        isValid = false;
        errorMsg = "Ikke nok timer!";
    } else if (work > 0 && work < job.minHours) {
        isValid = false;
        errorMsg = `Må jobbe minst ${job.minHours}t`;
    } else if (work > job.maxHours) {
        isValid = false;
        errorMsg = `Maks jobbtid er ${job.maxHours}t`;
    }

    planner.btnRun.disabled = !isValid;
    planner.btnRun.textContent = errorMsg;
    planner.freeTime.style.color = freeTime < 0 ? 'red' : 'inherit';
}

function runWeek() {
    // 1. Hent input
    const sleep = parseInt(inputs.sleep.value) || 0;
    const work = parseInt(inputs.work.value) || 0;
    const study = parseInt(inputs.study.value) || 0;
    const exercise = parseInt(inputs.exercise.value) || 0;
    const shopping = parseInt(inputs.shopping.value) || 0;
    const foodType = inputs.food.value;
    const freeTime = parseInt(planner.freeTime.textContent);

    console.log(`Kjører M${gameState.month} U${gameState.week}`);

    // 2. Økonomi
    const job = DATA_JOBS.find(j => j.id === gameState.jobId);
    
    // Utgifter: Mat
    let expenses = CONFIG.FOOD_COST[foodType];
    
    // Utgifter: Abonnementer
    gameState.inventory.forEach(itemId => {
        const item = DATA_ITEMS.find(i => i.id === itemId);
        if (item && item.type === "subscription") {
            // Pris i datafil er per mnd, vi deler på 4 for ukespris (forenklet)
            expenses += (item.price / 4);
        }
    });

    // Utgifter: Studier
    const activeEduId = getActiveStudyId(); 
    if (activeEduId && study > 0) {
        const edu = DATA_EDUCATION.find(e => e.id === activeEduId);
        if (edu) expenses += edu.costPerWeek;
    }

    gameState.balance -= expenses;

    // Inntekt
    let income = 0;
    if (work > 0) {
        income = work * job.salary;
        gameState.balance += income;
    }

    // 3. Ferdigheter (Studier)
    if (study > 0 && activeEduId) {
        const edu = DATA_EDUCATION.find(e => e.id === activeEduId);
        
        // Sjekk AI Co-Pilot bonus
        let multiplier = 1;
        if (hasItem("sub_ai")) multiplier = 2;

        const xpGain = study * edu.difficulty * multiplier;
        
        // Legg til XP
        if (!gameState.skills[edu.category]) gameState.skills[edu.category] = 0;
        gameState.skills[edu.category] += xpGain;
    }

    // 4. Helse & Lykke
    let dHealth = 0;
    let dHappiness = 0;

    // Søvn
    if ((sleep * 7) < 49) { dHealth -= 2; dHappiness -= 3; }
    else { dHealth += 1; }

    // Mat
    if (foodType === 'low') dHealth -= 2;
    if (foodType === 'high') { dHealth += 1; dHappiness += 2; }

    // Trening
    if (exercise > 3) { dHealth += 3; dHappiness += 1; }
    else if (exercise === 0) { dHealth -= 1; }
    
    // Gym bonus
    if (hasItem("sub_gym") && exercise > 0) dHealth += 2;

    // Shopping/Sosialt
    if (shopping > 2) dHappiness += 3;
    
    // Netflix bonus
    if (hasItem("sub_netflix") && freeTime > 5) dHappiness += 2;

    // Jobb-effekt
    dHappiness += job.happinessImpact;

    // 5. Hendelser (Uflaks/Flaks)
    handleRandomEvent();

    // 6. Oppdater stats
    gameState.health = clamp(gameState.health + dHealth, 0, 100);
    gameState.happiness = clamp(gameState.happiness + dHappiness, 0, 100);

    // 7. Progresjon
    gameState.week++;
    if (gameState.week > 4) {
        gameState.week = 1;
        gameState.month++;
        showToast("Ny måned!", "info");
        // Rent Bill
        createBill(CONFIG.RECIPIENTS.RENT, 6500, gameState.month, 1);
    }

    // Sjekk eFakturaer som må betales "automatisk" hvis vi hadde hatt det, 
    // men i dette spillet må brukeren godkjenne i nettbanken selv for eFaktura.
    // Vi genererer regninger basert på uke:
    generateRecurringBills();

    checkGameOver();
    saveGame();
    updateUI();
}

function handleRandomEvent() {
    if (Math.random() > 0.15) return; // 15% sjanse hver uke

    const event = DATA_EVENTS[Math.floor(Math.random() * DATA_EVENTS.length)];
    
    // Sjekk forsikring
    let cost = event.cost;
    let insuranceMsg = "";

    if (cost > 0 && event.type !== "none") {
        // Finn forsikring som dekker denne typen
        const insuranceItem = DATA_ITEMS.find(i => 
            i.type === "insurance" && 
            i.covers && 
            i.covers.includes(event.id) &&
            hasItem(i.id)
        );

        if (insuranceItem) {
            cost = 500; // Egenandel
            insuranceMsg = `Dekket av ${insuranceItem.name}! (Egenandel: 500kr)`;
        } else {
            insuranceMsg = "Du mangler forsikring!";
        }
    }

    // Vis Modal
    document.getElementById('event-text').textContent = event.text;
    document.getElementById('event-cost').textContent = cost !== 0 ? `Kostnad: ${cost} kr` : "Ingen kostnad";
    document.getElementById('event-insurance').textContent = insuranceMsg;
    modals.event.classList.remove('hidden');

    // Utfør økonomisk konsekvens
    if (cost > 0) {
        // Lag en regning for dette, så man må i banken
        createBill({ name: "Uforutsett", account: "9999.11.22222" }, cost, gameState.month, gameState.week);
    } else if (cost < 0) {
        // Gevinst (Lotto/Gave)
        gameState.balance -= cost; // Minus minus blir pluss
        showToast("Du fikk penger!", "success");
    }

    // Lykke-effekt
    gameState.happiness = clamp(gameState.happiness + event.happinessImpact, 0, 100);
}

// === HJELPEFUNKSJONER ===

function getSkillLevel(category) {
    const xp = gameState.skills[category] || 0;
    return Math.floor(xp / CONFIG.XP_PER_LEVEL);
}

function hasItem(itemId) {
    return gameState.inventory.includes(itemId);
}

// Hvilket studie er valgt i input-feltet? Vi må gjette basert på UI, 
// men for enkelhets skyld antar vi at brukeren velger kurs i "Utdanning"-fanen,
// og at input-feltet i planleggeren bare er timer.
// Løsning: Vi trenger en "Active Study" state. 
// For nå: Vi antar at timer i planleggeren fordeles på studiet med ID lagret i state, eller default.
// La oss legge til activeStudy i gameState.
function getActiveStudyId() {
    return gameState.activeStudy || null;
}

function setActiveStudy(id) {
    gameState.activeStudy = id;
    showToast("Studie valgt for denne uken.", "info");
    updateUI(); // For å vise markering
}

// === GENERERING AV UI (LISTER) ===

function renderJobs() {
    lists.jobs.innerHTML = "";
    DATA_JOBS.forEach(job => {
        const card = document.createElement('div');
        card.className = 'card';
        
        // Sjekk krav
        let reqHTML = '<div class="req-list"><strong>Krav:</strong><br>';
        let canApply = true;
        
        if (Object.keys(job.reqSkills).length === 0) {
            reqHTML += "Ingen krav.";
        } else {
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

        card.innerHTML = `
            <h4>${job.title}</h4>
            <span class="price-tag">${job.salary} kr/t</span>
            <p class="desc">${job.description}</p>
            <p class="desc" style="font-size:0.8rem">Pendling: ${job.commuteBase}t/uke</p>
            ${reqHTML}
            <button class="${btnClass}" ${disabled} onclick="applyJob('${job.id}')">${btnText}</button>
        `;
        lists.jobs.appendChild(card);
    });
}

window.applyJob = function(id) { // Global scope for onclick
    gameState.jobId = id;
    showToast("Gratulerer med ny jobb!", "success");
    renderJobs(); // Oppdater knapper
    updateUI();
    updatePlannerCalc(); // Oppdater pendletid
};

function renderEducation() {
    lists.edu.innerHTML = "";
    DATA_EDUCATION.forEach(edu => {
        const card = document.createElement('div');
        card.className = 'card';
        
        const isActive = gameState.activeStudy === edu.id;
        const btnText = isActive ? "Valgt" : "Velg Studie";
        const btnClass = isActive ? "card-btn active" : "card-btn";

        const myXP = gameState.skills[edu.category] || 0;
        const myLevel = Math.floor(myXP / 100);

        card.innerHTML = `
            <h4>${edu.title}</h4>
            <span class="price-tag">${edu.costPerWeek} kr/uke</span>
            <p class="desc">${edu.description}</p>
            <div class="req-list">
                Ferdighet: ${edu.category}<br>
                Ditt Nivå: ${myLevel} (${myXP} XP)
            </div>
            <button class="${btnClass}" onclick="selectStudy('${edu.id}')">${btnText}</button>
        `;
        lists.edu.appendChild(card);
    });
}

window.selectStudy = function(id) {
    setActiveStudy(id);
    renderEducation();
};

function renderStore() {
    lists.store.innerHTML = "";
    DATA_ITEMS.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        
        const owned = hasItem(item.id);
        let btnText = "Kjøp";
        let btnClass = "card-btn";
        let disabled = "";
        
        if (owned) {
            btnText = item.type === "subscription" ? "Abonnerer" : "Eier";
            btnClass += " active";
            disabled = "disabled";
        } else if (gameState.balance < item.price && item.type !== "subscription") {
            // Sjekk saldo for engangskjøp
            disabled = "disabled";
            btnText = "For dyrt";
        }

        let priceDisplay = item.type === "subscription" ? `${item.price} kr/mnd` : `${item.price} kr`;
        if (item.type === "insurance") priceDisplay = `${item.price} kr/mnd (Forsikring)`;

        card.innerHTML = `
            <h4>${item.name}</h4>
            <span class="price-tag">${priceDisplay}</span>
            <p class="desc">${item.description}</p>
            <button class="${btnClass}" ${disabled} onclick="buyItem('${item.id}')">${btnText}</button>
        `;
        lists.store.appendChild(card);
    });
}

window.buyItem = function(id) {
    const item = DATA_ITEMS.find(i => i.id === id);
    if (!item) return;

    if (item.type === "one-time") {
        if (gameState.balance >= item.price) {
            gameState.balance -= item.price;
            gameState.inventory.push(id);
            showToast(`Kjøpte ${item.name}!`, "success");
        }
    } else {
        // Abonnement / Forsikring
        gameState.inventory.push(id);
        showToast(`Abonnerer nå på ${item.name}.`, "success");
    }
    
    renderStore();
    updateUI();
    updatePlannerCalc(); // I tilfelle el-sykkel
};

// === BANK & BILLS ===

function generateRecurringBills() {
    const m = gameState.month;
    const w = gameState.week;

    // Strøm uke 3
    if (w === 3) createBill(CONFIG.RECIPIENTS.POWER, Math.floor(Math.random()*800)+400, m, 3);
    // Mobil uke 4
    if (w === 4) createBill(CONFIG.RECIPIENTS.PHONE, 449, m, 4);
}

function createBill(recipient, amount, m, w) {
    // Sjekk eFaktura
    const isEfaktura = gameState.efakturaAgreements.includes(recipient.name);
    
    const bill = {
        id: Date.now() + Math.random(),
        recipient: recipient.name,
        account: recipient.account,
        kid: Math.floor(Math.random() * 100000000).toString(),
        amount: amount,
        dueMonth: m,
        dueWeek: w,
        isPaid: false,
        isEfaktura: isEfaktura
    };
    gameState.bills.push(bill);

    if (!isEfaktura) {
        gameState.mailbox.push(bill.id);
        showToast(`Regning fra ${recipient.name}`, "info");
    } else {
        showToast(`eFaktura fra ${recipient.name}`, "info");
    }
}

function handleTransfer() {
    const from = bank.transFrom.value;
    const to = bank.transTo.value;
    const amt = parseFloat(bank.transAmt.value);

    if (isNaN(amt) || amt <= 0) return showToast("Ugyldig beløp", "error");
    if (from === to) return showToast("Kan ikke overføre til samme konto", "error");

    // Mapping strings to gameState keys
    const map = { "checking": "balance", "savings": "savings", "bsu": "bsu" };
    const keyFrom = map[from];
    const keyTo = map[to];

    if (gameState[keyFrom] < amt) return showToast("Ikke nok dekning", "error");

    gameState[keyFrom] -= amt;
    gameState[keyTo] += amt;
    
    showToast("Overføring vellykket", "success");
    bank.transAmt.value = "";
    updateUI();
}

function handleManualPayment() {
    // Vask input
    const acc = bank.payTo.value.replace(/[^0-9]/g, '');
    const kid = bank.payKid.value.replace(/[^0-9]/g, '');
    const amt = parseFloat(bank.payAmt.value);

    const bill = gameState.bills.find(b => 
        !b.isPaid && 
        b.account.replace(/[^0-9]/g, '') === acc && 
        b.kid === kid
    );

    if (!bill) return showToast("Finner ingen regning med denne info", "error");
    if (Math.abs(bill.amount - amt) > 1) return showToast("Feil beløp", "error");

    const fromKey = bank.payFrom.value === "savings" ? "savings" : "balance";
    if (gameState[fromKey] < amt) return showToast("Ikke nok penger", "error");

    gameState[fromKey] -= amt;
    bill.isPaid = true;
    gameState.mailbox = gameState.mailbox.filter(id => id !== bill.id); // Fjern fra postkasse

    showToast("Betalt!", "success");
    
    // Tilby eFaktura
    if (!bill.isEfaktura && !gameState.efakturaAgreements.includes(bill.recipient)) {
        document.getElementById('offer-recipient').textContent = bill.recipient;
        gameState.pendingEfaktura = bill.recipient;
        modals.efaktura.classList.remove('hidden');
    }

    bank.payTo.value = ""; bank.payKid.value = ""; bank.payAmt.value = "";
    updateUI();
}

function handleEfakturaResponse(accept) {
    modals.efaktura.classList.add('hidden');
    if (accept && gameState.pendingEfaktura) {
        gameState.efakturaAgreements.push(gameState.pendingEfaktura);
        showToast("AvtaleGiro opprettet", "success");
    }
    gameState.pendingEfaktura = null;
}

window.payEfaktura = function(id) {
    const bill = gameState.bills.find(b => b.id === id);
    if (!bill) return;
    if (gameState.balance < bill.amount) return showToast("Mangler dekning", "error");
    
    gameState.balance -= bill.amount;
    bill.isPaid = true;
    showToast("eFaktura betalt", "success");
    updateUI();
};

// === UI UPDATES ===

function updateUI() {
    // Top Bar
    disp.month.textContent = gameState.month;
    disp.week.textContent = gameState.week;
    disp.cash.textContent = Math.floor(gameState.balance) + " kr";
    
    const job = DATA_JOBS.find(j => j.id === gameState.jobId);
    disp.job.textContent = job ? job.title : "Ukjent";

    // Bars
    disp.health.style.width = gameState.health + "%";
    disp.health.style.backgroundColor = gameState.health < 30 ? 'red' : '#2ecc71';
    disp.happiness.style.width = gameState.happiness + "%";
    
    // Skills List
    disp.skills.innerHTML = "";
    Object.entries(gameState.skills).forEach(([cat, xp]) => {
        const lvl = Math.floor(xp / 100);
        const li = document.createElement('li');
        li.textContent = `${cat}: Nivå ${lvl} (${xp} XP)`;
        disp.skills.appendChild(li);
    });

    // Inventory List
    disp.inventory.innerHTML = "";
    gameState.inventory.forEach(id => {
        const item = DATA_ITEMS.find(i => i.id === id);
        if (item) {
            const li = document.createElement('li');
            li.textContent = item.name;
            disp.inventory.appendChild(li);
        }
    });

    // Bank
    bank.balChecking.textContent = Math.floor(gameState.balance).toLocaleString() + " kr";
    bank.balSavings.textContent = Math.floor(gameState.savings).toLocaleString() + " kr";
    bank.balBsu.textContent = Math.floor(gameState.bsu).toLocaleString() + " kr";

    // Mailbox
    lists.mailbox.innerHTML = "";
    const unread = gameState.mailbox.length;
    lists.mailBadge.textContent = unread;
    lists.mailBadge.classList.toggle('hidden', unread === 0);
    
    if (unread === 0) lists.mailbox.innerHTML = '<div class="empty-msg">Tomt.</div>';
    
    gameState.mailbox.forEach(id => {
        const bill = gameState.bills.find(b => b.id === id);
        if (bill) {
            const div = document.createElement('div');
            div.className = 'mail-item unread';
            div.innerHTML = `<span>${bill.recipient}</span><span>${bill.amount} kr</span>`;
            div.onclick = () => openBillModal(bill);
            lists.mailbox.appendChild(div);
        }
    });

    // eFaktura List
    bank.efakturaList.innerHTML = "";
    const dueEfaktura = gameState.bills.filter(b => b.isEfaktura && !b.isPaid);
    if (dueEfaktura.length === 0) bank.efakturaList.innerHTML = '<div class="empty-bills">Ingen krav.</div>';
    
    dueEfaktura.forEach(bill => {
        const div = document.createElement('div');
        div.className = 'mail-item'; // Gjenbruk style
        div.innerHTML = `
            <span>${bill.recipient} (${bill.amount} kr)</span>
            <button class="bank-action-btn" style="width:auto; padding:5px;" onclick="payEfaktura(${bill.id})">Betal</button>
        `;
        bank.efakturaList.appendChild(div);
    });
}

function openBillModal(bill) {
    document.getElementById('bill-sender').textContent = bill.recipient;
    document.getElementById('bill-amount-display').textContent = bill.amount.toFixed(2);
    document.getElementById('bill-account-display').textContent = bill.account;
    document.getElementById('bill-kid-display').textContent = bill.kid;
    modals.paperBill.classList.remove('hidden');
}

// === SYSTEM ===

function switchView(viewName) {
    Object.values(views).forEach(el => {
        el.classList.remove('active-view');
        el.classList.add('hidden-view');
        el.style.display = 'none';
    });
    Object.values(navBtns).forEach(el => el.classList.remove('active'));

    views[viewName].classList.add('active-view');
    views[viewName].classList.remove('hidden-view');
    views[viewName].style.display = 'flex'; // or block based on css
    navBtns[viewName].classList.add('active');
}

function generateBankID() {
    gameState.currentBankID = Math.floor(100000 + Math.random() * 900000);
    document.getElementById('display-bankid-code').textContent = gameState.currentBankID;
    modals.bankId.classList.remove('hidden');
}

function handleBankLogin(e) {
    e.preventDefault();
    if (parseInt(bank.inputId.value) === gameState.currentBankID) {
        bank.loginScreen.classList.add('hidden');
        bank.dashboard.classList.remove('hidden');
        bank.error.classList.add('hidden');
        bank.inputId.value = "";
        updateUI();
    } else {
        bank.error.classList.remove('hidden');
    }
}

function handleBankLogout() {
    bank.dashboard.classList.add('hidden');
    bank.loginScreen.classList.remove('hidden');
    gameState.currentBankID = null;
}

function checkGameOver() {
    if (gameState.balance < -20000) showGameOver("Konkurs!");
    if (gameState.health <= 0) showGameOver("Helsekollaps!");
    if (gameState.happiness <= 0) showGameOver("Depresjon.");
}

function showGameOver(reason) {
    document.getElementById('gameover-reason').textContent = reason;
    modals.gameOver.classList.remove('hidden');
}

function saveGame() {
    localStorage.setItem('livetBankenV10', JSON.stringify(gameState));
}

function loadGame() {
    const data = localStorage.getItem('livetBankenV10');
    if (data) gameState = { ...gameState, ...JSON.parse(data) };
}

function resetGame() {
    localStorage.removeItem('livetBankenV10');
    location.reload();
}

function showToast(msg, type="info") {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
}

function clamp(val, min, max) { return Math.min(Math.max(val, min), max); }

// Start
init();
/* Version: #10 */
