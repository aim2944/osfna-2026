(() => {
  if (window.__osfnaWelcomeShown) return;
  window.__osfnaWelcomeShown = true;

  const GC_URL = 'https://ig.me/j/AbaBi7Pe-ECpvguw/';
  const SESSION_KEY = 'osfna_welcome_seen';

  if (sessionStorage.getItem(SESSION_KEY) === '1') return;

  const hasTicket = !!localStorage.getItem('osfna_token');
  const qrHref = hasTicket ? 'ticket.html' : 'passport.html?mode=login';
  const qrLabel = hasTicket ? 'Show My QR →' : 'Sign In · Show My QR →';

  const css = `
    .osfna-welcome-overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(7,7,7,0.78);
      backdrop-filter: blur(10px);
      display: flex; align-items: center; justify-content: center;
      padding: 1.25rem;
      animation: osfnaFadeIn 0.25s ease-out;
    }
    @keyframes osfnaFadeIn { from { opacity: 0 } to { opacity: 1 } }
    @keyframes osfnaSlideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
    .osfna-welcome-card {
      position: relative;
      width: 100%; max-width: 460px;
      background: #fff7ee;
      border-radius: 28px;
      padding: 2rem 1.75rem 1.75rem;
      box-shadow: 0 30px 80px rgba(0,0,0,0.45);
      animation: osfnaSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      max-height: 92vh; overflow-y: auto;
    }
    .osfna-welcome-close {
      position: absolute; top: 0.85rem; right: 0.85rem;
      width: 36px; height: 36px;
      border: none; background: rgba(7,7,7,0.06);
      border-radius: 50%; cursor: pointer;
      font-size: 1.2rem; color: #070707; line-height: 1;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
    }
    .osfna-welcome-close:hover { background: rgba(7,7,7,0.12); }
    .osfna-welcome-eyebrow {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.66rem; letter-spacing: 0.24em;
      text-transform: uppercase; color: #ef1b22;
      margin-bottom: 0.65rem;
    }
    .osfna-welcome-title {
      font-family: var(--font-display, "Bebas Neue", "Oswald", sans-serif);
      font-size: clamp(1.85rem, 6vw, 2.4rem);
      line-height: 1; letter-spacing: -0.03em;
      color: #070707; margin: 0 0 0.65rem;
    }
    .osfna-welcome-title span { color: #ef1b22; }
    .osfna-welcome-sub {
      font-size: 0.95rem; line-height: 1.55;
      color: rgba(7,7,7,0.65); margin: 0 0 1.4rem;
    }
    .osfna-welcome-btns {
      display: flex; flex-direction: column; gap: 0.65rem;
    }
    .osfna-btn {
      display: flex; align-items: center; justify-content: center;
      gap: 0.55rem;
      padding: 1rem 1.2rem;
      border-radius: 999px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.78rem; letter-spacing: 0.14em;
      text-transform: uppercase; font-weight: 700;
      text-decoration: none; cursor: pointer;
      border: none; transition: transform 0.15s, opacity 0.15s;
      width: 100%;
    }
    .osfna-btn:hover { transform: translateY(-2px); opacity: 0.94; }
    .osfna-btn-ig {
      background: linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%);
      color: #fff;
      box-shadow: 0 14px 32px rgba(253,29,29,0.28);
    }
    .osfna-btn-qr {
      background: #070707; color: #fff7ee;
    }
    .osfna-btn-share {
      background: transparent; color: #070707;
      border: 1px solid rgba(7,7,7,0.16);
    }
    .osfna-btn-share:hover {
      border-color: #ef1b22; color: #ef1b22;
    }
    .osfna-btn-concert {
      background: #ef1b22; color: #fff;
      box-shadow: 0 14px 32px rgba(239,27,34,0.28);
    }
    .osfna-btn-concert .price {
      background: rgba(255,255,255,0.18);
      padding: 0.18rem 0.5rem;
      border-radius: 999px;
      margin-left: 0.4rem;
      font-size: 0.7rem;
    }
    .osfna-btn svg { width: 18px; height: 18px; flex-shrink: 0; }
    .osfna-welcome-note {
      margin: 1.1rem 0 0;
      font-size: 0.78rem; line-height: 1.5;
      color: rgba(7,7,7,0.45); text-align: center;
    }
    .osfna-welcome-note strong { color: #070707; font-weight: 700; }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  const overlay = document.createElement('div');
  overlay.className = 'osfna-welcome-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'osfna-welcome-title');
  overlay.innerHTML = `
    <div class="osfna-welcome-card">
      <button class="osfna-welcome-close" aria-label="Close">×</button>
      <p class="osfna-welcome-eyebrow">OSFNA 2026 · Minneapolis</p>
      <h2 class="osfna-welcome-title" id="osfna-welcome-title">Join the GC<br>or <span>show your QR</span>.</h2>
      <p class="osfna-welcome-sub">All party drops, venues, and updates run through the @osfna2026 Instagram group chat. Already have a ticket? Pull up your QR for the door.</p>
      <div class="osfna-welcome-btns">
        <a href="${GC_URL}" target="_blank" rel="noopener" class="osfna-btn osfna-btn-ig" data-action="ig">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.8.07 1.2.06 1.8.25 2.2.42.6.22 1 .5 1.5 1 .5.5.78.9 1 1.5.17.4.36 1 .42 2.2.06 1.2.07 1.6.07 4.8s0 3.6-.07 4.8c-.06 1.2-.25 1.8-.42 2.2-.22.6-.5 1-1 1.5-.5.5-.9.78-1.5 1-.4.17-1 .36-2.2.42-1.2.06-1.6.07-4.8.07s-3.6 0-4.8-.07c-1.2-.06-1.8-.25-2.2-.42-.6-.22-1-.5-1.5-1-.5-.5-.78-.9-1-1.5-.17-.4-.36-1-.42-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.8c.06-1.2.25-1.8.42-2.2.22-.6.5-1 1-1.5.5-.5.9-.78 1.5-1 .4-.17 1-.36 2.2-.42C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.15 0-3.5 0-4.7.07-1.1.05-1.7.23-2.1.39-.5.2-.9.43-1.3.83-.4.4-.63.8-.83 1.3-.16.4-.34 1-.39 2.1C2.6 8.5 2.6 8.85 2.6 12s0 3.5.07 4.7c.05 1.1.23 1.7.39 2.1.2.5.43.9.83 1.3.4.4.8.63 1.3.83.4.16 1 .34 2.1.39 1.2.07 1.55.07 4.7.07s3.5 0 4.7-.07c1.1-.05 1.7-.23 2.1-.39.5-.2.9-.43 1.3-.83.4-.4.63-.8.83-1.3.16-.4.34-1 .39-2.1.07-1.2.07-1.55.07-4.7s0-3.5-.07-4.7c-.05-1.1-.23-1.7-.39-2.1-.2-.5-.43-.9-.83-1.3-.4-.4-.8-.63-1.3-.83-.4-.16-1-.34-2.1-.39C15.5 4 15.15 4 12 4zm0 3.06A4.94 4.94 0 1 1 7.06 12 4.94 4.94 0 0 1 12 7.06zm0 8.14A3.2 3.2 0 1 0 8.8 12 3.2 3.2 0 0 0 12 15.2zm5.13-8.34a1.15 1.15 0 1 1-1.15-1.15 1.15 1.15 0 0 1 1.15 1.15z"/></svg>
          Join the GC on Instagram
        </a>
        <a href="${qrHref}" class="osfna-btn osfna-btn-qr" data-action="qr">${qrLabel}</a>
        <a href="register.html#basketball" class="osfna-btn osfna-btn-share" data-action="bball">🏀 Register 4v4 Basketball — Cash Prize</a>
        <button type="button" class="osfna-btn osfna-btn-concert" data-action="concert">🎤 Pre-order Closing Night Concert</button>
      </div>
      <p class="osfna-welcome-note">Sign-up is on Instagram. Follow <strong>@osfna2026</strong> + DM <strong>JOIN</strong>.</p>
    </div>
  `;

  function close() {
    sessionStorage.setItem(SESSION_KEY, '1');
    overlay.style.animation = 'osfnaFadeIn 0.18s reverse';
    setTimeout(() => overlay.remove(), 180);
  }

  overlay.querySelector('.osfna-welcome-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('[data-action="ig"]').addEventListener('click', () => {
    sessionStorage.setItem(SESSION_KEY, '1');
  });
  overlay.querySelector('[data-action="qr"]').addEventListener('click', () => {
    sessionStorage.setItem(SESSION_KEY, '1');
  });
  overlay.querySelector('[data-action="bball"]').addEventListener('click', () => {
    sessionStorage.setItem(SESSION_KEY, '1');
  });
  overlay.querySelector('[data-action="concert"]').addEventListener('click', async (e) => {
    sessionStorage.setItem(SESSION_KEY, '1');
    const btn = e.currentTarget;
    const text = "OSFNA 2026 — Closing Night Concert\n\nI'd like to pre-order the early bird ticket for Aug 1 in Minneapolis. How do I lock it in?";
    try { await navigator.clipboard.writeText(text); } catch {}
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
    const igAppUrl = 'instagram://direct/new?username=osfna2026';
    const igWebUrl = 'https://ig.me/m/osfna2026';
    btn.innerHTML = '✓ Message copied — opening IG…';
    if (isMobile) {
      window.location.href = igAppUrl;
      setTimeout(() => { window.location.href = igWebUrl; }, 800);
    } else {
      window.open(igWebUrl, '_blank', 'noopener');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.contains(overlay)) close();
  });

  function mount() { document.body.appendChild(overlay); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
