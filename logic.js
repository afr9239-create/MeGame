const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- Настройки Оружия ---
const WEAPONS = {
    'Pistol': { ammo: 12, fireRate: 400, color: '#f1c40f', spread: 0.05, speed: 10 },
    'Rifle': { ammo: 30, fireRate: 100, color: '#e67e22', spread: 0.1, speed: 15 }
};

let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 20,
    angle: 0,
    weapon: null,
    ammo: 0,
    speed: 4
};

let bullets = [];
let droppedWeapons = []; // Оружие на полу
let keys = {};
let lastShot = 0;
let isShooting = false;

// Слушатели событий
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);
window.addEventListener('mousedown', () => isShooting = true);
window.addEventListener('mouseup', () => isShooting = false);
window.addEventListener('mousemove', (e) => {
    player.angle = Math.atan2(e.clientY - player.y, e.clientX - player.x);
});

// Спавн оружия в случайном месте
function spawnWeapon() {
    const types = Object.keys(WEAPONS);
    const type = types[Math.floor(Math.random() * types.length)];
    droppedWeapons.push({
        x: Math.random() * (canvas.width - 50) + 25,
        y: Math.random() * (canvas.height - 50) + 25,
        type: type,
        color: WEAPONS[type].color
    });
}

// Подбор оружия (клавиша E)
function tryPickUp() {
    if (keys['KeyE']) {
        droppedWeapons.forEach((w, index) => {
            let dist = Math.hypot(player.x - w.x, player.y - w.y);
            if (dist < 40) {
                player.weapon = w.type;
                player.ammo = WEAPONS[w.type].ammo;
                droppedWeapons.splice(index, 1);
                updateUI();
            }
        });
    }
}

function shoot() {
    if (!player.weapon || player.ammo <= 0) return;
    
    let now = Date.now();
    if (now - lastShot > WEAPONS[player.weapon].fireRate) {
        bullets.push({
            x: player.x + Math.cos(player.angle) * 25,
            y: player.y + Math.sin(player.angle) * 25,
            vx: Math.cos(player.angle + (Math.random() - 0.5) * WEAPONS[player.weapon].spread) * WEAPONS[player.weapon].speed,
            vy: Math.sin(player.angle + (Math.random() - 0.5) * WEAPONS[player.weapon].spread) * WEAPONS[player.weapon].speed,
            color: WEAPONS[player.weapon].color
        });
        player.ammo--;
        lastShot = now;
        updateUI();
    }
}

function updateUI() {
    document.getElementById('weapon-name').innerText = player.weapon || "Кулаки";
    document.getElementById('ammo-count').innerText = player.weapon ? player.ammo : "∞";
}

function update() {
    // Движение WASD
    if (keys['KeyW']) player.y -= player.speed;
    if (keys['KeyS']) player.y += player.speed;
    if (keys['KeyA']) player.x -= player.speed;
    if (keys['KeyD']) player.x += player.speed;

    if (isShooting) shoot();
    tryPickUp();

    // Обновление пуль
    bullets.forEach((b, i) => {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) bullets.splice(i, 1);
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Рисуем оружие на полу
    droppedWeapons.forEach(w => {
        ctx.fillStyle = w.color;
        ctx.fillRect(w.x - 10, w.y - 10, 20, 20);
        ctx.strokeStyle = "white";
        ctx.strokeRect(w.x - 12, w.y - 12, 24, 24);
    });

    // Рисуем пули
    bullets.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
    });

    // Рисуем игрока (кружочек)
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    
    // Тело
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.arc(0, 0, player.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Направление взгляда / Оружие
    ctx.fillStyle = player.weapon ? WEAPONS[player.weapon].color : '#555';
    ctx.fillRect(15, -5, 25, 10); 
    
    ctx.restore();

    update();
    requestAnimationFrame(draw);
}

// Каждые 5 секунд спавним новое оружие
setInterval(spawnWeapon, 5000);
spawnWeapon(); // Первое оружие сразу
draw();
