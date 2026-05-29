// Genera un PDF amb text real per a tests E2E, usant pdfkit.
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "fixtures", "hello.pdf");
fs.mkdirSync(path.dirname(out), { recursive: true });

const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: "Hello PDF Test" } });
const stream = fs.createWriteStream(out);
doc.pipe(stream);

doc.fontSize(20).text("Hello PDF Test World", { align: "center" });
doc.moveDown();
doc.fontSize(12).text(
    "Aquest \u00e9s un PDF de prova per validar el flux d'extracci\u00f3 de text de l'extensi\u00f3 Resumir. " +
    "Cont\u00e9 prou contingut text perqu\u00e8 pdf.js no el detecti com a PDF escanejat. " +
    "El text aqu\u00ed inclou m\u00faltiples par\u00e0grafs amb informaci\u00f3 representativa. " +
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. " +
    "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. " +
    "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. " +
    "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
);
doc.moveDown();
doc.text(
    "Segon par\u00e0graf amb m\u00e9s contingut. La detecci\u00f3 d'OCR de l'extracci\u00f3 considera escanejats els PDF amb molt poc text. " +
    "Per assegurar-nos que aquest PDF \u00e9s classificat com a text-layer, l'omplim amb informaci\u00f3 redundant per\u00f2 v\u00e0lida."
);

doc.end();
stream.on("finish", () => {
    console.log(`Generated ${out} (${fs.statSync(out).size} bytes)`);
});
