document.addEventListener('DOMContentLoaded', async () => {
  const defaultTimer = document.getElementById('defaultTimer');
  const timerUnit = document.getElementById('timerUnit');
  const saveSettings = document.getElementById('saveSettings');
  const saveMessage = document.getElementById('saveMessage');
  const rulesList = document.getElementById('rulesList');
  const addRuleBtn = document.getElementById('addRule');
  const newRuleValue = document.getElementById('newRuleValue');
  const newRuleType = document.getElementById('newRuleType');
  const newRuleMatch = document.getElementById('newRuleMatch');
  const newRuleKeepActive = document.getElementById('newRuleKeepActive');
  const addRuleLegend = document.getElementById('addRuleLegend');
  const cancelEditBtn = document.getElementById('cancelEdit');

  let editingIndex = -1;

  // Load Settings
  const data = await chrome.storage.local.get(['timer', 'timerUnit', 'rules', 'theme']);
  defaultTimer.value = data.timer || 1;
  timerUnit.value = data.timerUnit || 'minutes';
  const theme = data.theme || 'dark';
  document.documentElement.setAttribute('data-theme', theme);

  // Render Rules
  function renderRules(rules) {
    rulesList.innerHTML = '';
    if (!rules || rules.length === 0) {
      rulesList.innerHTML = '<div class="state-box"><p>No rules defined</p></div>';
      return;
    }

    rules.forEach((rule, index) => {
      const row = document.createElement('div');
      row.className = 'item-row';
      const protectionText = rule.keepActive ? 'Protected while active' : 'No active protection';
      row.innerHTML = `
        <div class="item-info">
          <div class="item-title">${rule.value}</div>
          <div class="item-subtitle">Match ${rule.type} using ${rule.matchType} | ${protectionText}</div>
        </div>
        <div class="header-actions">
          <button class="icon-button edit" title="Edit rule" data-index="${index}">✏️</button>
          <button class="icon-button remove" title="Delete rule" data-index="${index}">🗑️</button>
        </div>
      `;

      row.querySelector('.edit').addEventListener('click', () => startEdit(index, rule));
      row.querySelector('.remove').addEventListener('click', () => removeRule(index));
      rulesList.appendChild(row);
    });
  }

  function startEdit(index, rule) {
    editingIndex = index;
    newRuleValue.value = rule.value;
    newRuleType.value = rule.type;
    newRuleMatch.value = rule.matchType;
    newRuleKeepActive.checked = rule.keepActive !== false;

    addRuleLegend.textContent = 'Edit Rule';
    addRuleBtn.textContent = 'Save Changes';
    cancelEditBtn.style.display = 'block';
    
    // Scroll to the edit section
    document.getElementById('addRuleSection').scrollIntoView({ behavior: 'smooth' });
    newRuleValue.focus();
  }

  function cancelEdit() {
    editingIndex = -1;
    newRuleValue.value = '';
    newRuleType.value = 'URL';
    newRuleMatch.value = 'Contains';
    newRuleKeepActive.checked = true;

    addRuleLegend.textContent = 'Add New Rule';
    addRuleBtn.textContent = 'Add Rule';
    cancelEditBtn.style.display = 'none';
  }

  cancelEditBtn.addEventListener('click', cancelEdit);

  renderRules(data.rules);

  // Save Timer
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

  // Add / Edit Rule
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

    if (editingIndex > -1) {
      rules[editingIndex] = ruleData;
      showMessage('Rule updated!', 'success');
    } else {
      rules.push(ruleData);
      showMessage('Rule added!', 'success');
    }

    await chrome.storage.local.set({ rules });
    cancelEdit(); // Reset form
    renderRules(rules);
    chrome.runtime.sendMessage({ type: 'RULES_CHANGED' });
  });

  // Remove Rule
  async function removeRule(index) {
    const { rules = [] } = await chrome.storage.local.get('rules');
    rules.splice(index, 1);
    await chrome.storage.local.set({ rules });
    renderRules(rules);
    chrome.runtime.sendMessage({ type: 'RULES_CHANGED' });
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
