import { Avatar, Button, Group, Stack, Textarea } from "@mantine/core";
import { formatDate, linkifyText } from "../../../utils/formatters.jsx";

export function IssueComments({
  comments,
  newComment,
  setNewComment,
  onAddComment,
}) {
  return (
    <>
      <h3
        style={{
          fontSize: "var(--text-base)",
          fontWeight: 600,
          marginTop: "1.5rem",
          marginBottom: "0.75rem",
        }}
      >
        Comments ({comments.length})
      </h3>

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
                    onClick={(e) => e.stopPropagation()}
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

      <Group gap="sm" mt="md" align="flex-start">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              onAddComment();
            }
          }}
          autosize
          minRows={1}
          style={{ flex: 1 }}
        />
        <Button onClick={onAddComment} disabled={!newComment.trim()}>
          Send
        </Button>
      </Group>
    </>
  );
}
