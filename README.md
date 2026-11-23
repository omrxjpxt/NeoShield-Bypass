# NeoShield-Bypass (NeoPass Extension)

> **Cybersecurity & Ethical Hacking Internship Project**  
> Developed as part of an ethical hacking internship at **NeoPat**. This project is a security research tool demonstrating client-side browser proctoring analysis and restriction bypass techniques.

---

## 📌 Project Overview

**NeoShield-Bypass** is a Chromium-based browser extension (Manifest V3) created to examine how web-based exam proctoring platforms (such as **Iamneo / Examly**, **HackerRank**, and **NPTEL**) implement security controls—and how purely client-side restrictions can be neutralized.

### Key Capabilities & Security Research Areas:
- **NeoExamShield Emulation**: Impersonates the official proctoring extension via `chrome.management` and external messaging APIs to avoid third-party extension blocking.
- **Anti-Debugging Neutralization**: Defeats dynamic `debugger` injections, `console.table` spam detectors, and DevTools timing-based detection.
- **Browser Event Interception**: Suppresses tab-switch (`blur`, `focus`, `visibilitychange`, `beforeunload`, `pagehide`) detection.
- **Clipboard & Paste Restoration**: Re-enables copy, cut, and paste functionality through drag-and-drop simulation and character-by-character virtual typing.
- **AI-Powered Analysis**: Integrates OpenAI, Google Gemini, Anthropic Claude, and DeepSeek to solve coding questions and MCQs with overlay notifications and stealth chatbot interfaces.
- **NPTEL Offline Database**: Built-in JSON question-answer dataset for quick offline lookup.

---

## ⬇️ Installation

1. Clone or download this repository:
   ```bash
   git clone https://github.com/omrxjpxt/NeoShield-Bypass.git
   ```
   Or download the [ZIP archive](https://github.com/omrxjpxt/NeoShield-Bypass/archive/refs/heads/main.zip) and extract it.
2. Open Google Chrome (or any Chromium browser: Brave, Edge) and navigate to:
   ```text
   chrome://extensions/
   ```
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the folder containing this repository.
5. Pin the extension to your toolbar for quick access.

---

## 🔑 Where to Configure the AI API Key

To use the AI search and MCQ solving features with your own API:

1. Click the **NeoShield / NeoPass** icon in the Chrome toolbar.
2. In the popup window, switch to the **Settings** tab.
3. Select your **AI Provider** from the dropdown:
   - **Google Gemini** (from [Google AI Studio](https://aistudio.google.com))
   - **OpenAI** (from [platform.openai.com](https://platform.openai.com))
   - **Claude (Anthropic)** (from [console.anthropic.com](https://console.anthropic.com))
   - **DeepSeek**
   - **Custom Provider** (OpenAI-compatible custom endpoint)
4. Paste your secret key into the **API Key** input field.
5. *(Optional)* Enter a specific model name (e.g., `gpt-4o`, `gemini-1.5-pro`, `claude-3-5-sonnet`), or leave blank for the provider's default.
6. Click **Test Connection** to verify your key.
7. Your configuration **auto-saves** automatically to local browser storage (`chrome.storage.local`).

---

## ⌨️ Keyboard Shortcuts Reference

### Windows & Linux
| Shortcut | Action | Requirement |
|---|---|---|
| <kbd>Alt</kbd> + <kbd>A</kbd> | Search current Iamneo/Examly question with AI | On exam page |
| <kbd>Alt</kbd> + <kbd>T</kbd> | Auto-types coding solution letter-by-letter into ACE Editor | On coding question |
| <kbd>Alt</kbd> + <kbd>K</kbd> | Solve HackerRank question [BETA] | On HackerRank |
| <kbd>Alt</kbd> + <kbd>C</kbd> | Toggle Stealth AI Chatbot overlay | Any page |
| <kbd>Alt</kbd> + <kbd>P</kbd> | Paste using drag-and-drop simulation | In editable field |
| <kbd>Ctrl</kbd> + <kbd>V</kbd> | Force clipboard paste | In editable field |
| <kbd>Ctrl</kbd> + <kbd>.</kbd> | AI Answer Search from selected text | **Select text first** |
| <kbd>Ctrl</kbd> + <kbd>,</kbd> | Solve MCQ using AI from selected text | **Select question first** |
| <kbd>Alt</kbd> + <kbd>,</kbd> | Solve NPTEL MCQ from selected text | **Select question first** |

### macOS
| Shortcut | Action | Requirement |
|---|---|---|
| <kbd>Option</kbd> + <kbd>A</kbd> | Search current Iamneo/Examly question with AI | On exam page |
| <kbd>Option</kbd> + <kbd>T</kbd> | Auto-types coding solution letter-by-letter into ACE Editor | On coding question |
| <kbd>Option</kbd> + <kbd>K</kbd> | Solve HackerRank question [BETA] | On HackerRank |
| <kbd>Option</kbd> + <kbd>C</kbd> | Toggle Stealth AI Chatbot overlay | Any page |
| <kbd>Option</kbd> + <kbd>P</kbd> | Paste using drag-and-drop simulation | In editable field |
| <kbd>Cmd</kbd> + <kbd>V</kbd> | Force clipboard paste | In editable field |
| <kbd>Ctrl</kbd> + <kbd>.</kbd> | AI Answer Search from selected text | **Select text first** |
| <kbd>Ctrl</kbd> + <kbd>,</kbd> | Solve MCQ using AI from selected text | **Select question first** |
| <kbd>Option</kbd> + <kbd>,</kbd> | Solve NPTEL MCQ from selected text | **Select question first** |

---

## 🛡️ Architecture & Cybersecurity Techniques

```text
NeoShield-Bypass/
├── manifest.json                  # Manifest V3 extension definition
├── worker.js                      # Background service worker (AI proxy, context menus, hotkeys)
├── popup.html / popup.js          # Settings & credential configuration UI
├── devtools.js                    # Exam page detector & anti-debug bootstrap
├── contentScript.js               # Content script entry point
├── data/
│   ├── inject/
│   │   ├── anti-anti-debug.js     # Function/Proxy hooks stripping 'debugger' & DevTools traps
│   │   ├── screenshare.js         # Event overriding (blur, visibilitychange, beforeunload)
│   │   ├── exam.js                # Auto-typer simulating human typing in ACE Editor
│   │   ├── chatbot.js             # Shadow DOM isolated stealth AI chatbot
│   │   ├── customPaste.js         # Drag-drop paste & typing-paste fallback
│   │   ├── copyOverride.js        # Event-listener overrides restoring copy/cut/paste
│   │   └── mock_code/             # Mock NeoExamShield extension signatures
│   └── nptel.json                 # Offline question-answer knowledge base
```

### Ethical Hacking & Defensive Research Takeaways:
1. **Client-Side Enforcements Are Inherently Flawed**: Any restriction enforced strictly in JavaScript running inside the student's browser can be hooked, overridden, or neutralized.
2. **Extension Verification Limits**: Browser management APIs (`chrome.management`) can be spoofed if extension message handlers do not perform cryptographic origin validation.
3. **Recommendation for Exam Platforms**: Robust proctoring requires server-side behavioral analysis, OS-level secure lockdown browsers, or proctored in-person environments rather than client-side web scripts.

---

## 🤝 Contributing / NPTEL Dataset

1. Fork this repository: `https://github.com/omrxjpxt/NeoShield-Bypass`
2. Extract NPTEL assignment answers using the helper script in `nptel.txt`.
3. Append new questions to `data/nptel.json`.
4. Submit a Pull Request.

---

## ⚖️ Disclaimer

*This project was developed strictly for academic, educational, and ethical hacking internship research at NeoPat. It demonstrates the technical vulnerabilities of client-side proctoring software to encourage the development of more secure evaluation systems. Use responsibly and in accordance with your institution's honor code.*

## 📄 License

This project is licensed under the [MIT License](LICENSE).
