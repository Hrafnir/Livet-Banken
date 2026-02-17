/* Version: #1 - data_events.js */
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
        text: "Du ble tatt i fartskontroll på vei til jobb.",
        cost: 3500,
        type: "none", // Ingen forsikring dekker bøter
        happinessImpact: -5
    },
    {
        id: "event_lotto",
        text: "Gratulerer! Du vant en liten premie i Lotto.",
        cost: -500, // Negativ kostnad = inntekt
        type: "positive",
        happinessImpact: 10
    },
    {
        id: "event_gift",
        text: "Bestemor sendte deg penger til bursdagen.",
        cost: -1000,
        type: "positive",
        happinessImpact: 15
    },
    {
        id: "event_mobile_break",
        text: "Du mistet mobilen i bakken. Skjermen knuste.",
        cost: 2500,
        type: "innbo", // Noen innboforsikringer dekker dette
        happinessImpact: -15
    }
];
/* Version: #1 */
