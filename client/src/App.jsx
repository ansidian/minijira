import { AppShell } from "./AppShell";
import { UIProvider, UsersProvider } from "./contexts";

export default function App() {
  return (
    <UsersProvider>
      <UIProvider>
        <AppShell />
      </UIProvider>
    </UsersProvider>
  );
}
