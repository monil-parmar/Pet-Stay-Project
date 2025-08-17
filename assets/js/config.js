window.PETSTAY_CONFIG = {
  AWS_REGION: 'us-east-1',
  COGNITO_USER_POOL_ID: 'us-east-1_QIxGKKFzG',
  COGNITO_USER_POOL_CLIENT_ID: '7pk31b8a5ak2b7aj42qimaibhc',
  COGNITO_DOMAIN: 'us-east-1qixgkkfzg.auth.us-east-1.amazoncognito.com',

  REDIRECT_SIGN_IN_URL: 'https://main.d3esln33qx1ws1.amplifyapp.com/admin-frontend/post-login.html',
  REDIRECT_ADMIN_SIGN_IN_URL: 'https://main.d3esln33qx1ws1.amplifyapp.com/admin-frontend/post-login.html',
  REDIRECT_SIGN_OUT_URL: 'https://main.d3esln33qx1ws1.amplifyapp.com/index.html',

  API_BASE_URL: 'https://24q261zi50.execute-api.us-east-1.amazonaws.com',
  BOOKING_API_URL: 'https://24q261zi50.execute-api.us-east-1.amazonaws.com/booking',
  BOOKING_STATUS_API_URL: 'https://24q261zi50.execute-api.us-east-1.amazonaws.com/bookingStatus',
  BOOKINGS_API_URL: 'https://24q261zi50.execute-api.us-east-1.amazonaws.com/bookings',
  ROOMS_AVAILABILITY_API_URL: 'https://24q261zi50.execute-api.us-east-1.amazonaws.com/rooms/availability',
  NEW_BOOKING_API_URL: 'https://24q261zi50.execute-api.us-east-1.amazonaws.com/newbooking',
  CONFIRM_BOOKING_URL: 'https://24q261zi50.execute-api.us-east-1.amazonaws.com/confirm',
  CANCEL_BOOKING_URL: 'https://24q261zi50.execute-api.us-east-1.amazonaws.com/cancel',
  CHECKIN_BOOKING_URL: 'https://24q261zi50.execute-api.us-east-1.amazonaws.com/checkin',
  CHECKOUT_BOOKING_URL: 'https://24q261zi50.execute-api.us-east-1.amazonaws.com/checkout',
  RESTORE_BOOKING_URL: 'https://24q261zi50.execute-api.us-east-1.amazonaws.com/restore',
  PET_PHOTO_UPLOAD_URL: 'https://24q261zi50.execute-api.us-east-1.amazonaws.com/upload-url',
  PET_PHOTO_PUBLIC_URL_BASE: 'https://petstay-pet-photos-101486688.s3.amazonaws.com',

  // IOT Dashboard
  IOT_DASHBOARD_API_URL: 'https://24q261zi50.execute-api.us-east-1.amazonaws.com/get-booking-trend',
  IOT_ENDPOINT: 'a14wno4fkns9pt-ats.iot.us-east-1.amazonaws.com', 
  IOT_TOPIC_DASHBOARD: 'petstay/admin/stats',  
  IOT_CLIENT_PREFIX: 'admin-dashboard-',                       
  IDENTITY_POOL_ID: 'us-east-1:25fbdcc1-9e3d-4655-adbf-679d2f895c0c',
  
  // Chatbot (Amazon Lex V2)
  LEX: {
    REGION: 'us-east-1',
    IDENTITY_POOL_ID: 'us-east-1:25fbdcc1-9e3d-4655-adbf-679d2f895c0c',
    BOT_ID: 'XGNJJAPNG6',
    BOT_ALIAS_ID: 'FTIHLZB6PM',
    LOCALE_ID: 'en_US',
    BOT_ALIAS_NAME : 'prod',
    BOT_NAME : 'PetStayChatBot',
  }
};

for (const key in window.PETSTAY_CONFIG) {
  const val = window.PETSTAY_CONFIG[key];
  if (typeof val === 'string' && (val.includes('{{') || val.includes('}}'))) {
    throw new Error(`Missing config value: ${key}. Did you forget to set environment variables?`);
  }
}




// window.PETSTAY_CONFIG = {
//   AWS_REGION: '{{AWS_REGION}}',  // e.g., 'us-east-1'
//   COGNITO_USER_POOL_ID: '{{COGNITO_USER_POOL_ID}}',
//   COGNITO_USER_POOL_CLIENT_ID: '{{COGNITO_USER_POOL_CLIENT_ID}}',
//   COGNITO_DOMAIN: '{{COGNITO_DOMAIN}}',  // e.g., 'yourdomain.auth.us-east-1.amazoncognito.com'

//   // Redirect after staff login (check-in page)
//   REDIRECT_SIGN_IN_URL: '{{REDIRECT_SIGN_IN_URL}}',  // e.g., 'https://yourdomain/checkin.html'

//   // Redirect after logout
//   REDIRECT_SIGN_OUT_URL: '{{REDIRECT_SIGN_OUT_URL}}',  // e.g., 'https://yourdomain/index.html'

//   // Redirect after admin login
//   REDIRECT_ADMIN_SIGN_IN_URL: '{{REDIRECT_ADMIN_SIGN_IN_URL}}',  // e.g., 'https://yourdomain/admin/post-login.html'

//   API_BASE_URL: '{{API_BASE_URL}}',
//   BOOKING_API_URL: '{{BOOKING_API_URL}}',
//   BOOKING_STATUS_API_URL: '{{BOOKING_STATUS_API_URL}}',
//   BOOKINGS_API_URL: '{{BOOKINGS_API_URL}}',
//   ROOMS_AVAILABILITY_API_URL: '{{ROOMS_AVAILABILITY_API_URL}}',
//   NEW_BOOKING_API_URL: '{{NEW_BOOKING_API_URL}}',
//   CONFIRM_BOOKING_URL: '{{CONFIRM_BOOKING_URL}}',
//   CANCEL_BOOKING_URL: '{{CANCEL_BOOKING_URL}}',
//   CHECKIN_BOOKING_URL: '{{CHECKIN_BOOKING_URL}}',
//   CHECKOUT_BOOKING_URL: '{{CHECKOUT_BOOKING_URL}}',
//   RESTORE_BOOKING_URL: '{{RESTORE_BOOKING_URL}}'
// };

// // Validate config: prevent accidental deployment with missing placeholders
// for (const key in window.PETSTAY_CONFIG) {
//   if (window.PETSTAY_CONFIG[key].includes("{{") || window.PETSTAY_CONFIG[key].includes("}}")) {
//     throw new Error(`Missing config value: ${key}. Did you forget to set environment variables?`);
//   }
// }
