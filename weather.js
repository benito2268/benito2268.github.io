// gets stuff from the NWS apis and populates the weather page
// Ben Staehle
// 10/14/25

// =========================================================================
// Weather Page Functions
// =========================================================================

// global state object
const state = {
    location : null,
    stationData : null,
    currentWeather : null,
    forecast : null,
};

async function fetchWeather() {
  const position = await new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject)
  );

  const { latitude, longitude } = position.coords;
  state.location = { lat: latitude, lon: longitude };

  state.stationData = await getStationData(latitude, longitude);

  const [current, forecast] = await Promise.all([
    getCurrentCond(state.stationData.name),
    fetchForecast(state.stationData.forcastURL)
  ]);

  state.currentWeather = current;
  state.forecast = forecast;

  // actually do the population
  populateCurrentWeather();
  populateDailyForecast();

  console.log("Weather data loaded:", state);
}

function el(tag, props = {}, children = []) {
  const e = document.createElement(tag);
  Object.assign(e, props);
  for (const child of children) {
    e.append(child);
  }
  return e;
}

async function populateCurrentWeather() {
    const stationData = state.stationData;
    const currWeather = state.currentWeather;
    let locCard = document.getElementById("locationInfo");
    let currCard = document.getElementById("currentWeather");

    currCard.innerText = "";
    locCard.innerText = "";

    // name
    locCard.append(
      el("h2", {className: "card-content", textContent: `${currWeather.name} (${stationData.name})`})
    );

    // temperature
    currCard.append(
      el("h1", {className: "temp", textContent: `${currWeather.tempF}°F`}),
      el("img", {src : `images/weather/${pickIconKey(currWeather.condition, isNight(currWeather.timestamp))}`}),
      el("h2", {className: "main-data", textContent: `${currWeather.condition}`, style: "color: #FFC966;"}),
      el("hr"),
      el("h3", {className: "aux-data", textContent: `Humidity: ${currWeather.relHum}%`}),
      el("h3", {className: "aux-data", textContent: `Dew Point: ${currWeather.dewpointF}°F`}),
      el("h3", {className: "aux-data", textContent: `Wind: ${currWeather.windDir} ${currWeather.windMph != 0 ? (currWeather.windMph + " MPH") : "Calm"}`}),
    );
}

function genForcastCard(parentId, pair, cardEl) {
    if (pair.day && pair.night) {
        // both are valid - create a top half for day and bottom for night
        cardEl.append(
            el("h1", { "classList" : "card-title", "textContent" : `${pair.day.name}` }),
            el("h2", { "classList" : "fcast-content", "textContent" : `${pair.day.shortForecast}` }),
            el("img", { "classList" : "fcast-img", "src" : `images/weather/${pickIconKey(pair.day.shortForecast)}`}),
            el("span", { "classList" : "card-row" }, [
              el("h2", { "classList" : "card-title", "textContent" : `${pair.day.temperature}°F`, "style" : "color: #E9967A;"}),
              el("h2", { "classList" : "fcast-content", "textContent" : `${pair.day.probabilityOfPrecipitation.value}% chance precip.`}),
            ]),
            el("hr"),
            el("h1", { "classList" : "card-title", "textContent" : `${pair.night.name}` }),
            el("h2", { "classList" : "fcast-content", "textContent" : `${pair.night.shortForecast}` }),
            el("span", { "classList" : "card-row" }, [
              el("h2", { "classList" : "card-title", "textContent" : `${pair.night.temperature}°F`, "style" : "color: #7BAFD4;"}),
              el("h2", { "classList" : "fcast-content", "textContent" : `${pair.night.probabilityOfPrecipitation.value}% chance precip.`}),
            ]),
        );

    } else {
        if (!pair.day && !pair.night) {
            // we have a problem :P
            cardEl.append(el("p", { "textContent" : "oops couldn't load this day :(" }));
            return;
        }

        // generate a full card for whichever it is
        let period = (pair.day ?? pair.night);
        let isNight = period == pair.night;

        cardEl.append(
            el("h1", { "classList" : "card-title", "textContent" : `${period.name}` }),
            el("h2", { "classList" : "fcast-content", "textContent" : `${period.shortForecast}` }),
            el("img", { "classList" : "fcast-img", "src" : `images/weather/${pickIconKey(period.shortForecast, isNight)}`}),
            el("span", { "classList" : "card-row" }, [
              el("h2", { "classList" : "card-title", "textContent" : `${period.temperature}°F`, "style" : `color: ${isNight ? "#7BAFD4" : "#E9967A"};`}),
              el("h2", { "classList" : "fcast-content", "textContent" : `${period.probabilityOfPrecipitation.value}% chance precip.`}),
            ]),
            el("p", { "classList" : "fcast-content", "textContent" : `${period.detailedForecast}`})
        );

    }
}

// =========================================================================
// NWS API Helper Functions
// =========================================================================

// gets the nearest station given GPS coordinates
async function getStationData(lat, lon) {
    // use the NWS points API to get the nearest station
    let stationsURL = "";
    let stationData = {};

    await fetch(`https://api.weather.gov/points/${lat},${lon}`)
    .then(resp => resp.json())
    .then(data => {
        stationsURL = data.properties.observationStations;
    
        stationData.forcastURL = data.properties.forecast;
        stationData.hourlyURL  = data.properties.forecastHourly;
    });

    // take the first one from the list
    // as the nearest station
    await fetch(stationsURL)
    .then(resp => resp.json())
    .then(data => {
        stationData.name = data.observationStations[0].split("/").pop();
    });

    return stationData;
}

// returns the current conditions
async function getCurrentCond(station) {
    let rawData = {};

    await fetch(`https://api.weather.gov/stations/${station}/observations/latest`)
    .then(resp => resp.json())
    .then(data => {
        rawData = data.properties;
    });

    const currCond = {
        tempF     : CtoF(rawData.temperature.value),
        dewpointF : CtoF(rawData.dewpoint.value),
        windMph   : KphToMph(rawData.windSpeed.value),
        windDir   : DegToCardinal(rawData.windDirection.value),
        presMmhg  : PaToMmhg(rawData.barometricPressure.value),
        relHum    : Math.round(rawData.relativeHumidity.value * 10) / 10,

        condition : rawData.textDescription,
        name      : rawData.stationName,
        timestamp : rawData.timestamp,
    }

    return currCond;
}

// returns the 7 day forecast
async function fetchForecast(URL) {
   let forecast = [];

    await fetch(URL)
    .then(resp => resp.json())
    .then(data => {
        forecast = pairForecasts(data.properties.periods);  
    });

    return forecast;
}

function populateDailyForecast() {
    let fcastContainer = document.getElementById("forecast");

    // populate the forcast
    for (pair of state.forecast) {
        const id = `forcast${pair.day ? pair.day.name : pair.night.name}`;

        console.log(pair);

        let newCard = el("div", { "classList" : "card", "id" : id });
        fcastContainer.append(newCard);
        genForcastCard(id, pair, newCard);
    }

    return forecast;
}

// forcasts may be off cycle (e.g. starts with "Tonight")
function pairForecasts(periods) {
  const pairs = [];
  let currentPair = {};

  for (const p of periods) {
    if (!p.isDaytime) {
      if (currentPair.day) {
        currentPair.night = p;
        pairs.push(currentPair);
        currentPair = {};
      } else {
        pairs.push({ night: p });
      }
    } else {
      if (currentPair.day) {
        pairs.push(currentPair);
      }
      currentPair = { day: p };
    }
  }

  // Handle trailing unpaired day (e.g. last period is a day with no night)
  if (currentPair.day && !currentPair.night) {
    pairs.push(currentPair);
  }

  return pairs;
}

// helper functions to convert metric to US units
function isNight(timestamp) {
    const date = new Date(timestamp);
    return (date.getHours() < 6 || date.getHours() >= 20);
}

function CtoF(tempC) {
    return Math.round(tempC * (9/5) + 32);
}

function KphToMph(speedKph) {
    return Math.round(speedKph / 1.609);
}

function DegToCardinal(deg) {
    const dirs = [
        "N", "NNE", "NE", "ENE",
        "E", "ESE", "SE", "SSE",
        "S", "SSW", "SW", "WSW",
        "W", "WNW", "NW", "NNW"
    ];

    return dirs[Math.round(deg / 22.5) % 16];
}

function PaToMmhg(pressPa) {
     return (pressPa / 133.3);
}

function pickIconKey(forecastText, isNighttime) {
  const text = forecastText.toLowerCase();
  for (const entry of weatherIconMap) {
    for (const kw of entry.keywords) {
      if (text.includes(kw)) {
        let result = entry.iconKey;

        // make it a little moon for nighttime
        if (isNighttime && (result === "sun_icon.png" || result === "partly_cloudy_icon.png")) {
          return (`${result.split('.')[0]}_night.png`);
        } else {
          return result;
        }
      }
    }
  }
  return "unknown";  // fallback
}

const weatherIconMap = [
  {
    iconKey: "storm_icon.png",
    keywords: ["thunderstorm", "t-storm", "thunderstorms"]
  },
  //{
  //  iconKey: "hail",
  //  keywords: ["hail"]
  //},
  //{
  //  iconKey: "sleet",
  //  keywords: ["sleet", "ice pellets", "freezing rain", "freezing drizzle"]
  //},
  //{
  //  iconKey: "snow",
  //  keywords: ["snow", "snow showers", "blizzard", "flurries"]
  //},
  {
    iconKey: "rain_icon.png",
    keywords: ["rain", "showers", "drizzle", "heavy rain"]
  },
  //{
  //  iconKey: "fog",
  //  keywords: ["fog", "dense fog", "patchy fog", "areas fog"]
  //},
  //{
  //  iconKey: "mist",
  //  keywords: ["mist"]   // if you have a “mist” icon
  //},
  //{
  //  iconKey: "wind",
  //  keywords: ["wind", "blowing snow", "blowing dust", "blowing sand"]
  //},
  {
    iconKey: "cloud_icon.png",
    keywords: ["cloudy", "mostly cloudy", "overcast", "mostly overcast"]
  },
  {
    iconKey: "partly_cloudy_icon.png",
    keywords: ["partly cloudy", "partly sunny"]
  },
  {
    iconKey: "sun_icon.png",
    keywords: ["sunny", "clear", "mostly clear", "becoming sunny"]
  },
  //{
  //  iconKey: "haze",
  //  keywords: ["haze", "smoke", "patchy haze", "areas smoke"]
  //},
  //{
  //  iconKey: "frost",
  //  keywords: ["frost", "patchy frost"]
  //},
  
  // fallback (default)
  {
    iconKey: "unknown_icon.png",
    keywords: []
  }
];

// =========================================================================
// Setup function calls
// =========================================================================

fetchWeather();