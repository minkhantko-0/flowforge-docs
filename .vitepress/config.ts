import { defineConfig } from "vitepress";

export default defineConfig({
  title: "FlowForge",
  description:
    "A workflow automation platform with dynamic JSON forms and a visual workflow builder",
  base: "/",
  head: [["link", { rel: "icon", href: "/favicon.ico" }]],

  locales: {
    root: {
      label: "English",
      lang: "en",
      themeConfig: {
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
                {
                  text: "Form Definition Schema",
                  link: "/reference/form-schema",
                },
              ],
            },
          ],
        },
      },
    },
    my: {
      label: "မြန်မာ",
      lang: "my",
      themeConfig: {
        nav: [
          { text: "လမ်းညွှန်", link: "/my/guide/overview" },
          { text: "အညွှန်း", link: "/my/reference/api" },
        ],
        sidebar: {
          "/my/guide/": [
            {
              text: "မိတ်ဆက်",
              items: [
                { text: "အကျဉ်းချုပ်", link: "/my/guide/overview" },
                { text: "ဗိသုကာ", link: "/my/guide/architecture" },
              ],
            },
            {
              text: "အဓိက စနစ်များ",
              items: [
                { text: "Admin Portal", link: "/my/guide/admin-portal" },
                {
                  text: "Workflow Engine",
                  link: "/my/guide/workflow-engine",
                },
              ],
            },
            {
              text: "ပေါင်းစည်းခြင်း",
              items: [
                {
                  text: "ပေါင်းစည်းမှု လမ်းညွှန်",
                  link: "/my/guide/integration",
                },
              ],
            },
          ],
          "/my/reference/": [
            {
              text: "အညွှန်း",
              items: [
                { text: "API အညွှန်း", link: "/my/reference/api" },
                {
                  text: "Workflow Definition Schema",
                  link: "/my/reference/workflow-schema",
                },
                {
                  text: "Form Definition Schema",
                  link: "/my/reference/form-schema",
                },
              ],
            },
          ],
        },
      },
    },
  },

  themeConfig: {
    logo: "/logo.svg",
    siteTitle: "FlowForge",

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/minkhantko-0/flowforge-docs",
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
