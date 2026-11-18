const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreDisplay = document.getElementById('scoreDisplay');
const highScoreDisplay = document.getElementById('highScoreDisplay');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreEl = document.getElementById('finalScore');
const bestScoreEl = document.getElementById('bestScore');
const medalBox = document.getElementById('medalBox');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

// Audio Synthesizer (V8 Twin-Turbo + Electric Hybrid sound effects)
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function playSound(type) {
    try {
        if (!audioCtx) audioCtx = new AudioCtx();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'boost') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(420, now + 0.14);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.16);
            osc.start(now);
            osc.stop(now + 0.16);
        } else if (type === 'score') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(587.33, now);
            osc.frequency.setValueAtTime(880, now + 0.07);
            gain.gain.setValueAtTime(0.14, now);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.22);
            osc.start(now);
            osc.stop(now + 0.22);
        } else if (type === 'crash') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(110, now);
            osc.frequency.exponentialRampToValueAtTime(32, now + 0.35);
            gain.gain.setValueAtTime(0.22, now);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
        }
    } catch (e) {
        // Ignore audio errors if blocked by browser policy
    }
}

// Game State
let gameState = 'START'; // START, PLAYING, GAMEOVER
let score = 0;
let highScore = Number(localStorage.getItem('flappyT_highScore') || 0);
highScoreDisplay.textContent = highScore;

let frames = 0;
let speed = 3.3;

// Background city stars & parallax skyline
const stars = Array.from({ length: 45 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * (canvas.height - 200),
    r: Math.random() * 1.6 + 0.5,
    alpha: Math.random() * 0.7 + 0.3
}));

const buildings = Array.from({ length: 14 }, (_, i) => ({
    x: i * 42,
    w: 36 + (i % 3) * 10,
    h: 90 + ((i * 37) % 130)
}));

// Exhaust particles
let particles = [];

// Ferrari SF90 Stradale Object
const sf90 = {
    x: 115,
    y: 320,
    width: 78,
    height: 28,
    velocity: 0,
    gravity: 0.44,
    jumpStrength: -8.2,
    rotation: 0,
    wheelAngle: 0,

    reset() {
        this.y = 300;
        this.velocity = 0;
        this.rotation = 0;
    },

    flap() {
        this.velocity = this.jumpStrength;
        playSound('boost');
        // Spawn twin-turbo exhaust flame particles
        for (let i = 0; i < 9; i++) {
            particles.push({
                x: this.x - 32,
                y: this.y + (Math.random() * 6 - 3),
                vx: -(Math.random() * 4 + 3),
                vy: (Math.random() - 0.5) * 2.2,
                size: Math.random() * 6 + 4,
                life: 1,
                color: Math.random() > 0.35 ? '#ff2800' : (Math.random() > 0.5 ? '#facc15' : '#38bdf8')
            });
        }
    },

    update() {
        this.velocity += this.gravity;
        this.y += this.velocity;
        this.wheelAngle += 0.25;

        // Smooth pitch angle based on vertical velocity
        const targetRotation = Math.max(-0.42, Math.min(0.65, this.velocity * 0.055));
        this.rotation += (targetRotation - this.rotation) * 0.22;

        // Continuous subtle hybrid exhaust trail
        if (frames % 2 === 0) {
            particles.push({
                x: this.x - 32,
                y: this.y + 2,
                vx: -2.4,
                vy: (Math.random() - 0.5) * 0.8,
                size: 3.5,
                life: 0.7,
                color: '#ff4d00'
            });
        }

        // Ceiling check
        if (this.y - this.height / 2 < 0) {
            this.y = this.height / 2;
            this.velocity = 0;
        }

        // Track tarmac collision
        const groundY = canvas.height - 64;
        if (this.y + this.height / 2 >= groundY) {
            this.y = groundY - this.height / 2;
            triggerGameOver();
        }
    },

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Underglow Rosso Corsa
        const glow = ctx.createRadialGradient(0, 10, 4, 0, 10, 44);
        glow.addColorStop(0, 'rgba(255, 40, 0, 0.45)');
        glow.addColorStop(1, 'rgba(255, 40, 0, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(-45, -15, 90, 40);

        // Rear Carbon Wing / Active Shut-off Gurney
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.moveTo(-34, -2);
        ctx.lineTo(-41, -11);
        ctx.lineTo(-29, -9);
        ctx.lineTo(-28, -1);
        ctx.closePath();
        ctx.fill();

        // Main Ferrari SF90 Stradale Body Profile (Rosso Corsa)
        const bodyGrad = ctx.createLinearGradient(-38, -14, 38, 12);
        bodyGrad.addColorStop(0, '#ff2800');
        bodyGrad.addColorStop(0.6, '#d90404');
        bodyGrad.addColorStop(1, '#7f0000');

        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(-36, 4);      // Rear bumper
        ctx.lineTo(-32, -5);     // Rear deck
        ctx.lineTo(-12, -7);     // Engine cover
        ctx.lineTo(5, -14);      // Roofline peak
        ctx.lineTo(24, -6);      // Hood slope
        ctx.lineTo(40, -1);      // Hammerhead nose
        ctx.lineTo(43, 6);       // Front splitter tip
        ctx.lineTo(39, 10);      // Lower front
        ctx.lineTo(-35, 10);     // Lower rear diffuser
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#ff7b5a';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Assetto Fiorano Giallo Modena Racing Nose Stripe
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.moveTo(27, -5);
        ctx.lineTo(40, -1);
        ctx.lineTo(36, 1.5);
        ctx.lineTo(24, -2.5);
        ctx.closePath();
        ctx.fill();

        // Cockpit Canopy (Black / Cyber Glass)
        const glassGrad = ctx.createLinearGradient(-10, -13, 22, -4);
        glassGrad.addColorStop(0, '#090d16');
        glassGrad.addColorStop(0.5, '#38bdf8');
        glassGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = glassGrad;
        ctx.beginPath();
        ctx.moveTo(-9, -6.5);
        ctx.lineTo(5, -12.5);
        ctx.lineTo(22, -6);
        ctx.lineTo(13, -3.5);
        ctx.lineTo(-6, -3.5);
        ctx.closePath();
        ctx.fill();

        // Side Air Intake (Signature SF90 Triangle Rear Quarter Duct)
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.moveTo(-3, -2);
        ctx.lineTo(9, -3.5);
        ctx.lineTo(5, 4);
        ctx.lineTo(-5, 3);
        ctx.closePath();
        ctx.fill();

        // Carbon Fiber Side Skirt
        ctx.fillStyle = '#111827';
        ctx.fillRect(-24, 7.5, 52, 3);

        // Scuderia Ferrari Yellow Shield on Front Fender
        ctx.fillStyle = '#facc15';
        ctx.fillRect(19, -2, 3.8, 4.5);

        // Matrix LED Headlight + DRL Beam
        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath();
        ctx.moveTo(35, 0);
        ctx.lineTo(42, 2.5);
        ctx.lineTo(36, 3.8);
        ctx.closePath();
        ctx.fill();

        // Subtle Headlight Light Cone
        const beamGrad = ctx.createLinearGradient(42, 2, 115, 16);
        beamGrad.addColorStop(0, 'rgba(224, 242, 254, 0.28)');
        beamGrad.addColorStop(1, 'rgba(224, 242, 254, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(42, 1);
        ctx.lineTo(115, -12);
        ctx.lineTo(115, 22);
        ctx.lineTo(42, 5);
        ctx.closePath();
        ctx.fill();

        // Glowing Quad Rear Taillight
        ctx.fillStyle = '#ff3b30';
        ctx.shadowColor = '#ff2800';
        ctx.shadowBlur = 8;
        ctx.fillRect(-36.5, -2.5, 3, 4.5);
        ctx.shadowBlur = 0;

        // Front & Rear 5-Spoke Forged Wheels
        this.drawWheel(-21, 9.5);
        this.drawWheel(24, 9.5);

        ctx.restore();
    },

    drawWheel(wx, wy) {
        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(this.wheelAngle);

        // Tire
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.arc(0, 0, 7.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = '#3f3f46';
        ctx.stroke();

        // Rim spokes
        ctx.strokeStyle = '#d4d4d8';
        ctx.lineWidth = 1.1;
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * 5.2, Math.sin(angle) * 5.2);
            ctx.stroke();
        }

        // Giallo Modena Center Cap & Carbon Ceramic Brake Caliper
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
};

// Obstacles (Monza / Fiorano Carbon-Red Racing Gantries)
let obstacles = [];
const OBSTACLE_WIDTH = 68;
const OBSTACLE_GAP = 162;
const SPAWN_INTERVAL = 95;

function spawnObstacle() {
    const minTop = 70;
    const maxTop = canvas.height - 64 - OBSTACLE_GAP - 90;
    const topHeight = Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;

    obstacles.push({
        x: canvas.width + 20,
        topHeight,
        bottomY: topHeight + OBSTACLE_GAP,
        passed: false
    });
}

function drawCurbStripes(x, y, w, h) {
    const stripeH = 14;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    for (let sy = y; sy < y + h; sy += stripeH) {
        const isRed = Math.floor((sy - y) / stripeH) % 2 === 0;
        ctx.fillStyle = isRed ? '#dc2626' : '#f8fafc';
        ctx.fillRect(x, sy, 8, stripeH);
        ctx.fillRect(x + w - 8, sy, 8, stripeH);
    }
    ctx.restore();
}

function drawObstacles() {
    for (const obs of obstacles) {
        const groundY = canvas.height - 64;
        const bottomHeight = groundY - obs.bottomY;

        // Carbon Pillar Gradient
        const pillarGrad = ctx.createLinearGradient(obs.x, 0, obs.x + OBSTACLE_WIDTH, 0);
        pillarGrad.addColorStop(0, '#0f172a');
        pillarGrad.addColorStop(0.5, '#1e293b');
        pillarGrad.addColorStop(1, '#090d16');

        // Top Pylon
        ctx.fillStyle = pillarGrad;
        ctx.fillRect(obs.x, 0, OBSTACLE_WIDTH, obs.topHeight);
        drawCurbStripes(obs.x, 0, OBSTACLE_WIDTH, obs.topHeight);

        // Top Apex Cap
        ctx.fillStyle = '#ff2800';
        ctx.fillRect(obs.x - 4, obs.topHeight - 16, OBSTACLE_WIDTH + 8, 16);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(obs.x + 6, obs.topHeight - 10, OBSTACLE_WIDTH - 12, 4);

        // Bottom Pylon
        ctx.fillStyle = pillarGrad;
        ctx.fillRect(obs.x, obs.bottomY, OBSTACLE_WIDTH, bottomHeight);
        drawCurbStripes(obs.x, obs.bottomY, OBSTACLE_WIDTH, bottomHeight);

        // Bottom Apex Cap
        ctx.fillStyle = '#ff2800';
        ctx.fillRect(obs.x - 4, obs.bottomY, OBSTACLE_WIDTH + 8, 16);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(obs.x + 6, obs.bottomY + 6, OBSTACLE_WIDTH - 12, 4);
    }
}

function updateObstacles() {
    if (frames % SPAWN_INTERVAL === 0) {
        spawnObstacle();
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= speed;

        // Collision Bounding Box (Forgiving hitbox for smooth gameplay)
        const hitboxW = sf90.width * 0.76;
        const hitboxH = sf90.height * 0.72;
        const carLeft = sf90.x - hitboxW / 2;
        const carRight = sf90.x + hitboxW / 2;
        const carTop = sf90.y - hitboxH / 2;
        const carBottom = sf90.y + hitboxH / 2;

        if (carRight > obs.x && carLeft < obs.x + OBSTACLE_WIDTH) {
            if (carTop < obs.topHeight || carBottom > obs.bottomY) {
                triggerGameOver();
                return;
            }
        }

        // Score update
        if (!obs.passed && obs.x + OBSTACLE_WIDTH < sf90.x) {
            obs.passed = true;
            score++;
            scoreDisplay.textContent = score;
            playSound('score');

            // Slightly ramp up speed every 5 points
            if (score % 5 === 0 && speed < 5.2) {
                speed += 0.15;
            }
        }

        if (obs.x + OBSTACLE_WIDTH < -20) {
            obstacles.splice(i, 1);
        }
    }
}

function updateAndDrawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.045;

        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function drawEnvironment() {
    // Night Racing Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGrad.addColorStop(0, '#060810');
    skyGrad.addColorStop(0.55, '#121726');
    skyGrad.addColorStop(1, '#231118');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stars
    for (const s of stars) {
        ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
    }

    // Parallax Italian Night Skyline
    const groundY = canvas.height - 64;
    ctx.fillStyle = '#0c101b';
    for (const b of buildings) {
        if (gameState === 'PLAYING') {
            b.x -= speed * 0.25;
            if (b.x + b.w < 0) b.x = canvas.width + 20;
        }
        ctx.fillRect(b.x, groundY - b.h, b.w, b.h);
    }

    // Racing Circuit Asphalt & Red/White Apex Kerbs
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, groundY, canvas.width, 64);

    // Kerb strip at top of ground
    const kerbWidth = 28;
    const offset = (frames * speed) % (kerbWidth * 2);
    for (let x = -kerbWidth * 2; x < canvas.width + kerbWidth; x += kerbWidth) {
        const isRed = Math.floor((x + offset) / kerbWidth) % 2 === 0;
        ctx.fillStyle = isRed ? '#ef4444' : '#f8fafc';
        ctx.fillRect(x - (offset % kerbWidth), groundY, kerbWidth, 8);
    }

    // Glowing Rosso line on tarmac
    ctx.fillStyle = 'rgba(255, 40, 0, 0.35)';
    ctx.fillRect(0, groundY + 28, canvas.width, 2);
}

function getMedalTitle(pts) {
    if (pts >= 40) return '🏆 LÉGENDE SCUDERIA FIORANO';
    if (pts >= 25) return '🥇 PILOTE D’ESSAI OFFICIEL MARANELLO';
    if (pts >= 12) return '🥈 PILOTE ASSETTO CORSA';
    if (pts >= 5)  return '🥉 PILOTE CHALLENGE SF90';
    return '🏎️ PILOTE ROOKIE';
}

function startGame() {
    gameState = 'PLAYING';
    score = 0;
    frames = 0;
    speed = 3.3;
    obstacles = [];
    particles = [];
    scoreDisplay.textContent = '0';
    sf90.reset();
    sf90.flap();

    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
}

function triggerGameOver() {
    if (gameState === 'GAMEOVER') return;
    gameState = 'GAMEOVER';
    playSound('crash');

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyT_highScore', highScore);
        highScoreDisplay.textContent = highScore;
    }

    finalScoreEl.textContent = score;
    bestScoreEl.textContent = highScore;
    medalBox.textContent = getMedalTitle(score);
    gameOverScreen.classList.add('active');
}

// Controls
function handleAction(e) {
    if (e.type === 'keydown' && e.code !== 'Space' && e.code !== 'ArrowUp') return;
    if (e.type === 'keydown') e.preventDefault();

    if (gameState === 'PLAYING') {
        sf90.flap();
    } else if (gameState === 'START' && e.type === 'keydown') {
        startGame();
    } else if (gameState === 'GAMEOVER' && e.type === 'keydown') {
        startGame();
    }
}

window.addEventListener('keydown', handleAction);
canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (gameState === 'PLAYING') {
        sf90.flap();
    }
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Main Loop
function loop() {
    drawEnvironment();

    if (gameState === 'PLAYING') {
        frames++;
        updateObstacles();
        sf90.update();
    }

    drawObstacles();
    updateAndDrawParticles();
    sf90.draw();

    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
