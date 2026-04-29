import { ImageResponse } from "next/og";

export const alt = "Megamorphosis";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#f7f7f4",
          color: "#181816",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Arial, Helvetica, sans-serif",
          height: "100%",
          justifyContent: "center",
          padding: "72px",
          width: "100%",
        }}
      >
        <div
          style={{
            border: "2px solid #181816",
            borderRadius: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "28px",
            padding: "64px",
            width: "100%",
          }}
        >
          <div
            style={{
              fontSize: "72px",
              fontWeight: 800,
              letterSpacing: "0",
              lineHeight: 1,
            }}
          >
            MEGAMORPHOSIS
          </div>
          <div
            style={{
              color: "#56564f",
              fontSize: "34px",
              lineHeight: 1.25,
              maxWidth: "880px",
            }}
          >
            Track your transformation. Share proof. Build momentum.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
