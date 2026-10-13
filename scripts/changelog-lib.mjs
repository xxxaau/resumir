/**
 * scripts/changelog-lib.mjs
 * Lògica pura (sense E/S) per convertir docs/CHANGELOG.md en el bloc HTML de
 * l'historial de canvis de settings.html. Testejada a tests/changelog.test.mjs.
 */

const MONTHS_CA = [
    "Gener", "Febrer", "Març", "Abril", "Maig", "Juny",
    "Juliol", "Agost", "Setembre", "Octubre", "Novembre", "Desembre",
];

export function isoToMonthYear(isoDate) {
    const [year, month] = isoDate.split("-");
    return `${MONTHS_CA[parseInt(month, 10) - 1]} ${year}`;
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Markdown en línia → HTML. ESCAPA primer el text: `<all_urls>` o
 * `<UNTRUSTED_CONTENT>` en una línia de codi es perdien perquè el navegador els
 * interpretava com a etiquetes desconegudes. S'escapa ABANS de les
 * substitucions perquè les etiquetes que generem (<strong>, <code>…) no
 * s'escapin.
 */
export function mdInlineToHtml(text) {
    return escapeHtml(text)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/`(.+?)`/g, "<code>$1</code>")
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}

export function parseChangelog(md) {
    const versions = [];
    let current = null;
    let currentSection = null;
    // Text en brut de l'últim item: les línies de continuació s'hi afegeixen i
    // es converteix a HTML un cop (si no, es tallaven a mitja frase).
    let lastItem = null;

    const flushItem = () => {
        if (lastItem) {
            lastItem.section.items.push(mdInlineToHtml(lastItem.text));
            lastItem = null;
        }
    };

    for (const line of md.split("\n")) {
        const versionMatch = line.match(/^## \[(.+?)\] - (\d{4}-\d{2}-\d{2})/);
        if (versionMatch) {
            flushItem();
            if (current) versions.push(current);
            current = { version: versionMatch[1], date: versionMatch[2], milestone: null, sections: [] };
            currentSection = null;
            continue;
        }

        // Saltar capçaleres de versió sense data (p. ex. "Versió inicial" o guia)
        if (line.startsWith("## ")) {
            flushItem();
            if (current) versions.push(current);
            current = null;
            currentSection = null;
            continue;
        }

        if (!current) continue;

        const sectionMatch = line.match(/^### (.+)/);
        if (sectionMatch) {
            flushItem();
            currentSection = { name: sectionMatch[1], items: [] };
            current.sections.push(currentSection);
            continue;
        }

        const itemMatch = line.match(/^- (.+)/);
        if (itemMatch && currentSection) {
            flushItem();
            lastItem = { section: currentSection, text: itemMatch[1] };
            continue;
        }

        // Línia sagnada: continuació de l'item anterior (o subpunt, que s'hi
        // uneix amb «; »).
        if (lastItem && /^\s+\S/.test(line)) {
            const sub = line.trim().match(/^- (.+)/);
            lastItem.text += sub ? `; ${sub[1]}` : ` ${line.trim()}`;
            continue;
        }

        if (line.trim() === "") {
            flushItem();
            continue;
        }

        // Línies de text lliure entre la capçalera de versió i la primera secció
        if (!currentSection && line.trim() && !line.startsWith("#")) {
            current.milestone = mdInlineToHtml(line.trim());
        }
    }

    flushItem();
    if (current) versions.push(current);
    return versions;
}

// Entrades «(minor)» i de desenvolupador «(dev)» no es mostren a l'usuari.
const HIDDEN_MARKER = /\s*\((minor|dev)\)\s*$/;

function isHidden(item) {
    return HIDDEN_MARKER.test(item);
}

// Versions que es mostren obertes; les anteriors queden plegades sota «Versions anteriors».
export const RECENT_VERSIONS = 5;

export function generateHtml(versions) {
    const ind = "            "; // 12 espais — indentació dins <div class="changelog">
    const entries = versions.map(v => {
        const allItems = v.sections.flatMap(s => s.items).filter(item => !isHidden(item));
        // Saltar versions sense items majors
        if (allItems.length === 0) return "";

        const lines = [];
        lines.push(`${ind}<div class="version-entry">`);
        lines.push(`${ind}  <div class="version-title">`);
        lines.push(`${ind}    v${v.version}`);
        lines.push(`${ind}    <span class="version-date">${isoToMonthYear(v.date)}</span>`);
        lines.push(`${ind}  </div>`);

        if (v.milestone) {
            lines.push(`${ind}  <p class="version-milestone">${v.milestone}</p>`);
        }

        lines.push(`${ind}  <ul class="version-list">`);
        for (const item of allItems) {
            lines.push(`${ind}    <li>${item}</li>`);
        }
        lines.push(`${ind}  </ul>`);

        lines.push(`${ind}</div>`);
        return lines.join("\n");
    }).filter(Boolean);

    if (entries.length <= RECENT_VERSIONS) return entries.join("\n");
    return [
        ...entries.slice(0, RECENT_VERSIONS),
        `${ind}<details class="changelog-older">`,
        `${ind}  <summary>Versions anteriors</summary>`,
        ...entries.slice(RECENT_VERSIONS),
        `${ind}</details>`,
    ].join("\n");
}
