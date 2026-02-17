/* Version: #16 */

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

// === STATE MANAGEMENT ===
let gameState = {
    // Tid
    month: 1,
    week: 1,
    
    // Økonomi
    balance: 25000, 
    savings: 10000,
    bsu: 0,
    loans: [], // Array av { id, name, amount, originalAmount, rate }
    
    // Spiller
    health: 90,
    happiness: 90,
    
    // Livsstil
    jobId: "job_newspaper",
    housingId: "rent_basement",
    skills: {}, // { "it_basic": 150 }
    inventory: [], // ["item_bike", "sub_netflix"]
    
    // Data
    bills: [],
    mailbox: [],
    efakturaAgreements: [],
    
    // System
    currentBankID: null,
    activeStudy: null,
    pendingEfaktura: null
};

// === DOM CACHE ===
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

// Stats & Display
const disp = {
    month: document.getElementById('disp-month'),
    week: document.getElementById('disp-week'),
    job: document.getElementById('disp-job-title'),
    home: document.getElementById('disp-home-title'),
    cash: document.getElementById('disp-cash'),
    health: document.getElementById('bar-health'),
    happiness: document.getElementById('bar-happiness'),
    skills: document.getElementById('skills-list'),
    inventory: document.getElementById('inventory-list'),
    commute: document.getElementById('calc-commute')
};

// Planner Inputs
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
    btnRun: document.getElementById('btn-run-week')
};

// Bank Elements
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
    loanContainer: document.getElementById('loan-container'),
    totalDebt: document.getElementById('total-debt'),
    
    // Forms
    payFrom: document.getElementById('pay-from'),
    payTo: document.getElementById('pay-to-acc'),
    payKid: document.getElementById('pay-kid'),
    payAmt: document.getElementById('pay-amount'),
    btnPay: document.getElementById('btn-pay-manual'),

    transFrom: document.getElementById('trans-from'),
    transTo: document.getElementById('trans-to'),
    transAmt: document.getElementById('trans-amount'),
    btnTrans: document.getElementById('btn-transfer')
};

// Lists Containers
const lists = {
    jobs: document.getElementById('job-list'),
    housing: document.getElementById('housing-list'),
    edu: document.getElementById('edu-list'),
    store: document.getElementById('store-list'),
    mailbox: document.getElementById('mailbox-list'),
    mailBadge: document.getElementById('mail-count')
};

// Modals
const modals = {
    bankId: document.getElementById('modal-bankid'),
    paperBill: document.getElementById('modal-paper-bill'),
    efaktura: document.getElementById('modal-efaktura-offer'),
    event: document.getElementById('modal-event'),
    gameOver: document.getElementById('modal-gameover')
};

// === INITIALISERING ===
function init() {
    console.log("System: Starter Livet & Banken 4.0...");
    
    loadGame();
    
    // Sikre at vi har gyldige data (fallback for eldre saves)
    if (!gameState.housingId) gameState.housingId = "rent_basement";
    if (!gameState.loans) gameState.loans = [];
    if (!gameState.inventory) gameState.inventory = [];
    if (!gameState.skills) gameState.skills = {};

    // Generer innhold fra datafiler
    renderJobs();
    renderHousing();
    renderEducation();
    renderStore();
    
    // Opprett første husleie hvis nytt spill
    if (gameState.month === 1 && gameState.week === 1 && gameState.bills.length === 0) {
        // Finn prisen på nåværende bolig
        const house = DATA_HOUSING.find(h => h.id === gameState.housingId);
        if (house && house.type === 'rent') {
            createBill(CONFIG.RECIPIENTS.RENT, house.price, 1, 1);
        }
    }

    setupListeners();
    updateUI();
    updatePlannerCalc(); // Kjør kalkulatoren en gang
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
    
    // Restart logic needs to handle context
    document.getElementById('btn-restart').addEventListener('click', resetGame);
}

// === SPILL-LOGIKK (UKES-HJUL) ===

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
    planner.freeTime.style.color = freeTime < 0 ? '#e74c3c' : 'inherit';
}

function runWeek() {
    // 1. Hent input
    const sleep = parseInt(inputs.sleep.value) || 0;
    const work = parseInt(inputs.work.value) || 0;
    const study = parseInt(inputs.study.value) || 0;
    const exercise = parseInt(inputs.exercise.value) || 0;
    const shopping = parseInt(inputs.shopping.value) || 0;
    const chores = parseInt(inputs.chores.value) || 0;
    const foodType = inputs.food.value;
    const freeTime = parseInt(planner.freeTime.textContent);

    console.log(`Kjører M${gameState.month} U${gameState.week}`);

    // 2. Økonomi
    const job = DATA_JOBS.find(j => j.id === gameState.jobId);
    
    // Utgifter: Mat
    let expenses = CONFIG.FOOD_COST[foodType];
    
    // Utgifter: Abonnementer & Forsikring (månedspris / 4)
    gameState.inventory.forEach(itemId => {
        const item = DATA_ITEMS.find(i => i.id === itemId);
        if (item && (item.type === "subscription" || item.type === "insurance")) {
            expenses += (item.price / 4);
        }
    });

    // Utgifter: Studier
    if (gameState.activeStudy && study > 0) {
        const edu = DATA_EDUCATION.find(e => e.id === gameState.activeStudy);
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
    if (study > 0 && gameState.activeStudy) {
        const edu = DATA_EDUCATION.find(e => e.id === gameState.activeStudy);
        
        let multiplier = 1;
        if (hasItem("sub_ai")) multiplier = 2;

        const xpGain = study * edu.difficulty * multiplier;
        
        if (!gameState.skills[edu.category]) gameState.skills[edu.category] = 0;
        gameState.skills[edu.category] += xpGain;
    }

    // 4. Helse & Lykke
    let dHealth = 0;
    let dHappiness = 0;

    // Bolig (Komfort)
    const house = DATA_HOUSING.find(h => h.id === gameState.housingId);
    if (house) dHappiness += house.comfort;

    // Søvn
    if ((sleep * 7) < 49) { dHealth -= 2; dHappiness -= 3; }
    else { dHealth += 1; }

    // Mat
    if (foodType === 'low') dHealth -= 2;
    if (foodType === 'high') { dHealth += 1; dHappiness += 2; }

    // Trening
    if (exercise > 3) { dHealth += 3; dHappiness += 1; }
    else if (exercise === 0) { dHealth -= 1; }
    if (hasItem("sub_gym") && exercise > 0) dHealth += 2;

    // Shopping/Sosialt
    if (shopping > 2) dHappiness += 3;
    if (hasItem("sub_netflix") && freeTime > 5) dHappiness += 2;

    // Husarbeid (Risiko)
    if (chores < 3 && Math.random() < 0.1) {
        createBill({name: "Rørlegger", account: "1111.22.33333"}, 2500, gameState.month, gameState.week);
        showToast("Vannlekkasje! Du burde vasket oftere...", "error");
    }

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
        
        // Månedlige regninger (Husleie, Lån, etc)
        generateMonthlyBills();
    }

    checkGameOver();
    saveGame();
    updateUI();
}

// === GENERERING AV UI (LISTER) ===

function renderJobs() {
    lists.jobs.innerHTML = "";
    DATA_JOBS.forEach(job => {
        const card = document.createElement('div');
        card.className = 'card';
        
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

function renderHousing() {
    lists.housing.innerHTML = "";
    DATA_HOUSING.forEach(house => {
        const card = document.createElement('div');
        card.className = 'card';
        
        const isCurrent = gameState.housingId === house.id;
        const isRent = house.type === 'rent';
        
        // Bilde
        let imgHTML = `<div class="housing-img">Ingen bilde</div>`;
        if (house.img && house.img !== "") {
            imgHTML = `<img src="${house.img}" class="housing-img" alt="${house.title}">`;
        }

        let priceText = isRent ? `${house.price} kr/mnd` : `${formatMoney(house.price)}`;
        let btnText = isCurrent ? "Bor her" : (isRent ? "Leie" : "Kjøp");
        let btnClass = isCurrent ? "card-btn active" : "card-btn";
        
        let tags = `<span class="tag ${isRent ? 'rent' : 'buy'}">${isRent ? 'Leie' : 'Eie'}</span>`;
        if (house.parking) tags += `<span class="tag parking">P-plass</span>`;

        let extraInfo = "";
        if (!isRent) {
            const equity = house.price * house.reqEquity;
            extraInfo = `<p class="desc" style="font-size:0.8rem; color:#8e44ad;">Krav egenkapital: ${formatMoney(equity)}</p>`;
        }

        card.innerHTML = `
            ${imgHTML}
            <h4>${house.title}</h4>
            <div>${tags}</div>
            <span class="price-tag">${priceText}</span>
            <p class="desc">${house.description}</p>
            ${extraInfo}
            <button class="${btnClass}" ${isCurrent ? "disabled" : ""} onclick="switchHousing('${house.id}')">${btnText}</button>
        `;
        lists.housing.appendChild(card);
    });
}

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

function renderStore() {
    lists.store.innerHTML = "";
    DATA_ITEMS.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        
        const owned = hasItem(item.id);
        
        let imgHTML = "";
        if (item.img) imgHTML = `<img src="${item.img}" class="housing-img" alt="${item.name}">`;

        let btnHTML = "";
        if (owned) {
            if (item.type === "subscription" || item.type === "insurance") {
                btnHTML = `<button class="card-btn cancel-btn" onclick="cancelItem('${item.id}')">Avslutt</button>`;
            } else {
                btnHTML = `<button class="card-btn active" disabled>Eier</button>`;
            }
        } else {
            const disabled = (gameState.balance < item.price && item.type === "one-time") ? "disabled" : "";
            const txt = disabled ? "For dyrt" : "Kjøp";
            btnHTML = `<button class="card-btn" ${disabled} onclick="buyItem('${item.id}')">${txt}</button>`;
        }

        let priceDisplay = item.type === "one-time" ? `${item.price} kr` : `${item.price} kr/mnd`;

        card.innerHTML = `
            ${imgHTML}
            <h4>${item.name}</h4>
            <span class="price-tag">${priceDisplay}</span>
            <p class="desc">${item.description}</p>
            ${btnHTML}
        `;
        lists.store.appendChild(card);
    });
}

// === HANDLINGSFUNKSJONER (GLOBAL SCOPE) ===

window.applyJob = function(id) {
    gameState.jobId = id;
    showToast("Gratulerer med ny jobb!", "success");
    renderJobs();
    updateUI();
    updatePlannerCalc();
};

window.switchHousing = function(id) {
    const newHouse = DATA_HOUSING.find(h => h.id === id);
    if (!newHouse) return;

    // Leie
    if (newHouse.type === 'rent') {
        clearHousingLoans();
        gameState.housingId = id;
        showToast(`Flyttet til ${newHouse.title}`, "success");
    } 
    // Kjøp
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

        // Opprett lån
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
};

window.selectStudy = function(id) {
    gameState.activeStudy = id;
    showToast("Studie valgt.", "info");
    renderEducation();
};

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
        gameState.inventory.push(id);
        showToast(`Abonnerer på ${item.name}.`, "success");
    }
    
    renderStore();
    updateUI();
    updatePlannerCalc();
};

window.cancelItem = function(id) {
    gameState.inventory = gameState.inventory.filter(i => i !== id);
    showToast("Abonnement avsluttet.", "info");
    renderStore();
    updateUI();
};

window.payEfaktura = function(id) {
    const bill = gameState.bills.find(b => b.id === id);
    if (!bill) return;

    if (gameState.balance >= bill.amount) {
        gameState.balance -= bill.amount;
        bill.isPaid = true;
        showToast(`eFaktura betalt.`, "success");
        updateUI();
    } else {
        showToast("Ikke nok penger på brukskonto.", "error");
    }
};

window.openBillModal = function(bill) {
    document.getElementById('bill-sender').textContent = bill.recipient;
    document.getElementById('bill-amount-display').textContent = bill.amount.toFixed(2);
    document.getElementById('bill-account-display').textContent = bill.account;
    document.getElementById('bill-kid-display').textContent = bill.kid;
    modals.paperBill.classList.remove('hidden');
};

// === BANK & BILLS UTILITY ===

function clearHousingLoans() {
    gameState.loans = gameState.loans.filter(l => l.name !== "Boliglån");
}

function generateMonthlyBills() {
    const m = gameState.month;
    const house = DATA_HOUSING.find(h => h.id === gameState.housingId);

    // 1. Husleie (hvis leie)
    if (house.type === 'rent') {
        createBill(CONFIG.RECIPIENTS.RENT, house.price, m, 1);
    } 
    // 2. Boliglån (hvis eie)
    else {
        const loan = gameState.loans.find(l => l.name === "Boliglån");
        if (loan) {
            const interest = (loan.amount * loan.rate) / 12;
            const principal = loan.originalAmount / CONFIG.LOAN_TERM_MONTHS;
            const monthlyPayment = Math.floor(interest + principal);

            createBill(CONFIG.RECIPIENTS.BANK, monthlyPayment, m, 1);
            
            // Reduser lånesaldo "visuelt" nå, selv om regningen ikke er betalt ennå.
            // Dette er en forenkling. I et ekte system skjer dette ved betaling.
            loan.amount = Math.max(0, loan.amount - principal); 
        }
    }

    generateRecurringBills();
}

function generateRecurringBills() {
    const m = gameState.month;
    const w = gameState.week;
    if (w === 3) createBill(CONFIG.RECIPIENTS.POWER, Math.floor(Math.random()*800)+400, m, 3);
    if (w === 4) createBill(CONFIG.RECIPIENTS.PHONE, 449, m, 4);
}

function createBill(recipient, amount, m, w) {
    const isEfaktura = gameState.efakturaAgreements.includes(recipient.name);
    const bill = {
        id: Date.now() + Math.random(),
        recipient: recipient.name,
        account: recipient.account,
        kid: Math.floor(Math.random() * 100000000).toString(),
        amount: Math.floor(amount),
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

// === HENDELSER & FAIL STATE ===

function handleRandomEvent() {
    if (Math.random() > 0.15) return;
    const event = DATA_EVENTS[Math.floor(Math.random() * DATA_EVENTS.length)];
    
    let cost = event.cost;
    let msg = "";
    
    if (cost > 0 && event.type !== "none") {
        const insurance = DATA_ITEMS.find(i => i.type === "insurance" && i.covers && i.covers.includes(event.id) && hasItem(i.id));
        if (insurance) {
            cost = 500; 
            msg = `Dekket av ${insurance.name}!`;
        } else {
            msg = "Ingen forsikring.";
        }
    }

    document.getElementById('event-text').textContent = event.text;
    document.getElementById('event-cost').textContent = cost !== 0 ? `${cost} kr` : "";
    document.getElementById('event-insurance').textContent = msg;
    modals.event.classList.remove('hidden');

    if (cost !== 0) createBill({name: "Uforutsett", account: "9999.11.22222"}, cost, gameState.month, gameState.week);
    gameState.happiness = clamp(gameState.happiness + event.happinessImpact, 0, 100);
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
    gameState.savings = 0;
    gameState.bsu = 0;
    gameState.happiness = 10;

    document.getElementById('gameover-reason').textContent = "Personlig Konkurs";
    modals.gameOver.classList.remove('hidden');
    
    const btn = document.getElementById('btn-restart');
    btn.textContent = "Flytt hjem til mor og far";
    btn.onclick = () => {
        modals.gameOver.classList.add('hidden');
        showToast("Du har flyttet hjem.", "info");
        updateUI();
        renderHousing();
        // Reset button
        btn.onclick = resetGame; 
        btn.textContent = "Start på nytt";
    };
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
    views[viewName].style.display = 'flex';
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

function handleTransfer() {
    const from = bank.transFrom.value;
    const to = bank.transTo.value;
    const amt = parseFloat(bank.transAmt.value);
    const map = { "checking": "balance", "savings": "savings", "bsu": "bsu" };
    
    if (from !== to && gameState[map[from]] >= amt && amt > 0) {
        gameState[map[from]] -= amt;
        gameState[map[to]] += amt;
        showToast("Overført", "success");
        bank.transAmt.value = "";
        updateUI();
    } else {
        showToast("Feil ved overføring", "error");
    }
}

function handleManualPayment() {
    const acc = bank.payTo.value.replace(/[^0-9]/g, '');
    const kid = bank.payKid.value.replace(/[^0-9]/g, '');
    const amt = parseFloat(bank.payAmt.value);
    const bill = gameState.bills.find(b => !b.isPaid && b.account.replace(/[^0-9]/g, '') === acc && b.kid === kid);
    
    if (bill && Math.abs(bill.amount - amt) < 2) {
        const fromKey = bank.payFrom.value === "savings" ? "savings" : "balance";
        if (gameState[fromKey] >= amt) {
            gameState[fromKey] -= amt;
            bill.isPaid = true;
            gameState.mailbox = gameState.mailbox.filter(id => id !== bill.id);
            showToast("Betalt!", "success");
            
            if (!bill.isEfaktura && !gameState.efakturaAgreements.includes(bill.recipient)) {
                document.getElementById('offer-recipient').textContent = bill.recipient;
                gameState.pendingEfaktura = bill.recipient;
                modals.efaktura.classList.remove('hidden');
            }
            bank.payTo.value = ""; bank.payKid.value = ""; bank.payAmt.value = "";
            updateUI();
        } else showToast("Ikke nok penger", "error");
    } else showToast("Ugyldig betaling", "error");
}

function handleEfakturaResponse(accept) {
    modals.efaktura.classList.add('hidden');
    if (accept && gameState.pendingEfaktura) {
        gameState.efakturaAgreements.push(gameState.pendingEfaktura);
        showToast("AvtaleGiro opprettet", "success");
    }
    gameState.pendingEfaktura = null;
}

function updateUI() {
    // Top Bar
    disp.month.textContent = gameState.month;
    disp.week.textContent = gameState.week;
    disp.cash.textContent = formatMoney(gameState.balance);
    
    const job = DATA_JOBS.find(j => j.id === gameState.jobId);
    disp.job.textContent = job ? job.title : "Ukjent";
    
    const house = DATA_HOUSING.find(h => h.id === gameState.housingId);
    disp.home.textContent = house ? house.title : "Ukjent";

    // Bars
    disp.health.style.width = gameState.health + "%";
    disp.health.style.backgroundColor = gameState.health < 30 ? 'red' : '#2ecc71';
    disp.happiness.style.width = gameState.happiness + "%";
    
    // Skills
    disp.skills.innerHTML = "";
    Object.entries(gameState.skills).forEach(([cat, xp]) => {
        disp.skills.innerHTML += `<li>${cat}: Nivå ${Math.floor(xp/100)}</li>`;
    });

    // Inventory
    disp.inventory.innerHTML = "";
    gameState.inventory.forEach(id => {
        const item = DATA_ITEMS.find(i => i.id === id);
        if (item) disp.inventory.innerHTML += `<li>${item.name}</li>`;
    });

    // Bank
    bank.balChecking.textContent = formatMoney(gameState.balance);
    bank.balSavings.textContent = formatMoney(gameState.savings);
    bank.balBsu.textContent = formatMoney(gameState.bsu);

    // Lån
    bank.loanContainer.innerHTML = "";
    let totalDebt = 0;
    if (gameState.loans.length === 0) {
        bank.loanContainer.innerHTML = '<div class="empty-bills">Ingen lån.</div>';
    } else {
        gameState.loans.forEach(loan => {
            totalDebt += loan.amount;
            const div = document.createElement('div');
            div.className = 'loan-item';
            div.innerHTML = `<span>${loan.name}</span><span>${formatMoney(loan.amount)}</span>`;
            bank.loanContainer.appendChild(div);
        });
    }
    bank.totalDebt.textContent = formatMoney(totalDebt);

    // Mailbox & eFaktura
    renderMailbox();
    renderEfakturaList();
}

function renderMailbox() {
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
}

function renderEfakturaList() {
    bank.efakturaList.innerHTML = "";
    const due = gameState.bills.filter(b => b.isEfaktura && !b.isPaid);
    if (due.length === 0) bank.efakturaList.innerHTML = '<div class="empty-bills">Ingen krav.</div>';
    
    due.forEach(bill => {
        const div = document.createElement('div');
        div.className = 'mail-item';
        div.innerHTML = `<span>${bill.recipient} (${bill.amount} kr)</span><button class="bank-action-btn" style="width:auto; padding:5px;" onclick="payEfaktura(${bill.id})">Betal</button>`;
        bank.efakturaList.appendChild(div);
    });
}

// Helper Functions
function hasItem(id) { return gameState.inventory.includes(id); }
function getSkillLevel(cat) { return Math.floor((gameState.skills[cat] || 0) / 100); }
function formatMoney(amount) { return Math.floor(amount).toLocaleString('no-NO') + " kr"; }
function clamp(val, min, max) { return Math.min(Math.max(val, min), max); }
function showToast(msg, type="info") {
    const t = document.createElement('div'); t.className = `toast ${type}`; t.textContent = msg;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
}
function showGameOver(reason) {
    document.getElementById('gameover-reason').textContent = reason;
    modals.gameOver.classList.remove('hidden');
}
function saveGame() { localStorage.setItem('livetBankenV16', JSON.stringify(gameState)); }
function loadGame() {
    const data = localStorage.getItem('livetBankenV16');
    if (data) gameState = { ...gameState, ...JSON.parse(data) };
}
function resetGame() { localStorage.removeItem('livetBankenV16'); location.reload(); }

// Start
init();
/* Version: #16 */
