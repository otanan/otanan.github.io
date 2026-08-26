/* ============================================================
   jdelgado.net — site behavior
   Theme · scroll spy · sticky header · PJAX · MathJax
   ============================================================ */

const bodyEl = document.body;
const rootEl = document.documentElement;
const headerReady = window.__headerReady || Promise.resolve(null);

const THEME_KEY = 'jd-theme';

const normalizePathname = path => {
  if (!path || path === '/') return '/';
  const cleaned = path.replace(/index\.html$/i, '');
  return cleaned === '' ? '/' : cleaned;
};

const prefersReducedMotion = () =>
  Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

const scrollBehavior = () => (prefersReducedMotion() ? 'instant' : 'smooth');

const setYear = () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
};
setYear();

/* ============================================================
   Theme
   ============================================================ */

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
    /* private mode — fall back to session-only theming */
  }
};

const syncToggleState = theme => {
  const isDark = theme === 'dark';
  document.querySelectorAll('.toggle-theme').forEach(button => {
    button.setAttribute('aria-pressed', String(isDark));
    button.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    const label = button.querySelector('.toggle-label');
    if (label) label.textContent = isDark ? 'Dark mode' : 'Light mode';
  });
};

const applyTheme = (theme, persist = true) => {
  const normalized = theme === 'dark' ? 'dark' : 'light';

  // Flip every themed surface in one frame. html, body and the header paint
  // the same token with different (or no) transitions, so without this the
  // page edges and header change before the body catches up.
  rootEl.classList.add('is-theme-switching');
  bodyEl.dataset.theme = normalized;
  rootEl.dataset.theme = normalized;
  // Force a synchronous style flush so the new colours are committed while
  // transitions are still suppressed; removing the class then animates nothing.
  void rootEl.offsetWidth;
  rootEl.classList.remove('is-theme-switching');

  if (persist) storeTheme(normalized);
  syncToggleState(normalized);
};

const bindThemeButtons = () => {
  document.querySelectorAll('.toggle-theme').forEach(button => {
    if (button.dataset.themeBound === 'true') return;
    button.dataset.themeBound = 'true';
    button.addEventListener('click', () => {
      applyTheme(bodyEl.dataset.theme === 'dark' ? 'light' : 'dark');
    });
  });
};

const initTheme = () => {
  const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const storedTheme = getStoredTheme();
  applyTheme(storedTheme || (mediaQuery && mediaQuery.matches ? 'dark' : 'light'), Boolean(storedTheme));

  // Follow the OS only while the visitor hasn't made an explicit choice.
  if (mediaQuery && !storedTheme) {
    mediaQuery.addEventListener('change', event => applyTheme(event.matches ? 'dark' : 'light', false));
  }
};
initTheme();

/* ============================================================
   Sticky header + brand mark
   The brand portrait stays hidden while the hero portrait is on
   screen, so the same face never appears twice.
   ============================================================ */

let stuckObserver = null;
let heroObserver = null;

const initStickyHeader = () => {
  const headerEl = document.querySelector('.site-header');
  const sentinel = document.getElementById('top');
  if (!headerEl || !sentinel || !('IntersectionObserver' in window)) return;

  if (stuckObserver) stuckObserver.disconnect();
  stuckObserver = new IntersectionObserver(
    ([entry]) => headerEl.classList.toggle('is-stuck', !entry.isIntersecting),
    { rootMargin: '0px' }
  );
  stuckObserver.observe(sentinel);
};

const initHeroObserver = () => {
  const brandMark = document.querySelector('.site-header .brand-mark');
  if (!brandMark) return;

  if (heroObserver) {
    heroObserver.disconnect();
    heroObserver = null;
  }

  const heroImage = document.querySelector('.hero-portrait img');
  if (!heroImage || !('IntersectionObserver' in window)) {
    brandMark.classList.remove('is-hidden');
    return;
  }

  heroObserver = new IntersectionObserver(
    ([entry]) => brandMark.classList.toggle('is-hidden', entry.isIntersecting),
    { threshold: 0.35 }
  );
  heroObserver.observe(heroImage);
};

/* ============================================================
   Table of contents
   Describes the CURRENT page only. The header nav handles
   cross-page links; keeping the two separate is the whole point.

   Opt in per page with data-toc on <body>:
     "sections" — one entry per <main> section[id], labelled by its h2
     "headings" — one entry per h2/h3 (for pandoc-generated notes)
   ============================================================ */

let tocCleanup = null;
// Exposed so a programmatic scroll can refresh the highlight without
// waiting on a scroll event + animation frame.
let tocUpdate = null;

const slugify = text =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'section';

const collectTocItems = (mode, main) => {
  if (mode === 'headings') {
    return [...main.querySelectorAll('h2, h3')]
      .filter(heading => !heading.closest('.toc') && heading.textContent.trim())
      .map(heading => {
        if (!heading.id) heading.id = slugify(heading.textContent);
        return {
          id: heading.id,
          label: heading.dataset.tocLabel || heading.textContent.trim(),
          sub: heading.tagName === 'H3'
        };
      });
  }

  if (mode === 'papers') {
    // data-toc-label matters here: the rail is built before MathJax runs, so a
    // title containing TeX would otherwise land in the list as raw \(…\).
    return [...main.querySelectorAll('.paper[id]')].map(paper => {
      const title = paper.querySelector('.paper-title');
      return {
        id: paper.id,
        label: paper.dataset.tocLabel || (title ? title.textContent.trim() : paper.id),
        sub: false
      };
    });
  }

  return [...main.querySelectorAll(':scope > section[id]')].map(section => {
    const heading = section.querySelector('h2');
    return {
      id: section.id,
      label: section.dataset.tocLabel || (heading ? heading.textContent.trim() : section.id),
      sub: false
    };
  });
};

const buildTocElement = items => {
  const nav = document.createElement('nav');
  nav.className = 'toc';
  nav.setAttribute('aria-label', 'On this page');

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'toc-fab';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', 'toc-panel');
  button.innerHTML =
    '<span>Contents</span>' +
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>';

  const panel = document.createElement('div');
  panel.className = 'toc-panel';
  panel.id = 'toc-panel';

  const title = document.createElement('p');
  title.className = 'toc-title';
  title.textContent = 'On this page';

  const list = document.createElement('ul');
  list.className = 'toc-list';

  items.forEach(item => {
    const li = document.createElement('li');
    if (item.sub) li.className = 'toc-sub';
    const link = document.createElement('a');
    link.href = `#${item.id}`;
    link.textContent = item.label;
    li.appendChild(link);
    list.appendChild(li);
  });

  panel.append(title, list);
  nav.append(button, panel);
  return nav;
};

const initToc = () => {
  if (tocCleanup) {
    tocCleanup();
    tocCleanup = null;
  }

  const main = document.querySelector('main');
  if (!main) return;

  main.querySelector(':scope > .toc')?.remove();

  const mode = bodyEl.dataset.toc;
  const items = mode ? collectTocItems(mode, main) : [];
  // A one-item contents list is noise, not navigation.
  if (items.length < 2) {
    main.classList.remove('has-toc');
    tocUpdate = null;
    return;
  }

  const nav = buildTocElement(items);
  main.classList.add('has-toc');
  main.prepend(nav);

  const links = [...nav.querySelectorAll('.toc-list a')];
  const targets = items.map(item => document.getElementById(item.id));

  /* --- active-section highlighting ---
     The line an entry must cross to count as current is exactly the line a
     clicked link parks it on — html's scroll-padding-top — and nothing else.
     This used to be a proportion of the viewport (25%, floor 140px), which
     sits far below where the scroll actually stops: clicking a link lands the
     target at 96px, so any entry shorter than the difference is cleared
     entirely and the NEXT one is already above the line. The rail then names
     the paper below the one you asked for. On a short window the two lines
     were close enough to mostly agree; past ~1000px tall every click was off
     by one. Reading the offset from the same property the scroll uses keeps
     them in step by construction, at any window size. */
  const focusLine = () =>
    // The +1 absorbs sub-pixel rounding, so a target parked exactly on the
    // line still counts as having reached it.
    (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0) + 1;

  let frame = null;
  let pinnedIndex = -1;
  const update = () => {
    frame = null;
    const line = focusLine();
    let activeIndex = -1;
    targets.forEach((target, index) => {
      if (target && target.getBoundingClientRect().top - line <= 0) activeIndex = index;
    });
    // Near the page bottom the last item may never cross the line; force it.
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 4) {
      activeIndex = links.length - 1;
    }
    // The mirror image at the top: the first entry sits below the line at
    // scroll 0, so clicking its link scrolls the page up and then highlights
    // nothing at all. Anywhere below the very top, the first entry is the
    // one being read.
    if (activeIndex === -1 && window.scrollY > 0) activeIndex = 0;
    // A click is a statement of intent, and the page cannot always honour it:
    // the last few entries share the final screenful, so scrolling stops
    // before any of them reaches the line and the clamps above answer with
    // something else. Hold what the reader asked for until they scroll for
    // themselves.
    if (pinnedIndex !== -1) activeIndex = pinnedIndex;
    links.forEach((link, index) => {
      const isActive = index === activeIndex;
      link.classList.toggle('active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  const schedule = () => {
    if (frame !== null) return;
    frame = requestAnimationFrame(update);
  };

  const SCROLL_KEYS = new Set([
    'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar'
  ]);
  // Input events, not 'scroll': the smooth scroll a click starts fires 'scroll'
  // the whole way down and would release the pin before it ever applied.
  const releasePin = event => {
    if (event.type === 'keydown' && !SCROLL_KEYS.has(event.key)) return;
    if (pinnedIndex === -1) return;
    pinnedIndex = -1;
    schedule();
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('wheel', releasePin, { passive: true });
  window.addEventListener('touchmove', releasePin, { passive: true });
  window.addEventListener('keydown', releasePin);
  // Paint the correct entry immediately — rAF would leave a frame unhighlighted,
  // which is visible when landing on a deep link.
  tocUpdate = update;
  update();

  /* --- collapsed (floating button) mode --- */
  const closePanel = () => {
    nav.classList.remove('is-open');
    nav.querySelector('.toc-fab').setAttribute('aria-expanded', 'false');
  };

  const onButtonClick = () => {
    const isOpen = nav.classList.toggle('is-open');
    nav.querySelector('.toc-fab').setAttribute('aria-expanded', String(isOpen));
  };

  const onDocumentClick = event => {
    if (nav.classList.contains('is-open') && !nav.contains(event.target)) closePanel();
  };

  const onKeydown = event => {
    if (event.key === 'Escape') closePanel();
  };

  // Scroll in-page explicitly rather than letting the browser perform a
  // fragment navigation, which reads as the page reloading.
  const onLinkClick = event => {
    const id = decodeURIComponent((event.currentTarget.getAttribute('href') || '').replace(/^#/, ''));
    const target = id ? document.getElementById(id) : null;
    if (!target) return;

    event.preventDefault();
    closePanel();

    // Highlight straight away; the spy would otherwise lag the whole animation.
    links.forEach(other => {
      const isActive = other === event.currentTarget;
      other.classList.toggle('active', isActive);
      if (isActive) {
        other.setAttribute('aria-current', 'true');
      } else {
        other.removeAttribute('aria-current');
      }
    });
    pinnedIndex = links.indexOf(event.currentTarget);

    target.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });

    const nextUrl = `${normalizePathname(window.location.pathname)}${window.location.search}#${id}`;
    window.history.pushState({ url: nextUrl }, '', nextUrl);
  };

  nav.querySelector('.toc-fab').addEventListener('click', onButtonClick);
  links.forEach(link => link.addEventListener('click', onLinkClick));
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onKeydown);

  tocCleanup = () => {
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('wheel', releasePin);
    window.removeEventListener('touchmove', releasePin);
    window.removeEventListener('keydown', releasePin);
    document.removeEventListener('click', onDocumentClick);
    document.removeEventListener('keydown', onKeydown);
    if (frame !== null) cancelAnimationFrame(frame);
  };
};

/* ============================================================
   MathJax — loaded only on pages that declare data-mathjax,
   and only typeset over .math nodes.
   ============================================================ */

let mathJaxLoadingPromise = null;
let mathJaxConfigured = false;
let mathJaxTypesetPromise = null;
let mathJaxResizeCleanup = null;
let mathJaxLastWidth = null;
const mathJaxSourceCache = new WeakMap();

const getMathJaxRoot = () => document.querySelector('main') || document.body;
const getMathJaxTargets = () => [...(getMathJaxRoot()?.querySelectorAll('.math') || [])];

const queueMathJaxTask = task => {
  const startupPromise = window.MathJax?.startup?.promise || Promise.resolve();
  mathJaxTypesetPromise = (mathJaxTypesetPromise || startupPromise).then(task, task);
};

const getMathJaxRootWidth = () => {
  const root = getMathJaxRoot();
  return root ? Math.round(root.getBoundingClientRect().width) : null;
};

const renderMathJax = () => {
  if (typeof window.MathJax?.typesetPromise !== 'function') return;
  const targets = getMathJaxTargets();
  if (!targets.length) return;

  targets.forEach(node => {
    if (!mathJaxSourceCache.has(node)) mathJaxSourceCache.set(node, node.innerHTML);
  });
  queueMathJaxTask(() => window.MathJax.typesetPromise(targets));
  mathJaxLastWidth = getMathJaxRootWidth();
};

// Re-typeset from the cached TeX so automatic line breaking re-flows on resize.
const rerenderMathJax = () => {
  if (typeof window.MathJax?.typesetPromise !== 'function') return;
  const targets = getMathJaxTargets();
  if (!targets.length) return;

  queueMathJaxTask(() => {
    targets.forEach(node => {
      if (!mathJaxSourceCache.has(node)) mathJaxSourceCache.set(node, node.innerHTML);
      const source = mathJaxSourceCache.get(node);
      if (source && node.innerHTML !== source) node.innerHTML = source;
    });
    window.MathJax.startup?.output?.clearCache?.();
    return window.MathJax.typesetPromise(targets);
  });
};

const configureMathJax = () => {
  if (mathJaxConfigured) return;
  const existing = window.MathJax || {};
  window.MathJax = {
    ...existing,
    startup: { ...(existing.startup || {}), typeset: false },
    tex: {
      inlineMath: [['$', '$'], ['\\(', '\\)']],
      displayMath: [['$$', '$$'], ['\\[', '\\]']],
      ...(existing.tex || {})
    },
    // scale trims the rendered math to 95%. MathJax matches its x-height to the
    // surrounding font, and Inter's is tall enough that math otherwise reads a
    // size large next to the words around it — most visibly inside titles.
    // Set in both blocks for the same reason linebreaks is: v4 reads the
    // generic `output` block, v3 the per-jax `chtml` one.
    chtml: {
      ...(existing.chtml || {}),
      scale: 0.98,
      linebreaks: { automatic: true, width: 'container' }
    },
    output: {
      ...(existing.output || {}),
      scale: 0.98,
      displayOverflow: 'linebreak',
      linebreaks: { automatic: true, width: 'container' }
    },
    options: {
      skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
      ...(existing.options || {}),
      renderActions: { addMenu: [], ...(existing.options?.renderActions || {}) }
    }
  };
  mathJaxConfigured = true;
};

const loadMathJaxIfNeeded = () => {
  if (bodyEl.dataset.mathjax !== 'true') return;
  if (typeof window.MathJax?.typesetPromise === 'function') {
    renderMathJax();
    return;
  }

  configureMathJax();

  if (!mathJaxLoadingPromise) {
    mathJaxLoadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@4/tex-mml-chtml.js';
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

const initMathJaxResize = () => {
  if (mathJaxResizeCleanup) {
    mathJaxResizeCleanup();
    mathJaxResizeCleanup = null;
  }
  if (bodyEl.dataset.mathjax !== 'true') return;

  let timer = null;
  const schedule = () => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const nextWidth = getMathJaxRootWidth();
      // Height-only resizes (mobile URL bar) must not trigger a re-typeset.
      if (nextWidth === null || nextWidth === mathJaxLastWidth) return;
      mathJaxLastWidth = nextWidth;
      rerenderMathJax();
    }, 150);
  };

  window.addEventListener('resize', schedule);
  mathJaxResizeCleanup = () => {
    window.removeEventListener('resize', schedule);
    if (timer !== null) clearTimeout(timer);
  };
};

/* ============================================================
   PJAX navigation
   Swaps <main> instead of reloading, so the header, theme, and
   scroll chrome never flash. Documents are prefetched on hover.
   ============================================================ */

const pjaxSupported = Boolean(window.history?.pushState);
let isPjaxNavigating = false;
let pjaxInitialized = false;
const pageCache = new Map();

const fetchPageDocument = async url => {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'X-Requested-With': 'jd-pjax' }
  });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return new DOMParser().parseFromString(await response.text(), 'text/html');
};

const getPageDocument = url => {
  if (!pageCache.has(url)) {
    pageCache.set(
      url,
      fetchPageDocument(url).catch(error => {
        pageCache.delete(url);
        throw error;
      })
    );
  }
  return pageCache.get(url);
};

const setActiveNavLink = navKey => {
  document.querySelectorAll('.site-nav a[data-nav]').forEach(link => {
    const isActive = Boolean(navKey) && link.dataset.nav === navKey;
    link.classList.toggle('active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
};

const updateBodyAttributes = newBody => {
  if (!newBody) return;
  const preservedTheme = bodyEl.dataset.theme;
  const wasTransitioning = bodyEl.classList.contains('is-transitioning');

  bodyEl.className = newBody.className || '';
  if (wasTransitioning) bodyEl.classList.add('is-transitioning');

  [...bodyEl.attributes].forEach(attr => {
    if (attr.name.startsWith('data-') && attr.name !== 'data-theme') bodyEl.removeAttribute(attr.name);
  });
  [...newBody.attributes].forEach(attr => {
    if (attr.name.startsWith('data-') && attr.name !== 'data-theme') bodyEl.setAttribute(attr.name, attr.value);
  });

  if (preservedTheme) bodyEl.dataset.theme = preservedTheme;
};

// Relative URLs inside the swapped <main> must resolve against the new path.
const updateBaseHref = urlObj => {
  const pathname = urlObj.pathname || '/';
  let baseHref;
  if (pathname.endsWith('/')) {
    baseHref = pathname;
  } else if (/\.[a-zA-Z0-9]+$/.test(pathname.split('/').pop() || '')) {
    baseHref = pathname.slice(0, pathname.lastIndexOf('/') + 1) || '/';
  } else {
    baseHref = `${pathname}/`;
  }

  let baseEl = document.querySelector('head base');
  if (!baseEl) {
    baseEl = document.createElement('base');
    document.head.prepend(baseEl);
  }
  baseEl.setAttribute('href', new URL(baseHref, urlObj.href).href);
};

/* Only <main> is swapped, so a stylesheet declared in the incoming page's own
   <head> would never be applied, and whatever it was responsible for renders
   unstyled. Adopt any sheet we don't already have. They are not removed on the
   way out: harmless, and dropping them would make going back flash. */
const adoptPageStylesheets = (doc, urlObj) => {
  const present = new Set([...document.querySelectorAll('link[rel="stylesheet"][href]')].map(link => link.href));

  doc.querySelectorAll('link[rel="stylesheet"][href]').forEach(link => {
    const href = new URL(link.getAttribute('href'), urlObj.href).href;
    if (present.has(href)) return;

    const adopted = document.createElement('link');
    adopted.rel = 'stylesheet';
    adopted.href = href;
    document.head.appendChild(adopted);
  });
};

const applyPageContent = (doc, urlObj) => {
  if (!doc) return;
  renderedPageKey = pageKey(urlObj);

  const titleEl = doc.querySelector('title');
  if (titleEl) document.title = titleEl.textContent.trim();

  adoptPageStylesheets(doc, urlObj);
  updateBaseHref(urlObj);
  updateBodyAttributes(doc.body);

  const currentMain = document.querySelector('main');
  const incomingMain = doc.querySelector('main');
  if (currentMain && incomingMain) currentMain.replaceWith(incomingMain.cloneNode(true));

  const placeholder = doc.querySelector('[data-site-header]');
  setActiveNavLink(placeholder ? placeholder.dataset.activeLink || '' : '');

  setYear();
  runPageEnhancements();
};

// 'instant' matters: 'auto' inherits CSS scroll-behavior: smooth, which would
// animate a silent correction and read as the page drifting under the reader.
const scrollToHashTarget = (hash, behavior = 'instant') => {
  const targetId = (hash || '').replace(/^#/, '');
  const target = targetId ? document.getElementById(decodeURIComponent(targetId)) : null;
  if (target) target.scrollIntoView({ behavior, block: 'start' });
  return Boolean(target);
};

const handleHashScroll = hash => {
  if (!scrollToHashTarget(hash, 'smooth')) window.scrollTo({ top: 0 });
};

/* A #fragment is resolved by the browser before the TOC is inserted, before
   webfonts swap, and before MathJax typesets — each of which moves the target.
   Rather than guess at hooks for every one, watch the target until its position
   stops drifting, and stand down the moment the reader takes over scrolling. */
const realignHashPosition = (hash = window.location.hash) => {
  if (!hash || hash === '#top') return;

  const targetId = decodeURIComponent(hash.replace(/^#/, ''));
  let ownedScrollY = null;
  let attempts = 0;

  const settle = () => {
    const target = document.getElementById(targetId);
    if (!target) return;

    // Once the reader scrolls away from where we put them, stop interfering.
    if (ownedScrollY !== null && Math.abs(window.scrollY - ownedScrollY) > 4) return;

    const offset = parseFloat(getComputedStyle(rootEl).scrollPaddingTop) || 0;
    if (Math.abs(target.getBoundingClientRect().top - offset) > 2) {
      target.scrollIntoView({ behavior: 'instant', block: 'start' });
      ownedScrollY = window.scrollY;
      tocUpdate?.();
    }

    if (++attempts < 14) setTimeout(settle, 150);
  };

  settle();

  // Typesetting can finish after the polling window on math-heavy notes,
  // so hook it directly and give the watcher another pass.
  if (bodyEl.dataset.mathjax === 'true') {
    const rerun = () => {
      attempts = 0;
      settle();
    };
    if (mathJaxLoadingPromise) {
      mathJaxLoadingPromise.then(() => queueMathJaxTask(rerun)).catch(() => {});
    } else {
      queueMathJaxTask(rerun);
    }
  }
};

const visitWithPjax = async (url, { historyMode = 'push' } = {}) => {
  if (!pjaxSupported) {
    window.location.href = url;
    return;
  }
  if (isPjaxNavigating) return;
  isPjaxNavigating = true;

  const urlObj = new URL(url, window.location.href);
  const finalUrl = `${normalizePathname(urlObj.pathname)}${urlObj.search}${urlObj.hash}`;

  // Start the fetch before the fade so a warm cache feels instantaneous.
  const docPromise = getPageDocument(urlObj.href);
  bodyEl.classList.add('is-transitioning');

  try {
    const nextDoc = await docPromise;
    applyPageContent(nextDoc, urlObj);

    if (historyMode === 'push') {
      window.history.pushState({ url: finalUrl }, '', finalUrl);
    } else if (historyMode === 'replace') {
      window.history.replaceState({ url: finalUrl }, '', finalUrl);
    }
    handleHashScroll(urlObj.hash);
    realignHashPosition(urlObj.hash);
  } catch {
    window.location.href = urlObj.href;
    return;
  } finally {
    bodyEl.classList.remove('is-transitioning');
    isPjaxNavigating = false;
  }
};

const pageKey = url => `${normalizePathname(url.pathname)}${url.search}`;

// What <main> currently shows. Tracked separately from window.location because
// popstate fires after the address bar has already moved.
let renderedPageKey = pageKey(new URL(window.location.href));

const resolveInternalHref = link => {
  if (!link || link.dataset.noPjax === 'true' || link.hasAttribute('download')) return null;
  if (link.target && link.target !== '_self') return null;

  const href = link.getAttribute('href');
  if (!href || /^(?:mailto:|tel:|javascript:)/i.test(href)) return null;

  let url;
  try {
    url = new URL(link.href, window.location.href);
  } catch {
    return null;
  }
  return url.origin === window.location.origin ? url : null;
};

const isEligiblePjaxLink = link => {
  if (!pjaxSupported) return false;

  const href = link && link.getAttribute('href');
  if (!href || href.startsWith('#')) return false;

  const url = resolveInternalHref(link);
  if (!url) return false;
  // PDFs and other assets should be handled by the browser, not swapped into <main>.
  if (/\.(?:pdf|zip|png|jpe?g|svg|webp|gz)$/i.test(url.pathname)) return false;

  return pageKey(url) !== pageKey(new URL(window.location.href));
};

const initPjaxNavigation = () => {
  if (!pjaxSupported || pjaxInitialized) return;
  pjaxInitialized = true;

  const initialUrl = `${normalizePathname(window.location.pathname)}${window.location.search}${window.location.hash}`;
  window.history.replaceState({ url: initialUrl }, '', window.location.href);

  document.addEventListener(
    'click',
    event => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      const link = event.target.closest('a');
      if (!link) return;

      /* Fragment-only links — "Back to top", pandoc's footnote refs — must be
         resolved against the page, not against <base>. updateBaseHref points
         <base> at the current page's DIRECTORY so relative links in a swapped
         <main> resolve correctly, and the browser then reads href="#top" on
         notes.html as "/#top": the homepage. Handling them here keeps the base
         doing its job and the anchors doing theirs. The TOC is exempt — its
         own click handler owns those links, including the active state. */
      const rawHref = link.getAttribute('href');
      if (rawHref && rawHref.startsWith('#') && !link.closest('.toc')) {
        event.preventDefault();
        const here = pageKey(new URL(window.location.href));
        if (rawHref === '#' || rawHref === '#top') {
          window.scrollTo({ top: 0, behavior: scrollBehavior() });
          window.history.replaceState({ url: here }, '', here);
        } else {
          handleHashScroll(rawHref);
          window.history.pushState({ url: `${here}${rawHref}` }, '', `${here}${rawHref}`);
        }
        return;
      }

      // A link to the page you are already on (Home, the brand) must not
      // re-navigate — scroll instead, and drop the fragment.
      const url = resolveInternalHref(link);
      if (url && pageKey(url) === pageKey(new URL(window.location.href)) && (!url.hash || url.hash === '#top')) {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: scrollBehavior() });
        window.history.replaceState({ url: pageKey(url) }, '', pageKey(url));
        return;
      }

      if (!isEligiblePjaxLink(link)) return;
      event.preventDefault();
      visitWithPjax(link.href);
    },
    true
  );

  // Warm the cache on intent, so the click itself has nothing left to wait for.
  const prefetch = event => {
    const link = event.target.closest?.('a');
    if (isEligiblePjaxLink(link)) getPageDocument(new URL(link.href, window.location.href).href).catch(() => {});
  };
  document.addEventListener('pointerover', prefetch, { passive: true });
  document.addEventListener('touchstart', prefetch, { passive: true });

  window.addEventListener('popstate', event => {
    const url =
      event.state?.url || `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const target = new URL(url, window.location.href);

    // Moving between anchors of the page already on screen: scroll, don't refetch.
    if (pageKey(target) === renderedPageKey) {
      handleHashScroll(target.hash);
      tocUpdate?.();
      return;
    }

    visitWithPjax(url, { historyMode: 'none' });
  });
};

/* ============================================================
   Selected content

   Papers live only in research.html; writings live only in notes.html.
   Anything tagged `data-selected` on those pages is fetched, compressed,
   and rendered into the matching mount on the homepage, so the pages can
   never drift apart. Tag an item to promote it; untag it to demote it.

   Same-origin static fetch — nothing here needs a server beyond what
   GitHub Pages already does. Whatever markup sits in the mount point
   stays put if the fetch fails or scripting is unavailable.
   ============================================================ */

// Distinct name: header.js is a classic script sharing this global scope,
// and it already defines an absolutizeUrls of its own.
const resolveRelativeUrls = (root, baseUrl) => {
  const isRelative = value => Boolean(value) && !/^(?:[a-zA-Z][a-zA-Z\d+\-.]*:|\/\/|\/|#)/.test(value.trim());
  [root, ...root.querySelectorAll('[href], [src]')].forEach(el => {
    ['href', 'src'].forEach(attribute => {
      const value = el.getAttribute && el.getAttribute(attribute);
      if (isRelative(value)) el.setAttribute(attribute, new URL(value, baseUrl).href);
    });
  });
};

const copyInto = (className, sourceEl, tag = 'p') => {
  if (!sourceEl) return null;
  const el = document.createElement(tag);
  el.className = className;
  el.innerHTML = sourceEl.innerHTML;
  return el;
};

const buildPaperEntry = (article, sourceHref) => {
  const entry = document.createElement('article');
  // A paper with an id gets a link, and the title anchor is stretched over the
  // whole row in CSS — so the row is clickable end to end like a writing row,
  // and entry--static (which reads as "goes nowhere") no longer applies.
  entry.className = article.id ? 'entry paper-entry' : 'entry entry--static paper-entry';

  // The year stays flush right on the title line, as on research.html.
  const titleEl = article.querySelector('.paper-title');
  const titleClone = titleEl ? titleEl.cloneNode(true) : null;
  let yearEl = null;
  if (titleClone) {
    const year = titleClone.querySelector('.paper-year');
    if (year) {
      yearEl = year;
      year.remove();
    }
  }

  // Only the status stays in the 8.5rem meta rail — it was sized for labels
  // like "In preparation" (7.4rem). Topic names run to 13.75rem, so they ride
  // the title line instead, where they have the width to stay on one line:
  // a wrapped tag stretches to its container, and CSS has no way to shrink a
  // box back to its longest wrapped line.
  const status = article.querySelector('.paper-status');
  const statusClone = status ? status.cloneNode(true) : null;
  let topicEl = null;
  if (statusClone) {
    const topic = statusClone.querySelector('paper-tag[topic]');
    if (topic) {
      topicEl = topic;
      topic.remove();
    }
  }

  const meta = document.createElement('div');
  meta.className = 'entry-meta';
  meta.innerHTML = statusClone ? statusClone.innerHTML : '';

  const body = document.createElement('div');
  body.className = 'entry-body';

  // The title links to the full entry; the arXiv link is separate and
  // explicit, so the two destinations can never be confused.
  const heading = document.createElement('h3');
  heading.className = 'entry-title';
  const titleHtml = titleClone ? titleClone.innerHTML.trim() : '';
  // The words go in one element of their own so the year is the only other
  // flex item — inline <span class="math"> in the title would otherwise
  // become a flex item too and drift away from the words around it.
  const titleText = document.createElement(article.id ? 'a' : 'span');
  titleText.className = 'entry-title__text';
  if (article.id) titleText.href = `${sourceHref}#${article.id}`;
  titleText.innerHTML = titleHtml;
  heading.appendChild(titleText);
  // Topic and year travel as one group, so they stay together when the title
  // is long enough to push them onto their own line.
  if (topicEl || yearEl) {
    const titleMeta = document.createElement('span');
    titleMeta.className = 'entry-title__meta';
    if (topicEl) titleMeta.appendChild(topicEl);
    if (yearEl) titleMeta.appendChild(yearEl);
    heading.appendChild(titleMeta);
  }
  body.appendChild(heading);

  const authors = copyInto('entry-authors', article.querySelector('.paper-authors'));
  if (authors) body.appendChild(authors);

  const summarySource =
    article.querySelector('[data-summary]') || article.querySelector('.paper-abstract p');
  const summary = copyInto('paper-entry__summary', summarySource);
  if (summary) body.appendChild(summary);

  // Every link in .paper-links comes across — arXiv, journal, DOI, code —
  // so adding a new kind on research.html needs no change here.
  const linkSources = [...article.querySelectorAll('.paper-links a[href]')];
  if (linkSources.length) {
    const links = document.createElement('p');
    links.className = 'paper-entry__links';
    linkSources.forEach(source => {
      const link = document.createElement('a');
      link.href = source.getAttribute('href');
      link.textContent = source.textContent.trim();
      if (source.target) link.target = source.target;
      if (source.rel) link.rel = source.rel;
      links.appendChild(link);
    });
    body.appendChild(links);
  }

  entry.append(meta, body);

  // Same affordance as a writing row, and only on rows that go somewhere.
  if (article.id) {
    const arrow = document.createElement('span');
    arrow.className = 'entry-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';
    entry.appendChild(arrow);
  }

  return entry;
};

/* A writing entry is already a compact row on notes.html, so it only needs
   cloning — with its URLs re-resolved against the page it came from. */
const buildWritingEntry = (entry, sourceHref) => {
  const clone = entry.cloneNode(true);
  clone.removeAttribute('data-selected');
  resolveRelativeUrls(clone, new URL(sourceHref, document.baseURI));
  return clone;
};

const SELECTED_SOURCES = [
  {
    mount: '[data-selected-papers]',
    defaultSource: 'research.html',
    item: '.paper[data-selected]',
    build: buildPaperEntry
  },
  {
    mount: '[data-selected-writings]',
    defaultSource: 'notes.html',
    item: '.entry[data-selected]',
    build: buildWritingEntry
  }
];

const loadSelectedInto = async ({ mount: mountSelector, defaultSource, item, build }) => {
  const mount = document.querySelector(mountSelector);
  if (!mount) return;

  const sourceHref = mount.dataset.source || defaultSource;

  try {
    // Shares the PJAX cache, so visiting the source page later costs nothing.
    const doc = await getPageDocument(new URL(sourceHref, document.baseURI).href);
    const items = [...doc.querySelectorAll(item)];
    if (!items.length) return;

    const fragment = document.createDocumentFragment();
    items.forEach(node => fragment.appendChild(build(node, sourceHref)));
    mount.replaceChildren(fragment);

    // Abstracts and note summaries carry TeX, so typeset what was just injected.
    loadMathJaxIfNeeded();
    hydrateEntryDates(mount);
  } catch (error) {
    console.error(`Unable to load selected content from ${sourceHref}:`, error);
  }
};

/* A writing's date belongs to the writing, so it is read out of the note
   itself (the .note-date in its eyebrow) rather than copied into the index by
   hand, where it would drift the first time a note was regenerated. A page
   with no .note-date — the Drive-hosted measure theory solutions, which carry
   no date of their own — keeps its label and gains nothing. Fetches share the
   PJAX cache, so hovering the entry afterwards costs nothing. */
const hydrateEntryDates = root => {
  const entries = [...root.querySelectorAll('a.entry[href]')].filter(entry => !entry.dataset.dateSource);

  entries.forEach(async entry => {
    entry.dataset.dateSource = 'pending';
    const meta = entry.querySelector('.entry-meta');
    if (!meta || meta.querySelector('.entry-date')) return;

    try {
      const doc = await getPageDocument(new URL(entry.getAttribute('href'), document.baseURI).href);
      const date = doc.querySelector('.note-date');
      const text = date && date.textContent.trim();
      if (!text) return;

      const dateEl = document.createElement('span');
      dateEl.className = 'entry-date';
      dateEl.textContent = text;
      meta.appendChild(dateEl);
      entry.dataset.dateSource = 'note';
    } catch (error) {
      // An index that loses a date is fine; one that loses a row is not.
    }
  });
};

const initSelectedContent = () => SELECTED_SOURCES.forEach(loadSelectedInto);

/* ============================================================
   Per-page wiring
   ============================================================ */

/* ============================================================
   Note back link
   Notes are reached from the writings index, so every note offers
   the way back to it. Injected rather than written into the note
   template: the generated notes predate it, and this keeps the
   markup identical across every note without a rebuild.
   ============================================================ */

const NOTE_BACK_LABEL = 'All writings';

// The header nav's own Writings link is already absolutized by header.js,
// so it knows the way back from any depth — reuse it rather than recompute.
const notesIndexHref = () =>
  document.querySelector('.site-nav a[data-nav="notes"]')?.href || 'notes.html';

const buildNoteBackLink = () => {
  const link = document.createElement('a');
  link.className = 'note-back';
  link.href = notesIndexHref();
  link.innerHTML = `<span class="note-back-arrow" aria-hidden="true">←</span><span>${NOTE_BACK_LABEL}</span>`;
  return link;
};

const initNoteBackLink = () => {
  // PJAX swaps <main> but keeps the header, so a stale copy must be cleared
  // on every render — including when leaving a note for an ordinary page.
  document.querySelectorAll('.note-back').forEach(el => el.remove());
  if (!bodyEl.classList.contains('note-article')) return;

  const main = document.querySelector('main');
  if (!main) return;

  /* Inside the article's own <header>, not as a sibling of it: on a note with a
     TOC, main is a grid, and a direct child would take a grid row of its own —
     a row the rail stretches to its full height, opening a large gap above the
     title. Nested, the link costs nothing but its own line. */
  const articleHeader = main.querySelector(':scope > header');
  (articleHeader || main).prepend(buildNoteBackLink());
};

function runPageEnhancements() {
  initStickyHeader();
  initHeroObserver();
  initToc();
  initNoteBackLink();
  initSelectedContent();
  // The writings index itself; the homepage copies are handled as they land.
  hydrateEntryDates(document);
  loadMathJaxIfNeeded();
  initMathJaxResize();
}

headerReady.then(() => {
  bindThemeButtons();
  syncToggleState(bodyEl.dataset.theme || 'light');
  runPageEnhancements();
  initPjaxNavigation();
  realignHashPosition();
});

/* ============================================================
   Custom elements
   ============================================================ */

const EMAIL_DISPLAY = 'jonathan.delgado AT uci.edu';
const EMAIL_BODY_MESSAGE =
  'Remember to replace the "AT" for an @ before attempting to send the email. This is done to prevent bots from scraping personal information and adding this email to a spam list.';

class EmailLink extends HTMLElement {
  connectedCallback() {
    if (this.hasAttribute('data-enhanced')) return;

    const displayText = this.textContent.trim() || EMAIL_DISPLAY;
    const anchor = document.createElement('a');
    anchor.href = `mailto:?subject=${encodeURIComponent(EMAIL_DISPLAY)}&body=${encodeURIComponent(
      EMAIL_BODY_MESSAGE
    )}`;
    anchor.className = 'email-link';

    // Font Awesome envelope. The stylesheet is a CDN <link> in every page's
    // head — every page, not just the ones using <jd-email>, because PJAX
    // keeps the head of whichever page you landed on first.
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

class GitHubLink extends HTMLElement {
  connectedCallback() {
    if (this.hasAttribute('data-enhanced')) return;

    const repo = (this.getAttribute('repo') || this.getAttribute('repo-link') || '').trim();
    if (!repo) return;

    const anchor = document.createElement('a');
    anchor.href = `https://github.com/otanan/${repo}`;
    anchor.target = '_blank';
    anchor.rel = 'noopener';
    anchor.textContent = this.textContent.trim() || 'GitHub';

    this.replaceChildren(anchor);
    this.setAttribute('data-enhanced', 'true');
  }
}

if (!customElements.get('jd-email')) customElements.define('jd-email', EmailLink);
if (!customElements.get('github-link')) customElements.define('github-link', GitHubLink);
