import { useCallback, useState } from "react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif"];
const PLACEHOLDER = "![Uploading...]()";

/**
 * Hook to add markdown editing capabilities to a textarea.
 * Supports:
 * - Image paste upload (Ctrl/Cmd+V with image)
 * - Image drag-and-drop upload
 * - Formatting hotkeys: Cmd/Ctrl+B (bold), I (italic), K (link)
 *
 * @param {Object} params
 * @param {string} params.value - Current textarea value
 * @param {function} params.onChange - Callback to update value
 * @returns {Object} { textareaProps, isUploading }
 */
export function useMarkdownTextarea({ value, onChange }) {
  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = useCallback(
    async (file, textarea) => {
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error("Only PNG, JPEG, and GIF images are allowed");
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error("Image must be smaller than 10MB");
        return;
      }

      // Get cursor position and insert placeholder
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = value.slice(0, start);
      const after = value.slice(end);

      // Insert placeholder immediately
      const newValue = before + PLACEHOLDER + after;
      onChange(newValue);
      setIsUploading(true);

      // Position cursor after placeholder
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd =
          start + PLACEHOLDER.length;
      }, 0);

      try {
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch("/api/attachments", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Upload failed");
        }

        const { url } = await response.json();

        // Replace placeholder with actual markdown
        const currentValue = before + PLACEHOLDER + after;
        const finalValue = currentValue.replace(
          PLACEHOLDER,
          `![image](${url})`
        );
        onChange(finalValue);
      } catch (error) {
        // Remove placeholder on failure
        onChange(before + after);
        toast.error(error.message || "Failed to upload image");
      } finally {
        setIsUploading(false);
      }
    },
    [value, onChange]
  );

  const handlePaste = useCallback(
    (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            uploadImage(file, e.target);
          }
          return;
        }
      }
      // Let non-image pastes through normally
    },
    [uploadImage]
  );

  const handleDrop = useCallback(
    (e) => {
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      if (file.type.startsWith("image/")) {
        e.preventDefault();
        uploadImage(file, e.target);
      }
      // Let non-image drops through normally
    },
    [uploadImage]
  );

  const handleDragOver = useCallback((e) => {
    // Required to allow drop
    if (e.dataTransfer?.types?.includes("Files")) {
      e.preventDefault();
    }
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      // Only handle Cmd/Ctrl + key combinations
      if (!e.metaKey && !e.ctrlKey) return;

      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.slice(start, end);

      let newValue;
      let newCursorStart;
      let newCursorEnd;

      switch (e.key.toLowerCase()) {
        case "b": {
          // Bold: wrap with **
          e.preventDefault();
          e.stopPropagation();
          const before = value.slice(0, start);
          const after = value.slice(end);
          newValue = `${before}**${selectedText}**${after}`;
          newCursorStart = start + 2;
          newCursorEnd = end + 2;
          break;
        }

        case "i": {
          // Italic: wrap with *
          e.preventDefault();
          e.stopPropagation();
          const before = value.slice(0, start);
          const after = value.slice(end);
          newValue = `${before}*${selectedText}*${after}`;
          newCursorStart = start + 1;
          newCursorEnd = end + 1;
          break;
        }

        case "k": {
          // Link: wrap with []() and position cursor in URL
          e.preventDefault();
          e.stopPropagation();
          const before = value.slice(0, start);
          const after = value.slice(end);
          newValue = `${before}[${selectedText}](url)${after}`;
          // Position cursor to select "url"
          newCursorStart = end + 3; // after "[selectedText]("
          newCursorEnd = end + 6; // select "url"
          break;
        }

        default:
          return; // Let other key combos through
      }

      onChange(newValue);

      // Set cursor position after state update
      setTimeout(() => {
        textarea.selectionStart = newCursorStart;
        textarea.selectionEnd = newCursorEnd;
        textarea.focus();
      }, 0);
    },
    [value, onChange]
  );

  // Props to spread onto the textarea
  const textareaProps = {
    onPaste: handlePaste,
    onDrop: handleDrop,
    onDragOver: handleDragOver,
    onKeyDown: handleKeyDown,
  };

  return { textareaProps, isUploading };
}
