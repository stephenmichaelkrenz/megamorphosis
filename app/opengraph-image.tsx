import { ImageResponse } from "next/og";

export const alt = "Megamorphosis - Track your transformation";

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
          background: "#fbfaf6",
          color: "#181816",
          display: "flex",
          fontFamily: "Arial, Helvetica, sans-serif",
          height: "100%",
          padding: "64px",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #d9d2c4",
            borderRadius: "28px",
            boxShadow: "0 26px 70px rgba(24, 24, 22, 0.12)",
            display: "flex",
            height: "100%",
            overflow: "hidden",
            width: "100%",
          }}
        >
          <div
            style={{
              background: "#2f5d50",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "56px 38px",
              width: "140px",
            }}
          >
            <div
              style={{
                background: "#f4c95d",
                borderRadius: "999px",
                height: "46px",
                width: "46px",
              }}
            />
            <div
              style={{
                background: "#d86f45",
                borderRadius: "999px",
                height: "46px",
                width: "46px",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              flex: 1,
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "58px 64px 52px",
            }}
          >
            <div
              style={{
                color: "#6d6a60",
                fontSize: "24px",
                fontWeight: 700,
                letterSpacing: "0",
                textTransform: "uppercase",
              }}
            >
              Social proof for personal transformation
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "28px",
              }}
            >
              <div
                style={{
                  fontSize: "88px",
                  fontWeight: 900,
                  letterSpacing: "0",
                  lineHeight: 0.94,
                }}
              >
                Megamorphosis
              </div>
              <div
                style={{
                  color: "#47443d",
                  fontSize: "38px",
                  lineHeight: 1.18,
                  maxWidth: "820px",
                }}
              >
                Track your journey, share proof of progress, and build momentum
                with people who respect the work.
              </div>
            </div>
            <div
              style={{
                alignItems: "center",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "14px",
                }}
              >
                {["Journeys", "Proof", "Circles"].map((label, index) => (
                  <div
                    key={label}
                    style={{
                      background:
                        index === 0
                          ? "#e8f1ee"
                          : index === 1
                            ? "#fff2cc"
                            : "#f4ded4",
                      border: "1px solid rgba(24, 24, 22, 0.1)",
                      borderRadius: "999px",
                      color: "#181816",
                      fontSize: "24px",
                      fontWeight: 700,
                      padding: "14px 22px",
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div
                style={{
                  color: "#6d6a60",
                  fontSize: "24px",
                  fontWeight: 700,
                }}
              >
                megamorphosis.com
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
