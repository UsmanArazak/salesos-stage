import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          dim: "var(--accent-dim)",
        },
        ink: {
          DEFAULT: "var(--text-primary)",
          muted: "var(--text-muted)",
          dim: "var(--text-dim)",
        },
        success: { DEFAULT: "var(--success)", dim: "var(--success-dim)" },
        warning: { DEFAULT: "var(--warning)", dim: "var(--warning-dim)" },
        danger: { DEFAULT: "var(--danger)", dim: "var(--danger-dim)" },
        info: { DEFAULT: "var(--info)", dim: "var(--info-dim)" },
      },
      // Design system radius scale (SalesOS Design System, Section 5) —
      // overriding Tailwind's own defaults so every existing rounded-lg /
      // rounded-xl / rounded-2xl usage across the app automatically renders
      // at the correct doc-specified pixel value with zero file changes.
      borderRadius: {
        lg: "12px",   // badges, chips, small buttons
        xl: "16px",   // inputs, medium buttons, list rows
        "2xl": "24px", // cards, modals — primary container radius
        "3xl": "24px", // clamp to match 2xl — doc defines no larger container radius
      },
      // One soft, diffuse shadow used everywhere (Section 5) — overriding
      // every Tailwind shadow key to the same value so shadow-sm / shadow /
      // shadow-md / shadow-lg / shadow-xl all render identically across the
      // app instead of five different ad-hoc elevations.
      boxShadow: {
        sm: "0 10px 30px -10px rgba(55,52,53,0.08)",
        DEFAULT: "0 10px 30px -10px rgba(55,52,53,0.08)",
        md: "0 10px 30px -10px rgba(55,52,53,0.08)",
        lg: "0 10px 30px -10px rgba(55,52,53,0.08)",
        xl: "0 14px 34px -8px rgba(55,52,53,0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
