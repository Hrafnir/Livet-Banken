/* Version: #2 - data_events.js */
const DATA_EVENTS = [
    {
        id: "event_dentist",
        text: "Au! Du knakk en tann og må til tannlegen akutt.",
        cost: 4500,
        type: "health",
        happinessImpact: -10
    },
    {
        id: "event_water_leak",
        text: "Vaskemaskinen lakk vann utover gulvet!",
        cost: 8000,
        type: "innbo",
        happinessImpact: -20
    },
    {
        id: "event_speeding",
        text: "Du ble tatt i fartskontroll.",
        cost: 3500,
        type: "none",
        happinessImpact: -5,
        reqItem: "item_car" // Krever at man eier bil
    },
    {
        id: "event_ticket",
        text: "Du snek på bussen og ble tatt i kontroll.",
        cost: 1100,
        type: "none",
        happinessImpact: -5,
        // Skjer kun hvis man IKKE har bil (da tar man buss)
        reqItem: "!item_car" 
    },
    {
        id: "event_lotto",
        text: "Gratulerer! Du vant en liten premie i Lotto.",
        cost: -500,
        type: "positive",
        happinessImpact: 10
    },
    {
        id: "event_mobile_break",
        text: "Du mistet mobilen i bakken. Skjermen knuste.",
        cost: 2500,
        type: "innbo",
        happinessImpact: -15
    }
];
/* Version: #2 */
