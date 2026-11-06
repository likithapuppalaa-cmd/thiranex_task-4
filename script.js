
// ======================================
// SKyCAST WEATHER DASHBOARD
// Open-Meteo REST API
// ======================================

const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");

const weatherSection = document.getElementById("weatherSection");
const loading = document.getElementById("loading");
const message = document.getElementById("message");

// Weather condition descriptions and icons
function getWeatherInfo(code) {
    const conditions = {
        0: ["Clear Sky", "☀️"],
        1: ["Mainly Clear", "🌤️"],
        2: ["Partly Cloudy", "⛅"],
        3: ["Overcast", "☁️"],
        45: ["Foggy", "🌫️"],
        48: ["Foggy", "🌫️"],
        51: ["Light Drizzle", "🌦️"],
        53: ["Drizzle", "🌦️"],
        55: ["Heavy Drizzle", "🌧️"],
        61: ["Light Rain", "🌧️"],
        63: ["Moderate Rain", "🌧️"],
        65: ["Heavy Rain", "🌧️"],
        71: ["Light Snow", "❄️"],
        73: ["Snow", "❄️"],
        75: ["Heavy Snow", "🌨️"],
        80: ["Rain Showers", "🌦️"],
        81: ["Rain Showers", "🌧️"],
        82: ["Heavy Rain Showers", "⛈️"],
        95: ["Thunderstorm", "⛈️"],
        96: ["Thunderstorm with Hail", "⛈️"],
        99: ["Heavy Thunderstorm", "⛈️"]
    };

    return conditions[code] || ["Unknown Conditions", "🌡️"];
}

// Format date without changing the API's calendar date
function formatDate(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);

    return new Date(year, month - 1, day)
        .toLocaleDateString("en-US", {
            weekday: "short",
            day: "numeric",
            month: "short"
        });
}

// ======================================
// FETCH WEATHER DATA BY CITY
// ======================================

async function getWeather(city) {

    loading.classList.remove("hidden");
    weatherSection.classList.add("hidden");
    message.textContent = "";
    searchBtn.disabled = true;

    try {

        // STEP 1: Find city coordinates
        const geoURL = new URL(
            "https://geocoding-api.open-meteo.com/v1/search"
        );

        geoURL.search = new URLSearchParams({
            name: city,
            count: 5,
            language: "en",
            format: "json"
        });

        const geoResponse = await fetch(geoURL);

        if (!geoResponse.ok) {
            throw new Error("Unable to connect to location service.");
        }

        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error("City not found. Please enter a valid city.");
        }

        // Select the first matching city
        const location = geoData.results[0];

        const latitude = location.latitude;
        const longitude = location.longitude;

        // STEP 2: Request current and daily weather
        const weatherURL = new URL(
            "https://api.open-meteo.com/v1/forecast"
        );

        weatherURL.search = new URLSearchParams({
            latitude: latitude,
            longitude: longitude,

            current: [
                "temperature_2m",
                "relative_humidity_2m",
                "apparent_temperature",
                "is_day",
                "precipitation",
                "weather_code",
                "wind_speed_10m"
            ].join(","),

            daily: [
                "weather_code",
                "temperature_2m_max",
                "temperature_2m_min"
            ].join(","),

            timezone: "auto",
            forecast_days: 5
        });

        const weatherResponse = await fetch(weatherURL);

        if (!weatherResponse.ok) {
            throw new Error("Unable to fetch weather information.");
        }

        const weatherData = await weatherResponse.json();

        if (!weatherData.current || !weatherData.daily) {
            throw new Error("Weather information is unavailable.");
        }

        // STEP 3: Display weather information
        displayWeather(location, weatherData);

    } catch (error) {

        message.textContent = error.message;

    } finally {

        // STEP 4: Stop loading animation
        loading.classList.add("hidden");
        searchBtn.disabled = false;
    }
}

// ======================================
// DISPLAY CURRENT WEATHER
// ======================================

function displayWeather(location, data) {

    const current = data.current;
    const daily = data.daily;

    const [description, icon] =
        getWeatherInfo(current.weather_code);

    // Location details
    document.getElementById("cityName").textContent =
        location.name;

    document.getElementById("countryName").textContent =
        [location.admin1, location.country]
            .filter(Boolean)
            .join(", ");

    // Temperature
    document.getElementById("temperature").textContent =
        Math.round(current.temperature_2m);

    document.getElementById("feelsLike").textContent =
        Math.round(current.apparent_temperature);

    // Weather condition
    document.getElementById("weatherDescription").textContent =
        description;

    document.getElementById("weatherIcon").textContent = icon;

    // Other weather metrics
    document.getElementById("humidity").textContent =
        current.relative_humidity_2m + "%";

    document.getElementById("windSpeed").textContent =
        current.wind_speed_10m + " km/h";

    document.getElementById("precipitation").textContent =
        current.precipitation + " mm";

    // Minimum and maximum temperatures
    const minTemp = Math.round(daily.temperature_2m_min[0]);
    const maxTemp = Math.round(daily.temperature_2m_max[0]);

    document.getElementById("tempRange").textContent =
        `${minTemp}° / ${maxTemp}°C`;

    // API provides the local time of the selected city
    const [datePart, timePart] = current.time.split("T");

    document.getElementById("currentDate").textContent =
        formatDate(datePart);

    document.getElementById("updatedTime").textContent =
        "Local time: " + timePart;

    // Display forecast
    displayForecast(daily);

    // Show dashboard
    weatherSection.classList.remove("hidden");
}

// ======================================
// DISPLAY FIVE-DAY FORECAST
// ======================================

function displayForecast(daily) {

    const forecastGrid = document.getElementById("forecastGrid");

    forecastGrid.innerHTML = "";

    for (let i = 0; i < daily.time.length; i++) {

        const date = daily.time[i];

        const maxTemp = Math.round(
            daily.temperature_2m_max[i]
        );

        const minTemp = Math.round(
            daily.temperature_2m_min[i]
        );

        const [description, icon] =
            getWeatherInfo(daily.weather_code[i]);

        const card = document.createElement("article");

        card.className = "forecast-card";

        card.innerHTML = `
            <p>${i === 0 ? "Today" : formatDate(date)}</p>
            <div class="icon">${icon}</div>
            <h4>${maxTemp}°C</h4>
            <p>${minTemp}°C</p>
            <p>${description}</p>
        `;

        forecastGrid.appendChild(card);
    }
}

// ======================================
// SEARCH EVENT
// ======================================

searchForm.addEventListener("submit", function(event) {

    event.preventDefault();

    const city = cityInput.value.trim();

    if (!city) {
        message.textContent = "Please enter a city name.";
        return;
    }

    getWeather(city);
});

// Load default city when website opens
getWeather("Hyderabad");
