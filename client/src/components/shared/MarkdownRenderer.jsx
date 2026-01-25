import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Modal } from "@mantine/core";

export function MarkdownRenderer({ content, className }) {
  const [lightboxSrc, setLightboxSrc] = useState(null);

  if (!content) return null;

  return (
    <>
      <ReactMarkdown
        className={className}
        remarkPlugins={[remarkGfm]}
        components={{
          // Images: thumbnail with click-to-expand
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt || ""}
              className="markdown-image"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setLightboxSrc(src);
              }}
            />
          ),
          // Links: open in new tab
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="markdown-link"
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </a>
          ),
          // Code blocks: simple styling
          code: ({ inline, children }) =>
            inline ? (
              <code className="markdown-code-inline">{children}</code>
            ) : (
              <code className="markdown-code-block">{children}</code>
            ),
          pre: ({ children }) => (
            <pre className="markdown-pre">{children}</pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>

      {/* Image lightbox */}
      <Modal
        opened={!!lightboxSrc}
        onClose={() => setLightboxSrc(null)}
        size="auto"
        padding={0}
        withCloseButton={false}
        centered
        overlayProps={{ backgroundOpacity: 0.7, blur: 3 }}
        styles={{
          content: {
            background: "transparent",
            boxShadow: "none",
          },
          body: {
            padding: 0,
          },
        }}
        onClick={(e) => {
          e.stopPropagation();
          setLightboxSrc(null);
        }}
      >
        <img
          src={lightboxSrc}
          alt=""
          style={{
            maxWidth: "90vw",
            maxHeight: "90vh",
            borderRadius: "8px",
          }}
        />
      </Modal>
    </>
  );
}
