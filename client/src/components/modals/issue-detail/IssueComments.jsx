import { Avatar, Button, Stack, Textarea } from "@mantine/core";
import { formatDate, linkifyText } from "../../../utils/formatters.jsx";
import { useMobile } from "../../../hooks/useMobile";

export function IssueComments({
  comments,
  newComment,
  setNewComment,
  onAddComment,
}) {
  const isMobile = useMobile();
  return (
    <div className="comments-section">
      <div className="comments-header">
        <span className="comments-title">Comments</span>
        <span className="comments-count">{comments.length}</span>
      </div>

      {comments.length > 0 ? (
        <Stack gap="sm">
          {comments.map((comment) => (
            <div key={comment.id} className="comment">
              <div className="comment-header">
                <Avatar
                  color={comment.user_color || "gray"}
                  name={comment.user_name || "Anonymous"}
                  size="sm"
                />
                <span className="comment-author">
                  {comment.user_name || "Anonymous"}
                </span>
                <span className="comment-time">
                  {formatDate(comment.created_at)}
                </span>
              </div>
              <div className="comment-body">
                {linkifyText(comment.body).map((part, index) =>
                  part.type === "link" ? (
                    <a
                      key={index}
                      href={part.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="comment-link"
                    >
                      {part.content}
                    </a>
                  ) : (
                    <span key={index}>{part.content}</span>
                  )
                )}
              </div>
            </div>
          ))}
        </Stack>
      ) : (
        <div className="empty-state">No comments yet</div>
      )}

      <div className="comment-input-row">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              onAddComment();
            }
          }}
          inputMode="text"
          autosize
          minRows={1}
          style={{ flex: 1 }}
          styles={{
            input: {
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-primary)",
              fontSize: "var(--text-sm)",
              "&:focus": {
                borderColor: "var(--accent)",
              },
            },
          }}
        />
        <Button
          onClick={onAddComment}
          disabled={!newComment.trim()}
          size="sm"
          variant="filled"
        >
          Send
        </Button>
      </div>
    </div>
  );
}
