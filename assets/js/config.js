window.PETSTAY_CONFIG = {
  AWS_REGION: 'us-east-1',
  COGNITO_USER_POOL_ID: 'us-east-1_QIxGKKFzG',
  COGNITO_USER_POOL_CLIENT_ID: '7pk31b8a5ak2b7aj42qimaibhc',
  COGNITO_DOMAIN: 'us-east-1qixgkkfzg.auth.us-east-1.amazoncognito.com',
  REDIRECT_SIGN_IN_URL: 'https://main.d3esln33qx1ws1.amplifyapp.com/admin-frontend/post-login.html',
  REDIRECT_SIGN_OUT_URL: 'https://main.d3esln33qx1ws1.amplifyapp.com/index.html',
  BOOKINGS_API_URL: 'https://jv0ycwac6i.execute-api.us-east-1.amazonaws.com/bookings',
  ROOMS_AVAILABILITY_API_URL: 'https://jv0ycwac6i.execute-api.us-east-1.amazonaws.com/PetStayAPI/rooms/availability',
  NEW_BOOKING_API_URL: 'https://jv0ycwac6i.execute-api.us-east-1.amazonaws.com/PetStayAPI/newbooking',
  CHECKIN_API_URL: 'https://jv0ycwac6i.execute-api.us-east-1.amazonaws.com/PetStayAPI/booking',
  BOOKING_STATUS_API_URL: 'https://jv0ycwac6i.execute-api.us-east-1.amazonaws.com/bookingStatus',

};

// Safety check: crash the page if placeholders were not replaced
for (const key in window.PETSTAY_CONFIG) {
  if (window.PETSTAY_CONFIG[key].includes("{{") || window.PETSTAY_CONFIG[key].includes("}}")) {
    throw new Error(`Missing config value: ${key}. Did you forget to set environment variables?`);
  }
}
