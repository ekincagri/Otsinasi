importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCW3j9tUVrBjWcTCm4FgYpsLhnCPAjwUTM",
  authDomain: "otsinasi.firebaseapp.com",
  projectId: "otsinasi",
  storageBucket: "otsinasi.firebasestorage.app",
  messagingSenderId: "1079633350651",
  appId: "1:1079633350651:web:a8b42d4ffb1ed28626455e"
});

const messaging = firebase.messaging();

// Handle background messages - this fires when app is closed/background
messaging.onBackgroundMessage(payload => {
  console.log("Background message received:", payload);
  const title = payload.notification?.title || "OT Şinasi";
  const body = payload.notification?.body || "";
  
  self.registration.showNotification(title, {
    body: body,
    icon: "/icon-192.png",
    badge: "/icon-72.png",
    vibrate: [200, 100, 200],
    requireInteraction: false,
    tag: "ot-sinasi-notif"
  });
});

// Handle notification click
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow("/")
  );
});
