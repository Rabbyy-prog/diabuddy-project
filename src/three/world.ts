import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Buddy, type Mood } from './buddy'
import { Island } from './island'

const MODEL_URL = '/models/buddy.glb'
const BUDDY_SCALE = 0.8
const CONFETTI = ['#13795e', '#7ad9b1', '#f6eaa2', '#f7b1a4', '#ff941f', '#b9a8e8']

interface Spark {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  life: number
}

/** Uses the team's GLB when one is present. A missing file is the normal case. */
async function loadCustomModel(buddy: Buddy, isAlive: () => boolean) {
  try {
    const head = await fetch(MODEL_URL, { method: 'HEAD' })
    const type = head.headers.get('content-type') ?? ''
    if (!head.ok || type.includes('text/html')) return
    const gltf = await new GLTFLoader().loadAsync(MODEL_URL)
    if (isAlive()) buddy.useModel(gltf)
  } catch (error) {
    console.warn('Could not load buddy.glb, using the built-in buddy.', error)
  }
}

export class BuddyWorld {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50)
  private readonly world = new THREE.Group()
  private readonly buddy = new Buddy()
  private readonly island = new Island()
  private readonly clock = new THREE.Clock()
  private readonly sparks: Spark[] = []
  private readonly sparkGeo = new THREE.BoxGeometry(0.07, 0.07, 0.015)
  private readonly sparkMats = CONFETTI.map((color) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }))
  private readonly resize: ResizeObserver
  private readonly visibility: IntersectionObserver
  private onScreen = true
  private alive = true
  private spinTarget = -0.16
  private dragX: number | null = null
  private dragMoved = 0

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.scene.add(new THREE.HemisphereLight('#ffffff', '#9fd8bd', 1.55))
    const sun = new THREE.DirectionalLight('#fff3dc', 1.45)
    sun.position.set(1.6, 8, 3)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -3.5
    sun.shadow.camera.right = 3.5
    sun.shadow.camera.top = 3.5
    sun.shadow.camera.bottom = -3.5
    sun.shadow.radius = 5
    sun.shadow.bias = -0.0015
    this.scene.add(sun)

    this.buddy.group.position.set(0, 1.18 * BUDDY_SCALE, 0.12)
    this.buddy.group.scale.setScalar(BUDDY_SCALE)
    this.world.add(this.island.group, this.buddy.group)
    this.world.rotation.y = this.spinTarget
    this.scene.add(this.world)

    this.resize = new ResizeObserver(() => this.fit())
    this.resize.observe(canvas.parentElement ?? canvas)
    this.visibility = new IntersectionObserver(([entry]) => {
      this.onScreen = entry.isIntersecting
    })
    this.visibility.observe(canvas)
    canvas.addEventListener('pointerdown', this.onDown)
    canvas.addEventListener('pointermove', this.onMove)
    canvas.addEventListener('pointerup', this.onUp)
    canvas.addEventListener('pointercancel', this.onUp)

    this.fit()
    this.renderer.setAnimationLoop(this.frame)
    void loadCustomModel(this.buddy, () => this.alive)
  }

  private fit() {
    const parent = this.canvas.parentElement
    const width = Math.max(parent?.clientWidth ?? 320, 1)
    const height = Math.max(parent?.clientHeight ?? 280, 1)
    this.renderer.setSize(width, height, false)
    const aspect = width / height
    this.camera.aspect = aspect
    const halfFov = THREE.MathUtils.degToRad(this.camera.fov / 2)
    const distanceForHeight = 2.02 / Math.tan(halfFov)
    const distanceForWidth = 2.68 / (Math.tan(halfFov) * aspect)
    const distance = Math.max(distanceForHeight, distanceForWidth)
    this.camera.position.set(0, 1.55 + distance * 0.16, distance)
    this.camera.lookAt(0, 0.62, 0)
    this.camera.updateProjectionMatrix()
  }

  private readonly onDown = (event: PointerEvent) => {
    this.dragX = event.clientX
    this.dragMoved = 0
    this.canvas.setPointerCapture(event.pointerId)
  }

  private readonly onMove = (event: PointerEvent) => {
    if (this.dragX === null) return
    const dx = event.clientX - this.dragX
    this.dragX = event.clientX
    this.dragMoved += Math.abs(dx)
    this.spinTarget += dx * 0.012
  }

  private readonly onUp = () => {
    if (this.dragX !== null && this.dragMoved < 6) this.buddy.wave()
    this.dragX = null
  }

  private readonly frame = () => {
    if (!this.onScreen || document.hidden) {
      this.clock.getDelta()
      return
    }
    const dt = Math.min(this.clock.getDelta(), 0.05)
    const t = this.clock.elapsedTime
    this.world.rotation.y += (this.spinTarget - this.world.rotation.y) * Math.min(1, dt * 7)
    this.buddy.update(dt, t)
    this.island.update(dt, t)
    this.updateSparks(dt)
    this.renderer.render(this.scene, this.camera)
  }

  private updateSparks(dt: number) {
    for (let i = this.sparks.length - 1; i >= 0; i -= 1) {
      const spark = this.sparks[i]
      spark.life -= dt
      spark.velocity.y -= 4.6 * dt
      spark.mesh.position.addScaledVector(spark.velocity, dt)
      spark.mesh.rotation.x += dt * 8
      spark.mesh.rotation.y += dt * 6
      if (spark.life <= 0) {
        this.scene.remove(spark.mesh)
        this.sparks.splice(i, 1)
      }
    }
  }

  private burst(count: number) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    for (let i = 0; i < count; i += 1) {
      const material = this.sparkMats[i % this.sparkMats.length]
      const spark = new THREE.Mesh(this.sparkGeo, material)
      spark.position.set(0, 1.25, 0.2)
      const angle = Math.random() * Math.PI * 2
      const speed = 1.1 + Math.random() * 1.9
      const velocity = new THREE.Vector3(Math.cos(angle) * speed, 2 + Math.random() * 2.2, Math.sin(angle) * speed * 0.6)
      this.scene.add(spark)
      this.sparks.push({ mesh: spark, velocity, life: 1.1 + Math.random() * 0.6 })
    }
  }

  setLevel(level: number, animate: boolean) {
    this.island.setLevel(level, animate)
  }

  setOutfit(ids: string[]) {
    this.buddy.setOutfit(ids)
  }

  setMood(mood: Mood) {
    this.buddy.setMood(mood)
  }

  celebrate(big = false) {
    this.buddy.celebrate()
    this.burst(big ? 70 : 30)
  }

  dispose() {
    this.alive = false
    this.renderer.setAnimationLoop(null)
    this.resize.disconnect()
    this.visibility.disconnect()
    this.canvas.removeEventListener('pointerdown', this.onDown)
    this.canvas.removeEventListener('pointermove', this.onMove)
    this.canvas.removeEventListener('pointerup', this.onUp)
    this.canvas.removeEventListener('pointercancel', this.onUp)
    this.scene.traverse((object) => {
      const item = object as THREE.Mesh
      item.geometry?.dispose?.()
      const materials = Array.isArray(item.material) ? item.material : item.material ? [item.material] : []
      materials.forEach((material) => material.dispose())
    })
    this.sparkGeo.dispose()
    this.sparkMats.forEach((material) => material.dispose())
    this.renderer.dispose()
  }
}
