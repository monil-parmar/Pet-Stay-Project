window.PETSTAY_CONFIG = {
  AWS_REGION: 'us-east-1',
  COGNITO_USER_POOL_ID: 'us-east-1_uTMQmx2SD',
  COGNITO_USER_POOL_CLIENT_ID: '5u02so0464u5ioglr5831g92k8',
  COGNITO_DOMAIN: 'https://us-east-1utmqmx2sd.auth.us-east-1.amazoncognito.com',
  REDIRECT_SIGN_IN_URL: 'https://main.d3esln33qx1ws1.amplifyapp.com/admin-frontend/post-login.html',
  REDIRECT_SIGN_OUT_URL: 'https://main.d3esln33qx1ws1.amplifyapp.com/index.html',
  BOOKINGS_API_URL: "{{BOOKINGS_API_URL}}",
  ROOMS_AVAILABILITY_API_URL: "{{ROOMS_AVAILABILITY_API_URL}}",
  NEW_BOOKING_API_URL: "{{NEW_BOOKING_API_URL}}",
  CHECKIN_API_URL: "{{CHECKIN_API_URL}}"
};

// Safety check: crash the page if placeholders were not replaced
for (const key in window.PETSTAY_CONFIG) {
  if (window.PETSTAY_CONFIG[key].includes("{{") || window.PETSTAY_CONFIG[key].includes("}}")) {
    throw new Error(`Missing config value: ${key}. Did you forget to set environment variables?`);
  }
}
