let bookingTrendChart = null;
let speciesPieChart = null;

const bookingTrendData = {
  labels: [],
  datasets: [{
    label: "Bookings",
    data: [],
    fill: false,
    borderColor: "#4F46E5",
    tension: 0.3
  }]
};

const speciesPieData = {
  labels: [],
  datasets: [{
    label: "Pet Species",
    data: [],
    backgroundColor: ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6"]
  }]
};

function initBookingTrendChart() {
  const ctxElement = document.getElementById("IoTBookingTrendChart");
  if (!ctxElement) return console.error("IoTBookingTrendChart canvas not found");
  bookingTrendChart = new Chart(ctxElement.getContext("2d"), {
    type: "line",
    data: bookingTrendData,
    options: {
      responsive: true,
      scales: {
        x: { display: true, title: { display: true, text: "Time" } },
        y: { display: true, beginAtZero: true, title: { display: true, text: "Bookings" } }
      }
    }
  });
}

function initSpeciesPieChart() {
  const ctx = document.getElementById("SpeciesPieChart");
  if (!ctx) return console.warn("SpeciesPieChart element not found");
  speciesPieChart = new Chart(ctx.getContext("2d"), {
    type: "pie",
    data: speciesPieData,
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function preloadBookingTrend() {
  fetch(`${window.PETSTAY_CONFIG.API_BASE_URL}/get-booking-trend`)
    .then(res => res.json())
    .then(data => {
      if (!bookingTrendChart) return;
      bookingTrendChart.data.labels = data.map(d => d.time);
      bookingTrendChart.data.datasets[0].data = data.map(d => d.count);
      bookingTrendChart.update();
      console.log("Booking trend preloaded:", data);
    })
    .catch(err => console.error("Failed to preload booking trend:", err));
}

// AWS SigV4 helpers (sha256, hmac, signUrl) - use your existing code here

let mqttClient = null;
let statsUpdateTimer = null;
let latestStatsPayload = null;

function queueStatsUpdate(data) {
  latestStatsPayload = data;
  if (statsUpdateTimer) clearTimeout(statsUpdateTimer);
  statsUpdateTimer = setTimeout(() => {
    updateDashboardStats(latestStatsPayload);
    latestStatsPayload = null;
    statsUpdateTimer = null;
  }, 2000);
}

async function connectToIoTDashboard() {
  const { AWS_REGION, IOT_ENDPOINT, IOT_TOPIC_DASHBOARD, IOT_CLIENT_PREFIX } = window.PETSTAY_CONFIG;

  try {
    const creds = await window.Amplify.Auth.currentCredentials();
    const signedUrl = signUrl(IOT_ENDPOINT, AWS_REGION, creds);

    // Cleanly end previous MQTT connection if any
    if (mqttClient) {
      mqttClient.end(true);
      mqttClient = null;
    }

    mqttClient = mqtt.connect(signedUrl, {
      clientId: `${IOT_CLIENT_PREFIX}${Math.floor(Math.random() * 100000)}`,
      keepalive: 60,
      clean: true,
      reconnectPeriod: 10000,
    });

    mqttClient.on('connect', () => {
      console.log('Connected to AWS IoT Core');

      mqttClient.subscribe(IOT_TOPIC_DASHBOARD, err => {
        if (err) {
          console.error('Subscription error:', err.message);
          return;
        }
        console.log(`Subscribed to topic: ${IOT_TOPIC_DASHBOARD}`);

        // Update admin email on successful subscription
        window.Amplify.Auth.currentSession()
          .then(session => {
            const email = session.getIdToken().decodePayload().email || "Unknown admin";
            const emailEl = document.getElementById("adminEmail");
            const dropdownEl = document.getElementById("adminEmailDropdown");
            if (emailEl) emailEl.textContent = email;
            if (dropdownEl) dropdownEl.textContent = email;
          })
          .catch(err => {
            console.warn("Failed to get admin email after connect:", err);
          });
      });
    });

    mqttClient.on('message', (topic, payload) => {
      try {
        const data = JSON.parse(payload.toString());
        console.log('IoT message received:', data);
        queueStatsUpdate(data);
      } catch (err) {
        console.error('Failed to parse IoT message:', err);
      }
    });

    mqttClient.on('error', err => {
      console.error('MQTT error:', err.message || err);
    });

  } catch (err) {
    console.error('Failed to authenticate or connect:', err);
  }
}

let lastStats = {
  currentGuests: null,
  availableRooms: null,
  petSpecies: {},
  bookingTrendPoint: null
};

function updateDashboardStats(data) {
  const now = new Date().toLocaleTimeString();
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  if (data.metric === "bookingUpdate") {
    const val = data.value;
    const changes = {};

    if (val.currentGuests !== undefined && val.currentGuests !== lastStats.currentGuests) {
      setText("statCurrentGuests", val.currentGuests);
      lastStats.currentGuests = val.currentGuests;
      changes.currentGuests = true;
    }

    if (val.availableRooms !== undefined && val.availableRooms !== lastStats.availableRooms) {
      setText("statAvailableRooms", val.availableRooms);
      lastStats.availableRooms = val.availableRooms;
      changes.availableRooms = true;
    }

    if (val.petSpecies && JSON.stringify(val.petSpecies) !== JSON.stringify(lastStats.petSpecies)) {
      const stat = Object.entries(val.petSpecies).map(([k, v]) => `${k}: ${v}`).join(' | ');
      setText("statSpeciesStats", stat);
      if (speciesPieChart) {
        speciesPieChart.data.labels = Object.keys(val.petSpecies);
        speciesPieChart.data.datasets[0].data = Object.values(val.petSpecies);
        speciesPieChart.update();
      }
      lastStats.petSpecies = { ...val.petSpecies };
      changes.petSpecies = true;
    }

    if (val.bookingTrendPoint !== undefined && val.bookingTrendPoint !== lastStats.bookingTrendPoint) {
      setText("statBookingTrends", val.bookingTrendPoint);
      if (bookingTrendChart) {
        bookingTrendChart.data.labels.push(now);
        bookingTrendChart.data.datasets[0].data.push(val.bookingTrendPoint);
        if (bookingTrendChart.data.labels.length > 20) {
          bookingTrendChart.data.labels.shift();
          bookingTrendChart.data.datasets[0].data.shift();
        }
        bookingTrendChart.update();
      }
      lastStats.bookingTrendPoint = val.bookingTrendPoint;
      changes.bookingTrendPoint = true;
    }

    if (Object.keys(changes).length === 0) {
      console.log("Duplicate update ignored");
    }
  }
}

// Sign out function to cleanly disconnect MQTT and sign out user
function signOutUser() {
  if (mqttClient) {
    mqttClient.end(true);
    mqttClient = null;
  }
  window.Amplify.Auth.signOut({ global: true })
    .then(() => {
      window.location.href = window.PETSTAY_CONFIG.REDIRECT_SIGN_OUT_URL || '/index.html';
    })
    .catch(err => {
      console.error("Sign out failed:", err);
      window.location.href = window.PETSTAY_CONFIG.REDIRECT_SIGN_OUT_URL || '/index.html';
    });
}

document.addEventListener("DOMContentLoaded", async () => {
  initBookingTrendChart();
  initSpeciesPieChart();
  preloadBookingTrend();

  try {
    await window.Amplify.Auth.currentAuthenticatedUser();
    console.log("User authenticated. Connecting to IoT...");
    connectToIoTDashboard();
  } catch {
    console.warn("User not authenticated — skipping IoT connection");
    ["statBookingTrends", "statCurrentGuests", "statAvailableRooms", "statSpeciesStats"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = "Auth failed";
    });
  }

  // Attach sign-out button listener
  const signOutBtn = document.getElementById("signOutBtn");
  if (signOutBtn) {
    signOutBtn.addEventListener("click", signOutUser);
  }
});
