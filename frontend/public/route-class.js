// Marks staff-app pages before React loads (index.html styles the loading screen with it).
try {
  if (/^\/app(\/|$)/.test(window.location.pathname)) {
    document.documentElement.classList.add('is-admin-route');
  }
} catch (e) {}
