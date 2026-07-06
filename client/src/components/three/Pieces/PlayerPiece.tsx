import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { gsap } from 'gsap'
import * as THREE from 'three'
import type { Player } from '../../../types/game'
import { PLAYER_COLORS } from '../../../types/game'
import { getSquareWorldPosition } from '../Camera/cameraUtils'

interface Props {
  player: Player
  playerIndex: number
  totalPlayers: number
}

// Small offset so multiple players on same square don't overlap
function getPlayerOffset(playerIndex: number, total: number): [number, number] {
  const offsets: [number, number][] = [
    [0, 0], [-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2], [0, 0.25], [-0.25, 0], [0.25, 0]
  ]
  return offsets[playerIndex % offsets.length]
}

function PieceMesh({ piece, color }: { piece: string; color: string }) {
  const mat = <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
  switch (piece) {
    case 'Radiergummi': return (
      <mesh castShadow>
        <boxGeometry args={[0.22, 0.12, 0.14]} />
        {mat}
      </mesh>
    )
    case 'Lineal': return (
      <mesh castShadow>
        <boxGeometry args={[0.45, 0.06, 0.1]} />
        {mat}
      </mesh>
    )
    case 'Bleistift': return (
      <group>
        <mesh castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.36, 6]} />
          {mat}
        </mesh>
        <mesh position={[0, 0.22, 0]} castShadow>
          <coneGeometry args={[0.04, 0.12, 6]} />
          <meshStandardMaterial color="#f5deb3" />
        </mesh>
      </group>
    )
    case 'Spitzer': return (
      <mesh castShadow>
        <coneGeometry args={[0.1, 0.2, 6]} />
        {mat}
      </mesh>
    )
    case 'Tintenfüller': return (
      <group>
        <mesh castShadow>
          <cylinderGeometry args={[0.04, 0.05, 0.3, 8]} />
          {mat}
        </mesh>
        <mesh position={[0, 0.18, 0]} castShadow>
          <coneGeometry args={[0.03, 0.1, 6]} />
          <meshStandardMaterial color="#888" />
        </mesh>
      </group>
    )
    case 'Buch': return (
      <mesh castShadow>
        <boxGeometry args={[0.18, 0.24, 0.07]} />
        {mat}
      </mesh>
    )
    case 'Schere': return (
      <group>
        <mesh rotation={[0, 0, 0.3]} castShadow>
          <boxGeometry args={[0.4, 0.05, 0.04]} />
          {mat}
        </mesh>
        <mesh rotation={[0, 0, -0.3]} castShadow>
          <boxGeometry args={[0.4, 0.05, 0.04]} />
          {mat}
        </mesh>
      </group>
    )
    case 'Globus': return (
      <mesh castShadow>
        <sphereGeometry args={[0.15, 12, 12]} />
        {mat}
      </mesh>
    )
    default: return (
      <mesh castShadow>
        <sphereGeometry args={[0.12, 8, 8]} />
        {mat}
      </mesh>
    )
  }
}

export function PlayerPiece({ player, playerIndex, totalPlayers }: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const [ox, oz] = getPlayerOffset(playerIndex, totalPlayers)

  useEffect(() => {
    if (!groupRef.current) return
    const [x, , z] = getSquareWorldPosition(player.position)
    groupRef.current.position.set(x + ox, 0.2, z + oz)
  }, []) // initial position

  // Animate to new position when player.position changes
  useEffect(() => {
    if (!groupRef.current) return
    const [x, , z] = getSquareWorldPosition(player.position)
    const targetX = x + ox
    const targetZ = z + oz

    const tl = gsap.timeline()
    tl.to(groupRef.current.position, {
      y: 0.7,
      duration: 0.15,
      ease: 'power2.out',
    })
    tl.to(groupRef.current.position, {
      x: targetX,
      z: targetZ,
      duration: 0.15,
    })
    tl.to(groupRef.current.position, {
      y: 0.2,
      duration: 0.15,
      ease: 'power2.in',
    })
  }, [player.position, ox, oz])

  if (player.isBankrupt) return null

  return (
    <group ref={groupRef}>
      <PieceMesh piece={player.piece} color={PLAYER_COLORS[player.color] || '#888'} />
      {/* Glow base */}
      <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.15, 16]} />
        <meshStandardMaterial
          color={PLAYER_COLORS[player.color] || '#888'}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
