//Router Class to handle navigation and view updates
class Router {
  //Initialize with view and nav item references
  constructor() {
    this.views = document.querySelectorAll(".view");
    this.navItems = document.querySelectorAll(".nav-item");
    this.titleEl = document.getElementById("page-title");
    this.subtitleEl = document.getElementById("page-subtitle");
  }

  //Navigate to a specific view
  navigate(viewName) {
    this.updateNav(viewName);
    this.updateViews(viewName);
    this.updateHeader(viewName);
    history.pushState({ view: viewName }, "", `/${viewName}`);
  }

  //Update navigation active state
  updateNav(viewName) {
    this.navItems.forEach(item => {
      item.classList.toggle(
        "active",
        item.dataset.view === viewName
      );
    });
  }

  //Update view visibility
  updateViews(viewName) {
    this.views.forEach(view => view.classList.remove("active"));
    const activeView = document.getElementById(`${viewName}-view`);
    activeView?.classList.add("active");
  }

  //Update page header title and subtitle
  updateHeader(viewName) {
    const titles = {
      dashboard: {
        title: "Dashboard",
        subtitle: "Welcome back! Ready to plan your next adventure?",
      },
      holidays: {
        title: "Holidays",
        subtitle: "Explore public holidays around the world",
      },
      events: {
        title: "Events",
        subtitle: "Find concerts, sports, and entertainment",
      },
      weather: {
        title: "Weather",
        subtitle: "Check forecasts for any destination",
      },
      "long-weekends": {
        title: "Long Weekends",
        subtitle: "Find the perfect mini-trip opportunities",
      },
      currency: {
        title: "Currency",
        subtitle: "Convert currencies with live exchange rates",
      },
      "sun-times": {
        title: "Sun Times",
        subtitle: "Check sunrise and sunset times worldwide",
      },
      "my-plans": {
        title: "My Plans",
        subtitle: "Your saved holidays and events",
      },
    };

    //Update title and subtitle if available
    if (titles[viewName]) {
      this.titleEl.textContent = titles[viewName].title;
      this.subtitleEl.textContent = titles[viewName].subtitle;
    }
  }
}

//Instantiate Router
const router = new Router();

//Navigation event listeners
document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", e => {
    e.preventDefault();
    const view = item.dataset.view;
    router.navigate(view);
  });
});

//Initial navigation based on URL path
window.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname.replace("/", "");
  const initialView = path || "dashboard";
  router.navigate(initialView);
});

//Handle browser back/forward navigation
window.addEventListener("popstate", (e) => {
  const viewName = e.state?.view || "dashboard";
  router.navigate(viewName);
});

//Main JS Logic for Dashboard and other views
document.addEventListener("DOMContentLoaded", () => {
  //Global state to track if a country is selected
  let isCountrySelected = false;

  //Initial empty state
  document.getElementById("selected-destination").style.display = "none";
  document.getElementById("dashboard-country-info-section").style.display = "block";
  document.getElementById("dashboard-country-info").classList.add("hidden");
  document.getElementById("dashboard-empty-state").classList.remove("hidden");

  //Elements of dashboard
  const countrySelect = document.getElementById("global-country");
  const citySelect = document.getElementById("global-city");
  const yearSelect = document.getElementById("global-year");
  const flagSmall = document.getElementById("selected-country-flag");
  const flagLarge = document.querySelector(".dashboard-country-flag");
  const countryName = document.getElementById("selected-country-name");
  const cityName = document.getElementById("selected-city-name");
  const statCountries = document.getElementById("stat-countries");
  const statHolidays = document.getElementById("stat-holidays");
  const statSaved = document.getElementById("stat-saved");

  //Toast notification function
  function showToast(message, type = "info", duration = 3000) {
    
    //Create toast element
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    //Set icon based on type
    let icon = "";
    if (type === "error") icon = "<i class='fa-solid fa-triangle-exclamation'></i>";
    if (type === "success") icon = "<i class='fa-solid fa-circle-check'></i>";
    if (type === "info") icon = "<i class='fa-solid fa-info'></i>";

    //Set content and append
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);

    //Animation
    setTimeout(() => toast.classList.add("show"), 50);

    //Auto-remove after duration
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => container.removeChild(toast), 400);
    }, duration);
  }

  //Load available countries into the select dropdown
  async function loadCountries() {
    //Fetch from Nager.Date API
    const res = await fetch("https://date.nager.at/api/v3/AvailableCountries");
    const countries = await res.json();

    //Update country statistics
    statCountries.textContent = countries.length + "+";

    //Populate country select options
    countrySelect.innerHTML = `<option value="">Select Country</option>`;
    countries.forEach(c => {
      const option = document.createElement("option");
      option.value = c.countryCode;
      option.textContent = c.name;
      countrySelect.appendChild(option);
    });
  }

  //Initial load of countries
  loadCountries();
  
  //Initialize selected country and city
  let selectedCountryCode = null;
  let selectedCity = null;
  let selectedCityLat = null;
  let selectedCityLon = null;
  let localTimeInterval = null;

  //Country selection change handler
  countrySelect.addEventListener("change", async () => {
    selectedCountryCode = countrySelect.value;
    if (!selectedCountryCode) return;

    //Fetch country details to get capital city
    const res = await fetch(`https://restcountries.com/v3.1/alpha/${selectedCountryCode}`);
    const [country] = await res.json();
    
    //Update selected city to capital
    selectedCity = country.capital?.[0] || "";
    updateCity(selectedCity);
  });

  //City selection change handler
  citySelect.addEventListener("change", () => {
    selectedCity = citySelect.value;
    document.getElementById("selected-city-name").textContent = "• " + selectedCity;
  });

  //Fetch city coordinates using Open-Meteo Geocoding API
  async function getCityCoordinates(city) {
    //Return null if no city provided
    if (!city) return null;

    //Fetch coordinates
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`
      );
      const data = await res.json();

      //Return null if no results
      if (!data.results || data.results.length === 0) return null;

      //Return latitude and longitude
      return {
        lat: data.results[0].latitude,
        lon: data.results[0].longitude,
      };
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  //Load country details into dashboard
  async function loadCountryDetails(code) {
    const res = await fetch(`https://restcountries.com/v3.1/alpha/${code}`);
    const [country] = await res.json();

    //Update dashboard with country details
    updateDashboard(country);
    updateCity(country.capital?.[0]);
    updateHolidays(code);
  }

  //Get calling code from country data
  function getCallingCode(country) {

    //Return N/A if no calling code
    if (!country.idd?.root) return "N/A";

    //Combine root and first suffix
    const suffix = country.idd.suffixes?.[0] || "";
    return country.idd.root + suffix;
  }

  //Update city select options
  function updateCity(capital) {

    //Clear previous options and add new capital option
    citySelect.innerHTML = "";
    if (!capital) return;
    const option = document.createElement("option");
    option.value = capital;
    option.textContent = capital;
    citySelect.appendChild(option);
  }

  //Update local time display based on timezone offset
  function updateLocalTime(offset) {

    //Element to display local time
    const timeEl = document.getElementById("country-local-time");

    //Return if no offset
    if (!offset) return;

    //Clear previous interval if found
    if (localTimeInterval) clearInterval(localTimeInterval);

    //Update time every second
    localTimeInterval = setInterval(() => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;

      //Determine sign and split hours/minutes
      const sign = offset.includes("+") ? 1 : -1;
      const [hours, minutes = 0] = offset.split(sign === 1 ? "+" : "-")[1].split(":");

      //Calculate local time
      const localTime = new Date(
        utc + sign * (parseInt(hours) * 60 + parseInt(minutes)) * 60000
      );

      //Update display
      timeEl.textContent = localTime.toLocaleTimeString();
    }, 1000);
  }

  //Update holidays count in dashboard
  async function updateHolidays(code) {

    //Get selected year
    const year = yearSelect.value;

    //Fetch holidays from Nager.Date API
    const res = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/${code}`
    );
    const holidays = await res.json();
    statHolidays.textContent = holidays.length;
  }

  //Update saved plans count in dashboard
  function updateSavedCount() {
    //Get saved plans from localStorage
    const saved = JSON.parse(localStorage.getItem("plans")) || [];
    statSaved.textContent = saved.length;
  }
  
  //Initial saved count update
  updateSavedCount();

    //Update dashboard with country details
  function updateDashboard(country) {
    //Country code in lowercase for flag URLs
    const code = country.cca2.toLowerCase();

    //Flags
    flagSmall.src = `https://flagcdn.com/w80/${code}.png`;
    flagLarge.src = `https://flagcdn.com/w160/${code}.png`;

    //Names and capital
    countryName.textContent = country.name.common;
    cityName.textContent = "• " + (country.capital?.[0] || "N/A");

    //Country title
    document.querySelector(".dashboard-country-title h3").textContent =
      country.name.common;

    //Official name
    document.querySelector(".official-name").textContent =
      country.name.official;

    //Region and Subregion
    document.querySelector(".region").innerHTML =
      `<i class="fa-solid fa-location-dot"></i> ${country.region} • ${country.subregion || ""}`;

    //Details grid
    const values = document.querySelectorAll(".dashboard-country-detail .value");

    //Populate details
    values[0].textContent = country.capital?.[0] || "N/A";
    values[1].textContent = country.population.toLocaleString();
    values[2].textContent = country.area.toLocaleString() + " km²";
    values[3].textContent = country.region;
    values[4].textContent = getCallingCode(country); // calling code optional
    values[5].textContent = country.car?.side || "N/A";
    values[6].textContent = "Monday";

    //Currency
    const currencyBox = document.querySelector(".dashboard-country-extra:nth-child(1) .extra-tags");
  
    //Clear previous currencies
    currencyBox.innerHTML = "";

    //Object.values to handle multiple currencies
    Object.values(country.currencies || {}).forEach(c => {
      currencyBox.innerHTML += `<span class="extra-tag">${c.name} (${c.symbol || ""})</span>`;
    });

    //Languages
    const langBox = document.querySelector(".dashboard-country-extra:nth-child(2) .extra-tags");

    //Clear previous languages
    langBox.innerHTML = "";
  
    //Object.values to handle multiple languages
    Object.values(country.languages || {}).forEach(l => {
      langBox.innerHTML += `<span class="extra-tag">${l}</span>`;
    });

    //Borders
    const borderBox = document.querySelector(".dashboard-country-extra:nth-child(3) .extra-tags");

    //Clear previous borders
    borderBox.innerHTML = "";

    //List bordering countries
    (country.borders || []).forEach(b => {
      borderBox.innerHTML += `<span class="extra-tag border-tag">${b}</span>`;
    });

    //Google Maps
    document.querySelector(".btn-map-link").href = country.maps.googleMaps;

    //Local Time
    updateLocalTime(country.timezones?.[0]);
  }

  //Global Search button click handler
  document.getElementById("global-search-btn").addEventListener("click", async () => {
    //Check if country is selected
    if (!selectedCountryCode) {
      showToast("Please select a country first!", "error");
      return;
    }

    //Update global state
    isCountrySelected = true;

    //Show selected destination section and update views
    document.getElementById("selected-destination").classList.remove("hidden");
    document.getElementById("selected-destination").style.display = "flex";
    document.getElementById("dashboard-country-info").classList.remove("hidden");
    document.getElementById("dashboard-empty-state").classList.add("hidden");
    updateViewsEmptyState();
    document.getElementsByClassName("current-selection-badge")[0].classList.remove("hidden");
    document.getElementsByClassName("current-selection-badge")[0].classList.add("flex");

    //Fetch country details
    const res = await fetch(`https://restcountries.com/v3.1/alpha/${selectedCountryCode}`);
    const [country] = await res.json();
    const countryName = country.name.common;
    const coords = await getCityCoordinates(selectedCity);
    const year = yearSelect.value;
    //Handle case where coordinates are not found
    if (!coords) {
      showToast("Failed to get city location", "error");
      return;
    }
    //Store city coordinates
    selectedCityLat = coords.lat;
    selectedCityLon = coords.lon;
    //Use capitalInfo latlng if available, otherwise fallback to country latlng
    const lat = country.capitalInfo?.latlng?.[0] || country.latlng[0];
    const lon = country.capitalInfo?.latlng?.[1] || country.latlng[1];

    //Load Dashboard Details
    loadCountryDetails(selectedCountryCode);

    //Show selected destination section
    document.getElementById("selected-destination").style.display = "flex";
    document.getElementById("dashboard-country-info-section").style.display = "block";

    //Load data for other views
    await loadHolidays(selectedCountryCode, countryName, year);
    await loadEvents(selectedCity, selectedCountryCode, countryName);
    await loadLongWeekends(selectedCountryCode, selectedCity,year, countryName);
    await loadWeather(lat, lon, countryName, selectedCity || country.capital?.[0], selectedCountryCode);
    await loadSunTimes(lat, lon, new Date().toISOString().split('T')[0], selectedCity, selectedCountryCode, countryName);


    //Show success toast
    showToast(`Exploring ${selectedCity || selectedCountryCode}!`, "success");
  });

  //Clear Selection button click handler
  document.getElementById("clear-selection-btn").addEventListener("click", () => {
    //Reset selections
    countrySelect.value = "";
    citySelect.innerHTML = "";
    yearSelect.value = yearSelect.options[0].value;

    //Hide selected destination section
    document.getElementById("selected-destination").style.display = "none";
    document.getElementById("dashboard-country-info-section").style.display = "none";


    //Update global state and views
    isCountrySelected = false;
    document.getElementById("dashboard-country-info").classList.add("hidden");
    document.getElementById("dashboard-empty-state").classList.remove("hidden");
    updateViewsEmptyState();
    document.getElementsByClassName("current-selection-badge")[0].classList.remove("flex");
    document.getElementsByClassName("current-selection-badge")[0].classList.add("hidden");

    //Clear local time interval
    if (localTimeInterval) clearInterval(localTimeInterval);
    showToast("Selection cleared", "info");
  });


//===================================== holiday section =====================================//

  //Elements for holidays view
  const holidaysView = document.getElementById("holidays-view");
  const holidaysSelection = document.getElementById("holidays-selection");
  const holidaysContent = document.getElementById("holidays-content");

  //Helper functions to extract day, month, and weekday
  function getDayMonth(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleString("en-US", { month: "short" });
    return { day, month };
  }

  //Get weekday name from date string
  function getWeekday(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", { weekday: "long" });
  }

  //Save holiday to My Plans in localStorage
  function saveHolidayToPlans(holiday, btn) {

    //Retrieve existing plans or initialize empty array
    const plans = JSON.parse(localStorage.getItem("plans")) || [];
    const holidayPlan = { ...holiday, type: "holiday" };

    //Avoid duplicates based on date and name
    const existing = plans.find(p => p.date === holidayPlan.date && p.name === holidayPlan.name);
    if (!existing) {
      plans.push(holidayPlan);
      localStorage.setItem("plans", JSON.stringify(plans));

      //Update button state to saved
      if(btn) {
        btn.classList.add("saved");
        btn.querySelector("i").classList.add("fa-solid");
      }
      showToast(`Saved ${holidayPlan.name} to My Plans!`, "success");
    } 
    else {
      if(btn) btn.querySelector("i").classList.add("fa-solid");
      showToast(`${holiday.name} is already saved.`, "info");
    }

    //Update saved count and My Plans view
    updateSavedCount();
    renderMyPlans(document.querySelector(".plan-filter.active")?.dataset.filter || "all"); 
  }

  //Render single holiday card
  function renderHolidayCard(holiday) {
    
    //Extract day, month, and weekday
    const { day, month } = getDayMonth(holiday.date);
    const weekday = getWeekday(holiday.date);

    //Create card element
    const card = document.createElement("div");
    card.className = "holiday-card";
    
    //Set inner HTML of the card with holiday details
    card.innerHTML = `
      <div class="holiday-card-header">
        <div class="holiday-date-box"><span class="day">${day}</span><span class="month">${month}</span></div>
        <button class="holiday-action-btn"><i class="fa-regular fa-heart"></i></button>
      </div>
      <h3>${holiday.localName}</h3>
      <p class="holiday-name">${holiday.name}</p>
      <div class="holiday-card-footer">
        <span class="holiday-day-badge"><i class="fa-regular fa-calendar"></i> ${weekday}</span>
        <span class="holiday-type-badge">${holiday.types[0] || "Public"}</span>
      </div>
    `;

    //Add event listener for save
    const btn = card.querySelector(".holiday-action-btn");
    btn.addEventListener("click", () => saveHolidayToPlans({ 
      date: holiday.date, 
      name: holiday.name, 
      countryCode: holiday.countryCode 
    },btn));

    //Preserve saved state on render
    holidaysContent.appendChild(card);
  }

  //Render all holidays
  function renderHolidays(holidays) {
    holidaysContent.innerHTML = "";

    //Update holidays count in dashboard
    holidays.forEach(h => renderHolidayCard(h));
  }

  //Update holidays header dynamically
  function updateHolidaysSelection(countryCode, countryName, year) {
    //Country code in lowercase for flag URL
    const countryCodeLower = countryCode.toLowerCase();
    //Update selection badge
    holidaysSelection.innerHTML = `
      <div class="current-selection-badge">
        <img src="https://flagcdn.com/w40/${countryCodeLower}.png" alt="${countryName}" class="selection-flag">
        <span>${countryName}</span>
        <span class="selection-year">${year}</span>
      </div>
    `;
  }

  //Load holidays from Nager.Date API
  async function loadHolidays(countryCode, countryName, year) {

    //Return if no country code
    if (!countryCode) return;

    //Update selection badge
    updateHolidaysSelection(countryCode, countryName, year);

    //Fetch holidays
    try {
      const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
      if (!res.ok) throw new Error("Failed to fetch holidays");
      const holidays = await res.json();
      renderHolidays(holidays);
    } 
    catch (err) {
      console.error(err);
      showToast("Failed to load holidays.", "error");
    }
  }


//===================================== events section =====================================//

  //Elements for events view
  const eventsView = document.getElementById("events-view");
  const eventsContent = document.getElementById("events-content");
  const eventsSelection = eventsView.querySelector(".view-header-selection");

  //Save Event to LocalStorage
  function saveEventToPlans(event, btn) {

    //Retrieve existing plans or initialize empty array
    const plans = JSON.parse(localStorage.getItem("plans")) || [];
    const eventPlan = { ...event, type: "event" };
    if (!plans.find(p => p.id === eventPlan.id)) {
      plans.push(eventPlan);
      localStorage.setItem("plans", JSON.stringify(plans));
      showToast(`Saved "${event.name}" to My Plans!`, "success");
      btn.classList.add("saved"); 
      updateSavedCount(); 
      renderMyPlans(document.querySelector(".plan-filter.active")?.dataset.filter || "all");
    } 
    else {
      showToast(`"${event.name}" is already saved.`, "info");
    }
  }

  //Render single Event Card
  function renderEventCard(event) {
    //Extract event details with fallbacks
    const image = event.images?.[0]?.url || "https://via.placeholder.com/400x200";
    const category = event.classifications?.[0]?.segment?.name || "Event";
    const date = event.dates?.start?.localDate || "";
    const time = event.dates?.start?.localTime || "";
    const datetime = date ? `${date}${time ? " at " + time : ""}` : "Date TBD";
    const venue = event._embedded?.venues?.[0]?.name || "Venue TBD";
    const countryCode = event._embedded?.venues?.[0]?.country?.countryCode || "";

    //Create card element
    const card = document.createElement("div");
    card.className = "event-card";
    card.innerHTML = `
      <div class="event-card-image">
        <img src="${image}" alt="${event.name}">
        <span class="event-card-category">${category}</span>
        <button class="event-card-save"><i class="fa-regular fa-heart"></i></button>
      </div>
      <div class="event-card-body">
        <h3>${event.name}</h3>
        <div class="event-card-info">
          <div><i class="fa-regular fa-calendar"></i>${datetime}</div>
          <div><i class="fa-solid fa-location-dot"></i>${venue}</div>
        </div>
        <div class="event-card-footer">
          <button class="btn-event"><i class="fa-regular fa-heart"></i> Save</button>
          <a href="${event.url}" target="_blank" class="btn-buy-ticket"><i class="fa-solid fa-ticket"></i> Buy Tickets</a>
        </div>
      </div>
    `;

    //Save buttons
    const saveBtnTop = card.querySelector(".event-card-save");
    const saveBtnFooter = card.querySelector(".btn-event");

    //Add event listeners for save buttons
    [saveBtnTop, saveBtnFooter].forEach(btn => {
      btn.addEventListener("click", () => saveEventToPlans({
        id: event.id,
        name: event.name,
        date: datetime,
        venue: venue,
        countryCode: countryCode,
        city: selectedCity,
        url: event.url
      }, btn));
    });

    //Preserve saved state on render
    const savedPlans = JSON.parse(localStorage.getItem("plans")) || [];
    if (savedPlans.find(p => p.id === event.id)) {
      saveBtnTop.classList.add("saved");
      saveBtnFooter.classList.add("saved");
    }

    //Append card to events content
    eventsContent.appendChild(card);
  }

  //Render all events
  function renderEvents(events) {
    eventsContent.innerHTML = "";
    events.forEach(e => renderEventCard(e));
  }

  //Update Current Selection Badge (flag + country + city)
  function updateEventsSelection(countryCode, countryName, city) {
    //Country code in lowercase for flag URL
    const countryCodeLower = countryCode.toLowerCase();
    eventsSelection.innerHTML = `
      <div class="current-selection-badge">
        <img src="https://flagcdn.com/w40/${countryCodeLower}.png" alt="${countryName}" class="selection-flag">
        <span>${countryName}</span>
        <span class="selection-city">• ${city}</span>
      </div>
    `;
  }

  //Load Events from Ticketmaster API
  async function loadEvents(city, countryCode, countryName) {
    //Return if city or country code is missing
    if (!city || !countryCode) return;

    //Update selection badge
    updateEventsSelection(countryCode, countryName, city);

    //Fetch events from Ticketmaster API
    const apikey = "4ShYQIkjMm8g7OadcDsL6A4m6WSwICZ2";
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apikey}&city=${encodeURIComponent(city)}&countryCode=${countryCode}&size=20`;

    //Fetch and render events
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch events");
      const data = await res.json();
      const events = data._embedded?.events || [];
      renderEvents(events);
    } 
    catch (err) {
      console.error(err);
      showToast("Failed to load events.", "error");
    }
  }

//===================================== weather section =====================================//

  //Mapping weather codes to descriptions, icons, and classes
  const weatherCodeMap = {
    0: { text: "Clear sky", icon: "fa-sun", class: "weather-sunny" },
    1: { text: "Mainly clear", icon: "fa-cloud-sun", class: "weather-sunny" },
    2: { text: "Partly cloudy", icon: "fa-cloud-sun", class: "weather-cloudy" },
    3: { text: "Overcast", icon: "fa-cloud", class: "weather-cloudy" },

    45: { text: "Fog", icon: "fa-smog", class: "weather-cloudy" },
    48: { text: "Fog", icon: "fa-smog", class: "weather-cloudy" },

    51: { text: "Light drizzle", icon: "fa-cloud-rain", class: "weather-rainy" },
    53: { text: "Drizzle", icon: "fa-cloud-rain", class: "weather-rainy" },
    55: { text: "Heavy drizzle", icon: "fa-cloud-showers-heavy", class: "weather-rainy" },

    61: { text: "Light rain", icon: "fa-cloud-rain", class: "weather-rainy" },
    63: { text: "Rain", icon: "fa-cloud-showers-heavy", class: "weather-rainy" },
    65: { text: "Heavy rain", icon: "fa-cloud-showers-heavy", class: "weather-rainy" },

    71: { text: "Light snow", icon: "fa-snowflake", class: "weather-snowy" },
    73: { text: "Snow", icon: "fa-snowflake", class: "weather-snowy" },
    75: { text: "Heavy snow", icon: "fa-snowflake", class: "weather-snowy" },

    80: { text: "Rain showers", icon: "fa-cloud-rain", class: "weather-rainy" },
    81: { text: "Heavy showers", icon: "fa-cloud-showers-heavy", class: "weather-rainy" },
    82: { text: "Violent showers", icon: "fa-cloud-showers-heavy", class: "weather-rainy" },

    95: { text: "Thunderstorm", icon: "fa-bolt", class: "weather-stormy" },
    96: { text: "Thunderstorm", icon: "fa-bolt", class: "weather-stormy" },
    99: { text: "Thunderstorm with hail", icon: "fa-bolt", class: "weather-stormy" }
  };

  //Get weather UI details based on code
  function getWeatherUI(code) {
    return weatherCodeMap[code] || {
      text: "Unknown",
      icon: "fa-cloud",
      class: "weather-cloudy"
    };
  }

  //Ensure Sunrise/Sunset card exists in details grid
  function ensureSunriseSunsetCard() {
    const grid = document.querySelector(".weather-details-grid");
    //check if grid exists
    if (!grid) return;

    //if already exists, do nothing
    if (grid.querySelector(".sunrise-sunset")) return;

    //create and append the card
    const card = document.createElement("div");
    card.className = "weather-detail-card sunrise-sunset";
    card.innerHTML = `
      <div class="sun-times-visual">
        <div class="sun-time sunrise">
          <i class="fa-solid fa-sunrise"></i>
          <span class="sun-label">Sunrise</span>
          <span class="sun-value">--:--</span>
        </div>

        <div class="sun-arc">
          <div class="sun-arc-path"></div>
          <div class="sun-position"></div>
        </div>

        <div class="sun-time sunset">
          <i class="fa-solid fa-sunset"></i>
          <span class="sun-label">Sunset</span>
          <span class="sun-value">--:--</span>
        </div>
      </div>
    `;

    //append to grid
    grid.appendChild(card);
  }

  //Update weather selection badge
  const weatherView = document.getElementById("weather-view");
  function updateWeatherSelection(city, countryCode, countryName) {
    const badge = weatherView.querySelector(".view-header-selection");
    badge.innerHTML = `
      <div class="current-selection-badge">
        <img src="https://flagcdn.com/w40/${countryCode.toLowerCase()}.png" />
        <span>${countryName}</span>
        <span class="selection-city">• ${city}</span>
      </div>
    `;
  }

  //Load weather data from Open-Meteo API
  async function loadWeather(lat, lon, countryName, cityName, countryCode) {
    //Ensure sunrise/sunset card exists
    ensureSunriseSunsetCard();

    //update selection badge
    updateWeatherSelection(cityName, countryCode, countryName);

    //Fetch weather data
    const url = `https://api.open-meteo.com/v1/forecast
    ?latitude=${lat}
    &longitude=${lon}
    &current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,uv_index
    &hourly=temperature_2m,weather_code,precipitation_probability
    &daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max
    &timezone=auto`.replace(/\s/g, "");
    const res = await fetch(url);
    const data = await res.json();

    //Current Weather Display
    const current = data.current;
    const today = data.daily;
    const weatherUI = getWeatherUI(current.weather_code);
    const sunriseEl = document.querySelector(".sunrise .sun-value");
    const sunsetEl = document.querySelector(".sunset .sun-value");
    const hourlyContainer = document.querySelector(".hourly-scroll");
    const heroCard = document.querySelector(".weather-hero-card");
    const days = document.querySelectorAll(".forecast-day");
    heroCard.className = `weather-hero-card ${weatherUI.class}`;
    heroCard.querySelector(".weather-hero-icon i").className =
      `fa-solid ${weatherUI.icon}`;

    heroCard.querySelector(".temp-value").textContent =
      Math.round(current.temperature_2m);

    heroCard.querySelector(".weather-condition").textContent =
      weatherUI.text;

    heroCard.querySelector(".weather-feels").textContent =
      `Feels like ${Math.round(current.apparent_temperature)}°C`;

    heroCard.querySelector(".high").innerHTML =
      `<i class="fa-solid fa-arrow-up"></i> ${Math.round(today.temperature_2m_max[0])}°`;

    heroCard.querySelector(".low").innerHTML =
      `<i class="fa-solid fa-arrow-down"></i> ${Math.round(today.temperature_2m_min[0])}°`;

    heroCard.querySelector(".weather-location span").textContent = cityName;

    //Format date as "Weekday, Month Day, Year"
    heroCard.querySelector(".weather-time").textContent =
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });

    //Details Grid Values
    document.querySelector(".humidity-card .detail-value")
      .textContent = `${current.relative_humidity_2m}%`;

    document.querySelector(".wind-card .detail-value")
      .textContent = `${Math.round(current.wind_speed_10m)} km/h`;

    document.querySelector(".uv-card .detail-value")
      .textContent = current.uv_index;

    document.querySelector(".precip-card .detail-value")
      .textContent = `${today.precipitation_probability_max[0] || 0}%`;

    //Sunrise and Sunset Times
    if (sunriseEl && sunsetEl && data.daily?.sunrise?.length && data.daily?.sunset?.length){
      //Get sunrise and sunset times from daily data
      const sunrise = new Date(data.daily.sunrise[0]);
      const sunset = new Date(data.daily.sunset[0]);

      //Format and display times
      sunriseEl.textContent = sunrise.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      sunsetEl.textContent = sunset.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    //Hourly Forecast
    hourlyContainer.innerHTML = "";

    //Display next 24 hours
    for (let i = 0; i < 24; i++) {
      //Get weather UI and time for each hour
      const ui = getWeatherUI(data.hourly.weather_code[i]);
      const time = new Date(data.hourly.time[i]).toLocaleTimeString([], {
        hour: "numeric"
      });

      //Append hourly item
      hourlyContainer.innerHTML += `
        <div class="hourly-item ${i === 0 ? "now" : ""}">
          <span class="hourly-time">${i === 0 ? "Now" : time}</span>
          <div class="hourly-icon"><i class="fa-solid ${ui.icon}"></i></div>
          <span class="hourly-temp">${Math.round(data.hourly.temperature_2m[i])}°</span>
        </div>`;
    }

    //7 Day Forecast Display   
    days.forEach((dayEl, i) => {
      //Skip if no date
      if (!data.daily.time[i]) return;

      //Get weather UI and date for each day
      const ui = getWeatherUI(data.daily.weather_code[i]);
      const date = new Date(data.daily.time[i]);

      //Update day element
      dayEl.querySelector(".forecast-icon i").className =
        `fa-solid ${ui.icon}`;

      dayEl.querySelector(".temp-max").textContent =
        `${Math.round(data.daily.temperature_2m_max[i])}°`;

      dayEl.querySelector(".temp-min").textContent =
        `${Math.round(data.daily.temperature_2m_min[i])}°`;

      dayEl.querySelector(".day-label").textContent =
        i === 0 ? "Today" : date.toLocaleDateString(undefined, { weekday: "short" });

      dayEl.querySelector(".day-date").textContent =
        date.toLocaleDateString(undefined, { day: "numeric", month: "short" });

      //Precipitation Probability
      const precipEl = dayEl.querySelector(".forecast-precip");
      const precip = data.daily.precipitation_probability_max[i];

      //Update precip element
      precipEl.innerHTML = `
        <i class="fa-solid fa-droplet"></i>
        <span>${precip ?? 0}%</span>
      `;    
    });
  }

//==================================== Long Weekend Section =====================================//

  //Save Long Weekend to My Plans
  function initSaveButtons() {
    //add event listeners to all save buttons
    document.querySelectorAll(".holiday-action-btn-new").forEach(btn => {
      //click handler
      btn.addEventListener("click", () => {
        //Extract long weekend details from card
        const card = btn.closest(".lw-card");
        const name = card.querySelector("h3").textContent;
        const dateRange = card.querySelector(".lw-dates").textContent.trim();
        const lwPlan = { name, date: dateRange, type: "longweekend" };

        //Retrieve existing plans from localStorage
        const plans = JSON.parse(localStorage.getItem("plans")) || [];

        //Check for duplicates
        const existing = plans.find(p => p.date === lwPlan.date && p.name === lwPlan.name);
        if (!existing) {
          plans.push(lwPlan);
          localStorage.setItem("plans", JSON.stringify(plans));
          btn.classList.add("saved");
          btn.querySelector("i").classList.add("fa-solid");
          showToast(`Saved ${lwPlan.name} to My Plans!`, "success");
        } 
        else {
          btn.querySelector("i").classList.add("fa-solid");
          showToast(`${lwPlan.name} is already saved.`, "info");
        }
        
        //Update saved count and My Plans view
        updateSavedCount();
        renderMyPlans(document.querySelector(".plan-filter.active")?.dataset.filter || "all");
      });
    });
  }

  //Format date range for display
  function formatRange(start, end) {
    //Options for month and day formatting
    const options = { month: "short", day: "numeric" };
    return `${start.toLocaleDateString("en-US", options)} - 
            ${end.toLocaleDateString("en-US", options)}, 
            ${end.getFullYear()}`;
  }

  //Generate HTML for each day in the long weekend
  function generateDays(start, end) {
    let html = "";
    const date = new Date(start);

    //Iterate through each day in the range
    while (date <= end) {
      //Check if weekend (Friday or Saturday)
      const isWeekend = date.getDay() === 5 || date.getDay() === 6;

      //Append day HTML
      html += `
        <div class="lw-day ${isWeekend ? "weekend" : ""}">
          <span class="name">${date.toLocaleDateString("en-US", { weekday: "short" })}</span>
          <span class="num">${date.getDate()}</span>
        </div>
      `;

      //Move to next day
      date.setDate(date.getDate() + 1);
    }
    return html;
  }

  //Update Long Weekend selection badge
  const longweekendView = document.getElementById("long-weekends-view");
  function updateLongWeekEndSelection(city, countryCode, countryName) {
    const badge = longweekendView.querySelector(".view-header-selection");
    badge.innerHTML = `
      <div class="current-selection-badge">
        <img src="https://flagcdn.com/w40/${countryCode.toLowerCase()}.png" />
        <span>${countryName}</span>
        <span class="selection-city">• ${city}</span>
      </div>
    `;
  }

  //Load Long Weekends from Nager.Date API
  async function loadLongWeekends(countryCode, cityName, year, countryName) {
    //update selection badge
    updateLongWeekEndSelection(cityName, countryCode, countryName);

    //Container for long weekends
    const container = document.getElementById("lw-content");
    container.innerHTML = "";

    //Fetch long weekends
    try {
      const res = await fetch(
        `https://date.nager.at/api/v3/LongWeekend/${year}/${countryCode}`
      );
      const data = await res.json();

      //Handle no long weekends found
      if (!data.length) {
        container.innerHTML = `<p class="empty-msg">No long weekends found.</p>`;
        return;
      }

      //Render each long weekend card
      data.forEach((item, index) => {
        //Parse start and end dates
        const start = new Date(item.startDate);
        const end = new Date(item.endDate);
        const days = generateDays(start, end);
        const card = document.createElement("div");
        card.className = "lw-card";
        card.innerHTML = `
          <div class="lw-card-header">
            <span class="lw-badge">
              <i class="fa-solid fa-calendar-days"></i> ${item.dayCount} Days
            </span>
            <button class="holiday-action-btn-new" data-id="${item.startDate}">
              <i class="fa-regular fa-heart"></i>
            </button>
          </div>

          <h3>Long Weekend #${index + 1}</h3>

          <div class="lw-dates">
            <i class="fa-regular fa-calendar"></i>
            ${formatRange(start, end)}
          </div>

          <div class="lw-info-box ${item.needBridgeDay ? "warning" : "success"}">
            <i class="fa-solid ${item.needBridgeDay ? "fa-info-circle" : "fa-check-circle"}"></i>
            ${
              item.needBridgeDay
                ? "Requires taking a bridge day off"
                : "No extra days off needed!"
            }
          </div>

          <div class="lw-days-visual">
            ${days}
          </div>
        `;

        //Append card to container
        container.appendChild(card);
      });

      //Initialize save buttons
      initSaveButtons();
    } 
    catch (err) {
      console.error(err);
      showToast("Failed to load long weekends", "error");
    }
  }

//============================= Currency Exchange Section====================//

  //API Configuration
  const API_KEY = "83cd9cbfceb75034709a7aa7";
  const BASE_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}`;

  //Popular Currencies List
  const popularCurrencies = [
    { code: "USD", name: "US Dollar", flag: "https://flagcdn.com/w40/us.png" },
    { code: "EUR", name: "Euro", flag: "https://flagcdn.com/w40/eu.png" },
    { code: "GBP", name: "British Pound", flag: "https://flagcdn.com/w40/gb.png" },
    { code: "EGP", name: "Egyptian Pound", flag: "https://flagcdn.com/w40/eg.png" },
    { code: "AED", name: "UAE Dirham", flag: "https://flagcdn.com/w40/ae.png" },
    { code: "SAR", name: "Saudi Riyal", flag: "https://flagcdn.com/w40/sa.png" },
    { code: "JPY", name: "Japanese Yen", flag: "https://flagcdn.com/w40/jp.png" },
    { code: "CAD", name: "Canadian Dollar", flag: "https://flagcdn.com/w40/ca.png" },
    { code: "INR", name: "Indian Rupee", flag: "https://flagcdn.com/w40/in.png" },
  ];

  //Populate Dropdowns
  function populateCurrencyDropdowns() {
    //Populate From and To currency dropdowns
    const fromSelect = document.getElementById("currency-from");
    const toSelect = document.getElementById("currency-to");
    fromSelect.innerHTML = "";
    toSelect.innerHTML = "";

    //Add popular currencies to both dropdowns
    popularCurrencies.forEach(curr => {
      const optionFrom = document.createElement("option");
      optionFrom.value = curr.code;
      optionFrom.textContent = `${curr.code} - ${curr.name}`;
      fromSelect.appendChild(optionFrom);
      const optionTo = document.createElement("option");
      optionTo.value = curr.code;
      optionTo.textContent = `${curr.code} - ${curr.name}`;
      toSelect.appendChild(optionTo);
    });

    //Set default selections
    fromSelect.value = "USD";
    toSelect.value = "EGP";
  }

  //Update Quick Convert Cards
  async function updateQuickConvertCards() {
    //Fetch latest rates with USD as base
    const base = "USD";
    const res = await fetch(`${BASE_URL}/latest/${base}`);
    const data = await res.json();

    //Update each popular currency card with latest rate
    document.querySelectorAll("#popular-currencies .popular-currency-card").forEach(card => {
      const code = card.querySelector(".code").textContent;
      const rate = data.conversion_rates[code];
      card.querySelector(".rate").textContent = rate ? rate.toFixed(4) : "-";
    });
  }

  //Convert Amount
  async function convertCurrency() {
    //Get input values
    const amount = parseFloat(document.getElementById("currency-amount").value);
    const from = document.getElementById("currency-from").value;
    const to = document.getElementById("currency-to").value;
    const fromEl = document.querySelector(".conversion-from .amount");
    const toEl = document.querySelector(".conversion-to .amount");
    const fromCodeEl = document.querySelector(".conversion-from .currency-code");
    const toCodeEl = document.querySelector(".conversion-to .currency-code");
    const exchangeInfo = document.querySelector(".exchange-rate-info");

    //Validate amount
    if (isNaN(amount) || amount <= 0) {
      showToast("Enter a valid amount", "error");
      return;
    }

    //Fetch conversion data
    const res = await fetch(`${BASE_URL}/pair/${from}/${to}/${amount}`);
    const data = await res.json();

    //Display conversion result
    if (data.result === "success") {
      //Update UI with conversion results
      fromEl.textContent = parseFloat(amount).toFixed(2);
      fromCodeEl.textContent = from;
      toEl.textContent = parseFloat(data.conversion_result).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      toCodeEl.textContent = to;

      //Exchange rate info
      exchangeInfo.innerHTML = `<p>1 ${from} = ${data.conversion_rate.toFixed(4)} ${to}</p>
        <small>Last updated: ${new Date(data.time_last_update_utc).toLocaleString()}</small>`;

      showToast(`Converted ${amount} ${from} to ${data.conversion_result.toFixed(2)} ${to}`, "success");
    } 
    else {
      showToast("Conversion failed. Try again.", "error");
    }
  }

  //Swap Currencies
  function swapCurrencies() {
    //Swap selected currencies in dropdowns
    const fromSelect = document.getElementById("currency-from");
    const toSelect = document.getElementById("currency-to");
    const temp = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = temp;
  }

  //Initialize Converter
  function initCurrencyConverter() {
    //call populate and update functions
    populateCurrencyDropdowns();
    updateQuickConvertCards();

    //Event listeners for buttons
    document.getElementById("convert-btn").addEventListener("click", convertCurrency);
    document.getElementById("swap-currencies-btn").addEventListener("click", () => {
      swapCurrencies();
      convertCurrency();
    });
  }

  //Initialize currency converter on page load
  initCurrencyConverter();

//================================ sunsite section =====================================//

  //Update Sun Times selection badge
  const suntimeView = document.getElementById("sun-times-view");
  function updateSunTimeSelection(city, countryCode, countryName) {
    const badge = suntimeView.querySelector(".view-header-selection");
    const headerh2 = suntimeView.querySelector(".sun-location h2");
    headerh2.innerHTML = `<h2><i class="fa-solid fa-location-dot"></i> ${city}</h2>`;
    badge.innerHTML = `
      <div class="current-selection-badge">
        <img src="https://flagcdn.com/w40/${countryCode.toLowerCase()}.png" />
        <span>${countryName}</span>
        <span class="selection-city">• ${city}</span>
      </div>
    `;
  }

  //Load Sun Times from Sunrise-Sunset API
  async function loadSunTimes(lat, lng, dateStr,city, countryCode, countryName) {
    //Update selection badge
    updateSunTimeSelection(city, countryCode, countryName);

    //Fetch sun times
    try {
      //Use provided date or today's date
      const date = dateStr || new Date().toISOString().split("T")[0];
      const res = await fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&date=${date}&formatted=0`);
      const data = await res.json();

      //Handle missing data
      if (!data || !data.results) throw new Error("No sun times available");
      const results = data.results;

      //Helper to convert ISO to local time
      const toLocalTime = iso => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      //Update sun time cards
      document.querySelector(".sun-time-card.dawn .time").textContent = toLocalTime(results.civil_twilight_begin);
      document.querySelector(".sun-time-card.sunrise .time").textContent = toLocalTime(results.sunrise);
      document.querySelector(".sun-time-card.noon .time").textContent = toLocalTime(results.solar_noon);
      document.querySelector(".sun-time-card.sunset .time").textContent = toLocalTime(results.sunset);
      document.querySelector(".sun-time-card.dusk .time").textContent = toLocalTime(results.civil_twilight_end);

      //Day length calculation
      const daySeconds = results.day_length;
      const hours = Math.floor(daySeconds / 3600);
      const minutes = Math.floor((daySeconds % 3600) / 60);
      document.querySelector(".sun-time-card.daylight .time").textContent = `${hours}h ${minutes}m`;

      //Update progress bar and percentages
      const dayPercent = (daySeconds / 86400) * 100; 
      const nightPercent = 100 - dayPercent;
      document.querySelector(".day-progress-fill").style.width = `${dayPercent.toFixed(1)}%`;
      document.querySelector(".day-length-stats .day-stat:nth-child(1) .value").textContent = `${hours}h ${minutes}m`;
      document.querySelector(".day-length-stats .day-stat:nth-child(2) .value").textContent = `${dayPercent.toFixed(1)}%`;
      document.querySelector(".day-length-stats .day-stat:nth-child(3) .value").textContent = `${nightPercent.toFixed(1)}%`;

      //Update date and day display
      const localDate = new Date(date);
      const options = { month: "long", day: "numeric", year: "numeric" };
      document.querySelector(".sun-date-display .date").textContent = localDate.toLocaleDateString(undefined, options);
      document.querySelector(".sun-date-display .day").textContent = localDate.toLocaleDateString(undefined, { weekday: "long" });
    } 
    catch (err) {
      console.error("Failed to load sun times:", err);
      showToast("Could not fetch sun times. Try again later.", "error");
    }
  }

//================================= plans section =====================================//

  //Render My Plans
  function renderMyPlans(filter = "all") {

    //Get saved plans from localStorage
    const plansContent = document.getElementById("plans-content");
    const plans = JSON.parse(localStorage.getItem("plans")) || [];

    //Empty state if no plans saved
    if (plans.length === 0) {
      plansContent.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fa-solid fa-heart-crack"></i></div>
          <h3>No Saved Plans Yet</h3>
          <p>Start exploring and save holidays, events, or long weekends you like!</p>
          <button class="btn-primary" id="start-exploring-btn">
            <i class="fa-solid fa-compass"></i> Start Exploring
          </button>
        </div>`;
      return;
    }

    // Filter plans
    const filteredPlans = filter === "all"
    ? plans
    : plans.filter(plan => plan.type === filter);

    // Generate HTML for each plan
    plansContent.innerHTML = "";
    filteredPlans.forEach(plan => {
      // Badge color based on type
      let typeClass = "";
      if(plan.type === "holiday") typeClass = "holiday"; // green
      else if(plan.type === "event") typeClass = "event"; // red
      else if(plan.type === "longweekend") typeClass = "longweekend"; // orange

      const card = document.createElement("div");
      card.className = "plan-card";
      card.innerHTML = `
        <span class="plan-card-type ${typeClass}">${plan.type.charAt(0).toUpperCase() + plan.type.slice(1)}</span>
        <div class="plan-card-content">
          <h4>${plan.name}</h4>
          <div class="plan-card-details">
            ${plan.date ? `<div><i class="fa-regular fa-calendar"></i>${plan.date}</div>` : ""}
            ${plan.venue ? `<div><i class="fa-solid fa-circle-info"></i>${plan.venue}</div>` : ""}
          </div>
          <div class="plan-card-actions">
            <button class="btn-plan-remove">
              <i class="fa-solid fa-trash"></i> Remove
            </button>
          </div>
        </div>
      `;

      // Remove button
      card.querySelector(".btn-plan-remove").addEventListener("click", () => {
        deletePlan(plan);
      });

      plansContent.appendChild(card);
    });

    updateFilterCounts();
  }

  //Delete a plan
  function deletePlan(plan) {
    //Confirmation dialog
    Swal.fire({
      title: 'Remove Plan?',
      text: `Are you sure you want to remove "${plan.name}" from My Plans?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, remove it!',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      //If confirmed, remove the plan
      if (result.isConfirmed) {
        //Retrieve and filter plans
        let plans = JSON.parse(localStorage.getItem("plans")) || [];
        plans = plans.filter(p => !(p.name === plan.name && p.date === plan.date));
        localStorage.setItem("plans", JSON.stringify(plans));
        showToast(`Deleted "${plan.name}" from My Plans`, "info");
        updateSavedCount();
        updateFilterCounts();
        renderMyPlans(document.querySelector(".plan-filter.active")?.dataset.filter || "all");
      }
    });
  }

  //Clear All Plans
  document.getElementById("clear-all-plans-btn").addEventListener("click", () => {
    //Confirmation dialog
    Swal.fire({
      title: 'Remove All Plans?',
      text: "Are you sure you want to remove all saved plans?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, remove all!',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      //If confirmed, clear all plans
      if (result.isConfirmed) {
        localStorage.removeItem("plans");
        showToast("Cleared all saved plans!", "info");
        updateSavedCount();
        updateFilterCounts();
        renderMyPlans("all");
      }
    });
  });

  //Filter buttons
  document.querySelectorAll(".plan-filter").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".plan-filter").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      //filter plans based on selected filter
      const filter = btn.dataset.filter;
      renderMyPlans(filter);
    });
  });

  //Update counts per filter
  function updateFilterCounts() {
    //Get all plans from localStorage
    const plans = JSON.parse(localStorage.getItem("plans")) || [];
    document.getElementById("filter-all-count").textContent = plans.length;
    document.getElementById("filter-holiday-count").textContent = plans.filter(p => p.type === "holiday").length;
    document.getElementById("filter-event-count").textContent = plans.filter(p => p.type === "event").length;
    document.getElementById("filter-lw-count").textContent = plans.filter(p => p.type === "longweekend").length;
  }

  //Initial render
  renderMyPlans();

//================================= top header sections =====================================//

  //Update Current DateTime every second
  function updateCurrentDatetime() {
    //Get current date and time
    const now = new Date();
    
    //Format options
    const options = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    };
    
    //Update UI
    document.getElementById("current-datetime").textContent = now.toLocaleString('en-US', options);
  }

  //Update every second
  setInterval(updateCurrentDatetime, 1000);
  updateCurrentDatetime();

  //Update Views Empty State based on country selection
  function updateViewsEmptyState() {
    //Check if a country is selected
    document.querySelectorAll(".view").forEach(view => {
      //Element to check country states
      const empty = view.querySelector(".empty-global-state");
      const content = view.querySelector(".display-global-state");

      if (!empty || !content) return;

      //if country is selected show content else show empty state
      if (isCountrySelected) {
        empty.classList.add("hidden");
        content.classList.remove("hidden");
        content.classList.add("flex");
      } else {
        empty.classList.remove("hidden");
        content.classList.remove("flex");
        empty.classList.add("flex");
        content.classList.add("hidden");
      }
    });
  }

  //navigate to dashboard on click of go to dashboard button
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-go-dashboard]");
    if (!btn) return;

    //Prevent default link behavior
    e.preventDefault();
    //Navigate to dashboard view
    router.navigate("dashboard");
  });

});