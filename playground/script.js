import { MasonryMatrix } from './build/masonry-blade.mjs';

const PAGE_SIZE = 18;
const GAP = 16;
const RESIZE_DEBOUNCE = 180;
const RESPONSIVE_BREAKPOINTS = [
  { maxWidth: 639, columns: 1 },
  { maxWidth: 959, columns: 2 },
  { maxWidth: 1279, columns: 3 },
  { maxWidth: 1599, columns: 4 },
  { maxWidth: Number.POSITIVE_INFINITY, columns: 5 },
];

const elements = {
  masonryRoot: document.querySelector('#masonryRoot'),
  columnSelect: document.querySelector('#columnSelect'),
  reloadButton: document.querySelector('#reloadButton'),
  responsiveButton: document.querySelector('#responsiveButton'),
  loadMoreButton: document.querySelector('#loadMoreButton'),
  appendMetric: document.querySelector('#appendMetric'),
  recreateMetric: document.querySelector('#recreateMetric'),
  itemsMetric: document.querySelector('#itemsMetric'),
  columnsMetric: document.querySelector('#columnsMetric'),
  status: document.querySelector('#status'),
};

const state = {
  matrix: null,
  page: 1,
  loadedItems: 0,
  activeColumns: Number(elements.columnSelect.value),
  responsiveEnabled: false,
  isLoading: false,
  appendDurationMs: null,
  recreateDurationMs: null,
  sessionId: 0,
  queue: Promise.resolve(),
  resizeTimeoutId: 0,
};

function formatDuration(durationMs) {
  return durationMs == null ? '—' : `${durationMs.toFixed(2)} ms`;
}

function setStatus(message, tone = 'default') {
  elements.status.textContent = message;
  elements.status.dataset.tone = tone;
}

function updateMetrics() {
  elements.appendMetric.textContent = formatDuration(state.appendDurationMs);
  elements.recreateMetric.textContent = formatDuration(state.recreateDurationMs);
  elements.itemsMetric.textContent = String(state.loadedItems);
  elements.columnsMetric.textContent = String(state.activeColumns);
}

function updateControls() {
  elements.loadMoreButton.disabled = state.isLoading;
  elements.reloadButton.disabled = state.isLoading;
  elements.columnSelect.disabled = state.isLoading || state.responsiveEnabled;
  elements.responsiveButton.disabled = state.isLoading;
  elements.responsiveButton.textContent = state.responsiveEnabled
    ? 'Disable Responsive'
    : 'Enable Responsive';
  elements.responsiveButton.setAttribute('aria-pressed', String(state.responsiveEnabled));
}

function enqueue(operation) {
  state.queue = state.queue.catch(() => undefined).then(operation);
  return state.queue;
}

function getResponsiveColumns() {
  const width = window.innerWidth;

  for (const point of RESPONSIVE_BREAKPOINTS) {
    if (width <= point.maxWidth) {
      return point.columns;
    }
  }

  return 1;
}

function getRequestedColumns() {
  return state.responsiveEnabled ? getResponsiveColumns() : Number(elements.columnSelect.value);
}

function getMatrixRootWidth(columnCount) {
  const rootWidth = elements.masonryRoot.clientWidth;
  const styles = window.getComputedStyle(elements.masonryRoot);
  const gapValue = Number.parseFloat(styles.columnGap || styles.gap) || GAP;
  const totalGap = gapValue * Math.max(columnCount - 1, 0);

  return Math.max(rootWidth - totalGap, columnCount);
}

function buildImageSrc(id, width, height) {
  return `https://picsum.photos/id/${id}/${width}/${height}`;
}

async function fetchBatch(page, limit) {
  const url = new URL('https://picsum.photos/v2/list');
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(limit));

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Picsum request failed with status ${response.status}`);
  }

  const payload = await response.json();

  return payload.map((item) => ({
    id: item.id,
    width: Number(item.width),
    height: Number(item.height),
  }));
}

function createEmptyState() {
  const empty = document.createElement('div');
  empty.className = 'card empty-state';
  empty.textContent = 'Images will appear here after the first upload.';
  return empty;
}

function render(columns) {
  elements.masonryRoot.style.setProperty('--columns', String(columns.length || 1));
  elements.masonryRoot.replaceChildren();

  if (columns.length === 0 || columns.every(column => column.length === 0)) {
    elements.masonryRoot.append(createEmptyState());
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const column of columns) {
    const columnNode = document.createElement('div');
    columnNode.className = 'masonry__column';

    for (const item of column) {
      const card = document.createElement('article');
      card.className = 'masonry__item';

      const image = document.createElement('img');
      image.className = 'masonry__media';
      image.src = buildImageSrc(item.id, item.width, item.height);
      image.alt = `Picsum image ${item.id}`;
      image.width = item.width;
      image.height = item.height;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.referrerPolicy = 'no-referrer';

      const meta = document.createElement('div');
      meta.className = 'masonry__meta';

      const idNode = document.createElement('strong');
      idNode.textContent = `#${item.id}`;

      const sizeNode = document.createElement('span');
      sizeNode.textContent = `${item.width} × ${item.height}`;

      meta.append(idNode, sizeNode);
      card.append(image, meta);
      columnNode.append(card);
    }

    fragment.append(columnNode);
  }

  elements.masonryRoot.append(fragment);
}

function createMatrix(columnCount) {
  const width = getMatrixRootWidth(columnCount);
  state.matrix = new MasonryMatrix(columnCount, width);
  state.activeColumns = columnCount;
}

async function appendItems(batchItems, sessionId) {
  const matrix = state.matrix;

  if (matrix == null || batchItems.length === 0) {
    return;
  }

  const startedAt = performance.now();
  const columns = await enqueue(() => matrix.appendItems(batchItems));

  if (sessionId !== state.sessionId) {
    return;
  }

  state.appendDurationMs = performance.now() - startedAt;
  state.loadedItems += batchItems.length;
  render(columns);
  updateMetrics();
}

async function recreateMatrix(columnCount, sessionId) {
  const matrix = state.matrix;

  if (matrix == null) {
    return;
  }

  const startedAt = performance.now();
  const columns = await enqueue(() => matrix.recreateMatrix(columnCount, getMatrixRootWidth(columnCount)));

  if (sessionId !== state.sessionId) {
    return;
  }

  state.activeColumns = columnCount;
  state.recreateDurationMs = performance.now() - startedAt;
  render(columns);
  updateMetrics();
}

async function loadMore() {
  if (state.isLoading) {
    return;
  }

  const sessionId = state.sessionId;
  state.isLoading = true;
  elements.masonryRoot.setAttribute('aria-busy', 'true');
  setStatus('Load next images batch...');
  updateControls();

  try {
    const batchItems = await fetchBatch(state.page, PAGE_SIZE);

    if (sessionId !== state.sessionId) {
      return;
    }

    await appendItems(batchItems, sessionId);

    if (sessionId !== state.sessionId) {
      return;
    }

    state.page += 1;
    setStatus(`Load ${state.loadedItems} images.`);
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown loading error';
    setStatus(message, 'error');
    console.error('[Playground] Failed to load images:', error);
  }
  finally {
    if (sessionId === state.sessionId) {
      state.isLoading = false;
      elements.masonryRoot.setAttribute('aria-busy', 'false');
      updateControls();
    }
  }
}

async function reloadPlayground() {
  state.sessionId += 1;
  state.queue = Promise.resolve();
  state.page = 1;
  state.loadedItems = 0;
  state.appendDurationMs = null;
  state.recreateDurationMs = null;

  const columnCount = getRequestedColumns();

  elements.masonryRoot.style.setProperty('--columns', String(columnCount));
  render([]);
  createMatrix(columnCount);
  updateMetrics();
  updateControls();

  setStatus('Matrix recreated. Load start batch');

  await loadMore();
}

function handleResize() {
  window.clearTimeout(state.resizeTimeoutId);

  state.resizeTimeoutId = window.setTimeout(() => {
    if (!state.responsiveEnabled || state.isLoading) {
      return;
    }

    const sessionId = state.sessionId;
    const nextColumns = getResponsiveColumns();

    recreateMatrix(nextColumns, sessionId).catch(error => {
      const message = error instanceof Error ? error.message : 'Unknown recreate error';
      setStatus(message, 'error');
      console.error('[Playground] Failed to recreate matrix:', error);
    });
  }, RESIZE_DEBOUNCE);
}

async function toggleResponsive() {
  state.responsiveEnabled = !state.responsiveEnabled;
  updateControls();

  const sessionId = state.sessionId;
  const nextColumns = getRequestedColumns();

  if (state.responsiveEnabled) {
    setStatus('Responsive mode enabled. Resize listener is active.');
    window.addEventListener('resize', handleResize, { passive: true });
  }
  else {
    setStatus('Responsive mode disabled. Manual columns restored.');
    window.removeEventListener('resize', handleResize);
    window.clearTimeout(state.resizeTimeoutId);
  }

  try {
    await recreateMatrix(nextColumns, sessionId);
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown recreate error';
    setStatus(message, 'error');
    console.error('[Playground] Failed to toggle responsive mode:', error);
  }
}

function bindEvents() {
  elements.loadMoreButton.addEventListener('click', () => {
    loadMore();
  });

  elements.reloadButton.addEventListener('click', () => {
    reloadPlayground();
  });

  elements.responsiveButton.addEventListener('click', () => {
    toggleResponsive();
  });

  elements.columnSelect.addEventListener('change', () => {
    if (state.responsiveEnabled) {
      return;
    }

    const nextColumns = Number(elements.columnSelect.value);
    elements.columnsMetric.textContent = String(nextColumns);
    setStatus('New amount selected. Please click to Reload, for recreate matrix.');
  });
}

async function init() {
  bindEvents();
  updateMetrics();
  updateControls();
  render([]);
  await reloadPlayground();
}

init().catch(error => {
  const message = error instanceof Error ? error.message : 'Unknown initialization error';
  setStatus(message, 'error');
  console.error('[Playground] Initialization failed:', error);
});
