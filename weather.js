// gets stuff from the NWS apis and populates the weather page
// Ben Staehle
// 10/14/25

// =========================================================================
// Weather Page Functions
// =========================================================================


function el(tag, props = {}, children = []) {
  const e = document.createElement(tag);
  Object.assign(e, props);
  for (const child of children) {
    e.append(child);
  }
  return e;
}

async function populateCurrentWeather() {
    let stationData = {};
    let locCard = document.getElementById("locationInfo");
    let currCard = document.getElementById("currentWeather");

    navigator.geolocation.getCurrentPosition(async (position) => {
        stationData = await getStationData(
          position.coords.latitude,
          position.coords.longitude
        );

        const currWeather = await getCurrentCond(stationData.name);

        currCard.innerText = "";
        locCard.innerText = "";

        // name
        locCard.append(
          el("h2", {className: "card-content", textContent: `${currWeather.name} (${stationData.name})`})
        );

        console.log(currWeather);

        // temperature
        currCard.append(
          el("h1", {className: "temp", textContent: `${currWeather.tempF}°F`}),
          el("img", {src : `images/weather/${pickIconKey(currWeather.condition)}`}),
          el("h2", {className: "main-data", textContent: `${currWeather.condition}`, style: "color: #FFC966;"}),
          el("hr"),
          el("h3", {className: "aux-data", textContent: `Humidity: ${currWeather.relHum}%`}),
          el("h3", {className: "aux-data", textContent: `Dew Point: ${currWeather.dewpointF}°F`}),
          el("h3", {className: "aux-data", textContent: `Wind: ${currWeather.windDir} ${currWeather.windMph}MPH`}),
        );
    });

    currCard.innerText = "Loading...";
    locCard.innerText = "Loading...";
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
    }

    return currCond;
}

// returns the 7 day forecast
async function getDailyForecast(URL) {
    let forecast = [];

    await fetch(URL)
    .then(resp => resp.json())
    .then(data => {
        forecast = pairForecasts(data.properties.periods);  
    });

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

function pickIconKey(forecastText) {
  const text = forecastText.toLowerCase();
  for (const entry of weatherIconMap) {
    for (const kw of entry.keywords) {
      if (text.includes(kw)) {
        return entry.iconKey;
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

populateCurrentWeather();

// toggle the background
/*const hour = new Date().getHours();
if (hour >= 6 && hour < 18) {
  document.body.classList.remove('night');
} else {
  document.body.classList.add('night');
}
  */

document.body.classList.add('night');