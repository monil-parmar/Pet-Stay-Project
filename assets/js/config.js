window.PETSTAY_CONFIG = {
  // AWS and Cognito Config
  AWS_REGION: 'us-east-1',
  COGNITO_USER_POOL_ID: 'us-east-1_QIxGKKFzG',
  COGNITO_USER_POOL_CLIENT_ID: '7pk31b8a5ak2b7aj42qimaibhc',
  COGNITO_DOMAIN: 'us-east-1qixgkkfzg.auth.us-east-1.amazoncognito.com',
  REDIRECT_SIGN_IN_URL: 'https://main.d3esln33qx1ws1.amplifyapp.com/admin-frontend/post-login.html',
  REDIRECT_SIGN_OUT_URL: 'https://main.d3esln33qx1ws1.amplifyapp.com/index.html',

  // API Base
  API_BASE_URL: 'https://24q261zi50.execute-api.us-east-1.amazonaws.com',

  // Public GET APIs — used in customer-facing pages like checkin.html
  BOOKING_API_URL: 'https://24q261zi50.execute-api.us-east-1.amazonaws.com/booking',             // GET /booking/{bookingId}
  BOOKING_STATUS_API_URL: 'https://24q261zi50.execute-api.us-east-1.amazonaws.com/bookingStatus', // GET /bookingStatus/{executionArn}

  // Admin Dashboard GET APIs
  BOOKINGS_API_URL: 'https://24q261zi50.execute-api.us-east-1.amazonaws.com/bookings',           // GET /bookings
  ROOMS_AVAILABILITY_API_URL: 'https://24q261zi50.execute-api.us-east-1.amazonaws.com/rooms/availability',

  // New Booking (Step Functions)
  NEW_BOOKING_API_URL: 'https://24q261zi50.execute-api.us-east-1.amazonaws.com/newbooking',      // POST /newbooking

  // Unified Admin Booking Action Base URL — POST to /booking/{id}/{action}
  BOOKING_ACTION_BASE_URL: 'https://24q261zi50.execute-api.us-east-1.amazonaws.com/booking'
  
};

// Safety check
for (const key in window.PETSTAY_CONFIG) {
  if (window.PETSTAY_CONFIG[key].includes("{{") || window.PETSTAY_CONFIG[key].includes("}}")) {
    throw new Error(`Missing config value: ${key}. Did you forget to set environment variables?`);
  }
}
