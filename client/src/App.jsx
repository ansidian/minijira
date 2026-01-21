import { AppShell } from "./AppShell";
import { UIProvider } from "./contexts/UIContext";
import { UsersProvider } from "./contexts/UsersContext";

export default function App() {
  return (
    <UsersProvider>
      <UIProvider>
        <AppShell />
      </UIProvider>
    </UsersProvider>
  );
}
