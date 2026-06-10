import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import * as THREE from 'three'

// Face rotations for each die value (which face is on top)
const FACE_ROTATIONS: Record<number, [number, number, number]> = {
  1: [0, 0, 0],
  2: [Math.PI, 0, 0],
  3: [0, 0, -Math.PI / 2],
  4: [0, 0, Math.PI / 2],
  5: [-Math.PI / 2, 0, 0],
  6: [Math.PI / 2, 0, 0],
}

// Create canvas texture for a die face
function createFaceTexture(dots: number): THREE.CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = '#CC0000'

  const positions: [number, number][][] = [
    [],
    [[64, 64]],
    [[32, 32], [96, 96]],
    [[32, 32], [64, 64], [96, 96]],
    [[32, 32], [96, 32], [32, 96], [96, 96]],
    [[32, 32], [96, 32], [64, 64], [32, 96], [96, 96]],
    [[32, 32], [96, 32], [32, 64], [96, 64], [32, 96], [96, 96]],
  ]

  for (const [px, py] of positions[dots] || []) {
    ctx.beginPath()
    ctx.arc(px, py, 12, 0, Math.PI * 2)
    ctx.fill()
  }

  return new THREE.CanvasTexture(canvas)
}

const FACE_TEXTURES = [1, 2, 3, 4, 5, 6].map(n => createFaceTexture(n))

interface Props {
  value: number
  isRolling: boolean
  position: [number, number, number]
  onAnimationEnd?: () => void
}

export function Die({ value, isRolling, position, onAnimationEnd }: Props) {
  const meshRef = useRef<THREE.Mesh>(null)

  useEffect(() => {
    if (!meshRef.current || !isRolling) return

    const final = FACE_ROTATIONS[value] || [0, 0, 0]
    const extraSpins = Math.PI * 8

    gsap.fromTo(
      meshRef.current.rotation,
      { x: 0, y: 0, z: 0 },
      {
        x: final[0] + extraSpins + (Math.random() - 0.5) * 2,
        y: final[1] + extraSpins * 0.7,
        z: final[2] + extraSpins * 0.4,
        duration: 1.8,
        ease: 'power3.out',
        onComplete: onAnimationEnd,
      }
    )
  }, [isRolling, value, onAnimationEnd])

  // Materials: right/left/top/bottom/front/back faces = 1,6,2,5,3,4
  const materials = [
    new THREE.MeshStandardMaterial({ map: FACE_TEXTURES[0] }), // right = 1
    new THREE.MeshStandardMaterial({ map: FACE_TEXTURES[5] }), // left = 6
    new THREE.MeshStandardMaterial({ map: FACE_TEXTURES[1] }), // top = 2
    new THREE.MeshStandardMaterial({ map: FACE_TEXTURES[4] }), // bottom = 5
    new THREE.MeshStandardMaterial({ map: FACE_TEXTURES[2] }), // front = 3
    new THREE.MeshStandardMaterial({ map: FACE_TEXTURES[3] }), // back = 4
  ]

  return (
    <mesh ref={meshRef} position={position} castShadow material={materials}>
      <boxGeometry args={[0.7, 0.7, 0.7]} />
    </mesh>
  )
}
