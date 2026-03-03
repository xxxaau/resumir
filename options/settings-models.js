// options/settings-models.js
// Cerca i selecció de models de la API de Gemini
// --- Model Fetching Logic ---
// CURATED_MODELS ve de shared/models.js (carregat abans d'aquest fitxer)

function modelNote(cm) {
    const rpd = cm.rpd === 999999 ? "Il·limitat" : `${cm.rpd} req/dia`;
    return `$${cm.priceIn}/$${cm.priceOut} · ${rpd}`;
}

async function listModels(e) {
  e.preventDefault();
  const apiKey = document.querySelector("#apiKey").value;
  const modelsList = document.querySelector("#modelsList");
  const checkBtn = document.querySelector("#checkModels");
  
  if (!apiKey) {
    alert("Primer introdueix la API Key per buscar els models.");
    return;
  }
  
  checkBtn.textContent = "Cercant...";
  modelsList.style.display = "block";
  modelsList.replaceChildren();

  // Always show curated models first
  const curatedHeader = document.createElement("div");
  curatedHeader.style.cssText = "font-weight:bold; font-size:0.8em; color:#666; padding:4px 0 2px; border-bottom:1px solid #eee; margin-bottom:4px;";
  curatedHeader.textContent = "✦ Models recomanats";
  modelsList.appendChild(curatedHeader);

  CURATED_MODELS.forEach(cm => {
      const div = document.createElement("div");
      div.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:4px 0;";
      const nameSpan = document.createElement("span");
      nameSpan.textContent = cm.label;
      nameSpan.style.fontWeight = "500";
      const noteSpan = document.createElement("span");
      noteSpan.textContent = modelNote(cm);
      noteSpan.style.cssText = "font-size:0.75em; color:#888;";
      div.appendChild(nameSpan);
      div.appendChild(noteSpan);
      div.style.cursor = "pointer";
      div.onclick = () => {
          document.querySelector("#modelName").value = cm.id;
          modelsList.style.display = "none";
      };
      modelsList.appendChild(div);
  });

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models`, {
        headers: { "x-goog-api-key": apiKey }
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(`[010] ${err.error?.message || response.statusText}`);
    }
    const data = await response.json();
    
    const curatedIds = new Set(CURATED_MODELS.map(m => m.id));
    const otherModels = (data.models || [])
        .filter(m =>
            m.supportedGenerationMethods?.includes("generateContent") &&
            !/embedding|aqa|robotics|vision|image/i.test(m.name)
        )
        .map(m => m.name.replace("models/", ""))
        .filter(id => !curatedIds.has(id));

    if (otherModels.length > 0) {
        const otherHeader = document.createElement("div");
        otherHeader.style.cssText = "font-weight:bold; font-size:0.8em; color:#666; padding:8px 0 2px; border-bottom:1px solid #eee; margin-bottom:4px;";
        otherHeader.textContent = "Altres models disponibles";
        modelsList.appendChild(otherHeader);
        otherModels.forEach(model => {
            const div = document.createElement("div");
            div.textContent = model;
            div.style.cursor = "pointer";
            div.onclick = () => {
                document.querySelector("#modelName").value = model;
                modelsList.style.display = "none";
            };
            modelsList.appendChild(div);
        });
    }
  } catch (err) {
    const span = document.createElement("span");
    span.style.cssText = "color:red; font-size:0.85em;";
    span.textContent = `Error API: ${err.message}`;
    modelsList.appendChild(span);
  } finally {
    checkBtn.textContent = "Cercar models";
  }
}
