// 층별 방(실내 스테이지) — 옥상 아래 건물의 각 층. 방 하나 = 장면 하나.
// 새 층은 buildFloors 가 돌려주는 목록에 항목을 하나 더하면 된다(위층부터 차례로).
// 걷기·대화·엘리베이터·층 이동은 play.js 가 층 공통으로 처리한다. 여기는 방의 생김새와 내용만 정한다.
//
// 층 한 개의 모양:
//   { key, name, scene, w, d,            방 크기(m). 토끼는 이 안에서만 걷는다
//     glow,                              네온 번짐 세기(없으면 옥상 값)
//     spawn: [x, z],                     엘리베이터에서 내리는 자리
//     lift: [x, z],                      엘리베이터 문 자리
//     npcs: [{ key, pos: [x, y, z], height, lines: [...] }],   key 는 _data/characters.yml 의 캐릭터
//     things: [{ pos: [x, z], hint, act({ showDialog }) }],    A 로 살펴보는 물건
//     enter(),                           (선택) 이 층에 들어올 때마다 할 일
//     locked() }                         (선택) true 인 동안 엘리베이터 목록에 안 나온다
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const std = (color, extra) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
const glow = (color) => new THREE.MeshBasicMaterial({ color });
function box(parent, w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); parent.add(m);
  return m;
}

const css = (c) => '#' + c.toString(16).padStart(6, '0');
function cyl(parent, r, h, x, y, z, mat, sides = 8) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, sides), mat);
  m.position.set(x, y, z); parent.add(m);
  return m;
}
// 벽에 붙이는 글자 간판
function sign(canvasTexture, parent, text, color, w, x, y, z) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 14 / 96), new THREE.MeshBasicMaterial({ transparent: true, map: canvasTexture(96, 14, (g) => {
    g.fillStyle = css(color); g.font = 'bold 12px monospace'; g.textAlign = 'center'; g.fillText(text, 48, 11);
  }) }));
  m.position.set(x, y, z); parent.add(m);
}
// 화면(모니터): 틀 + 직접 그린 내용. draw(g, w, h) 는 48 x n 픽셀 캔버스에 그린다
function screen(canvasTexture, parent, w, h, x, y, z, draw, frame = 0x2a2456) {
  box(parent, w + 0.2, h + 0.2, 0.15, x, y, z, std(frame));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: canvasTexture(48, Math.round(48 * h / w), draw) }));
  m.position.set(x, y, z + 0.09); parent.add(m);
}
// Kenney 모델(CC0)을 불러와 가장 긴 변이 size(m)가 되게 맞춰 바닥에 놓는다
const gltf = new GLTFLoader();
function model(parent, file, size, x, z, rotY = 0) {
  gltf.load(`/assets/models/${file}.glb`, (g) => {
    const o = g.scene, b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3());
    const k = size / Math.max(s.x, s.y, s.z);
    if (file.startsWith('nature/')) o.traverse((m) => { if (m.isMesh) m.material.metalness = 0; });  // 금속 재질로 들어와 간접광만으로는 검게 보인다
    o.scale.setScalar(k); o.rotation.y = rotY; o.position.set(x, -b.min.y * k, z); parent.add(o);
  }, undefined, () => { /* 모델이 없어도 방은 열린다 */ });
}
// 떠 있는 글자 표지(항상 카메라를 본다) — 옆벽 문처럼 정면 간판을 붙일 수 없는 곳에 쓴다
function label(canvasTexture, parent, text, color, x, y, z) {
  const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(64, 16, (c) => { c.fillStyle = css(color); c.font = 'bold 12px monospace'; c.textAlign = 'center'; c.fillText(text, 32, 12); }) }));
  m.position.set(x, y, z); m.scale.set(2.4, 0.6, 1); parent.add(m);
}
// 고정 난수(방 생김새가 매번 같게)
function seeded(seed) { return () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; }

// 엘리베이터 문(옥상·각 층 공용): 네온 문틀 + 닫힌 문 + 위 글자
export function liftDoor(canvasTexture, frameColor, labelColor) {
  const g = new THREE.Group();
  for (const [w, h, x, y] of [[0.25, 2.8, -0.9, 1.4], [0.25, 2.8, 0.9, 1.4], [2.05, 0.25, 0, 2.8]]) box(g, w, h, 0.25, x, y, 0, glow(frameColor));
  for (const x of [-0.39, 0.39]) box(g, 0.74, 2.6, 0.1, x, 1.3, -0.05, std(0x4a4290, { metalness: 0.5, roughness: 0.35 }));
  const label = new THREE.Sprite(new THREE.SpriteMaterial({
    map: canvasTexture(64, 16, (c) => { c.fillStyle = '#' + labelColor.toString(16).padStart(6, '0'); c.font = 'bold 12px monospace'; c.textAlign = 'center'; c.fillText('LIFT ▲▼', 32, 12); }),
  }));
  label.position.set(0, 3.5, 0); label.scale.set(2.4, 0.6, 1); g.add(label);
  return g;
}

// 방 뼈대: 체크 바닥 + 뒷벽·옆벽(앞은 카메라 쪽이라 비운다) + 기본 조명
function room(canvasTexture, w, d, { floorA, floorB, wall, trim, light }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0a1e);
  scene.add(new THREE.HemisphereLight(light, 0x2a1f5c, 3.2));
  const tex = canvasTexture(16, 16, (g) => { g.fillStyle = floorA; g.fillRect(0, 0, 16, 16); g.fillStyle = floorB; g.fillRect(0, 0, 8, 8); g.fillRect(8, 8, 8, 8); });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(w / 2, d / 2);
  box(scene, w, 1, d, 0, -0.5, 0, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  const H = 6;
  box(scene, w, H, 0.3, 0, H / 2, -d / 2 - 0.15, std(wall));
  for (const x of [-1, 1]) box(scene, 0.3, H, d, x * (w / 2 + 0.15), H / 2, 0, std(wall));
  box(scene, w, 0.12, 0.12, 0, 0.9, -d / 2 + 0.06, glow(trim));  // 벽 아래 네온 띠
  return scene;
}

// 5F 기록실 — 미누가 지키는 방. 책장 한 칸 = 글 한 편
function archive({ canvasTexture, colors, data, skyline, bugDex }) {
  const { PINK, CYAN, GOLD, VIOLET } = colors;
  const w = 16, d = 10, back = -d / 2;
  const scene = room(canvasTexture, w, d, { floorA: '#2a1f3d', floorB: '#34264a', wall: 0x2e2558, trim: PINK, light: 0xc9a8ff });

  // 창: 밤 도시가 보인다
  box(scene, 6.4, 2.9, 0.1, 3.4, 3.5, back + 0.02, glow(CYAN));
  const view = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.5), new THREE.MeshBasicMaterial({ color: 0x0b0a1f }));
  view.position.set(3.4, 3.5, back + 0.09); scene.add(view);
  const city = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.5), new THREE.MeshBasicMaterial({ map: skyline, transparent: true }));
  city.position.set(3.4, 3.5, back + 0.1); scene.add(city);

  // 책장 4개: 책등 색은 칸마다 다르게(고정 난수)
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const SPINES = ['#ff2a6d', '#4ef3ff', '#ffd76a', '#a78bff', '#ff9ab8', '#7cf29c', '#c4bcf2'];
  const links = data.links || [];
  const things = [];
  [-7, -5.2, -3.4, -1.6].forEach((x, i) => {
    const tex = canvasTexture(24, 48, (g) => {
      g.fillStyle = '#1a1230'; g.fillRect(0, 0, 24, 48);
      for (let row = 0; row < 4; row++) {
        for (let px = 1; px < 23;) { const bw = 2 + Math.floor(rnd() * 3), bh = 7 + Math.floor(rnd() * 3); g.fillStyle = SPINES[Math.floor(rnd() * SPINES.length)]; g.fillRect(px, row * 12 + (11 - bh), bw, bh); px += bw + 1; }
        g.fillStyle = '#5a4a8a'; g.fillRect(0, row * 12 + 11, 24, 1);
      }
    });
    box(scene, 1.6, 3.4, 0.5, x, 1.7, back + 0.3, std(0x3d3488));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.1), new THREE.MeshBasicMaterial({ map: tex }));
    face.position.set(x, 1.75, back + 0.56); scene.add(face);
    const post = links[i];
    things.push({
      pos: [x, back + 1], hint: '책장 살펴보기',
      act: ({ showDialog }) => post
        ? showDialog(`퀘스트 로그 ${i + 1}권`, `「${post.title}」\nA 읽으러 가기 · B 덮기`, () => { location.href = post.url; })
        : showDialog('빈 책장', '아직 꽂힌 기록이 없어요. 다음 퀘스트를 기다리는 자리.'),
    });
  });
  // 책장 위 간판
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.9), new THREE.MeshBasicMaterial({ transparent: true, map: canvasTexture(80, 14, (g) => {
    g.fillStyle = '#ffd76a'; g.font = 'bold 12px monospace'; g.textAlign = 'center'; g.fillText('QUEST LOG', 40, 11);
  }) }));
  sign.position.set(-4.3, 4.3, back + 0.05); scene.add(sign);

  // 미누 책상: 책상 + 스탠드 + 쌓인 서류
  box(scene, 3, 0.15, 1.3, 4.2, 0.9, -2.4, std(0x4a3a7a));
  for (const x of [-1.3, 1.3]) for (const z of [-0.5, 0.5]) box(scene, 0.15, 0.9, 0.15, 4.2 + x, 0.45, -2.4 + z, std(0x2a2456));
  box(scene, 0.1, 0.7, 0.1, 5.3, 1.3, -2.6, std(0x2a2456)); box(scene, 0.45, 0.2, 0.45, 5.3, 1.7, -2.6, glow(GOLD));
  const lamp = new THREE.PointLight(0xffc46b, 18, 9, 1.6); lamp.position.set(5.2, 2.2, -2.2); scene.add(lamp);
  [[3.4, 0xf6f3ff], [3.7, 0xffd1e0], [3.55, 0xb8fbff]].forEach(([x, c], i) => box(scene, 0.5, 0.06, 0.7, x, 1.01 + i * 0.07, -2.4, std(c)));

  // 가운데 러그 + 낮은 독서 탁자 + 방석
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(5, 3), std(0x5a1f5c)); rug.rotation.x = -Math.PI / 2; rug.position.set(-3, 0.01, 1); scene.add(rug);
  const rugEdge = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 3.4), glow(VIOLET)); rugEdge.rotation.x = -Math.PI / 2; rugEdge.position.set(-3, 0.005, 1); scene.add(rugEdge);
  box(scene, 1.6, 0.12, 1, -3, 0.5, 1, std(0x4a3a7a)); box(scene, 0.2, 0.5, 0.2, -3, 0.25, 1, std(0x2a2456));
  for (const [x, c] of [[-4.6, PINK], [-1.4, CYAN]]) box(scene, 0.8, 0.25, 0.8, x, 0.13, 1, std(c));
  box(scene, 0.5, 0.08, 0.35, -3.2, 0.6, 1, std(0xffd76a));  // 탁자 위 펼친 노트
  things.push({ pos: [-3, 1.9], hint: '버그 도감 펼치기', act: () => bugDex() });  // 그 노트가 버그 도감·오답노트

  const liftX = 7;
  const lift = liftDoor(canvasTexture, CYAN, GOLD); lift.position.set(liftX, 0, back + 0.3); scene.add(lift);

  return {
    key: '5F', name: '5F 기록실', music: 'archive', scene, w, d, glow: 0.3,
    spawn: [liftX, back + 1.7], lift: [liftX, back + 0.3],
    npcs: [{ key: 'cat', pos: [4.2, 0, -3.6], height: 2.1, lines: [
      '아까 그 말, 제가 적어 뒀어요.',
      '여긴 기록실이에요. 책장마다 퀘스트 로그가 한 권씩 꽂혀 있어요.',
      '회의록은 도시 밖으로 안 나가요. 제가 지키거든요.',
      '…졸린 게 아니에요. 눈을 감고 정리하는 중이에요.',
    ] }],
    things,
  };
}

// 4F 관제실 — 모니가 지키는 방. 큰 화면 한 장 = 프로젝트 하나
function control({ canvasTexture, colors, data }) {
  const { PINK, CYAN, GOLD } = colors;
  const w = 16, d = 10, back = -d / 2;
  const scene = room(canvasTexture, w, d, { floorA: '#1c2447', floorB: '#222c57', wall: 0x232a5c, trim: CYAN, light: 0xa8d8ff });
  const rnd = seeded(11), tones = ['#4ef3ff', '#ff9ab8', '#7cf29c'];
  const things = [];
  (data.projects || []).slice(0, 3).forEach((pr, i) => {
    const x = -5.6 + i * 3.6, tone = tones[i % 3];
    screen(canvasTexture, scene, 3, 2, x, 3.3, back + 0.1, (g, cw, ch) => {
      g.fillStyle = '#0b0a1f'; g.fillRect(0, 0, cw, ch);
      g.fillStyle = tone; g.fillRect(0, 0, cw, 5);
      for (let b = 0; b < 9; b++) { const bh = 3 + Math.floor(rnd() * 14); g.fillRect(3 + b * 5, ch - 3 - bh, 3, bh); }
      g.fillStyle = '#ffd76a'; for (let b = 0; b < 3; b++) g.fillRect(3 + b * 6, 8, 4, 2);
    });
    // 조작대: 비스듬한 판 + 단추 줄
    box(scene, 2.8, 0.9, 0.9, x, 0.45, back + 1, std(0x2f3a78));
    for (let b = 0; b < 6; b++) box(scene, 0.22, 0.08, 0.22, x - 1 + b * 0.4, 0.94, back + 1.1, glow([PINK, CYAN, GOLD][b % 3]));
    things.push({ pos: [x, back + 2], hint: `${pr.name} 화면 보기`, act: ({ showDialog }) =>
      showDialog(pr.name, `${pr.summary}\nA 프로젝트 보러 가기 · B 닫기`, () => { location.href = data.projectsUrl; }) });
  });
  sign(canvasTexture, scene, 'CONTROL ROOM', CYAN, 5.5, -2, 4.9, back + 0.05);
  // 서버 선반: 깜빡이는 불빛 줄
  for (const x of [4.6, 5.7]) {
    box(scene, 0.9, 3.6, 0.8, x, 1.8, back + 0.5, std(0x1a1f45, { metalness: 0.4 }));
    const led = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 3.3), new THREE.MeshBasicMaterial({ map: canvasTexture(8, 36, (g) => {
      g.fillStyle = '#0d1030'; g.fillRect(0, 0, 8, 36);
      for (let y = 1; y < 36; y += 3) for (let px = 1; px < 7; px += 2) { g.fillStyle = rnd() > 0.35 ? (rnd() > 0.8 ? '#ff2a6d' : '#7cf29c') : '#2a2f66'; g.fillRect(px, y, 1, 1); }
    }) }));
    led.position.set(x, 1.8, back + 0.91); scene.add(led);
  }
  things.push({ pos: [5.15, back + 1.6], hint: '서버 선반 살펴보기', act: ({ showDialog }) => showDialog('서버 선반', '초록불이 대부분. 빨간불 하나는… 모니가 벌써 보고 있어요.') });
  // 가운데 둥근 탁자: 떠 있는 도시 지도(홀로그램)
  cyl(scene, 1.3, 0.5, -1, 0.25, 1.4, std(0x2f3a78), 12);
  cyl(scene, 1.1, 0.04, -1, 0.56, 1.4, glow(CYAN), 12);
  for (let i = 0; i < 9; i++) box(scene, 0.22, 0.3 + rnd() * 0.9, 0.22, -1.7 + (i % 3) * 0.7, 1.1, 0.8 + Math.floor(i / 3) * 0.6, new THREE.MeshBasicMaterial({ color: i % 4 ? CYAN : PINK, transparent: true, opacity: 0.55 }));
  things.push({ pos: [-1, 2.9], hint: '도시 지도 살펴보기', act: ({ showDialog }) => showDialog('노바 시티 지도', '도심 · 슬럼 · 대교 · 공원 · 타워.\n분홍 불빛이 반짝이 버그가 뜬 자리래요.') });
  // 모니의 충전 자리
  cyl(scene, 0.7, 0.15, 3.2, 0.08, -1.2, glow(GOLD), 10);

  const liftX = 7;
  const lift = liftDoor(canvasTexture, CYAN, GOLD); lift.position.set(liftX, 0, back + 0.3); scene.add(lift);
  return {
    key: '4F', name: '4F 관제실', music: 'indoor', scene, w, d, glow: 0.3,
    spawn: [liftX, back + 1.7], lift: [liftX, back + 0.3],
    npcs: [{ key: 'robot', pos: [3.2, 1.1, -1.2], height: 2.1, lines: [
      '지금 셋이 일하는 중, 하나는 쉬는 중!',
      '여긴 관제실이에요. 화면 한 장이 프로젝트 하나예요.',
      '저는 읽기만 해요. 아무것도 바꾸지 않고, 도시 밖으로 보내지도 않아요.',
      '3초마다 한 바퀴. 멈춘 작업이 보이면 안테나가 깜빡여요.',
    ] }],
    things,
  };
}

// 3F 실험실 — 큐링의 QA 실험실. 방 안에 숨은 반짝이 버그 6마리를 A 로 채집한다
function lab({ canvasTexture, colors, quiz }) {
  const { PINK, CYAN, GOLD, VIOLET } = colors;
  const GREEN = 0x7cf29c;
  const w = 16, d = 10, back = -d / 2;
  const scene = room(canvasTexture, w, d, { floorA: '#1d3040', floorB: '#23394b', wall: 0x24405a, trim: GREEN, light: 0xb8ffd8 });
  const things = [];
  sign(canvasTexture, scene, 'QA LAB', GREEN, 4, -4, 4.6, back + 0.05);
  // 기기 선반: 에뮬레이터·실기기가 줄지어 테스트를 돌린다
  box(scene, 5, 0.12, 0.7, -4, 1.5, back + 0.45, std(0x2f5068)); box(scene, 5, 0.12, 0.7, -4, 2.7, back + 0.45, std(0x2f5068));
  for (let i = 0; i < 10; i++) {
    const x = -6 + (i % 5), y = i < 5 ? 1.95 : 3.15;
    box(scene, 0.45, 0.8, 0.08, x, y, back + 0.5, std(0x10182c));
    box(scene, 0.37, 0.66, 0.02, x, y, back + 0.55, glow(i === 3 ? PINK : i % 3 ? GREEN : CYAN));
  }
  things.push({ pos: [-4, back + 1.7], hint: '기기 선반 살펴보기', act: ({ showDialog }) => showDialog('테스트 기기 선반', '초록 화면은 통과, 분홍 화면 하나는 실패.\n큐링이 한 번 더 돌리는 중이에요.') });
  // 실험대: 플라스크와 채집통
  box(scene, 4, 0.15, 1.2, 2.2, 1, back + 0.9, std(0x3a6078));
  for (const x of [0.5, 3.9]) box(scene, 0.2, 1, 1, x, 0.5, back + 0.9, std(0x24405a));
  [[1, PINK], [1.6, CYAN], [2.2, GOLD]].forEach(([x, c], i) => { cyl(scene, 0.16, 0.4 + i * 0.12, x, 1.3 + i * 0.06, back + 0.9, glow(c)); cyl(scene, 0.06, 0.25, x, 1.65 + i * 0.12, back + 0.9, std(0xdff6ff)); });
  const jar = cyl(scene, 0.45, 0.9, 3.3, 1.55, back + 0.9, new THREE.MeshBasicMaterial({ color: 0xb8fbff, transparent: true, opacity: 0.25 }), 10);
  cyl(scene, 0.48, 0.08, 3.3, 2.04, back + 0.9, std(0x3a6078), 10);
  things.push({ pos: [2.2, back + 2], hint: '실험대 살펴보기', act: ({ showDialog }) => showDialog('실험대', `채집통에 반짝이 버그 ${caught}마리.\n플라스크에는 테스트 케이스가 보글보글.`) });
  // 큐링이 좋아하는 꽃 화분(Kenney 모델)
  [['flower_purpleA', -7.2, 3.6], ['flower_redA', -6.4, 4.1], ['flower_yellowA', 6.6, 3.8], ['plant_bush', 7.2, 2.6]].forEach(([f, x, z]) => { box(scene, 0.7, 0.4, 0.7, x, 0.2, z, std(0x3a6078)); model(scene, `nature/${f}`, 1.1, x, z); });

  // 반짝이 버그: 방 곳곳에 6마리. 잡으면 채집통으로 들어간다
  const SPOTS = [[-6.5, -1], [-2.5, 2.8], [0.2, -2.6], [4.6, 1.6], [6.8, -1.2], [1.8, 3.6]];
  let caught = 0;
  const bugs = SPOTS.map(([x, z], i) => {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), glow([PINK, GOLD, VIOLET][i % 3]));
    m.position.set(x, 0.9, z); scene.add(m);
    const th = { pos: [x, z], hint: '반짝이 버그 잡기', act: ({ showDialog }) => quiz((bug) => {  // 문제를 맞혀야 잡힌다
      caught++; th.pos = [999, 999];  // 잡힌 버그는 더 안 잡히게 멀리 치운다
      m.position.set(3.3 + (caught % 3 - 1) * 0.15, 1.25 + Math.floor((caught - 1) / 3) * 0.3 + (caught % 2) * 0.12, back + 0.9); m.scale.setScalar(0.45);
      const why = bug ? `${bug.why}\n` : '';
      showDialog(`${bug ? `${bug.name} 채집!` : '채집!'} ${caught}/${SPOTS.length}`, why + (caught === SPOTS.length
        ? '큐링: "한 번 더! 이번엔 실기기로!"\n(엘리베이터를 다시 타고 오면 새 버그가 숨어 있어요.)'
        : '아직 어딘가에서 반짝인다.'));
    }) };
    things.push(th);
    return { m, th, home: [x, z] };
  });
  void jar;

  const liftX = 7;
  const lift = liftDoor(canvasTexture, CYAN, GOLD); lift.position.set(liftX, 0, back + 0.3); scene.add(lift);
  return {
    key: '3F', name: '3F 실험실', music: 'lab', scene, w, d, glow: 0.3,
    spawn: [liftX, back + 1.7], lift: [liftX, back + 0.3],
    enter() {  // 전부 잡은 뒤 다시 오면 버그가 제자리에 돌아와 있다
      if (caught < SPOTS.length) return;
      caught = 0;
      for (const b of bugs) { b.m.position.set(b.home[0], 0.9, b.home[1]); b.m.scale.setScalar(1); b.th.pos = [...b.home]; }
    },
    npcs: [{ key: 'slime', pos: [-0.8, 0, 0.6], height: 1.6, lines: [
      '한 번 더! 이번엔 실기기로!',
      '이 방에 반짝이 버그가 숨어 있어요. 가까이 가서 A!',
      '저도 원래 저기 구석에 숨어 살았어요. 그래서 잘 찾아요.',
      '초록 체크가 뜨면 별사탕을 하나 먹어요.',
    ] }],
    things,
  };
}

// 2F 수집품 방 — 드라이브에서 주운 아이템 24종 진열. 아직 못 주운 칸은 어두운 실루엣
function gallery({ canvasTexture, colors, dex }) {
  const { PINK, CYAN, GOLD, VIOLET } = colors;
  const w = 16, d = 10, back = -d / 2;
  const scene = room(canvasTexture, w, d, { floorA: '#3a2440', floorB: '#44294a', wall: 0x3a2a5c, trim: GOLD, light: 0xffe2b8 });
  sign(canvasTexture, scene, 'COLLECTION', GOLD, 5, -1.5, 5.3, back + 0.05);
  const loader = new THREE.TextureLoader();
  const things = [], slots = [];
  // 진열장 4개(가로 6칸 = 위아래 2줄 × 3칸). 번호는 도감 번호
  for (let c = 0; c < 4; c++) {
    const cx = -6.3 + c * 3.2, ids = Array.from({ length: 6 }, (_, k) => c * 6 + k + 1);
    box(scene, 2.9, 3.6, 0.4, cx, 2.3, back + 0.25, std(0x2a1f4a));
    box(scene, 3.05, 0.12, 0.5, cx, 4.15, back + 0.3, glow([PINK, CYAN, VIOLET, GOLD][c]));
    box(scene, 2.9, 0.5, 0.6, cx, 0.25, back + 0.35, std(0x4a3a7a));
    ids.forEach((id, k) => {
      const tex = loader.load(`/assets/chars/items/item_${String(id).padStart(2, '0')}.png`); tex.colorSpace = THREE.SRGBColorSpace;
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.3 }));
      spr.position.set(cx - 0.9 + (k % 3) * 0.9, k < 3 ? 3.35 : 1.75, back + 0.6); spr.scale.set(0.8, 0.8, 1); scene.add(spr);
      box(scene, 0.8, 0.06, 0.3, spr.position.x, spr.position.y - 0.5, back + 0.5, std(0x5a4a8a));
      slots.push({ id, spr });
    });
    things.push({ pos: [cx, back + 1.4], hint: `진열장 ${c + 1} 살펴보기`, act: ({ showDialog }) => {
      const got = ids.filter((id) => dex.has(id));
      showDialog(`진열장 ${c + 1} — 도감 ${ids[0]}~${ids[5]}번`, got.length === 6 ? '여섯 칸이 전부 찼다. 반짝반짝!'
        : got.length ? `${got.length}칸 채움 (${got.join('·')}번). 빈 칸은 드라이브에서 찾아보자.` : '아직 텅 비었다. 드라이브에서 주운 아이템이 여기 놓인다.');
    } });
  }
  // 가운데 받침대: 전체 수집 현황
  cyl(scene, 0.9, 0.9, 0, 0.45, 1.8, std(0x4a3a7a), 8); cyl(scene, 0.5, 0.5, 0, 1.15, 1.8, glow(GOLD), 6); cyl(scene, 0.75, 0.12, 0, 1.46, 1.8, glow(GOLD), 6);
  things.push({ pos: [0, 3], hint: '트로피 살펴보기', act: ({ showDialog }) => showDialog('수집 현황', `도감 ${dex.size}/24\n${dex.size >= 24 ? '전부 모았다! 진짜 수집가.' : '구역마다 그곳에서만 나오는 희귀 아이템이 하나씩 있다.'}`) });
  // 벨벳 줄 기둥 + 긴 의자
  for (const x of [-4, 4]) { cyl(scene, 0.1, 1, x, 0.5, 2.4, std(0xffd76a, { metalness: 0.6 })); cyl(scene, 0.18, 0.1, x, 1.02, 2.4, glow(GOLD)); }
  box(scene, 3, 0.3, 0.9, -5, 0.35, 3.4, std(0x7a2a5c)); box(scene, 3, 0.3, 0.9, 5, 0.35, 3.4, std(0x7a2a5c));

  const liftX = 7;
  const lift = liftDoor(canvasTexture, CYAN, GOLD); lift.position.set(liftX, 0, 3); lift.rotation.y = -Math.PI / 2; lift.position.x = w / 2 - 0.3; scene.add(lift);
  return {
    key: '2F', name: '2F 수집품 방', music: 'gallery', scene, w, d, glow: 0.3,
    spawn: [w / 2 - 1.8, 3], lift: [w / 2 - 0.3, 3],
    enter() { for (const s of slots) s.spr.material.color.set(dex.has(s.id) ? 0xffffff : 0x1c1638); },
    npcs: [],
    things,
  };
}

// 1F 차고 — 드라이브 출발점. 셔터 문으로 나가고, 고장 난 단추판을 건드리면 B1 이 열린다
let b1Open = false;
try { b1Open = !!localStorage.getItem('play-b1'); } catch (e) { /* 저장을 못 읽어도 게임은 된다 */ }
function garage({ canvasTexture, colors, drive, goto }) {
  const { PINK, CYAN, GOLD } = colors;
  const w = 18, d = 11, back = -d / 2;
  const scene = room(canvasTexture, w, d, { floorA: '#2a2a3c', floorB: '#2f2f44', wall: 0x2c2c4a, trim: PINK, light: 0xd8d8ff });
  const things = [];
  // 셔터 문 + DRIVE 간판
  const shutter = new THREE.Mesh(new THREE.PlaneGeometry(5, 3.6), new THREE.MeshBasicMaterial({ map: canvasTexture(20, 16, (g) => {
    for (let y = 0; y < 16; y++) { g.fillStyle = y % 2 ? '#4a4290' : '#3d3488'; g.fillRect(0, y, 20, 1); }
    g.fillStyle = '#ffd76a'; for (let x = 0; x < 20; x += 4) g.fillRect(x, 14, 2, 2);
  }) }));
  shutter.position.set(-4.5, 1.8, back + 0.02); scene.add(shutter);
  for (const [bw, bh, x, y] of [[0.25, 3.9, -7.1, 1.95], [0.25, 3.9, -1.9, 1.95], [5.45, 0.25, -4.5, 3.9]]) box(scene, bw, bh, 0.25, x, y, back + 0.1, glow(PINK));
  sign(canvasTexture, scene, 'DRIVE ▶', GOLD, 3.4, -4.5, 4.6, back + 0.05);
  things.push({ pos: [-4.5, back + 1], hint: '드라이브 하러 가기', act: () => drive() });
  // 왼쪽 벽의 초록 문: 걸어서 들판으로 나간다
  const GREEN = 0x7dff9a, doorX = -w / 2 + 0.12;
  for (const [bd, bh, z, y] of [[0.25, 2.8, -2.4, 1.4], [0.25, 2.8, -0.6, 1.4], [2.05, 0.25, -1.5, 2.8]]) box(scene, 0.25, bh, bd, doorX, y, z, glow(GREEN));
  box(scene, 0.1, 2.6, 1.55, doorX - 0.05, 1.3, -1.5, std(0x1f4a3a));
  label(canvasTexture, scene, '◀ FIELD', GREEN, doorX + 0.6, 3.5, -1.5);
  things.push({ pos: [doorX + 0.9, -1.5], hint: '들판으로 나가기', act: () => goto('FIELD') });
  // 바닥 주차선 + 세워 둔 차(Kenney 모델)
  for (const x of [-6.6, -2.4, 1.8, 6]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 4.4), glow(GOLD)); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.01, 1.2); scene.add(l); }
  [['race-future', -4.5, 0.2], ['taxi', -0.3, -0.2], ['van', 3.9, 0.1]].forEach(([f, x, r]) => model(scene, `cars/${f}`, 3.6, x, 1.2, r));
  things.push({ pos: [-4.5, 3.4], hint: '차 살펴보기', act: ({ showDialog }) => showDialog('네온 레이서', '보람이의 차. 셔터 문으로 나가면 바로 도심이에요.') });
  things.push({ pos: [-0.3, 3.4], hint: '차 살펴보기', act: ({ showDialog }) => showDialog('택시', '도시에서 자주 마주치는 그 택시. 여기서 쉬는 중.') });
  things.push({ pos: [3.9, 3.4], hint: '차 살펴보기', act: ({ showDialog }) => showDialog('밴', '모니의 부품과 큐링의 테스트 기기를 실어 나른다.') });
  // 공구 벽 + 작업대
  box(scene, 3.4, 2.2, 0.1, 1.6, 2.6, back + 0.08, std(0x3a3a60));
  [[0.5, 3.1, 0.9, 0.14, CYAN], [1.5, 3.1, 0.14, 0.8, GOLD], [2.3, 3.2, 0.7, 0.14, PINK], [0.7, 2.2, 0.14, 0.7, PINK], [1.7, 2.1, 0.9, 0.14, CYAN], [2.6, 2.3, 0.3, 0.3, GOLD]].forEach(([x, y, bw, bh, c]) => box(scene, bw, bh, 0.08, x, y, back + 0.16, glow(c)));
  box(scene, 3.4, 0.15, 0.9, 1.6, 1, back + 0.6, std(0x4a4a78)); for (const x of [0.1, 3.1]) box(scene, 0.15, 1, 0.8, x, 0.5, back + 0.6, std(0x2c2c4a));
  things.push({ pos: [1.6, back + 1.7], hint: '공구 벽 살펴보기', act: ({ showDialog }) => showDialog('공구 벽', '별 렌치는 큐링이 빌려 갔다. 빈 자리에 분필로 "돌려줘" 라고 적혀 있다.') });
  // 타이어 더미 + 드럼통
  for (let i = 0; i < 3; i++) cyl(scene, 0.55, 0.3, 7.6, 0.15 + i * 0.3, 3.6, std(0x15152a), 10);
  for (let i = 0; i < 2; i++) cyl(scene, 0.55, 0.3, 6.4, 0.15 + i * 0.3, 4.1, std(0x15152a), 10);
  for (const [x, c] of [[-8, 0xff2a6d], [-7.1, 0x4ef3ff]]) { cyl(scene, 0.42, 1.1, x, 0.55, 4.2, std(c, { metalness: 0.3 }), 10); }
  // 고장 난 단추판: 누르면 B1 단추가 나타난다
  box(scene, 0.9, 1.3, 0.12, 5.2, 1.7, back + 0.08, std(0x1a1a30));
  const flick = box(scene, 0.6, 0.25, 0.04, 5.2, 2, back + 0.16, glow(0xa78bff));
  for (let i = 0; i < 4; i++) box(scene, 0.2, 0.2, 0.04, 5 + (i % 2) * 0.4, 1.55 - Math.floor(i / 2) * 0.3, back + 0.16, glow(i === 3 ? 0xa78bff : 0x4a4a78));
  things.push({ pos: [5.2, back + 1.2], hint: '고장 난 단추판 살펴보기', act: ({ showDialog }) => {
    if (b1Open) return showDialog('단추판', '지지직… B1 단추가 보라색으로 켜져 있다.');
    b1Open = true; try { localStorage.setItem('play-b1', '1'); } catch (e) { /* 이번 방문에만 열린다 */ }
    showDialog('지지직…!', '단추판이 깜빡이더니 없던 단추가 생겼다.\n엘리베이터에 「B1 ???」 이 나타났다.');
  } });
  void flick;

  const liftX = 8;
  const lift = liftDoor(canvasTexture, CYAN, GOLD); lift.position.set(liftX, 0, back + 0.3); scene.add(lift);
  return {
    key: '1F', name: '1F 차고', music: 'garage', scene, w, d, glow: 0.3,
    spawn: [liftX, back + 1.7], lift: [liftX, back + 0.3],
    npcs: [],
    things,
  };
}

// B1 글리치 킹 아지트 — 숨은 층(1F 단추판을 건드려야 엘리베이터에 나온다)
function lair({ canvasTexture, colors }) {
  const { PINK, CYAN, GOLD, VIOLET } = colors;
  const w = 14, d = 10, back = -d / 2;
  const scene = room(canvasTexture, w, d, { floorA: '#1a1030', floorB: '#241440', wall: 0x22143e, trim: VIOLET, light: 0xd0a8ff });
  const rnd = seeded(23), things = [];
  sign(canvasTexture, scene, 'KEEP OUT!!', PINK, 4, -3.5, 4.7, back + 0.05);
  // 글리치 화면 벽: 깨진 줄무늬
  [[-5, 3.1, 2.4, 1.6], [-2.3, 3.4, 1.8, 1.2], [-2.3, 1.9, 1.8, 1.1]].forEach(([x, y, sw, sh]) => screen(canvasTexture, scene, sw, sh, x, y, back + 0.1, (g, cw, ch) => {
    g.fillStyle = '#12082a'; g.fillRect(0, 0, cw, ch);
    for (let yy = 0; yy < ch; yy += 2) { g.fillStyle = ['#ff2a6d', '#4ef3ff', '#a78bff', '#12082a'][Math.floor(rnd() * 4)]; g.fillRect(Math.floor(rnd() * 20), yy, 6 + Math.floor(rnd() * 26), 1); }
  }, 0x3a1f5c));
  things.push({ pos: [-3.6, back + 1.5], hint: '글리치 화면 살펴보기', act: ({ showDialog }) => showDialog('작전 화면', '"새벽 배포에 맞춰 반짝이 버그 3마리 투하"\n…계획이 다 보인다.') });
  // 왕좌: 계단 + 등받이 + 왕관 장식
  box(scene, 3, 0.3, 2.2, 2.6, 0.15, back + 1.4, std(0x3a1f5c)); box(scene, 2.2, 0.3, 1.6, 2.6, 0.45, back + 1.2, std(0x4a2a78));
  box(scene, 1.3, 0.7, 1.1, 2.6, 0.95, back + 1, std(0x7a2a9c)); box(scene, 1.5, 2.4, 0.3, 2.6, 1.8, back + 0.45, std(0x5a2a8c));
  for (const x of [-0.5, 0, 0.5]) box(scene, 0.25, x ? 0.4 : 0.6, 0.25, 2.6 + x, 3.2 + (x ? 0 : 0.1), back + 0.45, glow(GOLD));
  things.push({ pos: [2.6, back + 2.8], hint: '왕좌 살펴보기', act: ({ showDialog }) => showDialog('왕좌', '쿠션이 세 겹. 팔걸이에 "내 자리" 라고 삐뚤빼뚤 적혀 있다.') });
  // 왕관 진열 선반(매일 새 왕관)
  box(scene, 2.4, 0.1, 0.5, 5.4, 1.4, back + 0.35, std(0x4a2a78)); box(scene, 2.4, 0.1, 0.5, 5.4, 2.5, back + 0.35, std(0x4a2a78));
  for (let i = 0; i < 6; i++) { const x = 4.6 + (i % 3) * 0.8, y = i < 3 ? 1.6 : 2.7; box(scene, 0.45, 0.2, 0.3, x, y, back + 0.35, glow([GOLD, PINK, CYAN][i % 3])); box(scene, 0.12, 0.2, 0.12, x, y + 0.2, back + 0.35, glow([GOLD, PINK, CYAN][i % 3])); }
  things.push({ pos: [5.4, back + 1.5], hint: '왕관 선반 살펴보기', act: ({ showDialog }) => showDialog('왕관 선반', '요일마다 다른 왕관. 오늘 건 금색.') });
  // 버그 병: 풀어놓기 전의 반짝이 버그
  box(scene, 2.6, 0.9, 1, -4.6, 0.45, 2.6, std(0x3a1f5c));
  for (let i = 0; i < 4; i++) { const x = -5.5 + i * 0.6; cyl(scene, 0.2, 0.5, x, 1.15, 2.6, new THREE.MeshBasicMaterial({ color: 0xd8c8ff, transparent: true, opacity: 0.3 })); box(scene, 0.12, 0.12, 0.12, x, 1.1, 2.6, glow([PINK, GOLD, CYAN, VIOLET][i])); }
  things.push({ pos: [-4.6, 3.8], hint: '병 살펴보기', act: ({ showDialog }) => showDialog('반짝이 버그 병', '병마다 이름표가 붙어 있다. "재현 안 됨", "금요일 저녁용", "아끼는 애".') });
  // 간식 더미
  [[0.3, 0.5, PINK], [0.75, 0.3, CYAN], [0.5, 0.2, GOLD]].forEach(([x, h, c]) => box(scene, 0.35, h, 0.35, x - 1, h / 2, 3.4, std(c)));

  const liftX = 6;
  const lift = liftDoor(canvasTexture, VIOLET, PINK); lift.position.set(liftX, 0, 2.5); lift.rotation.y = -Math.PI / 2; lift.position.x = w / 2 - 0.3; scene.add(lift);
  return {
    key: 'B1', name: 'B1 ???', music: 'lair', scene, w, d, glow: 0.45,
    spawn: [w / 2 - 1.8, 2.5], lift: [w / 2 - 0.3, 2.5],
    locked: () => !b1Open,
    npcs: [{ key: 'villain', pos: [0.4, 0, -1.2], height: 2.1, lines: [
      '흥, 이번 버그는 절대 못 찾을걸?',
      '어, 어떻게 들어왔어?! 그 단추판은 고장 난 척한 건데!',
      '왕관은 건드리지 마. 요일마다 순서가 있단 말이야.',
      '…간식 먹고 갈래? 딸기우유는 없지만.',
    ] }],
    things,
  };
}

// 옥상 소품: 줄전구·자판기·망원경·돗자리·화분. 살펴볼 물건 목록을 돌려준다
export function roofProps(scene, { canvasTexture, colors, data }, roof) {
  const { PINK, CYAN, GOLD, VIOLET } = colors;
  const back = -roof.d / 2, left = -roof.w / 2, things = [];
  // 줄전구(왼쪽 난간 위)
  for (const z of [back + 0.4, 0, -back - 0.4]) box(scene, 0.12, 2.6, 0.12, left + 0.3, 1.3, z, std(0x3d3488));
  for (let i = 0; i < 14; i++) { const z = back + 0.8 + i * 0.8; box(scene, 0.16, 0.16, 0.16, left + 0.3, 2.45 - Math.abs(Math.sin(i * 0.45)) * 0.35, z, glow([PINK, GOLD, CYAN, VIOLET][i % 4])); }
  // 딸기우유 자판기
  box(scene, 1.3, 2.3, 0.8, 1.9, 1.15, back + 0.6, std(0xff5fb7, { roughness: 0.5 }));
  const front = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), new THREE.MeshBasicMaterial({ map: canvasTexture(22, 30, (g) => {
    g.fillStyle = '#2a1f4a'; g.fillRect(0, 0, 22, 30);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { g.fillStyle = ['#ffd1e0', '#f6f3ff', '#b8fbff'][(r + c) % 3]; g.fillRect(2 + c * 5, 2 + r * 9, 3, 6); g.fillStyle = '#ff2a6d'; g.fillRect(2 + c * 5, 4 + r * 9, 3, 2); }
  }) }));
  front.position.set(1.9, 1.45, back + 1.01); scene.add(front);
  box(scene, 0.9, 0.25, 0.05, 1.9, 0.4, back + 1.01, std(0x2a1f4a));
  things.push({ pos: [1.9, back + 1.7], hint: '자판기 살펴보기', act: ({ showDialog }) => showDialog('딸기우유 자판기', '덜컹. 딸기우유 한 팩.\n보람이의 최애 회복 아이템. 체력 +2 (기분).') });
  // 망원경
  for (const [dx, dz] of [[-0.3, 0.2], [0.3, 0.2], [0, -0.3]]) { const leg = box(scene, 0.08, 1.3, 0.08, -6.2 + dx, 0.62, -3.4 + dz, std(0x3d3488)); leg.rotation.set(dz * 0.8, 0, -dx * 0.8); }
  const tube = cyl(scene, 0.16, 1.5, -6.2, 1.55, -3.4, std(0xffd76a, { metalness: 0.5, roughness: 0.4 })); tube.rotation.set(Math.PI / 2.6, 0, 0.5);
  things.push({ pos: [-6.2, -2.6], hint: '망원경 들여다보기', act: ({ showDialog }) => showDialog('망원경', '금빛 초승달이 분홍 철탑 끝에 걸려 있다.\n저 아래 도심에서 뭔가 반짝… 반짝이 버그다.') });
  // 돗자리: 기록 노트 + 랜턴 + 컵
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.4), std(0x5a1f5c)); mat.rotation.x = -Math.PI / 2; mat.position.set(-3.4, 0.01, 0.6); scene.add(mat);
  const edge = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 2.7), glow(PINK)); edge.rotation.x = -Math.PI / 2; edge.position.set(-3.4, 0.005, 0.6); scene.add(edge);
  box(scene, 0.6, 0.1, 0.45, -3.6, 0.07, 0.5, std(0xffd76a)); box(scene, 0.5, 0.02, 0.38, -3.6, 0.13, 0.5, std(0xf6f3ff));
  box(scene, 0.2, 0.35, 0.2, -2.4, 0.2, 0.2, glow(GOLD)); box(scene, 0.26, 0.06, 0.26, -2.4, 0.4, 0.2, std(0x3d3488));
  const lantern = new THREE.PointLight(0xffc46b, 10, 6, 1.6); lantern.position.set(-2.4, 0.8, 0.4); scene.add(lantern);
  for (const [x, z, c] of [[-4.5, 1.1, 0xb8fbff], [-3, 1.3, 0xffd1e0]]) cyl(scene, 0.12, 0.2, x, 0.11, z, std(c));
  for (const [x, z, c] of [[-4.6, 0.2, CYAN], [-2.6, 1.2, VIOLET]]) box(scene, 0.7, 0.18, 0.7, x, 0.1, z, std(c));
  things.push({ pos: [-3.6, 0.5], hint: '기록 노트 펼쳐 보기', act: ({ showDialog }) => showDialog('기록의 마법책', `마지막 줄: 「${(data.posts || [])[0] || '새 글 준비 중'}」\n지난 기록은 5F 기록실 책장에 꽂혀 있어요.`) });
  // 물탱크·광고판에도 한마디
  things.push({ pos: [-6.2, 3], hint: '물탱크 두드려 보기', act: ({ showDialog }) => showDialog('물탱크', '통, 통. 안이 울린다.\n큐링이 길들여지기 전에 숨던 자리래요.') });
  things.push({ pos: [-3, back + 0.9], hint: '광고판 올려다보기', act: ({ showDialog }) => showDialog('STAR NOTE', '이 옥상의 간판. 밤새 꺼지지 않는다.\n다 적은 날이면 미누가 저 위에서 존대요.') });
  // 화분과 긴 의자(오른쪽)
  [['plant_bushLarge', 8.2, 3.2, 1.5], ['flower_redA', 8.2, 1.6, 1], ['flower_yellowA', 7.4, 4.8, 1], ['plant_bush', -1.2, back + 0.7, 1.2]].forEach(([f, x, z, size]) => { box(scene, 0.8, 0.45, 0.8, x, 0.22, z, std(0x3d3488)); model(scene, `nature/${f}`, size, x, z); });
  box(scene, 0.7, 0.12, 2.2, 7.6, 0.5, -0.6, std(0x4a3a7a)); for (const z of [-1.5, 0.3]) box(scene, 0.6, 0.5, 0.12, 7.6, 0.25, z, std(0x2a2456)); box(scene, 0.12, 0.6, 2.2, 7.95, 0.85, -0.6, std(0x4a3a7a));
  things.push({ pos: [7.2, -0.6], hint: '의자에 앉아 보기', act: ({ showDialog }) => showDialog('긴 의자', '잠깐 앉았다. 도시의 불빛이 한 번도 꺼진 적 없다는 게 실감 난다.') });
  return things;
}

// 건물 밖 들판: 걸어 다니며 버그를 찾는다. 문제를 맞히면 채집, 틀리면 버그가 다른 곳으로 도망간다
function field({ canvasTexture, colors, skyline, quiz, goto }) {
  const { CYAN, GOLD } = colors, GREEN = 0x7dff9a;
  const w = 30, d = 18, back = -d / 2, rnd = seeded(77);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x120c2c); scene.fog = new THREE.Fog(0x120c2c, 22, 60);
  scene.add(new THREE.HemisphereLight(0xb8c8ff, 0x1a3a2a, 2.8));
  const tex = canvasTexture(16, 16, (g) => { g.fillStyle = '#1f4a3a'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#245642'; g.fillRect(0, 0, 8, 8); g.fillRect(8, 8, 8, 8); });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(w / 2, d / 2);
  box(scene, w, 1, d, 0, -0.5, 0, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
  box(scene, 90, 1, 70, 0, -0.52, -6, std(0x173a2e));  // 걸을 수 없는 바깥 풀밭
  const city = new THREE.Mesh(new THREE.PlaneGeometry(64, 14), new THREE.MeshBasicMaterial({ map: skyline, transparent: true, fog: false }));
  city.position.set(0, 6.5, back - 14); scene.add(city);  // 멀리 보이는 도시

  // 둘레의 나무·울타리(걷는 범위 밖), 안쪽의 덤불·꽃·풀
  const TREES = ['tree_default', 'tree_oak', 'tree_detailed', 'tree_fat', 'tree_small'];
  for (let x = -18; x <= 18; x += 3) model(scene, `nature/${TREES[Math.floor(rnd() * TREES.length)]}`, 3.6 + rnd() * 2, x + rnd(), back - 2 - rnd() * 3, rnd() * 6);
  for (let z = back; z <= 9; z += 3.2) model(scene, `nature/${TREES[Math.floor(rnd() * TREES.length)]}`, 3.4 + rnd() * 2, -w / 2 - 2 - rnd() * 2, z, rnd() * 6);
  for (let x = -13.5; x <= 13.5; x += 3) model(scene, 'nature/fence_simple', 3, x, back - 0.4);
  for (let i = 0; i < 26; i++) {
    const f = ['grass_large', 'grass_large', 'plant_bush', 'flower_purpleA', 'flower_redA', 'flower_yellowA', 'plant_bushLarge'][Math.floor(rnd() * 7)];
    model(scene, `nature/${f}`, f.startsWith('plant') ? 1.6 : 1, (rnd() - 0.5) * (w - 3), (rnd() - 0.5) * (d - 3), rnd() * 6);
  }
  // 가로등 셋: 풀밭에 노란 불빛
  for (const [x, z] of [[-9, -4], [2, 3], [10, -5]]) {
    box(scene, 0.14, 2.6, 0.14, x, 1.3, z, std(0x2a2456)); box(scene, 0.5, 0.3, 0.5, x, 2.7, z, glow(GOLD));
    const l = new THREE.PointLight(0xffd76a, 14, 10, 1.6); l.position.set(x, 2.6, z); scene.add(l);
  }

  // 차고로 돌아가는 문(오른쪽 끝)
  const doorX = w / 2 - 0.4;
  for (const [bd, bh, z, y] of [[0.25, 2.8, -0.9, 1.4], [0.25, 2.8, 0.9, 1.4], [2.05, 0.25, 0, 2.8]]) box(scene, 0.25, bh, bd, doorX, y, z, glow(CYAN));
  box(scene, 0.1, 2.6, 1.55, doorX + 0.05, 1.3, 0, std(0x4a4290, { metalness: 0.5, roughness: 0.35 }));
  label(canvasTexture, scene, 'GARAGE ▶', GOLD, doorX - 0.6, 3.5, 0);
  const things = [{ pos: [doorX - 0.9, 0], hint: '차고로 돌아가기', act: () => goto('1F') }];
  label(canvasTexture, scene, 'BUG FIELD', GREEN, 0, 4.6, back - 0.4);

  // 버그: 풀밭 위를 날아다닌다. 얼굴 없이 빛나는 몸통 + 날개 한 쌍
  const N = 8, spot = () => [(rnd() - 0.5) * (w - 6) - 1.5, (rnd() - 0.5) * (d - 4)];
  let left = N;
  const bugs = Array.from({ length: N }, (_, i) => {
    const m = new THREE.Group(), color = [GREEN, CYAN, GOLD][i % 3];
    const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.24), glow(color)); body.scale.set(1, 0.7, 1.4); m.add(body);
    for (const sx of [-1, 1]) { const wing = box(m, 0.34, 0.02, 0.22, sx * 0.26, 0.1, 0, glow(0xf6f3ff)); wing.rotation.z = sx * 0.5; }
    scene.add(m);
    const b = { m, home: spot(), alive: true };
    b.th = { pos: [...b.home], hint: '버그 잡기', act: ({ showDialog }) => quiz((bug) => {
      b.alive = false; m.visible = false; b.th.pos = [999, 999]; left -= 1;  // 잡힌 버그는 더 안 잡히게 멀리 치운다
      showDialog(`${bug ? `${bug.name} 채집!` : '채집!'}`, `${bug ? `${bug.why}\n` : ''}${left ? `들판에 버그가 ${left}마리 남았다.` : '들판의 버그를 전부 잡았다! (다시 나오면 새 버그가 날아와 있어요.)'}`);
    }, () => {  // 틀리면 멀리 달아난다
      let to = spot(); for (let k = 0; k < 8 && Math.hypot(to[0] - b.home[0], to[1] - b.home[1]) < 7; k++) to = spot();
      b.home = to;
    }) };
    things.push(b.th);
    return b;
  });

  return {
    key: 'FIELD', name: '버그 들판', music: 'roof', scene, w, d, glow: 0.5, noLift: true,
    spawn: [doorX - 1.8, 0],
    enter() {  // 전부 잡은 뒤 다시 오면 새 버그가 날아와 있다
      if (left) return;
      left = N;
      for (const b of bugs) { b.alive = true; b.m.visible = true; b.home = spot(); }
    },
    tick(t) {  // 제자리 근처를 맴돈다. 잡는 자리(th.pos)도 따라 움직인다
      bugs.forEach((b, i) => {
        if (!b.alive) return;
        const x = b.home[0] + Math.sin(t * 0.7 + i * 2) * 0.8, z = b.home[1] + Math.cos(t * 0.5 + i) * 0.5;
        b.m.position.set(x, 0.8 + Math.sin(t * 3 + i) * 0.15, z); b.m.rotation.y = t * 1.5 + i;
        b.th.pos = [x, z];
      });
    },
    npcs: [],
    things,
  };
}

export function buildFloors(ctx) {
  return [archive(ctx), control(ctx), lab(ctx), gallery(ctx), garage(ctx), lair(ctx), field(ctx)];
}
