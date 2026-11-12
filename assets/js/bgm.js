// 사이트 배경음: 화면 오른쪽 아래의 ♪ 버튼으로 켜고 끈다. 기본은 켜짐.
// 브라우저는 첫 입력 전에는 소리를 막으므로, 켜짐 상태면 화면을 처음 누르거나 키를 누를 때 시작한다.
// 페이지를 옮기면 듣던 위치에서 이어 틀고, 탭을 떠나면 멈췄다가 돌아오면 다시 튼다.
(() => {
  const btn = document.querySelector('.bgm-toggle');
  if (!btn) return;
  const read = (store, key) => { try { return store.getItem(key); } catch (e) { return null; } };  // 저장소를 못 써도 소리는 난다
  const write = (store, key, value) => { try { store.setItem(key, value); } catch (e) { /* 이번 페이지에서만 적용 */ } };

  const audio = new Audio('/assets/audio/roof.mp3');
  audio.loop = true; audio.volume = 0.25; audio.preload = 'none';
  let on = read(localStorage, 'site-bgm') !== '0';

  const draw = () => { btn.textContent = on ? '♪ BGM ON' : '♪ BGM OFF'; btn.setAttribute('aria-pressed', String(on)); };
  const play = () => { if (on && !document.hidden) audio.play().catch(() => { /* 아직 첫 입력 전 — 다음 입력 때 다시 시도 */ }); };

  audio.addEventListener('loadedmetadata', () => {  // 앞 페이지에서 듣던 위치
    const at = Number(read(sessionStorage, 'site-bgm-at')) || 0;
    if (at > 0 && at < audio.duration) audio.currentTime = at;
  }, { once: true });
  addEventListener('pagehide', () => write(sessionStorage, 'site-bgm-at', String(audio.currentTime)));
  document.addEventListener('visibilitychange', () => (document.hidden ? audio.pause() : play()));
  addEventListener('pageshow', play);
  for (const type of ['pointerdown', 'keydown']) addEventListener(type, () => { if (audio.paused) play(); });

  btn.addEventListener('click', () => {
    on = !on; write(localStorage, 'site-bgm', on ? '1' : '0'); draw();
    if (on) play(); else audio.pause();
  });
  draw(); play();
})();
