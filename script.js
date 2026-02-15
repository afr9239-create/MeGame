window.onload = function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Настройки МИРА
    const WORLD_WIDTH = 3000;
    const WORLD_HEIGHT = 3000;

    let player = {
        x: WORLD_WIDTH / 2,
        y: WORLD_HEIGHT / 2,
        size: 20,
        color: '#ffdbac',
        angle: 0,
        speed: 5,
        weapon: null,
        ammo: 0
    };

    let camera = { x: 0, y: 0 };
    let keys = {};
    let bullets = [];
    let droppedWeapons = [];
    let lastShot = 0;
    let lastWeaponSpawn = 0;
    let isShooting = false;

    const WEAPONS = {
        'Pistol': { ammo: 15, fireRate: 400, color: '#00ff00', speed: 12 },
        'Rifle': { ammo: 40, fireRate: 100, color: '#ff00ff', speed: 18 }
    };

    window.onkeydown = (e) => keys[e.code] = true;
    window.onkeyup = (e) => keys[e.code] = false;
    window.onmousedown = () => isShooting = true;
    window.onmouseup = () => isShooting = false;
    window.onmousemove = (e) => {
        player.angle = Math.atan2(e.clientY - (player.y - camera.y), e.clientX - (player.x - camera.x));
    };

    function update(now) {
        // 1. Плавное движение
        if (keys['KeyW'] && player.y > 0) player.y -= player.speed;
        if (keys['KeyS'] && player.y < WORLD_HEIGHT) player.y += player.speed;
        if (keys['KeyA'] && player.x > 0) player.x -= player.speed;
        if (keys['KeyD'] && player.x < WORLD_WIDTH) player.x += player.speed;

        // 2. Камера (без резких скачков)
        camera.x = player.x - canvas.width / 2;
        camera.y = player.y - canvas.height / 2;

        // 3. Спавн оружия через время (вместо setInterval)
        if (now - lastWeaponSpawn > 4000) {
            if (droppedWeapons.length < 15) {
                const types = Object.keys(WEAPONS);
                const type = types[Math.floor(Math.random() * types.length)];
                droppedWeapons.push({
                    x: Math.random() * WORLD_WIDTH,
                    y: Math.random() * WORLD_HEIGHT,
                    type: type,
                    color: WEAPONS[type].color
                });
            }
            lastWeaponSpawn = now;
        }

        // 4. Стрельба
        if (isShooting && player.weapon && player.ammo > 0) {
            if (now - lastShot > WEAPONS[player.weapon].fireRate) {
                bullets.push({
                    x: player.x,
                    y: player.y,
                    vx: Math.cos(player.angle) * WEAPONS[player.weapon].speed,
                    vy: Math.sin(player.angle) * WEAPONS[player.weapon].speed,
                    color: WEAPONS[player.weapon].color,
                    life: 100 // Жизненный цикл пули
                });
                player.ammo--;
                lastShot = now;
                document.getElementById('ammo-count').innerText = player.ammo;
            }
        }

        // 5. Оптимизация пуль (удаляем мертвые)
        for (let i = bullets.length - 1; i >= 0; i--) {
            let b = bullets[i];
            b.x += b.vx;
            b.y += b.vy;
            b.life--;
            if (b.life <= 0) bullets.splice(i, 1);
        }

        // 6. Подбор оружия
        if (keys['KeyE']) {
            for (let i = droppedWeapons.length - 1; i >= 0; i--) {
                let w = droppedWeapons[i];
                if (Math.abs(player.x - w.x) < 30 && Math.abs(player.y - w.y) < 30) {
                    player.weapon = w.type;
                    player.ammo = WEAPONS[w.type].ammo;
                    droppedWeapons.splice(i, 1);
                    document.getElementById('weapon-name').innerText = player.weapon;
                    document.getElementById('ammo-count').innerText = player.ammo;
                    break; 
                }
            }
        }
    }

    function draw(now) {
        update(now);

        // Очистка экрана
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(-camera.x, -camera.y);

        // Рисуем сетку только там, где видит камера (Оптимизация!)
        ctx.strokeStyle = '#003300';
        ctx.lineWidth = 1;
        let startX = Math.floor(camera.x / 100) * 100;
        let startY = Math.floor(camera.y / 100) * 100;

        for (let x = startX; x < startX + canvas.width + 100; x += 100) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_HEIGHT); ctx.stroke();
        }
        for (let y = startY; y < startY + canvas.height + 100; y += 100) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_WIDTH, y); ctx.stroke();
        }

        // Оружие
        for (let w of droppedWeapons) {
            ctx.fillStyle = w.color;
            ctx.fillRect(w.x - 10, w.y - 10, 20, 20);
        }

        // Пули
        for (let b of bullets) {
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
        }

        // Игрок
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.angle);
        ctx.fillStyle = '#000'; // Ствол
        ctx.fillRect(12, -4, 25, 8);
        ctx.fillStyle = player.color; // Тело
        ctx.beginPath(); ctx.arc(0, 0, player.size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        ctx.restore();
        requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
};
