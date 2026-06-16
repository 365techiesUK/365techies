import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const FONT_FAMILY =
  '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

export const MyComposition = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title: spring-driven scale + fade-in over the first ~18 frames.
  const titleSpring = spring({ frame, fps, config: { damping: 200 } });
  const titleScale = interpolate(titleSpring, [0, 1], [0.85, 1]);
  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Accent underline grows out from under the title, slightly delayed.
  const underline = spring({ frame: frame - 12, fps, config: { damping: 200 } });
  const underlineWidth = interpolate(underline, [0, 1], [0, 360]);

  // Subtitle fades and slides up after the title settles.
  const subtitleOpacity = interpolate(frame, [24, 44], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subtitleY = interpolate(frame, [24, 44], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0B1120",
        backgroundImage:
          "radial-gradient(circle at 50% 35%, #15233f 0%, #0B1120 60%)",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: FONT_FAMILY,
      }}
    >
      <div
        style={{
          transform: `scale(${titleScale})`,
          opacity: titleOpacity,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: -2,
            color: "#F8FAFC",
          }}
        >
          <span style={{ color: "#38BDF8" }}>365</span> Techies
        </div>

        <div
          style={{
            width: underlineWidth,
            height: 6,
            borderRadius: 999,
            margin: "24px auto 0",
            backgroundColor: "#38BDF8",
          }}
        />
      </div>

      <div
        style={{
          marginTop: 28,
          fontSize: 30,
          fontWeight: 400,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: "#94A3B8",
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
        }}
      >
        Tech support, simplified
      </div>
    </AbsoluteFill>
  );
};
