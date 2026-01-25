/**
 * Dot pagination indicators for mobile column navigation.
 * Shows which column is currently visible (iOS page control pattern).
 */
export function ColumnIndicators({ activeIndex, totalColumns }) {
  if (totalColumns <= 1) return null;

  return (
    <div className="column-indicators" role="tablist" aria-label="Column navigation">
      {Array.from({ length: totalColumns }, (_, i) => (
        <div
          key={i}
          className={`column-dot ${i === activeIndex ? 'column-dot-active' : ''}`}
          role="tab"
          aria-selected={i === activeIndex}
          aria-label={`Column ${i + 1} of ${totalColumns}`}
        />
      ))}
    </div>
  );
}
