import * as THREE from 'three'
import { flower, mesh, toon } from './buddy'

interface Item {
  group: THREE.Group
  level: number
  pop: number
}

const ball = new THREE.SphereGeometry(1, 20, 14)
const easeOutBack = (x: number) => 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2)

function flowers() {
  const g = new THREE.Group()
  const spots: [number, number, string][] = [
    [-1.55, 1.05, '#f7b1a4'], [-1.25, 1.42, '#f6eaa2'], [-1.85, 0.72, '#e5484d'],
    [0.62, 1.72, '#f6eaa2'], [-0.55, 1.78, '#f7b1a4'], [1.95, 0.25, '#e5484d'], [-2.05, -0.3, '#ffffff'],
  ]
  const stem = toon('#4f9b6e')
  for (const [x, z, colour] of spots) {
    g.add(mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.2, 6), stem, [x, 0.1, z]))
    const f = flower(colour, '#ff941f', 0.075)
    f.position.set(x, 0.22, z)
    f.rotation.x = -1.1
    g.add(f)
  }
  return g
}

function stones() {
  const g = new THREE.Group()
  const mat = toon('#dfe7dd')
  const path: [number, number][] = [[0.18, 1.08], [-0.12, 1.42], [0.16, 1.76], [-0.08, 2.1]]
  for (const [x, z] of path) g.add(mesh(ball, mat, [x, 0.015, z], [0.17, 0.035, 0.13]))
  return g
}

function tree() {
  const g = new THREE.Group()
  g.position.set(-1.72, 0, -0.42)
  g.add(mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.72, 10), toon('#9a6b4a'), [0, 0.36, 0]))
  const leaves = toon('#57b98a')
  g.add(mesh(ball, leaves, [0, 0.98, 0], [0.47, 0.44, 0.47]))
  g.add(mesh(ball, toon('#74cfa3'), [-0.24, 0.84, 0.16], [0.3, 0.28, 0.3]))
  g.add(mesh(ball, toon('#74cfa3'), [0.27, 0.86, 0.06], [0.28, 0.26, 0.28]))
  return g
}

function palm() {
  const g = new THREE.Group()
  g.position.set(1.72, 0, -0.62)
  const bark = toon('#b98d64')
  const trunkPath = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.02, 0.75, 0),
    new THREE.Vector3(-0.2, 1.42, 0.03),
  )
  g.add(mesh(new THREE.TubeGeometry(trunkPath, 14, 0.07, 8), bark))
  const frond = toon('#3fa677')
  for (let i = 0; i < 7; i += 1) {
    const pivot = new THREE.Group()
    pivot.position.set(-0.2, 1.43, 0.03)
    pivot.rotation.y = (i / 7) * Math.PI * 2
    const leaf = mesh(ball, frond, [0.38, -0.08, 0], [0.42, 0.028, 0.095])
    leaf.rotation.z = -0.42
    pivot.add(leaf)
    g.add(pivot)
  }
  const nut = toon('#7a5339')
  for (const [x, z] of [[-0.13, 0.08], [-0.26, 0.09], [-0.2, -0.04]]) {
    g.add(mesh(ball, nut, [x, 1.33, z], [0.065, 0.065, 0.065]))
  }
  return g
}

function pond() {
  const g = new THREE.Group()
  g.position.set(1.33, 0, 1.02)
  g.add(mesh(new THREE.CylinderGeometry(0.62, 0.64, 0.025, 32), toon('#dfe7dd'), [0, 0.008, 0], [1, 1, 0.78], false))
  g.add(mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.03, 32), toon('#7fd3e6'), [0, 0.016, 0], [1, 1, 0.78], false))
  const pad = toon('#4fae7f')
  for (const [x, z] of [[-0.18, 0.08], [0.2, -0.1]]) {
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 16), pad, [x, 0.04, z], [1, 1, 1], false))
  }
  const lily = flower('#f7b1a4', '#f6eaa2', 0.05)
  lily.position.set(-0.18, 0.07, 0.08)
  lily.rotation.x = -Math.PI / 2
  g.add(lily)
  return g
}

function house() {
  const g = new THREE.Group()
  g.position.set(-0.72, 0, -1.48)
  g.rotation.y = 0.28
  const wood = toon('#b98d64')
  for (const x of [-0.42, 0.42]) {
    for (const z of [-0.28, 0.28]) {
      g.add(mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.34, 8), wood, [x, 0.17, z]))
    }
  }
  g.add(mesh(new THREE.BoxGeometry(1.05, 0.05, 0.76), toon('#9a6b4a'), [0, 0.35, 0]))
  g.add(mesh(new THREE.BoxGeometry(0.88, 0.42, 0.6), toon('#f4dfc6'), [0, 0.58, 0]))
  const roofShape = new THREE.Shape()
  roofShape.moveTo(-0.62, 0)
  roofShape.lineTo(0, 0.48)
  roofShape.lineTo(0.62, 0)
  roofShape.closePath()
  const roof = mesh(new THREE.ExtrudeGeometry(roofShape, { depth: 0.84, bevelEnabled: false }), toon('#c9604f'), [0, 0.79, -0.42])
  g.add(roof)
  g.add(mesh(new THREE.BoxGeometry(0.17, 0.3, 0.02), toon('#7a5339'), [0, 0.52, 0.305]))
  for (const x of [-0.29, 0.29]) g.add(mesh(new THREE.BoxGeometry(0.15, 0.14, 0.02), toon('#8fdcec'), [x, 0.62, 0.305]))
  return g
}

function butterfly(colour: string) {
  const g = new THREE.Group()
  const wing = toon(colour, { side: THREE.DoubleSide })
  const geo = new THREE.CircleGeometry(0.075, 12)
  const left = new THREE.Group()
  const right = new THREE.Group()
  left.add(mesh(geo, wing, [-0.07, 0, 0], [1, 1.25, 1], false))
  right.add(mesh(geo, wing, [0.07, 0, 0], [1, 1.25, 1], false))
  g.add(left, right, mesh(ball, toon('#44345f'), [0, 0, 0], [0.012, 0.055, 0.012], false))
  g.userData = { left, right }
  return g
}

function lanterns() {
  const g = new THREE.Group()
  const spots: [number, number][] = [[-2.08, 0.42], [2.12, 0.62], [0.82, -1.92], [-0.98, 1.9]]
  const glow = new THREE.MeshBasicMaterial({ color: '#ffd76a' })
  for (const [x, z] of spots) {
    g.add(mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.42, 6), toon('#7a5339'), [x, 0.21, z]))
    g.add(mesh(ball, glow, [x, 0.5, z], [0.075, 0.095, 0.075], false))
    g.add(mesh(new THREE.ConeGeometry(0.1, 0.06, 10), toon('#c9604f'), [x, 0.61, z]))
  }
  return g
}

function rainbow() {
  const g = new THREE.Group()
  g.position.set(0, 0, -1.72)
  const colours = ['#f58f8a', '#f9bd77', '#f6eaa2', '#9fe2b7', '#9ad8ee', '#b9a8e8']
  colours.forEach((colour, i) => {
    const material = new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.82 })
    g.add(mesh(new THREE.TorusGeometry(2.32 - i * 0.075, 0.04, 8, 64, Math.PI), material, [0, 0, 0], [1, 1, 1], false))
  })
  return g
}

export class Island {
  readonly group = new THREE.Group()
  private readonly items: Item[] = []
  private readonly butterflies: THREE.Group[] = []

  constructor() {
    const grass = mesh(new THREE.CylinderGeometry(2.46, 2.34, 0.24, 56), toon('#a8e6c1'), [0, -0.12, 0])
    grass.receiveShadow = true
    grass.castShadow = false
    const soil = mesh(new THREE.CylinderGeometry(2.34, 0.82, 0.92, 28, 3), toon('#edc7a4'), [0, -0.7, 0])
    const tip = mesh(ball, toon('#d8a981'), [0, -1.14, 0], [0.82, 0.14, 0.82], false)
    this.group.add(grass, soil, tip)

    const tufts = toon('#79d3a4')
    for (const [x, z] of [[-1, 0.9], [1.05, 0.2], [0.75, -1.15], [-1.9, 1.2], [1.9, -1.1]]) {
      const tuft = mesh(ball, tufts, [x, 0.035, z], [0.17, 0.08, 0.14], false)
      tuft.receiveShadow = true
      this.group.add(tuft)
    }

    this.add(2, flowers())
    this.add(3, stones())
    this.add(4, tree())
    this.add(5, palm())
    this.add(6, pond())
    this.add(7, house())
    const flutter = new THREE.Group()
    for (const colour of ['#ff941f', '#f7b1a4', '#b9a8e8']) {
      const b = butterfly(colour)
      this.butterflies.push(b)
      flutter.add(b)
    }
    this.add(8, flutter)
    this.add(9, lanterns())
    this.add(10, rainbow())
  }

  private add(level: number, group: THREE.Group) {
    group.visible = false
    this.items.push({ group, level, pop: 1 })
    this.group.add(group)
  }

  setLevel(level: number, animate: boolean) {
    for (const item of this.items) {
      const show = level >= item.level
      if (show && !item.group.visible && animate) {
        item.pop = 0
        item.group.scale.setScalar(0.001)
      }
      item.group.visible = show
    }
  }

  update(dt: number, t: number) {
    for (const item of this.items) {
      if (item.group.visible && item.pop < 1) {
        item.pop = Math.min(1, item.pop + dt * 1.6)
        item.group.scale.setScalar(Math.max(0.001, easeOutBack(item.pop)))
      }
    }
    this.butterflies.forEach((b, i) => {
      const a = t * (0.42 + i * 0.09) + i * 2.1
      const r = 1.3 + Math.sin(t * 0.3 + i) * 0.25
      b.position.set(Math.cos(a) * r, 1.15 + Math.sin(t * 1.4 + i) * 0.26, Math.sin(a) * r)
      b.rotation.y = -a
      const flap = Math.sin(t * 15 + i) * 0.95
      b.userData.left.rotation.y = flap
      b.userData.right.rotation.y = -flap
    })
  }
}
