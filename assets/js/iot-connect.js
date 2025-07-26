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
  const ctx = document.getElementById("IoTBookingTrendChart").getContext("2d");
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

async function connectToIoTDashboard() {
  const {
    AWS_REGION,
    IOT_ENDPOINT,
    IOT_TOPIC_DASHBOARD,
    IOT_CLIENT_PREFIX
  } = window.PETSTAY_CONFIG;

  if (!AWS || !AWS.config || !AWS.config.credentials) {
    console.error("AWS credentials not available. Make sure user is signed in via Cognito.");
    return;
  }

  await AWS.config.credentials.getPromise();

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
    console.log(`📡 Subscribed to topic: ${IOT_TOPIC_DASHBOARD}`);
  });

  mqttClient.on('message', (topic, payload) => {
    const data = JSON.parse(payload.toString());
    console.log('Live message received:', data);
    updateDashboardStats(data);
  });

  mqttClient.on('error', err => {
    console.error('MQTT error:', err);
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
    document.getElementById("statBookingTrends").textContent = data.value[data.value.length - 1];

    if (bookingTrendChart) {
      bookingTrendData.labels.push(now);
      bookingTrendData.datasets[0].data.push(data.value[data.value.length - 1]);

      if (bookingTrendData.labels.length > 20) {
        bookingTrendData.labels.shift();
        bookingTrendData.datasets[0].data.shift();
      }

      bookingTrendChart.update();
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initBookingTrendChart();
  connectToIoTDashboard();
});
