import { useEffect } from "react";
import { useAppStore } from "./store/useAppStore";
import { useTauriEvents } from "./hooks/useTauriEvents";
import { TitleBar } from "./components/TitleBar";
import { Sidebar } from "./components/Sidebar";
import { LibraryView } from "./components/LibraryView";
import { DetailPanel } from "./components/DetailPanel";
import { SettingsView } from "./components/SettingsView";
import { Toast } from "./components/Toast";

function App() {
  const activeView = useAppStore((s) => s.activeView);
  const initLibrary = useAppStore((s) => s.initLibrary);

  useTauriEvents();

  useEffect(() => {
    initLibrary();
  }, [initLibrary]);

  return (
    <div className="flex flex-col h-screen w-screen bg-base text-white overflow-hidden">
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-hidden relative">
          {activeView === "settings" ? (
            <SettingsView />
          ) : (
            <LibraryView />
          )}
        </main>

        <DetailPanel />
      </div>

      <Toast />
    </div>
  );
}

export default App;
