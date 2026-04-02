const crypto = require("crypto");

// Create JWT without external dependencies
function createJWT(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging"
  })).toString("base64url");

  const signingInput = `${header}.${payload}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signingInput);
  const signature = sign.sign(serviceAccount.private_key, "base64url");
  return `${signingInput}.${signature}`;
}

exports.handler = async (event) => {
  const H = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: H, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: H, body: "Method not allowed" };

  try {
    const { title, body, tokens } = JSON.parse(event.body);
    if (!title || !body || !tokens || !tokens.length) {
      return { statusCode: 400, headers: H, body: JSON.stringify({ error: "Missing fields" }) };
    }

    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    const jwt = createJWT(sa);

    // Exchange JWT for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) throw new Error("Failed to get access token: " + JSON.stringify(tokenData));

    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
    let sent = 0;

    for (const token of tokens) {
      try {
        const res = await fetch(fcmUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: `🌿 OT Şinasi: ${title}`, body },
              webpush: {
                notification: {
                  title: `🌿 OT Şinasi: ${title}`,
                  body,
                  icon: "/icon-192.png",
                  badge: "/icon-72.png",
                  vibrate: [200, 100, 200]
                }
              }
            }
          })
        });
        const data = await res.json();
        if (data.name) sent++;
        else console.log("FCM error for token:", JSON.stringify(data));
      } catch (e) { console.error("Token error:", e); }
    }

    return { statusCode: 200, headers: H, body: JSON.stringify({ success: true, sent, total: tokens.length }) };
  } catch (err) {
    console.error("Push error:", err);
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: err.message }) };
  }
};
