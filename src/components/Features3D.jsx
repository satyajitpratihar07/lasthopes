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
     
      
      <div className="absolute bottom-6 right-8 z-10 flex items-center gap-2 text-[10px] text-white/40 font-mono tracking-widest uppercase">
        <span className={`w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-amber-500' : 'bg-teal-500'} animate-pulse`} />
        WebGL Render Engine Active
      </div>
    </div>
  )
}
