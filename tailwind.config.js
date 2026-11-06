import defaultTheme from 'tailwindcss/defaultTheme';
import colors from 'tailwindcss/colors';
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
                display: ['Inter', '"Plus Jakarta Sans"', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                // Unify warm "gray" and cool "slate" neutrals into one enterprise slate scale.
                gray: colors.slate,
                // Enterprise brand tokens
                navy: {
                    50: '#F2F5FB',
                    100: '#E3E9F5',
                    200: '#C3CEE6',
                    300: '#93A4CC',
                    400: '#5F75A8',
                    500: '#3D5288',
                    600: '#2A3C6B',
                    700: '#1E2D54',
                    800: '#162343',
                    900: '#101D38',
                    950: '#0A1326',
                },
                brand: {
                    DEFAULT: '#2563EB',
                    accent: '#4F46E5',
                    surface: '#F4F6FA',
                    ink: '#111827',
                    muted: '#64748B',
                },
            },
            boxShadow: {
                // Softer, layered enterprise shadows
                xs: '0 1px 2px 0 rgba(16, 29, 56, 0.04)',
                sm: '0 1px 2px 0 rgba(16, 29, 56, 0.05), 0 1px 3px 0 rgba(16, 29, 56, 0.04)',
                DEFAULT: '0 1px 3px 0 rgba(16, 29, 56, 0.07), 0 1px 2px -1px rgba(16, 29, 56, 0.05)',
                md: '0 4px 8px -2px rgba(16, 29, 56, 0.07), 0 2px 4px -2px rgba(16, 29, 56, 0.04)',
                lg: '0 12px 20px -6px rgba(16, 29, 56, 0.09), 0 4px 8px -4px rgba(16, 29, 56, 0.04)',
                xl: '0 20px 32px -12px rgba(16, 29, 56, 0.14), 0 8px 12px -6px rgba(16, 29, 56, 0.05)',
                '2xl': '0 28px 56px -16px rgba(16, 29, 56, 0.22)',
            },
            borderRadius: {
                // Slightly tighter large radii for a more professional feel
                '3xl': '1.25rem',
            },
        },
    },

    plugins: [forms],
};
