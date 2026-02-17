/* Version: #1 - data_housing.js */
const DATA_HOUSING = [
    // --- TIL LEIE ---
    {
        id: "rent_basement",
        type: "rent",
        title: "Kjelleren til Mor & Far",
        description: "Trygt, billig, men litt flaut. Lukter gammel katt.",
        price: 2000, // Symbolsk sum for mat
        comfort: -5, // Går ut over stoltheten
        parking: true,
        reqEquity: 0,
        img: "img/morogfar.jpg" // Ingen bilde foreløpig
    },
    {
        id: "rent_shared",
        type: "rent",
        title: "Rom i Kollektiv",
        description: "Del kjøkken og bad med 4 andre. Fest hver helg.",
        price: 6500,
        comfort: -2, // Bråkete
        parking: false,
        reqEquity: 0,
        img: "img/kollektiv.jpg"
    },
    {
        id: "rent_studio",
        type: "rent",
        title: "Sentrumsnær Hybel",
        description: "15 kvm med eget bad og tekjøkken. Kort vei til alt.",
        price: 9500,
        comfort: 2,
        parking: false,
        reqEquity: 0,
        img: "img/studio.jpg"
    },
    {
        id: "rent_apartment",
        type: "rent",
        title: "Moderne 2-roms",
        description: "Høy standard, balkong og heis.",
        price: 14000,
        comfort: 5,
        parking: true,
        reqEquity: 0,
        img: "img/2roms.jpg"
    },

    // --- TIL SALGS ---
    {
        id: "buy_fixer",
        type: "buy",
        title: "Oppussingsobjekt",
        description: "Trenger mye kjærlighet. Perfekt for den nevenyttige.",
        price: 1800000,
        comfort: -1, // Støvete i starten
        parking: true,
        reqEquity: 0.15, // 15% krav
        img: ""
    },
    {
        id: "buy_apt_small",
        type: "buy",
        title: "Koselig Leilighet",
        description: "Innflyttingsklar 2-roms i rolig strøk.",
        price: 2900000,
        comfort: 4,
        parking: false,
        reqEquity: 0.15,
        img: ""
    },
    {
        id: "buy_house",
        type: "buy",
        title: "Enebolig med Hage",
        description: "God plass, garasje og hageflekk. Drømmeboligen.",
        price: 5500000,
        comfort: 10,
        parking: true,
        reqEquity: 0.15,
        img: ""
    }
];
/* Version: #1 */
