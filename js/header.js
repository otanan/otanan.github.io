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

  const injectHeader = headerEl => {
    headerPlaceholder.replaceWith(headerEl);
    return headerEl;
  };

  const rewriteLocalAnchors = headerEl => {
    if (normalizedBase) return;
    const anchors = headerEl.querySelectorAll('a[href^="index.html"]');
    anchors.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      if (href === 'index.html') {
        link.setAttribute('href', '#top');
        return;
      }
      if (href.startsWith('index.html#')) {
        link.setAttribute('href', href.replace('index.html', ''));
      }
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

  try {
    const response = await fetch(`${normalizedBase}${headerPath}`);
    if (!response.ok) {
      throw new Error(`Failed to load header (${response.status})`);
    }
    const markup = await response.text();
    const template = document.createElement('template');
    template.innerHTML = markup.trim();
    const headerEl = template.content.firstElementChild;

    const shouldPrefix = url => {
      if (!normalizedBase) return false;
      if (!url) return false;
      const trimmed = url.trim();
      if (/^(?:[a-zA-Z]+:|\/\/|#|\.{1,2}\/)/.test(trimmed)) {
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
