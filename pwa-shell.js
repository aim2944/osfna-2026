(() => {
  const TOPIC_DEFAULTS = ['scores', 'scarcity', 'gates'];
  let swReadyPromise = null;

  function base64UrlToUint8Array(value) {
    const padding = '='.repeat((4 - (value.length % 4)) % 4);
    const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
    return output;
  }

  function installPullToRefreshGuard() {
    let startY = 0;

    document.addEventListener('touchstart', (event) => {
      if (event.touches.length !== 1) return;
      startY = event.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchmove', (event) => {
      if (event.touches.length !== 1) return;
      const currentY = event.touches[0].clientY;
      const pulling = window.scrollY <= 0 && currentY - startY > 12;
      if (pulling) event.preventDefault();
    }, { passive: false });
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return null;
    if (!swReadyPromise) {
      swReadyPromise = navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(async (registration) => {
          if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          await navigator.serviceWorker.ready;
          return registration;
        })
        .catch((error) => {
          console.error('[pwa-shell] service worker registration failed', error);
          return null;
        });
    }
    return swReadyPromise;
  }

  async function getPushPublicKey() {
    const response = await fetch('/api/push?mode=public-key', { cache: 'no-store' });
    if (!response.ok) throw new Error('Push public key is unavailable');
    const payload = await response.json();
    if (!payload.publicKey) throw new Error('Missing VAPID public key');
    return payload.publicKey;
  }

  async function subscribeToPush(topics = TOPIC_DEFAULTS) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      throw new Error('Push notifications are not supported on this device');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Notification permission was not granted');

    const registration = await registerServiceWorker();
    if (!registration) throw new Error('Service worker is not ready');

    const publicKey = await getPushPublicKey();
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing || await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(publicKey),
    });

    const token = localStorage.getItem('osfna_token');
    const response = await fetch('/api/push?mode=subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        subscription,
        topics,
        user_agent: navigator.userAgent,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Could not save the push subscription');
    }

    return subscription;
  }

  function bindAlertButtons() {
    document.querySelectorAll('[data-enable-alerts]').forEach((button) => {
      button.addEventListener('click', async () => {
        const originalText = button.dataset.label || button.textContent;
        button.dataset.label = originalText;
        button.disabled = true;
        button.textContent = 'Connecting alerts…';

        try {
          await subscribeToPush(button.dataset.pushTopics?.split(',').map((item) => item.trim()).filter(Boolean) || TOPIC_DEFAULTS);
          button.textContent = 'Alerts Enabled';
          button.dataset.pushState = 'enabled';
        } catch (error) {
          console.error('[pwa-shell] push subscribe failed', error);
          button.disabled = false;
          button.textContent = originalText;
          const statusEl = document.querySelector(button.dataset.statusTarget || '');
          if (statusEl) statusEl.textContent = error.message;
        }
      });
    });
  }

  document.documentElement.style.overscrollBehaviorY = 'none';
  document.body.style.overscrollBehaviorY = 'none';
  installPullToRefreshGuard();
  registerServiceWorker();
  bindAlertButtons();

  window.OSFNANativeShell = {
    registerServiceWorker,
    subscribeToPush,
  };
})();
