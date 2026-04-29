# ⏱️ Auto Close Tab

A modern Chrome extension designed to declutter your browser by automatically closing tabs that match your custom rules. Built with a premium aesthetic and productivity in mind.

![alt text](./assets/menu.png)

### ⏱️ Timer Accuracy & Limitations

Due to Google Chrome's [Alarms API](https://developer.chrome.com/docs/extensions/reference/alarms/) limitations, there are a few things to keep in mind regarding timing:

- **Minimum Reliable Interval**: Chrome enforces a minimum alarm interval of **1 minute**. 
- **Hybrid Precision**: This extension uses a "Hybrid Timing" system. For rules set to **less than 60 seconds**, we use high-precision timeouts while you are actively using the browser.
- **Background Throttling**: If the browser is idle or minimized, Chrome may throttle the extension's background processes, potentially delaying auto-close actions for rules under 1 minute until the next "pulse" (usually every 60 seconds).
- **Efficiency**: This approach ensures maximum battery life and minimum CPU usage while still providing the best possible accuracy for your rules.

---

## ✨ Features

- **Quick Add**: Open the popup and add any current tab to your auto-close list with one click.
- **Rule-based Deletion**: Define rules based on **URL** or **Page Title** snippets.
- **Multiple Match Types**:
  - **Contains**: Match if the snippet exists anywhere in the URL/Title.
  - **Exact**: Match only the precise URL or Title.
  - **Regex**: Use powerful Regular Expressions for complex matching. (Note: These are **case-sensitive** by default).

### 💡 Matching Examples

| Match Type | Value | Target (URL or Title) | Result |
| :--- | :--- | :--- | :--- |
| **Contains** | `youtube` | `https://www.youtube.com/watch?v=...` | ✅ Match |
| **Contains** | `Inbox` | `Inbox (1) - Gmail` | ✅ Match |
| **Exact** | `https://news.google.com/` | `https://news.google.com/` | ✅ Match |
| **Exact** | `google.com` | `https://www.google.com/` | ❌ No Match (URL must be exact) |
| **Regex** | `reddit\.com/r/.*` | `https://www.reddit.com/r/programming/` | ✅ Match |
| **Regex** | `^Google` | `Google Search` | ✅ Match (Starts with Google) |
| **Regex** | `(facebook\|instagram)\.com` | `https://www.facebook.com/home` | ✅ Match (Multiple domains) |
| **Regex** | `\.pdf$` | `https://example.com/report.pdf` | ✅ Match (Ends with .pdf) |
| **Regex** | `q=(temp\|weather)` | `https://google.com/search?q=weather` | ✅ Match (Query params) |

> [!TIP]
> Since matching is **case-sensitive**, if you want to match both "Google" and "google", you can use a character class like `[Gg]oogle`.
- **Flexible Timer**:
  - Set a default closure duration.
  - Choose between **Seconds** or **Minutes** for precise control.
- **Focus Protection (Per Rule)**:
  - Toggle **"Protect tab while in focus"** for each rule.
  - If enabled, the extension will never close a tab you are currently viewing, even if it matches a rule.
- **Quick Management**:
  - Toggle protection on/off instantly using the 🛡️ icon in the popup.
  - Edit existing rules directly from the options page.
- **Premium Design**:
  - Dark and Light mode support.
  - Clean, responsive interface following modern design standards.
- **Privacy First**: No data collection. All rules and settings are stored locally.

## 🛠️ Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (top right toggle).
4. Click **Load unpacked** and select the extension folder.

## 🚀 How to Use

### Using the Popup Dashboard
1. **Open the Dashboard**: Click the extension icon in your toolbar to open the high-density 800x600px dashboard.
2. **Search Open Tabs**: Use the search bar at the top to instantly filter your open tabs by title or URL.
3. **Quick-Add Actions**:
   - **🛡️ Protect**: Click the shield icon to toggle protection. If active (bright), the tab won't close if you are currently looking at it.
   - **⏱️ Auto-Close**: Instantly schedule the tab to close after **1 minute**.
   - **🔢 Limit**: Instantly set a **1-instance limit** for that site.
4. **Hover Preview**: For very long URLs that are truncated with "...", simply **hover your mouse over the link for 1 second** to see the full URL in a preview window.
5. **Manage Rules**: Click the **Manage ⚙️** link in the footer summary boxes to jump directly to the full settings page.

### Advanced Configuration
1. **Site-Specific Timers**: In the Settings page, you can now set a unique auto-close duration for every single rule. No more global timers—complete control per site!
2. **Manage Instance Limits**: View and edit your active limits. For example, you can allow 3 tabs of `youtube.com` but only 1 of `reddit.com`.
3. **Match Types**: Choose between **Contains**, **Exact**, or **Regex** to fine-tune how the extension identifies tabs to close.
4. **Dashboard Summaries**: The popup shows a clean count of your active rules and limits at the bottom, keeping your main view focused on your current tabs.

## 🔒 Privacy

Your data belongs to you. This extension does not track your browsing history or send any data to external servers. All matching logic and storage happen entirely on your local machine.

See the full [Privacy Policy](docs/privacy-policy.md) for more details.

## 📄 License

MIT License - feel free to use and modify for your own productivity needs!