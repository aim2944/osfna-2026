// =============================================
// OSFNA 2026 — script.js
// =============================================

// ---- CONFIGURATION ----
// OSFNA 2026: July 25 – Aug 1, 2026
const EVENT_DATE = new Date('2026-07-25T10:00:00');

// ---- COUNTDOWN TIMER ----
function updateCountdown() {
  const now = new Date();
  const diff = EVENT_DATE - now;

  if (diff <= 0) {
    document.getElementById('cd-days').textContent = '00';
    document.getElementById('cd-hours').textContent = '00';
    document.getElementById('cd-mins').textContent = '00';
    document.getElementById('cd-secs').textContent = '00';
    return;
  }

  const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs  = Math.floor((diff % (1000 * 60)) / 1000);

  const pad = n => String(n).padStart(2, '0');
  document.getElementById('cd-days').textContent  = pad(days);
  document.getElementById('cd-hours').textContent = pad(hours);
  document.getElementById('cd-mins').textContent  = pad(mins);
  document.getElementById('cd-secs').textContent  = pad(secs);
}

setInterval(updateCountdown, 1000);
updateCountdown();

// ---- NAVBAR SCROLL ----
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// ---- MOBILE NAV ----
const hamburger = document.querySelector('.hamburger');
const mobileMenu = document.querySelector('.mobile-menu');

hamburger.addEventListener('click', () => {
  const isOpen = hamburger.classList.toggle('open');
  mobileMenu.classList.toggle('open', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
});

mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  });
});

// ---- SCROLL REVEAL ----
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);
revealEls.forEach(el => revealObserver.observe(el));

// ---- GALLERY LIGHTBOX ----
const galleryLightbox = document.getElementById('gallery-lightbox');
if (galleryLightbox) {
  const lightboxClose = document.querySelector('.lightbox-close');
  const lightboxImage = document.querySelector('.lightbox-image');
  const lightboxCaption = document.querySelector('.lightbox-caption');
  const galleryPhotos = document.querySelectorAll('.gallery-photo');

  galleryPhotos.forEach(photo => {
    photo.addEventListener('click', () => {
      lightboxImage.src = photo.src;
      lightboxImage.alt = photo.alt;
      lightboxCaption.textContent = photo.parentElement.querySelector('figcaption').textContent;
      galleryLightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });

  lightboxClose.addEventListener('click', () => {
    galleryLightbox.classList.remove('open');
    document.body.style.overflow = '';
  });

  galleryLightbox.addEventListener('click', (e) => {
    if (e.target === galleryLightbox) {
      galleryLightbox.classList.remove('open');
      document.body.style.overflow = '';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && galleryLightbox.classList.contains('open')) {
      galleryLightbox.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
}

// ---- TIKTOK EMBED LAZY LOAD ----
// Only load TikTok embed script after page is fully loaded
// Replace data-video-id values with real TikTok video IDs when available
function loadTikTokEmbeds() {
  const slots = document.querySelectorAll('.tiktok-embed-slot');
  if (!slots.length) return;

  slots.forEach(slot => {
    const videoId = slot.dataset.videoId;
    if (!videoId || videoId === 'PLACEHOLDER') return;

    const blockquote = document.createElement('blockquote');
    blockquote.className = 'tiktok-embed';
    blockquote.setAttribute('cite', `https://www.tiktok.com/@myosfna/video/${videoId}`);
    blockquote.setAttribute('data-video-id', videoId);
    blockquote.style.maxWidth = '100%';
    blockquote.style.minWidth = '100%';

    const section = document.createElement('section');
    blockquote.appendChild(section);
    slot.innerHTML = '';
    slot.appendChild(blockquote);
  });

  // Load TikTok embed script once
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.tiktok.com/embed.js';
  document.body.appendChild(script);
}

window.addEventListener('load', loadTikTokEmbeds);

// ---- VENDOR FORM SUBMIT ----
const vendorForm = document.getElementById('vendor-form');
if (vendorForm) {
  vendorForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(vendorForm);
    const name    = data.get('name') || '';
    const business = data.get('business') || '';
    const email   = data.get('email') || '';
    const type    = data.get('type') || '';
    const message = data.get('message') || '';

    const subject = encodeURIComponent(`OSFNA 2026 Vendor Inquiry — ${business}`);
    const body = encodeURIComponent(
      `Name: ${name}\nBusiness: ${business}\nEmail: ${email}\nType: ${type}\n\nMessage:\n${message}`
    );
    window.location.href = `mailto:myosfna@gmail.com?subject=${subject}&body=${body}`;
  });
}
