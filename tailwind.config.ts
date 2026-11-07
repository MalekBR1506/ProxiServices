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
        sand: "#F4EFE6",
        paper: "#FBF8F2",
        ink: "#1C1917",
        teal: "#0F5257",
        tomato: "#E4572E",
        mustard: "#F2B134",
        success: "#2F7D4F",
        line: "#D8CEC0",
      },
    },
  },
  plugins: [],
};
export default config;
