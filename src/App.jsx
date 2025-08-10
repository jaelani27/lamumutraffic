import React, { useEffect, useRef, useState } from 'react';

export default function App() {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  const imgRef = useRef(null);
  const imgLoadedRef = useRef(false);

  const runningRef = useRef(true);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });

    // ukuran potret
    canvas.width = 400;
    canvas.height = 600;

    // --- load sprite pemain (sekali saja) ---
    imgRef.current = new Image();
    imgRef.current.onload = () => { imgLoadedRef.current = true; };
    imgRef.current.src = '/sprites/cow-car.png'; // pastikan file ada di public/sprites/

    // --- lane & player ---
    const lanes = [canvas.width * 0.2, canvas.width * 0.5, canvas.width * 0.8]; // titik tengah lane
    const player = { lane: 1, x: lanes[1] - 40, y: canvas.height - 150, w: 80, h: 120 };

    // --- obstacles (cones) ---
    let obstacles = [];
    let tick = 0;
    let spawnTimer = 0;

    // --- audio (aman kalau gagal) ---
    const engine = new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_6dc7479ec8.mp3?filename=car-engine-loop-10139.mp3');
    engine.loop = true; engine.volume = 0.25;
    const crash = new Audio('https://cdn.pixabay.com/download/audio/2021/09/15/audio_eb1a0ceefb.mp3?filename=crash-102.wav');
    const resumeAudio = () => { engine.play().catch(()=>{}); window.removeEventListener('touchstart', resumeAudio); };
    window.addEventListener('touchstart', resumeAudio, { passive: true });

    // --- controls: swipe ---
    let startX = 0;
    const onStart = (e) => { startX = e.changedTouches[0].clientX; };
    const onEnd = (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (dx < -30) player.lane = Math.max(0, player.lane - 1);
      if (dx >  30) player.lane = Math.min(2, player.lane + 1);
    };
    canvas.addEventListener('touchstart', onStart, { passive: true });
    canvas.addEventListener('touchend', onEnd,   { passive: true });

    // keyboard opsional
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  player.lane = Math.max(0, player.lane - 1);
      if (e.key === 'ArrowRight') player.lane = Math.min(2, player.lane + 1);
      if (!runningRef.current && e.key === 'Enter') window.location.reload();
    };
    window.addEventListener('keydown', onKey);

    // --- helper gambar jalan ---
    function drawRoad() {
      // latar jalan putih
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // garis tengah hitam putus-putus
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      ctx.setLineDash([18, 18]);
      ctx.lineDashOffset = -(tick % 36); // animasi bergerak
      const midX = canvas.width / 2;
      ctx.beginPath();
      ctx.moveTo(midX, -40);
      ctx.lineTo(midX, canvas.height + 40);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // --- gambar player ---
    function drawPlayer() {
      // posisikan x ke tengah lane
      const centerX = lanes[player.lane];
      player.x = centerX - player.w / 2;

      if (imgLoadedRef.current) {
        ctx.drawImage(imgRef.current, player.x, player.y, player.w, player.h);
      } else {
        // fallback sementara
        ctx.fillStyle = '#000';
        ctx.fillRect(player.x, player.y, player.w, player.h);
      }
    }

    // --- spawn obstacle (cone oranye) ---
    function spawnCone() {
      const lane = Math.floor(Math.random() * 3);
      const baseW = 48, h = 56;
      obstacles.push({
        kind: 'cone',
        cx: lanes[lane],           // pusat di lane
        y: -h,
        w: baseW,
        h,
        speed: 3 + Math.min(4, tick / 1200) // makin lama makin cepat
      });
    }

    // --- gambar obstacles (cone segitiga oranye) ---
    function drawObstacles() {
      obstacles.forEach(o => {
        if (o.kind === 'cone') {
          const half = o.w / 2;
          // segitiga
          ctx.fillStyle = '#FF7A00';
          ctx.beginPath();
          ctx.moveTo(o.cx, o.y);                 // puncak
          ctx.lineTo(o.cx - half, o.y + o.h);    // kiri bawah
          ctx.lineTo(o.cx + half, o.y + o.h);    // kanan bawah
          ctx.closePath();
          ctx.fill();
          // strip putih kecil
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(o.cx - o.w*0.2, o.y + o.h*0.55, o.w*0.4, 6);
        }
      });
    }

    // --- collision approx (pakai bounding box cone) ---
    function checkCollision() {
      for (const o of obstacles) {
        const coneLeft = o.cx - o.w/2, coneRight = o.cx + o.w/2;
        const coneTop = o.y, coneBottom = o.y + o.h;
        const px1 = player.x, px2 = player.x + player.w;
        const py1 = player.y, py2 = player.y + player.h;
        if (px1 < coneRight && px2 > coneLeft && py1 < coneBottom && py2 > coneTop) {
          runningRef.current = false;
          try { engine.pause(); } catch(e){}
          try { crash.currentTime = 0; crash.play(); } catch(e){}
          return true;
        }
      }
      return false;
    }

    // --- loop ---
    const loop = () => {
      if (!runningRef.current) return;

      tick++; spawnTimer++;
      drawRoad();

      // update obstacles
      if (spawnTimer > 50) { spawnCone(); spawnTimer = 0; }
      obstacles.forEach(o => o.y += o.speed);
      obstacles = obstacles.filter(o => o.y < canvas.height + 80);

      // gambar
      drawPlayer();
      drawObstacles();

      // skor & tabrakan
      if (!checkCollision() && tick % 3 === 0) setScore(s => s + 1);

      rafRef.current = requestAnimationFrame(loop);
    };

    engine.play().catch(()=>{});
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchend', onEnd);
      try { engine.pause(); } catch(e){}
    };
  }, []);

  const restart = () => window.location.reload();

  return (
    <div>
      <h1>Lamumu Traffic</h1>
      <div>Score: {score}</div>
      <canvas
        ref={canvasRef}
        style={{
          display:'block', margin:'12px auto 24px',
          border:'2px solid #000', background:'#fff', touchAction:'none'
        }}
      />
      {!runningRef.current && (
        <div>
          <h2 style={{color:'#ff5252'}}>Game Over</h2>
          <button className="btn" onClick={restart}>Restart</button>
        </div>
      )}
    </div>
  );
}
