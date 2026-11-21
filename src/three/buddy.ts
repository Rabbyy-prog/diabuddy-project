import * as THREE from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

export type Mood = 'happy' | 'concerned' | 'celebrate'

const INK = '#163f38'
let gradient: THREE.DataTexture | null = null

function toonGradient() {
  if (!gradient) {
    gradient = new THREE.DataTexture(new Uint8Array([130, 190, 232, 255]), 4, 1, THREE.RedFormat)
    gradient.minFilter = THREE.NearestFilter
    gradient.magFilter = THREE.NearestFilter
    gradient.needsUpdate = true
  }
  return gradient
}

export const toon = (color: THREE.ColorRepresentation, extra: THREE.MeshToonMaterialParameters = {}) =>
  new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), ...extra })

export function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1],
  shadow = true,
) {
  const m = new THREE.Mesh(geometry, material)
  m.position.set(...position)
  m.scale.set(...scale)
  m.castShadow = shadow
  return m
}

const sphere = new THREE.SphereGeometry(1, 32, 24)

function bodyGeometry() {
  const geo = new THREE.SphereGeometry(1, 56, 40)
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const top = new THREE.Color('#baf6d8')
  const mid = new THREE.Color('#7ad9b1')
  const low = new THREE.Color('#4bb38f')
  const c = new THREE.Color()
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i)
    const widen = 1 + 0.1 * ((1 - y) / 2)
    pos.setXYZ(i, pos.getX(i) * 0.82 * widen, y, pos.getZ(i) * 0.78 * widen)
    const t = (y + 1) / 2
    if (t > 0.5) c.lerpColors(mid, top, (t - 0.5) * 2)
    else c.lerpColors(low, mid, t * 2)
    c.toArray(colors, i * 3)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  return geo
}

function curve(points: [number, number][], radius: number, material: THREE.Material) {
  const [a, b, c] = points.map(([x, y]) => new THREE.Vector3(x, y, 0))
  const geo = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, b, c), 16, radius, 8)
  const m = new THREE.Mesh(geo, material)
  for (const p of [a, c]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 8), material)
    cap.position.copy(p)
    m.add(cap)
  }
  return m
}

function heartShape(size: number) {
  const s = new THREE.Shape()
  s.moveTo(0, -size)
  s.bezierCurveTo(-size * 1.5, -size * 0.1, -size * 0.8, size * 0.95, 0, size * 0.32)
  s.bezierCurveTo(size * 0.8, size * 0.95, size * 1.5, -size * 0.1, 0, -size)
  return s
}

function leafGeometry() {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.bezierCurveTo(0.14, 0.05, 0.28, 0.16, 0.34, 0.3)
  s.bezierCurveTo(0.18, 0.3, 0.03, 0.2, 0, 0)
  return new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 })
}

export function flower(petal: THREE.ColorRepresentation, center: THREE.ColorRepresentation, size = 0.1) {
  const group = new THREE.Group()
  const petalMat = toon(petal)
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2
    group.add(mesh(sphere, petalMat, [Math.cos(a) * size, Math.sin(a) * size, 0], [size * 0.85, size * 0.68, size * 0.26]).rotateZ(a))
  }
  group.add(mesh(sphere, toon(center), [0, 0, size * 0.2], [size * 0.34, size * 0.34, size * 0.34]))
  return group
}

function batikTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 32
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#44345f'
  ctx.fillRect(0, 0, 256, 32)
  for (let x = 8; x < 256; x += 32) {
    ctx.fillStyle = '#f6eaa2'
    ctx.beginPath()
    ctx.ellipse(x, 16, 7, 11, Math.PI / 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ff941f'
    ctx.beginPath()
    ctx.arc(x + 16, 16, 4, 0, Math.PI * 2)
    ctx.fill()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2.5, 2)
  return texture
}

function buildAccessory(id: string) {
  const g = new THREE.Group()
  g.name = id
  if (id === 'hibiscus') {
    const f = flower('#e5484d', '#f6c945', 0.13)
    f.position.set(0.46, 0.68, 0.42)
    f.lookAt(1.4, 1.7, 1.6)
    g.add(f)
  } else if (id === 'specs') {
    const frame = toon('#44345f')
    const ring = new THREE.TorusGeometry(0.125, 0.017, 10, 32)
    g.add(mesh(ring, frame, [-0.2, 0.4, 0.85], [1, 1, 1], false), mesh(ring, frame, [0.2, 0.4, 0.85], [1, 1, 1], false))
    const bridge = new THREE.CapsuleGeometry(0.015, 0.11, 4, 8)
    g.add(mesh(bridge, frame, [0, 0.42, 0.87], [1, 1, 1], false).rotateZ(Math.PI / 2))
  } else if (id === 'scarf') {
    const mat = toon('#ffffff', { map: batikTexture() })
    const ring = mesh(new THREE.TorusGeometry(0.86, 0.085, 14, 56), mat, [0, -0.14, 0], [1, 0.95, 1])
    ring.rotation.x = Math.PI / 2
    const tail = mesh(new THREE.CapsuleGeometry(0.08, 0.26, 6, 12), toon('#44345f'), [0.42, -0.36, 0.72], [1.2, 1, 0.4])
    tail.rotation.z = 0.2
    g.add(ring, tail)
  } else if (id === 'hat') {
    const straw = toon('#edc7a4')
    const brim = mesh(new THREE.CylinderGeometry(0.78, 0.82, 0.04, 40), straw, [0, 0.86, 0])
    const dome = mesh(new THREE.SphereGeometry(0.46, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), straw, [0, 0.86, 0], [1, 0.78, 1])
    const band = mesh(new THREE.CylinderGeometry(0.465, 0.47, 0.09, 40, 1, true), toon('#13795e'), [0, 0.92, 0])
    g.add(brim, dome, band)
    g.rotation.set(0.08, 0, -0.07)
  } else if (id === 'crown') {
    const ring = mesh(new THREE.TorusGeometry(0.53, 0.03, 8, 40), toon('#4f9b6e'), [0, 0.78, 0])
    ring.rotation.x = Math.PI / 2
    g.add(ring)
    const colours = ['#f7b1a4', '#f6eaa2', '#e5484d', '#ffffff']
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2
      const f = flower(colours[i % colours.length], '#ff941f', 0.075)
      f.position.set(Math.cos(a) * 0.54, 0.81, Math.sin(a) * 0.54)
      f.lookAt(Math.cos(a) * 2, 1.5, Math.sin(a) * 2)
      g.add(f)
    }
  }
  return g
}

const reduceMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export class Buddy {
  readonly group = new THREE.Group()
  private readonly rig = new THREE.Group()
  private readonly built = new THREE.Group()
  private readonly accessories = new THREE.Group()
  private readonly antenna = new THREE.Group()
  private readonly armL = new THREE.Group()
  private readonly armR = new THREE.Group()
  private readonly eyes: THREE.Mesh[] = []
  private readonly happyEyes = new THREE.Group()
  private readonly mouths: Record<Mood, THREE.Object3D>
  private mood: Mood = 'happy'
  private celebrateT = 0
  private waveT = 0
  private blinkAt = 2
  private mixer: THREE.AnimationMixer | null = null
  private cheer: THREE.AnimationAction | null = null
  private idle: THREE.AnimationAction | null = null

  constructor() {
    this.group.add(this.rig)
    this.rig.add(this.built, this.accessories)

    const body = mesh(bodyGeometry(), toon('#ffffff', { vertexColors: true }))
    const face = mesh(sphere, toon('#e7fff0'), [0, 0.34, 0.62], [0.62, 0.44, 0.2], false)

    const ink = toon(INK)
    for (const x of [-0.2, 0.2]) {
      const eye = mesh(sphere, ink, [x, 0.41, 0.805], [0.055, 0.1, 0.035], false)
      this.eyes.push(eye)
      this.built.add(eye)
      const arc = curve([[-0.07, -0.02], [0, 0.09], [0.07, -0.02]], 0.017, ink)
      arc.position.set(x, 0.4, 0.835)
      this.happyEyes.add(arc)
    }
    this.happyEyes.visible = false

    const cheek = toon('#f7b1a4', { transparent: true, opacity: 0.8 })
    const cheeks = [-0.38, 0.38].map((x) => mesh(sphere, cheek, [x, 0.27, 0.77], [0.09, 0.05, 0.022], false))

    const smile = curve([[-0.1, 0.02], [0, -0.11], [0.1, 0.02]], 0.016, ink)
    smile.position.set(0, 0.25, 0.825)
    const worry = curve([[-0.08, -0.025], [0, 0.045], [0.08, -0.025]], 0.016, ink)
    worry.position.set(0, 0.21, 0.83)
    const openShape = new THREE.Shape()
    openShape.moveTo(-0.11, 0)
    openShape.quadraticCurveTo(0, -0.24, 0.11, 0)
    openShape.quadraticCurveTo(0, 0.025, -0.11, 0)
    const open = new THREE.Mesh(new THREE.ShapeGeometry(openShape), ink)
    open.position.set(0, 0.28, 0.826)
    this.mouths = { happy: smile, concerned: worry, celebrate: open }

    const heartGeo = new THREE.ExtrudeGeometry(heartShape(0.15), { depth: 0.04, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3 })
    const heart = mesh(heartGeo, toon('#e9fff2'), [0, -0.5, 0.7], [1, 1, 1], false)
    heart.rotation.x = 0.14

    const armGeo = new THREE.CapsuleGeometry(0.15, 0.36, 8, 16)
    const armMat = toon('#7fdcb6')
    for (const [pivot, side] of [[this.armL, -1], [this.armR, 1]] as const) {
      pivot.position.set(side * 0.74, 0.02, 0.08)
      pivot.add(mesh(armGeo, armMat, [0, -0.28, 0]))
      this.built.add(pivot)
    }

    const footMat = toon('#6ccba6')
    const feet = [-0.38, 0.38].map((x) => {
      const foot = mesh(sphere, footMat, [x, -0.98, 0.24], [0.36, 0.2, 0.46])
      foot.rotation.y = x * 0.5
      return foot
    })

    const stem = mesh(new THREE.CapsuleGeometry(0.045, 0.25, 6, 10), toon('#65c69f'), [0, 0.16, 0])
    const leaf = mesh(leafGeometry(), toon('#f6eaa2'), [-0.02, 0.3, -0.02])
    this.antenna.position.set(0, 0.93, 0)
    this.antenna.rotation.z = -0.22
    this.antenna.add(stem, leaf)

    this.built.add(body, face, ...cheeks, heart, ...feet, this.antenna, this.happyEyes, smile, worry, open)
    this.applyMood()
  }

  private applyMood() {
    for (const [mood, mouth] of Object.entries(this.mouths)) mouth.visible = mood === this.mood
    const joyful = this.mood === 'celebrate'
    this.happyEyes.visible = joyful
    this.eyes.forEach((eye, i) => {
      eye.visible = !joyful
      eye.rotation.z = this.mood === 'concerned' ? (i === 0 ? -0.24 : 0.24) : 0
    })
  }

  setMood(mood: Mood) {
    this.mood = mood
    this.applyMood()
  }

  setOutfit(ids: string[]) {
    this.accessories.traverse((object) => {
      const item = object as THREE.Mesh
      if (!item.isMesh) return
      if (item.geometry !== sphere) item.geometry.dispose()
      const material = item.material as THREE.MeshToonMaterial
      material.map?.dispose()
      material.dispose()
    })
    this.accessories.clear()
    ids.forEach((id) => this.accessories.add(buildAccessory(id)))
    this.antenna.visible = !ids.includes('hat')
  }

  celebrate() {
    this.celebrateT = 1.5
    if (this.cheer && this.idle) {
      this.cheer.reset().fadeIn(0.15).play()
      this.idle.fadeOut(0.15)
      window.setTimeout(() => {
        this.cheer?.fadeOut(0.25)
        this.idle?.reset().fadeIn(0.25).play()
      }, 1500)
    }
  }

  wave() {
    this.waveT = 1.3
  }

  /** Replaces the built-in character with a loaded GLB, sized to fit the same space. */
  useModel(gltf: GLTF) {
    const model = gltf.scene
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const scale = 2.4 / Math.max(size.y, 0.001)
    model.scale.multiplyScalar(scale)
    model.position.set(-center.x * scale, -1.18 - box.min.y * scale, -center.z * scale)
    model.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true
    })
    this.built.visible = false
    this.rig.add(model)
    if (gltf.animations.length) {
      this.mixer = new THREE.AnimationMixer(model)
      const find = (pattern: RegExp) => gltf.animations.find((clip) => pattern.test(clip.name))
      const idleClip = find(/idle/i) ?? gltf.animations[0]
      this.idle = this.mixer.clipAction(idleClip).play()
      const cheerClip = find(/celebrate|happy|jump|dance/i)
      if (cheerClip) {
        this.cheer = this.mixer.clipAction(cheerClip)
        this.cheer.setLoop(THREE.LoopOnce, 1)
      }
    }
  }

  update(dt: number, t: number) {
    this.mixer?.update(dt)
    const still = reduceMotion()
    this.celebrateT = Math.max(0, this.celebrateT - dt)
    this.waveT = Math.max(0, this.waveT - dt)

    const bob = still ? 0 : Math.sin(t * 1.7) * 0.025
    const squash = still ? 0 : Math.sin(t * 1.7 + 0.8) * 0.012
    let hop = 0
    let spin = 0
    let armUp = 0
    if (this.celebrateT > 0) {
      const p = 1 - this.celebrateT / 1.5
      armUp = Math.sin(Math.min(1, p * 5) * Math.PI * 0.5) * (p > 0.85 ? (1 - p) / 0.15 : 1)
      if (!still) {
        hop = Math.abs(Math.sin(p * Math.PI * 3)) * 0.34 * (1 - p * 0.35)
        spin = (p * p * (3 - 2 * p)) * Math.PI * 2
      }
    }
    this.rig.position.y = bob + hop
    this.rig.rotation.y = spin
    this.rig.scale.set(1 + squash, 1 - squash, 1 + squash)

    const sway = still ? 0 : Math.sin(t * 1.7) * 0.05
    this.armL.rotation.z = THREE.MathUtils.lerp(-0.34 - sway, -2.65, armUp)
    let right = THREE.MathUtils.lerp(0.34 + sway, 2.65, armUp)
    if (this.waveT > 0) {
      const fade = Math.min(1, this.waveT * 3, (1.3 - this.waveT) * 6)
      right = THREE.MathUtils.lerp(right, 2.45 + Math.sin(t * 13) * 0.3, fade)
    }
    this.armR.rotation.z = right
    if (!still) this.antenna.rotation.z = -0.22 + Math.sin(t * 2.3) * 0.08

    if (t > this.blinkAt) {
      const phase = t - this.blinkAt
      const open = phase < 0.14 ? Math.abs(phase - 0.07) / 0.07 : 1
      this.eyes.forEach((eye) => (eye.scale.y = 0.1 * Math.max(0.12, open)))
      if (phase >= 0.14) this.blinkAt = t + 2.4 + Math.random() * 3
    }
  }
}
