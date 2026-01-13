/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                nordic: {
                    cream: '#fdfbf7',
                    pink: '#e8d5d5',
                    green: '#8da399',
                    blue: '#8fa3ad',
                    text: '#4a4a4a',
                    card: '#ffffff'
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            borderRadius: {
                '4xl': '2rem',
            }
        },
    },
    plugins: [],
}
