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
  if (!ctxElement) return console.error("IoTBookingTrendChart canvas not found");
  const ctx = ctxElement.getContext("2d");
  bookingTrendChart = new Chart(ctx, {
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

let speciesPieChart = null;
let speciesPieData = {
  labels: [],
  datasets: [{
    label: "Pet Species",
    data: [],
    backgroundColor: ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6"]
  }]
};

function initSpeciesPieChart() {
  const ctx = document.getElementById("SpeciesPieChart");
  if (!ctx) return console.warn("SpeciesPieChart element not found");
  speciesPieChart = new Chart(ctx, {
    type: "pie",
    data: speciesPieData,
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

// AWS IoT Signature Helpers
function sha256(message) {
  return CryptoJS.SHA256(message).toString(CryptoJS.enc.Hex);
}
function hmac(key, msg) {
  return CryptoJS.HmacSHA256(CryptoJS.enc.Utf8.parse(msg), key);
}
function signUrl(endpoint, region, credentials) {
  const now = new Date();
  const amzdate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const datestamp = amzdate.slice(0, 8);
  const service = 'iotdevicegateway';
  const algorithm = 'AWS4-HMAC-SHA256';
  const method = 'GET';
  const canonicalUri = '/mqtt';
  const host = endpoint.replace(/^wss?:\/\//, '');
  const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;

  const queryParams = [
    `X-Amz-Algorithm=${algorithm}`,
    `X-Amz-Credential=${encodeURIComponent(credentials.accessKeyId + '/' + credentialScope)}`,
    `X-Amz-Date=${amzdate}`,
    `X-Amz-SignedHeaders=host`,
    `X-Amz-Security-Token=${encodeURIComponent(credentials.sessionToken)}`
  ];
  const canonicalQuerystring = queryParams.join('&');
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  const payloadHash = sha256('');
  const canonicalRequest = [method, canonicalUri, canonicalQuerystring, canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const stringToSign = [algorithm, amzdate, credentialScope, sha256(canonicalRequest)].join('\n');

  const kDate = hmac(CryptoJS.enc.Utf8.parse(`AWS4${credentials.secretAccessKey}`), datestamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');

  const signature = CryptoJS.HmacSHA256(stringToSign, kSigning).toString(CryptoJS.enc.Hex);
  return `wss://${host}${canonicalUri}?${canonicalQuerystring}&X-Amz-Signature=${signature}`;
}

let mqttClient = null;

async function connectToIoTDashboard() {
  const { AWS_REGION, IOT_ENDPOINT, IOT_TOPIC_DASHBOARD, IOT_CLIENT_PREFIX } = window.PETSTAY_CONFIG;
  try {
    const creds = await window.Amplify.Auth.currentCredentials();
    const signedUrl = signUrl(IOT_ENDPOINT, AWS_REGION, {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      sessionToken: creds.sessionToken
    });

    if (mqttClient) mqttClient.end(true);

    mqttClient = mqtt.connect(signedUrl, {
      clientId: `${IOT_CLIENT_PREFIX}${Math.floor(Math.random() * 100000)}`,
      keepalive: 60,
      clean: true,
      reconnectPeriod: 0
    });

    mqttClient.on('connect', () => {
      console.log('✅ Connected to AWS IoT Core');
      mqttClient.subscribe(IOT_TOPIC_DASHBOARD, (err) => {
        if (err) console.error('❌ Subscription error:', err.message);
        else console.log(`📡 Subscribed to topic: ${IOT_TOPIC_DASHBOARD}`);
      });
    });

    mqttClient.on('message', (topic, payload) => {
      try {
        const data = JSON.parse(payload.toString());
        console.log('📨 IoT message received:', data);
        updateDashboardStats(data);
      } catch (err) {
        console.error('❌ Failed to parse IoT message:', err);
      }
    });

    mqttClient.on('close', () => {
      console.warn('🔌 MQTT connection closed. Reconnecting in 10s...');
      setTimeout(connectToIoTDashboard, 10000);
    });

    mqttClient.on('error', (err) => {
      console.error('❌ MQTT error:', err.message || err);
    });

  } catch (err) {
    console.error('❌ Failed to authenticate or connect:', err);
    setTimeout(connectToIoTDashboard, 10000);
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
    if (val.currentGuests !== undefined)
      document.getElementById("statCurrentGuests").textContent = val.currentGuests;
    if (val.availableRooms !== undefined)
      document.getElementById("statAvailableRooms").textContent = val.availableRooms;
    if (val.petSpecies !== undefined) {
      const stat = typeof val.petSpecies === 'object'
        ? Object.entries(val.petSpecies).map(([k, v]) => `${k}: ${v}`).join(', ')
        : val.petSpecies;
      document.getElementById("statSpeciesStats").textContent = stat;

      if (speciesPieChart && typeof val.petSpecies === 'object') {
        speciesPieChart.data.labels = Object.keys(val.petSpecies);
        speciesPieChart.data.datasets[0].data = Object.values(val.petSpecies);
        speciesPieChart.update();
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

// Start when DOM is ready + user authenticated
document.addEventListener("DOMContentLoaded", () => {
  initBookingTrendChart();
  initSpeciesPieChart();

  const waitForAuth = setInterval(() => {
    if (window.petstayCurrentEmail && window.Amplify?.Auth) {
      clearInterval(waitForAuth);
      console.log("🔐 User authenticated. Connecting to IoT...");
      connectToIoTDashboard();
    }
  }, 300);
});
