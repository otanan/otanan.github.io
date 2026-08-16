/* ============================================================
   Shared header.

   Built here rather than fetched from a partial. Fetching cost more
   than it bought: it failed whenever the site was not served from a
   domain root, failed entirely under file://, and flashed an empty
   bar on every load. The markup below is the single source of truth —
   edit it here.

   URLs are written relative to the site root and resolved to ABSOLUTE
   ones before insertion. That matters because PJAX rewrites <base> to
   the current page's directory while this element survives navigation;
   relative links would otherwise re-resolve into whatever directory
   the reader last visited.
   ============================================================ */

const HEADER_MARKUP = `
<header class="site-header" data-header-component>
  <a class="brand" href="index.html" aria-label="Go to homepage">
    <div class="brand-mark">
      <img src="assets/jdelgado.webp" alt="" />
    </div>
    <div>
      <p class="brand-name">Jonathan Delgado</p>
      <p class="brand-role">PhD Candidate · Mathematics · UCI</p>
    </div>
  </a>
  <!-- Every link resolves to its own page. In-page sections belong to the
       table of contents built by main.js, never to this bar. -->
  <nav class="site-nav" aria-label="Primary">
    <a href="index.html" data-nav="home">Home</a>
    <a href="research.html" data-nav="research">Research</a>
    <a href="notes.html" data-nav="notes">Writings</a>
    <a href="teaching.html" data-nav="teaching">Teaching</a>
    <a href="cv.html" data-nav="cv">CV</a>
  </nav>
  <div class="header-actions">
    <button class="toggle-theme" type="button" aria-pressed="false" aria-label="Toggle dark mode">
      <svg class="icon-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
      <svg class="icon-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
      <span class="toggle-label">Light mode</span>
    </button>
  </div>
</header>
`;

const headerPlaceholder = document.querySelector('[data-site-header]');

const isRelativeUrl = value => Boolean(value) && !/^(?:[a-zA-Z][a-zA-Z\d+\-.]*:|\/\/|\/|#)/.test(value.trim());

/* data-base-path says how far the current page sits below the site root
   ('' at the root, '../../' inside notes/<note>/). Resolving it against
   the current URL finds the root in any hosting arrangement — domain
   root, a subdirectory, or file://. */
const resolveSiteRoot = basePath => new URL(basePath || './', window.location.href);

const absolutizeUrls = (headerEl, siteRoot) => {
  headerEl.querySelectorAll('[href], [src]').forEach(el => {
    ['href', 'src'].forEach(attribute => {
      const value = el.getAttribute(attribute);
      if (isRelativeUrl(value)) el.setAttribute(attribute, new URL(value, siteRoot).href);
    });
  });
};

const markActiveLink = (headerEl, activeLink) => {
  if (!activeLink) return;
  headerEl.querySelectorAll('.site-nav a[data-nav]').forEach(link => {
    if (link.dataset.nav === activeLink) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }
  });
};

const buildHeader = () => {
  if (!headerPlaceholder) return null;

  const template = document.createElement('template');
  template.innerHTML = HEADER_MARKUP.trim();

  const headerEl = template.content.firstElementChild;
  if (!headerEl) return null;

  absolutizeUrls(headerEl, resolveSiteRoot(headerPlaceholder.dataset.basePath));
  markActiveLink(headerEl, headerPlaceholder.dataset.activeLink);
  headerPlaceholder.replaceWith(headerEl);
  return headerEl;
};

// Synchronous: no fetch, so the header is in place before first paint.
window.__headerReady = Promise.resolve(buildHeader());
