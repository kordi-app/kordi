import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

/**
 * Inside the Canvas: tells the page once the scene has really been drawn. The
 * first frame is the slow one (every shader compiles during its render), and a
 * frame's callbacks run before its render — so the second callback is the
 * first moment that render is known to be done. Remount (key) to count again.
 */
export function FirstFrames({ onDrawn }: { onDrawn: () => void }) {
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === 2) onDrawn();
  });
  return null;
}
