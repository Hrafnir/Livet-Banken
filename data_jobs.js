/* Version: #1 - data_jobs.js */
const DATA_JOBS = [
    {
        id: "job_newspaper",
        title: "Avisbud",
        description: "En enkel jobb for å komme i gang. Krever ingen utdanning, men tidlige morgener.",
        salary: 165, // Kroner per time
        minHours: 5,
        maxHours: 15,
        commuteBase: 0, // 0 timer pendling (i nabolaget)
        happinessImpact: -2, // Litt kjipt å stå opp tidlig
        reqSkills: {} // Ingen krav
    },
    {
        id: "job_store",
        title: "Butikkmedarbeider",
        description: "Kassearbeid og varepåfylling på Rema 1000.",
        salary: 185,
        minHours: 10,
        maxHours: 37.5,
        commuteBase: 5, // 5 timer uka i buss
        happinessImpact: 0,
        reqSkills: {
            "service": 1 // Krever nivå 1 i Service (100 timer utdanning)
        }
    },
    {
        id: "job_support",
        title: "IT-Support Lærling",
        description: "Svare på telefoner og resette passord.",
        salary: 210,
        minHours: 20,
        maxHours: 37.5,
        commuteBase: 5,
        happinessImpact: -1, // Krevende kunder
        reqSkills: {
            "it_basic": 2 // Krever nivå 2 i IT (200 timer)
        }
    },
    {
        id: "job_developer",
        title: "Junior Utvikler",
        description: "Programmere nettsider og apper. Høy lønn og mulighet for hjemmekontor.",
        salary: 350,
        minHours: 37.5,
        maxHours: 50, // Mye overtid
        commuteBase: 2, // Lite pendling (hjemmekontor)
        happinessImpact: 2, // Gøy jobb
        reqSkills: {
            "it_basic": 3,
            "programming": 2
        }
    },
    {
        id: "job_sales_manager",
        title: "Salgssjef",
        description: "Lede et team med selgere. Høyt stressnivå, høy belønning.",
        salary: 450,
        minHours: 40,
        maxHours: 60,
        commuteBase: 8, // Mye reising
        happinessImpact: -5, // Stress
        reqSkills: {
            "service": 5,
            "management": 2
        }
    }
];
/* Version: #1 */
