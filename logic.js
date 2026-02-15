const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Растягиваем на весь экран
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Настройки
const WEAPONS = {
    'Pistol': { ammo: 15, fireRate: 400, color: '#00ff00', speed: 12 },
    'Rifle': { ammo: 40, fireRate: 100, color: '#ff00ff', speed: 18 }
};

let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 20,
    angle: 0,
    weapon: null,
    ammo: 0,
    speed: 4,
    color: '#ffdbac' // Телесный цвет (Skin Tone)
};

let keys = {};
let bullets = [];
let droppedWeapons = [];
let lastShot = 0;
let isShooting = false;

// Управление
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);
window.addEventListener('mousemove', e => {
    player.angle = Math.atan2(e.clientY - player.y, e.clientX - player.x);
});
window.addEventListener('mousedown', () => isShooting = true);
window.addEventListener('mouseup', () => isShooting = false);

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

function update() {
    // Движение
    if (keys['KeyW']) player.y -= player.speed;
    if (keys['KeyS']) player.y += player.speed;
    if (keys['KeyA']) player.x -= player.speed;
    if (keys['KeyD']) player.x += player.speed;

    // Подбор оружия на E
    if (keys['KeyE']) {
        droppedWeapons.forEach((w, i) => {
            if (Math.hypot(player.x - w.x, player.y - w.y) < 40) {
                player.weapon = w.type;
                player.ammo = WEAPONS[w.type].ammo;
                droppedWeapons.splice(i, 1);
                document.getElementById('weapon-name').innerText = player.weapon;
                document.getElementById('ammo-count').innerText = player.ammo;
            }
        });
    }

    // Стрельба
    if (isShooting && player.weapon && player.ammo > 0) {
        let now = Date.now();
        if (now - lastShot > WEAPONS[player.weapon].fireRate) {
            bullets.push({
                x: player.x,
                y: player.y,
                vx: Math.cos(player.angle) * WEAPONS[player.weapon].speed,
                vy: Math.sin(player.angle) * WEAPONS[player.weapon].speed,
                color: WEAPONS[player.weapon].color
            });
            player.ammo--;
            lastShot = now;
            document.getElementById('ammo-count').innerText = player.ammo;
        }
    }

    // Пули
    bullets.forEach((b, i) => {
        b.x += b.vx; b.y += b.vy;
        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) bullets.splice(i, 1);
    });
}

function draw() {
    // Очистка и фон
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Рисуем ЗЕЛЕНУЮ сетку
    ctx.strokeStyle = '#004400';
    ctx.lineWidth = 1;
    for(let i=0; i<canvas.width; i+=50) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for(let i=0; i<canvas.height; i+=50) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    // Оружие на земле
    droppedWeapons.forEach(w => {
        ctx.fillStyle = w.color;
        ctx.fillRect(w.x - 10, w.y - 10, 20, 20);
        ctx.strokeStyle = "white";
        ctx.strokeRect(w.x - 12, w.y - 12, 24, 24);
    });

    // Пули
    bullets.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI*2);
        ctx.fill();
    });

    // Игрок (Телесный кружочек)
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    
    // Руки/Оружие (черная палка)
    ctx.fillStyle = '#000';
    ctx.fillRect(10, -5, 30, 10);
    
    // Тело
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(0, 0, player.size, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();

    update();
    requestAnimationFrame(draw);
}

// Запуск
setInterval(spawnWeapon, 4000);
spawnWeapon();
draw();
