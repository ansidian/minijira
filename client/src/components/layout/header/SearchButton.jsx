import { spotlight } from "@mantine/spotlight";
import { isMac } from "../../../utils/platform";

export function SearchButton({ isUserLocked }) {
  return (
    <button
      className="search-button"
      onClick={() => spotlight.open()}
      disabled={isUserLocked}
      aria-label="Search issues"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="search-icon"
      >
        <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"></path>
        <path d="M21 21l-6 -6"></path>
      </svg>
      <span className="search-text">Search</span>
      <span className="search-shortcut">
        {isMac ? "⌘ + K" : "Ctrl + K"}
      </span>
    </button>
  );
}
