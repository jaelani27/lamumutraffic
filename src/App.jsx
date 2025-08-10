import React, { useEffect, useRef, useState } from 'react';

export default function App() {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  // sprite via ref supaya tidak “hilang” saat re-render
  const playerImgRef = useRef(null);
  const spriteLoadedRef = useRef(false);

  const [score, setScore] = useState(0);
  const runningRef = useRef(true); // state loop yang stabil

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });

    // ukuran tetap (portrait)
    canvas.width = 400;
    canvas.height = 600;

    // --- load sprite sekali ---
    playerImgRef.current = new Image();
    playerImgRef.current.onload = () => { spriteLoadedRef.current = true; };
    playerImgRef.current.src = '/sprites/cow-car.png';

    // player & lanes
    const lanes = [canvas.width * 0.2 - 40, canvas.width * 0.5 - 40, canvas.width * 0.8 - 40];
    const player = { lane: 1, x: lanes[1], y: canvas.height - 150, w: 80, h: 120 };
    let obstacles = [];
    let tick = 0, spawn = 0;

    // audio (aman kalau gagal)
    const engine = new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_6dc7479ec8.mp3?filename=car-engine-loop-10139.mp3');
    engine.loop = true; engine.volume = 0.25;
    const crash = new Audio('https://cdn.pixabay.com/download/audio/2021/09/15/audio_eb1a0ceefb.mp3?filename=crash-102.wav');
    const resumeAudio = () => { engine.play().catch(()=>{}); window.removeEventListener('touchstart', resumeAudio); };
    window.addEventListener('touchstart', resumeAudio, { passive: true });

    // swipe control (non-passive supaya responsif penuh)
    let startX = 0;
    const onStart = (e) => { startX = e.changedTouches[0].clientX; };
    const onEnd = (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (dx < -30) player.lane = Math.max(0, player.lane - 1);
      if (dx >  30) player.lane = Math.min(2, player.lane + 1);
    };
    canvas.addEventListener('touchstart', onStart, { passive: true });
    canvas.addEventListener('touchend', onEnd, { passive: true });

    // keyboard (opsional)
    const onKey = (e) => {
      if (!runningRef.current) return;
      if (e.key === 'ArrowLeft')  player.lane = Math.max(0, player.lane - 1);
      if (e.key === 'ArrowRight') player.lane = Math.min(2, player.lane + 1);
      if (!runningRef.current && e.key === 'Enter') restart();
    };
    window.addEventListener('keydown', onKey);

    const drawRoad = () => {
      ctx.fillStyle = '#2f2f2f';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = '#e6e6e6';
      const offset = (tick/4) % 40;
      for (let y=-20; y<canvas.height; y+=40) {
        ctx.fillRect(canvas.width/3 - 2, y + offset, 4, 20);
        ctx.fillRect((canvas.width/3)*2 - 2, y + offset, 4, 20);
      }
    };

    const loop = () => {
      if (!runningRef.current) return;

      tick++; spawn++;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      drawRoad();

      // target x by lane
      player.x = lanes[player.lane];

      // draw player (fallback rect jika sprite belum loaded)
      if (spriteLoadedRef.current) {
        ctx.drawImage(playerImgRef.current, player.x, player.y, player.w, player.h);
      } else {
        ctx.fillStyle = '#fff';
        ctx.fillRect(player.x, player.y, player.w, player.h);
      }

      // spawn obstacles
      if (spawn > 50) {
        const lane = Math.floor(Math.random()*3);
        obstacles.push({ x: lanes[lane]+20, y: -60, w: 40, h: 60, speed: 3 + Math.min(4, tick/1200) });
        spawn = 0;
      }

      // move & draw obstacles
      ctx.fillStyle = '#ff7a00';
      obstacles.forEach(o => {
        o.y += o.speed;
        ctx.beginPath();
        ctx.moveTo(o.x + o.w/2, o.y);
        ctx.lineTo(o.x, o.y + o.h);
        ctx.lineTo(o.x + o.w, o.y + o.h);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#f7f7f7';
        ctx.fillRect(o.x + o.w*0.3, o.y + o.h*0.45, o.w*0.4, o.h*0.1);
        ctx.fillStyle = '#ff7a00';
      });
      obstacles = obstacles.filter(o => o.y < canvas.height + 80);

      // collision
      for (const o of obstacles) {
        if (player.x < o.x + o.w && player.x + player.w > o.x &&
            player.y < o.y + o.h && player.y + player.h > o.y) {
          runningRef.current = false;
          try { engine.pause(); } catch(e){}
          try { crash.currentTime = 0; crash.play(); } catch(e){}
          break;
        }
      }

      if (tick % 3 === 0) setScore(s => s + 1);
      rafRef.current = requestAnimationFrame(loop);
    };

    // start
    engine.play().catch(()=>{});
    runningRef.current = true;
    rafRef.current = requestAnimationFrame(loop);

    // cleanup
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchend', onEnd);
      try { engine.pause(); } catch(e){}
    };
  }, []);

  const restart = () => {
    // cara simpel: reload halaman (paling stabil di mobile)
    window.location.reload();
  };

  return (
    <div>
      <h1>Lamumu Traffic</h1>
      <div>Score: {score}</div>
      <canvas ref={canvasRef} />
      {!runningRef.current && (
        <div>
          <h2 style={{color:'#ff5252'}}>Game Over</h2>
          <div className="btn" onClick={restart}>Restart</div>
        </div>
      )}
    </div>
  );
}
