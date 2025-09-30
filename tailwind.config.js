/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Performance optimizations
  future: {
    hoverOnlyWhenSupported: true,
  },
  // Reduce CSS bundle size
  corePlugins: {
    preflight: true,
  },
  theme: {
    extend: {
      colors: {
        error: '#EA4335',
        action: '#4D91DB',
        'placeholder-gray': '#717171',
        'light-gray': '#F4F4F4',
        'border-gray': '#F6F6F6',
        'text-gray': '#757575',
        'avatar-bg': '#EDF4FB',
        'light-blue': '#E3EAF2',
        // Status colors
        'all-color': '#4D91DB',
        'all-bg': '#EDF4FB',
        'in-progress-color': '#FBBC04',
        'in-progress-bg': '#FFF8E6',
        'completed-color': '#2AA96A',
        'completed-bg': '#EAF6F0',
        'cancelled-color': '#EA4335',
        'cancelled-bg': '#F6E6F5',
        'card-bg': '#F9F9F9',
        'toggle-active': '#65C466',
        'border-dark-gray': '#E3E3E3',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-sidebar-active': 'linear-gradient(90deg, rgba(55, 113, 200, 0) 0%, rgba(55, 113, 200, 0.15) 100%)',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
