import { useState, useEffect } from "react";

const API_BASE = "/api";

// API helpers
const api = {
	async get(path) {
		const res = await fetch(`${API_BASE}${path}`);
		return res.json();
	},
	async post(path, data) {
		const res = await fetch(`${API_BASE}${path}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});
		return res.json();
	},
	async patch(path, data) {
		const res = await fetch(`${API_BASE}${path}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});
		return res.json();
	},
	async delete(path) {
		await fetch(`${API_BASE}${path}`, { method: "DELETE" });
	},
};

// Get initials from name
function getInitials(name) {
	if (!name) return "?";
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

// Format date
function formatDate(dateStr) {
	const date = new Date(dateStr);
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Column configuration
const COLUMNS = [
	{ id: "todo", title: "To Do", status: "todo" },
	{ id: "in_progress", title: "In Progress", status: "in_progress" },
	{ id: "done", title: "Done", status: "done" },
];

function App() {
	const [issues, setIssues] = useState([]);
	const [users, setUsers] = useState([]);
	const [stats, setStats] = useState({ todo: 0, in_progress: 0, done: 0 });
	const [loading, setLoading] = useState(true);
	const [selectedIssue, setSelectedIssue] = useState(null);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [createStatus, setCreateStatus] = useState("todo");
	const [currentUserId, setCurrentUserId] = useState(() => {
		const saved = localStorage.getItem("minijira_user");
		return saved ? parseInt(saved) : null;
	});

	// Persist user selection
	useEffect(() => {
		if (currentUserId) {
			localStorage.setItem("minijira_user", currentUserId.toString());
		}
	}, [currentUserId]);

	// Load data
	useEffect(() => {
		loadData();
	}, []);

	async function loadData() {
		setLoading(true);
		const [issuesData, usersData, statsData] = await Promise.all([
			api.get("/issues"),
			api.get("/users"),
			api.get("/stats"),
		]);
		setIssues(issuesData);
		setUsers(usersData);
		setStats(statsData);
		setLoading(false);
	}

	// Group issues by status
	const issuesByStatus = COLUMNS.reduce((acc, col) => {
		acc[col.status] = issues.filter((i) => i.status === col.status);
		return acc;
	}, {});

	// Handle status change (drag simulation via click)
	async function handleStatusChange(issueId, newStatus) {
		const updated = await api.patch(`/issues/${issueId}`, {
			status: newStatus,
		});
		setIssues((prev) => prev.map((i) => (i.id === issueId ? updated : i)));
		setStats(await api.get("/stats"));
		if (selectedIssue?.id === issueId) {
			setSelectedIssue(updated);
		}
	}

	// Create issue
	async function handleCreateIssue(data) {
		const newIssue = await api.post("/issues", {
			...data,
			status: createStatus,
		});
		setIssues((prev) => [newIssue, ...prev]);
		setStats(await api.get("/stats"));
		setShowCreateModal(false);
	}

	// Update issue
	async function handleUpdateIssue(issueId, data) {
		const updated = await api.patch(`/issues/${issueId}`, data);
		setIssues((prev) => prev.map((i) => (i.id === issueId ? updated : i)));
		setSelectedIssue(updated);
	}

	// Delete issue
	async function handleDeleteIssue(issueId) {
		await api.delete(`/issues/${issueId}`);
		setIssues((prev) => prev.filter((i) => i.id !== issueId));
		setStats(await api.get("/stats"));
		setSelectedIssue(null);
	}

	const currentUser = users.find((u) => u.id === currentUserId);

	if (loading) {
		return (
			<div className="app">
				<div className="loading">Loading...</div>
			</div>
		);
	}

	return (
		<div className="app">
			{/* User Selection Prompt Overlay */}
			{!currentUserId && (
				<div className="user-prompt-overlay">
					<div className="user-prompt-message">
						↑ Please select yourself to get started
					</div>
				</div>
			)}

			{/* Header */}
			<header className="header">
				<div className="logo">
					<div className="logo-icon">MJ</div>
					<span>MiniJira</span>
				</div>
				<div className="header-right">
					<div className="header-stats">
						<div className="stat">
							<span className="stat-dot todo" />
							<span className="stat-value">{stats.todo}</span>
							<span>to do</span>
						</div>
						<div className="stat">
							<span className="stat-dot progress" />
							<span className="stat-value">
								{stats.in_progress}
							</span>
							<span>in progress</span>
						</div>
						<div className="stat">
							<span className="stat-dot done" />
							<span className="stat-value">{stats.done}</span>
							<span>done</span>
						</div>
					</div>
					<div className={`user-selector ${!currentUserId ? "unselected" : ""}`}>
						{currentUser && (
							<div
								className="current-user-avatar"
								style={{ background: currentUser.avatar_color }}
							>
								{getInitials(currentUser.name)}
							</div>
						)}
						<select
							className="user-select"
							value={currentUserId || ""}
							onChange={(e) =>
								setCurrentUserId(
									e.target.value
										? parseInt(e.target.value)
										: null
								)
							}
						>
							<option value="">Select yourself...</option>
							{users.map((user) => (
								<option key={user.id} value={user.id}>
									{user.name}
								</option>
							))}
						</select>
					</div>
				</div>
			</header>

			{/* Board */}
			<main className="main">
				<div className="board">
					{COLUMNS.map((column) => (
						<Column
							key={column.id}
							column={column}
							issues={issuesByStatus[column.status]}
							onIssueClick={setSelectedIssue}
							onAddClick={() => {
								setCreateStatus(column.status);
								setShowCreateModal(true);
							}}
							onDrop={handleStatusChange}
						/>
					))}
				</div>
			</main>

			{/* Footer */}
			<footer className="footer">
				<div className="footer-content">
					<div className="footer-section">
						<span className="footer-label">Built by</span>
						<a
							href="https://github.com/ansidian"
							target="_blank"
							rel="noopener noreferrer"
							className="footer-link"
						>
							<svg
								className="footer-icon"
								viewBox="0 0 16 16"
								fill="currentColor"
							>
								<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
							</svg>
							Andy Su
						</a>
					</div>
					<div className="footer-divider">•</div>
					<div className="footer-section">
						<span className="footer-label">Made with</span>
						<a
							href="https://react.dev"
							target="_blank"
							rel="noopener noreferrer"
							className="footer-link"
						>
							<svg
								className="footer-icon"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<circle cx="12" cy="12" r="2" />
								<path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4.5C13.25,4.5 14.31,4.94 15.11,5.75C15.81,6.55 16.5,7.63 16.5,9C16.5,10.38 15.81,11.45 15.11,12.25C14.31,13.06 13.25,13.5 12,13.5C10.75,13.5 9.69,13.06 8.89,12.25C8.19,11.45 7.5,10.38 7.5,9C7.5,7.63 8.19,6.55 8.89,5.75C9.69,4.94 10.75,4.5 12,4.5M12,19.5C10.75,19.5 9.69,19.06 8.89,18.25C8.19,17.45 7.5,16.38 7.5,15C7.5,13.63 8.19,12.55 8.89,11.75C9.69,10.94 10.75,10.5 12,10.5C13.25,10.5 14.31,10.94 15.11,11.75C15.81,12.55 16.5,13.63 16.5,15C16.5,16.38 15.81,17.45 15.11,18.25C14.31,19.06 13.25,19.5 12,19.5Z" />
							</svg>
							React
						</a>
						<span className="footer-text">+</span>
						<a
							href="https://vitejs.dev"
							target="_blank"
							rel="noopener noreferrer"
							className="footer-link"
						>
							<svg
								className="footer-icon"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<path d="M12,2L2,7V17L12,22L22,17V7M12,4.18L19.82,8L12,11.82L4.18,8M4,9.42L11,13V20.58L4,17M20,9.42V17L13,20.58V13" />
							</svg>
							Vite
						</a>
					</div>
					<div className="footer-divider">•</div>
					<div className="footer-section">
						<span className="footer-label">Hosted on</span>
						<a
							href="https://render.com"
							target="_blank"
							rel="noopener noreferrer"
							className="footer-link"
						>
							Render
						</a>
					</div>
					<div className="footer-divider">•</div>
					<div className="footer-section">
						<span className="footer-label">DB on</span>
						<a
							href="https://turso.tech"
							target="_blank"
							rel="noopener noreferrer"
							className="footer-link"
						>
							Turso
						</a>
					</div>
					<div className="footer-divider">•</div>
					<div className="footer-section">
						<span className="footer-version">v1.0.0</span>
					</div>
				</div>
			</footer>

			{/* Create Modal */}
			{showCreateModal && (
				<CreateIssueModal
					users={users}
					currentUserId={currentUserId}
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
					onClose={() => setSelectedIssue(null)}
					onUpdate={handleUpdateIssue}
					onDelete={handleDeleteIssue}
					onStatusChange={handleStatusChange}
				/>
			)}
		</div>
	);
}

// Column component
function Column({ column, issues, onIssueClick, onAddClick, onDrop }) {
	const [dragOver, setDragOver] = useState(false);

	function handleDragOver(e) {
		e.preventDefault();
		setDragOver(true);
	}

	function handleDragLeave() {
		setDragOver(false);
	}

	function handleDrop(e) {
		e.preventDefault();
		setDragOver(false);
		const issueId = e.dataTransfer.getData("issueId");
		if (issueId) {
			onDrop(parseInt(issueId), column.status);
		}
	}

	return (
		<div
			className={`column ${dragOver ? "drag-over" : ""}`}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			<div className="column-header">
				<div className="column-title">
					<div className={`column-indicator ${column.status}`} />
					{column.title}
				</div>
				<span className="column-count">{issues.length}</span>
			</div>
			<div className="column-content">
				{issues.length === 0 ? (
					<div className="empty-column">Drop issues here</div>
				) : (
					issues.map((issue) => (
						<IssueCard
							key={issue.id}
							issue={issue}
							onClick={() => onIssueClick(issue)}
						/>
					))
				)}
			</div>
			<button className="add-issue-btn" onClick={onAddClick}>
				+ Add issue
			</button>
		</div>
	);
}

// Issue Card component
function IssueCard({ issue, onClick }) {
	const [dragging, setDragging] = useState(false);

	function handleDragStart(e) {
		setDragging(true);
		e.dataTransfer.setData("issueId", issue.id.toString());
		e.dataTransfer.effectAllowed = "move";
	}

	function handleDragEnd() {
		setDragging(false);
	}

	return (
		<div
			className={`issue-card ${dragging ? "dragging" : ""}`}
			onClick={onClick}
			draggable
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
			<div className="issue-key">{issue.key}</div>
			<div className="issue-title">{issue.title}</div>
			<div className="issue-meta">
				<span className={`issue-priority ${issue.priority}`}>
					{issue.priority}
				</span>
				{issue.assignee_name ? (
					<div
						className="issue-assignee"
						style={{ background: issue.assignee_color }}
						title={issue.assignee_name}
					>
						{getInitials(issue.assignee_name)}
					</div>
				) : (
					<div className="issue-unassigned" title="Unassigned" />
				)}
			</div>
		</div>
	);
}

// Create Issue Modal
function CreateIssueModal({ users, currentUserId, onClose, onCreate }) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [priority, setPriority] = useState("medium");
	const [assigneeId, setAssigneeId] = useState("");
	const [shake, setShake] = useState(false);

	const isDirty = title.trim() || description.trim();

	function handleSubmit(e) {
		e.preventDefault();
		if (!title.trim()) return;
		onCreate({
			title: title.trim(),
			description: description.trim(),
			priority,
			assignee_id: assigneeId || null,
			reporter_id: currentUserId || null,
		});
	}

	function handleOverlayClick() {
		if (isDirty) {
			setShake(true);
			setTimeout(() => setShake(false), 500);
		} else {
			onClose();
		}
	}

	function handleCancel() {
		if (isDirty && !confirm("Discard your changes?")) {
			return;
		}
		onClose();
	}

	return (
		<div className="modal-overlay" onClick={handleOverlayClick}>
			<div className={`modal ${shake ? "shake" : ""}`} onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<h2 className="modal-title">Create Issue</h2>
					<button className="modal-close" onClick={onClose}>
						×
					</button>
				</div>
				<form className="modal-body" onSubmit={handleSubmit}>
					<div className="form-group">
						<label className="form-label">Title</label>
						<input
							type="text"
							className="form-input"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="What needs to be done?"
							autoFocus
						/>
					</div>
					<div className="form-group">
						<label className="form-label">Description</label>
						<textarea
							className="form-textarea"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Add more details..."
						/>
					</div>
					<div className="form-row">
						<div className="form-group">
							<label className="form-label">Priority</label>
							<select
								className="form-select"
								value={priority}
								onChange={(e) => setPriority(e.target.value)}
							>
								<option value="low">Low</option>
								<option value="medium">Medium</option>
								<option value="high">High</option>
							</select>
						</div>
						<div className="form-group">
							<label className="form-label">Assignee</label>
							<select
								className="form-select"
								value={assigneeId}
								onChange={(e) => setAssigneeId(e.target.value)}
							>
								<option value="">Unassigned</option>
								{users.map((user) => (
									<option key={user.id} value={user.id}>
										{user.name}
									</option>
								))}
							</select>
						</div>
					</div>
					<div className="modal-actions">
						<button
							type="button"
							className="btn btn-secondary"
							onClick={handleCancel}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="btn btn-primary"
							disabled={!title.trim()}
						>
							Create Issue
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// Issue Detail Modal
function IssueDetailModal({
	issue,
	users,
	currentUserId,
	onClose,
	onUpdate,
	onDelete,
	onStatusChange,
}) {
	const [editing, setEditing] = useState(false);
	const [title, setTitle] = useState(issue.title);
	const [description, setDescription] = useState(issue.description || "");
	const [comments, setComments] = useState([]);
	const [newComment, setNewComment] = useState("");
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const [confirmingCancel, setConfirmingCancel] = useState(false);
	const [shake, setShake] = useState(false);

	const isEditDirty =
		editing && (title !== issue.title || description !== (issue.description || ""));

	useEffect(() => {
		loadComments();
	}, [issue.id]);

	async function loadComments() {
		const data = await api.get(`/issues/${issue.id}/comments`);
		setComments(data);
	}

	async function handleSave() {
		await onUpdate(issue.id, { title, description });
		setEditing(false);
	}

	async function handleAddComment() {
		if (!newComment.trim()) return;
		await api.post(`/issues/${issue.id}/comments`, {
			body: newComment.trim(),
			user_id: currentUserId || null,
		});
		setNewComment("");
		loadComments();
	}

	function handleOverlayClick() {
		if (isEditDirty) {
			setShake(true);
			setTimeout(() => setShake(false), 500);
		} else {
			onClose();
		}
	}

	function handleCancelEdit() {
		setTitle(issue.title);
		setDescription(issue.description || "");
		setEditing(false);
		setConfirmingCancel(false);
	}

	return (
		<div className="modal-overlay" onClick={handleOverlayClick}>
			<div className={`modal ${shake ? "shake" : ""}`} onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<span className="issue-detail-key">{issue.key}</span>
					<button className="modal-close" onClick={onClose}>
						×
					</button>
				</div>
				<div className="modal-body">
					{editing ? (
						<>
							<div className="form-group">
								<input
									type="text"
									className="form-input"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
								/>
							</div>
							<div className="form-group">
								<textarea
									className="form-textarea"
									value={description}
									onChange={(e) =>
										setDescription(e.target.value)
									}
									placeholder="Add a description..."
								/>
							</div>
							<div className="modal-actions edit-actions">
								{!isEditDirty || !confirmingCancel ? (
									<>
										<button
											className="btn btn-secondary"
											onClick={() => {
												if (isEditDirty) {
													setConfirmingCancel(true);
												} else {
													handleCancelEdit();
												}
											}}
										>
											Cancel
										</button>
										<button
											className="btn btn-primary"
											onClick={handleSave}
										>
											Save
										</button>
									</>
								) : (
									<div className="cancel-confirm">
										<span className="cancel-confirm-text">
											Discard changes?
										</span>
										<button
											className="btn btn-warning"
											onClick={handleCancelEdit}
										>
											Yes, Discard
										</button>
										<button
											className="btn btn-primary"
											onClick={() => setConfirmingCancel(false)}
										>
											Keep Editing
										</button>
									</div>
								)}
							</div>
						</>
					) : (
						<>
							<h1
								className="issue-detail-title"
								onClick={() => setEditing(true)}
								style={{ cursor: "pointer" }}
							>
								{issue.title}
							</h1>
							<div
								className={`issue-detail-description ${
									!issue.description ? "empty" : ""
								}`}
								onClick={() => setEditing(true)}
								style={{ cursor: "pointer" }}
							>
								{issue.description ||
									"Click to add a description..."}
							</div>
						</>
					)}

					<div className="issue-detail-meta">
						<div className="meta-item">
							<div className="meta-label">Status</div>
							<select
								className="form-select"
								value={issue.status}
								onChange={(e) =>
									onStatusChange(issue.id, e.target.value)
								}
								style={{ marginTop: 4 }}
							>
								<option value="todo">To Do</option>
								<option value="in_progress">In Progress</option>
								<option value="done">Done</option>
							</select>
						</div>
						<div className="meta-item">
							<div className="meta-label">Priority</div>
							<select
								className="form-select"
								value={issue.priority}
								onChange={(e) =>
									onUpdate(issue.id, {
										priority: e.target.value,
									})
								}
								style={{ marginTop: 4 }}
							>
								<option value="low">Low</option>
								<option value="medium">Medium</option>
								<option value="high">High</option>
							</select>
						</div>
						<div className="meta-item">
							<div className="meta-label">Assignee</div>
							<select
								className="form-select"
								value={issue.assignee_id || ""}
								onChange={(e) =>
									onUpdate(issue.id, {
										assignee_id: e.target.value || null,
									})
								}
								style={{ marginTop: 4 }}
							>
								<option value="">Unassigned</option>
								{users.map((user) => (
									<option key={user.id} value={user.id}>
										{user.name}
									</option>
								))}
							</select>
						</div>
						<div className="meta-item">
							<div className="meta-label">Created</div>
							<div className="meta-value">
								{formatDate(issue.created_at)}
							</div>
						</div>
					</div>

					{/* Comments */}
					<div className="comments-section">
						<h3 className="comments-title">
							Comments ({comments.length})
						</h3>
						{comments.map((comment) => (
							<div key={comment.id} className="comment">
								<div className="comment-header">
									<div
										className="comment-avatar"
										style={{
											background:
												comment.user_color || "#6b7280",
										}}
									>
										{getInitials(comment.user_name)}
									</div>
									<span className="comment-author">
										{comment.user_name || "Anonymous"}
									</span>
									<span className="comment-time">
										{formatDate(comment.created_at)}
									</span>
								</div>
								<div className="comment-body">
									{comment.body}
								</div>
							</div>
						))}
						<div className="comment-form">
							<input
								type="text"
								className="form-input"
								placeholder="Add a comment..."
								value={newComment}
								onChange={(e) => setNewComment(e.target.value)}
								onKeyDown={(e) =>
									e.key === "Enter" && handleAddComment()
								}
							/>
							<button
								className="btn btn-primary"
								onClick={handleAddComment}
								disabled={!newComment.trim()}
							>
								Send
							</button>
						</div>
					</div>

					<div className="modal-actions">
						{!confirmingDelete ? (
							<button
								className="btn btn-danger"
								onClick={() => setConfirmingDelete(true)}
							>
								Delete Issue
							</button>
						) : (
							<div className="delete-confirm">
								<span className="delete-confirm-text">
									Are you sure?
								</span>
								<button
									className="btn btn-danger-confirm"
									onClick={() => onDelete(issue.id)}
								>
									Yes, Delete
								</button>
								<button
									className="btn btn-secondary"
									onClick={() => setConfirmingDelete(false)}
								>
									Cancel
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default App;
