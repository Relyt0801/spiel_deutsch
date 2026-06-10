import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { gsap } from 'gsap'
import * as THREE from 'three'
import { useUiStore } from '../../../store/uiStore'
import { getCameraPositionForSquare, OVERVIEW_CAMERA } from './cameraUtils'

export function CameraController() {
  const { camera } = useThree()
  const lookAtTarget = useRef(new THREE.Vector3(0, 0, 0))
  const cameraTarget = useUiStore(s => s.cameraTarget)
  const prevTarget = useRef<number | null>(null)

  // Set initial overview position
  useEffect(() => {
    camera.position.set(...OVERVIEW_CAMERA.position)
    lookAtTarget.current.set(...OVERVIEW_CAMERA.lookAt)
    camera.lookAt(lookAtTarget.current)
  }, [camera])

  useEffect(() => {
    if (cameraTarget === null || cameraTarget === prevTarget.current) return
    prevTarget.current = cameraTarget

    const { position, lookAt } = getCameraPositionForSquare(cameraTarget)

    gsap.to(camera.position, {
      x: position[0],
      y: position[1],
      z: position[2],
      duration: 1.2,
      ease: 'power2.inOut',
    })

    gsap.to(lookAtTarget.current, {
      x: lookAt[0],
      y: lookAt[1],
      z: lookAt[2],
      duration: 1.2,
      ease: 'power2.inOut',
    })
  }, [cameraTarget, camera])

  useFrame(() => {
    camera.lookAt(lookAtTarget.current)
  })

  return null
}
