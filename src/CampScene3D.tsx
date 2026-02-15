import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/* Pre-computed star positions (module-level to keep components pure) */
const STAR_POSITIONS = (() => {
  const arr = new Float32Array(200 * 3)
  for (let i = 0; i < 200; i++) {
    arr[i * 3] = (Math.random() - 0.5) * 20
    arr[i * 3 + 1] = 2 + Math.random() * 6
    arr[i * 3 + 2] = -3 - Math.random() * 10
  }
  return arr
})()

/* ── Campfire: flickering point light + flame cones ── */
function Campfire() {
  const lightRef = useRef<THREE.PointLight>(null)

  useFrame(({ clock }) => {
    if (!lightRef.current) return
    const t = clock.getElapsedTime()
    lightRef.current.intensity = 1.8 + Math.sin(t * 6) * 0.4 + Math.sin(t * 9) * 0.2
    lightRef.current.position.y =
      0.5 + Math.sin(t * 8) * 0.03
  })

  return (
    <group position={[0, 0, 0]}>
      {/* fire stones */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * 0.35, 0.05, Math.sin(angle) * 0.35]}
          >
            <sphereGeometry args={[0.07, 6, 6]} />
            <meshStandardMaterial color="#555" />
          </mesh>
        )
      })}
      {/* flame core */}
      <mesh position={[0, 0.25, 0]}>
        <coneGeometry args={[0.15, 0.5, 8]} />
        <meshStandardMaterial
          color="#ff6600"
          emissive="#ff4400"
          emissiveIntensity={1.5}
        />
      </mesh>
      {/* flame inner */}
      <mesh position={[0.05, 0.3, 0.03]}>
        <coneGeometry args={[0.08, 0.35, 6]} />
        <meshStandardMaterial
          color="#ffaa00"
          emissive="#ff8800"
          emissiveIntensity={2}
        />
      </mesh>
      {/* light source */}
      <pointLight
        ref={lightRef}
        position={[0, 0.5, 0]}
        color="#ff8844"
        intensity={1.8}
        distance={8}
      />
    </group>
  )
}

/* ── Tent: cone + cylinder base ── */
function Tent({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]}>
        <coneGeometry args={[0.6, 1.0, 4]} />
        <meshStandardMaterial color="#886644" />
      </mesh>
      {/* entrance */}
      <mesh position={[0, 0.15, 0.45]} rotation={[-0.3, 0, 0]}>
        <planeGeometry args={[0.3, 0.35]} />
        <meshStandardMaterial color="#332211" side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/* ── Moon ── */
function Moon() {
  return (
    <mesh position={[-3, 4, -5]}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial
        color="#ffffcc"
        emissive="#ffffaa"
        emissiveIntensity={0.8}
      />
    </mesh>
  )
}

/* ── Stars: scattered points ── */
function Stars() {
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[STAR_POSITIONS, 3]}
        />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.04} sizeAttenuation />
    </points>
  )
}

/* ── River: animated wavy plane ── */
function River() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const geo = meshRef.current.geometry as THREE.PlaneGeometry
    const pos = geo.attributes.position
    const t = clock.getElapsedTime()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      pos.setZ(i, Math.sin(x * 2 + t * 2) * 0.05)
    }
    pos.needsUpdate = true
  })

  return (
    <mesh
      ref={meshRef}
      position={[0, 0.01, 2.2]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[8, 1.2, 32, 4]} />
      <meshStandardMaterial
        color="#2244aa"
        transparent
        opacity={0.6}
      />
    </mesh>
  )
}

/* ── Ground ── */
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#1a3a1a" />
    </mesh>
  )
}

/* ── Person sitting by fire ── */
function Person() {
  return (
    <group position={[0.7, 0, 0.5]}>
      {/* body */}
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[0.25, 0.4, 0.2]} />
        <meshStandardMaterial color="#4466aa" />
      </mesh>
      {/* head */}
      <mesh position={[0, 0.65, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#ddaa88" />
      </mesh>
    </group>
  )
}

/* ── Main scene ── */
export default function CampScene3D() {
  return (
    <Canvas
      camera={{ position: [0, 2.5, 5], fov: 50 }}
      style={{ background: '#050510' }}
    >
      {/* ambient light for the dark night */}
      <ambientLight intensity={0.1} color="#334" />
      {/* moonlight */}
      <directionalLight
        position={[-3, 4, -5]}
        intensity={0.15}
        color="#aabbff"
      />

      <Ground />
      <Campfire />
      <Tent position={[-1.2, 0, -0.8]} />
      <Person />
      <Moon />
      <Stars />
      <River />
    </Canvas>
  )
}
