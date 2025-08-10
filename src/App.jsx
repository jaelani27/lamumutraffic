import React, { useEffect, useRef, useState } from 'react';

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

  // spawn spacing (lebih renggang & acak)
  const spawnCountdownRef = useRef(0);
  const nextSpawn = () => {                      // 85–140 tick antar cone
    spawnCountdownRef.current = 85 + Math.floor(Math.random() * 55);
  };

  // UI
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // audio
  const engineRef = useRef(null);
  const crashRef  = useRef(null);
  const audioArmedRef = useRef(false);

  // lane & player
  const lanesRef = useRef([80, 200, 320]); // titik tengah 3 lajur
  const playerRef = useRef({ lane: 1, x: 160, y: 450, w: 80, h: 120 });

  // ===== Hitbox diperkecil biar tabrakan pas ke bodi =====
  const HITBOX_SHRINK_X = 0.75; // 75% lebar sprite
  const HITBOX_SHRINK_Y = 0.80; // 80% tinggi sprite
  // Optional: kecilkan hitbox cone sedikit juga
  const CONE_SHRINK_X   = 0.85;
  const CONE_SHRINK_Y   = 0.90;
  // =======================================================

  const resetGame = (canvas) => {
    runningRef.current = true;
    setGameOver(false);
    setScore(0);

    tickRef.current = 0;
    obstaclesRef.current = [];
    nextSpawn();

    const lanes = [canvas.width * 0.2, canvas.width * 0.5, canvas.width * 0.8];
    lanesRef.current = lanes;
    playerRef.current = { lane: 1, x: lanes[1] - 40, y: canvas.height - 150, w: 80, h: 120 };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);

    if (audioArmedRef.current) { try { engineRef.current?.play().catch(()=>{}); } catch {} }
  };

  const drawRoad = (ctx, canvas) => {
    const tick = tickRef.current;
    ctx.fillStyle = '#ffffff'; // jalan putih
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // garis tengah hitam putus-putus
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.setLineDash([18, 18]);
    ctx.lineDashOffset = -(tick % 36);
    const midX = canvas.width / 2;
    ctx.beginPath();
    ctx.moveTo(midX, -40);
    ctx.lineTo(midX, canvas.height + 40);
    ctx.stroke();
    ctx.setLineDash([]);
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
      // strip putih
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(o.cx - o.w * 0.2, o.y + o.h * 0.55, o.w * 0.4, 6);
    });
  };

  const spawnCone = () => {
    const lanes = lanesRef.current;
    const lane = Math.floor(Math.random() * 3);
    const baseW = 48, h = 56;
    obstaclesRef.current.push({
      kind: 'cone',
      cx: lanes[lane],
      y: -h,
      w: baseW,
      h,
      speed: 3 + Math.min(4, tickRef.current / 1200) // makin lama makin cepat
    });
  };

  const drawPlayer = (ctx) => {
    const p = playerRef.current;
    p.x = lanesRef.current[p.lane] - p.w / 2;
    if (imgLoadedRef.current) ctx.drawImage(imgRef.current, p.x, p.y, p.w, p.h);
    else { ctx.fillStyle = '#000'; ctx.fillRect(p.x, p.y, p.w, p.h); }
  };

  // collision pakai hitbox yang dikecilkan
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

    // spawn jarang & acak
    spawnCountdownRef.current--;
    if (spawnCountdownRef.current <= 0) {
      spawnCone();
      nextSpawn();
    }

    // update obstacles
    obstaclesRef.current.forEach(o => o.y += o.speed);
    obstaclesRef.current = obstaclesRef.current.filter(o => o.y < canvas.height + 80);

    drawPlayer(ctx);
    drawCones(ctx);

    if (tickRef.current % 3 === 0) setScore(s => s + 1);

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
    canvas.width = 400;
    canvas.height = 600;

    lanesRef.current = [canvas.width * 0.2, canvas.width * 0.5, canvas.width * 0.8];
    playerRef.current = { lane: 1, x: lanesRef.current[1] - 40, y: canvas.height - 150, w: 80, h: 120 };

    // sprite
    imgRef.current = new Image();
    imgRef.current.onload = () => { imgLoadedRef.current = true; };
    imgRef.current.src = '/sprites/cow-car.png'; // pastikan file transparan/crop

    // audio
    engineRef.current = new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_6dc7479ec8.mp3?filename=car-engine-loop-10139.mp3');
    engineRef.current.loop = true;
    engineRef.current.preload = 'auto';
    engineRef.current.volume = 0.25;

    crashRef.current = new Audio('https://cdn.pixabay.com/download/audio/2021/09/15/audio_eb1a0ceefb.mp3?filename=crash-102.wav');
    crashRef.current.preload = 'auto';

    // arm audio sesudah interaksi pertama (mobile policy)
    const armAudio = () => {
      if (audioArmedRef.current) return;
      audioArmedRef.current = true;
      engineRef.current.play().catch(()=>{});
    };
    const armers = ['touchstart','pointerdown','mousedown','keydown'];
    armers.forEach(ev => window.addEventListener(ev, armAudio, { passive: true }));

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

    // start
    resetGame(canvas);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKey);
      armers.forEach(ev => window.removeEventListener(ev, armAudio));
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchend', onEnd);
      try { engineRef.current?.pause(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>Lamumu Traffic</h1>
      <div style={{ fontSize: 18, marginBottom: 8 }}>Score: {score}</div>

      <div style={{ position:'relative', width: 400, margin:'0 auto' }}>
        <canvas
          ref={canvasRef}
          style={{
            display:'block', margin:'12px auto 24px',
            border:'2px solid #000', background:'#fff', touchAction:'none'
          }}
        />
        {gameOver && (
          <div
            style={{
              position:'absolute', inset:0, display:'flex',
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
