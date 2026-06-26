import { EleventyHtmlBasePlugin } from "@11ty/eleventy";

export default function (eleventyConfig) {
  // pathPrefix aplicat a tots els enllaços root-relative i als assets
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);

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
