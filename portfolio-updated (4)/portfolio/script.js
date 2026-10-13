const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
const navLinks = [...document.querySelectorAll('.nav a')];
const toast = document.querySelector('.toast');

document.querySelector('#year').textContent = new Date().getFullYear();

// Light / dark theme toggle (initial theme is set by the inline script in <head>).
const root = document.documentElement;
const themeToggle = document.querySelector('#theme-toggle');
const themeMeta = document.querySelector('meta[name="theme-color"]');

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  themeToggle.setAttribute('aria-label', theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
  if (themeMeta) themeMeta.setAttribute('content', theme === 'light' ? '#fbf8f2' : '#0b0908');
}
applyTheme(root.getAttribute('data-theme') || 'dark');

themeToggle.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  applyTheme(next);
  try { localStorage.setItem('theme', next); } catch (e) {}
});

menuButton.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
});

navLinks.forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
}));

// Reveal cards as they enter the viewport.
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// Keep the active navigation item in sync with the section in view.
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${id}`));
    }
  });
}, { rootMargin: '-30% 0px -60% 0px' });
document.querySelectorAll('main section[id]').forEach(section => sectionObserver.observe(section));

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

const contactEmail = 'fortuneomondi576@gmail.com';
document.querySelector('#email-link').href = `mailto:${contactEmail}`;
document.querySelector('#copy-email').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(contactEmail);
    showToast('Email address copied.');
  } catch {
    showToast(`Copy this email: ${contactEmail}`);
  }
});

/* ---------------------------------------------------------------
   Tablet: the clicked card zooms (slowly) into a centred dialog.
   Content comes from <template id="tpl-..."> elements in index.html.
---------------------------------------------------------------- */
const overlay = document.querySelector('#tablet-overlay');
const tablet = document.querySelector('#tablet');
const tabletBody = document.querySelector('#tablet-body');
const tabletClose = document.querySelector('#tablet-close');
const tabletLogo = document.querySelector('#tablet-logo');
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const OPEN_MS = 1100;
const CLOSE_MS = 800;
let activeSource = null;
let tabletState = 'closed'; // closed | opening | open | closing
let closeTimer = null;

function iconUrl(name) {
  return `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${name}/${name}-original.svg`;
}

function fillTablet(tpl) {
  document.querySelector('#tablet-eyebrow').textContent = tpl.dataset.eyebrow || '';
  const title = document.querySelector('#tablet-title');
  title.textContent = tpl.dataset.title || '';
  const sub = document.querySelector('#tablet-sub');
  sub.textContent = tpl.dataset.sub || '';
  sub.hidden = !tpl.dataset.sub && !tpl.dataset.status;
  if (tpl.dataset.status) {
    const pill = document.createElement('span');
    pill.className = 'status' + (tpl.dataset.statusType === 'dev' ? ' dev' : '');
    pill.textContent = tpl.dataset.status;
    sub.appendChild(pill);
  }
  if (tpl.dataset.logo) {
    tabletLogo.hidden = false;
    tabletLogo.classList.toggle('dark', tpl.hasAttribute('data-logo-dark'));
    const img = tabletLogo.querySelector('img');
    img.src = tpl.dataset.logo;
    img.alt = `${tpl.dataset.title} logo`;
  } else {
    tabletLogo.hidden = true;
  }
  tabletBody.replaceChildren(tpl.content.cloneNode(true));
  tabletBody.scrollTop = 0;
  // Technology logos on the skill chips.
  tabletBody.querySelectorAll('[data-icon]').forEach(chip => {
    const img = document.createElement('img');
    img.src = iconUrl(chip.dataset.icon);
    img.alt = '';
    img.loading = 'lazy';
    if (chip.hasAttribute('data-adapt')) img.className = 'adapt';
    img.addEventListener('error', () => img.remove());
    chip.prepend(img);
  });
}

// Transform that makes the (centred) tablet look like the source card.
function sourceTransform(source) {
  const s = source.getBoundingClientRect();
  const t = tablet.getBoundingClientRect();
  const dx = s.left + s.width / 2 - (t.left + t.width / 2);
  const dy = s.top + s.height / 2 - (t.top + t.height / 2);
  const sx = Math.max(s.width / t.width, 0.05);
  const sy = Math.max(s.height / t.height, 0.05);
  return `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
}

function openTablet(templateId, source) {
  if (tabletState !== 'closed') return;
  const tpl = document.getElementById(templateId);
  if (!tpl) return;
  tabletState = 'opening';
  activeSource = source;
  fillTablet(tpl);

  document.body.classList.add('tablet-open');
  overlay.classList.add('mounted');
  overlay.setAttribute('aria-hidden', 'false');
  tablet.classList.remove('ready', 'closing');

  // Start from the card's position/size, then glide to the centre.
  tablet.style.transition = 'none';
  tablet.style.opacity = '0.15';
  tablet.style.transform = sourceTransform(source);
  void tablet.offsetWidth; // commit the starting frame

  tablet.style.transition = `transform ${OPEN_MS}ms cubic-bezier(.22,.72,.18,1), opacity ${OPEN_MS * 0.7}ms ease`;
  overlay.style.transition = `opacity ${OPEN_MS * 0.9}ms ease`;
  overlay.classList.add('show');
  tablet.style.transform = 'none';
  tablet.style.opacity = '1';
  tablet.classList.add('ready');

  window.clearTimeout(closeTimer);
  closeTimer = window.setTimeout(() => {
    tabletState = 'open';
    tabletClose.focus({ preventScroll: true });
  }, reduceMotion() ? 0 : OPEN_MS);
}

function closeTablet() {
  if (tabletState !== 'open' && tabletState !== 'opening') return;
  tabletState = 'closing';
  tablet.classList.add('closing');
  tablet.classList.remove('ready');
  tablet.style.transition = `transform ${CLOSE_MS}ms cubic-bezier(.5,0,.2,1), opacity ${CLOSE_MS}ms ease ${CLOSE_MS * 0.3}ms`;
  overlay.style.transition = `opacity ${CLOSE_MS}ms ease`;
  overlay.classList.remove('show');
  if (activeSource) tablet.style.transform = sourceTransform(activeSource);
  tablet.style.opacity = '0';

  window.clearTimeout(closeTimer);
  closeTimer = window.setTimeout(() => {
    overlay.classList.remove('mounted');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('tablet-open');
    tablet.style.transition = 'none';
    tablet.style.transform = '';
    tabletBody.replaceChildren();
    tabletState = 'closed';
    if (activeSource) activeSource.focus({ preventScroll: true });
    activeSource = null;
  }, reduceMotion() ? 0 : CLOSE_MS + 40);
}

document.querySelectorAll('[data-tablet]').forEach(card => {
  card.addEventListener('click', event => {
    if (event.target.closest('a')) return;
    openTablet(card.dataset.tablet, card);
  });
  card.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target === card) {
      event.preventDefault();
      openTablet(card.dataset.tablet, card);
    }
  });
});

tabletClose.addEventListener('click', closeTablet);
overlay.addEventListener('click', event => { if (event.target === overlay) closeTablet(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeTablet();
  // Keep keyboard focus inside the dialog while it is open.
  if (event.key === 'Tab' && tabletState !== 'closed') {
    const focusable = [...tablet.querySelectorAll('a[href], button')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
