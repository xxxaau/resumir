import { EleventyHtmlBasePlugin } from "@11ty/eleventy";

export default function (eleventyConfig) {
  // pathPrefix aplicat a tots els enllaços root-relative i als assets
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);

  // _generated és al .gitignore (generat en temps de build); cal dir-li a Eleventy que l'inclogui
  eleventyConfig.setUseGitIgnore(false);
  eleventyConfig.ignores.add("node_modules/**");

  // Assets estàtics
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/img": "img" });
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
