/* Version: #1 - script_life.js */

window.initLife = function() {
    console.log("Life: Initierer spillmotor...");
    
    renderJobs();
    renderHousing();
    renderEducation();
    renderStore();
    
    // Inputs listeners
    const inputs = document.querySelectorAll('.planner-input input, .planner-input select');
    inputs.forEach(inp => inp.addEventListener('input', updatePlannerCalc));
    
    document.getElementById('btn-run-week').addEventListener('click', runWeek);
    document.getElementById('btn-get-bankid').addEventListener('click', generateBankID);
    
    // Foreldre
    const btnPayParents = document.getElementById('btn-pay-parents');
    if(btnPayParents) btnPayParents.addEventListener('click', payParents);

    // Initial bills (only if new game)
    if (gameState.month === 1 && gameState.week === 1 && gameState.bills.length === 0) {
        const house = DATA_HOUSING.find(h => h.id === gameState.housingId);
        if (house && house.type === 'rent' && house.id !== 'rent_basement') {
            createBill(CONFIG.RECIPIENTS.RENT, house.price, 1, 1);
        }
    }

    updateUI();
    updatePlannerCalc();
};

// === PLANNER & LOOP ===

function calculateCommuteTime() {
    const job = DATA_JOBS.find(j => j.id === gameState.jobId);
    if (!job || parseInt(document.getElementById('input-work').value) === 0) return 0;
    
    let commute = job.commuteBase;
    gameState.inventory.forEach(itemId => {
        const item = DATA_ITEMS.find(i => i.id === itemId);
        if (item?.effect?.commuteReduction) commute -= item.effect.commuteReduction;
    });
    return Math.max(0, commute);
}

function updatePlannerCalc() {
    const job = DATA_JOBS.find(j => j.id === gameState.jobId);
    
    const sleep = parseInt(document.getElementById('input-sleep').value) || 0;
    const work = parseInt(document.getElementById('input-work').value) || 0;
    const chores = parseInt(document.getElementById('input-chores').value) || 0;
    const study = parseInt(document.getElementById('input-study').value) || 0;
    const exercise = parseInt(document.getElementById('input-exercise').value) || 0;
    const shopping = parseInt(document.getElementById('input-shopping').value) || 0;

    const commute = calculateCommuteTime();
    document.getElementById('calc-commute').textContent = commute;

    const total = (sleep * 7) + work + chores + study + exercise + shopping + commute;
    const free = CONFIG.HOURS_IN_WEEK - total;
    
    const freeEl = document.getElementById('calc-free-time');
    freeEl.textContent = free;

    let isValid = true;
    let msg = "Start Uken 🚀";
    if (free < 0) { isValid = false; msg = "Ikke nok timer!"; }
    else if (work > 0 && work < job.minHours) { isValid = false; msg = `Min jobb: ${job.minHours}t`; }
    else if (work > job.maxHours) { isValid = false; msg = `Maks jobb: ${job.maxHours}t`; }

    const btn = document.getElementById('btn-run-week');
    btn.disabled = !isValid;
    btn.textContent = msg;
    freeEl.style.color = free < 0 ? 'red' : 'inherit';
}

function runWeek() {
    const sleep = parseInt(document.getElementById('input-sleep').value) || 0;
    const work = parseInt(document.getElementById('input-work').value) || 0;
    const study = parseInt(document.getElementById('input-study').value) || 0;
    const exercise = parseInt(document.getElementById('input-exercise').value) || 0;
    const shopping = parseInt(document.getElementById('input-shopping').value) || 0;
    const chores = parseInt(document.getElementById('input-chores').value) || 0;
    const foodType = document.getElementById('select-food-budget').value;
    const freeTime = parseInt(document.getElementById('calc-free-time').textContent);

    // 1. Utgifter
    let expenses = CONFIG.FOOD_COST[foodType];
    gameState.inventory.forEach(itemId => {
        const item = DATA_ITEMS.find(i => i.id === itemId);
        if (item && (item.type === "subscription" || item.type === "insurance")) expenses += (item.price / 4);
    });
    if (gameState.activeStudy && study > 0) {
        const edu = DATA_EDUCATION.find(e => e.id === gameState.activeStudy);
        if (edu) expenses += edu.costPerWeek;
    }
    gameState.balance -= expenses;

    // 2. Inntekt
    const job = DATA_JOBS.find(j => j.id === gameState.jobId);
    if (work > 0) gameState.balance += (work * job.salary);

    // 3. XP
    if (study > 0 && gameState.activeStudy) {
        const edu = DATA_EDUCATION.find(e => e.id === gameState.activeStudy);
        let mult = hasItem("sub_ai") ? 2 : 1;
        const xp = study * edu.difficulty * mult;
        if (!gameState.skills[edu.category]) gameState.skills[edu.category] = 0;
        gameState.skills[edu.category] += xp;
    }

    // 4. Helse & Lykke
    let dHealth = 0, dHappiness = 0;
    const house = DATA_HOUSING.find(h => h.id === gameState.housingId);
    if (house) dHappiness += house.comfort;

    if (work > 0) dHappiness -= Math.floor(work / 12); 
    if (study > 0) dHappiness -= Math.floor(study / 15);

    if ((sleep * 7) < 49) { dHealth -= 2; dHappiness -= 3; } else dHealth += 1;
    if (foodType === 'low') dHealth -= 2;
    if (foodType === 'high') { dHealth += 1; dHappiness += 2; }
    if (exercise > 3) { dHealth += 3; dHappiness += 1; } else if (exercise === 0) dHealth -= 1;
    if (hasItem("sub_gym") && exercise > 0) dHealth += 2;
    if (shopping > 2) dHappiness += 3;
    if (hasItem("sub_netflix") && freeTime > 5) dHappiness += 2;
    
    if (chores < 3 && Math.random() < 0.1) {
        if (gameState.housingId === 'rent_basement') {
            showToast("Vannlekkasje! Pappa fikset det.", "info");
        } else {
            createBill({name: "Rørlegger", account: "1111.22.33333"}, 2500, gameState.month, gameState.week);
            showToast("Vannlekkasje!", "error");
        }
    }
    dHappiness += job.happinessImpact;

    handleRandomEvent();

    gameState.health = clamp(gameState.health + dHealth, 0, 100);
    gameState.happiness = clamp(gameState.happiness + dHappiness, 0, 100);

    // 5. Tid & Måned
    gameState.week++;
    if (gameState.week > 4) {
        if (gameState.housingId === 'rent_basement' && !gameState.parentsPaid) {
            gameState.happiness = Math.max(0, gameState.happiness - 20);
            showToast("Glemte å betale foreldre! De er skuffet.", "error");
        }
        gameState.week = 1;
        gameState.month++;
        gameState.parentsPaid = false; 
        showToast("Ny måned!", "info");
        if(window.generateMonthlyBills) window.generateMonthlyBills();
    }

    if(window.handleBankLogout) window.handleBankLogout(false);
    checkGameOver();
    saveGame();
    updateUI();
    renderJobs();
}

// === ACTIONS ===

function payParents() {
    if (gameState.parentsPaid) return showToast("Allerede betalt.", "info");
    if (gameState.balance >= 2000) {
        gameState.balance -= 2000;
        gameState.parentsPaid = true;
        showToast("Vippset 2000 kr.", "success");
        updateUI();
    } else showToast("Ikke nok penger.", "error");
}

function handleRandomEvent() {
    if (Math.random() > 0.15) return;
    
    const possibleEvents = DATA_EVENTS.filter(e => {
        if (!e.reqItem) return true;
        if (e.reqItem.startsWith('!')) return !hasItem(e.reqItem.substring(1));
        return hasItem(e.reqItem);
    });

    if (possibleEvents.length === 0) return;
    const event = possibleEvents[Math.floor(Math.random() * possibleEvents.length)];
    let cost = event.cost;
    let msg = "";

    if (cost > 0 && event.type !== "none") {
        if (gameState.housingId === 'rent_basement') {
            cost = 0; msg = "Dekket av foreldrenes forsikring.";
        } else {
            const insurance = DATA_ITEMS.find(i => i.type === "insurance" && i.covers?.includes(event.id) && hasItem(i.id));
            if (insurance) { cost = 500; msg = `Dekket av ${insurance.name}!`; }
            else { msg = "Ingen forsikring."; }
        }
    }

    document.getElementById('event-text').textContent = event.text;
    document.getElementById('event-cost').textContent = cost !== 0 ? `${cost} kr` : "";
    document.getElementById('event-insurance').textContent = msg;
    document.getElementById('modal-event').classList.remove('hidden');
    document.getElementById('btn-close-event').onclick = () => document.getElementById('modal-event').classList.add('hidden');

    if (cost !== 0) createBill({name: "Uforutsett", account: "9999.11.22222"}, cost, gameState.month, gameState.week);
    gameState.happiness = clamp(gameState.happiness + event.happinessImpact, 0, 100);
}

// === RENDERING ===

function updateUI() {
    document.getElementById('disp-month').textContent = gameState.month;
    document.getElementById('disp-week').textContent = gameState.week;
    document.getElementById('disp-cash').textContent = formatMoney(gameState.balance);
    
    const job = DATA_JOBS.find(j => j.id === gameState.jobId);
    document.getElementById('disp-job-title').textContent = job ? job.title : "Ukjent";
    
    const house = DATA_HOUSING.find(h => h.id === gameState.housingId);
    document.getElementById('disp-home-title').textContent = house ? house.title : "Ukjent";
    
    // Foreldre-knapp
    const pSec = document.getElementById('parents-section');
    if (gameState.housingId === 'rent_basement') {
        pSec.classList.remove('hidden');
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
        pSec.classList.add('hidden');
    }

    document.getElementById('bar-health').style.width = gameState.health + "%";
    document.getElementById('bar-happiness').style.width = gameState.happiness + "%";

    // Skills
    const sList = document.getElementById('skills-list');
    sList.innerHTML = "";
    Object.entries(gameState.skills).forEach(([cat, xp]) => {
        sList.innerHTML += `<li>${cat}: Nivå ${Math.floor(xp/CONFIG.XP_PER_LEVEL)} (${xp} xp)</li>`;
    });

    // Inventory
    const iList = document.getElementById('inventory-list');
    iList.innerHTML = "";
    gameState.inventory.forEach(id => {
        const item = DATA_ITEMS.find(i => i.id === id);
        if(item) iList.innerHTML += `<li>${item.name}</li>`;
    });

    // Mailbox
    const mList = document.getElementById('mailbox-list');
    mList.innerHTML = "";
    const unread = gameState.mailbox.length;
    document.getElementById('mail-count').textContent = unread;
    document.getElementById('mail-count').classList.toggle('hidden', unread === 0);
    
    if(unread === 0) mList.innerHTML = '<div class="empty-msg">Tomt.</div>';
    
    gameState.mailbox.forEach(id => {
        const bill = gameState.bills.find(b => b.id === id);
        if(bill) {
            const div = document.createElement('div');
            div.className = 'mail-item unread';
            div.innerHTML = `<span>${bill.recipient}</span><span>${bill.amount} kr</span>`;
            div.onclick = () => openBillModal(bill);
            mList.appendChild(div);
        }
    });

    // Kall Bank UI update hvis den finnes
    if(window.updateBankUI) window.updateBankUI();
}

function openBillModal(bill) {
    document.getElementById('bill-sender').textContent = bill.recipient;
    document.getElementById('bill-amount-display').textContent = bill.amount.toFixed(2);
    document.getElementById('bill-account-display').textContent = bill.account;
    document.getElementById('bill-kid-display').textContent = bill.kid;
    document.getElementById('modal-paper-bill').classList.remove('hidden');
    document.getElementById('btn-close-bill').onclick = () => document.getElementById('modal-paper-bill').classList.add('hidden');
}

// === EXPORTED HELPERS FOR HTML ===
window.applyJob = function(id) { 
    gameState.jobId = id; showToast("Ny jobb!"); renderJobs(); updateUI(); updatePlannerCalc(); 
};
window.switchHousing = function(id) {
    const newHouse = DATA_HOUSING.find(h => h.id === id);
    if (!newHouse) return;
    if (newHouse.type === 'rent') {
        gameState.loans = gameState.loans.filter(l => l.name !== "Boliglån");
        gameState.housingId = id;
        showToast(`Flyttet til ${newHouse.title}`, "success");
    } else if (newHouse.type === 'buy') {
        const down = newHouse.price * newHouse.reqEquity;
        if ((gameState.balance + gameState.savings) < down) return showToast("Mangler egenkapital", "error");
        let rem = down;
        if(gameState.savings >= rem) { gameState.savings -= rem; rem=0; } else { rem -= gameState.savings; gameState.savings=0; gameState.balance-=rem; }
        gameState.loans = gameState.loans.filter(l => l.name !== "Boliglån");
        const loan = newHouse.price - down;
        gameState.loans.push({id:Date.now(), name:"Boliglån", amount:loan, originalAmount:loan, rate:CONFIG.LOAN_INTEREST_RATE});
        gameState.housingId = id;
        showToast("Bolig kjøpt!", "success");
    }
    updateUI(); renderHousing();
};
window.selectStudy = function(id) { gameState.activeStudy = id; showToast("Studie valgt"); renderEducation(); };
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

function renderJobs() {
    const list = document.getElementById('job-list');
    list.innerHTML = "";
    DATA_JOBS.forEach(job => {
        const card = document.createElement('div'); card.className = 'card';
        let reqHTML = '<div class="req-list"><strong>Krav:</strong><br>';
        let canApply = true;
        if (Object.keys(job.reqSkills).length === 0) reqHTML += "Ingen krav.";
        else {
            for (const [skill, level] of Object.entries(job.reqSkills)) {
                const myLevel = getSkillLevel(skill);
                const color = myLevel >= level ? 'green' : 'red';
                if (myLevel < level) canApply = false;
                reqHTML += `<span style="color:${color}">${skill}: Nivå ${level} (Har: ${myLevel})</span><br>`;
            }
        }
        reqHTML += '</div>';
        const isCurrent = gameState.jobId === job.id;
        const btnClass = isCurrent ? "card-btn active" : "card-btn";
        const disabled = isCurrent || !canApply ? "disabled" : "";
        card.innerHTML = `<h4>${job.title}</h4><span class="price-tag">${job.salary} kr/t</span><p class="desc">${job.description}</p>${reqHTML}<button class="${btnClass}" ${disabled} onclick="applyJob('${job.id}')">${isCurrent?"Din Jobb":"Søk Jobb"}</button>`;
        list.appendChild(card);
    });
}
function renderHousing() {
    const list = document.getElementById('housing-list');
    list.innerHTML = "";
    DATA_HOUSING.forEach(house => {
        const card = document.createElement('div'); card.className = 'card';
        const isCurrent = gameState.housingId === house.id;
        const isRent = house.type === 'rent';
        let imgHTML = getImgHTML(house.img, house.title);
        let btnClass = isCurrent ? "card-btn active" : "card-btn";
        let extra = !isRent ? `<p class="desc" style="font-size:0.8rem; color:#8e44ad;">Egenkapital: ${formatMoney(house.price*house.reqEquity)}</p>` : "";
        card.innerHTML = `${imgHTML}<h4>${house.title}</h4><span class="price-tag">${isRent?house.price+' kr/mnd':formatMoney(house.price)}</span><p class="desc">${house.description}</p>${extra}<button class="${btnClass}" ${isCurrent?"disabled":""} onclick="switchHousing('${house.id}')">${isCurrent?"Bor her":(isRent?"Leie":"Kjøp")}</button>`;
        list.appendChild(card);
    });
}
function renderEducation() {
    const list = document.getElementById('edu-list');
    list.innerHTML = "";
    DATA_EDUCATION.forEach(edu => {
        const card = document.createElement('div'); card.className = 'card';
        const isActive = gameState.activeStudy === edu.id;
        const btnClass = isActive ? "card-btn active" : "card-btn";
        const myXP = gameState.skills[edu.category] || 0;
        card.innerHTML = `<h4>${edu.title}</h4><span class="price-tag">${edu.costPerWeek} kr/uke</span><div class="req-list">Nivå: ${Math.floor(myXP/100)} (${myXP} XP)</div><button class="${btnClass}" onclick="selectStudy('${edu.id}')">${isActive?"Valgt":"Velg"}</button>`;
        list.appendChild(card);
    });
}
function renderStore() {
    const list = document.getElementById('store-list');
    list.innerHTML = "";
    DATA_ITEMS.forEach(item => {
        const card = document.createElement('div'); card.className = 'card';
        const owned = hasItem(item.id);
        let imgHTML = getImgHTML(item.img, item.name);
        let btn = owned ? (item.type!=='one-time'?`<button class="card-btn cancel-btn" onclick="cancelItem('${item.id}')">Avslutt</button>`:`<button class="card-btn active" disabled>Eier</button>`) : `<button class="card-btn" ${(gameState.balance<item.price&&item.type==='one-time')?"disabled":""} onclick="buyItem('${item.id}')">Kjøp</button>`;
        card.innerHTML = `${imgHTML}<h4>${item.name}</h4><span class="price-tag">${item.price} kr</span><p class="desc">${item.description}</p>${btn}`;
        list.appendChild(card);
    });
}
window.renderHousing = renderHousing; // Export
window.updateUI = updateUI; // Export
/* Version: #1 */
