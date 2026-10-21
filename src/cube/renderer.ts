/**
 * Three.js view of a CubeState. Cubie meshes are snapped from the engine
 * after every turn (never accumulated float rotations), so the picture
 * always matches the model.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  applyMoveMut,
  Axis,
  cloneState,
  CubeState,
  Cubie,
  FaceName,
  homeStickers,
  inLayer,
  Move,
  parseAlg,
  parseMove,
  solvedState,
  Vec3,
} from './engine';
import { MUTED, STICKER_COLORS } from './colors';

export interface CubeViewOptions {
  /** Allow turning layers by dragging. */
  interactive?: boolean;
  /** Milliseconds per quarter turn. */
  speed?: number;
  /** Called after every completed move (user or programmatic). */
  onMove?: (move: string, source: 'user' | 'auto') => void;
}

/** Which cubies keep their colours; the rest are shown grey. */
export type Mask = (home: Vec3) => boolean;

const POSITIVE_MOVE: Record<Axis, Record<number, string>> = {
  0: { [-1]: 'L', 0: 'M', 1: "R'" },
  1: { [-1]: 'D', 0: 'E', 1: "U'" },
  2: { [-1]: 'B', 0: "S'", 1: "F'" },
};

const invert = (t: string) => (t.endsWith("'") ? t.slice(0, -1) : t + "'");

export function moveFor(axis: Axis, layer: number, positive: boolean): string {
  const m = POSITIVE_MOVE[axis][layer];
  return positive ? m : invert(m);
}

let stickerGeometry: THREE.ShapeGeometry | null = null;
function roundedSquare(): THREE.ShapeGeometry {
  if (stickerGeometry) return stickerGeometry;
  const s = 0.42;
  const r = 0.1;
  const shape = new THREE.Shape();
  shape.moveTo(-s + r, -s);
  shape.lineTo(s - r, -s);
  shape.quadraticCurveTo(s, -s, s, -s + r);
  shape.lineTo(s, s - r);
  shape.quadraticCurveTo(s, s, s - r, s);
  shape.lineTo(-s + r, s);
  shape.quadraticCurveTo(-s, s, -s, s - r);
  shape.lineTo(-s, -s + r);
  shape.quadraticCurveTo(-s, -s, -s + r, -s);
  stickerGeometry = new THREE.ShapeGeometry(shape, 4);
  return stickerGeometry;
}

interface CubieMesh {
  group: THREE.Group;
  stickers: { mesh: THREE.Mesh; color: FaceName }[];
}

export class CubeView {
  readonly el: HTMLElement;
  state: CubeState = solvedState();
  speed: number;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private root = new THREE.Group();
  private meshes = new Map<number, CubieMesh>();
  private queue: { move: Move; source: 'user' | 'auto'; resolve?: () => void }[] = [];
  private animating = false;
  private disposed = false;
  private ro: ResizeObserver;
  private mask: Mask | null = null;
  private opts: CubeViewOptions;
  private needsRender = true;
  private raf = 0;

  constructor(container: HTMLElement, opts: CubeViewOptions = {}) {
    this.opts = opts;
    this.speed = opts.speed ?? 220;
    this.el = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.classList.add('cube-canvas');

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    this.camera.position.set(5.2, 5.0, 7.4);
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.enableZoom = false;
    this.controls.enableDamping = true;
    this.controls.rotateSpeed = 0.7;
    this.controls.addEventListener('change', () => (this.needsRender = true));

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(4, 8, 6);
    this.scene.add(key);
    this.scene.add(this.root);

    this.buildMeshes();
    this.snap();

    if (opts.interactive !== false) this.enableDrag();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
    const loop = () => {
      if (this.disposed) return;
      this.raf = requestAnimationFrame(loop);
      const moved = this.controls.update();
      if (moved || this.needsRender || this.animating) {
        this.renderer.render(this.scene, this.camera);
        this.needsRender = false;
      }
    };
    loop();
  }

  private buildMeshes() {
    const body = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.6, metalness: 0.05 });
    const box = new THREE.BoxGeometry(0.98, 0.98, 0.98);
    for (const c of this.state.cubies) {
      const group = new THREE.Group();
      group.add(new THREE.Mesh(box, body));
      const stickers: CubieMesh['stickers'] = [];
      for (const hs of homeStickers(c)) {
        const mat = new THREE.MeshStandardMaterial({ color: STICKER_COLORS[hs.color], roughness: 0.35 });
        const m = new THREE.Mesh(roundedSquare(), mat);
        const n = new THREE.Vector3(...hs.normal);
        m.position.copy(n.clone().multiplyScalar(0.495));
        m.lookAt(n.clone().multiplyScalar(2));
        m.userData.cubie = c.id;
        group.add(m);
        stickers.push({ mesh: m, color: hs.color });
      }
      group.userData.cubie = c.id;
      this.root.add(group);
      this.meshes.set(c.id, { group, stickers });
    }
  }

  private snap() {
    const m4 = new THREE.Matrix4();
    for (const c of this.state.cubies) {
      const mesh = this.meshes.get(c.id)!;
      const r = c.rot;
      m4.set(r[0], r[1], r[2], 0, r[3], r[4], r[5], 0, r[6], r[7], r[8], 0, 0, 0, 0, 1);
      mesh.group.quaternion.setFromRotationMatrix(m4);
      mesh.group.position.set(c.pos[0], c.pos[1], c.pos[2]);
    }
    this.needsRender = true;
  }

  private resize() {
    const w = this.el.clientWidth || 300;
    const h = this.el.clientHeight || 300;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Keep the whole cube in view on narrow aspect ratios.
    this.camera.fov = w < h ? 32 * (h / w) * 0.9 : 32;
    this.camera.updateProjectionMatrix();
    this.needsRender = true;
  }

  /** Grey out cubies the lesson isn't about. Pass null to show all colours. */
  setMask(mask: Mask | null) {
    this.mask = mask;
    for (const c of this.state.cubies) {
      const mesh = this.meshes.get(c.id)!;
      const on = !mask || mask(c.home);
      for (const s of mesh.stickers)
        (s.mesh.material as THREE.MeshStandardMaterial).color.set(on ? STICKER_COLORS[s.color] : MUTED);
    }
    this.needsRender = true;
  }

  getMask() {
    return this.mask;
  }

  /** Replace the state immediately (cancels pending animation). */
  setState(s: CubeState) {
    this.queue.forEach((q) => q.resolve?.());
    this.queue = [];
    this.state = cloneState(s);
    this.snap();
  }

  reset() {
    this.setState(solvedState());
  }

  resetView() {
    this.camera.position.set(5.2, 5.0, 7.4);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.needsRender = true;
  }

  /** Animate an algorithm. Resolves when every move has finished. */
  play(alg: string, source: 'user' | 'auto' = 'auto'): Promise<void> {
    const moves = parseAlg(alg);
    if (!moves.length) return Promise.resolve();
    return new Promise((resolve) => {
      moves.forEach((move, i) => this.queue.push({ move, source, resolve: i === moves.length - 1 ? resolve : undefined }));
      this.pump();
    });
  }

  turn(token: string, source: 'user' | 'auto' = 'user') {
    return this.play(parseMove(token).name, source);
  }

  get busy() {
    return this.animating || this.queue.length > 0;
  }

  private pump() {
    if (this.animating || this.disposed) return;
    const next = this.queue.shift();
    if (!next) return;
    this.animating = true;
    const { move } = next;
    const pivot = new THREE.Group();
    this.root.add(pivot);
    const affected = this.state.cubies.filter((c: Cubie) => inLayer(c, move));
    for (const c of affected) pivot.attach(this.meshes.get(c.id)!.group);
    const target = (move.quarter === 3 ? -1 : move.quarter) * (Math.PI / 2);
    const duration = this.speed * (move.quarter === 2 ? 1.5 : 1);
    const start = performance.now();
    const axisKey = (['x', 'y', 'z'] as const)[move.axis];
    const step = (now: number) => {
      if (this.disposed) return;
      const t = duration <= 0 ? 1 : Math.min(1, (now - start) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      pivot.rotation[axisKey] = target * eased;
      this.needsRender = true;
      if (t < 1) {
        requestAnimationFrame(step);
        return;
      }
      for (const c of affected) this.root.attach(this.meshes.get(c.id)!.group);
      this.root.remove(pivot);
      applyMoveMut(this.state, move);
      this.snap();
      this.animating = false;
      this.opts.onMove?.(move.name, next.source);
      next.resolve?.();
      this.pump();
    };
    requestAnimationFrame(step);
  }

  private enableDrag() {
    const canvas = this.renderer.domElement;
    const ray = new THREE.Raycaster();
    let drag: { x: number; y: number; point: THREE.Vector3; normal: THREE.Vector3; cubie: number; pointerId: number } | null = null;

    const ndc = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    const toScreen = (v: THREE.Vector3) => {
      const p = v.clone().project(this.camera);
      const r = canvas.getBoundingClientRect();
      return new THREE.Vector2(((p.x + 1) / 2) * r.width, ((1 - p.y) / 2) * r.height);
    };

    canvas.addEventListener(
      'pointerdown',
      (e) => {
        ray.setFromCamera(ndc(e), this.camera);
        const hits = ray.intersectObjects(this.root.children, true);
        const hit = hits.find((h) => h.object.parent?.userData.cubie !== undefined && h.face);
        if (!hit || !hit.face) {
          this.controls.enabled = true;
          return;
        }
        this.controls.enabled = false;
        const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
        const abs = [Math.abs(normal.x), Math.abs(normal.y), Math.abs(normal.z)];
        const a = abs.indexOf(Math.max(...abs));
        const n = new THREE.Vector3();
        n.setComponent(a, Math.sign(normal.getComponent(a)));
        drag = { x: e.clientX, y: e.clientY, point: hit.point.clone(), normal: n, cubie: hit.object.parent!.userData.cubie, pointerId: e.pointerId };
        canvas.setPointerCapture(e.pointerId);
      },
      { capture: true },
    );

    canvas.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const d = new THREE.Vector2(e.clientX - drag.x, e.clientY - drag.y);
      if (d.length() < 12) return;
      d.normalize();
      let best: { axis: Axis; score: number; positive: boolean } | null = null;
      for (const axis of [0, 1, 2] as Axis[]) {
        if (Math.abs(drag.normal.getComponent(axis)) > 0.5) continue;
        const ax = new THREE.Vector3();
        ax.setComponent(axis, 1);
        const vel = ax.clone().cross(drag.point);
        const sv = toScreen(drag.point.clone().add(vel.multiplyScalar(0.3))).sub(toScreen(drag.point));
        if (sv.length() < 1e-6) continue;
        const dot = sv.normalize().dot(d);
        if (!best || Math.abs(dot) > best.score) best = { axis, score: Math.abs(dot), positive: dot > 0 };
      }
      const cubie = this.state.cubies.find((c) => c.id === drag!.cubie)!;
      drag = null;
      if (!best || this.queue.length > 2) return;
      this.turn(moveFor(best.axis, cubie.pos[best.axis], best.positive), 'user');
    });

    const end = () => {
      drag = null;
      this.controls.enabled = true;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) (o.material as THREE.Material).dispose();
    });
  }
}

/** Keyboard layout for the playground: letter = clockwise, Shift = counter-clockwise. */
export const KEY_MOVES: Record<string, string> = {
  r: 'R', l: 'L', u: 'U', d: 'D', f: 'F', b: 'B', m: 'M', e: 'E', s: 'S', x: 'x', y: 'y', z: 'z',
};

export function keyToMove(e: KeyboardEvent): string | null {
  const base = KEY_MOVES[e.key.toLowerCase()];
  if (!base) return null;
  return e.shiftKey ? base + "'" : base;
}
