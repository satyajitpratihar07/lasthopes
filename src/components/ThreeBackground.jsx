import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import * as THREE from 'three'

export default function ThreeBackground() {
  const canvasRef = useRef(null)
  const location = useLocation()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // ─── Create Custom Glowing Star Texture ─────────────────────
    const createCircleTexture = () => {
      const textureCanvas = document.createElement('canvas')
      textureCanvas.width = 64
      textureCanvas.height = 64
      const ctx = textureCanvas.getContext('2d')

      // Soft glow gradient
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
      gradient.addColorStop(0.15, 'rgba(255, 255, 255, 0.95)')
      gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)')
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 64, 64)
      return new THREE.CanvasTexture(textureCanvas)
    }

    // ─── Setup Scene ───────────────────────────────────────────
    const scene = new THREE.Scene()
    
    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      1000
    )
    camera.position.z = 100

    // Renderer (Alpha: true allows HTML background gradients to show)
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)

    // ─── Create Particle Constellation ──────────────────────────
    const particleCount = 200
    const boxSize = 250 // dimensions of volume particle system will float in
    
    const particlesGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const velocities = []

    // Populate initial positions and random velocities
    for (let i = 0; i < particleCount; i++) {
      // Position
      positions[i * 3] = (Math.random() - 0.5) * boxSize
      positions[i * 3 + 1] = (Math.random() - 0.5) * boxSize
      positions[i * 3 + 2] = (Math.random() - 0.5) * boxSize

      // Velocity (drift velocity)
      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.05
        )
      )
    }

    particlesGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    )

    // Material for particles - soft, glowing circles with blending
    const pointsMaterial = new THREE.PointsMaterial({
      size: 4.5, // Increased size
      map: createCircleTexture(),
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    const pointCloud = new THREE.Points(particlesGeometry, pointsMaterial)
    scene.add(pointCloud)

    // ─── Create Floating Wireframe Polyhedra ───────────────────
    const polyGroup = new THREE.Group()
    scene.add(polyGroup)

    const geomTemplates = [
      new THREE.IcosahedronGeometry(14, 1),
      new THREE.DodecahedronGeometry(10, 0),
      new THREE.TetrahedronGeometry(12, 0)
    ]

    const polyhedra = []
    const polyCount = 7

    for (let i = 0; i < polyCount; i++) {
      const geom = geomTemplates[i % geomTemplates.length]
      const mat = new THREE.MeshBasicMaterial({
        wireframe: true,
        transparent: true,
        opacity: 0.35, // highlighted visibility
        blending: THREE.AdditiveBlending
      })
      
      const mesh = new THREE.Mesh(geom, mat)
      mesh.position.set(
        (Math.random() - 0.5) * boxSize,
        (Math.random() - 0.5) * boxSize,
        (Math.random() - 0.5) * boxSize
      )
      
      mesh.userData = {
        rotX: (Math.random() - 0.5) * 0.015,
        rotY: (Math.random() - 0.5) * 0.015,
        drift: new THREE.Vector3(
          (Math.random() - 0.5) * 0.06,
          (Math.random() - 0.5) * 0.06,
          (Math.random() - 0.5) * 0.04
        )
      }
      
      polyGroup.add(mesh)
      polyhedra.push({ mesh, mat })
    }

    // ─── Create Lines Geometry ─────────────────────────────────
    const maxConnections = 450
    const linePositions = new Float32Array(maxConnections * 2 * 3)
    const lineColors = new Float32Array(maxConnections * 2 * 3)

    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(linePositions, 3)
    )
    lineGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(lineColors, 3)
    )

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.45, // Increased line visibility
      blending: THREE.AdditiveBlending,
      linewidth: 1.5
    })

    const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial)
    scene.add(lineSegments)

    // ─── Interaction Variables ────────────────────────────────
    let mouseX = 0
    let mouseY = 0
    let targetMouseX = 0
    let targetMouseY = 0

    let currentScroll = 0
    let targetScroll = 0
    let prevScroll = 0

    // Highly vibrant highlighted colors for strong 3D visual pop
    const colorTeal = new THREE.Color('#00f0ff')       // Bright Neon Cyan
    const colorAmber = new THREE.Color('#ff8c00')      // Vibrant Amber Orange
    const colorDarkTeal = new THREE.Color('#008f82')   // Stronger visible teal for light page
    const activeColor = new THREE.Color()

    // ─── Listeners ─────────────────────────────────────────────
    const handleMouseMove = (event) => {
      targetMouseX = (event.clientX / window.innerWidth) * 2 - 1
      targetMouseY = -(event.clientY / window.innerHeight) * 2 - 1
    }

    const handleScroll = () => {
      targetScroll = window.scrollY
    }

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize, { passive: true })

    // ─── Animation Loop ────────────────────────────────────────
    let animationFrameId
    const posAttr = particlesGeometry.attributes.position
    const linePosAttr = lineGeometry.attributes.position
    const lineColAttr = lineGeometry.attributes.color

    const tick = () => {
      // Calculate scroll speed to drive visual warp speed
      const scrollDiff = Math.abs(targetScroll - prevScroll)
      prevScroll = targetScroll

      // Warp speed increases when user is actively scrolling
      const warpFactor = Math.min(scrollDiff * 0.1, 6.0)
      const baseForwardSpeed = 0.05
      const totalForwardSpeed = baseForwardSpeed + warpFactor

      // 1. Mouse Parallax (Lerp)
      mouseX += (targetMouseX - mouseX) * 0.05
      mouseY += (targetMouseY - mouseY) * 0.05

      // Slight rotation based on mouse coordinates for interactive 3D parallax
      pointCloud.rotation.y = mouseX * 0.35
      pointCloud.rotation.x = -mouseY * 0.35
      polyGroup.rotation.y = mouseX * 0.35
      polyGroup.rotation.x = -mouseY * 0.35
      lineSegments.rotation.y = mouseX * 0.35
      lineSegments.rotation.x = -mouseY * 0.35

      // 2. Scroll depth movement (Lerp)
      currentScroll += (targetScroll - currentScroll) * 0.06
      camera.position.z = 100 + currentScroll * 0.03
      camera.lookAt(scene.position)

      // 3. Dynamic Color Interpolation
      const path = window.location.pathname
      const role = localStorage.getItem('lastHopeRole')
      
      let targetColor
      if (path === '/signup' || path === '/verify-otp') {
        targetColor = colorDarkTeal
      } else {
        targetColor = role === 'Admin' ? colorAmber : colorTeal
      }

      // Smoothly blend color
      activeColor.lerp(targetColor, 0.04)
      pointsMaterial.color.copy(activeColor)

      // 4. Update Particle Physics & Warp Wrapping
      const positionsArray = posAttr.array
      const cameraFrontPlane = camera.position.z - 5

      for (let i = 0; i < particleCount; i++) {
        // Apply velocity + forward speed warp
        positionsArray[i * 3] += velocities[i].x
        positionsArray[i * 3 + 1] += velocities[i].y
        positionsArray[i * 3 + 2] += velocities[i].z + totalForwardSpeed

        // Wrap around z axis if it passes camera
        if (positionsArray[i * 3 + 2] > cameraFrontPlane) {
          positionsArray[i * 3 + 2] = -boxSize / 2
          positionsArray[i * 3] = (Math.random() - 0.5) * boxSize
          positionsArray[i * 3 + 1] = (Math.random() - 0.5) * boxSize
        }

        // Bounce back if they exit box x & y boundaries
        const bound = boxSize / 2
        if (Math.abs(positionsArray[i * 3]) > bound) {
          velocities[i].x *= -1
          positionsArray[i * 3] = Math.sign(positionsArray[i * 3]) * bound
        }
        if (Math.abs(positionsArray[i * 3 + 1]) > bound) {
          velocities[i].y *= -1
          positionsArray[i * 3 + 1] = Math.sign(positionsArray[i * 3 + 1]) * bound
        }
      }
      posAttr.needsUpdate = true

      // 5. Update Floating Wireframe Polyhedra
      polyhedra.forEach(({ mesh, mat }) => {
        mesh.rotation.x += mesh.userData.rotX
        mesh.rotation.y += mesh.userData.rotY
        
        mesh.position.add(mesh.userData.drift)
        mesh.position.z += totalForwardSpeed * 0.8 // slightly slower forward movement

        // Wrap around Z axis
        if (mesh.position.z > cameraFrontPlane) {
          mesh.position.z = -boxSize / 2
          mesh.position.x = (Math.random() - 0.5) * boxSize
          mesh.position.y = (Math.random() - 0.5) * boxSize
        }

        // Bounce off X and Y boundaries
        const bound = boxSize / 2
        if (Math.abs(mesh.position.x) > bound) {
          mesh.userData.drift.x *= -1
          mesh.position.x = Math.sign(mesh.position.x) * bound
        }
        if (Math.abs(mesh.position.y) > bound) {
          mesh.userData.drift.y *= -1
          mesh.position.y = Math.sign(mesh.position.y) * bound
        }

        // Dynamically color polyhedra wireframes
        mat.color.copy(activeColor)
      })

      // 6. Connect Nearby Particles with Lines
      let lineIndex = 0
      const linePositionsArray = linePosAttr.array
      const lineColorsArray = lineColAttr.array

      for (let i = 0; i < particleCount; i++) {
        const x1 = positionsArray[i * 3]
        const y1 = positionsArray[i * 3 + 1]
        const z1 = positionsArray[i * 3 + 2]

        for (let j = i + 1; j < particleCount; j++) {
          const x2 = positionsArray[j * 3]
          const y2 = positionsArray[j * 3 + 1]
          const z2 = positionsArray[j * 3 + 2]

          const dist = Math.hypot(x2 - x1, y2 - y1, z2 - z1)

          // Connect if particles are close
          if (dist < 46 && lineIndex < maxConnections) {
            const idx1 = lineIndex * 6
            const idx2 = lineIndex * 6 + 3

            // Position coordinates
            linePositionsArray[idx1] = x1
            linePositionsArray[idx1 + 1] = y1
            linePositionsArray[idx1 + 2] = z1

            linePositionsArray[idx2] = x2
            linePositionsArray[idx2 + 1] = y2
            linePositionsArray[idx2 + 2] = z2

            // Glowing alpha connection
            const alpha = (1.0 - dist / 46) * 0.75
            
            // Populate RGB values for lines (connecting colors matches points color)
            lineColorsArray[idx1] = activeColor.r * alpha
            lineColorsArray[idx1 + 1] = activeColor.g * alpha
            lineColorsArray[idx1 + 2] = activeColor.b * alpha

            lineColorsArray[idx2] = activeColor.r * alpha
            lineColorsArray[idx2 + 1] = activeColor.g * alpha
            lineColorsArray[idx2 + 2] = activeColor.b * alpha

            lineIndex++
          }
        }
      }

      lineGeometry.setDrawRange(0, lineIndex * 2)
      linePosAttr.needsUpdate = true
      lineColAttr.needsUpdate = true

      // 7. Render Frame
      renderer.render(scene, camera)

      animationFrameId = requestAnimationFrame(tick)
    }

    tick()

    // ─── Cleanup ───────────────────────────────────────────────
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
      
      // Dispose elements
      particlesGeometry.dispose()
      pointsMaterial.dispose()
      lineGeometry.dispose()
      lineMaterial.dispose()
      geomTemplates.forEach(g => g.dispose())
      polyhedra.forEach(({ mat }) => mat.dispose())
      renderer.dispose()
    }
  }, [location.pathname])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: -50,
        display: 'block'
      }}
    />
  )
}
