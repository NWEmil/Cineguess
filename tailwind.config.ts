/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",           // App Router pages/layouts
    "./components/**/*.{js,ts,jsx,tsx,mdx}",    // ← Change to "./Components/..." if folder is capitalized
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",           // If you have utilities here
    // Add any other folders where you use Tailwind classes, e.g.:
    // "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
