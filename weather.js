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
    astroData : null,
};

async function fetchWeather() {
  const [current, forecast, astro] = await Promise.all([
    getCurrentCond(state.stationData.name),
    fetchForecast(state.stationData.forecastURL), 
    getAstroData(new Date().toISOString().split('T')[0], state.location.lat, state.location.lon)
  ]);

  state.currentWeather = current;
  state.forecast = forecast;
  state.astroData = astro;

  // actually do the population
  populateCurrentWeather();
  populateDailyForecast();
  populateCurrentDetails();


  // add the event listener
  document.getElementById("astroForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const dateInput = document.getElementById("smdate"); 

    // re-fetch the astro data
    const newData = await getAstroData(dateInput.value, state.location.lat, state.location.lon);
    state.astroData = newData;

    // re-update the display
    updateAstro(dateInput.value);
  });

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

    currCard.innerHTML = "";

    //remove the previous location
    locCard.querySelectorAll(".card-content").forEach(el => el.remove());

    // name
    locCard.append(
      el("h2", {className: "card-content", textContent: `${currWeather.name} (${stationData.name})`})
    );

    // temperature
    currCard.append(
      el("p", {className: "card-title", "textContent" : "Current Weather"}),
      el("h1", {className: "temp", textContent: `${currWeather.tempF}°F`}),
      el("img", {src : `images/weather/${pickIconKey(currWeather.condition, isNight(currWeather.timestamp))}`}),
      el("h2", {className: "main-data", textContent: `${currWeather.condition}`, style: "color: #FFC966;"}),
      el("hr"),
      el("h3", {className: "aux-data", textContent: `Humidity: ${currWeather.relHum}%`}),
      el("h3", {className: "aux-data", textContent: `Dew Point: ${currWeather.dewpointF}°F`}),
      el("h3", {className: "aux-data", textContent: `Wind: ${currWeather.windDir} ${currWeather.windMph != 0 ? (currWeather.windMph + " MPH") : "Calm"}`}),
      el("h3", {className: "aux-data", textContent: `Press: ${currWeather.pressInhg} inHg`}),
    );
}

function populateCurrentDetails(forecast) {
    // first populate the 'details' tab
    let detailTab = document.getElementById("details");
    let aqitab = document.getElementById("aqitab");

    const currCond = state.currentWeather;

    detailTab.innerHTML = "";
    aqitab.innerHTML = "";

    const firstEntry = state.forecast[0];
    const firstPeriod =
        firstEntry.day
            ? firstEntry.day
            : firstEntry.night;

    detailTab.append(
        el("div", { "id" : "detailsCol" }, [
            el("p", { "classList": "card-content", "textContent": `${firstPeriod.detailedForecast}`}),
            el("hr"),  
        ]),
    );

    aqitab.append(
        el("div", { "id" : "aqiCol"}, [
            el("h2", { "classList" : "card-title", "textContent" : "Air Quality: " }),
            el("h2", { "classList" : "aux-data", "textContent" : `AQI:`, "style" : `display: inline-block;`}),
            el("h2", { "classList" : "aux-data", "textContent" : `${currCond.aqi[0].AQI} - ${currCond.aqi[0].Category.Name}`, "style" : `display: inline-block; color: ${aqiColorMap[currCond.aqi[0].Category.Number]};`}),
            el("h2", { "classList": "aux-data", "textContent": `${currCond.aqi[0].ParameterName}: ${currCond.aqi[0].AQI}` }),
            el("h2", { "classList": "aux-data", "textContent": `${currCond.aqi[1].ParameterName}: ${currCond.aqi[1].AQI}` }),
            el("img", {"src" : `images/weather/aqi_${currCond.aqi[0].Category.Number}.png`}),
            el("h2", { "classList": "aux-data", "textContent": `Visibility : ${state.currentWeather.vis} Mi` }),
        ]),
    );

    // populate the third 'sun and moon' tab
    updateAstro(new Date().toISOString().split('T')[0]);
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

function updateAstro(date) {
    // update the sun and moon tab
    const data = state.astroData;
    const smcard = document.getElementById("sunmoon");

    smcard.innerHTML = "";

    console.log(data);

    smcard.append(
        el("form", {"id" : "astroForm"}, [
            el("label", {"for" : "smdate", "classList" : "card-title", "textContent" : "Select a Date"}), 
            el("input", {"type" : "date", "id" : "smdate"}),
            el("button", {"type" : "sumbit", "classList" : "card-button", "innerText" : "Update"}),
        ]),
     
        el("hr"),

        el("h2", {"classList" : "card-title", "textContent" : "Sun"}),
        el("img", {"classList" : "fcast-img", "src" : "images/weather/sun-rise-set.png"}),
        el("p", {"classList" : "aux-data", "textContent" : `Sunrise: ${utcToLocal(data.sun.rise)} | Sunset: ${utcToLocal(data.sun.set)}`}),
        el("hr"), 
        el("h2", {"classList" : "card-title", "textContent" : "Moon"}),
        el("img", {"classList" : "fcast-img", "src" : `images/weather/${moonPhaseImages[data.moon.phase] || "quarter.png"}`}),
        el("p", {"classList" : "aux-data", "textContent" : `${data.moon.phase} | ${data.moon.fracillum} Illuminated`}),
        el("p", {"classList" : "aux-data", "textContent" : `Moonrise: ${utcToLocal(data.moon.rise)} | Moonset: ${utcToLocal(data.moon.set)}`}),
        el("h2", {"classList" : "aux-data", "textContent" : `Next Phase: ${data.moon.next_phase.name} on ${data.moon.next_phase.month}/${data.moon.next_phase.day}`}),
    );
}

// =========================================================================
// NWS API Helper Functions
// =========================================================================

function utcToLocal(utcTimeStr) {
  if (!utcTimeStr) return null;

  const [hours, minutes] = utcTimeStr.split(':').map(Number);
  const now = new Date();
  const utcDate = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    hours, minutes
  ));

  return utcDate.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

async function getData(url) {
  try {
    const response = await fetch(url);  // fetch returns a Response object

    // check if the request succeeded
    if (!response.ok) {
        console.log(url);
        console.log(response);
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    // unpack the JSON data
    const data = await response.json();  // returns a JS object
    return data;

  } catch (err) {
    console.error("Fetch error:", err);
  }
}

async function getCoords(cityName) {
  // use the NWS points API (through benitobox.net proxy)
    return getData(`https://weather.benitobox.net/geocode?q=${cityName}`);
}

// gets the nearest station given GPS coordinates
function getStationData(lat, lon) {
    // use the NWS points API (through benitobox.net proxy)
    return getData(`https://weather.benitobox.net/station?lat=${lat}&lon=${lon}`);
}

// get the sun and moon data
function getAstroData(date, lat, lon) {
    // use the benitobox weather api
    return getData(`https://weather.benitobox.net/astro?lat=${lat}&lon=${lon}&date=${date}`);
}

// returns the current conditions
async function getCurrentCond(station) {
    let rawData = {};
    let aqiData = {};

    await fetch(`https://api.weather.gov/stations/${station}/observations/latest`)
    .then(resp => resp.json())
    .then(data => {
        rawData = data.properties;
    });

    // get the AQI
    await fetch(`https://weather.benitobox.net/aqi?lat=${state.location.lat}&lon=${state.location.lon}`)
    .then(resp => resp.json())
    .then(data => {
        aqiData = data;
    });

    const currCond = {
        tempF     : CtoF(rawData.temperature.value),
        dewpointF : CtoF(rawData.dewpoint.value),
        windMph   : KphToMph(rawData.windSpeed.value),
        windDir   : DegToCardinal(rawData.windDirection.value),
        pressInhg : PaToInhg(rawData.barometricPressure.value).toFixed(2),
        relHum    : Math.round(rawData.relativeHumidity.value * 10) / 10,
        vis       : MtoMi(rawData.visibility.value),

        aqi       : aqiData,

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

    fcastContainer.innerHTML = "";

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

function MtoMi(m) {
    return Math.round(m / 1609);
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

function PaToInhg(pressPa) {
     return (pressPa / 3386);
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
  return "missing.png";  // fallback
}

const weatherIconMap = [
  {
    iconKey: "storm_icon.png",
    keywords: ["thunderstorm", "t-storm", "thunderstorms"]
  },
  {
    iconKey: "hail_icon.png",
    keywords: ["hail"]
  },
  {
    iconKey: "frost_icon.png",
    keywords: ["frost", "patchy frost", "widespread frost", "cold"]
  },
  {
    iconKey: "sleet_icon.png",
    keywords: ["sleet", "ice pellets", "freezing rain", "freezing drizzle", "freezing spray"]
  },
  {
    iconKey: "light_snow_icon.png",
    keywords: ["flurries", "light snow"]
  },
  {
    iconKey: "snow_icon.png",
    keywords: ["snow", "snow showers", "blizzard", "blowing snow"]
  },
  {
    iconKey: "light_rain_icon.png",
    keywords: ["light rain", "drizzle"]
  },
  {
    iconKey: "rain_icon.png",
    keywords: ["rain", "showers", "heavy rain"]
  },
  {
    iconKey: "fog_icon.png",
    keywords: ["fog", "dense fog", "patchy fog", "areas fog", "haze", "smoke", "patchy haze", "areas smoke", "mist"]
  },
  {
    iconKey: "wind_icon.png",
    keywords: ["wind", "blowing dust", "blowing sand"]
  },
  {
    iconKey: "cloud_icon.png",
    keywords: ["cloudy", "mostly cloudy", "overcast", "mostly overcast"]
  },
  {
    iconKey: "partly_sunny_icon.png",
    keywords: ["partly cloudy", "partly sunny"]
  },
  {
    iconKey: "sun_icon.png",
    keywords: ["sunny", "clear", "mostly clear", "becoming sunny"]
  },
  // fallback (default)
  {
    iconKey: "missing",
    keywords: []
  }
];

const moonPhaseImages = {
  "New Moon": "new_moon.png",
  "Waxing Crescent": "quarter.png",
  "First Quarter": "quarter.png",
  "Waxing Gibbous": "gibbous.png",
  "Full Moon": "full_moon.png",
  "Waning Gibbous": "gibbous.png",
  "Last Quarter": "quarter.png",
  "Waning Crescent": "quarter.png"
};

const aqiColorMap = [
    "#000000", // falback color (black)
    "#20AD00", // green - good
    "#FFD000", // yellow - moderate
    "#FF9D00", // orange - USG
    "#FF3700", // red - unhealthy
    "#FB00FF", // purple - very unhealthy
    "#910000", // deep red - hazardous
];

// =========================================================================
// Setup function calls
// =========================================================================

let lastClickedButton = null;

// capture which submit button was clicked
document.getElementById("defaultCityForm").addEventListener("click", (e) => {
  if (e.target.type === "submit") {
    lastClickedButton = e.target.value;
  }
});

document.getElementById("defaultCityForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const city = document.getElementById("cityInput").value.trim();

  try {
    const coords = await getCoords(city);
    if (!coords || !coords[0]) throw new Error("No coordinates found");

    state.location = { lat: coords[0].lat, lon: coords[0].lon };
    state.stationData = await getStationData(coords[0].lat, coords[0].lon);

    if (lastClickedButton === "set-default") {
      localStorage.setItem("stationData", JSON.stringify(state.stationData));
      localStorage.setItem("location", JSON.stringify(state.location));
    }

    fetchWeather();

    // clear value after search
    document.getElementById("cityInput").value = "";

  } catch (err) {
    console.error("Error setting default city:", err);
    alert("Could not load weather for that city.");
  }

  lastClickedButton = null; // reset
});

window.addEventListener("DOMContentLoaded", () => {
  // handle location data storage
  try {
    const cachedStation = localStorage.getItem("stationData");
    const cachedLocation = localStorage.getItem("location");

    if (cachedStation && cachedLocation) {
      state.stationData = JSON.parse(cachedStation);
      state.location = JSON.parse(cachedLocation);

      fetchWeather();

    } else {
      const locCard = document.getElementById("locationInfo");
      locCard.append(
        el("h2", { className: "card-content", textContent: "You have not selected a default city, please enter one..." })
      );
    }
  } catch (err) {
    console.error(err);
    localStorage.removeItem("stationData");
    localStorage.removeItem("location");
  }
});

document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    const target = button.dataset.tab;

    // deactivate all
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

    // activate selected
    button.classList.add('active');
    document.getElementById(target).classList.add('active');
  });
});





