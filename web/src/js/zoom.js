/* Lightbox mínim i accessible amb l'element <dialog> nadiu.
   Amplia les captures marcades amb [data-zoom] i les imatges de les guies
   perquè se'n pugui llegir el detall. Sense dependències ni tercers. */
(function () {
  const dlg = document.getElementById("zoom");
  if (!dlg || typeof dlg.showModal !== "function") return; // sense suport → cap canvi
  const zimg = document.getElementById("zoom-img");

  function open(im) {
    zimg.src = im.currentSrc || im.src;
    zimg.alt = im.alt || "";
    dlg.showModal();
  }

  document.querySelectorAll("img[data-zoom], .prose img").forEach(function (im) {
    im.tabIndex = 0;
    im.setAttribute("role", "button");
    im.setAttribute("aria-label", "Amplia la imatge: " + (im.alt || "captura"));
    im.addEventListener("click", function () { open(im); });
    im.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(im); }
    });
  });

  // Tancar: clic al fons (backdrop) o botó de tancar. Esc i el retorn del focus els gestiona <dialog>.
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  const closeBtn = dlg.querySelector("[data-zoom-close]");
  if (closeBtn) closeBtn.addEventListener("click", function () { dlg.close(); });
})();
