import React, { useEffect, useRef, useState } from 'react';

export default function App() {
  const canvasRef = useRef(null);
  const [running, setRunning] = useState(true);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Ukuran canvas
    canvas.width = 400;
    canvas.height = 600;

    // Player (mobil sapi)
    const player = {
      x: canvas.width / 2 - 25,
      y: canvas.height - 100,
      w: 50,
      h: 80,
      color: 'white',
      speed: 5
    };

    // Obstacle (cone)
    let obstacles = [];
    let obstacleTimer = 0;

    // Suara mobil
    const carSound = new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_6dc7479ec8.mp3?filename=car-engine-loop-10139.mp3');
    carSound.loop = true;
    carSound.volume = 0.3;
    carSound.play();

    // Suara tabrakan
    const crashSound = new Audio('https://cdn.pixabay.com/download/audio/2021/09/15/audio_eb1a0ceefb.mp3?filename=crash-102.wav');

    // Kontrol swipe
    let touchStartX = 0;
    let touchEndX = 0;
    canvas.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
    });
    canvas.addEventListener('touchend', e => {
      touchEndX = e.changedTouches[0].screenX;
      if (touchEndX < touchStartX - 30) {
        player.x -= player.speed * 10;
      }
      if (touchEndX > touchStartX + 30) {
        player.x += player.speed * 10;
      }
    });

    function drawPlayer() {
      ctx.fillStyle = player.color;
      ctx.fillRect(player.x, player.y, player.w, player.h);
      ctx.fillStyle = 'black';
      ctx.fillRect(player.x + 15, player.y + 20, 20, 20); // kepala sapi hitam putih
    }

    function drawObstacles() {
      ctx.fillStyle = 'orange';
      obstacles.forEach(o => {
        ctx.beginPath();
        ctx.moveTo(o.x + o.w / 2, o.y);
        ctx.lineTo(o.x, o.y + o.h);
        ctx.lineTo(o.x + o.w, o.y + o.h);
        ctx.closePath();
        ctx.fill();
      });
    }

    function update() {
      if (!running) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawPlayer();

      // Spawn cone
      obstacleTimer++;
      if (obstacleTimer > 60) {
        obstacles.push({
          x: Math.random() * (canvas.width - 40),
          y: -50,
          w: 40,
          h: 40,
          speed: 3
        });
        obstacleTimer = 0;
      }

      // Gerak cone
      obstacles.forEach(o => o.y += o.speed);

      // Hapus cone di luar layar
      obstacles = obstacles.filter(o => o.y < canvas.height);

      drawObstacles();

      // Cek tabrakan
      obstacles.forEach(o => {
        if (
          player.x < o.x + o.w &&
          player.x + player.w > o.x &&
          player.y < o.y + o.h &&
          player.y + player.h > o.y
        ) {
          carSound.pause();
          crashSound.play();
          setRunning(false);
        }
      });

      // Update skor
      setScore(prev => prev + 1);

      requestAnimationFrame(update);
    }

    update();
  }, [running]);

  return (
    <div style={{ textAlign: 'center', background: '#333', height: '100vh', color: 'white' }}>
      <h1>🚗 Lamumu Traffic</h1>
      <p>Score: {score}</p>
      <canvas ref={canvasRef} style={{ background: '#555' }}></canvas>
      {!running && <h2>Game Over</h2>}
    </div>
  );
}
