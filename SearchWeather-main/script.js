// API configuration
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';
const GEO_API_URL = 'https://geocoding-api.open-meteo.com/v1/search';

// DOM elements
const welcomeScreen = document.getElementById('welcome-screen');
const mainContent = document.getElementById('main-content');
const welcomeLocationButton = document.getElementById('welcome-location-button');
const welcomeSearchButton = document.getElementById('welcome-search-button');
const backButton = document.getElementById('back-button');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const locationButton = document.getElementById('location-button');
const searchSuggestions = document.getElementById('search-suggestions');
const inputWrapper = document.querySelector('.input-wrapper');

// Weather display elements
let cityElement, dateElement, tempElement, weatherIcon, descriptionElement,
    humidityElement, windElement, feelsLikeElement, pressureElement,
    sunriseElement, sunsetElement, uvIndexElement, forecastCardsContainer;

// Initialize DOM elements after the document is loaded
function initializeElements() {
    const elements = {
        city: document.getElementById('city'),
        date: document.getElementById('date'),
        temp: document.getElementById('temp'),
        weatherIcon: document.getElementById('weather-icon'),
        description: document.getElementById('description'),
        humidity: document.getElementById('humidity'),
        wind: document.getElementById('wind'),
        feelsLike: document.getElementById('feels-like'),
        pressure: document.getElementById('pressure'),
        sunrise: document.getElementById('sunrise'),
        sunset: document.getElementById('sunset'),
        uvIndex: document.getElementById('uv-index'),
        forecastCards: document.getElementById('forecast-cards')
    };

    // Verify all elements exist
    const missingElements = Object.entries(elements)
        .filter(([key, element]) => !element)
        .map(([key]) => key);

    if (missingElements.length > 0) {
        throw new Error(`Missing DOM elements: ${missingElements.join(', ')}`);
    }

    // Assign elements to global variables
    cityElement = elements.city;
    dateElement = elements.date;
    tempElement = elements.temp;
    weatherIcon = elements.weatherIcon;
    descriptionElement = elements.description;
    humidityElement = elements.humidity;
    windElement = elements.wind;
    feelsLikeElement = elements.feelsLike;
    pressureElement = elements.pressure;
    sunriseElement = elements.sunrise;
    sunsetElement = elements.sunset;
    uvIndexElement = elements.uvIndex;
    forecastCardsContainer = elements.forecastCards;
}

// Loading state elements
const weatherIconWrapper = document.querySelector('.weather-icon-wrapper');

// Create loader elements
function createLoaders() {
    // Search loader
    const searchLoader = document.createElement('div');
    searchLoader.className = 'search-loader';
    inputWrapper.appendChild(searchLoader);

    // Button loader
    const buttonLoader = document.createElement('div');
    buttonLoader.className = 'button-loader';
    locationButton.appendChild(buttonLoader);

    // Icon loader
    const iconLoader = document.createElement('div');
    iconLoader.className = 'icon-loader';
    weatherIconWrapper.appendChild(iconLoader);
}

// Loading state management
function showLoadingState() {
    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'spinner-icon';
    const searchIcon = searchButton.querySelector('i');
    if (searchIcon) {
        searchIcon.style.display = 'none';
        searchButton.appendChild(loadingSpinner);
    }
    searchButton.disabled = true;
}

function hideLoadingState() {
    const spinner = searchButton.querySelector('.spinner-icon');
    const searchIcon = searchButton.querySelector('i');
    if (spinner) {
        spinner.remove();
    }
    if (searchIcon) {
        searchIcon.style.display = 'inline-block';
    }
    searchButton.disabled = false;
}

// Weather code mappings with more detailed descriptions
const weatherCodes = {
    0: { description: 'Clear skies', icon: '01d' },
    1: { description: 'Mostly clear', icon: '02d' },
    2: { description: 'Partly cloudy', icon: '03d' },
    3: { description: 'Overcast', icon: '04d' },
    45: { description: 'Foggy conditions', icon: '50d' },
    48: { description: 'Depositing rime fog', icon: '50d' },
    51: { description: 'Light drizzle', icon: '09d' },
    53: { description: 'Moderate drizzle', icon: '09d' },
    55: { description: 'Dense drizzle', icon: '09d' },
    61: { description: 'Light rain', icon: '10d' },
    63: { description: 'Moderate rain', icon: '10d' },
    65: { description: 'Heavy rain', icon: '10d' },
    66: { description: 'Light freezing rain', icon: '13d' },
    67: { description: 'Heavy freezing rain', icon: '13d' },
    71: { description: 'Light snow', icon: '13d' },
    73: { description: 'Moderate snow', icon: '13d' },
    75: { description: 'Heavy snow', icon: '13d' },
    77: { description: 'Snow grains', icon: '13d' },
    80: { description: 'Light rain showers', icon: '09d' },
    81: { description: 'Moderate rain showers', icon: '09d' },
    82: { description: 'Violent rain showers', icon: '09d' },
    85: { description: 'Light snow showers', icon: '13d' },
    86: { description: 'Heavy snow showers', icon: '13d' },
    95: { description: 'Thunderstorm', icon: '11d' },
    96: { description: 'Thunderstorm with hail', icon: '11d' },
    99: { description: 'Severe thunderstorm', icon: '11d' }
};

// Debounce function for search suggestions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Get city suggestions
async function getCitySuggestions(query) {
    try {
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
        if (!response.ok) {
            throw new Error('Failed to fetch suggestions');
        }
        const data = await response.json();
        
        searchSuggestions.innerHTML = '';
        
        if (data.results && data.results.length > 0) {
            data.results.forEach(result => {
                const suggestion = document.createElement('div');
                suggestion.className = 'suggestion-item';
                const cityName = result.name;
                const country = result.country;
                const admin = result.admin1 || '';
                
                suggestion.innerHTML = `
                    <i class="fas fa-map-marker-alt"></i>
                    <div class="suggestion-text">
                        <div class="suggestion-city">${cityName}</div>
                        <div class="suggestion-region">${admin}${admin && country ? ', ' : ''}${country}</div>
                    </div>
                `;
                
                suggestion.addEventListener('click', async () => {
                    searchInput.value = cityName;
                    searchSuggestions.innerHTML = '';
                    searchSuggestions.classList.remove('active');
                    showLoadingState();
                    try {
                        await getCityCoordinates(cityName);
                    } finally {
                        hideLoadingState();
                    }
                });
                
                searchSuggestions.appendChild(suggestion);
            });
            
            searchSuggestions.classList.add('active');
        } else {
            searchSuggestions.classList.remove('active');
        }
    } catch (error) {
        console.error('Error getting suggestions:', error);
        searchSuggestions.classList.remove('active');
    }
}

// Add debounced input handler for search suggestions
const debouncedGetSuggestions = debounce(async (query) => {
    if (query.length >= 3) {
        await getCitySuggestions(query);
    } else {
        searchSuggestions.innerHTML = '';
        searchSuggestions.classList.remove('active');
    }
}, 300);

// Add input event listener for search suggestions
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    debouncedGetSuggestions(query);
});

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
        searchSuggestions.classList.remove('active');
    }
});

// Event listeners
searchButton.addEventListener('click', async () => {
    const city = searchInput.value.trim();
    if (city) {
        showLoadingState();
        try {
            await getCityCoordinates(city);
            searchSuggestions.classList.remove('active');
        } finally {
            hideLoadingState();
        }
    }
});

searchInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const city = searchInput.value.trim();
        if (city) {
            showLoadingState();
            try {
                await getCityCoordinates(city);
                searchSuggestions.classList.remove('active');
            } finally {
                hideLoadingState();
            }
        }
    }
});

locationButton.addEventListener('click', getCurrentLocation);

// Get coordinates for a city name
async function getCityCoordinates(city) {
    inputWrapper.classList.add('loading');
    try {
        const response = await fetch(
            `${GEO_API_URL}?name=${city}&count=1&language=en`
        );
        
        if (!response.ok) {
            throw new Error('City not found');
        }

        const data = await response.json();
        if (!data.results || data.results.length === 0) {
            throw new Error('City not found');
        }

        const location = data.results[0];
        getWeatherData(location.latitude, location.longitude, location.name, location.country);
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        inputWrapper.classList.remove('loading');
    }
}

// Fetch weather data
async function getWeatherData(lat, lon, cityName, countryName) {
    try {
        const response = await fetch(`${WEATHER_API_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,pressure_msl,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,weathercode&timezone=auto&forecast_days=8`);
        
        if (!response.ok) {
            throw new Error('Weather data not available');
        }

        const data = await response.json();
        updateWeatherUI(data, cityName, countryName);
    } catch (error) {
        console.error('Error fetching weather data:', error);
        alert('Failed to fetch weather data. Please try again.');
    }
}

// Update UI with weather data
function updateWeatherUI(data, cityName, countryName) {
    try {
        // Add fade-out effect before updating
        document.querySelector('.weather-card').style.opacity = '0';
        document.querySelector('.forecast-container').style.opacity = '0';

        setTimeout(() => {
            // Update location and date
            cityElement.textContent = `${cityName}, ${countryName}`;
            dateElement.textContent = new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Update current weather with animation
            const currentTemp = Math.round(data.current.temperature_2m);
            animateNumber(tempElement, currentTemp);
            
            // Get weather code from the first day since it's not available in current
            const currentWeatherCode = data.daily.weathercode[0];
            const weatherInfo = weatherCodes[currentWeatherCode];

            weatherIcon.src = `https://openweathermap.org/img/wn/${weatherInfo.icon}@2x.png`;
            descriptionElement.textContent = weatherInfo.description;

            // Animate additional info updates
            animateNumber(humidityElement, Math.round(data.current.relative_humidity_2m));
            animateNumber(windElement, Math.round(data.current.wind_speed_10m));
            animateNumber(feelsLikeElement, Math.round(data.current.apparent_temperature));
            animateNumber(pressureElement, Math.round(data.current.pressure_msl));

            // Update sun info with formatted time
            const formatTime = (timeString) => {
                return new Date(timeString).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
            };

            sunriseElement.textContent = formatTime(data.daily.sunrise[0]);
            sunsetElement.textContent = formatTime(data.daily.sunset[0]);
            animateNumber(uvIndexElement, Math.round(data.daily.uv_index_max[0]));

            // Update forecast
            updateForecast(data.daily);

            // Fade elements back in
            document.querySelector('.weather-card').style.opacity = '1';
            document.querySelector('.forecast-container').style.opacity = '1';
        }, 300);

    } catch (error) {
        console.error('Error updating UI:', error);
    }
}

// Animate number changes
function animateNumber(element, targetNumber, unit = '') {
    const startNumber = parseInt(element.textContent) || 0;
    const duration = 1000; // 1 second
    const steps = 60;
    const stepValue = (targetNumber - startNumber) / steps;
    let currentStep = 0;

    const animation = setInterval(() => {
        currentStep++;
        const currentNumber = Math.round(startNumber + (stepValue * currentStep));
        element.textContent = `${currentNumber}${unit}`;

        if (currentStep >= steps) {
            clearInterval(animation);
            element.textContent = `${targetNumber}${unit}`;
        }
    }, duration / steps);
}

// Update forecast cards with staggered animation
function updateForecast(dailyData) {
    try {
        forecastCardsContainer.innerHTML = '';

        // Create forecast cards for next 7 days with staggered animation
        for (let i = 1; i <= 7; i++) {
            const date = new Date(dailyData.time[i]).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });

            const weatherInfo = weatherCodes[dailyData.weathercode[i]];
            const maxTemp = Math.round(dailyData.temperature_2m_max[i]);
            const minTemp = Math.round(dailyData.temperature_2m_min[i]);

            const forecastCard = document.createElement('div');
            forecastCard.className = 'forecast-card';
            forecastCard.style.opacity = '0';
            forecastCard.style.transform = 'translateX(20px)';
            forecastCard.innerHTML = `
                <div class="date">${date}</div>
                <img src="https://openweathermap.org/img/wn/${weatherInfo.icon}@2x.png" alt="${weatherInfo.description}">
                <div class="temp">${maxTemp}°C / ${minTemp}°C</div>
                <div class="description">${weatherInfo.description}</div>
            `;

            forecastCardsContainer.appendChild(forecastCard);

            // Staggered animation
            setTimeout(() => {
                forecastCard.style.opacity = '1';
                forecastCard.style.transform = 'translateX(0)';
            }, i * 100);
        }
    } catch (error) {
        console.error('Error updating forecast:', error);
    }
}

// Welcome screen handlers
function showWelcomeScreen() {
    welcomeScreen.style.display = 'flex';
    mainContent.style.display = 'none';
    // Clear the search input and suggestions
    searchInput.value = '';
    searchSuggestions.innerHTML = '';
    searchSuggestions.classList.remove('active');
    // Remove the stored preference
    localStorage.removeItem('hasUsedApp');
    // Reset welcome screen visibility
    setTimeout(() => {
        welcomeScreen.classList.remove('hidden');
    }, 10);
}

function hideWelcomeScreen() {
    welcomeScreen.classList.add('hidden');
    mainContent.style.display = 'block';
    // Add a small delay to ensure smooth transition
    setTimeout(() => {
        welcomeScreen.style.display = 'none';
    }, 300);
}

// Back button handler
backButton.addEventListener('click', showWelcomeScreen);

welcomeLocationButton.addEventListener('click', () => {
    hideWelcomeScreen();
    getCurrentLocation();
});

welcomeSearchButton.addEventListener('click', () => {
    hideWelcomeScreen();
    searchInput.focus();
});

// Get current location
function getCurrentLocation() {
    if (navigator.geolocation) {
        locationButton.classList.add('loading');
        navigator.geolocation.getCurrentPosition(
            async position => {
                const { latitude, longitude } = position.coords;
                try {
                    // Get city name from coordinates using reverse geocoding
                    const response = await fetch(
                        `${GEO_API_URL}?name=${latitude},${longitude}&count=1&language=en`
                    );
                    const data = await response.json();
                    const cityName = data.results?.[0]?.name || 'Unknown Location';
                    const countryName = data.results?.[0]?.country || '';
                    
                    await getWeatherData(latitude, longitude, cityName, countryName);
                    storeAppUsage(); // Store that user has used the app
                } catch (error) {
                    console.error('Error getting location name:', error);
                    await getWeatherData(latitude, longitude, 'Current Location', '');
                    storeAppUsage(); // Store that user has used the app
                } finally {
                    locationButton.classList.remove('loading');
                }
            },
            error => {
                alert('Error getting location: ' + error.message);
                locationButton.classList.remove('loading');
            }
        );
    } else {
        alert('Geolocation is not supported by your browser');
    }
}

// Store that user has used the app
function storeAppUsage() {
    localStorage.setItem('hasUsedApp', 'true');
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Initialize weather display elements
        initializeElements();
        
        // Create loader elements
        createLoaders();
        
        // Check if user has previously used the app
        const hasUsedApp = localStorage.getItem('hasUsedApp');
        if (hasUsedApp) {
            hideWelcomeScreen();
            getCurrentLocation();
        }
    } catch (error) {
        console.error('Error initializing app:', error);
    }
});
