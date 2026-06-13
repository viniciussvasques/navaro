/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                primary: "#005F73",
                secondary: "#0A9396",
                accent: "#E9D8A6",
                surface: "#FFFFFF",
                text: {
                    main: "#1A1A1A",
                    muted: "#64748B",
                },
                success: "#94D2BD",
                error: "#AE2012",
            },
            fontFamily: {
                sans: ["PlusJakartaSans-Regular", "sans-serif"],
                bold: ["PlusJakartaSans-Bold", "sans-serif"],
            },
            borderRadius: {
                xl: "16px",
                "2xl": "20px",
            }
        },
    },
    plugins: [],
}
