const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

const THEME_KEY = 'jd-theme';
const bodyEl = document.body;
const rootEl = document.documentElement;
const headerReady = window.__headerReady || Promise.resolve(null);
const normalizePathname = path => {
  if (!path || path === '/') {
    return '/';
  }
  const cleaned = path.replace(/index\.html$/i, '');
  return cleaned === '' ? '/' : cleaned;
};
let scrollSpyFrame = null;
let scrollSpyCleanup = null;
let heroObserver = null;
let heroHeaderModeListener = null;
let headerModeInitialized = false;
let researchModalEls = null;
let researchModalReturnFocus = null;
let mathJaxLoadingPromise = null;
let mathJaxConfigured = false;
const pjaxSupported = Boolean(window.history && typeof window.history.pushState === 'function');
let isPjaxNavigating = false;
let pjaxInitialized = false;

const getStoredTheme = () => {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
};

const storeTheme = theme => {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore storage issues
  }
};

const getThemeButtons = () => document.querySelectorAll('.toggle-theme');

const syncToggleState = theme => {
  const pressed = theme === 'dark';
  getThemeButtons().forEach(button => {
    button.setAttribute('aria-pressed', pressed);
    const label = button.querySelector('.toggle-label');
    if (label) {
      label.textContent = pressed ? 'Dark mode' : 'Light mode';
    }
  });
};

const applyTheme = (theme, persist = true) => {
  const normalized = theme === 'dark' ? 'dark' : 'light';
  bodyEl.dataset.theme = normalized;
  if (rootEl) {
    rootEl.dataset.theme = normalized;
  }
  if (persist) {
    storeTheme(normalized);
  }
  syncToggleState(normalized);
};

const bindThemeButtons = () => {
  getThemeButtons().forEach(button => {
    if (button.dataset.themeBound === 'true') return;
    button.dataset.themeBound = 'true';
    button.addEventListener('click', () => {
      const nextTheme = bodyEl.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
    });
  });
};

const initTheme = () => {
  const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const storedTheme = getStoredTheme();
  const initialTheme = storedTheme || (mediaQuery && mediaQuery.matches ? 'dark' : 'light');
  applyTheme(initialTheme, Boolean(storedTheme));

  if (mediaQuery && !storedTheme) {
    const mqListener = event => {
      applyTheme(event.matches ? 'dark' : 'light', false);
    };
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', mqListener);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(mqListener);
    }
  }
};

initTheme();

const initScrollSpy = () => {
  const navLinks = document.querySelectorAll('.site-nav a[href*="#"]');
  const sections = [...document.querySelectorAll('main section[id]')];

  if (scrollSpyCleanup) {
    scrollSpyCleanup();
    scrollSpyCleanup = null;
  }
  if (!navLinks.length || !sections.length) {
    return;
  }

  const linkMatchesSection = (link, sectionId) => {
    const href = link.getAttribute('href');
    if (!href) return false;
    const targetHash = `#${sectionId}`;
    if (href === targetHash || href === `index.html${targetHash}`) {
      return true;
    }
    if (href.startsWith('#')) {
      return false;
    }
    try {
      const url = new URL(href, window.location.origin);
      return normalizePathname(url.pathname) === '/' && url.hash === targetHash;
    } catch {
      return false;
    }
  };

  const heroSection = document.querySelector('.hero');

  const highlightLinks = activeId => {
    navLinks.forEach(link => {
      if (activeId && linkMatchesSection(link, activeId)) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });
  };

  const getActiveSectionId = () => {
    const focusLine = Math.max(window.innerHeight * 0.25, 140);
    if (heroSection) {
      const heroRect = heroSection.getBoundingClientRect();
      if (heroRect.bottom > focusLine) {
        return null;
      }
    }
    let activeId = sections[0].id;
    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      if (rect.top - focusLine <= 0) {
        activeId = section.id;
        if (rect.bottom - focusLine >= 0) {
          break;
        }
      } else {
        break;
      }
    }
    return activeId;
  };

  const updateActiveSection = () => {
    scrollSpyFrame = null;
    highlightLinks(getActiveSectionId());
  };

  const scheduleUpdate = () => {
    if (scrollSpyFrame !== null) return;
    if (typeof window.requestAnimationFrame === 'function') {
      scrollSpyFrame = window.requestAnimationFrame(updateActiveSection);
    } else {
      scrollSpyFrame = window.setTimeout(updateActiveSection, 0);
    }
  };

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  scheduleUpdate();

  scrollSpyCleanup = () => {
    window.removeEventListener('scroll', scheduleUpdate);
    window.removeEventListener('resize', scheduleUpdate);
    if (scrollSpyFrame !== null) {
      if (typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(scrollSpyFrame);
      } else {
        window.clearTimeout(scrollSpyFrame);
      }
      scrollSpyFrame = null;
    }
  };
};

const initScrollTopLinks = () => {
  const topLinks = document.querySelectorAll('a[data-scroll-top], a[href$="#top"]');
  if (!topLinks.length) return;

  const scrollToTop = () => {
    if (typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  };

  const resetUrl = () => {
    if (!window.history || typeof window.history.replaceState !== 'function') {
      return;
    }
    const current = new URL(window.location.href);
    const normalizedPath = normalizePathname(current.pathname);
    const nextUrl = `${normalizedPath}${current.search}`;
    window.history.replaceState({ url: nextUrl }, '', nextUrl);
  };

  const navigateWithoutHash = linkUrl => {
    const normalizedPath = normalizePathname(linkUrl.pathname);
    const target = `${linkUrl.origin}${normalizedPath}${linkUrl.search}`;
    if (pjaxSupported) {
      visitWithPjax(target);
    } else {
      window.location.href = target;
    }
  };

  topLinks.forEach(link => {
    if (link.dataset.scrollTopBound === 'true') return;
    link.dataset.scrollTopBound = 'true';
    link.addEventListener('click', event => {
      const href = link.getAttribute('href');
      if (!href) return;
      let linkUrl;
      try {
        linkUrl = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (linkUrl.hash !== '#top') {
        return;
      }
      event.preventDefault();
      const currentUrl = new URL(window.location.href);
      const samePath = normalizePathname(linkUrl.pathname) === normalizePathname(currentUrl.pathname);
      const sameSearch = linkUrl.search === currentUrl.search;
      if (samePath && sameSearch) {
        scrollToTop();
        resetUrl();
      } else {
        navigateWithoutHash(linkUrl);
      }
    });
  });
};

const initHeroObserver = () => {
  if (!('IntersectionObserver' in window)) {
    return;
  }
  if (heroObserver) {
    heroObserver.disconnect();
    heroObserver = null;
  }
  if (heroHeaderModeListener) {
    document.removeEventListener('jd:header-mode-change', heroHeaderModeListener);
    heroHeaderModeListener = null;
  }
  const heroImage = document.querySelector('.hero-portrait-frame img');
  const brandLink = document.querySelector('.site-header .brand');
  const brandMark = document.querySelector('.site-header .brand-mark');

  if (!heroImage || !brandLink || !brandMark) {
    if (brandLink) {
      brandLink.classList.remove('brand--compact');
    }
    if (brandMark) {
      brandMark.classList.remove('is-hidden');
    }
    return;
  }

  let heroVisible = false;

  const showBrandMark = () => {
    brandMark.classList.remove('is-hidden');
  };

  const hideBrandMark = () => {
    brandMark.classList.add('is-hidden');
  };

  const applyBrandState = () => {
    const headerEl = document.querySelector('.site-header');
    const isCompact = headerEl && headerEl.classList.contains('is-compact');
    if (heroVisible && !isCompact) {
      brandLink.classList.add('brand--compact');
      hideBrandMark();
    } else {
      brandLink.classList.remove('brand--compact');
      showBrandMark();
    }
  };

  heroHeaderModeListener = () => applyBrandState();
  document.addEventListener('jd:header-mode-change', heroHeaderModeListener);

  heroObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        heroVisible = entry.isIntersecting;
        applyBrandState();
      });
    },
    { threshold: 0.4 }
  );

  heroObserver.observe(heroImage);
  applyBrandState();
};

const initHeaderMode = () => {
  if (headerModeInitialized) {
    return;
  }
  const headerEl = document.querySelector('.site-header');
  if (!headerEl) return;
  const compactWidthQuery = window.matchMedia ? window.matchMedia('(max-width: 1080px)') : null;
  if (!compactWidthQuery) return;
  headerModeInitialized = true;

  const setHeaderMode = matches => {
    if (matches) {
      headerEl.classList.add('is-compact');
      headerEl.classList.remove('is-visible');
      const reveal = () => headerEl.classList.add('is-visible');
      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(reveal);
      } else {
        setTimeout(reveal, 0);
      }
    } else {
      headerEl.classList.remove('is-visible');
      headerEl.classList.remove('is-compact');
    }
    document.dispatchEvent(new CustomEvent('jd:header-mode-change'));
  };

  setHeaderMode(compactWidthQuery.matches);
  const handleCompactChange = event => setHeaderMode(event.matches);
  if (typeof compactWidthQuery.addEventListener === 'function') {
    compactWidthQuery.addEventListener('change', handleCompactChange);
  } else if (typeof compactWidthQuery.addListener === 'function') {
    compactWidthQuery.addListener(handleCompactChange);
  }
};

const closeResearchModal = () => {
  if (!researchModalEls) return;
  researchModalEls.overlay.setAttribute('aria-hidden', 'true');
  researchModalEls.overlay.classList.remove('is-visible');
  bodyEl.classList.remove('is-modal-open');
  document.removeEventListener('keydown', handleResearchModalKeydown);
  if (researchModalReturnFocus && typeof researchModalReturnFocus.focus === 'function') {
    researchModalReturnFocus.focus();
  }
  researchModalReturnFocus = null;
};

const handleResearchModalKeydown = event => {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeResearchModal();
  }
};

const ensureResearchModal = () => {
  if (researchModalEls) return researchModalEls;
  const overlay = document.createElement('div');
  overlay.className = 'research-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  const dialog = document.createElement('article');
  dialog.className = 'research-modal';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'research-modal-title');

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'research-modal__close';
  closeBtn.setAttribute('aria-label', 'Close dialog');
  closeBtn.textContent = '\u00d7';

  const meta = document.createElement('p');
  meta.className = 'research-modal__meta';

  const title = document.createElement('h3');
  title.className = 'research-modal__title';
  title.id = 'research-modal-title';

  const body = document.createElement('div');
  body.className = 'research-modal__body';

  const cta = document.createElement('a');
  cta.className = 'research-modal__cta';
  cta.href = '#';

  dialog.append(closeBtn, meta, title, body, cta);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', event => {
    if (event.target === overlay) {
      closeResearchModal();
    }
  });
  closeBtn.addEventListener('click', closeResearchModal);

  researchModalEls = { overlay, dialog, closeBtn, meta, title, body, cta };
  return researchModalEls;
};

const openResearchModal = data => {
  const { overlay, meta, title, body, cta, closeBtn } = ensureResearchModal();
  meta.textContent = data.meta || '';
  title.textContent = data.title || '';
  if (data.bodyHtml) {
    body.innerHTML = data.bodyHtml;
  } else {
    body.textContent = data.body || '';
  }

  if (data.href) {
    cta.href = data.href;
    cta.textContent = data.cta || 'Open link';
    if (data.target) {
      cta.target = data.target;
    } else {
      cta.removeAttribute('target');
    }
    if (data.rel) {
      cta.rel = data.rel;
    } else if (data.target === '_blank') {
      cta.rel = 'noopener';
    } else {
      cta.removeAttribute('rel');
    }
    cta.style.display = 'inline-flex';
  } else {
    cta.removeAttribute('href');
    cta.style.display = 'none';
  }

  researchModalReturnFocus = data.source || null;
  overlay.setAttribute('aria-hidden', 'false');
  const reveal = () => overlay.classList.add('is-visible');
  if (typeof window.requestAnimationFrame === 'function') {
    requestAnimationFrame(() => requestAnimationFrame(reveal));
  } else {
    setTimeout(reveal, 0);
  }

  const toggleFade = () => {
    const atBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 2;
    if (atBottom) {
      body.classList.add('is-scroll-end');
    } else {
      body.classList.remove('is-scroll-end');
    }
  };
  body.removeEventListener('scroll', toggleFade);
  if (body.scrollHeight > body.clientHeight + 1) {
    toggleFade();
    body.addEventListener('scroll', toggleFade);
  } else {
    body.classList.add('is-scroll-end');
  }
  bodyEl.classList.add('is-modal-open');
  document.addEventListener('keydown', handleResearchModalKeydown);
  closeBtn.focus({ preventScroll: true });
};

const initResearchModal = () => {
  const cards = document.querySelectorAll('#research .research-card');
  if (!cards.length) return;

  const getCardData = card => {
    const meta = card.querySelector('.card-meta');
    const title = card.querySelector('h3');
    const description = card.querySelector('.card-description');
    const link = card.querySelector('.research-card__cta');
    const full = card.querySelector('.research-card__full');

    return {
      meta: meta ? meta.textContent.trim() : '',
      title: title ? title.textContent.trim() : '',
      body: full ? full.textContent.trim() : description ? description.textContent.trim() : '',
      bodyHtml: full ? full.innerHTML.trim() : null,
      cta: link ? link.textContent.trim() : 'Open link',
      href: link ? link.getAttribute('href') : null,
      target: link ? link.getAttribute('target') : null,
      rel: link ? link.getAttribute('rel') : null,
      source: card
    };
  };

  const isModifierClick = event =>
    event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1;

  const handleCardActivate = card => {
    openResearchModal(getCardData(card));
  };

  cards.forEach(card => {
    card.addEventListener('click', event => {
      if (isModifierClick(event)) {
        return;
      }
      if (event.target.closest('.research-card__cta')) {
        return;
      }
      event.preventDefault();
      handleCardActivate(card);
    });

    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleCardActivate(card);
      }
    });
  });
};

const renderMathJax = () => {
  if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
    window.MathJax.typesetPromise();
  }
};

const loadMathJaxIfNeeded = () => {
  if (document.body.dataset.mathjax !== 'true') {
    return;
  }
  if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
    renderMathJax();
    return;
  }
  if (!mathJaxConfigured) {
    window.MathJax = {
      tex: {
        inlineMath: [
          ['$', '$'],
          ['\\(', '\\)']
        ],
        displayMath: [
          ['$$', '$$'],
          ['\\[', '\\]']
        ]
      },
      options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
        renderActions: {
          addMenu: []
        }
      }
    };
    mathJaxConfigured = true;
  }
  if (!mathJaxLoadingPromise) {
    mathJaxLoadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
      script.defer = true;
      script.addEventListener('load', () => {
        renderMathJax();
        resolve();
      });
      script.addEventListener('error', reject);
      document.head.appendChild(script);
    });
  } else {
    mathJaxLoadingPromise.then(renderMathJax);
  }
};

const runPageEnhancements = () => {
  initScrollTopLinks();
  initHeroObserver();
  initScrollSpy();
  initResearchModal();
  loadMathJaxIfNeeded();
};

const setActiveNavLink = navKey => {
  const navLinks = document.querySelectorAll('.site-nav a[data-nav]');
  navLinks.forEach(link => {
    if (navKey && link.dataset.nav === navKey) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }
  });
};

const updateBodyAttributes = newBody => {
  if (!newBody) return;
  const preservedTheme = document.body.dataset.theme;
  const hadTransition = document.body.classList.contains('is-transitioning');
  document.body.className = newBody.className || '';
  if (hadTransition) {
    document.body.classList.add('is-transitioning');
  }
  [...document.body.attributes].forEach(attr => {
    if (attr.name.startsWith('data-') && attr.name !== 'data-theme') {
      document.body.removeAttribute(attr.name);
    }
  });
  [...newBody.attributes].forEach(attr => {
    if (attr.name.startsWith('data-') && attr.name !== 'data-theme') {
      document.body.setAttribute(attr.name, attr.value);
    }
  });
  if (preservedTheme) {
    document.body.dataset.theme = preservedTheme;
  }
};

const applyPageContent = doc => {
  if (!doc) return;
  const titleEl = doc.querySelector('title');
  if (titleEl) {
    document.title = titleEl.textContent.trim();
  }
  updateBodyAttributes(doc.body);
  const currentMain = document.querySelector('main');
  const incomingMain = doc.querySelector('main');
  if (currentMain && incomingMain) {
    const clonedMain = incomingMain.cloneNode(true);
    currentMain.replaceWith(clonedMain);
  }
  const placeholder = doc.querySelector('[data-site-header]');
  if (placeholder) {
    setActiveNavLink(placeholder.dataset.activeLink || '');
  }
  runPageEnhancements();
};

const handleHashScroll = hash => {
  if (!hash) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  const targetId = hash.replace(/^#/, '');
  if (!targetId) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  const target = document.getElementById(decodeURIComponent(targetId));
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const fetchPageDocument = async url => {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: {
      'X-Requested-With': 'jd-pjax'
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  const text = await response.text();
  const parser = new DOMParser();
  return parser.parseFromString(text, 'text/html');
};

const visitWithPjax = async (url, { historyMode = 'push' } = {}) => {
  if (!pjaxSupported) {
    window.location.href = url;
    return;
  }
  if (isPjaxNavigating) return;
  isPjaxNavigating = true;
  closeResearchModal();
  bodyEl.classList.add('is-transitioning');
  const urlObj = new URL(url, window.location.href);
  const normalizedPath = normalizePathname(urlObj.pathname);
  const finalUrl = `${normalizedPath}${urlObj.search}${urlObj.hash}`;
  try {
    const nextDoc = await fetchPageDocument(urlObj.href);
    applyPageContent(nextDoc);
    if (historyMode === 'push') {
      window.history.pushState({ url: finalUrl }, '', finalUrl);
    } else if (historyMode === 'replace') {
      window.history.replaceState({ url: finalUrl }, '', finalUrl);
    }
    handleHashScroll(urlObj.hash);
  } catch (error) {
    window.location.href = urlObj.href;
  } finally {
    bodyEl.classList.remove('is-transitioning');
    isPjaxNavigating = false;
  }
};

const shouldHandlePjaxClick = link => {
  if (!pjaxSupported || !link) return false;
  if (link.dataset.noPjax === 'true') return false;
  if (link.hasAttribute('download')) return false;
  if (link.target && link.target !== '_self') return false;
  const href = link.getAttribute('href');
  if (!href || href.startsWith('#')) return false;
  if (/^(?:mailto:|tel:|javascript:)/i.test(href)) return false;
  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  const currentUrl = new URL(window.location.href);
  const samePath = normalizePathname(url.pathname) === normalizePathname(currentUrl.pathname);
  const sameSearch = url.search === currentUrl.search;
  if (samePath && sameSearch) {
    return false;
  }
  return true;
};

const handlePjaxClick = event => {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
    return;
  }
  const link = event.target.closest('a');
  if (!link) return;
  if (!shouldHandlePjaxClick(link)) return;
  event.preventDefault();
  visitWithPjax(link.href);
};

const handlePopState = event => {
  if (!pjaxSupported || !pjaxInitialized) return;
  const url =
    (event.state && event.state.url) || `${window.location.pathname}${window.location.search}${window.location.hash}`;
  visitWithPjax(url, { historyMode: 'none' });
};

const initPjaxNavigation = () => {
  if (!pjaxSupported || pjaxInitialized) return;
  pjaxInitialized = true;
  const initialUrl = `${normalizePathname(window.location.pathname)}${window.location.search}${window.location.hash}`;
  window.history.replaceState({ url: initialUrl }, '', window.location.href);
  document.addEventListener('click', handlePjaxClick, true);
  window.addEventListener('popstate', handlePopState);
};

headerReady.then(() => {
  bindThemeButtons();
  syncToggleState(bodyEl.dataset.theme || 'light');
  initHeaderMode();
  runPageEnhancements();
  initPjaxNavigation();
});

const EMAIL_COMPONENT_TAG = 'jd-email';
const EMAIL_DISPLAY = 'jonathan.delgado AT uci.edu';
const EMAIL_BODY_MESSAGE =
  'Remember to replace the "AT" for an @ before attempting to send the email. This is done to prevent bots from scraping personal information and adding this email to a spam list.';

const buildEmailHref = () =>
  `mailto:?subject=${encodeURIComponent(EMAIL_DISPLAY)}&body=${encodeURIComponent(EMAIL_BODY_MESSAGE)}`;

class EmailLink extends HTMLElement {
  connectedCallback() {
    if (this.hasAttribute('data-enhanced')) {
      return;
    }
    const displayText = (this.textContent && this.textContent.trim()) || EMAIL_DISPLAY;
    const anchor = document.createElement('a');
    anchor.href = buildEmailHref();
    anchor.classList.add('email-link');
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-envelope';
    icon.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.textContent = displayText;
    anchor.append(icon, text);
    this.replaceChildren(anchor);
    this.setAttribute('data-enhanced', 'true');
  }
}

if (!customElements.get(EMAIL_COMPONENT_TAG)) {
  customElements.define(EMAIL_COMPONENT_TAG, EmailLink);
}

const GITHUB_COMPONENT_TAG = 'github-link';

class GitHubLink extends HTMLElement {
  connectedCallback() {
    if (this.hasAttribute('data-enhanced')) {
      return;
    }
    const repo = (this.getAttribute('repo') || this.getAttribute('repo-link') || '').trim();
    if (!repo) {
      return;
    }
    const providedText = this.textContent && this.textContent.trim();
    const displayText = providedText || 'GitHub';
    const anchor = document.createElement('a');
    anchor.href = `https://github.com/otanan/${repo}`;
    anchor.target = '_blank';
    anchor.rel = 'noopener';
    anchor.textContent = displayText;
    anchor.classList.add('github-link');
    this.replaceChildren(anchor);
    this.setAttribute('data-enhanced', 'true');
  }
}

if (!customElements.get(GITHUB_COMPONENT_TAG)) {
  customElements.define(GITHUB_COMPONENT_TAG, GitHubLink);
}
