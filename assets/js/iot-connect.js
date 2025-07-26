// File: assets/js/iot-dashboard.js

// Required: config.js and auth-check.js must be loaded before this file

let bookingTrendChart = null;
let bookingTrendData = {
  labels: [],
  datasets: [{
    label: "Bookings",
    data: [],
    fill: false,
    borderColor: "#4F46E5",
    tension: 0.3
  }]
};

function initBookingTrendChart() {
  const ctxElement = document.getElementById("IoTBookingTrendChart");
  if (!ctxElement) {
    console.error("IoTBookingTrendChart canvas not found");
    return;
  }

  const ctx = ctxElement.getContext("2d");
  bookingTrendChart = new Chart(ctx, {
    type: "line",
    data: bookingTrendData,
    options: {
      responsive: true,
      scales: {
        x: {
          display: true,
          title: { display: true, text: "Time" }
        },
        y: {
          display: true,
          beginAtZero: true,
          title: { display: true, text: "Bookings" }
        }
      }
    }
  });
}

let speciesPieChart = null;
let speciesPieData = {
  labels: [],
  datasets: [{
    label: "Pet Species",
    data: [],
    backgroundColor: [
      "#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6"
    ]
  }]
};

function initSpeciesPieChart() {
  const ctx = document.getElementById("SpeciesPieChart");
  if (!ctx) {
    console.warn("SpeciesPieChart element not found");
    return;
  }

  speciesPieChart = new Chart(ctx, {
    type: "pie",
    data: speciesPieData,
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

async function connectToIoTDashboard() {
  const {
    AWS_REGION,
    IOT_ENDPOINT,
    IOT_TOPIC_DASHBOARD,
    IOT_CLIENT_PREFIX,
    IDENTITY_POOL_ID
  } = window.PETSTAY_CONFIG;

  AWS.config.region = AWS_REGION;

  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: IDENTITY_POOL_ID
  });

  try {
    await AWS.config.credentials.getPromise();
  } catch (err) {
    console.error("Failed to get AWS credentials:", err);
    return;
  }

  const mqttClient = window.AWSIoTData.device({
    region: AWS_REGION,
    host: IOT_ENDPOINT,
    protocol: 'wss',
    clientId: IOT_CLIENT_PREFIX + Math.floor(Math.random() * 100000),
    accessKeyId: AWS.config.credentials.accessKeyId,
    secretKey: AWS.config.credentials.secretAccessKey,
    sessionToken: AWS.config.credentials.sessionToken
  });

  mqttClient.on('connect', () => {
    console.log('Connected to AWS IoT Core');
    mqttClient.subscribe(IOT_TOPIC_DASHBOARD);
    console.log(`Subscribed to topic: ${IOT_TOPIC_DASHBOARD}`);
  });

  mqttClient.on('message', (topic, payload) => {
    try {
      const data = JSON.parse(payload.toString());
      console.log('IoT message received:', data);
      updateDashboardStats(data);
    } catch (err) {
      console.error("Failed to parse incoming message:", err);
    }
  });

  mqttClient.on('error', err => {
    console.error('MQTT error:', err.message || err);
  });
}

function updateDashboardStats(data) {
  const now = new Date().toLocaleTimeString();

  if (data.metric === "currentGuests") {
    document.getElementById("statCurrentGuests").textContent = data.value;

  } else if (data.metric === "availableRooms") {
    document.getElementById("statAvailableRooms").textContent = data.value;

  } else if (data.metric === "speciesStats") {
    document.getElementById("statSpeciesStats").textContent = JSON.stringify(data.value);

  } else if (data.metric === "bookingTrends") {
    const latest = data.value[data.value.length - 1];
    document.getElementById("statBookingTrends").textContent = latest;

    if (bookingTrendChart) {
      bookingTrendChart.data.labels.push(now);
      bookingTrendChart.data.datasets[0].data.push(latest);

      if (bookingTrendChart.data.labels.length > 20) {
        bookingTrendChart.data.labels.shift();
        bookingTrendChart.data.datasets[0].data.shift();
      }

      bookingTrendChart.update();
    }

  } else if (data.metric === "bookingUpdate") {
    const val = data.value;

    if (val.currentGuests !== undefined) {
      document.getElementById("statCurrentGuests").textContent = val.currentGuests;
    }

    if (val.availableRooms !== undefined) {
      document.getElementById("statAvailableRooms").textContent = val.availableRooms;
    }

    if (val.petSpecies !== undefined) {
      if (typeof val.petSpecies === 'object') {
        const text = Object.entries(val.petSpecies)
          .map(([species, count]) => `${species}: ${count}`)
          .join(', ');
        document.getElementById("statSpeciesStats").textContent = text;

        // Update the pie chart if available
        if (speciesPieChart) {
          speciesPieChart.data.labels = Object.keys(val.petSpecies);
          speciesPieChart.data.datasets[0].data = Object.values(val.petSpecies);
          speciesPieChart.update();
        }
      } else {
        document.getElementById("statSpeciesStats").textContent = val.petSpecies;
      }
    }

    if (val.bookingTrendPoint !== undefined && bookingTrendChart) {
      document.getElementById("statBookingTrends").textContent = val.bookingTrendPoint;

      bookingTrendChart.data.labels.push(now);
      bookingTrendChart.data.datasets[0].data.push(val.bookingTrendPoint);

      if (bookingTrendChart.data.labels.length > 20) {
        bookingTrendChart.data.labels.shift();
        bookingTrendChart.data.datasets[0].data.shift();
      }

      bookingTrendChart.update();
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initBookingTrendChart();
  connectToIoTDashboard();
});
