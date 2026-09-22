"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log lỗi ra console để dễ debug
    console.error("APP ERROR:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#FFF8F0",
        color: "#3D3D3D",
        fontFamily: "sans-serif",
      }}
    >
      <h2 style={{ color: "#D94F3A", marginBottom: 8 }}>Có lỗi xảy ra</h2>
      <p style={{ color: "#707070", maxWidth: 480, textAlign: "center", wordBreak: "break-word", background: "#FFF3CD", padding: 12, borderRadius: 8 }}>
        {error.message || "Unknown error"}
      </p>
      <button
        onClick={reset}
        style={{
          marginTop: 16,
          padding: "10px 24px",
          borderRadius: 20,
          border: "none",
          background: "#6EC6B3",
          color: "#fff",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Thử lại
      </button>
    </div>
  );
}
