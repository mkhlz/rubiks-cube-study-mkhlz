/**
 * Three.js view of a CubeState. Cubie meshes are snapped from the engine
 * after every turn (never accumulated float rotations), so the picture
 * always matches the model.
 *
 * Performance notes:
 * - One render loop per view that only runs while something changes
 *   (a turn, orbit damping, a resize) and stops when idle.
 * - The turn tween is advanced inside that loop, time-based, so a slow
 *   frame never slows the cube down and there is no second rAF chain.
 * - Views scrolled off-screen skip rendering (IntersectionObserver).
 * - Shared materials (one per colour), capped pixel ratio, and MSAA only
 *   on low-DPI screens where it is actually visible.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  applyMoveMut,
  Axis,
  cloneState,
  CubeState,
  Cubie,
  FaceName,
  homeStickers,
  inLayer,
  invertToken,
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
  /** Show the move name and a direction arrow during each turn (default true). */
  hints?: boolean;
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

/** Remove adjacent cancelling / merging turns, e.g. "R R'" or "U U" -> "U2". */
export function simplifyMoves(tokens: string[]): string[] {
  const amt = (t: string) => (t.endsWith('2') ? 2 : t.endsWith("'") ? 3 : 1);
  const out: string[] = [];
  for (const t of tokens) {
    const last = out[out.length - 1];
    if (last && last[0] === t[0]) {
      out.pop();
      const n = (amt(last) + amt(t)) % 4;
      if (n) out.push(t[0] + ['', '', '2', "'"][n]);
    } else out.push(t);
  }
  return out;
}

// ---------- shared resources (one set for every view on the page) ----------

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

let bodyGeometry: RoundedBoxGeometry | null = null;
const getBody = () => (bodyGeometry ??= new RoundedBoxGeometry(0.98, 0.98, 0.98, 3, 0.09));

let materials: Record<FaceName | 'muted' | 'body', THREE.Material> | null = null;
function getMaterials() {
  if (materials) return materials;
  const sticker = (c: string) => new THREE.MeshPhongMaterial({ color: c, shininess: 60, specular: 0x222222 });
  materials = {
    U: sticker(STICKER_COLORS.U),
    D: sticker(STICKER_COLORS.D),
    F: sticker(STICKER_COLORS.F),
    B: sticker(STICKER_COLORS.B),
    R: sticker(STICKER_COLORS.R),
    L: sticker(STICKER_COLORS.L),
    muted: sticker(MUTED),
    body: new THREE.MeshPhongMaterial({ color: 0x15171c, shininess: 20, specular: 0x111111 }),
  };
  return materials;
}

const ARROW_COLOR = 0xffd500;

// ---------- easing ----------
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface CubieMesh {
  group: THREE.Group;
  stickers: { mesh: THREE.Mesh; color: FaceName }[];
}

interface Turn {
  move: Move;
  source: 'user' | 'auto';
  resolve?: () => void;
  duration: number;
  start: number;
  pivot: THREE.Group;
  affected: Cubie[];
  target: number;
}

export class CubeView {
  readonly el: HTMLElement;
  state: CubeState = solvedState();
  speed: number;
  /** Moves applied since the last setState(), used to animate a reset. */
  private trail: string[] = [];
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private root = new THREE.Group();
  private meshes = new Map<number, CubieMesh>();
  private queue: { move: Move; source: 'user' | 'auto'; resolve?: () => void; speed?: number }[] = [];
  private turn: Turn | null = null;
  private disposed = false;
  private ro: ResizeObserver;
  private io: IntersectionObserver;
  private visible = true;
  private mask: Mask | null = null;
  private opts: CubeViewOptions;
  private needsRender = true;
  private raf = 0;
  private looping = false;
  private interacting = false;
  private recording = true;
  private hud: HTMLElement | null = null;
  private arrow: THREE.Group | null = null;
  /** Arrow meshes are cached per (move, face) so a turn never builds geometry. */
  private arrowCache = new Map<string, THREE.Group>();
  private arrowMat = new THREE.MeshBasicMaterial({ color: ARROW_COLOR, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
  private arrowOutline = new THREE.MeshBasicMaterial({ color: 0x15130e, transparent: true, opacity: 0, depthTest: false, depthWrite: false });

  constructor(container: HTMLElement, opts: CubeViewOptions = {}) {
    this.opts = opts;
    this.speed = opts.speed ?? 220;
    this.el = container;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer = new THREE.WebGLRenderer({ antialias: dpr < 2, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(dpr);
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.classList.add('cube-canvas');

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    this.camera.position.set(5.2, 5.0, 7.4);
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.enableZoom = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.7;
    this.controls.addEventListener('start', () => {
      this.interacting = true;
      this.kick();
    });
    this.controls.addEventListener('end', () => {
      this.interacting = false;
      this.kick();
    });
    this.controls.addEventListener('change', () => this.kick());

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(4, 8, 6);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.5);
    rim.position.set(-6, -2, -4);
    this.scene.add(rim);
    this.scene.add(this.root);

    this.buildMeshes();
    this.snap();

    if (opts.hints !== false) {
      this.hud = document.createElement('div');
      this.hud.className = 'move-hud';
      this.hud.setAttribute('aria-live', 'polite');
      container.appendChild(this.hud);
    }

    if (opts.interactive !== false) this.enableDrag();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.io = new IntersectionObserver((entries) => {
      this.visible = entries.some((e) => e.isIntersecting);
      if (this.visible) this.kick();
    });
    this.io.observe(container);
    this.resize();
    // Compile shaders up front (incl. the arrow) so the first turn doesn't hitch.
    const warm = this.buildArrow(parseMove('R'));
    this.scene.add(warm);
    this.renderer.compile(this.scene, this.camera);
    this.scene.remove(warm);
    if (import.meta.env.DEV) ((window as any).__cubes ??= []).push(this);
  }

  /** Dev-only: render the frame `t` (0..1) of the way through a turn of `token`. */
  debugFreeze(token: string, t: number) {
    if (!import.meta.env.DEV) return;
    this.queue.push({ move: parseMove(token), source: 'auto' });
    const start = performance.now();
    this.advance(start);
    this.turn!.start = start - t * this.turn!.duration;
    this.disposed = true; // stop the loop so this exact frame stays on screen
    cancelAnimationFrame(this.raf);
    this.advance(start);
    this.renderer.render(this.scene, this.camera);
  }

  /** Start the render loop if it isn't running. It stops itself when idle. */
  private kick() {
    this.needsRender = true;
    if (this.looping || this.disposed) return;
    this.looping = true;
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    if (this.disposed) return;
    this.advance(now);
    const damping = this.controls.update();
    if (this.visible && (this.needsRender || damping || this.turn)) {
      this.renderer.render(this.scene, this.camera);
      this.needsRender = false;
    }
    if (this.turn || this.queue.length || damping || this.interacting || this.needsRender) {
      this.raf = requestAnimationFrame(this.frame);
    } else {
      this.looping = false;
    }
  };

  private buildMeshes() {
    const mats = getMaterials();
    for (const c of this.state.cubies) {
      const group = new THREE.Group();
      group.add(new THREE.Mesh(getBody(), mats.body));
      const stickers: CubieMesh['stickers'] = [];
      for (const hs of homeStickers(c)) {
        const m = new THREE.Mesh(roundedSquare(), mats[hs.color]);
        const n = new THREE.Vector3(...hs.normal);
        m.position.copy(n.clone().multiplyScalar(0.492));
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
    this.kick();
  }

  private resize() {
    const w = this.el.clientWidth || 300;
    const h = this.el.clientHeight || 300;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Keep the whole cube (and the arrows around it) in view on narrow aspect ratios.
    this.camera.fov = w < h ? 34 * (h / w) * 0.9 : 34;
    this.camera.updateProjectionMatrix();
    this.kick();
  }

  /** Grey out cubies the lesson isn't about. Pass null to show all colours. */
  setMask(mask: Mask | null) {
    this.mask = mask;
    const mats = getMaterials();
    for (const c of this.state.cubies) {
      const mesh = this.meshes.get(c.id)!;
      const on = !mask || mask(c.home);
      for (const s of mesh.stickers) s.mesh.material = on ? mats[s.color] : mats.muted;
    }
    this.kick();
  }

  getMask() {
    return this.mask;
  }

  /** Replace the state immediately (cancels pending animation). */
  setState(s: CubeState) {
    this.queue.forEach((q) => q.resolve?.());
    this.queue = [];
    if (this.turn) this.finishTurn(false);
    this.state = cloneState(s);
    this.trail = [];
    this.snap();
  }

  reset() {
    this.setState(solvedState());
  }

  /** Moves made since the last setState(), simplified. */
  get history() {
    return simplifyMoves(this.trail);
  }

  /**
   * Animate back to the state of the last setState() by undoing every move
   * since then, compressed into at most `maxMs`. Long histories snap instantly.
   */
  async rewind(maxMs = 2200): Promise<void> {
    if (this.busy) return;
    const moves = this.history;
    if (!moves.length) return;
    const base = this.state;
    if (moves.length > 120) {
      // Too long to be worth watching: jump straight there.
      const back = cloneState(base);
      for (const t of [...moves].reverse()) applyMoveMut(back, parseMove(invertToken(t)));
      this.setState(back);
      return;
    }
    const per = Math.max(45, Math.min(this.speed, maxMs / moves.length));
    this.recording = false;
    const inverse = [...moves].reverse().map(invertToken);
    await new Promise<void>((resolve) => {
      inverse.forEach((t, i) =>
        this.queue.push({ move: parseMove(t), source: 'auto', speed: per, resolve: i === inverse.length - 1 ? resolve : undefined }),
      );
      this.kick();
    });
    this.recording = true;
    this.trail = [];
  }

  /** Drop queued moves and wait for the turn in progress to finish. */
  async settle(): Promise<void> {
    this.queue.forEach((q) => q.resolve?.());
    this.queue = [];
    while (this.turn && !this.disposed) await new Promise((r) => setTimeout(r, 16));
  }

  resetView() {
    this.camera.position.set(5.2, 5.0, 7.4);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.kick();
  }

  /** Animate an algorithm. Resolves when every move has finished. */
  play(alg: string, source: 'user' | 'auto' = 'auto'): Promise<void> {
    const moves = parseAlg(alg);
    if (!moves.length) return Promise.resolve();
    return new Promise((resolve) => {
      moves.forEach((move, i) => this.queue.push({ move, source, resolve: i === moves.length - 1 ? resolve : undefined }));
      this.kick();
    });
  }

  turnMove(token: string, source: 'user' | 'auto' = 'user') {
    return this.play(parseMove(token).name, source);
  }

  get busy() {
    return !!this.turn || this.queue.length > 0;
  }

  /** Advance the current tween (and start the next one in the same frame). */
  private advance(now: number) {
    if (!this.turn && this.queue.length) this.startTurn(now);
    const turn = this.turn;
    if (!turn) return;
    const t = turn.duration <= 0 ? 1 : Math.min(1, (now - turn.start) / turn.duration);
    const axisKey = (['x', 'y', 'z'] as const)[turn.move.axis];
    turn.pivot.rotation[axisKey] = turn.target * easeInOutCubic(t);
    this.updateArrow(t);
    if (t >= 1) {
      this.finishTurn(true);
      if (this.queue.length) this.startTurn(now);
    }
  }

  private startTurn(now: number) {
    const next = this.queue.shift()!;
    const { move } = next;
    const pivot = new THREE.Group();
    this.root.add(pivot);
    const affected = this.state.cubies.filter((c: Cubie) => inLayer(c, move));
    for (const c of affected) pivot.attach(this.meshes.get(c.id)!.group);
    const speed = next.speed ?? this.speed;
    this.turn = {
      move,
      source: next.source,
      resolve: next.resolve,
      duration: speed * (move.quarter === 2 ? 1.45 : 1),
      start: now,
      pivot,
      affected,
      target: (move.quarter === 3 ? -1 : move.quarter) * (Math.PI / 2),
    };
    this.showHint(move);
  }

  private finishTurn(notify: boolean) {
    const turn = this.turn!;
    this.turn = null;
    for (const c of turn.affected) this.root.attach(this.meshes.get(c.id)!.group);
    this.root.remove(turn.pivot);
    applyMoveMut(this.state, turn.move);
    if (this.recording) this.trail.push(turn.move.name);
    this.snap();
    this.hideHint();
    if (notify) {
      this.opts.onMove?.(turn.move.name, turn.source);
      turn.resolve?.();
    }
  }

  // ---------- move hints: label + direction arrow ----------

  private showHint(move: Move) {
    if (this.opts.hints === false) return;
    if (this.hud) {
      this.hud.textContent = move.name;
      this.hud.classList.remove('pop');
      void this.hud.offsetWidth; // restart the CSS animation
      this.hud.classList.add('pop', 'on');
    }
    this.arrow = this.buildArrow(move);
    this.arrowMat.opacity = 0;
    this.arrowOutline.opacity = 0;
    this.scene.add(this.arrow);
  }

  private hideHint() {
    if (this.arrow) {
      this.scene.remove(this.arrow);
      this.arrow = null;
    }
    if (this.hud && !this.queue.length) this.hud.classList.remove('on');
  }

  private updateArrow(t: number) {
    if (!this.arrow) return;
    const o = Math.min(1, t * 6, (1 - t) * 5 + 0.15);
    this.arrowMat.opacity = 0.95 * o;
    this.arrowOutline.opacity = 0.85 * o;
  }

  /**
   * The arrow from cube notation diagrams: drawn on the most camera-facing
   * face that the turning layer crosses, along that strip, pointing the way
   * the stickers move. Rendered on top so the moving layer never hides it.
   */
  private buildArrow(move: Move): THREE.Group {
    const unit = (i: number, sign = 1) => {
      const v = new THREE.Vector3();
      v.setComponent(i, sign);
      return v;
    };
    const axis = unit(move.axis);
    const camDir = this.camera.position.clone().normalize();
    let face = new THREE.Vector3();
    let bestDot = -Infinity;
    for (const i of [0, 1, 2])
      for (const sign of [1, -1]) {
        if (i === move.axis) continue;
        const n = unit(i, sign);
        const dot = n.dot(camDir);
        if (dot > bestDot) {
          bestDot = dot;
          face = n;
        }
      }
    // Positive quarter = +1, negative = -1, half turn follows the move's clockwise direction.
    const base = parseMove(move.name[0]).quarter;
    const dir = move.quarter === 1 ? 1 : move.quarter === 3 ? -1 : base === 3 ? -1 : 1;
    const key = `${move.name}|${face.toArray().join()}`;
    const cached = this.arrowCache.get(key);
    if (cached) return cached;
    const group = new THREE.Group();
    this.arrowCache.set(key, group);
    const tangent = axis.clone().cross(face).multiplyScalar(dir);
    const whole = move.layers.length === 3;
    const offset = whole ? 0 : move.layers.reduce((a, l) => a + l, 0) / move.layers.length;
    const center = face.clone().multiplyScalar(1.56).add(axis.clone().multiplyScalar(offset));
    const half = move.quarter === 2 ? 1.25 : 1.05;
    const from = center.clone().addScaledVector(tangent, -half);
    const to = center.clone().addScaledVector(tangent, half - 0.3);
    // A slight bow outwards reads as "turning" rather than "sliding".
    const mid = center.clone().addScaledVector(face, 0.22);
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const mat = this.arrowMat;
    const thick = whole ? 0.09 : 0.075;
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, thick, 10, false), mat);
    const head = new THREE.Mesh(new THREE.ConeGeometry(thick * 2.9, 0.46, 18), mat);
    const tipDir = curve.getTangent(1).normalize();
    head.position.copy(to).addScaledVector(tipDir, 0.2);
    head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tipDir);
    // Dark outline so the yellow arrow also reads on yellow stickers.
    const outlineMat = this.arrowOutline;
    const tubeOut = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, thick + 0.035, 10, false), outlineMat);
    const headOut = new THREE.Mesh(new THREE.ConeGeometry(thick * 2.9 + 0.06, 0.56, 18), outlineMat);
    headOut.position.copy(head.position).addScaledVector(tipDir, -0.02);
    headOut.quaternion.copy(head.quaternion);
    for (const m of [tubeOut, headOut]) m.renderOrder = 20;
    for (const m of [tube, head]) m.renderOrder = 21;
    group.add(tubeOut, headOut, tube, head);
    return group;
  }

  // ---------- drag to turn ----------

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
      this.turnMove(moveFor(best.axis, cubie.pos[best.axis], best.positive), 'user');
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
    this.io.disconnect();
    this.controls.dispose();
    this.hideHint();
    this.hud?.remove();
    this.arrowCache.forEach((g) =>
      g.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      }),
    );
    this.arrowMat.dispose();
    this.arrowOutline.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
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
