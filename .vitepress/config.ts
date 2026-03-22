import { defineConfig } from "vitepress";

export default defineConfig({
  title: "FlowForge",
  description:
    "A workflow automation platform with dynamic JSON forms and a visual workflow builder",
  base: "/",
  head: [["link", { rel: "icon", href: "/favicon.ico" }]],

  themeConfig: {
    logo: "/logo.svg",
    siteTitle: "FlowForge",

    nav: [
      { text: "Guide", link: "/guide/overview" },
      { text: "Reference", link: "/reference/api" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Introduction",
          items: [
            { text: "Overview", link: "/guide/overview" },
            { text: "Architecture", link: "/guide/architecture" },
          ],
        },
        {
          text: "Core Systems",
          items: [
            { text: "Admin Portal", link: "/guide/admin-portal" },
            { text: "Workflow Engine", link: "/guide/workflow-engine" },
          ],
        },
        {
          text: "Integration",
          items: [
            { text: "Integration Guide", link: "/guide/integration" },
          ],
        },
      ],
      "/reference/": [
        {
          text: "Reference",
          items: [
            { text: "API Reference", link: "/reference/api" },
            {
              text: "Workflow Definition Schema",
              link: "/reference/workflow-schema",
            },
            { text: "Form Definition Schema", link: "/reference/form-schema" },
          ],
        },
      ],
    },

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/psp-kbz/dynamic-workflow",
      },
    ],

    search: {
      provider: "local",
    },

    footer: {
      message: "FlowForge Documentation",
    },

    outline: {
      level: [2, 3],
    },
  },
});
