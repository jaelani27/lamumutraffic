import React, { useEffect, useRef, useState } from 'react';

export default function App() {
  const canvasRef = useRef(null);
  const [running, setRunning] = useState(true);
  const [score, setScore] = useState(0);
  const [spriteLoaded, setSpriteLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Ukuran canvas
    canvas.width = 400;
    canvas.height = 600;

    // Load sprite
    const playerImg = new Image();
    playerImg.onload = () => setSpriteLoaded(true);
    playerImg.src = '/sprites/cow-car.png'; // pastikan file ini ada

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

    const crashSound = new Audio('https://cdn.pixabay.com/download/audio/2021/09/15/audio_eb104ceefb.mp3');

    // Kontrol sentuhan
    let touchStartX = 0;
    canvas.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    canvas.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].screenX - touchStartX;
      if (dx < -30) player.x -= player.speed * 40; // kiri
      if (dx > 30) player.x += player.speed * 40;  // kanan
      player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
    }, { passive: true });

    // Kontrol keyboard
    window.addEventListener('keydown', e => {
      if (!running) return;
      if (e.key === 'ArrowLeft') player.x = Math.max(0, player.x - player.speed * 10);
      if (e.key === 'ArrowRight') player.x = Math.min(canvas.width - player.w, player.x + player.speed * 10);
    });

    // Gambar player
    function drawPlayer() {
      if (spriteLoaded) {
        ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);
      } else {
        ctx.fillStyle = '#fff';
        ctx.fillRect(player.x, player.y, player.w, player.h);
      }
    }

    // Gambar rintangan
    function drawObstacles() {
      ctx.fillStyle = '#ff7a00';
      obstacles.forEach(ob => {
        ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
      });
    }

    // Update rintangan
    function updateObstacles() {
      obstacleTimer++;
      if (obstacleTimer % 60 === 0) {
        obstacles.push({
          x: Math.random() * (canvas.width - 40),
          y: -40,
          w: 40,
          h: 40,
          speed: 4
        });
      }

      obstacles.forEach(ob => {
        ob.y += ob.speed;
        if (ob.y > canvas.height) {
          obstacles.shift();
          setScore(prev => prev + 1);
        }
      });

      // Cek tabrakan
      obstacles.forEach(ob => {
        if (
          player.x < ob.x + ob.w &&
          player.x + player.w > ob.x &&
          player.y < ob.y + ob.h &&
          player.y + player.h > ob.y
        ) {
          crashSound.play();
          setRunning(false);
        }
      });
    }

    // Loop game
    function gameLoop() {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawPlayer();
      drawObstacles();
      updateObstacles();
      requestAnimationFrame(gameLoop);
    }

    carSound.play().catch(() => {});
    gameLoop();

    return () => {
      carSound.pause();
    };
  }, [running, spriteLoaded]);

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>Score: {score}</h1>
      <canvas ref={canvasRef} style={{ border: '2px solid black', background: '#222' }}></canvas>
      {!running && <h2 style={{ color: 'red' }}>Game Over</h2>}
    </div>
  );
}
