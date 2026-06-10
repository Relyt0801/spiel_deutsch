import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Board } from './Board/Board'
import { Pieces } from './Pieces/Pieces'
import { DiceContainer } from './Dice/DiceContainer'
import { CameraController } from './Camera/CameraController'
import { Buildings } from './Buildings/Buildings'

export function Scene() {
  return (
    <Canvas
      shadows
      camera={{ fov: 50, near: 0.1, far: 200 }}
      style={{ position: 'absolute', inset: 0 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#1a1a2e']} />

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <pointLight position={[0, 8, 0]} intensity={0.4} color="#fff5e0" />

      <CameraController />
      <Board />
      <Buildings />
      <Pieces />
      <DiceContainer />

      {/* Optional orbit controls for debugging – remove in production */}
      {import.meta.env.DEV && (
        <OrbitControls enablePan={false} minDistance={3} maxDistance={25} />
      )}
    </Canvas>
  )
}
