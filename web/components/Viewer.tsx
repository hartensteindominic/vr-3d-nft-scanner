import React, { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, TransformControls, Html, useGLTF } from '@react-three/drei'

// Simple wrapper that loads a glTF model and exposes TransformControls for mouse + basic touch
function Model({ url, selected, onChange }) {
  const group = useRef()
  const { scene } = useGLTF(url)

  useFrame(() => {
    // optional per-frame updates
  })

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  )
}

function TransformableModel({ url }) {
  const [mode, setMode] = useState('translate')
  const [enabled, setEnabled] = useState(true)
  const transform = useRef()
  const orbit = useRef()
  const { camera, gl } = useThree()

  useEffect(() => {
    const controls = transform.current
    const handler = (e) => {
      // Prevent OrbitControls while transforming
      if (controls) controls.enabled = true
    }
    return () => {
      // cleanup
    }
  }, [])

  // Basic touch gesture handling: map one-finger drag -> rotate, two-finger pinch -> scale
  useEffect(() => {
    let lastDist = null
    let dragging = false
    const canvas = gl.domElement

    function getDist(e) {
      if (e.touches && e.touches.length >= 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        return Math.sqrt(dx * dx + dy * dy)
      }
      return null
    }

    function touchStart(e) {
      if (e.touches.length === 1) {
        dragging = true
      } else if (e.touches.length === 2) {
        lastDist = getDist(e)
      }
    }
    function touchMove(e) {
      if (e.touches.length === 1 && dragging) {
        // rotate object by simulating transform rotate mode
        // For simplicity, toggle orbit instead (as a fallback)
      } else if (e.touches.length === 2) {
        const dist = getDist(e)
        if (lastDist && dist) {
          const delta = dist - lastDist
          // Apply scale change to transform.current.object if available
          const t = transform.current
          if (t && t.object) {
            t.object.scale.x += delta * 0.002
            t.object.scale.y += delta * 0.002
            t.object.scale.z += delta * 0.002
            if (onChange) onChange()
          }
        }
        lastDist = dist
      }
    }
    function touchEnd(e) {
      dragging = false
      lastDist = null
    }

    canvas.addEventListener('touchstart', touchStart, { passive: true })
    canvas.addEventListener('touchmove', touchMove, { passive: true })
    canvas.addEventListener('touchend', touchEnd, { passive: true })

    return () => {
      canvas.removeEventListener('touchstart', touchStart)
      canvas.removeEventListener('touchmove', touchMove)
      canvas.removeEventListener('touchend', touchEnd)
    }
  }, [gl, onChange])

  return (
    <>
      <TransformControls ref={transform} mode={mode} onMouseDown={() => { if (orbit.current) orbit.current.enabled = false }} onMouseUp={() => { if (orbit.current) orbit.current.enabled = true }}>
        <Model url={url} />
      </TransformControls>
      <OrbitControls ref={orbit} enablePan={true} enableRotate={true} enableZoom={true} />

      <Html position={[0, -1.2, 0]} center>
        <div style={{ color: 'white', padding: 8, background: 'rgba(0,0,0,0.4)', borderRadius: 8 }}>
          <button onClick={() => setMode('translate')}>Move</button>
          <button onClick={() => setMode('rotate')}>Rotate</button>
          <button onClick={() => setMode('scale')}>Scale</button>
        </div>
      </Html>
    </>
  )
}

export default function Viewer({ modelUrl }) {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Canvas shadows camera={{ position: [0, 1.5, 3], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
        <TransformableModel url={modelUrl} />
      </Canvas>
    </div>
  )
}
