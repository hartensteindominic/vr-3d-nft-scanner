import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, TransformControls, Html, useGLTF } from '@react-three/drei';

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

function TransformableModel({ url }: { url: string }) {
  const [mode, setMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const transform = useRef<any>(null);
  const orbit = useRef<any>(null);
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    let lastDist: number | null = null;

    const distance = (touches: TouchList) => {
      if (touches.length < 2) return null;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    };

    const onStart = (e: TouchEvent) => {
      lastDist = distance(e.touches);
    };

    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      const next = distance(e.touches);
      const object = transform.current?.object;
      if (next && lastDist && object) {
        const factor = Math.max(0.05, 1 + (next - lastDist) * 0.002);
        object.scale.multiplyScalar(factor);
      }
      lastDist = next;
    };

    const onEnd = () => { lastDist = null; };
    canvas.addEventListener('touchstart', onStart, { passive: true });
    canvas.addEventListener('touchmove', onMove, { passive: true });
    canvas.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onEnd);
    };
  }, [gl]);

  return (
    <>
      <TransformControls
        ref={transform}
        mode={mode}
        onMouseDown={() => { if (orbit.current) orbit.current.enabled = false; }}
        onMouseUp={() => { if (orbit.current) orbit.current.enabled = true; }}
      >
        <Model url={url} />
      </TransformControls>
      <OrbitControls ref={orbit} enablePan enableRotate enableZoom />
      <Html position={[0, -1.25, 0]} center>
        <div style={{ display: 'flex', gap: 6, padding: 8, borderRadius: 12, background: 'rgba(2,1,10,.82)', border: '1px solid rgba(155,231,255,.25)' }}>
          {(['translate', 'rotate', 'scale'] as const).map((item) => (
            <button key={item} onClick={() => setMode(item)}>{item}</button>
          ))}
        </div>
      </Html>
    </>
  );
}

export default function ThreeNFTViewer({ modelUrl }: { modelUrl: string }) {
  return (
    <div style={{ width: '100%', height: '100vh', background: '#02010a' }}>
      <Canvas shadows camera={{ position: [0, 1.5, 3], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
        <TransformableModel url={modelUrl} />
      </Canvas>
    </div>
  );
}
