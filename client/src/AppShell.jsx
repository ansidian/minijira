// Note: useEffect removed - initial data load handled by IssuesContext
import { useMantineColorScheme } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { ContextMenuProvider } from "mantine-contextmenu";
import "mantine-contextmenu/styles.css";
import { BoardContainer } from "./components/board/BoardContainer";
import { Footer } from "./components/layout/Footer";
import { Header } from "./components/layout/Header";
import { ActivityLogModal } from "./components/modals/ActivityLogModal";
import { CreateIssueModal } from "./components/modals/CreateIssueModal";
import { IssueDetailModal } from "./components/modals/IssueDetailModal";
import { SpotlightSearch } from "./components/spotlight/SpotlightSearch";
import { ActivityProvider } from "./contexts/ActivityContext";
import { BoardProvider } from "./contexts/BoardContext";
import { IssuesProvider } from "./contexts/IssuesContext";
import { useActivity } from "./contexts/hooks/useActivity";
import { useBoard } from "./contexts/hooks/useBoard";
import { useIssues } from "./contexts/hooks/useIssues";
import { useUI } from "./contexts/UIContext";
import { useUsers } from "./contexts/UsersContext";
import { useStatsAnimation } from "./hooks/useStatsAnimation";
import { useSubtaskToggle } from "./hooks/useSubtaskToggle";
import { api } from "./utils/api";
import { isTouchDevice as getIsTouchDevice } from "./utils/platform";

export function AppShell() {
  return (
    <IssuesProviderWrapper>
      <ActivityProvider>
        <BoardProvider>
          <AppContent />
        </BoardProvider>
      </ActivityProvider>
    </IssuesProviderWrapper>
  );
}

function IssuesProviderWrapper({ children }) {
  const { currentUserId } = useUsers();
  const { selectedIssue, setSelectedIssue } = useUI();

  return (
    <IssuesProvider
      currentUserId={currentUserId}
      selectedIssue={selectedIssue}
      setSelectedIssue={setSelectedIssue}
    >
      {children}
    </IssuesProvider>
  );
}

function AppContent() {
  const {
    allIssues,
    stats,
    createIssue,
    deleteIssue,
    updateIssue,
    handleStatusChangeSilent,
    handleSubtaskChange,
  } = useIssues();
  const {
    selectedIssue,
    setSelectedIssue,
    showCreateModal,
    setShowCreateModal,
    createStatus,
    autoShowSubtaskForm,
    setAutoShowSubtaskForm,
    statsBadgeAnimate,
    setStatsBadgeAnimate,
  } = useUI();
  const { showActivityLog, setShowActivityLog, hasNewActivity } = useActivity();
  const { users, currentUserId, setCurrentUserId } = useUsers();
  const { allExpanded, toggleAllSubtasks } = useSubtaskToggle();
  const {
    filterPanelExpanded,
    setFilterPanelExpanded,
    activeFilters,
    activeFilterCount,
    handleFiltersChange,
  } = useBoard();
  const isUserLocked = !currentUserId;

  // Theme toggle
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  // Hotkeys for header controls
  useHotkeys(
    [
      [
        "mod+J",
        () => {
          if (isUserLocked) return;
          setColorScheme(colorScheme === "dark" ? "light" : "dark");
        },
      ],
      [
        "mod+I",
        () => {
          if (isUserLocked) return;
          setShowActivityLog((prev) => !prev);
        },
      ],
      [
        "mod+X",
        () => {
          if (isUserLocked) return;
          setFilterPanelExpanded((prev) => !prev);
        },
      ],
    ],
    [colorScheme, isUserLocked, setColorScheme, setShowActivityLog, setFilterPanelExpanded],
    true
  );

  // Detect if this is a touch device
  const isTouchDevice = getIsTouchDevice();

  useStatsAnimation({
    stats,
    setStatsBadgeAnimate,
  });

  // Note: Initial data load is handled by IssuesContext on mount

  // Handle viewing a different issue (for subtask navigation)
  async function handleViewIssue(issueId) {
    const issue = await api.get(`/issues/${issueId}`);
    setSelectedIssue(issue);
  }

  async function handleCreateIssue(data) {
    await createIssue(data);
    setShowCreateModal(false);
  }

  async function handleUpdateIssue(issueId, data) {
    await updateIssue(issueId, data);
  }


  async function handleDeleteIssue(issueId) {
    await deleteIssue(issueId);
  }

  const currentUser = users.find((u) => u.id === currentUserId);

  return (
    <ContextMenuProvider submenuDelay={150}>
      <SpotlightSearch
        allIssues={allIssues}
        setSelectedIssue={setSelectedIssue}
      />

      <div className="app">
        {/* User Prompt Overlay */}
        {!currentUserId && (
          <div className="user-prompt-overlay">
            <div className="user-prompt-message">
              ↑ Please select yourself to get started
            </div>
          </div>
        )}

        {/* Header */}
        <Header
          stats={stats}
          statsBadgeAnimate={statsBadgeAnimate}
          allExpanded={allExpanded}
          toggleAllSubtasks={toggleAllSubtasks}
          hasNewActivity={hasNewActivity}
          setShowActivityLog={setShowActivityLog}
          isUserLocked={isUserLocked}
          colorScheme={colorScheme}
          setColorScheme={setColorScheme}
          users={users}
          currentUser={currentUser}
          currentUserId={currentUserId}
          setCurrentUserId={setCurrentUserId}
          filterPanelExpanded={filterPanelExpanded}
          setFilterPanelExpanded={setFilterPanelExpanded}
          activeFilterCount={activeFilterCount}
          activeFilters={activeFilters}
          onFiltersChange={handleFiltersChange}
        />

        {/* Board */}
        <main className="main">
          <BoardContainer isTouchDevice={isTouchDevice} />
        </main>

        {/* Footer */}
        <Footer />

        {/* Create Issue Modal */}
        {showCreateModal && (
          <CreateIssueModal
            users={users}
            currentUserId={currentUserId}
            createStatus={createStatus}
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateIssue}
          />
        )}

        {/* Issue Detail Modal */}
        {selectedIssue && (
          <IssueDetailModal
            issue={selectedIssue}
            users={users}
            currentUserId={currentUserId}
            onClose={() => {
              setSelectedIssue(null);
              setAutoShowSubtaskForm(false);
            }}
            onUpdate={handleUpdateIssue}
            onMetaUpdate={handleUpdateIssue}
            onDelete={handleDeleteIssue}
            onStatusChange={handleStatusChangeSilent}
            onViewIssue={handleViewIssue}
            onSubtaskChange={handleSubtaskChange}
            autoShowSubtaskForm={autoShowSubtaskForm}
            onSubtaskFormShown={() => setAutoShowSubtaskForm(false)}
            isTouchDevice={isTouchDevice}
          />
        )}

        {/* Activity Log Modal */}
        <ActivityLogModal
          opened={showActivityLog}
          onClose={() => setShowActivityLog(false)}
          onViewIssue={handleViewIssue}
        />
      </div>
    </ContextMenuProvider>
  );
}
