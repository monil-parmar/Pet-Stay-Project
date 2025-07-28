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

// Booking Trend Chart
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

// Species Pie Chart
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

// Preload historical booking trend
function preloadBookingTrend() {
  fetch("/get-booking-trend")
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

// AWS SigV4 Signing Helpers
function sha256(msg) {
  return CryptoJS.SHA256(msg).toString(CryptoJS.enc.Hex);
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

    if (mqttClient) mqttClient.end(true);

    mqttClient = mqtt.connect(signedUrl, {
      clientId: `${IOT_CLIENT_PREFIX}${Math.floor(Math.random() * 100000)}`,
      keepalive: 60,
      clean: true,
      reconnectPeriod: 10000
    });

    mqttClient.on('connect', () => {
      console.log('Connected to AWS IoT Core');
      mqttClient.subscribe(IOT_TOPIC_DASHBOARD, err => {
        if (err) console.error('Subscription error:', err.message);
        else console.log(`Subscribed to topic: ${IOT_TOPIC_DASHBOARD}`);
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

    mqttClient.on('error', err => console.error('MQTT error:', err.message || err));

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
});
