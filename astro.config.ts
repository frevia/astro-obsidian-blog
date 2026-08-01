import { defineConfig, envField, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { satteri } from "@astrojs/markdown-satteri";

import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName";
import { SITE } from "./src/config";

import react from "@astrojs/react";
import pagefind from "astro-pagefind";

import compress from "astro-compress";
import vercel from "@astrojs/vercel";
import {
  markdownFeatures,
  pageHastPlugins,
  pageMdastPlugins,
} from "./src/markdown/processor";
import {
  fontsourceVariantsFromPackage,
  resolvePackageFileUrl,
} from "./src/utils/loadLocalFont";

const notoSansScVariants = fontsourceVariantsFromPackage(
  "@fontsource-variable/noto-sans-sc/wght.css",
  "woff2"
);
const notoSerifScVariants = fontsourceVariantsFromPackage(
  "@fontsource-variable/noto-serif-sc/wght.css",
  "woff2"
);
const maShanZhengWoff = resolvePackageFileUrl(
  "@fontsource/ma-shan-zheng/files/ma-shan-zheng-chinese-simplified-400-normal.woff"
);
const localFontProvider = fontProviders.local();

// https://astro.build/config
export default defineConfig({
  site: SITE.website,
  base: SITE.base,
  output: "static",
  adapter: vercel(),
  // Warm high-intent navigations without downloading every route up front.
  prefetch: { defaultStrategy: "hover" },
  fonts: [
    {
      name: "Noto Sans SC Variable",
      cssVariable: "--font-noto-sans-sc",
      provider: localFontProvider,
      weights: ["100 900"],
      styles: ["normal"],
      formats: ["woff2"],
      fallbacks: ["ui-sans-serif", "system-ui", "sans-serif"],
      options: {
        variants: notoSansScVariants,
      },
    },
    {
      name: "Noto Serif SC Variable",
      cssVariable: "--font-noto-serif-sc",
      provider: localFontProvider,
      weights: ["200 900"],
      styles: ["normal"],
      formats: ["woff2"],
      fallbacks: ["ui-serif", "Songti SC", "serif"],
      options: {
        variants: notoSerifScVariants,
      },
    },
    {
      name: "Ma Shan Zheng",
      cssVariable: "--font-og",
      provider: localFontProvider,
      weights: [400, 700, 800],
      styles: ["normal"],
      formats: ["woff"],
      fallbacks: [],
      optimizedFallbacks: false,
      options: {
        variants: [
          {
            src: [maShanZhengWoff],
            weight: "400",
            style: "normal",
            display: "swap",
          },
          {
            src: [maShanZhengWoff],
            weight: "700",
            style: "normal",
            display: "swap",
          },
          {
            src: [maShanZhengWoff],
            weight: "800",
            style: "normal",
            display: "swap",
          },
        ],
      },
    },
  ],
  build: {
    format: "directory",
  },
  integrations: [
    mdx({ extendMarkdownConfig: true }),
    sitemap({
      filter: page => SITE.showArchives || !page.endsWith("/archives"),
    }),
    react(),
    ...(SITE.search === "pagefind" ? [pagefind()] : []),
    compress({
      // Tailwind v4 emits range media queries such as `(width >= 40rem)`.
      // astro-compress 2.4.1 drops those rules during its CSS pass, which
      // removes every responsive utility from production builds. Vite still
      // minifies the generated CSS, so skip only this destructive second pass.
      CSS: false,
      HTML: {
        "html-minifier-terser": {
          removeComments: true,
          collapseWhitespace: true,
          removeEmptyAttributes: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          useShortDoctype: true,
          minifyCSS: true,
          minifyJS: true,
          removeAttributeQuotes: true,
          preserveLineBreaks: false,
        },
      },
      JavaScript: true,
      SVG: true,
      Image: false,
    }),
  ],
  markdown: {
    processor: satteri({
      mdastPlugins: pageMdastPlugins,
      hastPlugins: pageHastPlugins,
      features: markdownFeatures,
    }),
    shikiConfig: {
      // For more themes, visit https://shiki.style/themes
      themes: { light: "min-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      // 为自定义卡片语言创建别名，映射到 yaml 语法高亮
      langAlias: {
        "card-movie": "yaml",
        "card-tv": "yaml",
        "card-book": "yaml",
        "card-music": "yaml",
        imgs: "markdown",
      },
      transformers: [
        transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  vite: {
    resolve: {
      alias: {
        react: "preact/compat",
        "react-dom": "preact/compat",
        "react-dom/client": "preact/compat",
        "react-dom/server": "preact/compat/server",
        "react/jsx-runtime": "preact/jsx-runtime",
        "react/jsx-dev-runtime": "preact/jsx-runtime",
      },
      dedupe: ["react", "react-dom"],
    },
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
  },
  image: {
    responsiveStyles: true,
    layout: "constrained",
  },
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_TWIKOO_ENABLED: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_TWIKOO_ENV_ID: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_TWIKOO_REGION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_TWIKOO_LANG: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
});
