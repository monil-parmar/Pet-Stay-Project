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
// Utility functions for signing AWS IoT requests
function sha256(message) {
  return CryptoJS.SHA256(message).toString(CryptoJS.enc.Hex);
}

function hmac(key, msg) {
  return CryptoJS.HmacSHA256(msg, key);
}

function signUrl(endpoint, region, credentials) {
  const now = new Date();
  const amzdate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const datestamp = amzdate.slice(0, 8);
  const service = 'iotdevicegateway';
  const algorithm = 'AWS4-HMAC-SHA256';
  const method = 'GET';
  const canonicalUri = '/mqtt';
  const host = endpoint;
  const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;

  const query = [
    `X-Amz-Algorithm=${algorithm}`,
    `X-Amz-Credential=${encodeURIComponent(credentials.accessKeyId + '/' + credentialScope)}`,
    `X-Amz-Date=${amzdate}`,
    `X-Amz-SignedHeaders=host`,
    `X-Amz-Security-Token=${encodeURIComponent(credentials.sessionToken)}`
  ];

  const canonicalQuerystring = query.join('&');
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  const payloadHash = sha256('');

  const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const stringToSign = `${algorithm}\n${amzdate}\n${credentialScope}\n${sha256(canonicalRequest)}`;

  const kDate = hmac(`AWS4${credentials.secretAccessKey}`, datestamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = CryptoJS.HmacSHA256(stringToSign, kSigning).toString(CryptoJS.enc.Hex);

  return `wss://${host}${canonicalUri}?${canonicalQuerystring}&X-Amz-Signature=${signature}`;
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
    const creds = AWS.config.credentials;
    const signedUrl = signUrl(IOT_ENDPOINT, AWS_REGION, creds);

    const mqttClient = mqtt.connect(signedUrl, {
      clientId: IOT_CLIENT_PREFIX + Math.floor(Math.random() * 100000),
      keepalive: 60,
      clean: true,
      reconnectPeriod: 4000
    });

    mqttClient.on('connect', () => {
      console.log('✅ Connected to AWS IoT Core');
      mqttClient.subscribe(IOT_TOPIC_DASHBOARD);
      console.log(`📡 Subscribed to topic: ${IOT_TOPIC_DASHBOARD}`);
    });

    mqttClient.on('message', (topic, payload) => {
      try {
        const data = JSON.parse(payload.toString());
        console.log('📨 IoT message received:', data);
        updateDashboardStats(data);
      } catch (err) {
        console.error('❌ Failed to parse incoming message:', err);
      }
    });

    mqttClient.on('error', err => {
      console.error('❌ MQTT error:', err.message || err);
    });

  } catch (err) {
    console.error("❌ Failed to get AWS credentials:", err);
  }
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
  initSpeciesPieChart();
  connectToIoTDashboard();
});
