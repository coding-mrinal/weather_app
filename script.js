const apiKey = "9955cf7c55c3c0d332bfe7865408c001";
const cityInput = document.getElementById('cityInput');
const weatherResult = document.getElementById('weatherResult');
const clearSearchBtn = document.getElementById('clearSearch');
const themeToggle = document.querySelector('.theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const recentSearchesSection = document.getElementById('recentSearches');
const recentList = document.getElementById('recentList');

document.addEventListener('DOMContentLoaded', () => {
    setBackgroundByTime();
    setupEventListeners();
    loadThemePreference();
    loadRecentSearches();

    setInterval(setBackgroundByTime, 30 * 60 * 1000);
});

function setupEventListeners() {
    clearSearchBtn.addEventListener('click', () => {
        cityInput.value = '';
        cityInput.focus();
    });
    
    themeToggle.addEventListener('click', toggleTheme);

    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            getWeather();
        }
    });
}
function setBackgroundByTime() {
    const hour = new Date().getHours();
    const body = document.body;
    body.classList.remove('day', 'night', 'sunset', 'sunrise');
    
    if (hour >= 5 && hour < 7) {
        body.classList.add('sunrise');
    } else if (hour >= 7 && hour < 17) {
        body.classList.add('day');
    } else if (hour >= 17 && hour < 20) {
        body.classList.add('sunset');
    } else {
        body.classList.add('night');
    }
}
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    themeToggle.classList.add('active');

    if (document.body.classList.contains('dark-theme')) {
        themeIcon.className = 'fas fa-sun';
        localStorage.setItem('theme', 'dark');
    } else {
        themeIcon.className = 'fas fa-moon';
        localStorage.setItem('theme', 'light');
    }
    setTimeout(() => {
        themeToggle.classList.remove('active');
    }, 500);
}

function loadThemePreference() {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        themeIcon.className = 'fas fa-sun';
    }
}
async function getWeather() {
    const city = cityInput.value.trim();
    
    if (!city) {
        showError("Please enter a city name");
        return;
    }
    
    showLoading();
    
    try {
        const currentResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`);
        
        if (!currentResponse.ok) {
            throw new Error(`City not found or API error: ${currentResponse.status}`);
        }
        
        const currentData = await currentResponse.json();

        const forecastResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`);
        const forecastData = forecastResponse.ok ? await forecastResponse.json() : null;
        
        displayWeather(currentData, forecastData);
        addToRecentSearches(city);
        
    } catch (error) {
        showError(error.message);
    }
}

function getCurrentLocationWeather() {
    if (navigator.geolocation) {
        showLoading();
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;

                    const currentResponse = await fetch(
                        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`
                    );
                    
                    if (!currentResponse.ok) {
                        throw new Error(`API error: ${currentResponse.status}`);
                    }
                    
                    const currentData = await currentResponse.json();

                    const forecastResponse = await fetch(
                        `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`
                    );
                    const forecastData = forecastResponse.ok ? await forecastResponse.json() : null;
                    
                    displayWeather(currentData, forecastData);
                    
                } catch (error) {
                    showError(error.message);
                }
            },
            (error) => {
                hideLoading();
                showError("Unable to retrieve your location. Please allow location access or search by city name.");
            }
        );
    } else {
        showError("Geolocation is not supported by your browser");
    }
}
function displayWeather(data, forecastData = null) {
    document.body.className = document.body.className.replace(/weather-condition-\w+/g, '');

    const weatherCondition = data.weather[0].main.toLowerCase();
    document.body.classList.add(`weather-condition-${weatherCondition}`);

    setBackgroundByTime();

    let weatherHTML = `
        <div class="weather-info">
            <h2>${data.name}, ${data.sys.country}</h2>
            <div class="weather-main">
                <img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png" alt="${data.weather[0].description}">
                <div class="temp">${Math.round(data.main.temp)}°C</div>
            </div>
            <div class="description">${data.weather[0].description}</div>
            <div class="weather-details">
                <p>Feels Like<strong>${Math.round(data.main.feels_like)}°C</strong></p>
                <p>Humidity<strong>${data.main.humidity}%</strong></p>
                <p>Wind<strong>${(data.wind.speed * 3.6).toFixed(1)} km/h</strong></p>
                <p>Pressure<strong>${data.main.pressure} hPa</strong></p>
                <p>Visibility<strong>${(data.visibility / 1000).toFixed(1)} km</strong></p>
            </div>
        </div>
    `;
    if (forecastData && forecastData.list) {
        weatherHTML += generateForecastHTML(forecastData);
    }
    
    weatherResult.innerHTML = weatherHTML;
    hideLoading();
    updateAnimatedBackground(weatherCondition);
    updateWeatherBackground(weatherCondition, data);
}
function generateForecastHTML(forecastData) {
    const dailyForecasts = processForecastData(forecastData.list);
    
    let forecastHTML = `
        <div class="forecast-section">
            <div class="forecast-title">
                <i class="fas fa-calendar-days"></i>
                5-Day Forecast
            </div>
            <div class="forecast-container">
    `;
    
    dailyForecasts.forEach(day => {
        forecastHTML += `
            <div class="forecast-item">
                <div class="forecast-day">${day.day}</div>
                <img src="https://openweathermap.org/img/wn/${day.icon}@2x.png" alt="${day.description}" class="forecast-icon">
                <div class="forecast-temp">${Math.round(day.temp)}°C</div>
                <div class="forecast-desc">${day.description}</div>
            </div>
        `;
    });
    
    forecastHTML += `
            </div>
        </div>
    `;
    
    return forecastHTML;
}

function processForecastData(forecastList) {
    const dailyData = {};
    const today = new Date().toDateString();
    
    forecastList.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateString = date.toDateString();

        if (dateString === today) return;
        
        if (!dailyData[dateString]) {
            dailyData[dateString] = {
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                temp: item.main.temp,
                icon: item.weather[0].icon,
                description: item.weather[0].description
            };
        }
    });
    return Object.values(dailyData).slice(0, 5);
}

function updateWeatherBackground(weatherCondition, data) {
    const body = document.body;
    if (data.weather[0].description.includes('heavy')) {
        body.classList.add('weather-intense');
    } else {
        body.classList.remove('weather-intense');
    }
    const temp = data.main.temp;
    body.classList.remove('temp-hot', 'temp-warm', 'temp-cool', 'temp-cold');
    
    if (temp > 30) {
        body.classList.add('temp-hot');
    } else if (temp > 20) {
        body.classList.add('temp-warm');
    } else if (temp > 10) {
        body.classList.add('temp-cool');
    } else {
        body.classList.add('temp-cold');
    }
}
function updateAnimatedBackground(weatherCondition) {
    const animatedBg = document.querySelector('.animated-bg') || createAnimatedBg();

    animatedBg.innerHTML = '';
    switch(weatherCondition) {
        case 'rain':
            for (let i = 0; i < 8; i++) {
                createParticle(animatedBg, 'rain');
            }
            break;
        case 'drizzle':
            for (let i = 0; i < 5; i++) {
                createParticle(animatedBg, 'rain');
            }
            break;
        case 'snow':
            for (let i = 0; i < 12; i++) {
                createParticle(animatedBg, 'snow');
            }
            break;
        case 'clear':
            createParticle(animatedBg, 'sun');
            for (let i = 0; i < 2; i++) {
                createParticle(animatedBg, 'cloud');
            }
            break;
        case 'clouds':
            for (let i = 0; i < 4; i++) {
                createParticle(animatedBg, 'cloud');
            }
            break;
        case 'thunderstorm':
            for (let i = 0; i < 3; i++) {
                createParticle(animatedBg, 'cloud');
            }
            for (let i = 0; i < 6; i++) {
                createParticle(animatedBg, 'rain');
            }
            break;
        case 'mist':
        case 'fog':
        case 'haze':
            for (let i = 0; i < 6; i++) {
                createParticle(animatedBg, 'mist');
            }
            break;
        default:
            for (let i = 0; i < 2; i++) {
                createParticle(animatedBg, 'cloud');
            }
            break;
    }
}

function createAnimatedBg() {
    const animatedBg = document.createElement('div');
    animatedBg.className = 'animated-bg';
    document.body.appendChild(animatedBg);
    return animatedBg;
}

function createParticle(container, type) {
    const particle = document.createElement('div');
    particle.className = `weather-particle ${type}`;

    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDelay = `-${Math.random() * 10}s`;

    switch(type) {
        case 'rain':
            particle.style.animationDuration = `${1 + Math.random() * 2}s`;
            particle.style.opacity = `${0.6 + Math.random() * 0.4}`;
            break;
        case 'snow':
            particle.style.animationDuration = `${8 + Math.random() * 12}s`;
            particle.style.opacity = `${0.7 + Math.random() * 0.3}`;
            // Randomize snow size
            const size = 4 + Math.random() * 8;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            break;
        case 'cloud':
            particle.style.animationDuration = `${20 + Math.random() * 20}s`;
            particle.style.opacity = `${0.3 + Math.random() * 0.4}`;
            // Randomize cloud size
            const cloudScale = 0.8 + Math.random() * 0.6;
            particle.style.transform = `scale(${cloudScale})`;
            break;
        case 'sun':
            particle.style.animationDuration = `${25 + Math.random() * 10}s`;
            particle.style.opacity = `${0.6 + Math.random() * 0.4}`;
            break;
        case 'mist':
            particle.style.animationDuration = `${15 + Math.random() * 15}s`;
            particle.style.opacity = `${0.2 + Math.random() * 0.3}`;
            particle.style.borderRadius = '50%';
            particle.style.background = 'rgba(255, 255, 255, 0.4)';
            particle.style.filter = 'blur(2px)';
            const mistSize = 20 + Math.random() * 40;
            particle.style.width = `${mistSize}px`;
            particle.style.height = `${mistSize}px`;
            break;
        default:
            particle.style.animationDuration = `${15 + Math.random() * 15}s`;
            break;
    }
    
    container.appendChild(particle);
}

function showLoading() {
    weatherResult.innerHTML = `
        <div class="loading">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
        </div>
    `;
}

function hideLoading() {
    const loading = weatherResult.querySelector('.loading');
    if (loading) {
        loading.remove();
    }
}

function showError(message) {
    let errorMessage = message;
    if (message.includes('404')) {
        errorMessage = "City not found. Please check the spelling and try again.";
    } else if (message.includes('401')) {
        errorMessage = "API key error. Please check your configuration.";
    } else if (message.includes('429')) {
        errorMessage = "Too many requests. Please wait a moment and try again.";
    } else if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        errorMessage = "Network error. Please check your internet connection and try again.";
    }
    
    weatherResult.innerHTML = `
        <div class="error">
            <i class="fas fa-exclamation-triangle"></i>
            <div class="error-content">
                <strong>Oops! Something went wrong</strong>
                <p>${errorMessage}</p>
                <button onclick="retryLastSearch()" class="retry-btn">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        </div>
    `;
}

let lastSearchType = null;
let lastSearchValue = null;

function retryLastSearch() {
    if (lastSearchType === 'city' && lastSearchValue) {
        cityInput.value = lastSearchValue;
        getWeather();
    } else if (lastSearchType === 'location') {
        getCurrentLocationWeather();
    }
}

function addToRecentSearches(city) {
    city = city.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    
    let recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];

    recentSearches = recentSearches.filter(item => item !== city);

    recentSearches.unshift(city);

    recentSearches = recentSearches.slice(0, 5);

    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));

    displayRecentSearches(recentSearches);
}

function loadRecentSearches() {
    const recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];
    displayRecentSearches(recentSearches);
}
function displayRecentSearches(searches) {
    if (searches.length === 0) {
        recentSearchesSection.style.display = 'none';
        return;
    }
    
    recentList.innerHTML = '';
    searches.forEach(city => {
        const item = document.createElement('div');
        item.className = 'recent-item';
        item.innerHTML = `<i class="fas fa-history"></i> ${city}`;
        
        item.addEventListener('click', () => {
            cityInput.value = city;
            getWeather();
        });
        
        recentList.appendChild(item);
    });
    
    recentSearchesSection.style.display = 'block';
}
function clearRecentSearches() {
    localStorage.removeItem('recentSearches');
    recentList.innerHTML = '';
    recentSearchesSection.style.display = 'none';
}
