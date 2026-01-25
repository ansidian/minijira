/**
 * Lightweight component for rendering titles with link support.
 * Supports:
 * - Markdown links: [text](url)
 * - Auto-linkified bare URLs: https://example.com
 */
export function TitleWithLinks({ children }) {
  if (!children || typeof children !== "string") {
    return children || null;
  }

  // Combined regex: markdown links OR bare URLs
  // Markdown: [text](url)
  // URLs: http(s)://... (not preceded by ]( to avoid double-matching markdown links)
  const combinedRegex =
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>\[\]]+)/g;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = combinedRegex.exec(children)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(children.slice(lastIndex, match.index));
    }

    if (match[1] && match[2]) {
      // Markdown link: [text](url)
      parts.push(
        <a
          key={match.index}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="title-link"
          onClick={(e) => e.stopPropagation()}
        >
          {match[1]}
        </a>
      );
    } else if (match[3]) {
      // Bare URL
      parts.push(
        <a
          key={match.index}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="title-link"
          onClick={(e) => e.stopPropagation()}
        >
          {match[3]}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last match
  if (lastIndex < children.length) {
    parts.push(children.slice(lastIndex));
  }

  // If no links found, return original string
  if (parts.length === 0) {
    return children;
  }

  return <>{parts}</>;
}
