const headerPlaceholder = document.querySelector('[data-site-header]');

const createFallbackHeader = baseHref => {
  const fallbackHeader = document.createElement('header');
  fallbackHeader.className = 'site-header site-header--fallback';
  fallbackHeader.innerHTML = `
    <a class="brand" href="${baseHref || ''}index.html#top" aria-label="Go to homepage">
      <div>
        <p class="brand-name">Jonathan Delgado</p>
        <p class="brand-role">PhD Candidate · Pure Mathematics · UCI</p>
      </div>
    </a>
  `;
  return fallbackHeader;
};

const loadHeader = async () => {
  if (!headerPlaceholder) {
    return null;
  }

  const { actionLabel, actionHref, activeLink, hideAction, basePath = '', headerPath = 'partials/header.html' } =
    headerPlaceholder.dataset;
  const normalizedBase = basePath.endsWith('/') || basePath === '' ? basePath : `${basePath}/`;
  const normalizePath = path => {
    if (!path || path === '/') return '/';
    const cleaned = path.replace(/index\.html$/, '');
    return cleaned === '' ? '/' : cleaned;
  };
  const isRootPage = normalizePath(window.location.pathname || '/') === '/';

  const injectHeader = headerEl => {
    headerPlaceholder.replaceWith(headerEl);
    return headerEl;
  };

  const rewriteLocalAnchors = headerEl => {
    const anchors = headerEl.querySelectorAll('a[href^="index.html"], a[href^="./index.html"], a[href^="../index.html"]');
    anchors.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      const url = new URL(href, window.location.origin);
      const absolute = `${normalizePath(url.pathname)}${url.search}${url.hash}`;
      if (isRootPage) {
        if (absolute === '/index.html' || absolute === '/') {
          link.setAttribute('href', '#top');
          return;
        }
        if (absolute.startsWith('/index.html#')) {
          link.setAttribute('href', absolute.replace('/index.html', ''));
          return;
        }
      }
      link.setAttribute('href', absolute);
    });
  };

  const handleActiveState = headerEl => {
    if (!activeLink) return;
    const navLinks = headerEl.querySelectorAll('.site-nav a[data-nav]');
    navLinks.forEach(link => {
      if (link.dataset.nav === activeLink) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });
  };

  const buildHeaderPaths = () => {
    const paths = [];
    const primaryPath = `${normalizedBase}${headerPath}`;
    if (primaryPath && !paths.includes(primaryPath)) {
      paths.push(primaryPath);
    }
    if (normalizedBase && !paths.includes(headerPath)) {
      paths.push(headerPath);
    }
    const absolutePath = headerPath.startsWith('/') ? headerPath : `/${headerPath.replace(/^\/+/, '')}`;
    if (!paths.includes(absolutePath)) {
      paths.push(absolutePath);
    }
    return paths;
  };

  const tryLoadHeader = async () => {
    const paths = buildHeaderPaths();
    let lastError = null;
    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (!response.ok) {
          lastError = new Error(`Failed to load header (${response.status}) at ${path}`);
          continue;
        }
        const text = await response.text();
        return text;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError) {
      throw lastError;
    }
    throw new Error('Unable to resolve header path');
  };

  try {
    const markup = await tryLoadHeader();
    const template = document.createElement('template');
    template.innerHTML = markup.trim();
    const headerEl = template.content.firstElementChild;

    const shouldPrefix = url => {
      if (!normalizedBase) return false;
      if (!url) return false;
      const trimmed = url.trim();
      if (/^(?:[a-zA-Z]+:|\/\/|#|\.{1,2}\/|\/)/.test(trimmed)) {
        return false;
      }
      return true;
    };

    if (normalizedBase) {
      headerEl.querySelectorAll('[href]').forEach(link => {
        const current = link.getAttribute('href');
        if (shouldPrefix(current)) {
          link.setAttribute('href', `${normalizedBase}${current}`);
        }
      });
      headerEl.querySelectorAll('[src]').forEach(el => {
        const current = el.getAttribute('src');
        if (shouldPrefix(current)) {
          el.setAttribute('src', `${normalizedBase}${current}`);
        }
      });
    }

    const actionButton = headerEl.querySelector('[data-header-action]');
    if (actionButton) {
      if (typeof hideAction !== 'undefined') {
        actionButton.remove();
      } else {
        if (actionLabel) {
          actionButton.textContent = actionLabel;
        }
        if (actionHref) {
          actionButton.setAttribute('href', actionHref);
        }
      }
    }

    handleActiveState(headerEl);
    rewriteLocalAnchors(headerEl);
    return injectHeader(headerEl);
  } catch (error) {
    console.error('Unable to load header component:', error);
    const fallback = createFallbackHeader(normalizedBase);
    rewriteLocalAnchors(fallback);
    return injectHeader(fallback);
  }
};

const headerReadyPromise = loadHeader();
window.__headerReady = headerReadyPromise || Promise.resolve(null);
