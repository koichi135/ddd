import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { EnemyData } from './enemies'

/* ── Slime: bouncing sphere ── */
function Slime({ color }: { color: string }) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.position.y = Math.abs(Math.sin(t * 2)) * 0.2
    ref.current.scale.setY(1 + Math.sin(t * 2) * 0.15)
    ref.current.scale.setX(1 - Math.sin(t * 2) * 0.08)
    ref.current.scale.setZ(1 - Math.sin(t * 2) * 0.08)
  })

  return (
    <group ref={ref} position={[0, 0, 0]}>
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.5, 16, 12]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
      {/* eyes */}
      <mesh position={[-0.15, 0.55, 0.4]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0.15, 0.55, 0.4]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>
    </group>
  )
}

/* ── Bat: flapping wings ── */
function Bat({ color }: { color: string }) {
  const leftWing = useRef<THREE.Mesh>(null)
  const rightWing = useRef<THREE.Mesh>(null)
  const bodyRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const flapAngle = Math.sin(t * 8) * 0.6
    if (leftWing.current) leftWing.current.rotation.z = flapAngle
    if (rightWing.current) rightWing.current.rotation.z = -flapAngle
    if (bodyRef.current) {
      bodyRef.current.position.y = 1.2 + Math.sin(t * 3) * 0.15
    }
  })

  return (
    <group ref={bodyRef} position={[0, 1.2, 0]}>
      {/* body */}
      <mesh>
        <sphereGeometry args={[0.25, 10, 10]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* left wing */}
      <mesh ref={leftWing} position={[-0.3, 0.05, 0]}>
        <boxGeometry args={[0.6, 0.02, 0.35]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* right wing */}
      <mesh ref={rightWing} position={[0.3, 0.05, 0]}>
        <boxGeometry args={[0.6, 0.02, 0.35]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* eyes */}
      <mesh position={[-0.1, 0.05, 0.22]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshStandardMaterial
          color="#ff2222"
          emissive="#ff0000"
          emissiveIntensity={1}
        />
      </mesh>
      <mesh position={[0.1, 0.05, 0.22]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshStandardMaterial
          color="#ff2222"
          emissive="#ff0000"
          emissiveIntensity={1}
        />
      </mesh>
    </group>
  )
}

/* ── Skeleton: bones and skull ── */
function Skeleton({ color }: { color: string }) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.rotation.y = Math.sin(t * 1.5) * 0.15
  })

  return (
    <group ref={ref} position={[0, 0, 0]}>
      {/* spine */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.8, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* ribcage */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.5 + i * 0.15, 0.05]}>
          <torusGeometry args={[0.15, 0.02, 4, 8, Math.PI]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      {/* skull */}
      <mesh position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* eye sockets */}
      <mesh position={[-0.07, 1.13, 0.14]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshStandardMaterial
          color="#220000"
          emissive="#ff0000"
          emissiveIntensity={0.5}
        />
      </mesh>
      <mesh position={[0.07, 1.13, 0.14]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshStandardMaterial
          color="#220000"
          emissive="#ff0000"
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* arms */}
      <mesh position={[-0.25, 0.7, 0]} rotation={[0, 0, 0.4]}>
        <cylinderGeometry args={[0.03, 0.03, 0.5, 4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.25, 0.7, 0]} rotation={[0, 0, -0.4]}>
        <cylinderGeometry args={[0.03, 0.03, 0.5, 4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* legs */}
      <mesh position={[-0.1, 0.15, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.35, 4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.1, 0.15, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.35, 4]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}

/* ── Boss: Dark Dragon ── */
function BossDragon({ color }: { color: string }) {
  const ref = useRef<THREE.Group>(null)
  const leftWing = useRef<THREE.Mesh>(null)
  const rightWing = useRef<THREE.Mesh>(null)
  const tailRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.position.y = Math.sin(t * 1.5) * 0.08
    ref.current.rotation.y = Math.sin(t * 0.8) * 0.1
    const wingFlap = Math.sin(t * 3) * 0.3
    if (leftWing.current) leftWing.current.rotation.z = 0.3 + wingFlap
    if (rightWing.current) rightWing.current.rotation.z = -(0.3 + wingFlap)
    if (tailRef.current) tailRef.current.rotation.y = Math.sin(t * 2) * 0.4
  })

  return (
    <group ref={ref} position={[0, 0.2, -0.5]} scale={[1.5, 1.5, 1.5]}>
      {/* body */}
      <mesh position={[0, 0.7, 0]}>
        <sphereGeometry args={[0.5, 12, 10]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* chest/belly */}
      <mesh position={[0, 0.5, 0.2]}>
        <sphereGeometry args={[0.35, 10, 8]} />
        <meshStandardMaterial color="#dd6644" roughness={0.5} />
      </mesh>
      {/* neck */}
      <mesh position={[0, 1.0, 0.15]} rotation={[0.4, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 0.5, 8]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* head */}
      <mesh position={[0, 1.3, 0.3]}>
        <boxGeometry args={[0.35, 0.25, 0.4]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* snout */}
      <mesh position={[0, 1.25, 0.55]}>
        <boxGeometry args={[0.2, 0.15, 0.25]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* horns */}
      <mesh position={[-0.12, 1.45, 0.2]} rotation={[0.3, 0, -0.3]}>
        <coneGeometry args={[0.04, 0.2, 6]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0.12, 1.45, 0.2]} rotation={[0.3, 0, 0.3]}>
        <coneGeometry args={[0.04, 0.2, 6]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {/* eyes */}
      <mesh position={[-0.1, 1.35, 0.48]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshStandardMaterial
          color="#ffcc00"
          emissive="#ff8800"
          emissiveIntensity={2}
        />
      </mesh>
      <mesh position={[0.1, 1.35, 0.48]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshStandardMaterial
          color="#ffcc00"
          emissive="#ff8800"
          emissiveIntensity={2}
        />
      </mesh>
      {/* left wing */}
      <mesh ref={leftWing} position={[-0.5, 0.9, -0.1]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.8, 0.03, 0.6]} />
        <meshStandardMaterial
          color="#881122"
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* right wing */}
      <mesh ref={rightWing} position={[0.5, 0.9, -0.1]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.8, 0.03, 0.6]} />
        <meshStandardMaterial
          color="#881122"
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* tail */}
      <mesh ref={tailRef} position={[0, 0.4, -0.5]} rotation={[-0.3, 0, 0]}>
        <coneGeometry args={[0.12, 0.8, 6]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* legs */}
      <mesh position={[-0.2, 0.15, 0.1]}>
        <cylinderGeometry args={[0.08, 0.1, 0.4, 6]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0.2, 0.15, 0.1]}>
        <cylinderGeometry args={[0.08, 0.1, 0.4, 6]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* fiery aura */}
      <pointLight position={[0, 0.8, 0.3]} color="#ff4422" intensity={1.5} distance={4} />
    </group>
  )
}

/* ── Ground plane for battle ── */
function BattleGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial color="#2a2a40" />
    </mesh>
  )
}

/* ── Main Battle Scene ── */
export default function BattleScene3D({ enemy }: { enemy: EnemyData }) {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 3], fov: 50 }}
      style={{ background: '#0a0a1a' }}
    >
      <ambientLight intensity={0.5} color="#667" />
      <directionalLight position={[2, 3, 2]} intensity={1.0} color="#aaaadd" />
      <directionalLight position={[-2, 2, -1]} intensity={0.4} color="#8888cc" />
      <pointLight
        position={[0, 2, 1]}
        color="#ff8866"
        intensity={1.2}
        distance={8}
      />

      <BattleGround />

      {enemy.type === 'slime' && <Slime color={enemy.color} />}
      {enemy.type === 'bat' && <Bat color={enemy.color} />}
      {enemy.type === 'skeleton' && <Skeleton color={enemy.color} />}
      {enemy.type === 'boss' && <BossDragon color={enemy.color} />}
    </Canvas>
  )
}
