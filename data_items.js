/* Version: #3 - data_items.js */
const DATA_ITEMS = [
    {
        id: "item_bike",
        name: "Brukt Sykkel",
        price: 1500,
        type: "one-time",
        description: "Reduserer pendletid med 1 time pr uke. Gir litt trening.",
        effect: { commuteReduction: 1, healthBonus: 1 },
        img: "img/sykkel.jpg"
    },
    {
        id: "item_ebike",
        name: "El-Sykkel",
        price: 15000,
        type: "one-time",
        description: "Reduserer pendletid med 3 timer pr uke. Høy lykke.",
        effect: { commuteReduction: 3, happinessBonus: 2 },
        img: "img/elsykkel.jpg"
    },
    {
        id: "item_car",
        name: "Bruktbil (Toyota)",
        price: 45000,
        type: "one-time",
        description: "Reduserer pendletid med 5 timer. Krever drivstoff (uforutsette utgifter).",
        effect: { commuteReduction: 5, happinessBonus: 3 },
        img: "img/bil.jpg"
    },
    {
        id: "sub_netflix",
        name: "Strømmetjeneste",
        price: 199, 
        type: "subscription",
        description: "Øker lykke hvis du har fritid.",
        effect: { happinessBonus: 3 },
        img: "img/netflix.jpg"
    },
    {
        id: "sub_gym",
        name: "Treningssenter",
        price: 499,
        type: "subscription",
        description: "Nødvendig for effektiv styrketrening.",
        effect: { healthBonus: 5 },
        img: "img/gym.jpg"
    },
    {
        id: "sub_ai",
        name: "AI Co-Pilot",
        price: 249,
        type: "subscription",
        description: "Gjør studiene dine dobbelt så effektive!",
        effect: { studyEfficiency: 2.0 },
        img: "img/ai.jpg"
    },
    {
        id: "ins_innbo",
        name: "Innboforsikring",
        price: 149,
        type: "insurance",
        description: "Dekker skader på ting i hjemmet.",
        covers: ["event_water_leak", "event_fire", "event_mobile_break"],
        img: "img/forsikring.jpg"
    }
];
/* Version: #3 */
