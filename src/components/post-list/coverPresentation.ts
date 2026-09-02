export type CoverOrientation =
  | "portrait"
  | "balanced"
  | "landscape"
  | "unknown";

interface ImageDimensions {
  width: number;
  height: number;
}

const hasImageDimensions = (value: unknown): value is ImageDimensions => {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<ImageDimensions>;
  return (
    typeof candidate.width === "number" &&
    Number.isFinite(candidate.width) &&
    candidate.width > 0 &&
    typeof candidate.height === "number" &&
    Number.isFinite(candidate.height) &&
    candidate.height > 0
  );
};

export const classifyCoverOrientation = (cover: unknown): CoverOrientation => {
  if (!hasImageDimensions(cover)) return "unknown";

  const aspectRatio = cover.width / cover.height;
  if (aspectRatio < 0.86) return "portrait";
  if (aspectRatio > 1.35) return "landscape";
  return "balanced";
};
