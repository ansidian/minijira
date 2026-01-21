import { useEffect } from "react";
import { useMantineColorScheme } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { Notifications, notifications } from "@mantine/notifications";
import "@mantine/notifications/styles.css";
import { ContextMenuProvider } from "mantine-contextmenu";
import "mantine-contextmenu/styles.css";
import { BoardContainer } from "./components/board/BoardContainer";
import { Footer } from "./components/layout/Footer";
import { Header } from "./components/layout/Header";
import { ActivityLogModal } from "./components/modals/ActivityLogModal";
import { CreateIssueModal } from "./components/modals/CreateIssueModal";
import { IssueDetailModal } from "./components/modals/IssueDetailModal";
import { SpotlightSearch } from "./components/spotlight/SpotlightSearch";
import { ActivityProvider, useActivity } from "./contexts/ActivityContext";
import { BoardProvider } from "./contexts/BoardContext";
import { IssuesProvider, useIssues } from "./contexts/IssuesContext";
import { useUI } from "./contexts/UIContext";
import { UsersProvider, useUsers } from "./contexts/UsersContext";
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
    loadData,
    createIssue,
    deleteIssue,
    updateIssue,
    handleStatusChange,
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
    previousStats,
    setPreviousStats,
  } = useUI();
  const { showActivityLog, setShowActivityLog, hasNewActivity } = useActivity();
  const { users, currentUserId, setCurrentUserId } = useUsers();
  const { allExpanded, toggleAllSubtasks } = useSubtaskToggle();

  // Theme toggle
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  // Hotkey for theme toggle (Cmd/Ctrl + J)
  useHotkeys(
    [
      [
        "mod+J",
        () => setColorScheme(colorScheme === "dark" ? "light" : "dark"),
      ],
      ["mod+I", () => setShowActivityLog((prev) => !prev)],
    ],
    [],
    true
  );

  // Detect if this is a touch device
  const isTouchDevice = getIsTouchDevice();

  useStatsAnimation({
    stats,
    previousStats,
    setPreviousStats,
    setStatsBadgeAnimate,
  });

  // Load data
  useEffect(() => {
    loadData();
  }, []);

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
    notifications.show({
      title: "Issue deleted",
      message: "The issue has been removed",
      color: "red",
    });
  }

  const currentUser = users.find((u) => u.id === currentUserId);

  return (
    <ContextMenuProvider submenuDelay={150}>
      <Notifications position="top-right" autoClose={2000} />
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
          colorScheme={colorScheme}
          setColorScheme={setColorScheme}
          users={users}
          currentUser={currentUser}
          currentUserId={currentUserId}
          setCurrentUserId={setCurrentUserId}
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
            onDelete={handleDeleteIssue}
            onStatusChange={handleStatusChange}
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
