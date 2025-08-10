import React, { useEffect, useRef, useState } from 'react';

export default function App() {
  const canvasRef = useRef(null);
  const [running, setRunning] = useState(true);
  const [score, setScore] = useState(0);
  const [spriteLoaded, setSpriteLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Ukuran canvas (portrait)
    canvas.width = 400;
    canvas.height = 600;

    // --- SPRITE: sapi nyetir mobil chibi (PNG transparan) ---
    // Pastikan kamu sudah upload di: public/sprites/cow-car.png
    const playerImg = new Image();
    playerImg.onload = () => setSpriteLoaded(true);
    playerImg.src = '/sprites/cow-car.png';

    // Player
    const player = {
      x: canvas.width / 2 - 40,
      y: canvas.height - 140,
      w: 80,
      h: 110,
      speed: 5
    };

    // Obstacles (cone)
    let obstacles = [];
    let obstacleTimer = 0;

    // SFX
    const carSound = new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_6dc7479ec8.mp3?filename=car-engine-loop-10139.mp3');
    carSound.loop = true;
    carSound.volume = 0.25;

    const crashSound = new Audio('https://cdn.pixabay.com/download/audio/2021/09/15/audio_eb1a0ceefb.mp3?filename=crash-102.wav');

    // Mulai suara saat user gesture (render pertama + running)
    try { carSound.play().catch(() => {}); } catch(e) {}

    // Swipe control
    let touchStartX = 0;
    canvas.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    canvas.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].screenX - touchStartX;
      if (dx < -30) player.x -= player.speed * 40;  // kiri
      if (dx >  30) player.x += player.speed * 40;  // kanan
      // Clamp ke layar
      player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
    }, { passive: true });

    // Arrow keys (opsional)
    const onKey = (e) => {
      if (!running) return;
      if (e.key === 'ArrowLeft')  player.x = Math.max(0, player.x - player.speed * 10);
      if (e.key === 'ArrowRight') player.x = Math.min(canvas.width - player.w, player.x + player.speed * 10);
    };
    window.addEventListener('keydown', onKey);

    function drawPlayer() {
      if (spriteLoaded) {
        ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);
      } else {
        // fallback sementara kalau sprite belum kebaca
        ctx.fillStyle = '#fff';
        ctx.fillRect(player.x, player.y, player.w, player.h);
      }
    }

    function drawObstacles() {
      ctx.fillStyle = '#ff7a00';
      obstacles.forEach(o => {
        ctx.beginPath();
        ctx.moveTo(o.x + o.w / 2, o.y);
        ctx.lineTo(o.x, o.y + o.h);
        ctx.lineTo(o.x + o.w, o.y + o.h);
        ctx.closePath();
        ctx.fill();
        // garis putih cone
        ctx.fillStyle = '#f7f7f7';
        ctx.fillRect(o.x + o.w*0.3, o.y + o.h*0.45, o.w*0.4, o.h*0.1);
        ctx.fillStyle = '#ff7a00';
      });
    }

    function update() {
      if (!running) return;

      ctx.fillStyle = '#2f2f2f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // marka jalan putus-putus
      ctx.fillStyle = '#e5e5e5';
      for (let y = -20; y < canvas.height; y += 40) {
        ctx.fillRect(canvas.width/3 - 2, y + (score % 40), 4, 20);
        ctx.fillRect((canvas.width/3)*2 - 2, y + (score % 40), 4, 20);
      }

      drawPlayer();

      // Spawn cone
      obstacleTimer++;
      if (obstacleTimer > 50) {
        const laneCenters = [canvas.width/6, canvas.width/2, canvas.width*5/6];
        const cx = laneCenters[Math.floor(Math.random()*3)];
        obstacles.push({
          x: cx - 20,
          y: -50,
          w: 40,
          h: 40,
          speed: 3 + Math.min(4, score / 600) // makin lama makin cepat
        });
        obstacleTimer = 0;
      }

      // Gerak & gambar cone
      obstacles.forEach(o => o.y += o.speed);
      obstacles = obstacles.filter(o => o.y < canvas.height + 50);
      drawObstacles();

      // Collision AABB
      for (const o of obstacles) {
        if (
          player.x < o.x + o.w &&
          player.x + player.w > o.x &&
          player.y < o.y + o.h &&
          player.y + player.h > o.y
        ) {
          try { carSound.pause(); } catch(e) {}
          try { crashSound.currentTime = 0; crashSound.play(); } catch(e) {}
          setRunning(false);
          return;
        }
      }

      // Skor = jarak
      setScore(prev => prev + 1);
      requestAnimationFrame(update);
    }

    update();

    // cleanup
    return () => {
      window.removeEventListener('keydown', onKey);
      try { carSound.pause(); } catch(e) {}
    };
  }, [running]);

  return (
    <div style={{ textAlign: 'center', background: '#333', minHeight: '100vh', color: 'white' }}>
      <h1>🚗 Lamumu Traffic</h1>
      <p>Score: {score}</p>
      <canvas ref={canvasRef} style={{ background: '#555' }} />
      {!running && <h2>Game Over</h2>}
    </div>
  );
}
