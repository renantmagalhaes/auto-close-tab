# Privacy Policy for Auto Close Tab

Auto Close Tab ("the Extension") is committed to protecting your privacy. This Privacy Policy explains how we handle information in relation to the Extension.

## Data Collection

**The Extension does not collect, store, or transmit any personal data.** 

All configuration data, including:
- Auto-close rules (URLs and Page Titles)
- Timer settings
- Theme preferences

...are stored **locally** on your device using the `chrome.storage.local` API. This data never leaves your computer and is only used to provide the core functionality of the Extension.

## Permissions

The Extension requires the following permissions to function:
- **`tabs`**: Used to identify open tabs, check their titles/URLs against your rules, and close them when the timer expires.
- **`storage`**: Used to save your custom rules and settings locally.
- **`alarms`**: Used to periodically check the status of tabs in the background.

## Third-Party Services

The Extension does not communicate with any third-party services, servers, or APIs.

## Changes to This Policy

We may update our Privacy Policy from time to time. Any changes will be reflected by updating this document.

## Contact

If you have any questions about this Privacy Policy, you can contact the developer via the repository's issue tracker.
