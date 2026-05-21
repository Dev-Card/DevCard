<script>
  import { onMount } from 'svelte';

  let canvas;
  const numberOfParticles = 65;
  let particlesArray = [];
  let mouse = { x: null, y: null, radius: 180 };

  onMount(() => {
    const ctx = canvas.getContext('2d');

    function setCanvasSize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    window.addEventListener('mouseout', () => {
      mouse.x = null;
      mouse.y = null;
    });

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2.5 + 1;
        this.speedX = (Math.random() - 0.5) * 0.35;
        this.speedY = (Math.random() - 0.5) * 0.35;
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
        if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;
      }
      draw() {
        ctx.fillStyle = 'rgba(192, 132, 252, 0.35)'; // Dark theme node color
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < numberOfParticles; i++) {
      particlesArray.push(new Particle());
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let baseOpacity = 0.15;
      let lineColor = '168, 85, 247'; // Lavender lines

      for (let a = 0; a < particlesArray.length; a++) {
        particlesArray[a].update();
        particlesArray[a].draw();

        for (let b = a; b < particlesArray.length; b++) {
          let dx = particlesArray[a].x - particlesArray[b].x;
          let dy = particlesArray[a].y - particlesArray[b].y;
          let distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            ctx.strokeStyle = `rgba(${lineColor}, ${(1 - distance/120) * baseOpacity})`;
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
            ctx.stroke();
          }
        }

        if (mouse.x !== null && mouse.y !== null) {
          let mdx = particlesArray[a].x - mouse.x;
          let mdy = particlesArray[a].y - mouse.y;
          let mDistance = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mDistance < mouse.radius) {
            ctx.strokeStyle = `rgba(${lineColor}, ${(1 - mDistance/mouse.radius) * (baseOpacity * 2.2)})`;
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener('resize', setCanvasSize);
    };
  });
</script>

<canvas bind:this={canvas} id="bg-network-canvas"></canvas>

<style>
  #bg-network-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 0;
    pointer-events: none;
  }
</style>