import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', '"Plus Jakarta Sans"', ...defaultTheme.fontFamily.sans],
                display: ['"Plus Jakarta Sans"', 'Inter', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                corporate: {
                    navy: '#10213F',
                    blue: '#2563EB',
                    'blue-hover': '#1D4ED8',
                    light: '#EAF2FF',
                    bg: '#F4F7FB',
                    card: '#FFFFFF',
                    text: '#172B4D',
                    muted: '#64748B',
                    border: '#E2E8F0',
                },
                primary: {
                    50: '#EAF2FF',
                    100: '#DBEAFE',
                    200: '#BFDBFE',
                    300: '#93C5FD',
                    400: '#60A5FA',
                    500: '#3B82F6',
                    600: '#2563EB',
                    700: '#1D4ED8',
                    800: '#1E40AF',
                    900: '#10213F',
                },
            },
        },
    },

    plugins: [forms],
};
