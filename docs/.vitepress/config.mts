import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "kodado",
  description: "A VitePress Site",
  base: '/kodado-js/',
  themeConfig: {
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is kodado?', link: '/what-is-kodado' },
          { text: 'Getting Started', link: '/getting-started' },
        ]
      },
      {text: 'Authentication', items: [
        { text: "Introduction", link: '/authentication-intro' },
        { text: 'Authenticating', link: '/authenticating' },
      ]},
      {text: 'Items', items: [
        { text: 'Introduction', link: '/items' },
        { text: 'Creating', link: '/creating' },
        { text: 'Reading', link: '/reading' },
        { text: 'Updating', link: '/updating' },
        { text: 'Deleting', link: '/deleting' },
      ]},
      {text: 'Sharing',
        items: [
          { text: 'Introduction', link: '/sharing-intro' },
          { text: 'Sharing Items', link: '/sharing' },
          { text: 'Revoking Access', link: '/revoking' },
        ]
      },
      {text: 'Files',
        items: [
          { text: 'Introduction', link: '/files-intro' },
          { text: 'Uploading', link: '/uploading' },
          { text: 'Downloading', link: '/downloading' },
        ]
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/kodado/kodado-js' }
    ]
  }
})
