console.log("auth-check.js loaded");

// Load Amplify core modules from the global AWS Amplify script (if available)
const Amplify = window.aws_amplify?.Amplify || window.Amplify;
const Auth = window.aws_amplify?.Auth || window.Amplify?.Auth;
const Hub = window.aws_amplify?.Hub || window.Amplify?.Hub;
const AWS = window.AWS;

// Save current page URL (origin + path) for potential redirects
const currentUrl = window.location.origin + window.location.pathname;

// Define Amplify Auth configuration
const amplifyAuthConfig = {
  region: 'us-east-1',
  userPoolId: 'us-east-1_QIxGKKFzG',
  userPoolWebClientId: '7pk31b8a5ak2b7aj42qimaibhc',
      identityPoolId: 'us-east-1:25fbdcc1-9e3d-4655-adbf-679d2f895c0c', 
  oauth: {
    domain: 'us-east-1qixgkkfzg.auth.us-east-1.amazoncognito.com',
    scope: ['email', 'openid', 'phone'],
    redirectSignIn: 'https://main.d3esln33qx1ws1.amplifyapp.com/admin-frontend/post-login.html',
    redirectSignOut: 'https://main.d3esln33qx1ws1.amplifyapp.com/index.html',
    responseType: 'code',
  }
};

// Configure AWS SDK region
AWS.config.region = 'us-east-1';

/**
 * Function to attach IoT policy to Cognito identity
 */
const attachPolicyToIdentity = async (identityId) => {
  const iot = new AWS.Iot({ region: 'us-east-1' });
  try {
    await iot.attachPolicy({
      policyName: 'PetStayAdminIoTAccessPolicy',
      target: identityId
    }).promise();
    console.log('✅ IoT policy attached to identity:', identityId);
  } catch (error) {
    if (error.code === 'ResourceAlreadyExistsException') {
      console.log('ℹ️ IoT policy already attached to:', identityId);
    } else {
      console.error('❌ Failed to attach IoT policy:', error);
    }
  }
};

if (!Amplify || typeof Amplify.configure !== 'function') {
  console.error("Amplify not available or misconfigured.");
} else if (!Auth || !Hub) {
  console.error("Amplify.Auth or Amplify.Hub is missing.");
} else {
  Amplify.configure({ Auth: amplifyAuthConfig });

  Auth.currentSession()
    .then(session => {
      console.log("Session exists:", session);
      checkUser();
    })
    .catch(err => {
      console.warn("No active session yet:", err.message);
    });

  async function checkUser(retry = false) {
    const urlParams = new URLSearchParams(window.location.search);

    try {
      const user = await Auth.currentAuthenticatedUser({ bypassCache: true });
      console.log("Raw user object:", user);

      const session = await Auth.currentSession();
      const idTokenPayload = session.getIdToken().decodePayload();
      const email = idTokenPayload?.email || user.getUsername() || "Email not available";

      console.log("Email from ID token payload:", email);

      // Attach IoT policy
      const identityCredentials = await Auth.currentCredentials();
      const identityId = identityCredentials.identityId;
      console.log("Cognito Identity ID:", identityId);
      await attachPolicyToIdentity(identityId);

      window.petstayCurrentEmail = email;
      updateAdminEmail(email);

      if (urlParams.get("from") === "cognito") {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (err) {
      console.warn("Could not fetch authenticated user:", err.name, err.message);
      if (!retry) {
        console.warn("Retrying user check after 1s...");
        return setTimeout(() => checkUser(true), 1000);
      }

      updateAdminEmail("Not signed in");

      const justCameFromIndex = urlParams.get("from") === "index";
      const cameFromCognito = urlParams.get("from") === "cognito";

      if (justCameFromIndex || cameFromCognito) {
        console.warn("Avoiding redirect loop after login");
        return;
      }

      const { domain, redirectSignIn } = amplifyAuthConfig.oauth;
      const clientId = amplifyAuthConfig.userPoolWebClientId;

      const loginUrl = new URL(`https://${domain}/oauth2/authorize`);
      loginUrl.searchParams.set('client_id', clientId);
      loginUrl.searchParams.set('response_type', 'code');
      loginUrl.searchParams.set('scope', 'email openid phone');
      loginUrl.searchParams.set('redirect_uri', redirectSignIn);

      console.log("Redirecting to login page...");
      window.location.replace(loginUrl.toString());
    }
  }

  function updateAdminEmail(email) {
    const fallback = email || "Not signed in";

    const emailEl = document.getElementById('adminEmail');
    if (emailEl) {
      emailEl.innerHTML = fallback;
      console.log("Email set in #adminEmail:", fallback);
    }

    const dropdownEl = document.getElementById('adminEmailDropdown');
    if (dropdownEl) {
      dropdownEl.textContent = fallback;
      console.log("Email set in #adminEmailDropdown:", fallback);
    }
  }

  Hub.listen('auth', async (data) => {
    const { payload } = data;
    if (payload.event === 'signIn') {
      console.log("Auth event: signIn");
      checkUser(true);

      try {
        const session = await Auth.currentSession();
        console.log("ID Token Payload (Hub):", session.getIdToken().decodePayload());
        console.log("Access Token Payload (Hub):", session.getAccessToken().decodePayload());
      } catch (err) {
        console.warn("Failed to fetch token payload inside Hub listener:", err);
      }
    }
  });

  window.signOutUser = function () {
    console.log("Sign out triggered");

    Auth.currentSession()
      .then(session => {
        console.log("Session found");
        const idToken = session.getIdToken().getJwtToken();
        return Auth.signOut({ global: true }).then(() => idToken);
      })
      .then(idToken => {
        const { domain, redirectSignOut } = amplifyAuthConfig.oauth;
        const clientId = amplifyAuthConfig.userPoolWebClientId;

        const logoutUrl = new URL(`https://${domain}/logout`);
        logoutUrl.searchParams.append('client_id', clientId);
        logoutUrl.searchParams.append('logout_uri', redirectSignOut);
        logoutUrl.searchParams.append('id_token_hint', idToken);

        console.log("Redirecting to:", logoutUrl.toString());
        window.location.replace(logoutUrl.toString());
      })
      .catch(err => {
        console.error("Sign out failed:", err);
        window.location.replace(amplifyAuthConfig.oauth.redirectSignOut);
      });
  };

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      checkUser();

      const retryAttachSignOut = () => {
        const signOutEl = document.getElementById("signOutBtn");
        if (signOutEl) {
          signOutEl.addEventListener("click", window.signOutUser);
        } else {
          setTimeout(retryAttachSignOut, 300);
        }
      };

      retryAttachSignOut();
    }, 500);
  });
}
