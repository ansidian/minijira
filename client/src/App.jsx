import { AppShell } from "./AppShell";
import { UIProvider } from "./contexts/UIContext";
import { UsersProvider } from "./contexts/UsersContext";
import { useGlobalMarkdownHotkeys } from "./hooks/useGlobalMarkdownHotkeys";

export default function App() {
  // Enable markdown hotkeys (Cmd+B/I/K) globally for all text inputs
  useGlobalMarkdownHotkeys();

  return (
    <UsersProvider>
      <UIProvider>
        <AppShell />
      </UIProvider>
    </UsersProvider>
  );
}
