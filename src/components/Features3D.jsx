import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sphere, MeshDistortMaterial, Stars, Text, Float } from '@react-three/drei'

function AnimatedCore() {
  const meshRef = useRef()

  useFrame((state, delta) => {
    meshRef.current.rotation.y += delta * 0.5
    meshRef.current.rotation.x += delta * 0.2
  })

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <Sphere ref={meshRef} args={[1.5, 64, 64]} position={[0, 0, 0]}>
        <MeshDistortMaterial
          color="#0f766e"
          attach="material"
          distort={0.4}
          speed={2}
          roughness={0}
          metalness={0.8}
          clearcoat={1}
          clearcoatRoughness={0.1}
          wireframe={true}
        />
      </Sphere>
      <Sphere args={[1.2, 32, 32]}>
        <MeshDistortMaterial
          color="#10b981"
          attach="material"
          distort={0.3}
          speed={3}
          roughness={0.2}
          metalness={1}
          opacity={0.6}
          transparent
        />
      </Sphere>
    </Float>
  )
}

function FeatureText({ position, text, subtitle, delay }) {
  const groupRef = useRef()
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    groupRef.current.position.y = position[1] + Math.sin(t * 2 + delay) * 0.1
  })

  return (
    <group ref={groupRef} position={position}>
      <Text
        position={[0, 0.2, 0]}
        fontSize={0.25}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#020617"
      >
        {text}
      </Text>
      <Text
        position={[0, -0.15, 0]}
        fontSize={0.12}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        {subtitle}
      </Text>
    </group>
  )
}

export default function Features3D({ isAdmin }) {
  const accentColor = isAdmin ? '#d97706' : '#0f766e' // amber-600 vs teal-700
  const secondaryColor = isAdmin ? '#fbbf24' : '#10b981' // amber-400 vs emerald-500

  return (
    <div className="w-full h-[350px] xl:h-[420px] mt-8 relative rounded-[32px] overflow-hidden bg-gradient-to-br from-white/5 to-[#020617]/50 border border-white/10 group animate-fade-in-up" style={{ animationDelay: '1s' }}>
      
      <div className="absolute top-6 left-8 z-10">
        <h3 className="text-lg font-bold text-white tracking-widest uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          Interactive Matrix
        </h3>
        <p className="text-[11px] text-slate-400 font-mono mt-1 tracking-widest uppercase">3D Feature Visualization</p>
      </div>

      <div className="absolute inset-0 cursor-grab active:cursor-grabbing">
        <Canvas camera={{ position: [0, 0, 7], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} color={accentColor} />
          <pointLight position={[-10, -10, -10]} intensity={1} color={secondaryColor} />
          
          <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
          
          <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
            <Sphere args={[1.5, 64, 64]} position={[0, 0, 0]}>
              <MeshDistortMaterial
                color={accentColor}
                attach="material"
                distort={0.4}
                speed={2}
                roughness={0}
                metalness={0.8}
                clearcoat={1}
                clearcoatRoughness={0.1}
                wireframe={true}
              />
            </Sphere>
            <Sphere args={[1.2, 32, 32]}>
              <MeshDistortMaterial
                color={secondaryColor}
                attach="material"
                distort={0.3}
                speed={3}
                roughness={0.2}
                metalness={1}
                opacity={0.6}
                transparent
              />
            </Sphere>
          </Float>
          
          <FeatureText position={[-2.8, 1.5, 0]} text={isAdmin ? "Analytics" : "Schedules"} subtitle={isAdmin ? "Batch tracking" : "AI timetables"} delay={0} />
          <FeatureText position={[2.8, 1.5, 0]} text="Synced" subtitle="Multi-device state" delay={1} />
          <FeatureText position={[-2.8, -1.5, 0]} text="Encrypted" subtitle="Zero-knowledge" delay={2} />
          <FeatureText position={[2.8, -1.5, 0]} text="Offline" subtitle="IndexedDB cache" delay={3} />
          
          <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={1} maxPolarAngle={Math.PI / 2 + 0.2} minPolarAngle={Math.PI / 2 - 0.2} />
        </Canvas>
      </div>
      
      <div className="absolute bottom-6 right-8 z-10 flex items-center gap-2 text-[10px] text-white/40 font-mono tracking-widest uppercase">
        <span className={`w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-amber-500' : 'bg-teal-500'} animate-pulse`} />
        WebGL Render Engine Active
      </div>
    </div>
  )
}
