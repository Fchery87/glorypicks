/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "sm": "640px",
        "md": "768px",
        "lg": "1024px",
        "xl": "1280px",
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "SFMono-Regular", "Monaco", "Consolas", "monospace"],
      },
      colors: {
        // Background scale
        "bg-primary": "#0A0A0B",
        "bg-secondary": "#111113",
        "bg-tertiary": "#1A1A1D",
        "bg-elevated": "#222226",
        
        // Border scale
        "border-subtle": "#2A2A2E",
        "border-default": "#3A3A40",
        "border-strong": "#4A4A52",
        
        // Text scale
        "text-primary": "#FAFAFA",
        "text-secondary": "#A1A1AA",
        "text-tertiary": "#71717A",
        
        // Accent colors
        "accent-primary": "#E8E4DD",
        "accent-bullish": "#4ADE80",
        "accent-bearish": "#FB7185",
        "accent-neutral": "#A1A1AA",
        
        // Functional colors
        "success": "#22C55E",
        "warning": "#EAB308",
        "error": "#EF4444",
        "info": "#3B82F6",
        
        // Legacy shadcn compatibility
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        sm: "2px",
        md: "4px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      fontSize: {
        'display': ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'h1': ['32px', { lineHeight: '1.1', letterSpacing: '-0.01em', fontWeight: '600' }],
        'h2': ['24px', { lineHeight: '1.2', letterSpacing: '0', fontWeight: '600' }],
        'h3': ['18px', { lineHeight: '1.2', letterSpacing: '0', fontWeight: '600' }],
        'body': ['14px', { lineHeight: '1.5', letterSpacing: '0' }],
        'body-sm': ['13px', { lineHeight: '1.5', letterSpacing: '0' }],
        'caption': ['12px', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '500' }],
        'data-lg': ['28px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '500' }],
        'data-md': ['18px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '500' }],
        'data-sm': ['14px', { lineHeight: '1.2', letterSpacing: '0', fontWeight: '500' }],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "flash-green": {
          "0%": { color: "#4ADE80" },
          "100%": { color: "inherit" },
        },
        "flash-red": {
          "0%": { color: "#FB7185" },
          "100%": { color: "inherit" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.15s ease-out",
        "fade-up": "fade-up 0.2s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
        "flash-green": "flash-green 0.5s ease-out",
        "flash-red": "flash-red 0.5s ease-out",
      },
      transitionDuration: {
        "150": "150ms",
        "200": "200ms",
      },
    },
  },
  plugins: [],
}
