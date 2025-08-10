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
    // Pastikan file ada di public/sprites/cow-car.png
    const playerImg = new Image();
    playerImg.onload = () => setSpriteLoaded(true);
    playerImg.src = '/sprites/cow-car.png'; // path fix untuk Vercel

    // Player
    const player = {
      x: canvas.width / 2 - 40,
      y: canvas.height - 140,
      w: 80,
      h: 110,
      speed: 5
    };

    // Obstacles
    let obstacles = [];
    let obstacleTimer = 0;

    // SFX
    const carSound = new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_6dc7479ec8.mp3');
    carSound.loop = true;
    carSound.volume = 0.25;

    const crashSound = new Audio('https://cdn.pixabay.com/download/audio/2021/09/15/audio_eb1a0ceefb.mp3');

    // Mulai sound saat user gesture
    let touchStartX = 0;
    canvas.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    canvas.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].screenX - touchStartX;
      if (dx < -30) player.x -= player.speed * 40; // kiri
      if (dx > 30) player.x += player.speed * 40; // kanan
      player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
    }, { passive: true });

    // Arrow keys (optional)
    const onKey = (e) => {
      if (!running) return;
      if (e.key === 'ArrowLeft') player.x = Math.max(0, player.x - player.speed * 10);
      if (e.key === 'ArrowRight') player.x = Math.min(canvas.width - player.w, player.x + player.speed * 10);
    };
    window.addEventListener('keydown', onKey);

    function drawPlayer() {
      if (spriteLoaded) {
        ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);
      } else {
        ctx.fillStyle = '#fff';
        ctx.fillRect(player.x, player.y, player.w, player.h);
      }
    }

    function drawObstacles() {
      ctx.fillStyle = '#ff7a00';
      obstacles.forEach(o => {
        ctx.fillRect(o.x, o.y, o.w, o.h);
      });
    }

    function update() {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update obstacles
      obstacleTimer++;
      if (obstacleTimer % 90 === 0) {
        obstacles.push({
          x: Math.random() * (canvas.width - 40),
          y: -60,
          w: 40,
          h: 60,
          speed: 3
        });
      }
      obstacles.forEach(o => o.y += o.speed);
      obstacles = obstacles.filter(o => o.y < canvas.height);

      // Collision detection
      obstacles.forEach(o => {
        if (
          player.x < o.x + o.w &&
          player.x + player.w > o.x &&
          player.y < o.y + o.h &&
          player.y + player.h > o.y
        ) {
          running = false;
          crashSound.play();
        }
      });

      drawPlayer();
      drawObstacles();
      requestAnimationFrame(update);
    }

    carSound.play().catch(() => {});
    update();

    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [spriteLoaded, running]);

  return (
    <div style={{ textAlign: 'center' }}>
      <canvas ref={canvasRef} style={{ background: '#222', display: 'block', margin: '0 auto' }} />
    </div>
  );
}
