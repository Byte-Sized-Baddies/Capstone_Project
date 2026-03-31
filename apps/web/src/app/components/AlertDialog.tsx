"use client";

type AlertDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void;
  onClose?: () => void;
  isDark?: boolean;
};

export default function AlertDialog({
  open,
  title,
  message,
  confirmText = "OK",
  onConfirm,
  onClose,
  isDark = true,
}: AlertDialogProps) {
  if (!open) return null;

  const surface = isDark ? "#18181b" : "#ffffff";
  const border = isDark ? "#27272a" : "#f5e99f";
  const text = isDark ? "#fafafa" : "#1a1a1a";
  const textMuted = isDark ? "#a1a1aa" : "#6b6b6b";
  const accent = isDark ? "#FFC107" : "#f5c800";
  const accentText = "#18181b";

  const handleBackdropClick = () => {
    if (onClose) onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-message"
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20,
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 360,
          borderRadius: 16,
          border: `1px solid ${border}`,
          background: surface,
          padding: "24px 20px",
          boxShadow: isDark
            ? "0 20px 50px rgba(0,0,0,0.45)"
            : "0 20px 50px rgba(0,0,0,0.15)",
          textAlign: "center",
        }}
      >
        <h2 id="alert-dialog-title" style={{ margin: "0 0 8px", fontSize: 20, color: text }}>
          {title}
        </h2>
        <p id="alert-dialog-message" style={{ margin: "0 0 18px", fontSize: 14, color: textMuted }}>
          {message}
        </p>
        <button
          onClick={onConfirm}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 12,
            border: "none",
            background: accent,
            color: accentText,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {confirmText}
        </button>
      </div>
    </div>
  );
}
