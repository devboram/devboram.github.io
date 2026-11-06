// 3D 픽셀 네온 시티 시험 스테이지 (/play.html)
// 렌더: three.js 를 낮은 해상도 픽셀(RenderPixelatedPass) + 네온 번짐(UnrealBloomPass)으로.
// 캐릭터는 일러스트를 카메라를 보는 2D 카드(Sprite)로 세운다 — HD-2D 방식.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const stage = document.querySelector('.play-stage');
const canvas = stage.querySelector('.play-canvas');
const hintEl = stage.querySelector('.play-hint');
const dialogEl = stage.querySelector('.play-dialog');
const hudEl = stage.querySelector('.play-hud');
const speedEl = stage.querySelector('.play-speed');
const zoneEl = stage.querySelector('.play-zone');
const eventEl = stage.querySelector('.play-event');
const mapEl = stage.querySelector('.play-map');
const discoverEl = stage.querySelector('.play-discover');
const wipeEl = stage.querySelector('.play-wipe');
const data = JSON.parse(document.getElementById('play-data').textContent);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
} catch (e) {
  stage.classList.add('is-fallback');
  throw e;
}
renderer.setPixelRatio(1);
renderer.localClippingEnabled = true;  // 플레이어 차 지붕 자르기

const PINK = 0xff2a6d, CYAN = 0x4ef3ff, GOLD = 0xffd76a, VIOLET = 0xa78bff, LAV = 0xc4bcf2;
const NEON = [PINK, CYAN, GOLD, VIOLET];

// 같은 도시가 매번 나오도록 고정 시드 난수
let seed = 20261104;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

const scene = new THREE.Scene();
// 하늘: 위는 밤 남색, 지평선 근처는 보랏빛 도시 불빛 — 빌딩 실루엣과 강 반사가 살아난다
const skyTexture = (() => {
  const c = document.createElement('canvas'); c.width = 2; c.height = 128;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, '#07061a'); gr.addColorStop(0.55, '#1a1240'); gr.addColorStop(0.8, '#3d1f63'); gr.addColorStop(1, '#5a2a6e');
  g.fillStyle = gr; g.fillRect(0, 0, 2, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
scene.background = skyTexture;
scene.fog = new THREE.Fog(0x0b0a1f, 40, 190);
const camera = new THREE.PerspectiveCamera(48, 16 / 9, 0.1, 500);

scene.add(new THREE.HemisphereLight(0x9a7cff, 0x1a0f3c, 1.4));
const pinkLight = new THREE.PointLight(PINK, 40, 30, 1.6); pinkLight.position.set(-6, 5, -4); scene.add(pinkLight);
const cyanLight = new THREE.PointLight(CYAN, 30, 30, 1.6); cyanLight.position.set(7, 4, 3); scene.add(cyanLight);

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

// 창문 텍스처 — 층마다 가로로 줄 맞춘 창(2x2 + 1칸 틈). 빌딩마다 한 색 계열, 가끔 불 꺼진 층.
// 16x30 한 장 = 창 5칸 × 10층. 빌딩 크기에 맞춰 반복한다.
const WINDOW_TONES = [[GOLD, 0xffe8a8], [CYAN, 0xb8fbff], [0xff9ab8, 0xffd1e0], [LAV, 0xf6f3ff], [0xffb35c, GOLD]];
const windowTextures = WINDOW_TONES.map(([main, alt]) => winTex(main, alt));
function winTex(main, alt) { const t = canvasTexture(15, 30, (g, w, h) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  for (let f = 0; f < 10; f++) {
    const floorLit = rnd() < 0.82;
    for (let c = 0; c < 5; c++) {
      if (rnd() < (floorLit ? 0.72 : 0.08)) {
        g.fillStyle = hex(rnd() < 0.85 ? main : alt);
        g.fillRect(c * 3, f * 3, 2, 2);
      }
    }
  }
});
  // 가까이선 또렷한 픽셀, 멀리선 밉맵으로 부드럽게 — 창이 화면 픽셀보다 작아질 때 생기던 자글자글한 노이즈 제거
  t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  return t;
}
const blinkers = [];  // 옥상 안테나 빨간 불(깜빡임)

// 배경판: 홈 장면 그림(하늘을 뺀 assets/pixel/skyline.png, tools/art/gen_skyline.py)을 3D 공간에 세운다 — HD-2D 방식
// 광고판이 서로 다른 배경판 5장을 돌려 써서 같은 그림이 반복되지 않게(광고판 내용은 composeSkylines 가 그린다)
const skylineTexs = [0, 1, 2, 3, 4].map((i) => {
  const t = new THREE.TextureLoader().load('/assets/pixel/skyline.png');
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  return t;
});
const skylineMats = skylineTexs.map((map) => [0xffffff, 0x9d8fc8].map((tint) => new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.5, color: tint, fog: false })));
let backdropN = 0;
function backdrop(parent, x, y, z, rotY, scale, far = false) {
  const w = 480 * scale, h = 116 * scale;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), skylineMats[backdropN++ % 5][far ? 1 : 0]);
  m.position.set(x, y + h / 2, z); m.rotation.y = rotY;
  parent.add(m);
  return m;
}
// 아이템 도감 24종(assets/chars/items, tools/art/cut_items.py) — 드라이브에서 줍는 아이템
const itemMats = Array.from({ length: 24 }, (_, i) => {
  const t = new THREE.TextureLoader().load(`/assets/chars/items/item_${String(i + 1).padStart(2, '0')}.png`);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.SpriteMaterial({ map: t, transparent: true, alphaTest: 0.3 });
});
// 도감: 주운 아이템 번호를 기기에 남긴다. 구역마다 그 구역에서만 나오는 희귀 아이템 1종
const RARE = { city: 3, slum: 10, river: 24, park: 19, tower: 1 };
const RARE_SET = new Set(Object.values(RARE));
const dex = new Set((() => { try { return JSON.parse(localStorage.getItem('play-dex') || '[]'); } catch (e) { return []; } })());
function saveDex() { try { localStorage.setItem('play-dex', JSON.stringify([...dex])); } catch (e) { /* 저장 못 해도 게임은 된다 */ } }
function itemFor(zoneKey) {
  if (RARE[zoneKey] && rnd() < 0.2) return RARE[zoneKey];
  let n; do n = 1 + Math.floor(rnd() * 24); while (RARE_SET.has(n));
  return n;
}
function setItem(b, n) {
  b.userData.item = n; b.material = itemMats[n - 1];
  const rare = RARE_SET.has(n), s = rare ? 2.1 : 1.5;
  b.scale.set(s, s, 1); if (b.userData.halo) b.userData.halo.visible = rare;
}

// 빌딩 한 동: 몸통 + (셋백 윗층) + (옥상 네온 띠) + (안테나) + (세로 네온 간판)
function tower(parent, x, z, w, d, h, baseY) {
  const g = new THREE.Group();
  const facade = pick([0x2a2456, 0x2e2a5e, 0x251f4d, 0x32285c]);  // 하늘보다 한 톤 밝게 — 실루엣이 보이게
  const mk = (bw, bh, bd, y) => {
    const tex = pick(windowTextures).clone();
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(Math.max(1, Math.round(bw / 6)), Math.max(1, Math.round(bh / 13)));  // 창 한 칸 ≈ 1.2 × 1.3
    tex.needsUpdate = true;
    const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), new THREE.MeshStandardMaterial({ color: facade, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.75, roughness: 0.85 }));
    m.position.y = y + bh / 2; g.add(m);
    return y + bh;
  };
  let top = mk(w, h, d, 0);
  let tw = w, td = d;
  if (rnd() < 0.45) { tw = w * 0.7; td = d * 0.7; top = mk(tw, h * (0.15 + rnd() * 0.2), td, top); }
  if (rnd() < 0.2) { tw *= 0.6; td *= 0.6; top = mk(tw, h * 0.1, td, top); }
  if (rnd() < 0.6) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(tw + 0.15, 0.35, td + 0.15), new THREE.MeshBasicMaterial({ color: pick(NEON) }));
    band.position.y = top - 0.2; g.add(band);
  }
  if (rnd() < 0.5) {
    const ah = 2 + rnd() * 5;
    const ant = new THREE.Mesh(new THREE.BoxGeometry(0.2, ah, 0.2), new THREE.MeshStandardMaterial({ color: 0x3d3488 }));
    ant.position.y = top + ah / 2; g.add(ant);
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0xff3355 }));
    light.position.y = top + ah; g.add(light); blinkers.push(light);
  }
  if (rnd() < 0.3) {
    const sh = Math.min(h * 0.35, 12);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.5, sh, 1.4), new THREE.MeshBasicMaterial({ color: pick(NEON) }));
    sign.position.set(w / 2 + 0.3, h * 0.75 - sh / 2, 0); g.add(sign);
  }
  g.position.set(x, baseY, z);
  parent.add(g);
  return g;
}

// 도시: 옥상(원점) 주위를 둥글게. 앞쪽(카메라 쪽)은 비워 옥상이 가리지 않게
for (let i = 0; i < 110; i++) {
  const ang = rnd() * Math.PI * 2;
  const r = 18 + rnd() * 90;
  const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
  if (z > 10 && Math.abs(x) < 30) continue;
  const w = 4 + rnd() * 9, d = 4 + rnd() * 9;
  const top = -14 + rnd() * 40 + (r > 60 ? 10 : 0);
  tower(scene, x, z, w, d, top + 60, -60);
}

// 멀리 사방에 홈 장면 스카이라인 배경판(앞쪽은 옥상 시점에서 안 보여 생략)
for (const [x, z, r] of [[0, -230, 0], [-230, -40, Math.PI / 2], [230, -40, -Math.PI / 2]]) backdrop(scene, x, -36, z, r, 1.1);
for (const [x, z, r] of [[-180, -300, 0.25], [200, -300, -0.25]]) backdrop(scene, x, -30, z, r, 1.3, true);

// 핑크 격자 철탑
(function lattice() {
  const mat = new THREE.MeshBasicMaterial({ color: PINK });
  const g = new THREE.Group();
  const H = 70, base = 7;
  for (let i = 0; i <= 14; i++) {
    const y = -30 + (H / 14) * i;
    const half = base * (1 - i / 16) / 2;
    for (const [w, d, px, pz] of [[half * 2, 0.3, 0, half], [half * 2, 0.3, 0, -half], [0.3, half * 2, half, 0], [0.3, half * 2, -half, 0]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), mat); b.position.set(px, y, pz); g.add(b);
    }
  }
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, H, 4), mat);
    leg.position.set(sx * base / 2 * 0.56, -30 + H / 2, sz * base / 2 * 0.56); g.add(leg);
  }
  const tip = new THREE.Mesh(new THREE.OctahedronGeometry(1.2), new THREE.MeshBasicMaterial({ color: GOLD }));
  tip.position.y = 42; g.add(tip);
  g.position.set(-26, 0, -48);
  scene.add(g);
})();

// 대교 — 다음 단계 드라이브 스테이지가 달릴 길. 지금은 멀리서 보이기만
const bridgeCars = [];
(function bridge() {
  const z = -92, y = -10, L = 260;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(L, 1.2, 9), new THREE.MeshStandardMaterial({ color: 0x221c48, roughness: 0.8 }));
  deck.position.set(0, y, z); scene.add(deck);
  for (const dz of [-4.4, 4.4]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(L, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: CYAN }));
    rail.position.set(0, y + 1, z + dz); scene.add(rail);
  }
  const cableMat = new THREE.LineBasicMaterial({ color: CYAN });
  for (const tx of [-55, 55]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(2, 34, 2), new THREE.MeshStandardMaterial({ color: 0x3d3488, emissive: VIOLET, emissiveIntensity: 0.35 }));
    tower.position.set(tx, y + 16, z); scene.add(tower);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 2.4), new THREE.MeshBasicMaterial({ color: PINK }));
    lamp.position.set(tx, y + 33, z); scene.add(lamp);
    for (const side of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24, x = tx + side * t * 50;
        pts.push(new THREE.Vector3(x, y + 32 - Math.sin(t * Math.PI / 2) * 30 + t * t * 8, z));
      }
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cableMat));
    }
  }
  for (let i = 0; i < 16; i++) {
    const car = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 1.2), new THREE.MeshBasicMaterial({ color: i % 2 ? GOLD : PINK }));
    car.position.set(-L / 2 + rnd() * L, y + 1.1, z + (i % 2 ? 2 : -2));
    car.userData.v = (i % 2 ? 1 : -1) * (10 + rnd() * 8);
    scene.add(car); bridgeCars.push(car);
  }
  const water = new THREE.Mesh(new THREE.PlaneGeometry(600, 300), new THREE.MeshStandardMaterial({ color: 0x0b0a1f, metalness: 0.6, roughness: 0.35 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, -32, -110); scene.add(water);
})();

// 초승달 + 별
const moon = new THREE.Sprite(new THREE.SpriteMaterial({
  map: canvasTexture(64, 64, (g) => {
    g.fillStyle = '#ffd76a'; g.beginPath(); g.arc(32, 32, 26, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(44, 24, 24, 0, Math.PI * 2); g.fill();
  }), fog: false,
}));
moon.position.set(46, 70, -200); moon.scale.set(26, 26, 1); scene.add(moon);
{
  const pos = [];
  for (let i = 0; i < 500; i++) {
    const a = rnd() * Math.PI * 2, e = 0.12 + rnd() * 1.3, R = 260;
    pos.push(Math.cos(a) * Math.cos(e) * R, Math.sin(e) * R - 20, Math.sin(a) * Math.cos(e) * R);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xf6f3ff, size: 1.6, sizeAttenuation: false, fog: false })));
}

// 옥상: 바닥 · 네온 난간 · 드라이브 문 · STAR NOTE 광고판 · 물탱크
const ROOF = { w: 18, d: 12 };
{
  const floorTex = canvasTexture(16, 16, (g) => {
    g.fillStyle = '#221c48'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#2b2460'; g.fillRect(0, 0, 8, 8); g.fillRect(8, 8, 8, 8);
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(ROOF.w / 2, ROOF.d / 2);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(ROOF.w, 1, ROOF.d), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.5, metalness: 0.2 }));
  floor.position.y = -0.5; scene.add(floor);
  const body = new THREE.Mesh(new THREE.BoxGeometry(ROOF.w - 0.5, 50, ROOF.d - 0.5), new THREE.MeshStandardMaterial({ color: 0x15122f }));
  body.position.y = -26; scene.add(body);
  const railMat = new THREE.MeshBasicMaterial({ color: CYAN });
  for (const [w, d, x, z] of [[ROOF.w, 0.15, 0, ROOF.d / 2], [ROOF.w, 0.15, 0, -ROOF.d / 2], [0.15, ROOF.d, ROOF.w / 2, 0], [0.15, ROOF.d, -ROOF.w / 2, 0]]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, d), railMat); r.position.set(x, 0.8, z); scene.add(r);
  }
  // 드라이브 문
  const door = new THREE.Group();
  const frameMat = new THREE.MeshBasicMaterial({ color: PINK });
  for (const [w, h, x, y] of [[0.25, 2.8, -0.8, 1.4], [0.25, 2.8, 0.8, 1.4], [1.85, 0.25, 0, 2.8]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.25), frameMat); b.position.set(x, y, 0); door.add(b);
  }
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 2.6), new THREE.MeshBasicMaterial({ color: 0x3d1a5c }));
  inner.position.set(0, 1.3, -0.05); door.add(inner);
  const label = new THREE.Sprite(new THREE.SpriteMaterial({
    map: canvasTexture(64, 16, (g) => { g.fillStyle = '#ffd76a'; g.font = 'bold 12px monospace'; g.textAlign = 'center'; g.fillText('DRIVE ▶', 32, 12); }),
  }));
  label.position.set(0, 3.5, 0); label.scale.set(2.4, 0.6, 1); door.add(label);
  door.position.set(7.2, 0, -ROOF.d / 2 + 0.3);
  scene.add(door);
  scene.userData.door = door;
  // STAR NOTE 광고판(뒤쪽)
  const board = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshBasicMaterial({
    map: canvasTexture(96, 48, (g) => {
      g.fillStyle = '#1b0f3a'; g.fillRect(0, 0, 96, 48);
      g.strokeStyle = '#4ef3ff'; g.lineWidth = 2; g.strokeRect(1, 1, 94, 46);
      g.fillStyle = '#ff5fb7'; g.font = 'bold 15px monospace'; g.textAlign = 'center'; g.fillText('STAR NOTE', 48, 30);
    }),
  }));
  board.position.set(-3, 5.2, -ROOF.d / 2 - 0.2); scene.add(board);
  for (const x of [-6.6, 0.6]) {
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.2, 0.3), new THREE.MeshStandardMaterial({ color: 0x3d3488 }));
    pole.position.set(x, 1.6, -ROOF.d / 2 - 0.2); scene.add(pole);
  }
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.2, 8), new THREE.MeshStandardMaterial({ color: 0x3d3488, roughness: 0.6 }));
  tank.position.set(-7, 1.1, 4); scene.add(tank);
}

// 캐릭터 카드 — 발이 위치에 오도록 아랫변 기준
const loader = new THREE.TextureLoader();
function card(url, height, frames = 1) {
  const tex = loader.load(url, (t) => {
    const aspect = (t.image.width / frames) / t.image.height;
    spr.scale.set(height * aspect, height, 1);
  });
  tex.colorSpace = THREE.SRGBColorSpace;
  if (frames > 1) tex.repeat.set(1 / frames, 1);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.2 }));
  spr.center.set(0.5, 0);
  spr.userData = { tex, frames };
  scene.add(spr);
  return spr;
}

const bunny = card('/assets/chars/anim/bunny_twirl.webp', 2.4, 6);
bunny.position.set(0, 0, 2);
const npcSpots = { robot: [-4.5, 1.6, -1.5], cat: [-3, 7.3, -ROOF.d / 2 - 0.1], slime: [4, 0, 2.6], villain: [5.2, 0, -2.5] };
const npcs = data.cast.filter((c) => npcSpots[c.key]).map((c) => {
  const s = card(`/assets/chars/${c.key}.png`, c.key === 'slime' ? 1.6 : 2.1);
  s.position.set(...npcSpots[c.key]);
  s.userData.base = s.position.y;
  s.userData.info = c;
  return s;
});
const me = data.cast.find((c) => c.key === 'bunny');

// 반짝이(요술봉 행동)
const sparkGeo = new THREE.BufferGeometry();
const SPARKS = 60;
const sparkPos = new Float32Array(SPARKS * 3), sparkVel = new Float32Array(SPARKS * 3);
sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
const sparkMat = new THREE.PointsMaterial({ color: GOLD, size: 5, sizeAttenuation: false, transparent: true, opacity: 0 });
scene.add(new THREE.Points(sparkGeo, sparkMat));
let sparkLife = 0;
function burst(at) {
  for (let i = 0; i < SPARKS; i++) {
    sparkPos.set([at.x, at.y + 1.6, at.z], i * 3);
    const a = rnd() * Math.PI * 2, s = 2 + rnd() * 3;
    sparkVel.set([Math.cos(a) * s, 2 + rnd() * 4, Math.sin(a) * s], i * 3);
  }
  sparkLife = 1.2;
}

// ===== 드라이브 스테이지: 네온 대교를 호버카로 =====
// 도로·가로등·빌딩 조각을 차 앞으로 계속 옮겨 붙여 끝없이 달린다(조각 수 고정).
const drive = (() => {
  const s = new THREE.Scene();
  s.background = skyTexture;
  s.fog = new THREE.Fog(0x2a1748, 90, 360);
  const hemi = new THREE.HemisphereLight(0x9a7cff, 0x1a0f3c, 1.5); s.add(hemi);
  const lampLights = [0, 1, 2, 3].map(() => { const l = new THREE.PointLight(0xffc46b, 0, 16, 1.4); s.add(l); return l; });
  const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 500);
  const SEG = 20, NSEG = 10, LANES = [-3, 0, 3];

  const deckMat = new THREE.MeshStandardMaterial({ color: 0x221c48, roughness: 0.7 });
  const dashMat = new THREE.MeshBasicMaterial({ color: LAV });
  const railMat = new THREE.MeshBasicMaterial({ color: CYAN });
  const lampMat = new THREE.MeshBasicMaterial({ color: PINK });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x3d3488 });
  const towerMat = new THREE.MeshStandardMaterial({ color: 0x3d3488, emissive: VIOLET, emissiveIntensity: 0.35 });
  const segs = [];
  for (let i = 0; i < NSEG; i++) {
    const g = new THREE.Group();
    const deck = new THREE.Mesh(new THREE.BoxGeometry(10, 0.8, SEG), deckMat); deck.position.y = -0.4; g.add(deck);
    for (const x of [-1.5, 1.5]) for (let k = 0; k < 2; k++) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 3), dashMat); d.position.set(x, 0.03, -SEG / 2 + 5 + k * 10); g.add(d);
    }
    for (const x of [-5, 5]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, SEG), railMat); r.position.set(x, 0.8, 0); g.add(r);
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4, 0.25), poleMat); p.position.set(x * 1.04, 2, 0); g.add(p);
      const l = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.5), lampMat); l.position.set(x * 0.94, 4, 0); g.add(l);
    }
    if (i % 4 === 0) {  // 대교 주탑
      for (const x of [-7, 7]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.6, 24, 0.6), towerMat); t.position.set(x, 11, 0); g.add(t); }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(14.6, 0.4, 0.5), lampMat); beam.position.y = 23; g.add(beam);
    }
    for (const side of [-1, 1]) {  // 강변 둑 + 가로등 줄
      const bank = new THREE.Mesh(new THREE.BoxGeometry(24, 1.2, SEG), new THREE.MeshStandardMaterial({ color: 0x15122f }));
      bank.position.set(side * 104, -11.6, 0); g.add(bank);
      for (let k = 0; k < 2; k++) { const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: GOLD })); lamp.position.set(side * 92.5, -10.5, -SEG / 2 + k * 10 + 5); g.add(lamp); }
    }
    const far = new THREE.Mesh(new THREE.BoxGeometry(6, 0.8, SEG), new THREE.MeshStandardMaterial({ color: 0x221c48 }));  // 멀리 나란한 다리
    far.position.set(-34, -4, 0); g.add(far);
    for (let k = 0; k < 4; k++) { const fl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshBasicMaterial({ color: k % 2 ? PINK : CYAN })); fl.position.set(-31, -3.3, -SEG / 2 + k * 5 + 2.5); g.add(fl); }
    g.position.z = SEG * 2 - i * SEG; g.userData.k = i - 2; s.add(g); segs.push(g);  // 출발점 뒤에도 두 칸 깔아 도로 끝이 안 보이게
  }

  // 한강처럼: 도로 양옆은 탁 트인 강, 빌딩은 멀리 양쪽 강변에 스카이라인으로
  const WATER_Y = -12;
  // 강 건너 양쪽 강변 + 정면 멀리: 홈 장면 스카이라인 배경판(차를 따라 움직이는 먼 풍경). 두 겹으로 깊이감
  const skyline = new THREE.Group(); s.add(skyline);
  for (const side of [-1, 1]) {
    for (let j = -1; j <= 2; j++) backdrop(skyline, side * 150, WATER_Y, -j * 360, side * -Math.PI / 2, 0.75);
    for (let j = -1; j <= 1; j++) backdrop(skyline, side * 250, WATER_Y, -j * 560 - 200, side * -Math.PI / 2, 1.2, true);
  }
  for (const x of [-216, 216]) backdrop(skyline, x, WATER_Y, -430, 0, 0.9);
  for (const x of [-360, 0, 360]) backdrop(skyline, x, WATER_Y, -560, 0, 1.4, true);
  // 강물: 실시간 반사(빌딩·다리 불빛이 비친다) + 위에 옅은 어둠 한 겹
  const water = new Reflector(new THREE.PlaneGeometry(900, 900), { textureWidth: 512, textureHeight: 512, color: 0x9a96c8, clipBias: 0.003 });
  water.rotation.x = -Math.PI / 2; water.position.y = WATER_Y; s.add(water);
  const murk = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ color: 0x0b0a1f, transparent: true, opacity: 0.12 }));
  murk.rotation.x = -Math.PI / 2; murk.position.y = WATER_Y + 0.05; s.add(murk);
  water.userData.murk = murk;
  const dMoon = new THREE.Sprite(moon.material); dMoon.scale.set(30, 30, 1); s.add(dMoon);
  const dStars = scene.getObjectByProperty('type', 'Points').clone(); s.add(dStars);

  // 호버카 + 운전하는 토끼
  const car = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 2.6), new THREE.MeshStandardMaterial({ color: PINK, emissive: PINK, emissiveIntensity: 0.25, roughness: 0.4 }));
  car.add(body);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 1.3), new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.45 }));
  canopy.position.set(0, 0.48, 0.35); car.add(canopy);
  for (const x of [-0.65, 0.65]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.1), new THREE.MeshBasicMaterial({ color: GOLD })); head.position.set(x, 0.05, -1.32); car.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 0.1), new THREE.MeshBasicMaterial({ color: 0xff5f8f })); tail.position.set(x, 0.08, 1.32); car.add(tail);
  }
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.2), new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.55 }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = -0.4; car.add(glow);
  // 카트라이더처럼 뒤에서 보는 시점: 덮개를 빼고 토끼 뒷모습(요술봉 한 바퀴 3번째 프레임)을 태운다
  canopy.visible = false;
  const backTex = new THREE.TextureLoader().load('/assets/chars/anim/bunny_twirl.webp', (t) => {
    const a = (t.image.width / 6) / t.image.height, h = driver.userData.h || 1.7; driver.scale.set(h * a, h, 1);
  });
  backTex.colorSpace = THREE.SRGBColorSpace; backTex.repeat.set(1 / 6, 1); backTex.offset.x = 2 / 6;
  const driver = new THREE.Sprite(new THREE.SpriteMaterial({ map: backTex, transparent: true, alphaTest: 0.2, color: 0xc8c4dc }));  // 흰 토끼가 번짐에 날아가지 않게 살짝 어둡게
  driver.center.set(0.5, 0); driver.position.set(0, -0.05, 0.35); car.add(driver);
  car.position.y = 0.95; s.add(car);

  const bugs = [];
  for (let i = 0; i < 8; i++) {  // 길 위에 떠 있는 아이템(요술봉·쿠키·보물상자…)
    const b = new THREE.Sprite(pick(itemMats)); b.scale.set(1.5, 1.5, 1); b.center.set(0.5, 0);
    b.position.set(pick(LANES), 0.5, -30 - i * 25); s.add(b); bugs.push(b);
  }
  const traffic = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 3.2), new THREE.MeshStandardMaterial({ color: 0x3d3488, emissive: VIOLET, emissiveIntensity: 0.3 })));
    for (const x of [-0.6, 0.6]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), new THREE.MeshBasicMaterial({ color: 0xff5f8f })); t.position.set(x, 0.1, 1.62); g.add(t); }
    g.position.set(pick(LANES), 0.95, -70 - i * 45); g.userData.v = 8 + rnd() * 5; s.add(g); traffic.push(g);
  }
  return { s, hemi, lampLights, cam, segs, skyline, car, driver, water, dMoon, dStars, bugs, traffic, SEG, NSEG, LANES };
})();

let camFollowX = 0, zoneNow = null, zoneBannerUntil = 0;
// ===== Kenney City Kit(CC0) 빌딩을 밤 네온 도시로: 벽은 어둡게, 창문·간판 색 부분만 빛나게 =====
const KIT = '/assets/models/city/';
const KIT_SET = {
  tall: ['a', 'b', 'c', 'd', 'e'].map((k) => `building-skyscraper-${k}`),
  mid: 'abcdefghijklmn'.split('').map((k) => `building-${k}`),
  low: 'abcdefghijklmn'.split('').map((k) => `low-detail-building-${k}`),
};
const kit = { ready: false, tall: [], mid: [], low: [], mats: [] };
function nightMaterials(map) {
  const img = map.image, W = img.width, H = img.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const src = g.getImageData(0, 0, W, H).data;
  return [[255, 215, 106], [78, 243, 255], [255, 120, 190]].map(([tr, tg, tb]) => {
    const out = g.createImageData(W, H), d = out.data;
    for (let i = 0; i < src.length; i += 4) {
      const r = src[i], gg = src[i + 1], b = src[i + 2];
      let o = [0, 0, 0];
      if (b - r >= 20 && r < 180 && b > 85) o = [tr, tg, tb];     // 창문(회청색 유리 칸, 실측 b-r≈24~28) → 네온 창
      else if (gg - r > 50 && gg >= b) o = [255, 42, 109];         // 초록 간판·차양 → 핑크 네온
      d[i] = o[0]; d[i + 1] = o[1]; d[i + 2] = o[2]; d[i + 3] = 255;
    }
    const ec = document.createElement('canvas'); ec.width = W; ec.height = H; ec.getContext('2d').putImageData(out, 0, 0);
    const em = new THREE.CanvasTexture(ec); em.colorSpace = THREE.SRGBColorSpace; em.flipY = map.flipY;
    return new THREE.MeshStandardMaterial({ map, color: 0x3d3866, emissive: 0xffffff, emissiveMap: em, emissiveIntensity: 0.75, roughness: 0.8 });
  });
}
(async () => {
  try {
    const loader = new GLTFLoader();
    const load = (n) => loader.loadAsync(KIT + n + '.glb').then((gl) => gl.scene);
    const all = await Promise.all(Object.entries(KIT_SET).flatMap(([type, names]) => names.map((n) => load(n).then((sc) => [type, sc]))));
    let mats = null;
    for (const [type, sc] of all) {
      sc.traverse((o) => { if (o.isMesh && !mats) mats = nightMaterials(o.material.map); });
      const box = new THREE.Box3().setFromObject(sc), size = box.getSize(new THREE.Vector3());
      sc.userData.size = size; sc.userData.minY = box.min.y;
      kit[type].push(sc);
    }
    kit.mats = mats; kit.ready = true;
    for (const g of drive.segs) decorate(g);
  } catch (e) { console.warn('city kit', e); }
})();
// 빌딩 한 채 복제: 높이를 맞추고 바닥을 baseY 에 둔다. 창 색은 세 가지 중 하나
function kitBuilding(type, height) {
  const tpl = pick(kit[type]);
  const b = tpl.clone(true);
  const mat = pick(kit.mats);
  b.traverse((o) => { if (o.isMesh) o.material = mat; });
  const maxW = type === 'low' ? 9 : 16;
  const s = Math.min(height / tpl.userData.size.y, maxW / Math.max(tpl.userData.size.x, tpl.userData.size.z));
  b.scale.setScalar(s);
  b.userData.footprint = Math.max(tpl.userData.size.x, tpl.userData.size.z) * s;
  b.userData.lift = -tpl.userData.minY * s;
  return b;
}

// ===== 드라이브 구간(존): 도로 조각마다 구역을 정해 풍경을 바꾼다 =====
const ZONE_LEN = 10;  // 조각 10개(200m)마다 다음 구역
const FINISH_ZONE = 5, FINISH_K = FINISH_ZONE * ZONE_LEN;  // 구역 5개(1 km)를 달리면 피니시 라인
const ZONES = [
  { key: 'city', name: '도심 빌딩 숲', desc: '모든 빌딩이 하루치 로그를 네온으로 내보낸다', short: '도심', fog: 0x3a1850, sky: 0x9a7cff },
  { key: 'slum', name: '뒷골목 슬럼', desc: '고장 난 간판과 전선 사이, 글리치 킹의 구역', short: '슬럼', fog: 0x3a2018, sky: 0xffa86b },
  { key: 'river', name: '한강 대교', desc: '강물에 비친 도시가 두 배로 반짝인다', short: '대교', fog: 0x2a1748, sky: 0x9a7cff },
  { key: 'park', name: '벚꽃 공원', desc: '가로등 불빛에 물든 벚나무 길', short: '공원', fog: 0x2a2050, sky: 0xc9a8ff },
  { key: 'tower', name: '핑크 타워', desc: '빛 고리 5개를 통과하면 글리치가 걷힌다', short: '타워', fog: 0x4a1446, sky: 0xff7ad5 },
];
// 경로: 구역 순서는 고정 루프가 아니라 갈림길에서 고른 대로 쌓인다. 안 고르면 기본 순서(ZONES 차례)
const route = [ZONES[0]];
const forkAlt = {};  // 구역 번호 → [좌회전 구역, 우회전 구역]
function zoneAt(i) {
  while (route.length <= i) route.push(ZONES[(ZONES.indexOf(route[route.length - 1]) + 1) % ZONES.length]);
  return route[i];
}
const zoneOf = (k) => zoneAt(Math.max(0, Math.floor(k / ZONE_LEN)));
function altsOf(i) {  // 교차로 좌·우 후보: 현재·직진(기본 다음)이 아닌 구역 둘(고정 시드)
  if (!forkAlt[i]) { const cur = zoneAt(i), def = zoneAt(i + 1), c = ZONES.filter((z) => z !== cur && z !== def), l = pick(c); forkAlt[i] = [l, pick(c.filter((z) => z !== l))]; }
  return forkAlt[i];
}
// ===== 구역 랜드마크(구역마다 한 번 지나는 큰 구조물) + 길가 주민 =====
const livePetals = [], liveResidents = [];
const petalMat = new THREE.PointsMaterial({ color: 0xffb3d9, size: 4, sizeAttenuation: false, transparent: true, opacity: 0.9 });
const tunnelMat = new THREE.MeshStandardMaterial({ color: 0x120c1c, roughness: 0.95 });
const cableMat = new THREE.LineBasicMaterial({ color: LAV });
function landmark(deco, z, SEG) {
  if (z.key === 'city') {  // 도로를 가로지르는 고가 전광판(커밋 로그가 흐른다)
    const panel = PANELS.find((p) => p.key === 'commit');
    const c = document.createElement('canvas'); c.width = PW; c.height = PH;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter;
    panel.draw(c.getContext('2d'), 0);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(13.6, 8.5), new THREE.MeshBasicMaterial({ map: tex }));
    board.position.set(0, 11, 0); deco.add(board);
    for (const x of [-7.2, 7.2]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 16, 0.5), boardPoleMat); p.position.set(x, 7.3, 0); deco.add(p); }
    liveBoards.push({ board, panel, g: c.getContext('2d'), tex, seed: 0 });
  }
  if (z.key === 'slum') {  // 어두운 고가 밑 터널: 천장·벽, 빨간 등만
    const roof = new THREE.Mesh(new THREE.BoxGeometry(17, 0.8, SEG), tunnelMat); roof.position.y = 7.6; deco.add(roof);
    for (const x of [-8.2, 8.2]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.8, 8.3, SEG), tunnelMat); w.position.set(x, 3.4, 0); deco.add(w); }
    for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), lanternMat); l.position.set(0, 7.05, -SEG / 2 + 3 + i * 7); deco.add(l); }
  }
  if (z.key === 'river') {  // 케이블 주탑: 높은 기둥 둘 + 갑판으로 내려오는 케이블
    for (const x of [-7, 7]) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(1.2, 44, 1.2), towerMat2); t.position.set(x, 21, 0); deco.add(t);
      for (const dz of [-24, -16, -8, 8, 16, 24]) deco.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 42, 0), new THREE.Vector3(x * 0.72, 1, dz)]), cableMat));
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.6, 1), new THREE.MeshBasicMaterial({ color: PINK })); beam.position.y = 42; deco.add(beam);
  }
  if (z.key === 'park' && props.ready) {  // 거대 벚나무 + 떨어지는 꽃잎
    const side = rnd() < 0.5 ? -1 : 1;
    const t = propClone(props.trees[2], 17, 0.25);
    t.traverse((o) => { if (o.isMesh && /leaf/i.test(o.material.name)) { o.material.color.set(0xff8fc8); o.material.emissive = new THREE.Color(0x7a2a58); } });
    t.position.set(side * 12, t.userData.lift - 0.7, 0); deco.add(t);
    const pos = [];
    for (let i = 0; i < 50; i++) pos.push(side * 12 + (rnd() - 0.5) * 16, rnd() * 12, (rnd() - 0.5) * 16);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, petalMat); deco.add(pts); livePetals.push(pts);
  }
}
const towerMat2 = new THREE.MeshStandardMaterial({ color: 0x3d3488, emissive: VIOLET, emissiveIntensity: 0.5 });
// 길가 주민: 옥상 동료가 구역 길가에 서서 지나갈 때 한마디(얼굴 광고판이 아니라 길에 서 있는 주민)
const RESIDENT = { city: 'robot', river: 'cat', park: 'slime' };
const residentMats = {};
function resident(deco, z) {
  const key = RESIDENT[z.key], info = data.cast.find((c) => c.key === key);
  if (!info) return;
  const h = key === 'slime' ? 1.5 : 2;
  if (!residentMats[key]) {
    const tex = loader.load(`/assets/chars/${key}.png`, (t) => { residentMats[key].userData.aspect = t.image.width / t.image.height; });
    tex.colorSpace = THREE.SRGBColorSpace; residentMats[key] = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.2 });
  }
  const m = residentMats[key], spr = new THREE.Sprite(m); spr.center.set(0.5, 0); spr.scale.set(h * (m.userData.aspect || 0.8), h, 1);
  const side = rnd() < 0.5 ? -1 : 1, onDeck = z.key === 'river';
  const base = onDeck ? 0 : -0.7;
  spr.position.set(side * (onDeck ? 4.3 : 7), base, (rnd() - 0.5) * 8); deco.add(spr);
  liveResidents.push({ spr, info, base, said: false });
}
const liveForks = [];
const forkPoleMat = new THREE.MeshStandardMaterial({ color: 0x3d3488, roughness: 0.6 });
const crossMat = new THREE.MeshStandardMaterial({ color: 0x221c48, roughness: 0.7 });
const crossDashMat = new THREE.MeshBasicMaterial({ color: LAV });
const lightBoxMat = new THREE.MeshStandardMaterial({ color: 0x1a1430, roughness: 0.8 });
function crossroad(deco, i) {  // 구역 끝 십자 교차로: 양옆으로 뻗은 길 + 신호등 + 방향 표지. 들어설 때 ◀/▶ 를 누르고 있으면 그쪽으로 회전
  const def = zoneAt(i + 1), [left, right] = altsOf(i);
  const node = new THREE.Mesh(new THREE.BoxGeometry(96, 0.8, 9), crossMat); node.position.y = -0.4; deco.add(node);
  for (const x of [-42, -32, -22, -12, 12, 22, 32, 42]) { const d = new THREE.Mesh(new THREE.BoxGeometry(3, 0.05, 0.15), crossDashMat); d.position.set(x, 0.03, 0); deco.add(d); }
  for (const x of [-6.4, 6.4]) {  // 신호등(초록 켜짐)
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6, 0.3), forkPoleMat); p.position.set(x, 2.3, 5.6); deco.add(p);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.4, 0.6), lightBoxMat); box.position.set(x, 5.2, 5.6); deco.add(box);
    [[0xff2a6d, 0.3], [0xffd76a, 0.3], [0x4ef3ff, 1]].forEach(([c, o], j) => {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o })); l.position.set(x, 5.95 - j * 0.75, 5.95); deco.add(l);
    });
  }
  const tex = canvasTexture(320, 56, (g) => {
    g.fillStyle = '#0b2a2e'; g.fillRect(0, 0, 320, 56); g.strokeStyle = '#4ef3ff'; g.lineWidth = 4; g.strokeRect(2, 2, 316, 52);
    text(g, '◀ ' + left.short, 54, 28, 15, '#ffd76a'); text(g, '↑ ' + def.short, 160, 28, 15, '#f6f3ff'); text(g, right.short + ' ▶', 266, 28, 15, '#ffd76a');
    g.fillStyle = '#4ef3ff'; g.fillRect(106, 10, 4, 36); g.fillRect(210, 10, 4, 36);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.1), new THREE.MeshBasicMaterial({ map: tex }));
  sign.position.set(0, 6.6, 8); deco.add(sign);  // 교차로 8m 앞
  for (const x of [-6.3, 6.3]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 7.8, 0.3), forkPoleMat); p.position.set(x, 3.2, 8); deco.add(p); }
  liveForks.push({ node, i, def, left, right });
}
const liveFinish = [];
const checkerTex = canvasTexture(64, 16, (g) => { for (let y = 0; y < 2; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#f6f3ff' : '#0b0a1f'; g.fillRect(x * 8, y * 8, 8, 8); } });
function finishGate(deco) {  // 피니시 라인: 체크무늬 현수막 + 바닥 띠
  const tex = canvasTexture(256, 48, (g) => {
    for (let y = 0; y < 6; y++) for (let x = 0; x < 32; x++) { g.fillStyle = (x + y) % 2 ? '#f6f3ff' : '#0b0a1f'; g.fillRect(x * 8, y * 8, 8, 8); }
    g.fillStyle = '#ff2a6d'; g.fillRect(60, 8, 136, 32); text(g, 'FINISH', 128, 24, 22, '#f6f3ff');
  });
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 2.3), new THREE.MeshBasicMaterial({ map: tex })); banner.position.set(0, 6.8, 0); deco.add(banner);
  for (const x of [-6.5, 6.5]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.35, 8, 0.35), forkPoleMat); p.position.set(x, 3.3, 0); deco.add(p); }
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(10, 2), new THREE.MeshBasicMaterial({ map: checkerTex })); strip.rotation.x = -Math.PI / 2; strip.position.y = 0.03; deco.add(strip);
  liveFinish.push(banner);
}
const towerLegMat = new THREE.MeshBasicMaterial({ color: PINK });
const lanternMat = new THREE.MeshBasicMaterial({ color: 0xff3b3b });
const groundMat = new THREE.MeshStandardMaterial({ color: 0x15122f, roughness: 0.6, metalness: 0.3 });

// ===== 광고판·간판 12종: 캐릭터 얼굴 없이 글자·기호·아이템 아이콘만 (기획: 볼트 3D 스테이지 기획.md) =====
// 각 패널은 160×100 캔버스에 그린다. draw(g, t) — t 로 움직임. 길가 전광판은 가까울 때만 다시 그린다.
const PW = 160, PH = 100;
const FONT = (px, bold) => `${bold ? 'bold ' : ''}${px}px Galmuri11, Galmuri14, monospace`;
const itemImgs = Array.from({ length: 24 }, (_, i) => { const im = new Image(); im.src = `/assets/chars/items/item_${String(i + 1).padStart(2, '0')}.png`; return im; });
const commitLines = [
  ...(data.posts || []).map((p) => `quest: ${p}`),
  'fix: 마법진 NPE', 'feat: 별 요술봉 2단 충전', 'fix: 반짝이 버그 3마리 포획', 'chore: 리본 매듭 정리',
  'perf: 옥상 프레임 60fps', 'docs: 퀘스트 로그 갱신', 'fix: 기기 날짜 틀어짐', 'test: 큐링 회귀 통과',
];
function frame(g, bg, edge) {
  g.fillStyle = bg; g.fillRect(0, 0, PW, PH);
  g.strokeStyle = edge; g.lineWidth = 4; g.strokeRect(2, 2, PW - 4, PH - 4);
}
function text(g, s, x, y, px, color, align = 'center', bold = true) {
  g.font = FONT(px, bold); g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y);
}
function icon(g, n, x, y, size) { const im = itemImgs[n - 1]; if (im.complete && im.naturalWidth) g.drawImage(im, x - size / 2, y - size / 2, size, size); }
const PANELS = [
  { key: 'pull', zones: ['city', 'tower'], draw(g, t) {  // 1 공익광고
    frame(g, '#2a1460', '#4ef3ff'); text(g, '푸시 전에', 80, 26, 18, '#f6f3ff'); text(g, 'PULL 하세요', 80, 52, 20, '#ffd76a');
    const y = 70 + (t * 20) % 22; g.fillStyle = '#4ef3ff'; g.beginPath(); g.moveTo(70, y); g.lineTo(90, y); g.lineTo(80, y + 10); g.fill(); } },
  { key: 'cookie', zones: ['park'], draw(g, t) {  // 2 가짜 약 광고
    frame(g, '#3a1a2a', '#ff9ab8'); icon(g, 19, 36, 52 - Math.abs(Math.sin(t * 4)) * 8, 46);
    text(g, '버그 퇴치', 108, 30, 16, '#ffd76a'); text(g, '쿠키 1정', 108, 52, 18, '#f6f3ff'); text(g, '하루 3번 로그와 함께', 108, 78, 10, '#c4bcf2', 'center', false); } },
  { key: 'commit', zones: ['city', 'river'], draw(g, t) {  // 3 커밋 로그 전광판(블로그 글 제목도 흐른다)
    frame(g, '#07110f', '#6bff9a'); g.save(); g.beginPath(); g.rect(6, 6, PW - 12, PH - 12); g.clip();
    const off = (t * 14) % 16, base = Math.floor(t * 14 / 16);
    for (let i = 0; i < 7; i++) { const s = commitLines[(base + i) % commitLines.length]; text(g, s.length > 17 ? s.slice(0, 16) + '…' : s, 10, 92 - i * 16 + off - 16, 11, i === 2 ? '#ff9ab8' : '#4ef3ff', 'left', false); }
    g.restore(); } },
  { key: 'quest', zones: ['city'], draw(g, t) {  // 4 퀘스트 모집
    frame(g, '#1a1240', '#ffd76a'); text(g, '!', 30, 50, 44, '#ffd76a'); text(g, 'NEW QUEST', 98, 30, 16, '#f6f3ff');
    text(g, String(Math.floor(t * 2) % 99 + 1).padStart(2, '0') + '개 등록', 98, 62, 20, '#ffd76a'); } },
  { key: 'wand', zones: ['park', 'tower'], draw(g, t) {  // 5 요술봉 수리점
    frame(g, '#2a1048', '#ff2a6d'); icon(g, 1, 34, 50, 50); text(g, '요술봉 수리', 104, 34, 16, '#ff9ab8'); text(g, '리본·하트 OK', 104, 62, 13, '#f6f3ff');
    if (Math.floor(t * 3) % 2) text(g, '✦', 60, 20, 14, '#ffd76a'); } },
  { key: 'crash', zones: ['slum'], draw(g, t) {  // 6 크래시 경고창
    const glitch = Math.sin(t * 7) > 0.92 ? 4 : 0;
    frame(g, '#3a0a14', '#ff3355'); g.fillStyle = '#ff3355'; g.fillRect(8, 8, PW - 16, 16); text(g, 'APP HAS STOPPED', 80 + glitch, 17, 11, '#07061a');
    text(g, '반짝이 버그 발견', 80 - glitch, 48, 14, '#f6f3ff'); g.fillStyle = '#ffd76a'; g.fillRect(48, 66, 64, 22); text(g, '다시 시도?', 80, 77, 12, '#07061a'); } },
  { key: 'stack', zones: ['slum'], draw(g, t) {  // 7 스택트레이스 폭포
    frame(g, '#0b0a1f', '#a78bff'); const lines = ['at Wand.cast()', 'at Ribbon.tie()', 'at Moon.rise()', 'at Log.write()', 'at Heart.beat()', 'at Quest.done()'];
    const off = (t * 22) % 14;
    for (let i = 0; i < 8; i++) text(g, lines[(i + Math.floor(t * 22 / 14)) % lines.length], 12, 10 + i * 14 + off, 11, i === 4 ? '#ff9ab8' : '#c4bcf2', 'left', false); } },
  { key: 'chest', zones: ['tower', 'city'], draw(g, t) {  // 8 보물상자 보험
    frame(g, '#1f1438', '#ffd76a'); icon(g, 24, 38, 52 + (Math.floor(t * 2) % 2 ? -3 : 0), 52); text(g, '인벤토리', 108, 34, 16, '#ffd76a'); text(g, '보험 가입', 108, 60, 16, '#f6f3ff'); } },
  { key: 'fortune', zones: ['river', 'tower'], draw(g, t) {  // 9 오늘의 빌드 운세
    frame(g, '#120f36', '#c4bcf2'); const pts = [[20, 60], [42, 30], [70, 44], [96, 22], [124, 40], [142, 66]];
    const on = Math.floor(t * 2) % (pts.length + 2);
    g.strokeStyle = '#6b5fc0'; g.lineWidth = 2; g.beginPath(); pts.slice(0, Math.min(on, pts.length)).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
    pts.forEach(([x, y], i) => { g.fillStyle = i < on ? '#ffd76a' : '#3d3488'; g.fillRect(x - 3, y - 3, 6, 6); });
    text(g, 'BUILD: 대길', 80, 84, 16, '#ffd76a'); } },
  { key: 'train', zones: ['river'], draw(g, t) {  // 10 막차 시계
    frame(g, '#0b0a1f', '#ff9ab8'); text(g, '막차', 80, 24, 14, '#c4bcf2'); text(g, Math.floor(t * 2) % 2 ? '23:59' : '23 59', 80, 58, 32, '#ff5f8f'); text(g, '퇴근 시간입니다', 80, 86, 10, '#c4bcf2', 'center', false); } },
  { key: 'sleep', zones: ['park', 'city'], draw(g, t) {  // 11 수면 공익광고
    frame(g, '#1a1240', '#ff2a6d'); const hp = 5 - (Math.floor(t * 1.2) % 6);
    for (let i = 0; i < 5; i++) text(g, '♥', 32 + i * 24, 34, 22, i < hp ? '#ff2a6d' : '#3d3488');
    text(g, '수면도 체력입니다', 80, 72, 14, '#f6f3ff'); } },
  { key: 'rune', zones: ['tower'], draw(g, t) {  // 12 마법진 룬
    frame(g, '#1a0a30', '#ff9ad5'); g.save(); g.translate(80, 50); g.rotate(t * 0.6);
    g.strokeStyle = '#ff9ad5'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 36, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(0, 0, 24, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.beginPath(); g.moveTo(Math.cos(a) * 24, Math.sin(a) * 24); g.lineTo(Math.cos(a + 2.1) * 24, Math.sin(a + 2.1) * 24); g.stroke(); }
    g.restore(); } },
  { key: 'open', zones: ['slum'], draw(g, t) {  // 14 OPEN/CLOSED
    frame(g, '#120a10', '#3d3488'); const flick = Math.sin(t * 9) > 0.6 || Math.sin(t * 2.3) > 0.4;
    text(g, flick ? 'OPEN' : 'OP N', 80, 46, 34, flick ? '#ff3355' : '#5a1a28'); text(g, '24H 디버깅', 80, 80, 12, '#c4bcf2'); } },
];
// 길가 전광판 한 개(기둥 두 개 + 패널). 패널마다 자기 캔버스를 가진다
const liveBoards = [];
const boardPoleMat = new THREE.MeshStandardMaterial({ color: 0x2a2456, roughness: 0.7 });
function roadsideBoard(deco, zoneKey, side, z) {
  const options = PANELS.filter((p) => p.zones.includes(zoneKey));
  if (!options.length) return;
  const panel = options[Math.floor(rnd() * options.length)];
  const c = document.createElement('canvas'); c.width = PW; c.height = PH;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter;
  panel.draw(c.getContext('2d'), rnd() * 10);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 4.5), new THREE.MeshBasicMaterial({ map: tex }));
  const x = side * (12 + rnd() * 4), y = 6.5 + rnd() * 3;
  board.position.set(x, y, z); board.rotation.y = side > 0 ? -0.45 : 0.45;  // 다가오는 차 쪽으로 살짝
  deco.add(board);
  for (const dx of [-2.6, 2.6]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, y, 0.3), boardPoleMat);
    p.position.set(x + dx * Math.cos(board.rotation.y), y / 2 - 1.2, z + dx * Math.sin(board.rotation.y) * -1); deco.add(p);
  }
  liveBoards.push({ board, panel, g: c.getContext('2d'), tex, seed: rnd() * 10 });
}
// 먼 배경판 5장: 홈 스카이라인 그림의 큰 광고판·작은 간판 칸에 위 패널을 그려 넣는다(달 반복 해소)
const SKY_BB = [369, 15, 70, 63], SKY_SG = [297, 54, 18, 18];
const SKY_PANELS = ['commit', 'pull', 'fortune', 'crash', 'sleep'];
const SKY_ICONS = [5, 3, 24, 10, 1];
function composeSkylines() {
  const base = new Image(); base.src = '/assets/pixel/skyline.png';
  base.onload = async () => {
    try { await document.fonts.load(FONT(16, true)); } catch (e) { /* 글꼴 없으면 기본 글꼴 */ }
    skylineTexs.forEach((tex, i) => {
      const c = document.createElement('canvas'); c.width = 480; c.height = 116;
      const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(base, 0, 0);
      const pc = document.createElement('canvas'); pc.width = PW; pc.height = PH;
      PANELS.find((p) => p.key === SKY_PANELS[i]).draw(pc.getContext('2d'), 3 + i);
      g.imageSmoothingEnabled = true; g.drawImage(pc, SKY_BB[0], SKY_BB[1], SKY_BB[2], SKY_BB[3]);
      g.fillStyle = '#1a1238'; g.fillRect(SKY_SG[0], SKY_SG[1], SKY_SG[2], SKY_SG[3]);
      const im = itemImgs[SKY_ICONS[i] - 1]; if (im.complete) g.drawImage(im, SKY_SG[0] + 1, SKY_SG[1] + 1, SKY_SG[2] - 2, SKY_SG[3] - 2);
      tex.image = c; tex.needsUpdate = true;
    });
  };
}

// ===== Kenney Car Kit · Roads · Nature (전부 CC0) =====
// 모델 앞쪽이 +z 라서 우리 진행 방향(-z)에 맞게 180° 돌린다.
const props = { ready: false, karts: [], cars: [], light: null, pole: null, wires: null, trees: [], bushes: [], flowers: [], fence: null };
const PROP_FILES = {
  karts: ['cars/kart-oopi'],
  cars: ['cars/sedan', 'cars/sedan-sports', 'cars/taxi', 'cars/police', 'cars/van', 'cars/suv-luxury', 'cars/hatchback-sports', 'cars/race-future'],
  light: ['roads/light-curved'], pole: ['roads/electricity-pole'], wires: ['roads/electricity-wires'],
  trees: ['nature/tree_oak', 'nature/tree_default', 'nature/tree_detailed', 'nature/tree_fat', 'nature/tree_plateau', 'nature/tree_small'],
  bushes: ['nature/plant_bushLarge', 'nature/plant_bush', 'nature/grass_large'],
  flowers: ['nature/flower_purpleA', 'nature/flower_redA', 'nature/flower_yellowA'],
  fence: ['nature/fence_simple'],
};
const NIGHT = new THREE.Color(0x2a1748);
function nightTint(root, amount = 0.45) {  // 낮 색을 밤 보랏빛으로 끌어내린다
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.material = o.material.clone();
    o.material.color.lerp(NIGHT, amount);
  });
}
(async () => {
  try {
    const loader = new GLTFLoader();
    const entries = Object.entries(PROP_FILES).flatMap(([k, fs]) => fs.map((f) => [k, f]));
    const loaded = await Promise.all(entries.map(([k, f]) => loader.loadAsync(`/assets/models/${f}.glb`).then((g) => [k, f, g.scene])));
    for (const [k, f, sc] of loaded) {
      const box = new THREE.Box3().setFromObject(sc);
      sc.userData.size = box.getSize(new THREE.Vector3()); sc.userData.minY = box.min.y; sc.userData.file = f;
      if (Array.isArray(props[k])) props[k].push(sc); else props[k] = sc;
    }
    props.ready = true;
    buildPlayerKart();
    buildTraffic();
    for (const g of drive.segs) decorate(g);
  } catch (e) { console.warn('props', e); }
})();
function propClone(tpl, height, tint = 0.45) {
  const p = tpl.clone(true);
  nightTint(p, tint);
  const s = height / tpl.userData.size.y;
  p.scale.setScalar(s);
  p.userData.lift = -tpl.userData.minY * s;
  return p;
}

// 플레이어 차: 80년대 레트로 스포츠카(Kenney sedan-sports) — 핫핑크 차체 + 시안 창 + 넓은 빨간 미등 + 바닥 네온.
// 지붕을 잘라(클리핑) 오픈카로 만들고 운전석에 토끼 뒷모습을 태운다(아웃런 시점).
const roofClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
function buildPlayerKart() {
  const car = drive.car;
  for (const o of [...car.children]) if (o !== drive.driver) o.visible = false;
  const tpl = props.cars.find((c) => c.userData.file === 'cars/sedan-sports');
  const m = tpl.clone(true);
  const s = 3.4 / tpl.userData.size.z;  // 차 길이 3.4
  m.scale.setScalar(s); m.rotation.y = Math.PI;
  m.position.y = -tpl.userData.minY * s - 0.95;
  m.traverse((o) => {
    if (!o.isMesh) return;
    const glassy = o.name === 'body';
    o.material = new THREE.MeshStandardMaterial({
      map: o.material.map, color: 0xffa3d2, roughness: 0.3, metalness: 0.25,
      emissive: 0x7a1848, side: glassy ? THREE.DoubleSide : THREE.FrontSide,
      clippingPlanes: o.name === 'body' ? [roofClip] : [],
    });
  });
  car.add(m);
  car.userData.wheels = [];
  m.traverse((o) => { if (o.name.startsWith('wheel')) { car.userData.wheels.push(o); o.material.color.set(0x2a2440); } });
  car.userData.clipH = -0.95 + 0.62 * tpl.userData.size.y * s;  // 창틀 높이에서 위를 잘라 오픈카로
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.14, 0.06), new THREE.MeshBasicMaterial({ color: 0xff2a4a }));
  tail.position.set(0, -0.4, 1.72); car.add(tail);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.6), new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.6 }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = -0.93; car.add(glow);
  drive.driver.userData.h = 1.25;
  if (drive.driver.material.map.image) { const im = drive.driver.material.map.image; drive.driver.scale.set(1.25 * (im.width / 6) / im.height, 1.25, 1); }
  drive.driver.position.set(0, -0.5, 0.35);
}
// 다른 차들: Kenney 차 모델 + 빨간 미등(뒤에서 보이게)
function buildTraffic() {
  for (const c of drive.traffic) {
    for (const o of [...c.children]) c.remove(o);
    const m = propClone(pick(props.cars), 1.5, 0.35);
    m.rotation.y = Math.PI;
    m.position.y = m.userData.lift - 0.95;
    c.add(m);
    for (const x of [-0.55, 0.55]) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.08), new THREE.MeshBasicMaterial({ color: 0xff3355 }));
      t.position.set(x, -0.25, 1.4); c.add(t);
    }
  }
}
const fireflyMat = new THREE.PointsMaterial({ color: GOLD, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.9 });
const parkGroundMat = new THREE.MeshStandardMaterial({ color: 0x1a2440, roughness: 0.9 });
const lampGlowMat = new THREE.MeshBasicMaterial({ color: GOLD });
// 가로등 둘레 따뜻한 빛 번짐(가운데가 밝은 원형 그라데이션, 겹치면 더해진다)
const haloMat = new THREE.SpriteMaterial({
  map: (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,225,140,0.9)'); gr.addColorStop(0.35, 'rgba(255,190,90,0.35)'); gr.addColorStop(1, 'rgba(255,170,80,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(),
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0.55,
});
const poolTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,200,110,0.55)'); gr.addColorStop(0.6, 'rgba(255,170,80,0.15)'); gr.addColorStop(1, 'rgba(255,160,70,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
const lampSpots = [];  // 실제 조명을 옮겨 붙일 등 위치 후보(가까운 4개만 켠다)
function lightPool(deco, x, y, z, r) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(r, r), poolMat); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); deco.add(p);
}
const gardenPoleMat = new THREE.MeshStandardMaterial({ color: 0x3d3488, roughness: 0.6 });
function gardenLamp(deco, x, z) {  // 공원 산책로 등: 가는 기둥 + 둥근 등 + 빛 번짐
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3, 6), gardenPoleMat); pole.position.set(x, 0.8, z); deco.add(pole);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), lampGlowMat); bulb.position.set(x, 2.45, z); deco.add(bulb);
  const halo = new THREE.Sprite(haloMat); halo.scale.set(2.2, 2.2, 1); halo.position.set(x, 2.45, z); deco.add(halo);
  lightPool(deco, x, -0.64, z, 6); lampSpots.push(bulb);
}
function streetLights(deco, SEG) {  // 길 양쪽 가로등(Kenney) + 노란 등
  if (!props.light) return;
  for (const side of [-1, 1]) {
    const l = propClone(props.light, 5, 0.2);
    l.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    l.position.set(side * 5.6, l.userData.lift, 0); deco.add(l);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.5), lampGlowMat);
    bulb.position.set(side * 4.2, 4.9, 0); deco.add(bulb);
    const halo = new THREE.Sprite(haloMat); halo.scale.set(2.6, 2.6, 1); halo.position.set(side * 4.2, 4.7, 0); deco.add(halo);
    lightPool(deco, side * 3.4, 0.03, 0, 7); lampSpots.push(bulb);
  }
}
function decorateProps(deco, zone, SEG, k) {
  if (!props.ready) return;
  if (zone.key === 'city') streetLights(deco, SEG);
  if (zone.key === 'park') {
    streetLights(deco, SEG);  // 길가 가로등: 매 칸 양쪽
    for (const side of [-1, 1]) {
      for (const dz of [-SEG / 4, SEG / 4]) gardenLamp(deco, side * (9 + rnd() * 2), dz);  // 산책로 등
      const gr = new THREE.Mesh(new THREE.BoxGeometry(60, 1, SEG), parkGroundMat); gr.position.set(side * 35, -1.2, 0); deco.add(gr);

      for (let i = 0; i < 4; i++) {  // 벚꽃·밤나무
        const t = propClone(pick(props.trees), 5 + rnd() * 5, 0.35);
        const cherry = rnd() < 0.55;
        if (cherry) t.traverse((o) => { if (o.isMesh && /leaf/i.test(o.material.name)) { o.material.color.set(0xff8fc8); o.material.emissive = new THREE.Color(0x5a1a40); } });
        t.position.set(side * (8 + rnd() * 18), t.userData.lift - 0.7, (rnd() - 0.5) * SEG); t.rotation.y = rnd() * 6; deco.add(t);
      }
      for (let i = 0; i < 5; i++) {
        const b = propClone(rnd() < 0.5 ? pick(props.flowers) : pick(props.bushes), 0.6 + rnd() * 0.9, 0.3);
        b.position.set(side * (6 + rnd() * 3), b.userData.lift - 0.7, (rnd() - 0.5) * SEG); deco.add(b);
      }
      const f = propClone(props.fence, 0.9, 0.4); f.scale.x *= SEG / (props.fence.userData.size.x * f.scale.y);
      f.rotation.y = Math.PI / 2; f.position.set(side * 5.4, f.userData.lift - 0.2, 0); deco.add(f);
    }
    const pos = [];  // 반딧불
    for (let i = 0; i < 18; i++) pos.push((rnd() < 0.5 ? -1 : 1) * (6 + rnd() * 20), 1 + rnd() * 5, (rnd() - 0.5) * SEG);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    deco.add(new THREE.Points(geo, fireflyMat));
  }
  if (zone.key === 'slum' && props.pole && k % 3 === 0) {  // 전봇대(세 칸에 한 번)
    for (const side of [-1, 1]) {
      const p = propClone(props.pole, 8, 0.3); p.position.set(side * 6.2, p.userData.lift - 0.7, 0); deco.add(p);
    }
  }
}

function decorate(g) {
  const old = g.userData.deco;
  if (old) g.remove(old);
  const deco = new THREE.Group(); g.add(deco); g.userData.deco = deco;
  const z = zoneOf(g.userData.k), SEG = drive.SEG;
  decorateProps(deco, z, SEG, g.userData.k);
  const k = g.userData.k, inZone = ((k % ZONE_LEN) + ZONE_LEN) % ZONE_LEN;
  const zi = Math.floor(k / ZONE_LEN);
  if (inZone === 6 && k > 0 && zi < FINISH_ZONE - 1) crossroad(deco, zi);  // 마지막 구역 끝은 교차로 대신 피니시
  if (k === FINISH_K) finishGate(deco);
  if (inZone === 3) landmark(deco, z, SEG);
  if (inZone === 8) resident(deco, z);
  if (k % 2 === 0) roadsideBoard(deco, z.key, k % 4 === 0 ? -1 : 1, (rnd() - 0.5) * SEG * 0.6);
  if (z.key === 'city' || z.key === 'slum') {  // 길가 땅(물 대신 거리)
    for (const side of [-1, 1]) { const gr = new THREE.Mesh(new THREE.BoxGeometry(60, 1, SEG), groundMat); gr.position.set(side * 35, -1.2, 0); deco.add(gr); }
  }
  if (z.key === 'city' && kit.ready) {
    for (const side of [-1, 1]) {
      let x = 9;
      for (let row = 0; row < 3; row++) {
        const b = kitBuilding(row === 0 ? pick(['mid', 'tall']) : 'tall', row === 0 ? 14 + rnd() * 18 : 26 + rnd() * 40);
        const half = b.userData.footprint / 2;
        b.position.set(side * (x + half), b.userData.lift - 0.7, (rnd() - 0.5) * 6);
        b.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        deco.add(b); x += half * 2 + 3 + rnd() * 6;
        if (row === 0 && rnd() < 0.7) {  // 길 쪽 세로 네온 간판
          const sh = 4 + rnd() * 6;
          const sign = new THREE.Mesh(new THREE.BoxGeometry(0.3, sh, 1.2), new THREE.MeshBasicMaterial({ color: pick(NEON) }));
          sign.position.set(side * 8.6, 4 + rnd() * 6 + sh / 2, (rnd() - 0.5) * 8); deco.add(sign);
        }
      }
    }
  }
  if (z.key === 'slum' && kit.ready) {
    for (const side of [-1, 1]) for (let j = 0; j < 2; j++) {
      const b = kitBuilding('low', 7 + rnd() * 7);
      b.position.set(side * (7.5 + b.userData.footprint / 2), b.userData.lift - 0.7, -SEG / 2 + 5 + j * 10);
      b.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      deco.add(b);
    }
    const pts = [];  // 길 위로 늘어진 전선 + 빨간 등
    for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector3(-8 + 16 * t, 7.5 - Math.sin(t * Math.PI) * 1.6, 0)); }
    deco.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x3d3488 })));
    for (let i = 1; i < 10; i += 2) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.5), lanternMat); l.position.copy(pts[i]).y -= 0.5; deco.add(l); }
  }
  if (z.key === 'tower' && g.userData.k % 2 === 0) {  // 핑크 격자 아치 + 빛 고리 사이로 통과
    for (const x of [-7.5, 7.5]) for (let y = 0; y < 26; y += 2.6) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 2.4), towerLegMat); r.position.set(x, y + 1, 0); deco.add(r);
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.6, 0.25), towerLegMat); v.position.set(x, y + 2.3, (y / 2.6) % 2 ? 1.1 : -1.1); deco.add(v);
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.5, 2.4), towerLegMat); top.position.y = 27; deco.add(top);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.18, 6, 32), new THREE.MeshBasicMaterial({ color: GOLD })); ring.position.y = 6; deco.add(ring);
    ring.userData.isRing = true; liveRings.push(ring);
  }
}

const liveRings = [];
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const D = { lane: 1, speed: 18, dist: 0, stars: 0, bump: 0, boost: 0, prev: new Set(), rings: 0, ringsTotal: 0, beaten: false, glitch: 0, villainDone: false, ringsDone: false, startT: 0 };
// 글리치 킹: 뒷골목에서 길에 뛰어들어 반짝이 버그를 뿌린다. 아이템 하나를 주우면 정화
const villainMat = new THREE.SpriteMaterial({ map: (() => { const t = new THREE.TextureLoader().load('/assets/chars/villain.png'); t.colorSpace = THREE.SRGBColorSpace; return t; })(), transparent: true, alphaTest: 0.2 });
const villain = new THREE.Sprite(villainMat); villain.center.set(0.5, 0); villain.scale.set(2.2, 2.2, 1); villain.visible = false;

// ===== 도로 굴곡(레트로 레이싱 방식) =====
// 도로·게임 판정은 직선(z축) 그대로 두고, 그리기 직전에 차와의 거리에 따라 옆(커브)·위(언덕)로 밀어 보여 준다.
// 구역마다 [커브 세기, 언덕 세기]. 조각 경계에서 선형 보간해 구역이 바뀔 때 툭 꺾이지 않게.
const BEND = { city: [0.5, 0.25], slum: [1.0, 0.15], river: [0.25, 1.0], park: [0.8, 0.5], tower: [0.6, 1.1] };
const BEND_BACK = 40, BEND_AHEAD = 240, BEND_STEP = 2, BEND_N = (BEND_BACK + BEND_AHEAD) / BEND_STEP + 1;
const bend = { x: new Float32Array(BEND_N), y: new Float32Array(BEND_N), yaw: new Float32Array(BEND_N), pitch: new Float32Array(BEND_N), cz: 0 };
function bendAmp(z) {
  const u = -z / drive.SEG, k = Math.floor(u), f = u - k, a = BEND[zoneOf(k).key], b = BEND[zoneOf(k + 1).key];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}
const curvatureAt = (z) => bendAmp(z)[0] * 0.0045 * Math.sin(z / 32);           // 좌우 꺾임 비율(거리당 방향 변화)
const slopeAt = (z) => bendAmp(z)[1] * 0.11 * Math.sin(z / 24 + 1.3);          // 오르막·내리막 경사
function bendUpdate(cz) {  // 차 뒤 40m ~ 앞 240m 를 2m 간격으로 적분한 표
  bend.cz = cz;
  const s0 = slopeAt(cz), i0 = BEND_BACK / BEND_STEP;
  for (const dir of [1, -1]) {
    let yaw = 0, x = 0, y = 0;
    for (let i = i0, d = 0; i >= 0 && i < BEND_N; i += dir, d += dir * BEND_STEP) {
      bend.x[i] = x; bend.y[i] = y; bend.yaw[i] = yaw; bend.pitch[i] = slopeAt(cz - d) - s0;
      yaw += curvatureAt(cz - d) * BEND_STEP * dir; x += yaw * BEND_STEP * dir; y += bend.pitch[i] * BEND_STEP * dir;
    }
  }
}
function bendAt(z) {  // z 위치의 [x 밀림, y 밀림, yaw, pitch]
  const i = THREE.MathUtils.clamp((bend.cz - z + BEND_BACK) / BEND_STEP, 0, BEND_N - 1), a = Math.floor(i), f = i - a, b = Math.min(a + 1, BEND_N - 1);
  return [bend.x[a] + (bend.x[b] - bend.x[a]) * f, bend.y[a] + (bend.y[b] - bend.y[a]) * f, bend.yaw[a], bend.pitch[a]];
}
// 스프라이트(아이템·차·글리치 킹)는 판정에 position 을 쓰므로 그리기 전에만 밀고 그린 뒤 되돌린다
function bendApply(objs) { for (const o of objs) { const [x, y] = bendAt(o.position.z); o.userData.bx = o.position.x; o.userData.by = o.position.y; o.position.x += x; o.position.y += y; } }
function bendRestore(objs) { for (const o of objs) { o.position.x = o.userData.bx; o.position.y = o.userData.by; } }
drive.s.add(villain);
let eventUntil = 0, discoverUntil = 0;
function say(textMsg, sec = 2.6) { eventEl.textContent = textMsg; eventEl.hidden = false; eventUntil = clock.elapsedTime + sec; }
const popEl = stage.querySelector('.play-pop');
function pop(delta) {  // 점수 옆에 +1 / -2 가 떠올랐다 사라진다
  popEl.textContent = (delta > 0 ? '+' : '') + delta;
  popEl.classList.toggle('is-minus', delta < 0);
  popEl.classList.remove('is-on'); void popEl.offsetWidth; popEl.classList.add('is-on');
}
function drawMap(zone) {  // 월드맵: 구역 5개 점. 가 본 곳은 켜지고 지금 있는 곳은 깜빡인다
  mapEl.replaceChildren(...ZONES.map((z) => { const s = document.createElement('span'); s.textContent = z.short; s.className = z === zone ? 'is-now' : D.seen?.has(z) ? 'is-seen' : ''; return s; }));
}
function discover(zone) {  // 처음 들어가는 구역: 가운데 큰 발견 카드
  discoverEl.querySelector('.play-discover-name').textContent = zone.name;
  discoverEl.querySelector('.play-discover-desc').textContent = zone.desc;
  discoverEl.hidden = false; discoverUntil = clock.elapsedTime + 3;
}
function resetDrive() {
  D.lane = 1; D.speed = 18; D.dist = 0; D.bump = 0; D.boost = 0; D.stars = 0; D.rings = 0; D.ringsTotal = 0; D.beaten = false; D.glitch = 0; D.crashes = 0; D.finished = false; D.turn = null; drive.car.rotation.y = 0; D.startT = clock.elapsedTime;
  villain.visible = false; stage.classList.remove('is-glitch', 'is-hit'); popEl.classList.remove('is-on');
  drive.car.position.set(0, 0.95, 0); camFollowX = 0; zoneNow = null;
  route.length = 1; for (const i in forkAlt) delete forkAlt[i];  // 경로는 드라이브마다 새로 고른다
  const { segs, bugs, traffic, SEG, LANES } = drive;  // 도로·아이템·차를 출발점으로 되감는다(두 번째 드라이브부터 길이 비던 문제)
  segs.forEach((g, i) => { g.position.z = SEG * 2 - i * SEG; g.userData.k = i - 2; decorate(g); });
  bugs.forEach((b, i) => {
    b.position.set(pick(LANES), 0.5, -30 - i * 25);
    if (!b.userData.halo) { const h = new THREE.Sprite(haloMat); h.scale.set(1.3, 1.3, 1); h.position.y = 0.5; b.add(h); b.userData.halo = h; }  // 희귀 아이템 금빛 후광
    setItem(b, itemFor(zoneOf(Math.round(-b.position.z / SEG)).key));
  });
  traffic.forEach((c, i) => c.position.set(pick(LANES), 0.95, -70 - i * 45));
  D.seen = new Set(); D.newDex = 0; mapEl.hidden = false; drawMap(null);
}
function driveTick(dt, t) {
  const { car, segs, bugs, traffic, SEG, NSEG, LANES } = drive;
  // 차선: 누르는 순간 한 칸
  if (!D.turn && !D.finished) for (const [k, d] of [['left', -1], ['right', 1]]) {
    if (held.has(k) && !D.prev.has(k)) D.lane = THREE.MathUtils.clamp(D.lane + d, 0, 2);
  }
  D.prev = new Set(held);
  const target = D.finished ? 0 : D.turn ? 9 : (held.has('up') ? 28 : held.has('down') ? 10 : 18) + (D.boost > 0 ? 14 : 0);  // 피니시 뒤엔 멈추고, 회전 중엔 감속
  D.boost = Math.max(0, D.boost - dt);
  if (D.bump > 0) D.bump -= dt; else D.speed += (target - D.speed) * Math.min(1, dt * 2);
  const tx = LANES[D.lane];
  car.rotation.z = (car.position.x - tx) * 0.12;
  car.position.x += (tx - car.position.x) * Math.min(1, dt * 8);
  car.position.z -= D.speed * dt;
  for (const w of car.userData.wheels || []) w.rotation.x -= D.speed * dt * 1.4;
  if (car.userData.clipH !== undefined) roofClip.constant = car.position.y + car.userData.clipH;
  car.position.y = 0.95 + (reduceMotion ? 0 : Math.sin(t * 6) * 0.05);
  D.dist += D.speed * dt;
  const cz = car.position.z;
  for (const g of segs) if (g.position.z > cz + SEG) { g.position.z -= SEG * NSEG; g.userData.k += NSEG; decorate(g); }
  bendUpdate(cz);
  for (const g of segs) { const [x, y, yaw, pitch] = bendAt(g.position.z); g.position.x = x; g.position.y = y; g.rotation.y = -yaw; g.rotation.x = pitch; }
  const [, , yawCar, pitchCar] = bendAt(cz - 8);  // 커브에선 안쪽으로 기울고 언덕에선 코를 든다
  car.rotation.z += yawCar * 1.6; car.rotation.x = pitchCar * 0.8;
  drive.skyline.position.z = cz;
  // 차 앞쪽 가까운 가로등 4개에 실제 조명을 옮겨 붙인다 — 주변 나무·길이 등불 색을 받는다
  for (let i = lampSpots.length - 1; i >= 0; i--) if (!lampSpots[i].parent?.parent?.parent) lampSpots.splice(i, 1);
  const wp = new THREE.Vector3();
  const near = lampSpots.map((b) => { b.getWorldPosition(wp); return [wp.z - cz, wp.clone()]; }).filter(([dz]) => dz < 6 && dz > -45).sort((a, b) => b[0] - a[0]).slice(0, 4);
  drive.lampLights.forEach((l, i) => { if (near[i]) { l.position.copy(near[i][1]); l.intensity = 22; } else l.intensity = 0; });
  // 교차로: 들어서는 순간 ◀/▶ 를 누르고 있으면 그쪽 구역으로 회전, 아니면 직진. 이미 깔린 앞 조각은 다시 꾸민다
  for (let i = liveForks.length - 1; i >= 0; i--) {
    const f = liveForks[i];
    if (!f.node.parent?.parent?.parent) { liveForks.splice(i, 1); continue; }
    f.node.getWorldPosition(wp);
    if (!f.warned && wp.z - cz > -80) { f.warned = true; say(`교차로: ◀ ${f.left.name} · 직진 ${f.def.name} · ${f.right.name} ▶`, 2.6); }
    if (f.passed || wp.z < cz) continue;
    f.passed = true;
    const dir = held.has('left') ? -1 : held.has('right') ? 1 : 0;
    if (dir) {
      const next = dir < 0 ? f.left : f.right;
      route.length = f.i + 1; route.push(next); delete forkAlt[f.i + 1];
      for (const g of segs) if (Math.floor(g.userData.k / ZONE_LEN) === f.i + 1) decorate(g);
      D.turn = { dir, t: 0, zone: next };
    } else say(`직진 → ${f.def.name}`, 2);
  }
  if (D.turn) {  // 회전 연출: 감속하며 차가 돌고 카메라가 따라 돌다가 별빛 와이프, 걷히면 새 구역이 정면
    const tr = D.turn; tr.t += dt;
    car.rotation.y = reduceMotion ? 0 : -tr.dir * Math.sin(Math.min(1, tr.t / 0.6) * Math.PI / 2) * 1.1;
    if (tr.t > 0.5 && !tr.wiped) { tr.wiped = true; wipeEl.classList.add('is-on'); }
    if (tr.t > 1.05) { D.turn = null; car.rotation.y = 0; wipeEl.classList.remove('is-on'); say(`${tr.dir < 0 ? '좌회전' : '우회전'} → ${tr.zone.name}`, 2.2); }
  }
  for (let i = liveFinish.length - 1; i >= 0; i--) {  // 피니시 라인 통과
    const b = liveFinish[i];
    if (!b.parent?.parent?.parent) { liveFinish.splice(i, 1); continue; }
    b.getWorldPosition(wp);
    if (!D.finished && wp.z > cz) { D.finished = true; D.time = t - D.startT; D.finishAt = t; say(`FINISH! 기록 ${fmtTime(D.time)}`, 3); }
  }
  if (D.finished && t - D.finishAt > 2) switchMode('roof');
  const kNow = Math.round(-cz / SEG), zone = zoneOf(kNow);
  if (zone !== zoneNow) {  // 구역 진입: 사건은 들어올 때마다 리셋(슬럼마다 글리치 킹, 타워마다 빛 고리)
    zoneNow = zone;
    if (D.seen.has(zone)) zoneBannerUntil = t + 2.2; else { D.seen.add(zone); discover(zone); }
    drawMap(zone);
    if (zone.key === 'slum') { D.villainDone = false; villain.visible = true; villain.position.set(pick(LANES), 0.3, cz - 75); villain.userData.hit = false; }
    if (zone.key === 'tower') { D.ringsDone = false; D.rings = 0; }
  }
  if (villain.visible) {
    villain.position.x = Math.sin(t * 2.2) * 3;
    villain.position.y = 0.3 + Math.abs(Math.sin(t * 5)) * 0.8;
    if (!villain.userData.hit && villain.position.z - cz > -4) {
      villain.userData.hit = true; D.villainDone = true; D.glitch = 6;
      stage.classList.add('is-glitch'); say('글리치 킹이 반짝이 버그를 뿌렸다! 아이템을 주우면 정화돼요', 3.2);
    }
    if (villain.position.z > cz + 8) villain.visible = false;
  }
  if (D.glitch > 0) {
    D.glitch -= dt;
    if (!reduceMotion && Math.random() < dt * 1.2) D.lane = THREE.MathUtils.clamp(D.lane + (Math.random() < 0.5 ? -1 : 1), 0, 2);  // 핸들이 흔들린다
    if (D.glitch <= 0) stage.classList.remove('is-glitch');
  }
  // 핑크 타워 빛 고리 통과
  for (let i = liveRings.length - 1; i >= 0; i--) {
    const r = liveRings[i];
    if (!r.parent?.parent?.parent) { liveRings.splice(i, 1); continue; }
    r.getWorldPosition(wp);
    if (!r.userData.passed && wp.z > cz) {
      r.userData.passed = true; D.rings += 1; D.ringsTotal += 1; D.stars += 1; pop(1);
      if (!D.ringsDone && D.rings >= 5) { D.ringsDone = true; D.beaten = true; D.stars += 5; say('빛 고리 5개 통과! 글리치 킹이 도망갔어요 ★+5', 3); }
      else say(`빛 고리 ${D.rings}/5`, 1.2);
    }
  }
  drive.s.fog.color.lerp(new THREE.Color(zone.fog), Math.min(1, dt * 1.5));
  drive.hemi.color.lerp(new THREE.Color(zone.sky), Math.min(1, dt * 1.5));
  zoneEl.hidden = t >= zoneBannerUntil; zoneEl.textContent = zone.name;
  if (t >= eventUntil) eventEl.hidden = true;
  if (t >= discoverUntil) discoverEl.hidden = true;
  for (let i = liveResidents.length - 1; i >= 0; i--) {  // 길가 주민: 가까워지면 한마디, 제자리에서 통통
    const r = liveResidents[i];
    if (!r.spr.parent?.parent?.parent) { liveResidents.splice(i, 1); continue; }
    r.spr.getWorldPosition(wp);
    if (!r.said && wp.z - cz > -16) { r.said = true; say(`${r.info.name}: "${r.info.quote}"`, 2.4); }
    if (!reduceMotion) r.spr.position.y = r.base + Math.abs(Math.sin(t * 4)) * 0.15;
  }
  for (let i = livePetals.length - 1; i >= 0; i--) {  // 벚꽃잎: 천천히 떨어지다가 위에서 다시
    const p = livePetals[i];
    if (!p.parent?.parent?.parent) { livePetals.splice(i, 1); continue; }
    const a = p.geometry.attributes.position;
    for (let i = 1; i < a.array.length; i += 3) { a.array[i] -= dt * 1.4; a.array[i - 1] += Math.sin(t * 2 + i) * dt * 0.6; if (a.array[i] < 0) a.array[i] = 12; }
    a.needsUpdate = true;
  }
  hintEl.hidden = switching || t - D.startT > 5;  // 조작 안내는 처음 5초만
  drive.water.position.z = cz - 150; drive.water.userData.murk.position.z = cz - 150;
  drive.dMoon.position.set(30, 60, cz - 320);
  drive.dStars.position.z = cz;
  for (const b of bugs) {
    b.position.y = 0.5 + (reduceMotion ? 0 : Math.sin(t * 3 + b.position.z) * 0.18);
    const respawn = (dz) => { b.position.z -= dz; b.position.x = pick(LANES); setItem(b, itemFor(zoneOf(Math.round(-b.position.z / SEG)).key)); };
    if (Math.abs(b.position.z - cz) < 1.6 && Math.abs(b.position.x - car.position.x) < 1.3) {
      const n = b.userData.item, rare = RARE_SET.has(n);
      D.stars += rare ? 3 : 1; pop(rare ? 3 : 1); respawn(160 + rnd() * 80);
      if (D.glitch > 0) { D.glitch = 0; stage.classList.remove('is-glitch'); say('정화 완료! 반짝이 버그가 사라졌어요', 2); }
      else if (!dex.has(n)) { dex.add(n); D.newDex += 1; saveDex(); say(`NEW! 도감 ${dex.size}/24 ${rare ? '· 희귀 아이템 ★+3' : ''}`, 2); }
      else if (rare) say('희귀 아이템 ★+3', 1.4);
    }
    else if (b.position.z > cz + 6) respawn(200);
  }
  for (const c of traffic) {
    c.position.z -= c.userData.v * dt;
    if (Math.abs(c.position.z - cz) < 3 && Math.abs(c.position.x - car.position.x) < 1.6 && D.bump <= 0) {
      D.speed = 5; D.bump = 0.6; D.crashes += 1;
      D.stars = Math.max(0, D.stars - 2); pop(-2); say('쾅! ★-2', 1.4);
      stage.classList.add('is-hit'); setTimeout(() => stage.classList.remove('is-hit'), 300);
    }
    if (c.position.z > cz + 12) { c.position.z = cz - 140 - rnd() * 80; c.position.x = pick(LANES); }
  }
  for (let i = liveBoards.length - 1; i >= 0; i--) {
    const b = liveBoards[i];
    if (!b.board.parent?.parent?.parent) { liveBoards.splice(i, 1); continue; }
    b.board.getWorldPosition(wp);
    const dz = wp.z - cz;
    if (dz < 4 && dz > -110 && (!b.last || t - b.last > 0.12)) { b.panel.draw(b.g, t + b.seed); b.tex.needsUpdate = true; b.last = t; }
  }
  const cam = drive.cam;
  // 카트 뒤 낮은 위치에서 따라간다(카트라이더·레이싱 게임 시점). 차선 바꿀 때 카메라가 반 박자 늦게 따라온다
  const shake = D.bump > 0 && !reduceMotion ? Math.sin(t * 60) * 0.12 : 0;
  camFollowX += (car.position.x - camFollowX) * Math.min(1, dt * 4);
  if (D.turn) {  // 회전 중엔 차 머리 방향을 따라 카메라가 돈다
    const h = car.rotation.y, fx = -Math.sin(h), fz = -Math.cos(h);
    cam.position.set(car.position.x - fx * 7.4, car.position.y + 2.9, cz - fz * 7.4);
    cam.lookAt(car.position.x + fx * 9, car.position.y + 0.9, cz + fz * 9);
  } else {
    cam.position.set(camFollowX * 0.9 + shake, car.position.y + 2.9, cz + 7.4);
    const [lookX, lookY] = bendAt(cz - 26);  // 시선은 커브 안쪽·언덕 위아래로 반쯤 따라간다
    cam.lookAt(camFollowX + lookX * 0.35, car.position.y + 0.9 + lookY * 0.45, cz - 9);
  }
  cam.fov = 60 + (D.speed - 18) * 0.7; cam.updateProjectionMatrix();
  hudEl.textContent = `★ ${D.stars}  ·  ${(D.dist / 1000).toFixed(2)} / ${(FINISH_K * SEG / 1000).toFixed(2)} km${zone.key === 'tower' ? `  ·  RING ${Math.min(D.rings, 5)}/5` : ''}`;
  speedEl.textContent = `${Math.round(D.speed * 6)} km/h`;
}

// 렌더 패스: 픽셀 → 번짐 → 출력
const composer = new EffectComposer(renderer);
const pixelPass = new RenderPixelatedPass(3, scene, camera, { normalEdgeStrength: 0.2, depthEdgeStrength: 0.35 });
composer.addPass(pixelPass);
const bloom = new UnrealBloomPass(new THREE.Vector2(640, 360), 0.55, 0.3, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  for (const c of [camera, drive.cam]) { c.aspect = w / h; c.updateProjectionMatrix(); }
}
new ResizeObserver(resize).observe(stage);
resize();

// 입력: 키보드 + 화면 콘솔
const held = new Set();
const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'a', Enter: 'a', KeyJ: 'a', Escape: 'b', KeyK: 'b' };
let inView = true;
new IntersectionObserver(([e]) => { inView = e.isIntersecting; }).observe(stage);
addEventListener('keydown', (e) => {
  const k = KEYMAP[e.code];
  if (!k || !inView) return;
  e.preventDefault();
  if (k === 'a' || k === 'b') { if (!e.repeat) press(k); } else held.add(k);
});
addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) held.delete(k); });
for (const btn of document.querySelectorAll('.pad-btn')) {
  const k = btn.dataset.key;
  const down = (e) => { e.preventDefault(); btn.classList.add('is-down'); if (k === 'a' || k === 'b') press(k); else held.add(k); };
  const up = () => { btn.classList.remove('is-down'); held.delete(k); };
  btn.addEventListener('pointerdown', down);
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(ev, up);
}

let dialogOpen = false, twirlT = -1, mode = 'roof', switching = false;
function switchMode(next) {
  if (switching) return;
  switching = true; closeDialog();
  wipeEl.classList.add('is-on');
  setTimeout(() => {
    mode = next;
    pixelPass.scene = next === 'drive' ? drive.s : scene;
    pixelPass.camera = next === 'drive' ? drive.cam : camera;
    hudEl.hidden = speedEl.hidden = mapEl.hidden = next !== 'drive'; zoneEl.hidden = eventEl.hidden = discoverEl.hidden = true;
    const result = mode === 'roof' && D.dist > 30 ? `${D.finished ? `FINISH ${fmtTime(D.time)} · ` : ''}★ ${D.stars} · ${(D.dist / 1000).toFixed(2)} km · 탐험 ${D.seen.size}/${ZONES.length} 구역 · 도감 ${dex.size}/24${D.newDex ? ` (NEW ${D.newDex})` : ''} · 빛 고리 ${D.ringsTotal}개 · 충돌 ${D.crashes}회${D.beaten ? ' · 글리치 킹 격퇴!' : ''}` : '';
    if (next === 'drive') { resetDrive(); hintEl.hidden = false; hintEl.textContent = '◀ ▶ 차선 · ▲▼ 속도 · A 부스트 · B 옥상으로'; }
    else {
      bunny.position.set(7.2, 0, -4.4); stage.classList.remove('is-glitch'); villain.visible = false;
      if (result) showDialog(D.finished ? 'FINISH!' : 'DRIVE 결과', `${result} — 오늘의 퀘스트: ${(data.posts || [])[0] || '새 글 준비 중'}`);
    }
    wipeEl.classList.remove('is-on');
    switching = false;
  }, reduceMotion ? 0 : 480);
}
function showDialog(name, text) {
  dialogEl.querySelector('.play-dialog-name').textContent = name;
  dialogEl.querySelector('.play-dialog-text').textContent = text;
  dialogEl.hidden = false; dialogOpen = true;
}
function closeDialog() { dialogEl.hidden = true; dialogOpen = false; }

function nearest() {
  let best = null, bd = 2.4;
  for (const n of npcs) {
    const d = Math.hypot(n.position.x - bunny.position.x, n.position.z - bunny.position.z);
    if (d < bd) { bd = d; best = { type: 'npc', n }; }
  }
  const door = scene.userData.door.position;
  if (Math.hypot(door.x - bunny.position.x, door.z - bunny.position.z) < 2) best = { type: 'door' };
  return best;
}

function press(k) {
  if (mode === 'drive') {
    if (k === 'b') switchMode('roof');
    else D.boost = 1.2;
    return;
  }
  if (k === 'b') { closeDialog(); return; }
  if (dialogOpen) { closeDialog(); return; }
  const t = nearest();
  if (t?.type === 'npc') showDialog(t.n.userData.info.name, `"${t.n.userData.info.quote}"`);
  else if (t?.type === 'door') switchMode('drive');
  else { twirlT = 0; burst(bunny.position); }
}

// 루프
const clock = new THREE.Clock();
const camPos = new THREE.Vector3(0, 5, 13), camLook = new THREE.Vector3();
const TWIRL = [0, 1, 2, 3, 4, 5, 5];  // 마지막 결정 포즈를 한 칸 더
function tick() {
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
  const blinkOn = reduceMotion || Math.floor(t * 1.5) % 2 === 0;
  for (const b of blinkers) b.visible = blinkOn;
  if (mode === 'drive') {
    driveTick(dt, t);
    const bent = [...drive.bugs, ...drive.traffic, villain];
    bendApply(bent); composer.render(dt); bendRestore(bent);
    requestAnimationFrame(tick);
    return;
  }
  // 이동
  if (!dialogOpen && twirlT < 0) {
    const v = new THREE.Vector2((held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0), (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0));
    if (v.lengthSq()) {
      v.normalize().multiplyScalar(5 * dt);
      bunny.position.x = THREE.MathUtils.clamp(bunny.position.x + v.x, -ROOF.w / 2 + 0.8, ROOF.w / 2 - 0.8);
      bunny.position.z = THREE.MathUtils.clamp(bunny.position.z + v.y, -ROOF.d / 2 + 0.8, ROOF.d / 2 - 0.8);
      bunny.position.y = Math.abs(Math.sin(t * 12)) * 0.12;
    } else bunny.position.y = 0;
  }
  // 요술봉 한 바퀴 프레임
  const tex = bunny.userData.tex;
  if (twirlT >= 0) {
    twirlT += dt;
    const i = Math.floor(twirlT / 0.18);
    if (i >= TWIRL.length) { twirlT = -1; tex.offset.x = 0; } else tex.offset.x = TWIRL[i] / 6;
  }
  // 동료 둥실
  if (!reduceMotion) for (const n of npcs) n.position.y = n.userData.base + Math.sin(t * 2 + n.position.x) * 0.06;
  // 대교 차
  for (const c of bridgeCars) { c.position.x += c.userData.v * dt; if (c.position.x > 130) c.position.x = -130; if (c.position.x < -130) c.position.x = 130; }
  // 반짝이
  if (sparkLife > 0) {
    sparkLife -= dt;
    for (let i = 0; i < SPARKS; i++) {
      sparkVel[i * 3 + 1] -= 6 * dt;
      for (let a = 0; a < 3; a++) sparkPos[i * 3 + a] += sparkVel[i * 3 + a] * dt;
    }
    sparkGeo.attributes.position.needsUpdate = true;
    sparkMat.opacity = Math.max(0, sparkLife / 1.2);
    sparkMat.color.setHex(Math.floor(t * 8) % 2 ? GOLD : 0xff9ab8);
  }
  // 안내
  const near = nearest();
  const hint = dialogOpen ? '' : near?.type === 'npc' ? `▶ A ${near.n.userData.info.name}에게 말 걸기` : near?.type === 'door' ? '▶ A 드라이브 하러 가기' : '';
  hintEl.hidden = !hint; if (hint) hintEl.textContent = hint;
  // 카메라: 토끼 뒤 위에서 천천히 따라간다
  const sway = reduceMotion ? 0 : Math.sin(t * 0.25) * 0.8;
  camPos.lerp(new THREE.Vector3(bunny.position.x * 0.6 + sway, 4.8, bunny.position.z + 11), reduceMotion ? 1 : 0.05);
  camLook.lerp(new THREE.Vector3(bunny.position.x * 0.8, 1.6, bunny.position.z - 4), reduceMotion ? 1 : 0.08);
  camera.position.copy(camPos); camera.lookAt(camLook);
  composer.render(dt);
  requestAnimationFrame(tick);
}
camera.position.copy(camPos);
stage.classList.add('is-ready');
composeSkylines();
showDialog(me?.name ?? 'BORAMI', '달빛 옥상에 온 걸 환영해요! 방향키(또는 아래 콘솔)로 걸어 다니고, A 로 동료에게 말을 걸거나 요술봉을 휘둘러 보세요.');
tick();
