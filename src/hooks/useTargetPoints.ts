import { useStore } from "../store";

export default function useTargetPoints(width = 1000) {
  const downsampleRatio = useStore((s) => s.downsampleRatio);
  return Math.max(1, Math.floor(width / Math.max(1, downsampleRatio)));
}