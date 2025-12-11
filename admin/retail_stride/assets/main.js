const resetWebflowStyles = () => {
  document.querySelectorAll('[data-w-id]').forEach((el) => {
    const style = el.getAttribute('style');
    if (!style) return;
    if (/opacity:\s*0/.test(style)) {
      el.style.opacity = '1';
    }
    if (/transform:/.test(style)) {
      el.style.transform = 'none';
    }
  });
};

const smoothScroll = (targetId) => {
  const target = document.querySelector(targetId);
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const attachSmoothScrollHandlers = (root = document, onNavigate) => {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  root.querySelectorAll('.nav_menu a, .mobile-nav_content a, .footer2_link, .btn.btn-primary, .btn.btn_reverse').forEach((anchor) => {
    const { hash } = anchor;
    if (!hash || hash.length <= 1) return;
    if (anchor.dataset.smoothScrollBound === 'true') return;
    anchor.dataset.smoothScrollBound = 'true';
    anchor.addEventListener('click', (event) => {
      if (document.getElementById(hash.substring(1))) {
        event.preventDefault();
        smoothScroll(hash);
        if (typeof onNavigate === 'function') {
          onNavigate();
        }
      }
    });
  });
};

const resolveAssetUrl = (relativePath) => {
  const script = document.querySelector('script[src*="assets/main.js"]');
  return script ? new URL(relativePath, script.src).href : `/assets/${relativePath}`;
};

const isPdfDownloadMode = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const search = typeof window.location?.search === 'string' ? window.location.search : '';
    const params = new URLSearchParams(search);
    const value = params.get('pdf');
    if (value == null) {
      return false;
    }
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  } catch (error) {
    console.warn('Failed to parse pdf mode flag from URL', error);
    return false;
  }
};

const applyBodyPdfModeState = (enabled) => {
  if (typeof document === 'undefined') {
    return;
  }
  const body = document.body;
  if (!body) {
    return;
  }
  body.classList.toggle('pdf-mode', Boolean(enabled));
};

const HTML2CANVAS_CDN_VERSION = '1.4.1';
const JSPDF_CDN_VERSION = '2.5.1';
let html2canvasLoader = null;
let jsPdfLoader = null;

const loadExternalScriptOnce = (src, datasetKey) =>
  new Promise((resolve, reject) => {
    let script = document.querySelector(`script[data-${datasetKey}]`);
    if (script) {
      if (script.dataset.loaded === 'true') {
        resolve();
        return;
      }
      script.addEventListener(
        'load',
        () => {
          script.dataset.loaded = 'true';
          resolve();
        },
        { once: true },
      );
      script.addEventListener(
        'error',
        () => reject(new Error(`Failed to load script: ${src}`)),
        { once: true },
      );
      return;
    }

    script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.dataset[datasetKey] = 'true';
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true';
        resolve();
      },
      { once: true },
    );
    script.addEventListener(
      'error',
      () => reject(new Error(`Failed to load script: ${src}`)),
      { once: true },
    );
    document.body.appendChild(script);
  });

const loadHtml2CanvasLibrary = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('html2canvas requires a browser environment'));
  }
  if (typeof window.html2canvas === 'function') {
    return Promise.resolve(window.html2canvas);
  }
  if (!html2canvasLoader) {
    const src = `https://cdnjs.cloudflare.com/ajax/libs/html2canvas/${HTML2CANVAS_CDN_VERSION}/html2canvas.min.js`;
    html2canvasLoader = loadExternalScriptOnce(src, 'html2canvas')
      .then(() => {
        if (typeof window.html2canvas !== 'function') {
          throw new Error('html2canvas failed to initialize');
        }
        return window.html2canvas;
      })
      .catch((error) => {
        html2canvasLoader = null;
        throw error;
      });
  }
  return html2canvasLoader;
};

const loadJsPdfLibrary = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('jsPDF requires a browser environment'));
  }
  if (window.jspdf && typeof window.jspdf.jsPDF === 'function') {
    return Promise.resolve(window.jspdf.jsPDF);
  }
  if (!jsPdfLoader) {
    const src = `https://cdnjs.cloudflare.com/ajax/libs/jspdf/${JSPDF_CDN_VERSION}/jspdf.umd.min.js`;
    jsPdfLoader = loadExternalScriptOnce(src, 'jspdf')
      .then(() => {
        if (!(window.jspdf && typeof window.jspdf.jsPDF === 'function')) {
          throw new Error('jsPDF failed to initialize');
        }
        return window.jspdf.jsPDF;
      })
      .catch((error) => {
        jsPdfLoader = null;
        throw error;
      });
  }
  return jsPdfLoader;
};

const generatePdfFromElement = async (element, options = {}) => {
  if (!element) {
    throw new Error('No element provided to generate PDF');
  }

  const {
    html2canvas: html2canvasOptions = {},
    breakOffsets = [],
    protectedSections = [],
    footerBounds = null,
  } = options;

  const html2canvas = await loadHtml2CanvasLibrary();
  const JsPdfConstructor = await loadJsPdfLibrary();

  const scale = Math.min(Math.max(window.devicePixelRatio || 2, 2), 3);
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth,
    ...html2canvasOptions,
  });

  const pdf = new JsPdfConstructor({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
    compress: true,
  });

  const margin = 0; // let page CSS define its own spacing
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pdfWidth - margin * 2;
  const contentHeight = pdfHeight - margin * 2;

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const elementScrollHeight = Math.max(element.scrollHeight, 1);
  const verticalScale = canvasHeight / elementScrollHeight;
  const pageHeightPx = (contentHeight * canvasWidth) / contentWidth;

  const tolerancePx = Math.max(verticalScale * 4, 4);
  const minGapPx = Math.max(verticalScale * 24, 24);
  let breakpointsPx = Array.isArray(breakOffsets)
    ? Array.from(
        new Set(
          breakOffsets
            .map((offset) => Math.round(offset * verticalScale))
            .filter((value) => Number.isFinite(value) && value > 0 && value < canvasHeight),
        ),
      )
    : [];

  const protectedSectionsPx = Array.isArray(protectedSections)
    ? protectedSections
        .map((section) => {
          if (
            !section ||
            !Number.isFinite(section.start) ||
            !Number.isFinite(section.end) ||
            section.end <= section.start
          ) {
            return null;
          }
          const start = Math.round(section.start * verticalScale);
          const end = Math.round(section.end * verticalScale);
          const height = Math.max(end - start, 0);
          if (!(Number.isFinite(start) && Number.isFinite(end)) || height <= 0) {
            return null;
          }
          return { start, end, height };
        })
        .filter(Boolean)
    : [];

  const footerPx =
    footerBounds &&
    Number.isFinite(footerBounds.start) &&
    Number.isFinite(footerBounds.end) &&
    footerBounds.end > footerBounds.start
      ? {
          start: Math.round(footerBounds.start * verticalScale),
          end: Math.round(footerBounds.end * verticalScale),
          height: Math.max(Math.round(footerBounds.height * verticalScale), 0),
        }
      : null;

  const footerHeightPx = footerPx ? footerPx.height : 0;
  const canRepeatFooter = Boolean(
    footerPx && footerHeightPx < pageHeightPx - tolerancePx
  );
  const reservedFooterHeightPx = canRepeatFooter ? footerHeightPx : 0;
  const footerRenderedHeight = canRepeatFooter
    ? (footerHeightPx / canvasWidth) * contentWidth
    : 0;
  // Reserve vertical room for the footer on each PDF page when repeating it.
  const pageContentHeightPx = Math.max(
    pageHeightPx - reservedFooterHeightPx,
    tolerancePx * 2,
  );
  const contentEndPx = canRepeatFooter
    ? Math.min(Math.max(footerPx.start, 0), canvasHeight)
    : canvasHeight;

  breakpointsPx = breakpointsPx.filter((value) => value <= contentEndPx);
  if (!breakpointsPx.includes(contentEndPx)) {
    breakpointsPx.push(contentEndPx);
  }
  breakpointsPx.sort((a, b) => a - b);

  let footerImageData = null;
  if (canRepeatFooter && footerPx) {
    const footerCanvas = document.createElement('canvas');
    footerCanvas.width = canvasWidth;
    footerCanvas.height = Math.max(footerHeightPx, 1);
    const footerCtx = footerCanvas.getContext('2d');
    footerCtx.drawImage(
      canvas,
      0,
      footerPx.start,
      canvasWidth,
      footerHeightPx,
      0,
      0,
      canvasWidth,
      footerHeightPx,
    );
    footerImageData = footerCanvas.toDataURL('image/png', 1.0);
  }

  let positionPx = 0;
  let pageIndex = 0;

  while (
    positionPx < contentEndPx - tolerancePx ||
    (pageIndex === 0 && contentEndPx > positionPx + tolerancePx / 2)
  ) {
    while (breakpointsPx.length && breakpointsPx[0] <= positionPx + minGapPx) {
      breakpointsPx.shift();
    }

    let sliceEndPx = Math.min(positionPx + pageContentHeightPx, contentEndPx);
    let selectedBreakpoint = null;

    for (let i = 0; i < breakpointsPx.length; i += 1) {
      const breakpoint = breakpointsPx[i];
      if (breakpoint - positionPx <= pageContentHeightPx + tolerancePx) {
        selectedBreakpoint = breakpoint;
      } else {
        break;
      }
    }

    if (selectedBreakpoint != null) {
      sliceEndPx = selectedBreakpoint;
    }

    const interferingSection = protectedSectionsPx.find((section) => {
      if (section.end <= positionPx + tolerancePx) {
        return false;
      }
      const crossesCut =
        section.start < sliceEndPx - tolerancePx && section.end > sliceEndPx + tolerancePx;
      const fitsWithinPage = section.height <= pageContentHeightPx - tolerancePx;
      return crossesCut && fitsWithinPage;
    });

    if (interferingSection) {
      const candidateEnd = Math.max(positionPx, interferingSection.start);
      if (candidateEnd - positionPx > tolerancePx) {
        sliceEndPx = candidateEnd;
      }
    }

    if (sliceEndPx - positionPx <= tolerancePx) {
      sliceEndPx = Math.min(positionPx + pageContentHeightPx, contentEndPx);
    }

    const sliceHeightPx = Math.max(sliceEndPx - positionPx, 0);
    if (sliceHeightPx <= tolerancePx) {
      break;
    }

    while (breakpointsPx.length && breakpointsPx[0] <= sliceEndPx + tolerancePx) {
      breakpointsPx.shift();
    }

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvasWidth;
    pageCanvas.height = sliceHeightPx;
    const ctx = pageCanvas.getContext('2d');
    ctx.drawImage(
      canvas,
      0,
      positionPx,
      canvasWidth,
      sliceHeightPx,
      0,
      0,
      canvasWidth,
      sliceHeightPx,
    );

    const imgData = pageCanvas.toDataURL('image/png', 1.0);
    const renderedHeight = (sliceHeightPx / canvasWidth) * contentWidth;

    if (pageIndex > 0) {
      pdf.addPage();
    }
    const containsFooter =
      !canRepeatFooter &&
      footerPx &&
      footerPx.end > positionPx + tolerancePx &&
      footerPx.start < sliceEndPx - tolerancePx;
    const renderY = containsFooter
      ? Math.max(pdfHeight - margin - renderedHeight, margin)
      : margin;
    pdf.addImage(imgData, 'PNG', margin, renderY, contentWidth, renderedHeight, undefined, 'FAST');
    if (canRepeatFooter && footerImageData) {
      const footerY = Math.max(pdfHeight - margin - footerRenderedHeight, margin);
      pdf.addImage(
        footerImageData,
        'PNG',
        margin,
        footerY,
        contentWidth,
        footerRenderedHeight,
        undefined,
        'FAST',
      );
    }

    positionPx += sliceHeightPx;
    pageIndex += 1;
  }

  if (!pageIndex) {
    throw new Error('Failed to render content into PDF.');
  }

  return pdf;
};

const withPdfExportState = async (container, task) => {
  if (typeof document === 'undefined') {
    return task();
  }

  const body = document.body;
  if (!body) {
    return task();
  }

  const previousScrollX = window.scrollX || document.documentElement.scrollLeft || 0;
  const previousScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  const previousOverflow = body.style.overflow;

  body.classList.add('pdf-exporting');
  body.style.overflow = 'hidden';
  window.scrollTo(0, 0);

  try {
    return await task();
  } finally {
    body.classList.remove('pdf-exporting');
    body.style.overflow = previousOverflow;
    window.scrollTo(previousScrollX, previousScrollY);
  }
};

const getRelativeOffsetTop = (element, container) => {
  if (!(element instanceof HTMLElement) || !(container instanceof HTMLElement)) return 0;
  let offset = 0;
  let node = element;
  while (node && node !== container) {
    offset += node.offsetTop || 0;
    node = node.offsetParent;
  }
  return offset;
};

const collectBreakOffsets = (container, selectors = []) => {
  if (!(container instanceof HTMLElement)) {
    return [];
  }
  const offsets = new Set();
  selectors.forEach((selector) => {
    container.querySelectorAll(selector).forEach((element) => {
      const offset = getRelativeOffsetTop(element, container);
      if (Number.isFinite(offset) && offset > 0) {
        offsets.add(offset);
      }
    });
  });
  return Array.from(offsets).sort((a, b) => a - b);
};

const collectElementBounds = (container, selectors = []) => {
  if (!(container instanceof HTMLElement)) {
    return [];
  }
  const bounds = [];
  selectors.forEach((selector) => {
    container.querySelectorAll(selector).forEach((element) => {
      if (!(element instanceof HTMLElement)) return;
      const start = getRelativeOffsetTop(element, container);
      const height = element.offsetHeight;
      if (!(Number.isFinite(start) && Number.isFinite(height)) || height <= 0) {
        return;
      }
      bounds.push({
        selector,
        start,
        end: start + height,
        height,
      });
    });
  });
  bounds.sort((a, b) => a.start - b.start);
  return bounds;
};

const initializePolicyPdfDownloads = () => {
  const pdfModeEnabled = isPdfDownloadMode();
  applyBodyPdfModeState(pdfModeEnabled);

  const triggers = document.querySelectorAll('[data-pdf-download]');
  if (!triggers.length) return;

  triggers.forEach((trigger) => {
    if (!(trigger instanceof HTMLElement)) return;
    if (trigger.dataset.pdfInitialized === 'true') return;

    if (!pdfModeEnabled) {
      trigger.setAttribute('hidden', 'hidden');
      trigger.setAttribute('aria-hidden', 'true');
      trigger.setAttribute('aria-disabled', 'true');
      trigger.setAttribute('tabindex', '-1');
      trigger.dataset.pdfInitialized = 'true';
      return;
    }

    trigger.removeAttribute('hidden');
    trigger.removeAttribute('aria-hidden');
    if (trigger.getAttribute('tabindex') === '-1') {
      trigger.removeAttribute('tabindex');
    }
    if (trigger.getAttribute('aria-disabled') === 'true') {
      trigger.removeAttribute('aria-disabled');
    }

    const targetSelector = trigger.getAttribute('data-pdf-target') || '.pdf-page';
    const target =
      trigger.closest(targetSelector) ||
      document.querySelector(targetSelector);
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const filename =
      trigger.getAttribute('data-pdf-filename') || 'RetailStride-Document.pdf';
    const originalText = trigger.textContent;
    const originalAriaLabel = trigger.getAttribute('aria-label');

    const setLoadingState = (isLoading) => {
      trigger.setAttribute('aria-disabled', isLoading ? 'true' : 'false');
      trigger.classList.toggle('is-loading', isLoading);
      if (isLoading) {
        trigger.textContent = 'Preparing PDF…';
      } else if (originalText != null) {
        trigger.textContent = originalText;
      }
      if (originalAriaLabel) {
        trigger.setAttribute(
          'aria-label',
          isLoading ? 'Preparing downloadable PDF' : originalAriaLabel,
        );
      }
    };

    const handleError = (error) => {
      console.error('PDF generation failed', error);
      window.alert(
        'We were unable to generate the PDF. Please try again in a moment or capture the page using your browser’s print to PDF option.',
      );
    };

    trigger.addEventListener('click', async (event) => {
      event.preventDefault();
      if (trigger.getAttribute('aria-disabled') === 'true') return;
      setLoadingState(true);
      try {
        const pdf = await withPdfExportState(target, async () => {
          const breakOffsets = collectBreakOffsets(target, ['.pdf-section', '.pdf-footer']);
          const protectedSections = collectElementBounds(target, ['.pdf-section']);
          const [footerBounds] = collectElementBounds(target, ['.pdf-footer']);
          return generatePdfFromElement(target, {
            breakOffsets,
            protectedSections,
            footerBounds: footerBounds || null,
          });
        });
        pdf.save(filename);
      } catch (error) {
        handleError(error);
      } finally {
        setLoadingState(false);
      }
    });

    trigger.dataset.pdfInitialized = 'true';
  });
};

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePolicyPdfDownloads);
  } else {
    initializePolicyPdfDownloads();
  }
}

const TILE_PROVIDERS = {
  osmStandard: {
    id: 'osmStandard',
    label: 'OpenStreetMap Standard',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    creditText: 'Map data © OpenStreetMap contributors',
    maxZoom: 19,
    options: {},
  },
};
const DEFAULT_TILE_PROVIDER = 'osmStandard';
const LEAFLET_CDN_VERSION = '1.9.4';
let leafletLoader = null;

const loadLeafletLibrary = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Leaflet requires a browser environment'));
  }
  if (typeof L !== 'undefined') {
    return Promise.resolve(L);
  }
  if (!leafletLoader) {
    leafletLoader = new Promise((resolve, reject) => {
      const cleanup = (error) => {
        leafletLoader = null;
        reject(error);
      };

      if (!document.querySelector('link[data-leaflet]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `https://unpkg.com/leaflet@${LEAFLET_CDN_VERSION}/dist/leaflet.css`;
        link.dataset.leaflet = 'true';
        document.head.appendChild(link);
      }

      const handleReady = () => {
        if (typeof L === 'undefined') {
          cleanup(new Error('Leaflet failed to initialize'));
          return;
        }
        resolve(L);
      };

      let script = document.querySelector('script[data-leaflet]');
      if (script) {
        if (script.dataset.loaded === 'true' && typeof L !== 'undefined') {
          resolve(L);
          return;
        }
        script.addEventListener(
          'load',
          () => {
            script.dataset.loaded = 'true';
            handleReady();
          },
          { once: true },
        );
        script.addEventListener(
          'error',
          () => cleanup(new Error('Leaflet script failed to load')),
          { once: true },
        );
        return;
      }

      script = document.createElement('script');
      script.src = `https://unpkg.com/leaflet@${LEAFLET_CDN_VERSION}/dist/leaflet.js`;
      script.async = true;
      script.defer = true;
      script.dataset.leaflet = 'true';
      script.addEventListener('load', () => {
        script.dataset.loaded = 'true';
        handleReady();
      });
      script.addEventListener('error', () => cleanup(new Error('Leaflet script failed to load')));
      document.body.appendChild(script);
    }).catch((error) => {
      leafletLoader = null;
      throw error;
    });
  }
  return leafletLoader;
};

let locationsDataPromise = null;

const sanitizeLocationEntry = (entry) => {
  if (!entry || typeof entry !== 'object') return null;
  const lat = Number(entry.lat ?? entry.latitude);
  const lon = Number(entry.lon ?? entry.lng ?? entry.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const city = typeof entry.city === 'string' ? entry.city.trim() : '';
  const county = typeof entry.county === 'string' ? entry.county.trim() : '';
  const state = typeof entry.state === 'string' ? entry.state.trim() : '';
  const populationValue = Number(entry.population);
  const countValue = Number(entry.count);
  return {
    city,
    county,
    state,
    lat,
    lon,
    population: Number.isFinite(populationValue) && populationValue > 0 ? populationValue : null,
    count: Number.isFinite(countValue) && countValue > 0 ? countValue : null,
  };
};

const loadLocationsData = async () => {
  if (!locationsDataPromise) {
    const dataUrl = resolveAssetUrl('../assets/data/locations/all.json');
    locationsDataPromise = fetch(dataUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch location data: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          return [];
        }
        return data.map(sanitizeLocationEntry).filter(Boolean);
      })
      .catch((error) => {
        locationsDataPromise = null;
        throw error;
      });
  }
  return locationsDataPromise;
};

const formatNumber = (value) => {
  if (!Number.isFinite(value)) return '--';
  return value.toLocaleString();
};

const initLocationsMap = async () => {
  const section = document.querySelector('[data-locations-map]');
  if (!section || section.dataset.mapInitialized === 'true') return;

  const canvas = section.querySelector('[data-locations-map-canvas]');
  if (!canvas) return;

  const statusEl = section.querySelector('[data-locations-map-status]');
  const creditEl = section.querySelector('[data-locations-map-credit]');

  const setStatus = (message) => {
    if (!statusEl) return;
    const text = message ? String(message) : '';
    statusEl.textContent = text;
    statusEl.hidden = text.length === 0;
  };

  setStatus('Loading retailer locations...');

  try {
    const [L, locations] = await Promise.all([loadLeafletLibrary(), loadLocationsData()]);
    if (!locations.length) {
      throw new Error('No location data available');
    }

    if (!canvas.style.height) {
      canvas.style.height = '520px';
    }

    const map = L.map(canvas, {
      center: [39.5, -98.35],
      zoom: 5,
      zoomControl: true,
      attributionControl: false,
      minZoom: 4,
      maxZoom: 7,
      scrollWheelZoom: false,
    });

    const getProvider = () => TILE_PROVIDERS[DEFAULT_TILE_PROVIDER];

    const createTileLayer = (provider) => {
      const layerOptions = {
        maxZoom: Math.min(provider.maxZoom ?? 19, map.options.maxZoom ?? 7),
        attribution: provider.attribution || '',
        crossOrigin: 'anonymous',
        ...provider.options,
      };
      return L.tileLayer(provider.url, layerOptions);
    };

    const updateCredit = (provider) => {
      if (!creditEl) return;
      const text = provider.creditText || provider.attribution || '';
      creditEl.textContent = text;
      creditEl.hidden = text.length === 0;
    };

    const provider = getProvider();
    const tileLayer = createTileLayer(provider);
    tileLayer.on('tileerror', (event) => {
      console.warn(`Tile load error for provider "${provider.label}"`, event?.error || event);
    });
    tileLayer.addTo(map);
    updateCredit(provider);
    console.log(`Locations map tiles set to: ${provider.label}`);
    map.on('zoomend', () => {
      const currentZoom = map.getZoom();
      console.log(`Locations map zoom level: ${currentZoom}`);
    });

    const values = locations
      .map((location) => {
        const value = Number.isFinite(location.count) && location.count > 0 ? location.count : location.population;
        return Number.isFinite(value) && value > 0 ? value : null;
      })
      .filter((value) => value != null);

    const minValue = values.length ? Math.min(...values) : 0;
    const maxValue = values.length ? Math.max(...values) : 0;
    const radius = (value) => {
      if (!Number.isFinite(value) || value <= 0) return 4;
      if (minValue === maxValue) return 9;
      const normalized = (value - minValue) / (maxValue - minValue || 1);
      return 4 + normalized * 8;
    };

    const circleMarkers = locations.map((location) => {
      const sizeValue =
        Number.isFinite(location.count) && location.count > 0 ? location.count : location.population || 1;
      const marker = L.circleMarker([location.lat, location.lon], {
        radius: radius(sizeValue),
        weight: 1,
        color: '#1f2937',
        opacity: 0.85,
        fillColor: '#2563eb',
        fillOpacity: 0.6,
        interactive: true,
      }).addTo(map);

      const countyLabel = location.county || location.city || '—';
      const stateLabel = location.state || 'Coverage Area';
      const populationLabel = Number.isFinite(location.population) ? formatNumber(location.population) : '—';
      const retailerLabel = Number.isFinite(location.count) ? formatNumber(location.count) : '—';
      const tooltipHtml = [
        `<strong>${stateLabel}</strong>`,
        `County: ${countyLabel}`,
        `Population: ${populationLabel}`,
        `Retailers: ${retailerLabel}`,
      ].join('<br>');
      marker.bindTooltip(tooltipHtml, { direction: 'top', opacity: 0.95, className: 'locations-map__tooltip' });
      return marker;
    });

    if (circleMarkers.length) {
      const bounds = L.featureGroup(circleMarkers).getBounds().pad(0.2);
      if (bounds.isValid()) {
        const preferredZoom = map.getBoundsZoom(bounds);
        const clampedZoom = Math.max(5, Math.min(preferredZoom, 6));
        const targetCenter = bounds.getCenter();
        map.setView(targetCenter, clampedZoom, { animate: false });
      }
    }

    map.whenReady(() => {
      requestAnimationFrame(() => {
        map.invalidateSize();
      });
    });

    setStatus('');
    section.dataset.mapInitialized = 'true';
  } catch (error) {
    console.error('Locations map initialization failed', error);
    setStatus("We're unable to display the map right now.");
    if (creditEl) {
      creditEl.textContent = 'Map data © OpenStreetMap contributors | Tiles © OpenStreetMap';
      creditEl.hidden = false;
    }
  }
};

const getFormName = (form, fallback = '') => {
  if (!form) return fallback;
  const name = form.dataset?.formName || '';
  const trimmed = typeof name === 'string' ? name.trim() : '';
  return trimmed || fallback;
};

const findFormControl = (form, fieldName, rawValue) => {
  if (!form || !fieldName) return null;
  const controls = form.elements?.[fieldName];
  if (!controls) return null;
  const isCollection = typeof controls.length === 'number' && controls.length > 0 && !controls.tagName;
  if (!isCollection) {
    return controls;
  }
  const controlArray = Array.from(controls);
  const valueString = typeof rawValue === 'string' ? rawValue : String(rawValue);
  return (
    controlArray.find((control) => {
      if ((control.type === 'radio' || control.type === 'checkbox') && !control.checked) {
        return false;
      }
      return control.value === rawValue || control.value === valueString || control.value === valueString.trim();
    }) ||
    controlArray.find((control) => control.checked) ||
    controlArray[0] ||
    null
  );
};

const getControlLabel = (control, form) => {
  if (!control) return '';
  const { id } = control;
  if (id) {
    const labels = form ? Array.from(form.querySelectorAll('label')) : [];
    const matchingLabel = labels.find((label) => label.htmlFor === id);
    if (matchingLabel) {
      return matchingLabel.textContent.trim();
    }
  }
  let node = control;
  while (node && node !== form) {
    if (node.tagName === 'LABEL') {
      return node.textContent.trim();
    }
    node = node.parentElement;
  }
  return '';
};

const normalizeSubmissionValue = (rawValue) => {
  if (typeof File !== 'undefined' && rawValue instanceof File) {
    return rawValue.name || '';
  }
  if (Array.isArray(rawValue)) {
    return rawValue.map((item) => normalizeSubmissionValue(item));
  }
  if (typeof rawValue === 'string') {
    return rawValue.trim();
  }
  if (rawValue == null) {
    return '';
  }
  return String(rawValue);
};

const buildFormSubmissionPayload = (form, formData) => {
  if (!formData) {
    return {
      page_url: window.location.href,
      submitted_uct: new Date().toISOString(),
      form: {},
      form_meta: {},
    };
  }

  const entries = typeof formData.entries === 'function' ? Array.from(formData.entries()) : [];
  const { formDict, formMeta } = entries
    .filter(([field]) => typeof field === 'string' && !field.startsWith('_'))
    .reduce(
      (acc, [field, rawValue]) => {
        const control = findFormControl(form, field, rawValue);
        const key = control?.id || field;
        if (!key) return acc;
        const normalizedValue = normalizeSubmissionValue(rawValue);
        if (Object.prototype.hasOwnProperty.call(acc.formDict, key)) {
          const existingValue = acc.formDict[key];
          if (Array.isArray(existingValue)) {
            existingValue.push(normalizedValue);
          } else {
            acc.formDict[key] = [existingValue, normalizedValue];
          }
        } else {
          acc.formDict[key] = normalizedValue;
        }

        if (!Object.prototype.hasOwnProperty.call(acc.formMeta, key)) {
          const labelText = getControlLabel(control, form);
          acc.formMeta[key] = labelText;
        }

        return acc;
      },
      { formDict: {}, formMeta: {} },
    );

  return {
    page_url: window.location.href,
    submitted_uct: new Date().toISOString(),
    form: formDict,
    form_meta: formMeta,
  };
};

const submitRecordedForm = async (formName, form, formData) => {
  if (typeof recordFormSubmission !== 'function') {
    throw new Error('Form handler unavailable');
  }

  const normalizedFormName = typeof formName === 'string' ? formName.trim() : '';
  if (!normalizedFormName) {
    throw new Error('Form submission skipped: invalid form name');
  }

  const payload = buildFormSubmissionPayload(form, formData);
  const result = await recordFormSubmission(normalizedFormName, payload);

  if (result?.skipped) {
    throw new Error(result?.reason || 'Submission skipped');
  }

  if (result?.ok === false) {
    throw new Error(result?.error || 'Submission failed');
  }

  return result;
};

const initCtaForm = () => {
  const form = document.querySelector('.cta_form-grid');
  if (!form) return;

  const statusEl = form.querySelector('.cta_form-status');
  const submitButton = form.querySelector('.cta_form-submit');
  const defaultButtonText = submitButton?.textContent ?? '';

  const updateStatus = (message, state) => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.remove('cta_form-status--success', 'cta_form-status--error');
    if (state) {
      statusEl.classList.add(`cta_form-status--${state}`);
    }
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    updateStatus('');

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending...';
    }
    const formData = new FormData(form);

    try {
      const formName = getFormName(form, 'cta_form');
      await submitRecordedForm(formName, form, formData);
      form.reset();
      updateStatus("Thanks! We'll be in touch soon.", 'success');
    } catch (error) {
      updateStatus('Something went wrong. Please try again later.', 'error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = defaultButtonText;
      }
    }
  });
};

const initApplicationForm = () => {
  const form = document.querySelector('[data-application-form]');
  if (!form) return;

  const statusEl = form.querySelector('[data-application-status]');
  const submitButton = form.querySelector('[data-application-submit]');
  const defaultButtonText = submitButton?.textContent ?? '';
  const accordion = form.querySelector('[data-application-accordion]');
  const accordionItems = accordion ? Array.from(accordion.querySelectorAll('.application-accordion__item')) : [];

  const setItemState = (item, expand) => {
    if (!item) return;
    const panel = item.querySelector('.application-accordion__panel');
    const toggle = item.querySelector('.application-accordion__toggle');
    if (!panel || !toggle) return;
    item.classList.toggle('is-open', expand);
    toggle.setAttribute('aria-expanded', expand ? 'true' : 'false');
    panel.hidden = !expand;
  };

  if (accordionItems.length) {
    accordionItems.forEach((item, index) => {
      setItemState(item, index === 0);
      const toggle = item.querySelector('.application-accordion__toggle');
      toggle?.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-open');
        if (!isOpen) {
          accordionItems.forEach((other) => {
            if (other !== item) {
              setItemState(other, false);
            }
          });
        }
        setItemState(item, !isOpen);
      });
    });
  }

  const onlineFieldWrapper = form.querySelector('[data-online-urls]');
  const onlineTextarea = onlineFieldWrapper?.querySelector('textarea');
  const onlineRadios = form.querySelectorAll('input[name="sell_online"]');

  const updateOnlineField = () => {
    if (!onlineFieldWrapper) return;
    const selected = Array.from(onlineRadios).find((radio) => radio.checked)?.value;
    const show = selected === 'Yes';
    onlineFieldWrapper.hidden = !show;
    if (onlineTextarea) {
      onlineTextarea.required = show;
      if (!show) {
        onlineTextarea.value = '';
      }
    }
  };

  if (onlineRadios.length) {
    onlineRadios.forEach((radio) => radio.addEventListener('change', updateOnlineField));
  }
  updateOnlineField();

  const setStatus = (message, state) => {
    if (!statusEl) return;
    statusEl.innerHTML = message;
    statusEl.classList.remove('application-status--success', 'application-status--error');
    if (state) {
      statusEl.classList.add(`application-status--${state}`);
    }
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('');

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting...';
    }

    const formData = new FormData(form);
    const formName = getFormName(form, 'retailer_app');

    try {
      await submitRecordedForm(formName, form, formData);

      form.reset();
      updateOnlineField();
      accordionItems.forEach((item, index) => setItemState(item, index === 0));

      setStatus(
        'Thank you — your application has been received. Our onboarding team reviews all submissions within 3 business days. Approved applicants will receive login credentials for wholesale access. <a href="#what-happens-next">What happens next</a>.',
        'success',
      );
    } catch (error) {
      setStatus('Something went wrong. Please try again later.', 'error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = defaultButtonText;
      }
    }
  });
};

const NAV_PATH_MAP = {
  '/': 'home',
  '/brands/': 'brands',
  '/retailers/': 'retailers',
  '/catalog/': 'catalog',
  '/apply/': 'retailers',
};

const normalizePathname = (pathname) => {
  if (typeof pathname !== 'string' || pathname.length === 0) {
    return '/';
  }
  const noIndex = pathname.replace(/index\.html$/i, '');
  if (noIndex === '' || noIndex === '/') {
    return '/';
  }
  return noIndex.endsWith('/') ? noIndex : `${noIndex}/`;
};

const determineNavCurrentKey = (container) => {
  if (!container || !container.dataset) return '';
  const explicit = (container.dataset.navCurrent || '').trim();
  if (explicit) {
    return explicit;
  }
  if (typeof window === 'undefined') return '';
  const normalizedPath = normalizePathname(window.location.pathname || '/');
  const directMatch = NAV_PATH_MAP[normalizedPath];
  if (directMatch) {
    return directMatch;
  }
  let fallbackKey = '';
  let fallbackLength = 0;
  Object.entries(NAV_PATH_MAP).forEach(([path, key]) => {
    if (path === '/') return;
    if (normalizedPath.endsWith(path) && path.length > fallbackLength) {
      fallbackKey = key;
      fallbackLength = path.length;
    }
  });
  if (fallbackKey) {
    return fallbackKey;
  }
  if (normalizedPath === '/' || normalizedPath.endsWith('/')) {
    return NAV_PATH_MAP['/'] || '';
  }
  return '';
};

const applyNavCurrentState = (navRoot, currentKey) => {
  if (!navRoot) return;
  const normalizedKey = typeof currentKey === 'string' ? currentKey.trim() : '';

  const navLinks = navRoot.querySelectorAll('[data-nav-link]');
  navLinks.forEach((link) => {
    if (!link.dataset.navOriginalHref) {
      const originalHref = link.getAttribute('href');
      if (originalHref != null) {
        link.dataset.navOriginalHref = originalHref;
      }
    }
    link.classList.remove('nav_is_current', 'w--current');
    link.removeAttribute('aria-current');
    link.removeAttribute('aria-disabled');
    const originalHref = link.dataset.navOriginalHref;
    if (originalHref != null && originalHref !== '') {
      link.setAttribute('href', originalHref);
    } else {
      link.removeAttribute('href');
    }
  });

  if (normalizedKey) {
    navRoot.querySelectorAll(`[data-nav-link="${normalizedKey}"]`).forEach((link) => {
      link.classList.add('nav_is_current');
      if (link.classList.contains('w-nav-link')) {
        link.classList.add('w--current');
      }
      link.setAttribute('aria-current', 'page');
      link.setAttribute('aria-disabled', 'true');
      link.removeAttribute('href');
    });
  }

  const isHome = normalizedKey === 'home';
  navRoot.querySelectorAll('[data-nav-brand]').forEach((brandLink) => {
    if (isHome) {
      brandLink.classList.add('w--current');
      brandLink.setAttribute('aria-current', 'page');
    } else {
      brandLink.classList.remove('w--current');
      brandLink.removeAttribute('aria-current');
    }
  });
};

const applyNavCtaOverrides = (navRoot, { label, href }) => {
  if (!navRoot) return;
  const normalizedLabel = typeof label === 'string' ? label.trim() : '';
  const normalizedHref = typeof href === 'string' ? href.trim() : '';
  if (!normalizedLabel && !normalizedHref) return;
  navRoot.querySelectorAll('[data-nav-cta]').forEach((ctaLink) => {
    if (normalizedLabel) {
      ctaLink.textContent = normalizedLabel;
    }
    if (normalizedHref) {
      ctaLink.setAttribute('href', normalizedHref);
    }
  });
};

const initNavigation = async () => {
  const containers = document.querySelectorAll('[data-navbar]');
  if (!containers.length) {
    return () => {};
  }

  const navUrl = resolveAssetUrl('nav.html');

  const response = await fetch(navUrl);
  if (!response.ok) {
    throw new Error(`Failed to load navigation partial: ${response.status}`);
  }

  const navHtml = await response.text();
  containers.forEach((container) => {
    container.innerHTML = navHtml;
    const navRoot = container.querySelector('[data-nav-root]') || container;
    const currentKey = determineNavCurrentKey(container);
    applyNavCurrentState(navRoot, currentKey);
    applyNavCtaOverrides(navRoot, {
      label: container.dataset.navCtaLabel,
      href: container.dataset.navCtaHref,
    });
  });

  const navRoot = document.querySelector('[data-nav-root]');
  const navMenu = navRoot?.querySelector('.nav_menu') || document.querySelector('.nav_menu');
  const navButton = navRoot?.querySelector('.navbar1_menu-button') || document.querySelector('.navbar1_menu-button');
  const mobileNav = navRoot?.querySelector('.mobile-nav_component') || document.querySelector('.mobile-nav_component');
  const overlay = document.getElementById('w-nav-overlay-0');
  let scrollLockState = null;

  const lockBodyScroll = () => {
    if (scrollLockState) return;
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const scrollbarCompensation = window.innerWidth - document.documentElement.clientWidth;
    scrollLockState = {
      scrollY,
      bodyStyles: {
        overflow: document.body.style.overflow,
        position: document.body.style.position,
        width: document.body.style.width,
        top: document.body.style.top,
        paddingRight: document.body.style.paddingRight,
      },
      htmlOverflow: document.documentElement.style.overflow,
    };
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${scrollY}px`;
    if (scrollbarCompensation > 0) {
      document.body.style.paddingRight = `${scrollbarCompensation}px`;
    }
    document.documentElement.style.overflow = 'hidden';
  };

  const unlockBodyScroll = () => {
    if (!scrollLockState) return;
    const { scrollY, bodyStyles, htmlOverflow } = scrollLockState;
    document.body.style.overflow = bodyStyles.overflow;
    document.body.style.position = bodyStyles.position;
    document.body.style.width = bodyStyles.width;
    document.body.style.top = bodyStyles.top;
    document.body.style.paddingRight = bodyStyles.paddingRight;
    document.documentElement.style.overflow = htmlOverflow;
    if (typeof window.scrollTo === 'function') {
      window.scrollTo(0, scrollY);
    }
    scrollLockState = null;
  };

  const closeNav = () => {
    if (navMenu) navMenu.classList.remove('w--open');
    if (mobileNav) {
      mobileNav.classList.remove('w--open');
      mobileNav.setAttribute('aria-hidden', 'true');
      const mobileNavContent = mobileNav.querySelector('.mobile-nav_content');
      if (mobileNavContent) {
        mobileNavContent.scrollTop = 0;
      }
    }
    if (navButton) {
      navButton.classList.remove('w--open');
      navButton.setAttribute('aria-expanded', 'false');
    }
    if (overlay) overlay.style.display = 'none';
    unlockBodyScroll();
  };

  if (mobileNav) {
    mobileNav.setAttribute('aria-hidden', 'true');
  }

  if (navButton) {
    navButton.addEventListener('click', () => {
      const isOpen = !navButton.classList.contains('w--open');
      navButton.classList.toggle('w--open', isOpen);
      if (navMenu) navMenu.classList.toggle('w--open', isOpen);
      if (mobileNav) {
        mobileNav.classList.toggle('w--open', isOpen);
        mobileNav.setAttribute('aria-hidden', String(!isOpen));
      }
      navButton.setAttribute('aria-expanded', String(isOpen));
      if (overlay) overlay.style.display = isOpen ? 'block' : 'none';
      if (isOpen) {
        lockBodyScroll();
      } else {
        unlockBodyScroll();
      }
    });
  }

  if (overlay) {
    overlay.addEventListener('click', closeNav);
  }

  containers.forEach((container) => {
    attachSmoothScrollHandlers(container, closeNav);
  });

  return closeNav;
};

const loadFooter = async (onNavigate) => {
  const containers = document.querySelectorAll('[data-footer]');
  if (!containers.length) return;

  const footerUrl = resolveAssetUrl('footer.html');

  try {
    const response = await fetch(footerUrl);
    if (!response.ok) {
      throw new Error(`Failed to load footer partial: ${response.status}`);
    }
    const footerHtml = await response.text();
    containers.forEach((container) => {
      container.innerHTML = footerHtml;
      attachSmoothScrollHandlers(container, onNavigate);
    });
  } catch (error) {
    console.error('Footer loading failed', error);
  }
};

const loadLoginModal = async () => {
  const containers = document.querySelectorAll('[data-login-modal-container]');
  if (!containers.length) return;

  const modalUrl = resolveAssetUrl('login-modal.html');

  try {
    const response = await fetch(modalUrl);
    if (!response.ok) {
      throw new Error(`Failed to load login modal partial: ${response.status}`);
    }
    const modalHtml = await response.text();
    containers.forEach((container) => {
      container.innerHTML = modalHtml;
    });
  } catch (error) {
    console.error('Login modal loading failed', error);
  }
};

const initLoginModal = (closeNav) => {
  if (document.body.dataset.loginModalInitialized === 'true') return;
  const loginModal = document.querySelector('[data-login-modal]');
  if (!loginModal) return;
  document.body.dataset.loginModalInitialized = 'true';

  const loginStatus = loginModal.querySelector('[data-login-status]');
  const loginForm = loginModal.querySelector('[data-login-form]');
  const loginCloseElements = loginModal.querySelectorAll('[data-login-close]');
  const firstField = loginModal.querySelector('[data-login-first]');
  const loginSubmitButton = loginForm?.querySelector('[type="submit"]');
  const loginDefaultButtonText = loginSubmitButton?.textContent ?? '';
  let lastFocusedTrigger = null;
  let closeTimeout = null;

  const resetStatus = () => {
    if (!loginStatus) return;
    loginStatus.textContent = '';
    loginStatus.classList.remove('is-visible');
  };

  const closeLoginModal = () => {
    if (loginModal.hidden) return;
    loginModal.classList.remove('is-active');
    document.body.classList.remove('login-modal-open');
    if (closeTimeout) {
      clearTimeout(closeTimeout);
    }
    closeTimeout = window.setTimeout(() => {
      if (!loginModal.classList.contains('is-active')) {
        loginModal.hidden = true;
      }
    }, 280);
    if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === 'function') {
      lastFocusedTrigger.focus({ preventScroll: true });
    }
  };

  const openLoginModal = (trigger) => {
    lastFocusedTrigger = trigger instanceof HTMLElement ? trigger : null;
    resetStatus();
    if (closeTimeout) {
      clearTimeout(closeTimeout);
    }
    loginModal.hidden = false;
    requestAnimationFrame(() => {
      loginModal.classList.add('is-active');
    });
    document.body.classList.add('login-modal-open');
    if (typeof closeNav === 'function') {
      closeNav();
    }
    if (firstField) {
      setTimeout(() => firstField.focus({ preventScroll: true }), 120);
    }
  };

  loginCloseElements.forEach((el) => {
    el.addEventListener('click', (event) => {
      event.preventDefault();
      closeLoginModal();
    });
  });

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      resetStatus();

      if (loginSubmitButton) {
        loginSubmitButton.disabled = true;
        loginSubmitButton.textContent = 'Submitting...';
      }

      const formData = new FormData(loginForm);
      const formName = getFormName(loginForm, 'login_modal');

      try {
        await submitRecordedForm(formName, loginForm, formData);
        loginForm.reset();
        if (loginStatus) {
          loginStatus.textContent =
            'Portal access is provided to approved partners. Please contact us to activate your login.';
          loginStatus.classList.add('is-visible');
        }
      } catch (error) {
        console.error('Login modal submission failed:', error);
        if (loginStatus) {
          loginStatus.textContent =
            'Something went wrong. Please try again later.';
          loginStatus.classList.add('is-visible');
        }
      } finally {
        if (loginSubmitButton) {
          loginSubmitButton.disabled = false;
          loginSubmitButton.textContent = loginDefaultButtonText;
        }
      }
    });
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-login-trigger]');
    if (!trigger) return;
    event.preventDefault();
    openLoginModal(trigger);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !loginModal.hidden) {
      closeLoginModal();
    }
  });

  loginModal.addEventListener('click', (event) => {
    if (event.target === loginModal) {
      closeLoginModal();
    }
  });

  document.addEventListener('login:open', (event) => {
    const trigger = event.detail?.trigger ?? null;
    openLoginModal(trigger);
  });
};

const initCatalogPreview = () => {
  const section = document.querySelector('[data-preview-section]');
  if (!section) return;

  const pillsContainer = section.querySelector('[data-preview-category-list]');
  const grid = section.querySelector('[data-preview-grid]');
  const statusEl = section.querySelector('[data-preview-status]');
  if (!pillsContainer || !grid || !statusEl) return;

  const gridId = grid.id || 'catalog-preview-grid';
  if (!grid.id) {
    grid.id = gridId;
  }

  const MAX_STAGGERED_ITEMS = 12;
  let categories = [];
  let activeIndex = 0;
  let pillButtons = [];

  const setStatus = (message) => {
    const text = message ? String(message) : '';
    statusEl.textContent = text;
    statusEl.hidden = text.length === 0;
  };

  const sanitizeProduct = (product) => {
    if (!product || typeof product !== 'object') return null;
    const brand = typeof product.brand === 'string' ? product.brand.trim() : '';
    const title = typeof product.title === 'string' ? product.title.trim() : '';
    const image = typeof product.image === 'string' ? product.image.trim() : '';
    if (!brand && !title && !image) return null;
    return { brand, title, image };
  };

  const createProductCard = (product, index) => {
    const card = document.createElement('article');
    card.className = 'preview_card';
    card.dataset.loginTrigger = '';
    card.setAttribute('role', 'button');
    card.tabIndex = 0;
    card.style.setProperty('--preview-animation-delay', `${Math.min(index, MAX_STAGGERED_ITEMS) * 0.06}s`);
    const ariaLabelParts = [];
    if (product.brand) ariaLabelParts.push(product.brand);
    if (product.title) ariaLabelParts.push(product.title);
    const ariaLabel =
      ariaLabelParts.length > 0
        ? `${ariaLabelParts.join(' – ')}. Opens login modal.`
        : 'Open catalog login modal.';
    card.setAttribute('aria-label', ariaLabel);

    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'preview_card-image';

    if (product.image) {
      const image = document.createElement('img');
      image.src = product.image;
      image.alt = product.title || product.brand || 'Catalog product';
      image.loading = 'lazy';
      image.decoding = 'async';
      imageWrapper.appendChild(image);
    } else {
      imageWrapper.classList.add('preview_card-image--empty');
      const placeholder = document.createElement('div');
      placeholder.className = 'preview_card-placeholder';
      placeholder.textContent = 'Image coming soon';
      imageWrapper.appendChild(placeholder);
    }

    const content = document.createElement('div');
    content.className = 'preview_card-content';

    const brandEl = document.createElement('div');
    brandEl.className = 'preview_card-brand';
    brandEl.textContent = product.brand || 'Featured Brand';

    const titleEl = document.createElement('div');
    titleEl.className = 'preview_card-title';
    titleEl.textContent = product.title || 'Product details coming soon.';

    content.append(brandEl, titleEl);
    card.append(imageWrapper, content);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const loginEvent = new CustomEvent('login:open', {
          bubbles: false,
          detail: { trigger: card },
        });
        document.dispatchEvent(loginEvent);
      }
    });

    return card;
  };

  const renderProducts = () => {
    grid.innerHTML = '';
    const category = categories[activeIndex];
    if (!category) {
      grid.classList.add('is-empty');
      setStatus('Preview currently unavailable. Explore the full catalog for more.');
      return;
    }

    const products = category.products;
    if (!products.length) {
      grid.classList.add('is-empty');
      setStatus(`No preview products available for ${category.name}.`);
      return;
    }

    grid.classList.remove('is-empty');
    setStatus('');
    grid.scrollLeft = 0;
    products.forEach((product, index) => {
      const card = createProductCard(product, index);
      grid.appendChild(card);
      requestAnimationFrame(() => {
        card.classList.add('is-visible');
      });
    });
  };

  const updatePillStates = () => {
    let activeButtonId = '';
    pillButtons.forEach((button, index) => {
      const isActive = index === activeIndex;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
      button.tabIndex = isActive ? 0 : -1;
      if (isActive) {
        activeButtonId = button.id || '';
      }
    });
    if (activeButtonId) {
      grid.setAttribute('aria-labelledby', activeButtonId);
    } else {
      grid.removeAttribute('aria-labelledby');
    }
  };

  const setActiveCategory = (index, { focus } = { focus: false }) => {
    if (index < 0 || index >= categories.length) return;
    const isSameCategory = index === activeIndex;
    if (!isSameCategory) {
      activeIndex = index;
      updatePillStates();
      renderProducts();
    } else {
      updatePillStates();
    }
    if (focus) {
      const target = pillButtons[index];
      if (target && typeof target.focus === 'function') {
        target.focus({ preventScroll: true });
      }
    }
  };

  const handlePillKeydown = (event) => {
    if (!pillButtons.length) return;
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End', 'Enter', ' '];
    if (!keys.includes(event.key)) return;

    const currentIndex = pillButtons.indexOf(document.activeElement);
    if (event.key === 'Enter' || event.key === ' ') {
      if (currentIndex >= 0) {
        event.preventDefault();
        setActiveCategory(currentIndex);
      }
      return;
    }

    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % pillButtons.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + pillButtons.length) % pillButtons.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = pillButtons.length - 1;
    }

    if (nextIndex < 0 || nextIndex >= pillButtons.length) return;
    event.preventDefault();
    setActiveCategory(nextIndex, { focus: true });
  };

  const buildPills = () => {
    pillsContainer.innerHTML = '';
    pillButtons = [];
    if (!categories.length) {
      pillsContainer.hidden = true;
      return;
    }

    pillsContainer.hidden = false;
    pillsContainer.setAttribute('aria-orientation', 'horizontal');

    pillButtons = categories.map((category, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'catalog-preview_pill';
      button.dataset.previewIndex = String(index);
      button.id = `${gridId}-pill-${index}`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', gridId);
      button.textContent = category.name || `Category ${index + 1}`;
      button.addEventListener('click', () => {
        setActiveCategory(index);
      });
      pillsContainer.appendChild(button);
      return button;
    });

    if (!pillsContainer.dataset.previewKeyboardBound) {
      pillsContainer.dataset.previewKeyboardBound = 'true';
      pillsContainer.addEventListener('keydown', handlePillKeydown);
    }

    updatePillStates();
  };

  const parseCategories = (data) => {
    if (!Array.isArray(data)) return [];
    const parsed = [];
    data.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return;
      Object.entries(entry).forEach(([name, products]) => {
        const label = typeof name === 'string' ? name.trim() : '';
        const productList = Array.isArray(products) ? products.map(sanitizeProduct).filter(Boolean) : [];
        if (!label || !productList.length) return;
        parsed.push({
          name: label,
          products: productList,
        });
      });
    });
    return parsed;
  };

  const loadPreview = async () => {
    setStatus('Loading preview…');
    grid.classList.add('is-empty');
    try {
      const previewUrl = resolveAssetUrl('../assets/data/categories/preview.json');
      const response = await fetch(previewUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch catalog preview: ${response.status}`);
      }
      const data = await response.json();
      categories = parseCategories(data);
      if (!categories.length) {
        setStatus('Preview currently unavailable. Explore the full catalog for more.');
        pillsContainer.hidden = true;
        pillButtons = [];
        grid.removeAttribute('aria-labelledby');
        return;
      }
      activeIndex = 0;
      buildPills();
      renderProducts();
    } catch (error) {
      console.error('Catalog preview loading failed', error);
      setStatus('Unable to load the catalog preview right now. Explore the full catalog instead.');
      pillsContainer.hidden = true;
      grid.classList.add('is-empty');
      pillButtons = [];
      grid.removeAttribute('aria-labelledby');
    }
  };

  loadPreview();
};

document.addEventListener('DOMContentLoaded', () => {
  resetWebflowStyles();
  initCtaForm();
  initApplicationForm();
  const finalizeNavigation = (closeNavCandidate) => {
    const closeNav = typeof closeNavCandidate === 'function' ? closeNavCandidate : () => {};
    attachSmoothScrollHandlers(document, closeNav);
    loadFooter(closeNav);
    initLoginModal(closeNav);
    loadLoginModal().then(() => initLoginModal(closeNav));
  };

  initNavigation()
    .then((closeNav) => {
      finalizeNavigation(closeNav);
    })
    .catch((error) => {
      console.error('Navigation initialization failed', error);
      finalizeNavigation();
    });
  initCatalogPreview();
  initLocationsMap();

  const animatedItems = document.querySelectorAll('.animate-item');
  if (animatedItems.length) {
    const animateObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const delay = parseFloat(el.dataset.animateDelay || '0');
        setTimeout(() => {
          el.classList.add('is-visible');
        }, delay * 1000);
        observer.unobserve(el);
      });
    }, { threshold: 0.2 });
    animatedItems.forEach((el) => animateObserver.observe(el));
  }
  document.querySelectorAll('.mobile-dropdown').forEach((dropdown) => {
    const toggle = dropdown.querySelector('.mobile-dropdown-toggle');
    const list = dropdown.querySelector('.nav_dropdown');
    if (!toggle || !list) return;
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', (!expanded).toString());
      dropdown.classList.toggle('is-open', !expanded);
      list.classList.toggle('w--open', !expanded);
    });
  });

  document.querySelectorAll('.alt-light-accordion_component').forEach((component) => {
    const items = component.querySelectorAll('.alt-light-accordion_item');
    items.forEach((item, index) => {
      const question = item.querySelector('.alt-light-accordion_question');
      const body = item.querySelector('.alt-light-accordion_body');
      const icon = item.querySelector('.alt-light-accordion_expand svg');
      if (!question || !body) return;
      item.style.opacity = '1';
      item.style.transform = 'none';
      if (index === 0) {
        question.setAttribute('aria-expanded', 'true');
        body.style.height = body.scrollHeight + 'px';
        if (icon) icon.style.transform = 'rotate(-45deg)';
      } else {
        question.setAttribute('aria-expanded', 'false');
        body.style.height = '0px';
        if (icon) icon.style.transform = 'rotate(0deg)';
      }
      question.addEventListener('click', () => {
        const expanded = question.getAttribute('aria-expanded') === 'true';
        items.forEach((other) => {
          if (other === item) return;
          const otherQuestion = other.querySelector('.alt-light-accordion_question');
          const otherBody = other.querySelector('.alt-light-accordion_body');
          const otherIcon = other.querySelector('.alt-light-accordion_expand svg');
          if (otherQuestion && otherBody) {
            otherQuestion.setAttribute('aria-expanded', 'false');
            otherBody.style.height = '0px';
          }
          if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
        });
        if (!expanded) {
          question.setAttribute('aria-expanded', 'true');
          body.style.height = body.scrollHeight + 'px';
          if (icon) icon.style.transform = 'rotate(-45deg)';
        } else {
          question.setAttribute('aria-expanded', 'false');
          body.style.height = '0px';
          if (icon) icon.style.transform = 'rotate(0deg)';
        }
      });
    });
  });

  document.querySelectorAll('.hover-accordon5_component').forEach((component) => {
    const rows = Array.from(component.querySelectorAll('.accordion5_row'));
    let currentActive = null;
    const toggleElement = (element, active, fallbackDisplay = 'block', instantHide = false) => {
      if (!element) return;
      const defaultDisplay = element.dataset.defaultDisplay || fallbackDisplay;
      if (!element.dataset.defaultDisplay) {
        element.dataset.defaultDisplay = defaultDisplay;
      }
      const token = Number(element.dataset.toggleToken || '0') + 1;
      element.dataset.toggleToken = String(token);
      const show = () => {
        element.dataset.toggleState = 'show';
        element.style.display = element.dataset.defaultDisplay;
        requestAnimationFrame(() => {
          element.classList.add('is-visible');
        });
      };
      const hide = () => {
        element.dataset.toggleState = 'hide';
        if (instantHide) {
          element.classList.remove('is-visible');
          element.style.display = 'none';
          return;
        }
        const handleTransitionEnd = (event) => {
          if (event.target !== element) return;
          if (element.dataset.toggleToken !== String(token)) return;
          element.style.display = 'none';
        };
        const startHide = () => {
          element.addEventListener('transitionend', handleTransitionEnd, { once: true });
          element.classList.remove('is-visible');
        };
        requestAnimationFrame(startHide);
        setTimeout(() => {
          if (element.dataset.toggleToken === String(token)) {
            element.style.display = 'none';
          }
        }, 600);
      };
      if (active) {
        show();
      } else {
        hide();
      }
    };
    const applyState = (row, isActive, instantHide = false) => {
      row.classList.toggle('active', isActive);
      row.style.opacity = '1';
      row.style.transform = 'none';
      toggleElement(row.querySelector('.accordion5_paragraph'), isActive, 'block', instantHide);
      toggleElement(row.querySelector('.accordion5_rel-parent'), isActive, 'block', instantHide);
      toggleElement(row.querySelector('.services_arrow-link'), isActive, 'flex', instantHide);
    };
    const activateRow = (target) => {
      if (!target || target === currentActive) return;
      applyState(target, true);
      if (currentActive) {
        applyState(currentActive, false, true);
      }
      currentActive = target;
    };
    const tabsComponents = Array.from(document.querySelectorAll('.basic-tabs_component'));
    const attachLearnMore = (row) => {
      const link = row.querySelector('.services_learn-more');
      const tabTarget = row.dataset.tabTarget || link?.dataset.tabTarget;
      if (!link) return;
      link.addEventListener('click', (event) => {
        event.preventDefault();
        if (tabTarget) {
          tabsComponents.forEach((tabs) => {
            tabs.dispatchEvent(new CustomEvent('changeTab', { detail: { tabName: tabTarget } }));
          });
        }
        smoothScroll('#how-we-work');
      });
    };
    if (rows.length) {
      currentActive = rows[0];
      applyState(currentActive, true);
      rows.forEach((row) => {
        if (row !== currentActive) {
          applyState(row, false);
        }
      });
    }
    rows.forEach((row) => {
      row.addEventListener('click', () => activateRow(row));
      attachLearnMore(row);
    });
  });

  document.querySelectorAll('.basic-tabs_component').forEach((tabs) => {
    const links = tabs.querySelectorAll('.w-tab-link');
    const panes = tabs.querySelectorAll('.w-tab-pane');
    if (!links.length || !panes.length) return;

    const setActive = (targetLink) => {
      const targetName = targetLink.getAttribute('data-w-tab');
      if (targetName) {
        tabs.setAttribute('data-current', targetName);
      }
      links.forEach((link) => {
        const isActive = link === targetLink;
        link.classList.toggle('w--current', isActive);
        link.setAttribute('aria-selected', String(isActive));
        link.setAttribute('tabindex', isActive ? '0' : '-1');
        if (isActive) {
          link.style.opacity = '1';
          link.style.transform = 'none';
        }
      });
      panes.forEach((pane) => {
        const match = pane.getAttribute('data-w-tab');
        const isActive = match === targetName;
        pane.classList.toggle('w--tab-active', isActive);
        pane.style.display = isActive ? 'block' : 'none';
        pane.setAttribute('aria-hidden', String(!isActive));
        if (!isActive) {
          pane.setAttribute('hidden', 'true');
        } else {
          pane.removeAttribute('hidden');
        }
      });
    };

    links.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        setActive(link);
      });
    });

    tabs.addEventListener('changeTab', (event) => {
      const tabName = event.detail?.tabName;
      if (!tabName) return;
      const targetLink = Array.from(links).find(
        (link) => link.getAttribute('data-w-tab') === tabName || link.id === tabName,
      );
      if (targetLink) {
        setActive(targetLink);
        if (typeof targetLink.focus === 'function') {
          targetLink.focus({ preventScroll: true });
        }
      }
    });

    setActive(links[0]);
  });

  document.querySelectorAll('.accordion__style2').forEach((accordion) => {
    const blocks = Array.from(accordion.querySelectorAll('.accordion__block'));

    const setBlockState = (block, shouldOpen) => {
      const title = block.querySelector('.accordion__title');
      const content = block.querySelector('.accordion__content');
      if (!title || !content) return;

      block.classList.toggle('active', shouldOpen);
      title.classList.toggle('active', shouldOpen);
      content.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');

      if (shouldOpen) {
        content.style.maxHeight = content.scrollHeight + 'px';
        content.style.opacity = '1';
      } else {
        content.style.maxHeight = '0px';
        content.style.opacity = '0';
      }
    };

    blocks.forEach((block) => {
      const title = block.querySelector('.accordion__title');
      const content = block.querySelector('.accordion__content');
      if (!title || !content) return;

      const blockIsActive = block.classList.contains('active');
      content.style.maxHeight = blockIsActive ? `${content.scrollHeight}px` : '0px';
      content.style.opacity = blockIsActive ? '1' : '0';
      content.setAttribute('aria-hidden', blockIsActive ? 'false' : 'true');
      title.classList.toggle('active', blockIsActive);

      title.addEventListener('click', () => {
        const isActive = block.classList.contains('active');

        blocks.forEach((other) => {
          if (other !== block) {
            setBlockState(other, false);
          }
        });

        setBlockState(block, !isActive);
      });
    });

    window.addEventListener('resize', () => {
      blocks.forEach((block) => {
        if (!block.classList.contains('active')) return;
        const content = block.querySelector('.accordion__content');
        if (!content) return;
        content.style.maxHeight = `${content.scrollHeight}px`;
      });
    });
  });

  const counters = document.querySelectorAll('.counter');
  if (counters.length) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const targetValue = Number(el.dataset.count || el.textContent || 0);
        const startValue = el.dataset.start !== undefined ? Number(el.dataset.start) : 0;
        const duration = Number(el.dataset.duration || '1200');
        const diff = targetValue - startValue;
        const isCountdown = diff < 0;
        let start = null;

        const step = (timestamp) => {
          if (!start) start = timestamp;
          const progress = Math.min((timestamp - start) / duration, 1);
          const currentValue = isCountdown
            ? Math.ceil(startValue + diff * progress)
            : Math.floor(startValue + diff * progress);
          el.textContent = currentValue.toLocaleString();
          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            el.textContent = targetValue.toLocaleString();
          }
        };

        requestAnimationFrame(step);
        obs.unobserve(el);
      });
    }, { threshold: 0.4 });
    counters.forEach((counter) => observer.observe(counter));
  }
});
