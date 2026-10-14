# Store Listing Texts

Aligned with the value proposition in `docs/COMUNICACIO.md` (knowledge
pipeline: capture → five lenses → consolidation; radical trust as the
values layer).

## Short Description (≤132 characters — CWS limit)

```
Summarize web pages, YouTube videos, threads and PDFs with Gemini, and understand them better. Private, in your browser.
```
(120 chars ✓)

---

## Long Description (English)

**Resumir** gives you a clear summary of any web page, YouTube video, thread or PDF — and lets you go deeper when you want more. Everything runs in your browser, with your own Google Gemini API key.

### How it works

1. Open a page and click **Summarize** (or press Alt+Shift+S).
2. Read the summary in the side panel as it is generated.
3. Click a quote and the page highlights it in yellow and scrolls to it, like Ctrl+F.

### What you can summarize

- Articles and web pages
- YouTube videos (with clickable timestamps)
- Twitter/X threads and Hacker News discussions
- PDFs, from the web or from your computer (with linked page numbers)

### Five ways to understand it

- **Summary** — the essentials, with key points and literal quotes
- **Deep dive** — the context and nuance a summary leaves out
- **Explain it simply** — the same, in plain language
- **Science check** — what the text claims versus what the consensus says
- **Concept map** — an interactive map you can zoom, fold and download

Every summary says how much text it is based on and which model made it, so you know how far to trust it. All prompts are editable.

### Keep it

- Save the summary to **Obsidian** with your own template
- Copy it as **Markdown**
- Reopen any summary from the **history**, at no cost
- Generate **Anki** flashcards
- Export and import your settings as a file

### Your way

- Optional Bionic Reading
- Light, dark, Flexoki and gray themes, or follow your system
- Keyboard-friendly, with careful contrast

### Your privacy

- No server of ours, no telemetry, no account, no ads
- Your API key stays in this browser only
- Page text leaves your browser only for Google Gemini, when you ask for a summary
- The "Data and privacy" page in Settings shows you where everything is stored
- Open source (MPL-2.0)

### Requirements

- A free Google Gemini API key from [Google AI Studio](https://aistudio.google.com/) — no credit card needed
- Firefox 142+ or Chrome/Edge/Brave (Manifest V3)

Resumir uses Readability.js and pdf.js from Mozilla (Apache-2.0).

---

## Single Purpose Statement (CWS)

```
Summarize and explain the content of the active web page using Google Gemini AI, displayed in the browser sidebar.
```

---

## Permission Justifications (CWS)

> ⚠️ Updated (June 2026): `<all_urls>` is now a REQUIRED host permission
> granted at install time — it is no longer optional/runtime. Justifications
> below reflect this.

### `<all_urls>` (host permission, granted at install)
Required to read the content of whichever page the user asks to summarize — which by design can be any page. Content is read only when the user explicitly triggers a summary, is sent only to the Google Gemini API over HTTPS, and is never stored remotely or shared with any other party. Granted at install so summarizing works without a per-site permission prompt.

### `activeTab`
Required to read the URL and title of the current tab when the user triggers a summary. Without this, the extension cannot identify which page to summarize.

### `scripting`
Required to inject the content extraction script into the active tab to read page text (via Readability.js or specialized extractors for YouTube/HN/Twitter). Content is sent to the Gemini API and never stored remotely.

### `storage`
Required to persist user settings (API key, theme, plugin configuration, model preferences) and the local summary cache. All data stays on the user's device.

### `tabs`
Required to open the sidebar panel and to detect tab navigation (so the extension can show the cached badge when a previously summarized page is revisited).

### `sidePanel` / `sidebar_action`
Required to display the summary in the browser sidebar without opening a new tab or popup.

### `contextMenus` / `menus`
Required to add the "Summarize this page" option to the right-click context menu.

---

## Update note for existing users (permission escalation)

Moving `<all_urls>` from optional to required means browsers will ask
existing users to re-approve permissions on update (Chrome/Edge disable the
extension until re-approved). Release notes MUST mention this:

```
⚠️ This update simplifies permissions: page access is now granted once at
install instead of per-site prompts. Your browser will ask you to re-approve
the extension — this is expected and only happens once.
```

---

## Category

| Store | Category |
|-------|----------|
| Chrome Web Store | Productivity |
| Firefox Add-ons (AMO) | Productivity |

---

## Store Metadata

| Field | Value |
|-------|-------|
| Homepage URL | https://xxxaau.github.io/resumir/ |
| Support URL | https://github.com/xxxaau/resumir/issues |
| Privacy Policy URL | https://github.com/xxxaau/resumir/blob/main/docs/PRIVACY_POLICY.md |
