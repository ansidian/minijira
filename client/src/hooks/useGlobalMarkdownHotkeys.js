import { useEffect } from "react";

/**
 * Global hook that enables markdown formatting hotkeys in any focused
 * input or textarea. Works automatically without needing to wire up
 * individual fields.
 *
 * Supported hotkeys:
 * - Cmd/Ctrl+K: Link ([text](url)) - works on all text inputs
 * - Cmd/Ctrl+B: Bold (**text**) - only on elements with data-markdown="full"
 * - Cmd/Ctrl+I: Italic (*text*) - only on elements with data-markdown="full"
 *
 * Add data-markdown="full" to textareas that render full markdown (descriptions, comments).
 * Title inputs get link support automatically without any attribute.
 */
export function useGlobalMarkdownHotkeys() {
  useEffect(() => {
    function handleKeyDown(e) {
      // Only handle Cmd/Ctrl + key combinations
      if (!(e.metaKey || e.ctrlKey)) {
        return;
      }

      const key = e.key.toLowerCase();
      if (!["b", "i", "k"].includes(key)) {
        return;
      }

      const el = document.activeElement;

      // Only act on text inputs and textareas
      if (
        !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
      ) {
        return;
      }

      // Skip if it's a non-text input type
      if (
        el instanceof HTMLInputElement &&
        !["text", "search", "url", "email"].includes(el.type)
      ) {
        return;
      }

      // Bold/italic only work on fields with data-markdown="full"
      const supportsFullMarkdown = el.dataset.markdown === "full";
      if ((key === "b" || key === "i") && !supportsFullMarkdown) {
        return; // Let the event pass through (browser default or other handlers)
      }

      e.preventDefault();
      e.stopPropagation();

      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      const value = el.value;
      const selectedText = value.slice(start, end);
      const before = value.slice(0, start);
      const after = value.slice(end);

      let newValue;
      let newCursorStart;
      let newCursorEnd;

      switch (key) {
        case "b": {
          // Bold: wrap with **
          newValue = `${before}**${selectedText}**${after}`;
          newCursorStart = start + 2;
          newCursorEnd = end + 2;
          break;
        }

        case "i": {
          // Italic: wrap with *
          newValue = `${before}*${selectedText}*${after}`;
          newCursorStart = start + 1;
          newCursorEnd = end + 1;
          break;
        }

        case "k": {
          // Link: wrap with []() and position cursor in URL
          newValue = `${before}[${selectedText}](url)${after}`;
          // Position cursor to select "url"
          newCursorStart = start + selectedText.length + 3; // after "[text]("
          newCursorEnd = newCursorStart + 3; // select "url"
          break;
        }

        default:
          return;
      }

      // Update the input value natively
      el.value = newValue;

      // Set cursor position
      el.setSelectionRange(newCursorStart, newCursorEnd);

      // Dispatch input event to trigger React's onChange
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, []);
}
