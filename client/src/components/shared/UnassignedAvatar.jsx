export function UnassignedAvatar({ size = "md" }) {
  const sizes = {
    xs: { width: "18px", height: "18px" },
    sm: { width: "26px", height: "26px" },
    md: { width: "32px", height: "32px" },
  };
  const sizeStyles = sizes[size] || sizes.md;

  return (
    <div
      title="Unassigned"
      style={{
        ...sizeStyles,
        borderRadius: "50%",
        border: "2px dashed var(--mantine-color-gray-6)",
        backgroundColor: "transparent",
        flexShrink: 0,
      }}
    />
  );
}
