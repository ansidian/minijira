import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import "@mantine/core/styles.css";
import App from "./App.jsx";
import "./index.css";

const theme = createTheme({
  colorScheme: "dark",
  colors: {
    dark: [
      "#fafafa", // text-primary
      "#a1a1aa", // text-secondary
      "#71717a", // text-muted
      "#3a3a3f", // border-secondary
      "#2a2a2e", // border-primary
      "#232326", // bg-hover
      "#1c1c1f", // bg-card
      "#18181b", // bg-tertiary
      "#111113", // bg-secondary
      "#0a0a0b", // bg-primary
    ],
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MantineProvider theme={theme} forceColorScheme="dark">
      <App />
    </MantineProvider>
  </React.StrictMode>
);
