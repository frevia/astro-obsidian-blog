import { defineAstroPaperConfig } from "../config";

defineAstroPaperConfig({
  site: {
    url: "https://example.com",
    title: "Example",
    description: "Example site",
    author: "Example",
    // @ts-expect-error dir must be ltr, rtl, or auto.
    dir: "sideways",
  },
});
