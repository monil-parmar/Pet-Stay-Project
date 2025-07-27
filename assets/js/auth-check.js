// File: assets/js/auth-check.js

console.log("auth-check.js loaded");

// Load Amplify core modules from the global AWS Amplify script (if available)
let Amplify = window.aws_amplify?.Amplify || window.Amplify;
let Auth = window.aws_amplify?.Auth || window.Amplify?.Auth;
let Hub = window.aws_amplify?.Hub || window.Amplify?.Hub;

// Save current page URL (origin + path) for potential redirects
const currentUrl = window.location.origin + window.location.pathname;

// Define Amplify Auth configuration
const amplifyAuthConfig = {
  region: 'us-east-1',
  userPoolId: 'us-east-1_QIxGKKFzG',
  userPoolWebClientId: '7pk31b8a5ak2b7aj42qimaibhc',
  oauth: {
    domain: 'us-east-1qixgkkfzg.auth.us-east-1.amazoncognito.com',
    scope: ['email', 'openid', 'phone'],
    redirectSignIn: 'https://main.d3esln33qx1ws1.amplifyapp.com/admin-frontend/post-login.html',
    redirectSignOut: 'https://main.d3esln33qx1ws1.amplifyapp.com/index.html',
    responseType: 'code',
  }
};

function initAuth() {
  if (!Amplify || typeof Amplify.configure !== 'function') {
    console.error("Amplify not available or misconfigured.");
    return;
  }
  if (!Auth || !Hub) {
    console.error("Amplify.Auth or Amplify.Hub is missing. Cannot proceed.");
    return;
  }

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
      const session = await Auth.currentSession();
      const idTokenPayload = session.getIdToken().decodePayload();
      const email = idTokenPayload?.email || user.getUsername() || "Email not available";

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
      if (justCameFromIndex || cameFromCognito) return;

      const { domain, redirectSignIn } = amplifyAuthConfig.oauth;
      const clientId = amplifyAuthConfig.userPoolWebClientId;
      const loginUrl = new URL(`https://${domain}/oauth2/authorize`);
      loginUrl.searchParams.set('client_id', clientId);
      loginUrl.searchParams.set('response_type', 'code');
      loginUrl.searchParams.set('scope', 'email openid phone');
      loginUrl.searchParams.set('redirect_uri', redirectSignIn);
      window.location.replace(loginUrl.toString());
    }
  }

  function updateAdminEmail(email) {
    const fallback = email || "Not signed in";
    const emailEl = document.getElementById('adminEmail');
    if (emailEl) {
      emailEl.innerHTML = fallback;
    }
    const dropdownEl = document.getElementById('adminEmailDropdown');
    if (dropdownEl) {
      dropdownEl.textContent = fallback;
    }
  }

  Hub.listen('auth', async (data) => {
    const { payload } = data;
    if (payload.event === 'signIn') {
      checkUser(true);
      try {
        const session = await Auth.currentSession();
        console.log("ID Token:", session.getIdToken().decodePayload());
        console.log("Access Token:", session.getAccessToken().decodePayload());
      } catch (err) {
        console.warn("Token fetch error:", err);
      }
    }
  });

  window.signOutUser = function () {
    Auth.currentSession()
      .then(session => {
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

// Retry logic
if (!Amplify || !Auth || !Hub) {
  console.warn("Amplify modules not ready — retrying in 200ms...");
  let attempts = 0;
  const maxAttempts = 5;
  const retryInterval = setInterval(() => {
    Amplify = window.Amplify;
    Auth = window.Amplify?.Auth;
    Hub = window.Amplify?.Hub;

    if (Amplify?.configure && Auth && Hub) {
      clearInterval(retryInterval);
      console.log("Amplify modules available after retry");
      initAuth();
    } else if (++attempts >= maxAttempts) {
      clearInterval(retryInterval);
      console.error("Amplify still not available after retries. Aborting.");
    }
  }, 200);
} else {
  initAuth();
}
