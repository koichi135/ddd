import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export type Direction = 'N' | 'S' | 'E' | 'W'

/* Direction → unit vector in 3D space (x, z) */
const DIR_VEC: Record<Direction, [number, number]> = {
  N: [0, -1],
  S: [0, 1],
  E: [1, 0],
  W: [-1, 0],
}

interface DungeonScene3DProps {
  dungeonMap: string[]
  playerPos: { x: number; y: number }
  playerDir: Direction
  builtBases: Set<string>
}

/* ── Camera controller: positions camera at player and looks in direction ── */
function CameraController({
  playerPos,
  playerDir,
}: {
  playerPos: { x: number; y: number }
  playerDir: Direction
}) {
  const { camera } = useThree()
  const targetPos = useRef(new THREE.Vector3())
  const targetLook = useRef(new THREE.Vector3())

  useFrame(() => {
    const [dx, dz] = DIR_VEC[playerDir]
    targetPos.current.set(playerPos.x, 0.5, playerPos.y)
    targetLook.current.set(playerPos.x + dx * 2, 0.5, playerPos.y + dz * 2)

    camera.position.lerp(targetPos.current, 0.15)
    const currentLook = new THREE.Vector3()
    camera.getWorldDirection(currentLook)
    currentLook.multiplyScalar(2).add(camera.position)
    currentLook.lerp(targetLook.current, 0.15)
    camera.lookAt(currentLook)
  })

  return null
}

/* ── Dungeon walls, floor, and ceiling ── */
function DungeonGeometry({
  dungeonMap,
  builtBases,
}: {
  dungeonMap: string[]
  builtBases: Set<string>
}) {
  const { walls, floors, baseSpots } = useMemo(() => {
    const w: [number, number][] = []
    const f: [number, number][] = []
    const b: [number, number][] = []
    for (let y = 0; y < dungeonMap.length; y++) {
      for (let x = 0; x < dungeonMap[y].length; x++) {
        const cell = dungeonMap[y][x]
        if (cell === '#') {
          w.push([x, y])
        } else {
          f.push([x, y])
          if (cell === 'B') {
            b.push([x, y])
          }
        }
      }
    }
    return { walls: w, floors: f, baseSpots: b }
  }, [dungeonMap])

  const wallMeshRef = useRef<THREE.InstancedMesh>(null)
  const floorMeshRef = useRef<THREE.InstancedMesh>(null)
  const ceilMeshRef = useRef<THREE.InstancedMesh>(null)

  /* Set instance matrices after mount */
  useEffect(() => {
    if (!wallMeshRef.current) return
    const mat = new THREE.Matrix4()
    walls.forEach(([x, y], i) => {
      mat.setPosition(x, 0.5, y)
      wallMeshRef.current!.setMatrixAt(i, mat)
    })
    wallMeshRef.current.instanceMatrix.needsUpdate = true
  }, [walls])

  useEffect(() => {
    if (!floorMeshRef.current) return
    const mat = new THREE.Matrix4()
    floors.forEach(([x, y], i) => {
      mat.makeRotationX(-Math.PI / 2)
      mat.setPosition(x, 0, y)
      floorMeshRef.current!.setMatrixAt(i, mat)
    })
    floorMeshRef.current.instanceMatrix.needsUpdate = true
  }, [floors])

  useEffect(() => {
    if (!ceilMeshRef.current) return
    const mat = new THREE.Matrix4()
    floors.forEach(([x, y], i) => {
      mat.makeRotationX(Math.PI / 2)
      mat.setPosition(x, 1, y)
      ceilMeshRef.current!.setMatrixAt(i, mat)
    })
    ceilMeshRef.current.instanceMatrix.needsUpdate = true
  }, [floors])

  return (
    <>
      {/* Walls */}
      <instancedMesh ref={wallMeshRef} args={[undefined, undefined, walls.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#3a3a5a" roughness={0.9} />
      </instancedMesh>

      {/* Floor */}
      <instancedMesh ref={floorMeshRef} args={[undefined, undefined, floors.length]}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#1a1a2e" roughness={1} />
      </instancedMesh>

      {/* Ceiling */}
      <instancedMesh ref={ceilMeshRef} args={[undefined, undefined, floors.length]}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#111122" roughness={1} />
      </instancedMesh>

      {/* Base spot markers */}
      {baseSpots.map(([x, y]) => {
        const key = `${x},${y}`
        const built = builtBases.has(key)
        return (
          <group key={key}>
            <mesh position={[x, 0.01, y]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.6, 0.6]} />
              <meshStandardMaterial
                color={built ? '#80cc80' : '#5a8a5a'}
                emissive={built ? '#44aa44' : '#2a5a2a'}
                emissiveIntensity={built ? 1.5 : 0.8}
              />
            </mesh>
            {built && (
              <pointLight
                position={[x, 0.3, y]}
                color="#44cc44"
                intensity={0.5}
                distance={2}
              />
            )}
          </group>
        )
      })}
    </>
  )
}

/* ── Torch: point light placed along corridors ── */
function Torches({ dungeonMap }: { dungeonMap: string[] }) {
  const torchPositions = useMemo(() => {
    const positions: [number, number][] = []
    for (let y = 0; y < dungeonMap.length; y++) {
      for (let x = 0; x < dungeonMap[y].length; x++) {
        const cell = dungeonMap[y][x]
        if (cell !== '#') {
          if ((x + y) % 3 === 0) {
            const adjacent = [
              [x - 1, y],
              [x + 1, y],
              [x, y - 1],
              [x, y + 1],
            ]
            const nextToWall = adjacent.some(
              ([ax, ay]) => dungeonMap[ay]?.[ax] === '#',
            )
            if (nextToWall) {
              positions.push([x, y])
            }
          }
        }
      }
    }
    return positions
  }, [dungeonMap])

  return (
    <>
      {torchPositions.map(([x, y]) => (
        <group key={`torch-${x}-${y}`}>
          <pointLight
            position={[x, 0.8, y]}
            color="#ff8844"
            intensity={0.8}
            distance={3}
          />
          <mesh position={[x, 0.85, y]}>
            <sphereGeometry args={[0.04, 6, 6]} />
            <meshStandardMaterial
              color="#ff6600"
              emissive="#ff4400"
              emissiveIntensity={2}
            />
          </mesh>
        </group>
      ))}
    </>
  )
}

/* ── Main scene ── */
export default function DungeonScene3D({
  dungeonMap,
  playerPos,
  playerDir,
  builtBases,
}: DungeonScene3DProps) {
  return (
    <Canvas
      camera={{ fov: 75, near: 0.1, far: 20, position: [1, 0.5, 1] }}
      style={{ background: '#050510' }}
    >
      <ambientLight intensity={0.08} color="#334" />

      <CameraController playerPos={playerPos} playerDir={playerDir} />
      <DungeonGeometry dungeonMap={dungeonMap} builtBases={builtBases} />
      <Torches dungeonMap={dungeonMap} />
    </Canvas>
  )
}
