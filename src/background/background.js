// Keep track of tabs that are scheduled to be closed
let pendingCloses = new Map();
let limitPendingCloses = new Map();

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['rules', 'limitRules', 'timer', 'timerUnit', 'enabled', 'theme'], (data) => {
    if (!data.rules) chrome.storage.local.set({ rules: [] });
    if (!data.limitRules) chrome.storage.local.set({ limitRules: [] });
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
  if (message.type === 'RULES_CHANGED' || message.type === 'STATE_CHANGED' || message.type === 'LIMIT_RULES_CHANGED') {
    checkAllTabs();
  }
});

// Watch for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    checkAllTabs(); // Re-check all for limits too
  }
});

// Watch for tab activation (switching focus)
chrome.tabs.onActivated.addListener((activeInfo) => {
  checkAllTabs();
});

// Watch for tab removal to clean up maps
chrome.tabs.onRemoved.addListener((tabId) => {
  pendingCloses.delete(tabId);
  limitPendingCloses.delete(tabId);
});

// Periodic alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkTabs') {
    processPendingCloses();
    checkAllTabs();
  }
});

async function checkAllTabs() {
  const data = await chrome.storage.local.get(['enabled', 'rules', 'limitRules']);
  if (!data.enabled) {
    pendingCloses.clear();
    limitPendingCloses.clear();
    return;
  }

  const tabs = await chrome.tabs.query({});
  
  // Process Standard Auto-Close Rules
  tabs.forEach(tab => checkTab(tab, data.rules));

  // Process Instance Limit Rules
  processLimitRules(tabs, data.limitRules || []);
}

async function checkTab(tab, rules) {
  if (!rules) {
    const data = await chrome.storage.local.get(['rules', 'enabled']);
    if (!data.enabled) return;
    rules = data.rules || [];
  }

  const matchingRule = rules.find(rule => isMatch(tab, rule));

  if (matchingRule) {
    if (!pendingCloses.has(tab.id)) {
      const { timer = 1, timerUnit = 'minutes' } = await chrome.storage.local.get(['timer', 'timerUnit']);
      const multiplier = timerUnit === 'minutes' ? 60 * 1000 : 1000;
      const closeAt = Date.now() + (timer * multiplier);
      pendingCloses.set(tab.id, { 
        closeAt, 
        keepActive: matchingRule.keepActive !== false 
      });
      console.log(`Tab ${tab.id} matched auto-close. Scheduled in ${timer} ${timerUnit}.`);
    }
  } else {
    pendingCloses.delete(tab.id);
  }
}

function isMatch(tab, rule) {
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
}

function processLimitRules(tabs, limitRules) {
  limitRules.forEach(rule => {
    const matchingTabs = tabs.filter(tab => isMatch(tab, rule));
    
    if (matchingTabs.length > rule.limit) {
      // Sort by lastAccessed (descending - most recent first)
      // Note: lastAccessed might be undefined in some versions, fallback to index
      matchingTabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
      
      const toKeep = matchingTabs.slice(0, rule.limit);
      const toClose = matchingTabs.slice(rule.limit);

      toClose.forEach(tab => {
        if (!limitPendingCloses.has(tab.id)) {
          const multiplier = rule.timerUnit === 'minutes' ? 60 * 1000 : 1000;
          const closeAt = Date.now() + (rule.timer * multiplier);
          limitPendingCloses.set(tab.id, {
            closeAt,
            keepActive: rule.keepActive !== false,
            ruleValue: rule.value
          });
          console.log(`Tab ${tab.id} exceeds limit for "${rule.value}". Scheduled in ${rule.timer} ${rule.timerUnit}.`);
        }
      });

      // Remove from pending if it's now in the "keep" list
      toKeep.forEach(tab => {
        limitPendingCloses.delete(tab.id);
      });
    } else {
      // If count is below limit, remove all tabs matching this rule from limitPendingCloses
      matchingTabs.forEach(tab => {
        limitPendingCloses.delete(tab.id);
      });
    }
  });
}

async function processPendingCloses() {
  const now = Date.now();

  // Process standard closes
  await processMap(pendingCloses, now, "auto-close");
  
  // Process limit-based closes
  await processMap(limitPendingCloses, now, "limit-exceeded");
}

async function processMap(map, now, reason) {
  for (const [tabId, settings] of map.entries()) {
    if (now >= settings.closeAt) {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (settings.keepActive && tab.active) {
          console.log(`Tab ${tabId} is active and protected (${reason}). Skipping.`);
          continue;
        }
        await chrome.tabs.remove(tabId);
        map.delete(tabId);
        console.log(`Closed tab ${tabId} due to ${reason}.`);
      } catch (e) {
        // Tab probably already closed
        map.delete(tabId);
      }
    }
  }
}

