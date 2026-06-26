import { EleventyHtmlBasePlugin } from "@11ty/eleventy";

export default function (eleventyConfig) {
  // Reescriu els enllaços relatius de les guies (markdown) a rutes del web.
  // Usa addUrlTransform (priority 0) per córrer ABANS del HtmlBasePlugin (priority -2),
  // que afegirà el /resumir/ als camins root-relative resultants.
  const GUIDE_ROUTES = {
    "GUIA-INICI.md": "/guia/inici/",
    "API-KEY-GOOGLE.md": "/guia/clau-api/",
    "PLUGINS.md": "/guia/plugins/",
  };
  eleventyConfig.htmlTransformer.addUrlTransform("html", function (url) {
    // Reescriu ./FILE.md o FILE.md (amb àncora opcional) a /guia/<slug>/[#àncora]
    for (const [file, route] of Object.entries(GUIDE_ROUTES)) {
      const re = new RegExp(`^\\.?\\/?${file.replace(".", "\\.")}(#.*)?$`);
      const m = url.match(re);
      if (m) return `${route}${m[1] || ""}`;
    }
    // Reescriu ./img/... o img/... a /img/...
    if (/^\.?\/?img\//.test(url)) {
      return url.replace(/^\.?\/?img\//, "/img/");
    }
    return url;
  });

  // pathPrefix aplicat a tots els enllaços root-relative i als assets
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);

  // _generated és al .gitignore (generat en temps de build); cal dir-li a Eleventy que l'inclogui
  eleventyConfig.setUseGitIgnore(false);
  eleventyConfig.ignores.add("node_modules/**");

  // Assets estàtics. Les imatges són font única a docs/user-guide/img/ i
  // sync-content.mjs les copia a src/_generated/img.
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });
  eleventyConfig.addPassthroughCopy({ "src/_generated/img": "img" });

  return {
    pathPrefix: "/resumir/",
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dir: {
      input: "src",
      includes: "_includes",
      output: "_site",
    },
  };
}
