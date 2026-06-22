# Store Listing Texts

Aligned with the value proposition in `docs/COMUNICACIO.md` (knowledge
pipeline: capture → five lenses → consolidation; radical trust as the
values layer).

## Short Description (≤132 characters — CWS limit)

```
Turn articles, YouTube videos, threads and PDFs into structured knowledge: summaries, concept maps, science checks. Private.
```
(124 chars ✓)

---

## Long Description (English)

**Resumir** turns anything you read or watch — articles, YouTube videos, Twitter/X threads, Hacker News discussions, PDFs — into structured, lasting knowledge. Right in your browser sidebar, with your own Gemini API key, with no servers in between.

### 📥 Capture any content

If you can open it in your browser, you can use it:

- **Articles and web pages** — clean text extraction (Readability)
- **YouTube** — transcripts, including auto-generated captions
- **Twitter/X threads** and **Hacker News** (article + comments)
- **PDF files** — remote and local, with a text layer (pdf.js)

### 🔍 Five lenses to understand

Not just a summary — the understanding you need right now:

- **Summary** — the essentials, structured, streamed in real time
- **Deep dive** — the context and nuance a summary leaves out
- **Explain it simply** — any topic in plain language
- **Science check** — claims verified, sources assessed, biases flagged
- **Concept map** — interactive visualization with zoom, collapsible branches, and PNG export

Every prompt is 100% customizable.

### 📚 Knowledge that lasts

- **Obsidian export** with a configurable template
- **Markdown copy** — clean and reusable
- **History + local cache** — previously summarized pages load instantly
- **Usage statistics** — token and cost tracking per Gemini model

### 📖 Readability, your way

- **Bionic Reading** — configurable fixation, font, size, and line height
- **Multiple themes** — system, light, dark, solarized, gray
- Keyboard-navigable, WCAG-minded contrast

### 🔒 Radical trust

- Your API key and all your data stay in your browser (`storage.local`)
- Page content goes directly to the Google Gemini API — no third-party servers, ever
- No telemetry, no analytics, no account, no ads
- Open source (MPL-2.0)

### 🙏 Built on the shoulders of giants

Resumir exists thanks to these open source projects: **Readability.js** (Mozilla, Apache-2.0) for article extraction, and **pdf.js** (Mozilla, Apache-2.0) for PDF reading.

### Requirements

- A free Google Gemini API key (from [Google AI Studio](https://aistudio.google.com/)) — no credit card needed
- Firefox 142+ or Chrome/Edge/Brave (Manifest V3)

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
| Homepage URL | https://github.com/xxxaau/extensio-resumir-contingut |
| Support URL | https://github.com/xxxaau/extensio-resumir-contingut/issues |
| Privacy Policy URL | https://github.com/xxxaau/extensio-resumir-contingut/blob/main/docs/PRIVACY_POLICY.md |
