document.addEventListener('DOMContentLoaded', async () => {
  const tabsList = document.getElementById('tabsList');
  const rulesList = document.getElementById('rulesList');
  const extensionEnabled = document.getElementById('extensionEnabled');
  const statusMessage = document.getElementById('statusMessage');
  const openSettings = document.getElementById('openSettings');
  const themeToggle = document.getElementById('themeToggle');

  // Load initial state
  const data = await chrome.storage.local.get(['rules', 'enabled', 'theme']);
  const rules = data.rules || [];
  const enabled = data.enabled !== false;
  const theme = data.theme || 'dark';

  extensionEnabled.checked = enabled;
  statusMessage.textContent = enabled ? 'Extension is Active' : 'Extension is Paused';
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';

  // Toggle Extension
  extensionEnabled.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    chrome.storage.local.set({ enabled: isEnabled });
    statusMessage.textContent = isEnabled ? 'Extension is Active' : 'Extension is Paused';
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

  // Open Settings
  openSettings.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Render Functions
  function renderTabs() {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      tabsList.innerHTML = '';
      if (tabs.length === 0) {
        tabsList.innerHTML = '<div class="state-box"><p>No open tabs</p></div>';
        return;
      }

      tabs.forEach(tab => {
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
            <button class="item-action" data-url="${tab.url}" data-title="${tab.title}">Add</button>
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

        row.querySelector('.item-action').addEventListener('click', (e) => {
          e.stopPropagation();
          const isProtected = protectionToggle.getAttribute('data-protected') === 'true';
          addRule(tab.url, tab.title, isProtected);
        });

        row.addEventListener('click', () => {
          const isProtected = protectionToggle.getAttribute('data-protected') === 'true';
          addRule(tab.url, tab.title, isProtected);
        });

        tabsList.appendChild(row);
      });
    });
  }

  async function renderRules() {
    const { rules = [] } = await chrome.storage.local.get('rules');
    rulesList.innerHTML = '';
    if (rules.length === 0) {
      rulesList.innerHTML = '<div class="state-box"><p>No active rules</p></div>';
      return;
    }

    rules.forEach((rule, index) => {
      const row = document.createElement('div');
      row.className = 'item-row';
      const protectionOpacity = rule.keepActive ? '1' : '0.4';
      row.innerHTML = `
        <div class="item-info">
          <div class="item-title">${rule.value}</div>
          <div class="item-subtitle">Match ${rule.type} | ${rule.matchType}</div>
        </div>
        <div class="header-actions">
          <button class="icon-button rule-protection-toggle" title="${rule.keepActive ? 'Protect while active' : 'No active protection'}" style="opacity: ${protectionOpacity}">🛡️</button>
          <button class="item-action remove" data-index="${index}">Remove</button>
        </div>
      `;

      row.querySelector('.rule-protection-toggle').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleRuleProtection(index);
      });

      row.querySelector('.remove').addEventListener('click', (e) => {
        e.stopPropagation();
        removeRule(index);
      });

      rulesList.appendChild(row);
    });
  }

  async function addRule(url, title, keepActive = true) {
    const { rules = [] } = await chrome.storage.local.get('rules');
    const newRule = {
      type: 'URL',
      matchType: 'Contains',
      value: url,
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
});
