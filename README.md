# Next.js 14 App with Tailwind CSS

This is a Next.js 14 application built with Tailwind CSS v3 and the App Router.

## Features

- ⚡ Next.js 14 with App Router
- 🎨 Tailwind CSS v3 for styling
- 📱 Responsive design
- 🔧 TypeScript support
- 🚀 Modern development experience

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
├── app/
│   ├── globals.css          # Global styles with Tailwind imports
│   ├── layout.tsx           # Root layout component
│   ├── page.tsx             # Home page
│   ├── about/
│   │   └── page.tsx         # About page
│   └── contact/
│       └── page.tsx         # Contact page
├── package.json
├── tailwind.config.js       # Tailwind configuration
├── postcss.config.js        # PostCSS configuration
├── next.config.js           # Next.js configuration
└── tsconfig.json            # TypeScript configuration
```

## Pages

- **Home** (`/`) - Welcome page with project overview
- **About** (`/about`) - Information about the project and technologies
- **Contact** (`/contact`) - Contact form and information

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - learn about Tailwind CSS.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
