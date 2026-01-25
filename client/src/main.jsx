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
    // Cool charcoal dark mode colors
    dark: [
      "#fafafa", // 0 - text-primary (dark mode)
      "#a1a1aa", // 1 - text-secondary
      "#71717a", // 2 - text-muted
      "#36363e", // 3 - border-secondary
      "#26262c", // 4 - border-primary
      "#24242a", // 5 - bg-hover
      "#1c1c21", // 6 - bg-card
      "#16161a", // 7 - bg-tertiary
      "#0f0f12", // 8 - bg-secondary
      "#09090b", // 9 - bg-primary
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
