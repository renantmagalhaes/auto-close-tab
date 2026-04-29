document.addEventListener('DOMContentLoaded', async () => {
  const defaultTimer = document.getElementById('defaultTimer');
  const timerUnit = document.getElementById('timerUnit');
  const saveSettings = document.getElementById('saveSettings');
  const saveMessage = document.getElementById('saveMessage');
  const rulesList = document.getElementById('rulesList');
  const limitRulesList = document.getElementById('limitRulesList');
  
  // Auto-close rule form elements
  const addRuleBtn = document.getElementById('addRule');
  const newRuleValue = document.getElementById('newRuleValue');
  const newRuleType = document.getElementById('newRuleType');
  const newRuleMatch = document.getElementById('newRuleMatch');
  const newRuleKeepActive = document.getElementById('newRuleKeepActive');
  const addRuleLegend = document.getElementById('addRuleLegend');
  const cancelEditBtn = document.getElementById('cancelEdit');

  // Limit rule form elements
  const addLimitRuleBtn = document.getElementById('addLimitRule');
  const newLimitValue = document.getElementById('newLimitValue');
  const newLimitType = document.getElementById('newLimitType');
  const newLimitMatch = document.getElementById('newLimitMatch');
  const newLimitCount = document.getElementById('newLimitCount');
  const newLimitTimer = document.getElementById('newLimitTimer');
  const newLimitTimerUnit = document.getElementById('newLimitTimerUnit');
  const newLimitKeepActive = document.getElementById('newLimitKeepActive');
  const addLimitRuleLegend = document.getElementById('addLimitRuleLegend');
  const cancelLimitEditBtn = document.getElementById('cancelLimitEdit');

  let editingIndex = -1;
  let editingLimitIndex = -1;

  // Load Settings
  const data = await chrome.storage.local.get(['timer', 'timerUnit', 'rules', 'limitRules', 'theme']);
  defaultTimer.value = data.timer || 1;
  timerUnit.value = data.timerUnit || 'minutes';
  const theme = data.theme || 'dark';
  document.documentElement.setAttribute('data-theme', theme);

  // Render Functions
  function renderRules(rules) {
    rulesList.innerHTML = '';
    if (!rules || rules.length === 0) {
      rulesList.innerHTML = '<div class="state-box"><p>No rules defined</p></div>';
      return;
    }
    rules.forEach((rule, index) => {
      const row = createRuleRow(rule, index, 'auto');
      rulesList.appendChild(row);
    });
  }

  function renderLimitRules(rules) {
    limitRulesList.innerHTML = '';
    if (!rules || rules.length === 0) {
      limitRulesList.innerHTML = '<div class="state-box"><p>No limit rules defined</p></div>';
      return;
    }
    rules.forEach((rule, index) => {
      const row = createRuleRow(rule, index, 'limit');
      limitRulesList.appendChild(row);
    });
  }

  function createRuleRow(rule, index, category) {
    const row = document.createElement('div');
    row.className = 'item-row';
    const protectionText = rule.keepActive ? 'Protected while active' : 'No active protection';
    
    let subtitle = `Match ${rule.type} using ${rule.matchType} | ${protectionText}`;
    if (category === 'limit') {
      subtitle = `Limit: ${rule.limit} | Timer: ${rule.timer} ${rule.timerUnit} | ${protectionText}`;
    }

    row.innerHTML = `
      <div class="item-info">
        <div class="item-title">${rule.value}</div>
        <div class="item-subtitle">${subtitle}</div>
      </div>
      <div class="header-actions">
        <button class="icon-button edit" title="Edit rule">✏️</button>
        <button class="icon-button remove" title="Delete rule">🗑️</button>
      </div>
    `;

    row.querySelector('.edit').addEventListener('click', () => {
      if (category === 'auto') startEdit(index, rule);
      else startLimitEdit(index, rule);
    });
    
    row.querySelector('.remove').addEventListener('click', () => {
      if (category === 'auto') removeRule(index);
      else removeLimitRule(index);
    });

    return row;
  }

  // Edit Handlers
  function startEdit(index, rule) {
    editingIndex = index;
    newRuleValue.value = rule.value;
    newRuleType.value = rule.type;
    newRuleMatch.value = rule.matchType;
    newRuleKeepActive.checked = rule.keepActive !== false;
    addRuleLegend.textContent = 'Edit Auto-Close Rule';
    addRuleBtn.textContent = 'Save Changes';
    cancelEditBtn.style.display = 'block';
    document.getElementById('addRuleSection').scrollIntoView({ behavior: 'smooth' });
  }

  function startLimitEdit(index, rule) {
    editingLimitIndex = index;
    newLimitValue.value = rule.value;
    newLimitType.value = rule.type;
    newLimitMatch.value = rule.matchType;
    newLimitCount.value = rule.limit;
    newLimitTimer.value = rule.timer;
    newLimitTimerUnit.value = rule.timerUnit;
    newLimitKeepActive.checked = rule.keepActive !== false;
    addLimitRuleLegend.textContent = 'Edit Instance Limit';
    addLimitRuleBtn.textContent = 'Save Changes';
    cancelLimitEditBtn.style.display = 'block';
    document.getElementById('addLimitRuleSection').scrollIntoView({ behavior: 'smooth' });
  }

  function resetAutoForm() {
    editingIndex = -1;
    newRuleValue.value = '';
    newRuleType.value = 'URL';
    newRuleMatch.value = 'Contains';
    newRuleKeepActive.checked = true;
    addRuleLegend.textContent = 'Add New Auto-Close Rule';
    addRuleBtn.textContent = 'Add Rule';
    cancelEditBtn.style.display = 'none';
  }

  function resetLimitForm() {
    editingLimitIndex = -1;
    newLimitValue.value = '';
    newLimitType.value = 'URL';
    newLimitMatch.value = 'Contains';
    newLimitCount.value = 1;
    newLimitTimer.value = 1;
    newLimitTimerUnit.value = 'minutes';
    newLimitKeepActive.checked = true;
    addLimitRuleLegend.textContent = 'Add New Instance Limit';
    addLimitRuleBtn.textContent = 'Add Limit';
    cancelLimitEditBtn.style.display = 'none';
  }

  cancelEditBtn.addEventListener('click', resetAutoForm);
  cancelLimitEditBtn.addEventListener('click', resetLimitForm);

  renderRules(data.rules);
  renderLimitRules(data.limitRules);

  // Save Settings
  saveSettings.addEventListener('click', async () => {
    const timer = parseFloat(defaultTimer.value);
    const unit = timerUnit.value;
    if (isNaN(timer) || timer <= 0) {
      showMessage('Please enter a valid duration', 'error');
      return;
    }
    await chrome.storage.local.set({ timer, timerUnit: unit });
    showMessage('Settings saved successfully!', 'success');
    chrome.runtime.sendMessage({ type: 'STATE_CHANGED' });
  });

  // Add / Edit Auto-Close Rule
  addRuleBtn.addEventListener('click', async () => {
    const value = newRuleValue.value.trim();
    if (!value) return;

    const { rules = [] } = await chrome.storage.local.get('rules');
    const ruleData = {
      value,
      type: newRuleType.value,
      matchType: newRuleMatch.value,
      keepActive: newRuleKeepActive.checked,
      created: editingIndex > -1 ? rules[editingIndex].created : Date.now(),
      updated: Date.now()
    };

    if (editingIndex > -1) rules[editingIndex] = ruleData;
    else rules.push(ruleData);

    await chrome.storage.local.set({ rules });
    resetAutoForm();
    renderRules(rules);
    chrome.runtime.sendMessage({ type: 'RULES_CHANGED' });
    showMessage('Auto-close rule saved!', 'success');
  });

  // Add / Edit Limit Rule
  addLimitRuleBtn.addEventListener('click', async () => {
    const value = newLimitValue.value.trim();
    if (!value) return;

    const { limitRules = [] } = await chrome.storage.local.get('limitRules');
    const ruleData = {
      value,
      type: newLimitType.value,
      matchType: newLimitMatch.value,
      limit: parseInt(newLimitCount.value) || 1,
      timer: parseFloat(newLimitTimer.value) || 1,
      timerUnit: newLimitTimerUnit.value,
      keepActive: newLimitKeepActive.checked,
      created: editingLimitIndex > -1 ? limitRules[editingLimitIndex].created : Date.now(),
      updated: Date.now()
    };

    if (editingLimitIndex > -1) limitRules[editingLimitIndex] = ruleData;
    else limitRules.push(ruleData);

    await chrome.storage.local.set({ limitRules });
    resetLimitForm();
    renderLimitRules(limitRules);
    chrome.runtime.sendMessage({ type: 'LIMIT_RULES_CHANGED' });
    showMessage('Instance limit saved!', 'success');
  });

  async function removeRule(index) {
    const { rules = [] } = await chrome.storage.local.get('rules');
    rules.splice(index, 1);
    await chrome.storage.local.set({ rules });
    renderRules(rules);
    chrome.runtime.sendMessage({ type: 'RULES_CHANGED' });
  }

  async function removeLimitRule(index) {
    const { limitRules = [] } = await chrome.storage.local.get('limitRules');
    limitRules.splice(index, 1);
    await chrome.storage.local.set({ limitRules });
    renderLimitRules(limitRules);
    chrome.runtime.sendMessage({ type: 'LIMIT_RULES_CHANGED' });
  }

  function showMessage(text, type) {
    saveMessage.textContent = text;
    saveMessage.className = `message ${type}`;
    setTimeout(() => {
      saveMessage.textContent = '';
      saveMessage.className = 'message';
    }, 3000);
  }
});
