import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  videoRef: React.RefObject<HTMLVideoElement>;
  children?: React.ReactNode; // 枠やガイド等
};

export default function CameraOverlay({ videoRef, children }: Props) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    el.id = "camera-overlay-root";
    // 全画面固定・角丸/クリップ一切なし
    Object.assign(el.style, {
      position: "fixed",
      inset: "0",
      zIndex: "2147483647", // 最前面
      background: "black",  // 初期は黒
      overscrollBehavior: "none",
      WebkitOverflowScrolling: "auto",
    });
    document.body.appendChild(el);
    setHost(el);
    return () => {
      el.remove();
    };
  }, []);

  if (!host) return null;

  return createPortal(
    <div style={{ position: "absolute", inset: 0 }}>
      <video
        ref={videoRef}
        // ここで display:none を絶対に使わない
        style={{
          position: "absolute",
          inset: 0,
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
          display: "block",
          visibility: "visible",
          opacity: 1,
          WebkitTransform: "translateZ(0)",
          transform: "translateZ(0)",
          backgroundColor: "black",
        }}
        playsInline
        muted
        autoPlay
      />
      {/* 角丸や枠は video の「上」に描く（描画は妨げない） */}
      {children}
    </div>,
    host
  );
}