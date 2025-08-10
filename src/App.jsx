import React, { useEffect, useRef, useState } from 'react';

// ==== TUNABLES ====
const PLAYER_BOTTOM_MARGIN = 0.20; // 20% tinggi layar dari bawah (semakin besar -> mobil lebih maju)
const HITBOX_SHRINK_X = 0.75;
const HITBOX_SHRINK_Y = 0.80;
const CONE_SHRINK_X   = 0.85;
const CONE_SHRINK_Y   = 0.90;

export default function App() {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  // sprite
  const imgRef = useRef(null);
  const imgLoadedRef = useRef(false);

  // loop & data
  const runningRef = useRef(true);
  const obstaclesRef = useRef([]);
  const tickRef = useRef(0);

  // spawn spacing
  const spawnCountdownRef = useRef(0);
  const nextSpawn = () => {
    const d = getDifficulty();
    const base = 85 + Math.floor(Math.random() * 55);   // 85–140 tick
    const factor = 1 + d * 0.5;                          // tiap level 50% lebih rapat
    spawnCountdownRef.current = Math.max(30, Math.floor(base / factor));
  };

  // UI / skor
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [gameOver, setGameOver] = useState(false);

  // audio
  const engineRef = useRef(null);
  const crashRef  = useRef(null);
  const audioArmedRef = useRef(false);

  // lane & player
  const lanesRef = useRef([0,0,0]);
  const playerRef = useRef({ lane: 1, x: 0, y: 0, w: 0, h: 0 });

  const getDifficulty = () => Math.floor(scoreRef.current / 1000);

  // ===== helpers =====
  const fitToScreen = () => {
    const c = canvasRef.current;
    c.width = window.innerWidth;
    c.height = window.innerHeight;

    lanesRef.current = [c.width * 0.25, c.width * 0.5, c.width * 0.75];

    const baseW = Math.min(120, Math.max(72, Math.round(c.width * 0.18)));
    const baseH = Math.round(baseW * 1.5);

    playerRef.current = {
      lane: 1,
      x: lanesRef.current[1] - baseW / 2,
      y: c.height - baseH - Math.max(80, Math.round(c.height * PLAYER_BOTTOM_MARGIN)),
      w: baseW,
      h: baseH
    };
  };

  const resetGame = (canvas) => {
    runningRef.current = true;
    setGameOver(false);
    setScore(0);
    scoreRef.current = 0;

    tickRef.current = 0;
    obstaclesRef.current = [];
    nextSpawn();

    fitToScreen();

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);

    if (audioArmedRef.current) {
      try { engineRef.current?.play().catch(()=>{}); } catch {}
    }
  };

  const drawRoad = (ctx, canvas) => {
    const tick = tickRef.current;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const scaleY = canvas.height / 600;
    const scaleX = canvas.width  / 400;

    const dash  = Math.max(40, Math.round(80 * scaleY));
    const gap   = Math.max(30, Math.round(60 * scaleY));
    const width = Math.max(6,  Math.round(9  * scaleX));
    const unit  = dash + gap;

    const midX = Math.round(canvas.width / 2 - width / 2);

    let y = -dash + ((tick % unit)); // bergerak ke BAWAH
    ctx.fillStyle = '#000000';
    for (; y < canvas.height + unit; y += unit) {
      ctx.fillRect(midX, Math.round(y), width, dash);
    }
  };

  const drawCones = (ctx) => {
    obstaclesRef.current.forEach(o => {
      const half = o.w / 2;
      ctx.fillStyle = '#FF7A00';
      ctx.beginPath();
      ctx.moveTo(o.cx, o.y);
      ctx.lineTo(o.cx - half, o.y + o.h);
      ctx.lineTo(o.cx + half, o.y + o.h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(o.cx - o.w * 0.2, o.y + o.h * 0.55, o.w * 0.4, Math.max(4, Math.round(o.h * 0.1)));
    });
  };

  const spawnCone = () => {
    const c = canvasRef.current;
    const lane = Math.floor(Math.random() * 3);

    const w = Math.max(28, Math.round(c.width * 0.12));
    const h = Math.round(w * 1.15);

    const d = getDifficulty();
    const speedBase = 3 + Math.min(4, tickRef.current / 1200);
    const speedBoost = d * 0.8;
    const speed = Math.min(9.5, speedBase + speedBoost);

    obstaclesRef.current.push({
      kind: 'cone',
      cx: lanesRef.current[lane],
      y: -h,
      w, h, speed
    });
  };

  const drawPlayer = (ctx) => {
    const p = playerRef.current;
    p.x = lanesRef.current[p.lane] - p.w / 2;

    if (imgLoadedRef.current) ctx.drawImage(imgRef.current, p.x, p.y, p.w, p.h);
    else { ctx.fillStyle = '#000'; ctx.fillRect(p.x, p.y, p.w, p.h); }
  };

  const checkCollision = () => {
    const p = playerRef.current;

    const pw = p.w * HITBOX_SHRINK_X;
    const ph = p.h * HITBOX_SHRINK_Y;
    const px = p.x + (p.w - pw) / 2;
    const py = p.y + (p.h - ph) / 2;

    for (const o of obstaclesRef.current) {
      const ow = o.w * CONE_SHRINK_X;
      const oh = o.h * CONE_SHRINK_Y;
      const ox = (o.cx - o.w / 2) + (o.w - ow) / 2;
      const oy = o.y + (o.h - oh) / 2;

      if (px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy) return true;
    }
    return false;
  };

  const loop = () => {
    if (!runningRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    tickRef.current++;
    drawRoad(ctx, canvas);

    // spawn
    spawnCountdownRef.current--;
    if (spawnCountdownRef.current <= 0) {
      spawnCone();
      nextSpawn();
    }

    // update obstacles
    obstaclesRef.current.forEach(o => o.y += o.speed);
    obstaclesRef.current = obstaclesRef.current.filter(o => o.y < canvas.height + 120);

    drawPlayer(ctx);
    drawCones(ctx);

    // skor
    if (tickRef.current % 3 === 0) {
      setScore(s => {
        const ns = s + 1;
        scoreRef.current = ns;
        return ns;
      });
    }

    if (checkCollision()) {
      runningRef.current = false;
      setGameOver(true);
      try { engineRef.current?.pause(); } catch {}
      try { crashRef.current.currentTime = 0; crashRef.current.play(); } catch {}
      return;
    }

    rafRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    const canvas = canvasRef.current;

    // sprite PNG transparan (crop)
    imgRef.current = new Image();
    imgRef.current.onload = () => { imgLoadedRef.current = true; };
    imgRef.current.src = '/sprites/cow-car.png';

    // audio lokal
    engineRef.current = new Audio('/sounds/engine.mp3');
    engineRef.current.loop = true;
    engineRef.current.preload = 'auto';
    engineRef.current.volume = 0.25;

    crashRef.current = new Audio('/sounds/crash.mp3');
    crashRef.current.preload = 'auto';

    // arm audio setelah interaksi pertama
    const armAudio = () => {
      if (audioArmedRef.current) return;
      audioArmedRef.current = true;
      engineRef.current.play().catch(()=>{});
    };
    const armers = ['touchstart','pointerdown','mousedown','keydown'];
    armers.forEach(ev => window.addEventListener(ev, armAudio, { passive: true }));

    // fullscreen init
    fitToScreen();

    // swipe
    let startX = 0;
    const onStart = (e) => { startX = e.changedTouches[0].clientX; };
    const onEnd = (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (dx < -30) playerRef.current.lane = Math.max(0, playerRef.current.lane - 1);
      if (dx >  30) playerRef.current.lane = Math.min(2, playerRef.current.lane + 1);
    };
    canvas.addEventListener('touchstart', onStart, { passive: true });
    canvas.addEventListener('touchend', onEnd,   { passive: true });

    // keyboard (opsional)
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  playerRef.current.lane = Math.max(0, playerRef.current.lane - 1);
      if (e.key === 'ArrowRight') playerRef.current.lane = Math.min(2, playerRef.current.lane + 1);
    };
    window.addEventListener('keydown', onKey);

    // resize/rotate
    const onResize = () => {
      const c = canvasRef.current;
      c.width = window.innerWidth;
      c.height = window.innerHeight;
      lanesRef.current = [c.width * 0.25, c.width * 0.5, c.width * 0.75];
      // keep size proportional
      const baseW = Math.min(120, Math.max(72, Math.round(c.width * 0.18)));
      const baseH = Math.round(baseW * 1.5);
      playerRef.current.w = baseW;
      playerRef.current.h = baseH;
      playerRef.current.y = c.height - baseH - Math.max(80, Math.round(c.height * PLAYER_BOTTOM_MARGIN));
    };
    window.addEventListener('resize', onResize);

    // start
    resetGame(canvas);

    // cleanup
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      armers.forEach(ev => window.removeEventListener(ev, armAudio));
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchend', onEnd);
      try { engineRef.current?.pause(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ textAlign: 'center' }}>
      <h1 style={{ margin: '8px 0 0', fontSize: 24 }}>Lamumu Traffic</h1>
      <div style={{ fontSize: 16, marginBottom: 4 }}>Score: {score}</div>

      <div style={{ position:'relative', width:'100%', margin:'0 auto' }}>
        <canvas
          ref={canvasRef}
          style={{
            display:'block', width:'100vw', height:'100vh',
            margin:0, border:'0', background:'#fff', touchAction:'none'
          }}
        />
        {gameOver && (
          <div
            style={{
              position:'fixed', inset:0, display:'flex',
              flexDirection:'column', alignItems:'center', justifyContent:'center',
              background:'rgba(0,0,0,0.55)'
            }}
          >
            <div style={{ fontSize:28, fontWeight:700, color:'#fff', marginBottom:12 }}>
              Game Over
            </div>
            <button
              onClick={() => resetGame(canvasRef.current)}
              style={{
                padding:'10px 16px', borderRadius:10, border:'1px solid #fff',
                background:'#111', color:'#fff', fontSize:16
              }}
            >
              Restart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
