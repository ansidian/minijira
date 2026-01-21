import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import "@mantine/core/styles.css";
import App from "./App.jsx";
import "./styles/index.css";
import "./styles/components.css";
import "./styles/animations.css";
import "./styles/responsive.css";

const theme = createTheme({
  colors: {
    // Dark mode colors (used when --mantine-color-dark-X is referenced)
    dark: [
      "#fafafa", // 0 - text-primary (dark mode)
      "#a1a1aa", // 1 - text-secondary
      "#71717a", // 2 - text-muted
      "#3a3a3f", // 3 - border-secondary
      "#2a2a2e", // 4 - border-primary
      "#232326", // 5 - bg-hover
      "#1c1c1f", // 6 - bg-card
      "#18181b", // 7 - bg-tertiary
      "#111113", // 8 - bg-secondary
      "#0a0a0b", // 9 - bg-primary
    ],
  },
  // Use 'dark' as the default color for backgrounds/components
  // This way --mantine-color-dark-6 will automatically switch between dark[6] and light theme equivalent
  primaryColor: "blue",
});

// Get initial color scheme from localStorage, default to dark
const getInitialColorScheme = () => {
  const stored = localStorage.getItem("mantine-color-scheme");
  return stored || "dark";
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme={getInitialColorScheme()}>
      <App />
    </MantineProvider>
  </React.StrictMode>
);
