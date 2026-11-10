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
//     things: [{ pos: [x, z], hint, act({ showDialog }) }] }   A 로 살펴보는 물건
import * as THREE from 'three';

const std = (color, extra) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
const glow = (color) => new THREE.MeshBasicMaterial({ color });
function box(parent, w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); parent.add(m);
  return m;
}

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
  scene.add(new THREE.HemisphereLight(light, 0x2a1f5c, 2.6));
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
function archive({ canvasTexture, colors, data, skyline }) {
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

  const liftX = 7;
  const lift = liftDoor(canvasTexture, CYAN, GOLD); lift.position.set(liftX, 0, back + 0.3); scene.add(lift);

  return {
    key: '5F', name: '5F 기록실', scene, w, d, glow: 0.3,
    spawn: [liftX - 0.4, back + 2.2], lift: [liftX, back + 0.3],
    npcs: [{ key: 'cat', pos: [4.2, 0, -3.6], height: 2.1, lines: [
      '아까 그 말, 제가 적어 뒀어요.',
      '여긴 기록실이에요. 책장마다 퀘스트 로그가 한 권씩 꽂혀 있어요.',
      '회의록은 도시 밖으로 안 나가요. 제가 지키거든요.',
      '…졸린 게 아니에요. 눈을 감고 정리하는 중이에요.',
    ] }],
    things,
  };
}

export function buildFloors(ctx) {
  return [archive(ctx)];
}
