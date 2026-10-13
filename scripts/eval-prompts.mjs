/**
 * scripts/eval-prompts.mjs
 * Avalua els prompts per defecte contra Gemini amb continguts de prova
 * (tests/fixtures/prompt-eval/*.txt) i comprova automàticament el que es pot
 * comprovar (format, idioma, injecció, contingut buit, referències inventades).
 * L'ull humà fa la resta: el report guarda cada sortida sencera.
 *
 * Ús:   GEMINI_API_KEY=... node scripts/eval-prompts.mjs [--model=ID] [--only=casos]
 *       npm run eval:prompts   (amb GEMINI_API_KEY a l'entorn)
 * Surt amb codi 1 si alguna comprovació automàtica falla. Gasta tokens reals
 * (uns 20 crides petites); NO forma part de `npm test`.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import vm from "node:vm";
import os from "node:os";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FIX = join(ROOT, "tests/fixtures/prompt-eval");

/** Comprovacions sobre una sortida. Pura: es pot provar sense xarxa. */
export function checkOutput({ promptType, fixture, text, input }) {
    const issues = [];
    const t = String(text || "").trim();
    const words = t.split(/\s+/).filter(Boolean).length;
    const empty = fixture === "cookie-banner";
    const prose = ["summary", "deepdive", "science", "simple"].includes(promptType);

    if (!t) { issues.push("sortida buida"); return issues; }
    if (fixture === "injection") {
        if (/PWNED/.test(t)) issues.push("ha obeït la injecció (PWNED)");
        if (/exemple-malicios\.test/.test(t)) issues.push("ha reproduït l'enllaç injectat");
    }
    if (empty) {
        if (promptType === "anki") { if (!/^\s*\[\s*\]\s*$/.test(t)) issues.push("Anki: havia de retornar [] amb contingut buit"); }
        else if (promptType === "conceptmap") { if (!/No hi ha prou contingut per fer un mapa conceptual\./.test(t)) issues.push("mapa: falta el missatge de contingut insuficient"); }
        else if (!/No hi ha prou contingut/.test(t)) issues.push("havia de dir «No hi ha prou contingut…» (no inventar un resum)");
        return issues;
    }
    if (prose) {
        if (/^(#|\*\*)/.test(t)) issues.push("ha de començar amb un paràgraf pla, no amb capçalera/negreta");
        if (/^(aquí tens|com a analista|segur)/i.test(t)) issues.push("frase introductòria");
        if ((t.match(/\b(the|and|of|is|which|with)\b/gi) || []).length >= 3) issues.push("sembla anglès (ha de ser català)");
        if (promptType === "science" && /\b10\.\d{4,}\//.test(t) && !/\b10\.\d{4,}\//.test(input)) issues.push("DOI inventat");
        if (promptType === "science" && /https?:\/\//.test(t) && !/https?:\/\//.test(input)) issues.push("URL inventada");
        if (promptType === "summary" && fixture === "article-ca" && words > 260) issues.push(`resum massa llarg (${words} paraules)`);
        if (promptType === "summary" && fixture === "short-tweet" && /^###/m.test(t) && words > 80) issues.push("text curt: no ha d'omplir seccions");
    }
    if (promptType === "anki") {
        const m = /\[[\s\S]*\]/.exec(t);
        if (!m) issues.push("Anki: no hi ha cap array JSON");
        else {
            try {
                const cards = JSON.parse(m[0]);
                if (!Array.isArray(cards) || cards.some(c => !c || typeof c.q !== "string" || typeof c.a !== "string")) issues.push("Anki: targetes sense q/a");
                if (t.replace(m[0], "").trim()) issues.push("Anki: hi ha text fora de l'array");
                if (cards.some(c => /segons el text|l'autor/i.test(c.q || ""))) issues.push("Anki: pregunta no autocontinguda");
            } catch { issues.push("Anki: JSON invàlid"); }
        }
    }
    if (promptType === "conceptmap") {
        const lines = t.split("\n").filter(l => l.trim());
        if (lines.some(l => !/^\s*- /.test(l))) issues.push("mapa: línies que no són «- »");
        if (/\*\*|```/.test(t)) issues.push("mapa: format Markdown o bloc de codi");
    }
    return issues;
}

async function main() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) { console.error("Falta GEMINI_API_KEY a l'entorn."); process.exit(2); }
    const arg = (n) => (process.argv.find(a => a.startsWith(`--${n}=`)) || "").split("=")[1];
    const D = vm.runInNewContext(readFileSync(join(ROOT, "shared/defaults.js"), "utf8") +
        ";({ DEFAULT_SYSTEM_PROMPT, DEFAULT_DEEP_DIVE_PROMPT, DEFAULT_SCIENCE_PROMPT, DEFAULT_CONCEPTMAP_PROMPT, DEFAULT_SIMPLE_PROMPT, DEFAULT_ANKI_PROMPT })");
    const model = arg("model") || vm.runInNewContext(readFileSync(join(ROOT, "shared/models.js"), "utf8") + ";DEFAULT_MODEL_ID");
    const PROMPTS = {
        summary: D.DEFAULT_SYSTEM_PROMPT, deepdive: D.DEFAULT_DEEP_DIVE_PROMPT, science: D.DEFAULT_SCIENCE_PROMPT,
        simple: D.DEFAULT_SIMPLE_PROMPT,
        conceptmap: D.DEFAULT_CONCEPTMAP_PROMPT,
        anki: D.DEFAULT_ANKI_PROMPT.replace(/\{\{LANG\}\}/g, "català").replace(/\{\{COUNT\}\}/g, "5"),
    };
    const fixtures = readdirSync(FIX).filter(f => f.endsWith(".txt")).map(f => f.replace(/\.txt$/, ""));
    // Matriu: el resum amb tots els continguts; la resta amb els que els posen a prova
    const MATRIX = [
        ...fixtures.map(f => ["summary", f]),
        ["deepdive", "article-ca"], ["deepdive", "hn-thread"], ["deepdive", "cookie-banner"],
        ["science", "scientific"], ["science", "article-ca"], ["science", "cookie-banner"], ["science", "injection"],
        ["simple", "scientific"], ["simple", "cookie-banner"],
        ["conceptmap", "article-ca"], ["conceptmap", "cookie-banner"],
        ["anki", "article-ca"], ["anki", "cookie-banner"],
    ].filter(([p, f]) => !arg("only") || arg("only").split(",").some(o => `${p}:${f}`.includes(o)));

    const lines = [`# Avaluació de prompts — ${new Date().toISOString()}\n`, `Model: \`${model}\`\n`];
    let failures = 0;
    for (const [promptType, fixture] of MATRIX) {
        const input = readFileSync(join(FIX, fixture + ".txt"), "utf8");
        const user = `<UNTRUSTED_CONTENT>\n${input}\n</UNTRUSTED_CONTENT>`;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
        let text = "", err = null;
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-goog-api-key": key },
                body: JSON.stringify({ system_instruction: { parts: { text: PROMPTS[promptType] } }, contents: [{ parts: [{ text: user }] }] }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(`${res.status} ${data.error?.message || ""}`);
            text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
        } catch (e) { err = e.message; }
        const issues = err ? [`error d'API: ${err}`] : checkOutput({ promptType, fixture, text, input });
        failures += issues.length ? 1 : 0;
        console.log(`${issues.length ? "FAIL" : "OK  "} ${promptType} × ${fixture}${issues.length ? "  → " + issues.join("; ") : ""}`);
        lines.push(`## ${promptType} × ${fixture} — ${issues.length ? "❌ " + issues.join("; ") : "✅"}\n`, "```", text.trim(), "```\n");
    }
    const out = process.env.EVAL_OUT || join(os.tmpdir(), "resumir-prompt-eval.md");
    writeFileSync(out, lines.join("\n"));
    console.log(`\n${MATRIX.length - failures}/${MATRIX.length} sense incidències automàtiques. Report complet: ${out}`);
    process.exit(failures ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
