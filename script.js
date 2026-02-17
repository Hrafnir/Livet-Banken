/* Version: #17 */

// Vent til DOM er lastet for å unngå null-feil
document.addEventListener('DOMContentLoaded', () => {

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

    // === STATE ===
    let gameState = {
        month: 1, week: 1,
        balance: 2000, savings: 0, bsu: 0, loans: [],
        health: 90, happiness: 90,
        jobId: "job_newspaper", housingId: "rent_basement",
        skills: {}, inventory: [],
        bills: [], mailbox: [], efakturaAgreements: [],
        currentBankID: null, activeStudy: null, pendingEfaktura: null
    };

    // === DOM REFERENCES ===
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
        commute: document.getElementById('calc-commute'),
        parentsSection: document.getElementById('parents-section') // NY
    };

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

    const bankUI = {
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

    const lists = {
        jobs: document.getElementById('job-list'),
        housing: document.getElementById('housing-list'),
        edu: document.getElementById('edu-list'),
        store: document.getElementById('store-list'),
        mailbox: document.getElementById('mailbox-list'),
        mailBadge: document.getElementById('mail-count')
    };

    const modals = {
        bankId: document.getElementById('modal-bankid'),
        paperBill: document.getElementById('modal-paper-bill'),
        efaktura: document.getElementById('modal-efaktura-offer'),
        event: document.getElementById('modal-event'),
        gameOver: document.getElementById('modal-gameover')
    };

    // === INIT ===
    function init() {
        console.log("System: Initierer...");
        loadGame();
        
        if (!gameState.housingId) gameState.housingId = "rent_basement";
        
        renderJobs();
        renderHousing();
        renderEducation();
        renderStore();
        
        // Setup listeners
        Object.keys(navBtns).forEach(key => navBtns[key].addEventListener('click', () => switchView(key)));
        Object.values(inputs).forEach(inp => inp.addEventListener('input', updatePlannerCalc));
        
        planner.btnRun.addEventListener('click', runWeek);
        
        document.getElementById('btn-get-bankid').addEventListener('click', generateBankID);
        document.getElementById('btn-close-bankid').addEventListener('click', () => modals.bankId.classList.add('hidden'));
        
        bankUI.loginForm.addEventListener('submit', handleBankLogin);
        document.getElementById('btn-logout').addEventListener('click', handleBankLogout);
        bankUI.btnPay.addEventListener('click', handleManualPayment);
        bankUI.btnTrans.addEventListener('click', handleTransfer);

        document.getElementById('btn-close-bill').addEventListener('click', () => modals.paperBill.classList.add('hidden'));
        document.getElementById('btn-accept-efaktura').addEventListener('click', () => handleEfakturaResponse(true));
        document.getElementById('btn-decline-efaktura').addEventListener('click', () => handleEfakturaResponse(false));
        document.getElementById('btn-close-event').addEventListener('click', () => modals.event.classList.add('hidden'));
        document.getElementById('btn-restart').addEventListener('click', resetGame);
        
        // Foreldre-betaling knapp
        document.getElementById('btn-pay-parents').addEventListener('click', payParents);

        updateUI();
        updatePlannerCalc();
    }

    // === LOGIKK ===

    function calculateCommuteTime() {
        const job = DATA_JOBS.find(j => j.id === gameState.jobId);
        if (!job || parseInt(inputs.work.value) === 0) return 0;
        let commute = job.commuteBase;
        gameState.inventory.forEach(itemId => {
            const item = DATA_ITEMS.find(i => i.id === itemId);
            if (item?.effect?.commuteReduction) commute -= item.effect.commuteReduction;
        });
        return Math.max(0, commute);
    }

    function updatePlannerCalc() {
        const job = DATA_JOBS.find(j => j.id === gameState.jobId);
        const sleep = parseInt(inputs.sleep.value) || 0;
        const work = parseInt(inputs.work.value) || 0;
        const chores = parseInt(inputs.chores.value) || 0;
        const study = parseInt(inputs.study.value) || 0;
        const exercise = parseInt(inputs.exercise.value) || 0;
        const shopping = parseInt(inputs.shopping.value) || 0;
        
        const commute = calculateCommuteTime();
        disp.commute.textContent = commute;
        
        const total = (sleep * 7) + work + chores + study + exercise + shopping + commute;
        const free = CONFIG.HOURS_IN_WEEK - total;
        planner.freeTime.textContent = free;

        let isValid = true;
        let msg = "Start Uken 🚀";
        if (free < 0) { isValid = false; msg = "Ikke nok timer!"; }
        else if (work > 0 && work < job.minHours) { isValid = false; msg = `Min jobb: ${job.minHours}t`; }
        else if (work > job.maxHours) { isValid = false; msg = `Maks jobb: ${job.maxHours}t`; }

        planner.btnRun.disabled = !isValid;
        planner.btnRun.textContent = msg;
        planner.freeTime.style.color = free < 0 ? 'red' : 'inherit';
    }

    function runWeek() {
        const sleep = parseInt(inputs.sleep.value) || 0;
        const work = parseInt(inputs.work.value) || 0;
        const study = parseInt(inputs.study.value) || 0;
        const exercise = parseInt(inputs.exercise.value) || 0;
        const shopping = parseInt(inputs.shopping.value) || 0;
        const chores = parseInt(inputs.chores.value) || 0;
        const foodType = inputs.food.value;
        const freeTime = parseInt(planner.freeTime.textContent);

        // Utgifter
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

        // Inntekt
        const job = DATA_JOBS.find(j => j.id === gameState.jobId);
        if (work > 0) gameState.balance += (work * job.salary);

        // XP
        if (study > 0 && gameState.activeStudy) {
            const edu = DATA_EDUCATION.find(e => e.id === gameState.activeStudy);
            let mult = hasItem("sub_ai") ? 2 : 1;
            const xp = study * edu.difficulty * mult;
            if (!gameState.skills[edu.category]) gameState.skills[edu.category] = 0;
            gameState.skills[edu.category] += xp;
        }

        // Stats
        let dHealth = 0, dHappiness = 0;
        const house = DATA_HOUSING.find(h => h.id === gameState.housingId);
        if (house) dHappiness += house.comfort;

        if ((sleep * 7) < 49) { dHealth -= 2; dHappiness -= 3; } else dHealth += 1;
        if (foodType === 'low') dHealth -= 2;
        if (foodType === 'high') { dHealth += 1; dHappiness += 2; }
        if (exercise > 3) { dHealth += 3; dHappiness += 1; } else if (exercise === 0) dHealth -= 1;
        if (hasItem("sub_gym") && exercise > 0) dHealth += 2;
        if (shopping > 2) dHappiness += 3;
        if (hasItem("sub_netflix") && freeTime > 5) dHappiness += 2;
        if (chores < 3 && Math.random() < 0.1) {
            // Hvis man bor i kjelleren, fikser pappa det
            if (gameState.housingId === 'rent_basement') {
                showToast("Vannlekkasje! Pappa fikset det.", "info");
            } else {
                createBill({name: "Rørlegger", account: "1111.22.33333"}, 2500, gameState.month, gameState.week);
                showToast("Vannlekkasje! Rørlegger tilkalt.", "error");
            }
        }
        dHappiness += job.happinessImpact;

        handleRandomEvent();

        gameState.health = clamp(gameState.health + dHealth, 0, 100);
        gameState.happiness = clamp(gameState.happiness + dHappiness, 0, 100);

        gameState.week++;
        if (gameState.week > 4) {
            gameState.week = 1;
            gameState.month++;
            showToast("Ny måned!", "info");
            generateMonthlyBills();
        }

        // Logg ut av banken hver uke (Sikkerhet)
        handleBankLogout(false); // false = ikke vis toast "logget ut" hver gang, bare gjør det
        
        checkGameOver();
        saveGame();
        updateUI();
    }

    // === BOLIG & LÅN ===

    window.switchHousing = function(id) {
        const newHouse = DATA_HOUSING.find(h => h.id === id);
        if (!newHouse) return;

        if (newHouse.type === 'rent') {
            clearHousingLoans();
            gameState.housingId = id;
            showToast(`Flyttet til ${newHouse.title}`, "success");
        } 
        else if (newHouse.type === 'buy') {
            const downPayment = newHouse.price * newHouse.reqEquity;
            const liquid = gameState.balance + gameState.savings;
            if (liquid < downPayment) return showToast(`Mangler ${formatMoney(downPayment - liquid)} egenkapital`, "error");

            let remain = downPayment;
            if (gameState.savings >= remain) { gameState.savings -= remain; remain = 0; }
            else { remain -= gameState.savings; gameState.savings = 0; gameState.balance -= remain; }

            const loan = newHouse.price - downPayment;
            clearHousingLoans();
            gameState.loans.push({ id: Date.now(), name: "Boliglån", amount: loan, originalAmount: loan, rate: CONFIG.LOAN_INTEREST_RATE });
            gameState.housingId = id;
            showToast("Bolig kjøpt!", "success");
        }
        updateUI();
        renderHousing();
    };

    function payParents() {
        if (gameState.balance >= 2000) {
            gameState.balance -= 2000;
            showToast("Vippset 2000 kr til mat.", "success");
            updateUI();
        } else {
            showToast("Ikke nok penger.", "error");
        }
    }

    function generateMonthlyBills() {
        const m = gameState.month;
        const house = DATA_HOUSING.find(h => h.id === gameState.housingId);

        // 1. Husleie (Men IKKE hvis man bor i kjelleren)
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
                const monthly = Math.floor(interest + principal);
                createBill(CONFIG.RECIPIENTS.BANK, monthly, m, 1);
                loan.amount = Math.max(0, loan.amount - principal);
            }
        }
        
        // Strøm/Mobil
        const w = gameState.week; // Egentlig alltid uke 1 her siden vi er i month-loop? 
        // Nei, generateMonthlyBills kalles når week resetter til 1.
        // La oss spre regninger:
        createBill(CONFIG.RECIPIENTS.POWER, Math.floor(Math.random()*800)+400, m, 2);
        createBill(CONFIG.RECIPIENTS.PHONE, 449, m, 3);
    }

    function createBill(recipient, amount, m, w) {
        const isEfaktura = gameState.efakturaAgreements.includes(recipient.name);
        // Nytt KID for hver regning for realisme
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

    // === HENDELSER ===
    function handleRandomEvent() {
        if (Math.random() > 0.15) return;
        const event = DATA_EVENTS[Math.floor(Math.random() * DATA_EVENTS.length)];
        let cost = event.cost;
        let msg = "";

        if (cost > 0 && event.type !== "none") {
            // Sjekk om man bor hjemme (Gratis forsikring)
            if (gameState.housingId === 'rent_basement') {
                cost = 0;
                msg = "Dekket av foreldrenes forsikring.";
            } else {
                const insurance = DATA_ITEMS.find(i => i.type === "insurance" && i.covers?.includes(event.id) && hasItem(i.id));
                if (insurance) {
                    cost = 500; msg = `Dekket av ${insurance.name}!`;
                } else {
                    msg = "Ingen forsikring.";
                }
            }
        }

        document.getElementById('event-text').textContent = event.text;
        document.getElementById('event-cost').textContent = cost !== 0 ? `${cost} kr` : "";
        document.getElementById('event-insurance').textContent = msg;
        modals.event.classList.remove('hidden');

        if (cost !== 0) createBill({name: "Uforutsett", account: "9999.11.22222"}, cost, gameState.month, gameState.week);
        gameState.happiness = clamp(gameState.happiness + event.happinessImpact, 0, 100);
    }

    // === BANK FUNKSJONER ===
    
    function handleManualPayment() {
        // Hent input verdier trygt
        const accInput = bankUI.payTo.value || "";
        const kidInput = bankUI.payKid.value || "";
        const amtInput = bankUI.payAmt.value || "0";

        const acc = accInput.replace(/[^0-9]/g, '');
        const kid = kidInput.replace(/[^0-9]/g, '');
        const amt = parseFloat(amtInput);

        const bill = gameState.bills.find(b => !b.isPaid && b.account.replace(/[^0-9]/g, '') === acc && b.kid === kid);

        if (bill && Math.abs(bill.amount - amt) < 2) {
            const fromKey = bankUI.payFrom.value === "savings" ? "savings" : "balance";
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
                bankUI.payTo.value = ""; bankUI.payKid.value = ""; bankUI.payAmt.value = "";
                updateUI();
            } else showToast("Ikke nok penger", "error");
        } else showToast("Ugyldig betaling (Sjekk KID/Konto)", "error");
    }

    function handleBankLogin(e) {
        e.preventDefault();
        if (parseInt(bankUI.inputId.value) === gameState.currentBankID) {
            bankUI.loginScreen.classList.add('hidden');
            bankUI.dashboard.classList.remove('hidden');
            bankUI.error.classList.add('hidden');
            updateUI();
        } else bankUI.error.classList.remove('hidden');
    }

    function handleBankLogout(showMsg = true) {
        bankUI.dashboard.classList.add('hidden');
        bankUI.loginScreen.classList.remove('hidden');
        gameState.currentBankID = null;
        if(showMsg) showToast("Logget ut", "info");
    }

    function generateBankID() {
        gameState.currentBankID = Math.floor(100000 + Math.random() * 900000);
        document.getElementById('display-bankid-code').textContent = gameState.currentBankID;
        modals.bankId.classList.remove('hidden');
    }

    function handleTransfer() {
        const from = bankUI.transFrom.value;
        const to = bankUI.transTo.value;
        const amt = parseFloat(bankUI.transAmt.value);
        const map = { "checking": "balance", "savings": "savings", "bsu": "bsu" };
        
        if (from !== to && gameState[map[from]] >= amt && amt > 0) {
            gameState[map[from]] -= amt;
            gameState[map[to]] += amt;
            showToast("Overført", "success");
            bankUI.transAmt.value = "";
            updateUI();
        } else showToast("Feil", "error");
    }

    // === UI RENDERING ===
    function renderJobs() {
        lists.jobs.innerHTML = "";
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
                    reqHTML += `<span style="color:${color}">${skill}: Nivå ${level}</span><br>`;
                }
            }
            reqHTML += '</div>';
            const isCurrent = gameState.jobId === job.id;
            const btnText = isCurrent ? "Din Jobb" : (canApply ? "Søk Jobb" : "Mangler kompetanse");
            const btnClass = isCurrent ? "card-btn active" : "card-btn";
            const disabled = isCurrent || !canApply ? "disabled" : "";

            card.innerHTML = `<h4>${job.title}</h4><span class="price-tag">${job.salary} kr/t</span><p class="desc">${job.description}</p>${reqHTML}<button class="${btnClass}" ${disabled} onclick="applyJob('${job.id}')">${btnText}</button>`;
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
            
            let imgHTML = `<div class="housing-img">Ingen bilde</div>`;
            if (house.img) imgHTML = `<img src="${house.img}" class="housing-img" alt="${house.title}">`;

            let priceText = isRent ? `${house.price} kr/mnd` : `${formatMoney(house.price)}`;
            let btnText = isCurrent ? "Bor her" : (isRent ? "Leie" : "Kjøp");
            let btnClass = isCurrent ? "card-btn active" : "card-btn";
            let tags = `<span class="tag ${isRent ? 'rent' : 'buy'}">${isRent ? 'Leie' : 'Eie'}</span>`;
            
            let extra = "";
            if(!isRent) extra = `<p class="desc" style="font-size:0.8rem; color:#8e44ad;">Egenkapital: ${formatMoney(house.price*house.reqEquity)}</p>`;

            card.innerHTML = `${imgHTML}<h4>${house.title}</h4><div>${tags}</div><span class="price-tag">${priceText}</span><p class="desc">${house.description}</p>${extra}<button class="${btnClass}" ${isCurrent ? "disabled" : ""} onclick="switchHousing('${house.id}')">${btnText}</button>`;
            lists.housing.appendChild(card);
        });
    }

    function renderEducation() {
        lists.edu.innerHTML = "";
        DATA_EDUCATION.forEach(edu => {
            const card = document.createElement('div');
            card.className = 'card';
            const isActive = gameState.activeStudy === edu.id;
            const btnClass = isActive ? "card-btn active" : "card-btn";
            const myXP = gameState.skills[edu.category] || 0;
            card.innerHTML = `<h4>${edu.title}</h4><span class="price-tag">${edu.costPerWeek} kr/uke</span><p class="desc">${edu.description}</p><div class="req-list">Nivå: ${Math.floor(myXP/100)} (${myXP} XP)</div><button class="${btnClass}" onclick="selectStudy('${edu.id}')">${isActive ? "Valgt" : "Velg"}</button>`;
            lists.edu.appendChild(card);
        });
    }

    function renderStore() {
        lists.store.innerHTML = "";
        DATA_ITEMS.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card';
            const owned = hasItem(item.id);
            let imgHTML = item.img ? `<img src="${item.img}" class="housing-img">` : "";
            let btn = "";
            if (owned) {
                if(item.type !== 'one-time') btn = `<button class="card-btn cancel-btn" onclick="cancelItem('${item.id}')">Avslutt</button>`;
                else btn = `<button class="card-btn active" disabled>Eier</button>`;
            } else {
                let dis = (gameState.balance < item.price && item.type === 'one-time') ? "disabled" : "";
                btn = `<button class="card-btn" ${dis} onclick="buyItem('${item.id}')">Kjøp</button>`;
            }
            card.innerHTML = `${imgHTML}<h4>${item.name}</h4><span class="price-tag">${item.price} kr${item.type==='one-time'?'':'/mnd'}</span><p class="desc">${item.description}</p>${btn}`;
            lists.store.appendChild(card);
        });
    }

    function updateUI() {
        disp.month.textContent = gameState.month;
        disp.week.textContent = gameState.week;
        disp.cash.textContent = formatMoney(gameState.balance);
        
        const job = DATA_JOBS.find(j => j.id === gameState.jobId);
        disp.job.textContent = job ? job.title : "Ukjent";
        
        const house = DATA_HOUSING.find(h => h.id === gameState.housingId);
        disp.home.textContent = house ? house.title : "Ukjent";
        
        // Vis/skjul foreldre-boks
        if (gameState.housingId === 'rent_basement') {
            disp.parentsSection.classList.remove('hidden');
        } else {
            disp.parentsSection.classList.add('hidden');
        }

        disp.health.style.width = gameState.health + "%";
        disp.health.style.backgroundColor = gameState.health < 30 ? 'red' : '#2ecc71';
        disp.happiness.style.width = gameState.happiness + "%";

        disp.skills.innerHTML = "";
        Object.entries(gameState.skills).forEach(([cat, xp]) => {
            disp.skills.innerHTML += `<li>${cat}: Nivå ${Math.floor(xp/100)}</li>`;
        });

        disp.inventory.innerHTML = "";
        gameState.inventory.forEach(id => {
            const item = DATA_ITEMS.find(i => i.id === id);
            if(item) disp.inventory.innerHTML += `<li>${item.name}</li>`;
        });

        bankUI.balChecking.textContent = formatMoney(gameState.balance);
        bankUI.balSavings.textContent = formatMoney(gameState.savings);
        bankUI.balBsu.textContent = formatMoney(gameState.bsu);

        bankUI.loanContainer.innerHTML = "";
        let totalDebt = 0;
        if(gameState.loans.length === 0) bankUI.loanContainer.innerHTML = '<div class="empty-bills">Ingen lån.</div>';
        else {
            gameState.loans.forEach(loan => {
                totalDebt += loan.amount;
                const div = document.createElement('div');
                div.className = 'loan-item';
                div.innerHTML = `<span>${loan.name}</span><span>${formatMoney(loan.amount)}</span>`;
                bankUI.loanContainer.appendChild(div);
            });
        }
        bankUI.totalDebt.textContent = formatMoney(totalDebt);

        // Mailbox
        lists.mailbox.innerHTML = "";
        const unread = gameState.mailbox.length;
        lists.mailBadge.textContent = unread;
        lists.mailBadge.classList.toggle('hidden', unread === 0);
        if(unread === 0) lists.mailbox.innerHTML = '<div class="empty-msg">Tomt.</div>';
        gameState.mailbox.forEach(id => {
            const bill = gameState.bills.find(b => b.id === id);
            if(bill) {
                const div = document.createElement('div');
                div.className = 'mail-item unread';
                div.innerHTML = `<span>${bill.recipient}</span><span>${bill.amount} kr</span>`;
                div.onclick = () => openBillModal(bill);
                lists.mailbox.appendChild(div);
            }
        });

        // eFaktura
        bankUI.efakturaList.innerHTML = "";
        const due = gameState.bills.filter(b => b.isEfaktura && !b.isPaid);
        if(due.length === 0) bankUI.efakturaList.innerHTML = '<div class="empty-bills">Ingen krav.</div>';
        due.forEach(bill => {
            const div = document.createElement('div');
            div.className = 'mail-item';
            div.innerHTML = `<span>${bill.recipient} (${bill.amount} kr)</span><button class="bank-action-btn" style="width:auto; padding:5px;" onclick="payEfaktura(${bill.id})">Betal</button>`;
            bankUI.efakturaList.appendChild(div);
        });
    }

    // === GLOBAL SCOPE HELPERS (For HTML onclick) ===
    window.applyJob = function(id) { gameState.jobId = id; showToast("Ny jobb!"); renderJobs(); updateUI(); updatePlannerCalc(); };
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
        modals.paperBill.classList.remove('hidden');
    };
    window.switchView = function(key) {
        Object.values(views).forEach(el => { el.classList.remove('active-view'); el.classList.add('hidden-view'); el.style.display = 'none'; });
        Object.values(navBtns).forEach(el => el.classList.remove('active'));
        views[key].classList.add('active-view');
        views[key].classList.remove('hidden-view');
        views[key].style.display = 'flex';
        navBtns[key].classList.add('active');
    };

    function clearHousingLoans() { gameState.loans = gameState.loans.filter(l => l.name !== "Boliglån"); }
    function hasItem(id) { return gameState.inventory.includes(id); }
    function getSkillLevel(cat) { return Math.floor((gameState.skills[cat] || 0) / 100); }
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
        modals.gameOver.classList.remove('hidden');
        document.getElementById('btn-restart').textContent = "Flytt hjem";
        document.getElementById('btn-restart').onclick = () => {
            modals.gameOver.classList.add('hidden');
            updateUI(); renderHousing();
            document.getElementById('btn-restart').onclick = resetGame;
        };
    }
    function showGameOver(reason) {
        document.getElementById('gameover-reason').textContent = reason;
        modals.gameOver.classList.remove('hidden');
    }
    function saveGame() { localStorage.setItem('livetBankenV17', JSON.stringify(gameState)); }
    function loadGame() {
        const data = localStorage.getItem('livetBankenV17');
        if (data) gameState = { ...gameState, ...JSON.parse(data) };
    }
    function resetGame() { localStorage.removeItem('livetBankenV17'); location.reload(); }

    // Start
    init();
});
/* Version: #17 */
