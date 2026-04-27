// Keep track of tabs that are scheduled to be closed
let pendingCloses = new Map();

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['rules', 'timer', 'timerUnit', 'enabled', 'theme'], (data) => {
    if (!data.rules) chrome.storage.local.set({ rules: [] });
    if (!data.timer) chrome.storage.local.set({ timer: 1 }); // 1 minute default
    if (!data.timerUnit) chrome.storage.local.set({ timerUnit: 'minutes' });
    if (data.enabled === undefined) chrome.storage.local.set({ enabled: true });
    if (!data.theme) chrome.storage.local.set({ theme: 'dark' });
  });

  // Set up periodic check
  chrome.alarms.create('checkTabs', { periodInMinutes: 0.5 });
});

// Listen for messages
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'RULES_CHANGED' || message.type === 'STATE_CHANGED') {
    checkAllTabs();
  }
});

// Watch for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    checkTab(tab);
  }
});

// Watch for tab activation (switching focus)
chrome.tabs.onActivated.addListener((activeInfo) => {
  checkAllTabs();
});

// Periodic alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkTabs') {
    processPendingCloses();
    checkAllTabs();
  }
});

async function checkAllTabs() {
  const data = await chrome.storage.local.get(['enabled', 'rules']);
  if (!data.enabled) {
    pendingCloses.clear();
    return;
  }

  const tabs = await chrome.tabs.query({});
  tabs.forEach(tab => checkTab(tab, data.rules));
}

async function checkTab(tab, rules) {
  if (!rules) {
    const data = await chrome.storage.local.get(['rules', 'enabled']);
    if (!data.enabled) return;
    rules = data.rules || [];
  }

  const matchingRule = rules.find(rule => {
    const target = rule.type === 'URL' ? tab.url : tab.title;
    if (!target) return false;

    if (rule.matchType === 'Exact') return target === rule.value;
    if (rule.matchType === 'Contains') return target.includes(rule.value);
    if (rule.matchType === 'Regex') {
      try {
        const re = new RegExp(rule.value);
        return re.test(target);
      } catch (e) {
        return false;
      }
    }
    return false;
  });

  if (matchingRule) {
    if (!pendingCloses.has(tab.id)) {
      const { timer = 1, timerUnit = 'minutes' } = await chrome.storage.local.get(['timer', 'timerUnit']);
      const multiplier = timerUnit === 'minutes' ? 60 * 1000 : 1000;
      const closeAt = Date.now() + (timer * multiplier);
      pendingCloses.set(tab.id, { 
        closeAt, 
        keepActive: matchingRule.keepActive !== false 
      });
      console.log(`Tab ${tab.id} matched. Scheduled to close in ${timer} ${timerUnit}. KeepActive: ${matchingRule.keepActive !== false}`);
    }
  } else {
    pendingCloses.delete(tab.id);
  }
}

async function processPendingCloses() {
  const now = Date.now();

  for (const [tabId, settings] of pendingCloses.entries()) {
    if (now >= settings.closeAt) {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          pendingCloses.delete(tabId);
        } else if (settings.keepActive && tab.active) {
          // Skip active tab for now
          console.log(`Tab ${tabId} is active and protected. Skipping close.`);
        } else {
          chrome.tabs.remove(tabId);
          pendingCloses.delete(tabId);
          console.log(`Closed tab ${tabId} as scheduled.`);
        }
      });
    }
  }
}
