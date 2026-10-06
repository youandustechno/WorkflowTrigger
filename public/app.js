const form = document.getElementById('workflow-form');
const statusEl = document.getElementById('status');
const appListEl = document.getElementById('app-list');
const clearAllButton = document.getElementById('clear-all');
const appSearchInput = document.getElementById('app-search');
const prevPageButton = document.getElementById('prev-page');
const nextPageButton = document.getElementById('next-page');
const pageIndicator = document.getElementById('page-indicator');
const selectedCountEl = document.getElementById('selected-count');
const selectedSummaryEl = document.getElementById('selected-summary');

const MAX_APPS = 20;
const PAGE_SIZE = 20;

function createDefaultApps(size = 50) {
  const apps = [];

  for (let i = 1; i <= size; i += 1) {
    if (i === 1) {
      apps.push('FirstApp');
    } else if (i === 2) {
      apps.push('SecondApp');
    } else if (i === 3) {
      apps.push('ThirdApp');
    } else if (i === 4) {
      apps.push('FourthApp');
    } else if (i === 5) {
      apps.push('FifthApp');
    } else if (i === 6) {
      apps.push('ShareExtra');
    } else if (i === 7) {
      apps.push('Shares Plus');
    } else if (i === 8) {
      apps.push('Shares');
    } else {
      apps.push(`App-${String(i).padStart(2, '0')}`);
    }
  }

  return apps;
}

const defaultApps = createDefaultApps(50);

let appCatalog = [...defaultApps];
let currentPage = 1;
let selectedApps = new Set();

function setStatus(message, type = '') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function updateSelectedCount() {
  selectedCountEl.textContent = String(selectedApps.size);

  const selectedList = [...selectedApps].sort((a, b) => a.localeCompare(b));

  if (selectedList.length === 0) {
    selectedSummaryEl.innerHTML = '<span class="selected-tag">None selected</span>';
    return;
  }

  selectedSummaryEl.innerHTML = '';
  selectedList.forEach((app) => {
    const tag = document.createElement('span');
    tag.className = 'selected-tag';
    tag.textContent = app;
    selectedSummaryEl.appendChild(tag);
  });
}

function getFilteredApps() {
  const searchTerm = appSearchInput.value.trim().toLowerCase();

  const searchedApps = searchTerm
    ? appCatalog.filter((app) => app.toLowerCase().includes(searchTerm))
    : appCatalog;

  const orderMap = new Map(appCatalog.map((app, index) => [app, index]));

  return [...searchedApps].sort((first, second) => {
    const firstSelected = selectedApps.has(first) ? 1 : 0;
    const secondSelected = selectedApps.has(second) ? 1 : 0;

    if (firstSelected !== secondSelected) {
      return secondSelected - firstSelected;
    }

    return (orderMap.get(first) ?? 0) - (orderMap.get(second) ?? 0);
  });
}

function renderAppOptions() {
  const filteredApps = getFilteredApps();
  const totalPages = Math.max(1, Math.ceil(filteredApps.length / PAGE_SIZE));

  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageApps = filteredApps.slice(startIndex, startIndex + PAGE_SIZE);

  appListEl.innerHTML = '';

  if (pageApps.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.textContent = 'No apps match your search.';
    appListEl.append(emptyState);
  } else {
    pageApps.forEach((app) => {
      const wrapper = document.createElement('label');
      wrapper.className = 'app-option';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'app';
      checkbox.value = app;
      checkbox.checked = selectedApps.has(app);
      checkbox.disabled = !checkbox.checked && selectedApps.size >= MAX_APPS;

      checkbox.addEventListener('change', (event) => {
        const isSelected = event.target.checked;

        if (isSelected) {
          if (selectedApps.size >= MAX_APPS) {
            event.target.checked = false;
            setStatus(`You can only select up to ${MAX_APPS} apps.`, 'error');
            return;
          }

          selectedApps.add(app);
        } else {
          selectedApps.delete(app);
        }

        updateSelectedCount();
        renderAppOptions();
      });

      const label = document.createElement('span');
      label.textContent = app;

      wrapper.appendChild(checkbox);
      wrapper.appendChild(label);
      appListEl.appendChild(wrapper);
    });
  }

  pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
  prevPageButton.disabled = currentPage <= 1;
  nextPageButton.disabled = currentPage >= totalPages;
  updateSelectedCount();
}

async function loadApps() {
  try {
    const response = await fetch('/api/apps');
    if (!response.ok) {
      throw new Error('Could not load app catalog.');
    }

    const payload = await response.json();
    appCatalog = payload.apps || defaultApps;

    selectedApps = new Set(
      [...selectedApps].filter((app) => appCatalog.includes(app)).slice(0, MAX_APPS)
    );

    renderAppOptions();
  } catch (error) {
    console.error(error);
    appCatalog = [...defaultApps];
    renderAppOptions();
  }
}

clearAllButton.addEventListener('click', () => {
  selectedApps.clear();
  renderAppOptions();
  setStatus('App selection cleared.', '');
});

appSearchInput.addEventListener('input', () => {
  currentPage = 1;
  renderAppOptions();
});

prevPageButton.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage -= 1;
    renderAppOptions();
  }
});

nextPageButton.addEventListener('click', () => {
  const filteredApps = getFilteredApps();
  const totalPages = Math.max(1, Math.ceil(filteredApps.length / PAGE_SIZE));

  if (currentPage < totalPages) {
    currentPage += 1;
    renderAppOptions();
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const owner = document.getElementById('owner').value.trim();
  const repo = document.getElementById('repo').value.trim();
  const eventType = document.getElementById('eventType').value.trim();
  const githubToken = document.getElementById('githubToken').value.trim();
  const apps = [...selectedApps];

  if (!owner || !repo || !eventType) {
    setStatus('Owner, repository, and event type are required.', 'error');
    return;
  }

  if (apps.length === 0) {
    setStatus('Select at least one app before triggering the workflow.', 'error');
    return;
  }

  if (apps.length > MAX_APPS) {
    setStatus(`You can only select up to ${MAX_APPS} apps.`, 'error');
    return;
  }

  setStatus('Dispatching workflow…');

  try {
    const response = await fetch('/api/trigger-workflow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        owner,
        repo,
        eventType,
        apps,
        githubToken
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Something went wrong while triggering the workflow.');
    }

    setStatus(`Workflow triggered successfully for ${apps.join(', ')}.`, 'success');
    console.log('Dispatch response:', result);
  } catch (error) {
    setStatus(error.message, 'error');
    console.error(error);
  }
});

loadApps();
