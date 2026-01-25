import React from "react";
import ReactDOM from "react-dom/client";
import {
  MantineProvider,
  createTheme,
  useMantineColorScheme,
} from "@mantine/core";
import { Toaster } from "sonner";
import { ErrorBoundary } from "react-error-boundary";
import "@mantine/core/styles.css";
import App from "./App.jsx";
import { RootErrorFallback } from "./components/errors/ErrorFallback.jsx";
import "./styles/index.css";
import "./styles/sonner.css";
import "./styles/components.css";
import "./styles/animations.css";
import "./styles/responsive.css";

const theme = createTheme({
  colors: {
    // Warm dark mode colors
    dark: [
      "#faf9f7", // 0 - text-primary (dark mode)
      "#a8a5a0", // 1 - text-secondary
      "#78746e", // 2 - text-muted
      "#3d3935", // 3 - border-secondary
      "#2e2b28", // 4 - border-primary
      "#2a2725", // 5 - bg-hover
      "#211f1d", // 6 - bg-card
      "#1c1a19", // 7 - bg-tertiary
      "#141312", // 8 - bg-secondary
      "#0c0b0a", // 9 - bg-primary
    ],
  },
  primaryColor: "orange",
  components: {
    Checkbox: {
      defaultProps: { color: "orange" },
    },
  },
});

// Get initial color scheme from localStorage, default to dark
const getInitialColorScheme = () => {
  const stored = localStorage.getItem("mantine-color-scheme");
  return stored || "dark";
};

function ThemedToaster() {
  const { colorScheme } = useMantineColorScheme();
  return (
    <Toaster
      position="bottom-right"
      theme={colorScheme}
      richColors
      visibleToasts={5}
    />
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme={getInitialColorScheme()}>
      <ErrorBoundary FallbackComponent={RootErrorFallback}>
        <App />
      </ErrorBoundary>
      <ThemedToaster />
    </MantineProvider>
  </React.StrictMode>,
);
