document.addEventListener('DOMContentLoaded', async () => {
  const tabsList = document.getElementById('tabsList');
  const rulesList = document.getElementById('rulesList');
  const extensionEnabled = document.getElementById('extensionEnabled');
  const statusMessage = document.getElementById('statusMessage');
  const openSettings = document.getElementById('openSettings');
  const themeToggle = document.getElementById('themeToggle');

  const tabSearch = document.getElementById('tabSearch');
  const clearSearch = document.getElementById('clearSearch');

  // Load initial state
  const data = await chrome.storage.local.get(['rules', 'enabled', 'theme']);
  const rules = data.rules || [];
  const enabled = data.enabled !== false;
  const theme = data.theme || 'dark';

  extensionEnabled.checked = enabled;
  statusMessage.textContent = enabled ? 'Active' : 'Paused';
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';

  // Toggle Extension
  extensionEnabled.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    chrome.storage.local.set({ enabled: isEnabled });
    statusMessage.textContent = isEnabled ? 'Active' : 'Paused';
    chrome.runtime.sendMessage({ type: 'STATE_CHANGED' });
  });

  // Toggle Theme
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    themeToggle.textContent = newTheme === 'light' ? '🌙' : '☀️';
    chrome.storage.local.set({ theme: newTheme });
  });

  // Render initial lists
  renderTabs();
  renderRules();
  renderLimitRules();

  // Tab Search listeners
  tabSearch.addEventListener('input', () => {
    const query = tabSearch.value.trim();
    clearSearch.style.display = query ? 'block' : 'none';
    renderTabs();
  });

  clearSearch.addEventListener('click', () => {
    tabSearch.value = '';
    clearSearch.style.display = 'none';
    tabSearch.focus();
    renderTabs();
  });

  // Open Settings / Manage
  const manageLinks = [openSettings, document.getElementById('manageRules'), document.getElementById('manageLimits')];
  manageLinks.forEach(link => {
    if (link) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
      });
    }
  });

  // Render Functions
  function renderTabs() {
    const query = tabSearch.value.toLowerCase();
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      tabsList.innerHTML = '';
      
      const filteredTabs = tabs.filter(tab => 
        tab.title.toLowerCase().includes(query) || 
        tab.url.toLowerCase().includes(query)
      );

      if (filteredTabs.length === 0) {
        tabsList.innerHTML = `
          <div class="state-box">
            <p>${query ? 'No matching tabs found' : 'No open tabs'}</p>
          </div>
        `;
        return;
      }

      filteredTabs.forEach(tab => {
        const row = document.createElement('div');
        row.className = 'item-row';
        const iconUrl = tab.favIconUrl || 'https://www.google.com/s2/favicons?domain=chrome';
        row.innerHTML = `
          <img class="item-icon" src="${iconUrl}">
          <div class="item-info">
            <div class="item-title">${tab.title}</div>
            <div class="item-subtitle">${tab.url}</div>
          </div>
          <div class="header-actions">
            <button class="icon-button protection-toggle" title="Protect while active" data-protected="true">🛡️</button>
            <button class="item-action add-auto" title="Add auto-close rule">⏱️ Auto-Close</button>
            <button class="item-action add-limit" title="Add instance limit (1)" style="background: var(--warning-color);">🔢 Limit</button>
          </div>
        `;

        const img = row.querySelector('.item-icon');
        img.addEventListener('error', () => {
          img.src = 'https://www.google.com/s2/favicons?domain=chrome';
        });

        const protectionToggle = row.querySelector('.protection-toggle');
        protectionToggle.addEventListener('click', (e) => {
          e.stopPropagation();
          const isProtected = protectionToggle.getAttribute('data-protected') === 'true';
          protectionToggle.setAttribute('data-protected', !isProtected);
          protectionToggle.style.opacity = isProtected ? '0.4' : '1';
          protectionToggle.title = isProtected ? 'No active protection' : 'Protect while active';
        });

        row.querySelector('.add-auto').addEventListener('click', (e) => {
          e.stopPropagation();
          const isProtected = protectionToggle.getAttribute('data-protected') === 'true';
          addRule(tab.url, tab.title, isProtected);
        });

        row.querySelector('.add-limit').addEventListener('click', (e) => {
          e.stopPropagation();
          const isProtected = protectionToggle.getAttribute('data-protected') === 'true';
          addLimitRule(tab.url, tab.title, isProtected);
        });

        row.addEventListener('click', () => {
          const isProtected = protectionToggle.getAttribute('data-protected') === 'true';
          addRule(tab.url, tab.title, isProtected);
        });

        // Hover Preview Logic (1s delay)
        let hoverTimeout;
        const info = row.querySelector('.item-info');
        
        info.addEventListener('mouseenter', () => {
          hoverTimeout = setTimeout(() => {
            showHoverPreview(tab.url, info);
          }, 1000);
        });

        info.addEventListener('mouseleave', () => {
          clearTimeout(hoverTimeout);
          hideHoverPreview();
        });

        tabsList.appendChild(row);
      });
    });
  }

  function showHoverPreview(url, anchor) {
    let tooltip = document.getElementById('urlTooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'urlTooltip';
      tooltip.className = 'url-tooltip';
      document.body.appendChild(tooltip);
    }
    
    tooltip.textContent = url;
    const rect = anchor.getBoundingClientRect();
    tooltip.style.left = `${rect.left}px`;
    tooltip.style.top = `${rect.bottom + 5}px`;
    tooltip.style.display = 'block';
  }

  function hideHoverPreview() {
    const tooltip = document.getElementById('urlTooltip');
    if (tooltip) tooltip.style.display = 'none';
  }

  async function renderRules() {
    const { rules = [] } = await chrome.storage.local.get('rules');
    const rulesCount = document.getElementById('rulesCount');
    if (rulesCount) {
      rulesCount.textContent = `${rules.length} Active Rule${rules.length !== 1 ? 's' : ''}`;
    }
  }

  async function renderLimitRules() {
    const { limitRules = [] } = await chrome.storage.local.get('limitRules');
    const limitsCount = document.getElementById('limitsCount');
    if (limitsCount) {
      limitsCount.textContent = `${limitRules.length} Active Limit${limitRules.length !== 1 ? 's' : ''}`;
    }
  }

  async function addLimitRule(url, title, keepActive = true) {
    const { limitRules = [] } = await chrome.storage.local.get('limitRules');
    
    // Default limit rule: Limit 1, Timer 1 min
    const newRule = {
      type: 'URL',
      matchType: 'Contains',
      value: url,
      limit: 1,
      timer: 1,
      timerUnit: 'minutes',
      keepActive: keepActive,
      created: Date.now(),
      updated: Date.now()
    };
    
    if (!limitRules.find(r => r.value === url)) {
      limitRules.push(newRule);
      await chrome.storage.local.set({ limitRules });
      renderLimitRules();
      chrome.runtime.sendMessage({ type: 'LIMIT_RULES_CHANGED' });
    }
  }

  async function addRule(url, title, keepActive = true) {
    const { rules = [] } = await chrome.storage.local.get('rules');
    const newRule = {
      type: 'URL',
      matchType: 'Contains',
      value: url,
      timer: 1,
      timerUnit: 'minutes',
      keepActive: keepActive,
      created: Date.now()
    };
    
    // Simple check for duplicates
    if (!rules.find(r => r.value === url)) {
      rules.push(newRule);
      await chrome.storage.local.set({ rules });
      renderRules();
      chrome.runtime.sendMessage({ type: 'RULES_CHANGED' });
    }
  }

  async function removeRule(index) {
    const { rules = [] } = await chrome.storage.local.get('rules');
    rules.splice(index, 1);
    await chrome.storage.local.set({ rules });
    renderRules();
    chrome.runtime.sendMessage({ type: 'RULES_CHANGED' });
  }

  async function toggleRuleProtection(index) {
    const { rules = [] } = await chrome.storage.local.get('rules');
    if (rules[index]) {
      rules[index].keepActive = !rules[index].keepActive;
      await chrome.storage.local.set({ rules });
      renderRules();
      chrome.runtime.sendMessage({ type: 'RULES_CHANGED' });
    }
  }

  renderTabs();
  renderRules();
  renderLimitRules();
});
