import { useEffect, useRef } from "react";
import { useStore } from "../store";

export default function usePlayback() {
  const isPlaying = useStore((s) => s.isPlaying);
  const T = useStore((s) => s.T);
  const x = useStore((s) => s.x);
  const N = useStore((s) => s.N);
  const useExternal = useStore((s) => s.useExternalStorage);
  const totalRows = useStore((s) => s.totalRows);
  
  const animationIdRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  useEffect(() => {
    const dataLength = useExternal ? totalRows : (x ? x.length : 0);
    if (!isPlaying || dataLength === 0) {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      return;
    }

    const animate = (currentTime: number) => {
      // Check if enough time has passed based on T (playback speed)
      if (currentTime - lastUpdateTimeRef.current >= Math.max(1, T)) {
        const st = useStore.getState();
        const { S, N, P, wrap } = st;
        const lengthNow = st.useExternalStorage ? st.totalRows : (st.x ? st.x.length : 0);
        const maxStart = Math.max(0, lengthNow - N);

        if (wrap) {
          const next = (S + Math.max(1, P)) % (maxStart + 1);
          st.setS(next);
        } else {
          const next = Math.min(S + Math.max(1, P), maxStart);
          st.setS(next);
          if (next >= maxStart) {
            st.setIsPlaying(false);
            return; // Stop animation when reaching the end
          }
        }
        
        lastUpdateTimeRef.current = currentTime;
      }

      // Continue the animation if still playing
      if (useStore.getState().isPlaying) {
        animationIdRef.current = requestAnimationFrame(animate);
      }
    };

    // Start the animation
    lastUpdateTimeRef.current = performance.now();
    animationIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, [isPlaying, x?.length, N, T, useExternal, totalRows]); 
}