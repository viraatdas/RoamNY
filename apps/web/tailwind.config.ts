import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        roam: {
          blue: "#1a73e8",
          orange: "#f59e0b",
          dark: "#1a1a2e",
        },
      },
    },
  },
  plugins: [],
};

export default config;
