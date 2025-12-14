const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

const THEME_KEY = 'jd-theme';
const bodyEl = document.body;
const rootEl = document.documentElement;
const headerReady = window.__headerReady || Promise.resolve(null);

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

  if (!('IntersectionObserver' in window) || !navLinks.length || !sections.length) {
    return;
  }

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            if (link.getAttribute('href') === `#${id}` || link.getAttribute('href') === `index.html#${id}`) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    },
    {
      rootMargin: '-40% 0px -50% 0px'
    }
  );

  sections.forEach(section => observer.observe(section));
};

const initHeroObserver = () => {
  if (!('IntersectionObserver' in window)) {
    return;
  }
  const heroImage = document.querySelector('.hero-portrait-frame img');
  const brandMark = document.querySelector('.site-header .brand-mark');
  const brandLink = document.querySelector('.site-header .brand');

  if (!heroImage || !brandMark || !brandLink) return;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          brandMark.classList.add('is-hidden');
          brandLink.classList.add('brand--compact');
        } else {
          brandMark.classList.remove('is-hidden');
          brandLink.classList.remove('brand--compact');
        }
      });
    },
    { threshold: 0.4 }
  );

  observer.observe(heroImage);
};

const initHeaderMode = () => {
  const headerEl = document.querySelector('.site-header');
  if (!headerEl) return;
  const compactWidthQuery = window.matchMedia ? window.matchMedia('(max-width: 1080px)') : null;
  if (!compactWidthQuery) return;

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
  };

  setHeaderMode(compactWidthQuery.matches);
  const handleCompactChange = event => setHeaderMode(event.matches);
  if (typeof compactWidthQuery.addEventListener === 'function') {
    compactWidthQuery.addEventListener('change', handleCompactChange);
  } else if (typeof compactWidthQuery.addListener === 'function') {
    compactWidthQuery.addListener(handleCompactChange);
  }
};

const initResearchModal = () => {
  const cards = document.querySelectorAll('#research .research-card');
  if (!cards.length) return;

  let modalEls = null;
  let returnFocusTo = null;

  const closeModal = () => {
    if (!modalEls) return;
    modalEls.overlay.setAttribute('aria-hidden', 'true');
    modalEls.overlay.classList.remove('is-visible');
    bodyEl.classList.remove('is-modal-open');
    document.removeEventListener('keydown', handleKeydown);
    if (returnFocusTo && typeof returnFocusTo.focus === 'function') {
      returnFocusTo.focus();
    }
    returnFocusTo = null;
  };

  const handleKeydown = event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
    }
  };

  const ensureModal = () => {
    if (modalEls) return modalEls;
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
        closeModal();
      }
    });
    closeBtn.addEventListener('click', closeModal);

    modalEls = { overlay, dialog, closeBtn, meta, title, body, cta };
    return modalEls;
  };

  const openModal = data => {
    const { overlay, meta, title, body, cta, closeBtn } = ensureModal();
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

    returnFocusTo = data.source || null;
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
    document.addEventListener('keydown', handleKeydown);
    closeBtn.focus({ preventScroll: true });
  };

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
    openModal(getCardData(card));
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

headerReady.then(() => {
  bindThemeButtons();
  syncToggleState(bodyEl.dataset.theme || 'light');
  initHeroObserver();
  initScrollSpy();
  initHeaderMode();
  initResearchModal();
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
