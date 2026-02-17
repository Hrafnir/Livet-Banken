/* Version: #1 - data_items.js */
const DATA_ITEMS = [
    {
        id: "item_bike",
        name: "Brukt Sykkel",
        price: 1500,
        type: "one-time",
        description: "Reduserer pendletid med 1 time pr uke. Gir litt trening.",
        effect: {
            commuteReduction: 1,
            healthBonus: 1
        }
    },
    {
        id: "item_ebike",
        name: "El-Sykkel",
        price: 15000,
        type: "one-time",
        description: "Fyk til jobben! Reduserer pendletid med 3 timer pr uke. Høy lykke.",
        effect: {
            commuteReduction: 3,
            happinessBonus: 2
        }
    },
    {
        id: "sub_netflix",
        name: "Strømmetjeneste",
        price: 129, // Pris pr måned (vi må regne om til uke i spillet eller trekke månedlig)
        type: "subscription",
        description: "Gir tilgang til serier. Øker lykke hvis du har fritid.",
        effect: {
            happinessBonus: 3
        }
    },
    {
        id: "sub_gym",
        name: "Treningssenter",
        price: 400, // Pr mnd
        type: "subscription",
        description: "Nødvendig for effektiv styrketrening.",
        effect: {
            healthBonus: 5
        }
    },
    {
        id: "sub_ai",
        name: "AI Co-Pilot",
        price: 200, // Pr mnd
        type: "subscription",
        description: "Gjør studiene dine dobbelt så effektive!",
        effect: {
            studyEfficiency: 2.0 // Multiplier
        }
    },
    {
        id: "ins_innbo",
        name: "Innboforsikring",
        price: 100, // Pr mnd
        type: "insurance",
        description: "Dekker skader på ting i leiligheten (Vannlekkasje, brann).",
        covers: ["event_water_leak", "event_fire"]
    },
    {
        id: "ins_health",
        name: "Helseforsikring",
        price: 300, // Pr mnd
        type: "insurance",
        description: "Dekker store medisinske utgifter.",
        covers: ["event_dentist", "event_broken_leg"]
    }
];
/* Version: #1 */
