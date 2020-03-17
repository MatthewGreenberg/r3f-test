import * as THREE from 'three'
import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import {
  Canvas,
  useThree,
  useFrame,
  useLoader,
  extend,
} from 'react-three-fiber'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import { useSpring, a, useTransition } from 'react-spring/three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { SSAOEffect } from 'postprocessing'

extend({
  EffectComposer,
  ShaderPass,
  RenderPass,
  UnrealBloomPass,
  OrbitControls,
})

const Controls = props => {
  const { camera, gl } = useThree()
  const orbitRef = useRef()
  useFrame(() => {
    orbitRef.current.update()
  })
  return (
    <orbitControls {...props} ref={orbitRef} args={[camera, gl.domElement]} />
  )
}

const Plane = props => {
  return (
    <mesh position={[0, -4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeBufferGeometry attach="geometry" args={[1000, 1000]} />
      <meshPhysicalMaterial color="black" attach="material" />
    </mesh>
  )
}

function Box(props) {
  return (
    <a.mesh
      onPointerOver={() => props.set(true)}
      onPointerOut={() => props.set(false)}
      scale={[1, 1, 1]}
      position={[0, 0, 0]}
    >
      <boxBufferGeometry attach="geometry" args={[10, 10, 10]} />
      <meshPhongMaterial
        opacity={0.0}
        transparent={true}
        attach="material"
        color={'pink'}
      />
    </a.mesh>
  )
}

const GameBoy = () => {
  const [model, setModel] = useState()
  const [hovered, set] = useState(false)
  const props = useSpring({
    scale: hovered ? [3.5, 3.5, 3.5] : [3, 3, 3],
  })

  useEffect(() => {
    return new GLTFLoader().load(
      process.env.PUBLIC_URL + '/scene.gltf',
      setModel
    )
  }, [])
  if (!model) {
    return null
  }
  console.log(model)
  return (
    <>
      <Box set={set} />
      <mesh position={[0, -4, 0]}>
        <a.primitive
          castShadow
          recieveShadow
          scale={props.scale}
          object={model.scene}
        />
      </mesh>
    </>
  )
}

function Effect() {
  const composer = useRef()
  const { scene, gl, size, camera } = useThree()
  const aspect = useMemo(() => new THREE.Vector2(size.width, size.height), [
    size,
  ])
  useEffect(() => void composer.current.setSize(size.width, size.height), [
    size,
  ])
  useFrame(() => composer.current.render(), 1)
  return (
    <effectComposer ref={composer} args={[gl]}>
      <renderPass attachArray="passes" scene={scene} camera={camera} />
      <unrealBloomPass attachArray="passes" args={[aspect, 0.4, 0.2, 0.25]} />

      <shaderPass
        attachArray="passes"
        args={[FXAAShader]}
        uniforms-resolution-value={[0.4 / size.width, 1 / size.height]}
        renderToScreen
      />
    </effectComposer>
  )
}

function Particles({ count, mouse }) {
  const mesh = useRef()
  const light = useRef()
  const { size, viewport } = useThree()
  const aspect = size.width / viewport.width

  const dummy = useMemo(() => new THREE.Object3D(), [])
  // Generate some random positions, speed factors and timings
  const particles = useMemo(() => {
    const temp = []
    for (let i = 0; i < count; i++) {
      const t = Math.random() * 60
      const factor = 20 + Math.random() * 100
      const speed = 0.01 + Math.random() / 200
      const xFactor = -50 + Math.random() * 100
      const yFactor = 3 + Math.random() * 10
      const zFactor = -30 + Math.random() * 50
      temp.push({ t, factor, speed, xFactor, yFactor, zFactor, mx: 0, my: 0 })
    }
    return temp
  }, [count])
  // The innards of this hook will run every frame
  useFrame(state => {
    // Makes the light follow the mouse
    light.current.position.set(
      mouse.current[0] / aspect,
      -mouse.current[1] / aspect,
      0
    )
    // Run through the randomized data to calculate some movement
    particles.forEach((particle, i) => {
      let { t, factor, speed, xFactor, yFactor, zFactor } = particle
      // There is no sense or reason to any of this, just messing around with trigonometric functions
      t = particle.t += speed / 2
      const a = Math.cos(t) + Math.sin(t * 1)
      const b = Math.sin(t) + Math.cos(t * 2)
      const s = Math.cos(t)
      particle.mx += (mouse.current[0] - particle.mx) * 0.001
      particle.my += (mouse.current[1] * -1 - particle.my) * 0.001
      // Update the dummy object
      dummy.position.set(
        (particle.mx / 100) * a +
          xFactor +
          Math.cos((t / 10) * factor) +
          (Math.sin(t * 1) * factor) / 10,
        (particle.my / 10) * b +
          yFactor +
          Math.sin((t / 10) * factor) +
          (Math.cos(t * 2) * factor) / 10,
        (particle.my / 10) * b +
          zFactor +
          Math.cos((t / 10) * factor) +
          (Math.sin(t * 3) * factor) / 10
      )
      dummy.scale.set(s, s, s)
      dummy.rotation.set(s * 5, s * 5, s * 5)
      dummy.updateMatrix()
      // And apply the matrix to the instanced item
      mesh.current.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })
  return (
    <>
      <pointLight ref={light} distance={10} intensity={10} color="lightblue" />
      <instancedMesh ref={mesh} args={[null, null, count]}>
        <dodecahedronBufferGeometry attach="geometry" args={[0.2, 0]} />
        <meshPhongMaterial attach="material" color="#777777" />
      </instancedMesh>
    </>
  )
}

function App() {
  const mouse = useRef([0, 0])
  const onMouseMove = useCallback(
    ({ clientX: x, clientY: y }) =>
      (mouse.current = [x - window.innerWidth / 2, y - window.innerHeight / 2]),
    []
  )
  return (
    <>
      <Canvas
        onMouseMove={onMouseMove}
        camera={{
          position: [3, 0, 20],
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true
          gl.shadowMap.type = THREE.PCFSoftShadowMap
        }}
      >
        <fog attach="fog" args={['#000000', 20, 30]} />
        <Controls
          enabledDamping
          enableZoom={false}
          maxPolarAngle={-Math.PI}
          minPolarAngle={Math.PI / 2}
          dampingFactor={0.5}
        />

        <spotLight
          color="blue"
          intensity={2}
          castShadow
          penumbra={1}
          position={[0, 100, 100]}
        />
        <pointLight castShadow position={[0, 10, -15]} intensity={2} />
        <pointLight castShadow position={[-20, 30, 15]} intensity={2} />
        <Particles count={500} mouse={mouse} />
        <spotLight
          color="orange"
          intensity={3}
          castShadow
          penumbra={1}
          position={[-5, 7, 7]}
        />
        <Plane />
        <Effect />
        <GameBoy />
      </Canvas>
    </>
  )
}

export default App
