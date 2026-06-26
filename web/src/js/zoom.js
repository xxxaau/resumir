/* Lightbox mínim i accessible amb l'element <dialog> nadiu.
   Amplia les captures (cartes del hero amb [data-zoom-src] i imatges de les guies)
   perquè se'n pugui llegir el contingut. Sense dependències ni tercers. */
(function () {
  const dlg = document.getElementById("zoom");
  if (!dlg || typeof dlg.showModal !== "function") return; // sense suport → cap canvi
  const zimg = document.getElementById("zoom-img");

  function open(src, alt) {
    if (!src) return;
    zimg.src = src;
    zimg.alt = alt || "";
    dlg.showModal();
  }

  // Cartes del hero: amplia la imatge interior (el seu src ja porta el pathPrefix).
  document.querySelectorAll(".lens-card").forEach(function (el) {
    const im = el.querySelector("img");
    if (!im) return;
    el.addEventListener("click", function () {
      open(im.currentSrc || im.src, el.getAttribute("data-zoom-alt") || im.alt);
    });
  });

  // Imatges de contingut (guies, PMF…): fes-les ampliables i accessibles per teclat.
  document.querySelectorAll(".prose img").forEach(function (im) {
    im.tabIndex = 0;
    im.setAttribute("role", "button");
    im.setAttribute("aria-label", "Amplia la imatge: " + (im.alt || "captura"));
    im.style.cursor = "zoom-in";
    function go() { open(im.currentSrc || im.src, im.alt); }
    im.addEventListener("click", go);
    im.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
    });
  });

  // Tancar: clic al fons (backdrop) o botó de tancar. Esc i focus els gestiona <dialog>.
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  const closeBtn = dlg.querySelector("[data-zoom-close]");
  if (closeBtn) closeBtn.addEventListener("click", function () { dlg.close(); });
})();
