window.PETSTAY_CONFIG = {
  AWS_REGION: "{{AWS_REGION}}",
  COGNITO_USER_POOL_ID: "{{COGNITO_USER_POOL_ID}}",
  COGNITO_USER_POOL_CLIENT_ID: "{{COGNITO_USER_POOL_CLIENT_ID}}",
  COGNITO_DOMAIN: "{{COGNITO_DOMAIN}}",
  REDIRECT_SIGN_IN_URL: "{{REDIRECT_SIGN_IN_URL}}",
  REDIRECT_SIGN_OUT_URL: "{{REDIRECT_SIGN_OUT_URL}}",
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
