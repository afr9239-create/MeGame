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
    const WORLD_WIDTH = 3000;  // Огромная карта
    const WORLD_HEIGHT = 3000;

    let player = {
        x: WORLD_WIDTH / 2,
        y: WORLD_HEIGHT / 2,
        size: 25,
        color: '#ffdbac',
        angle: 0,
        speed: 5,
        weapon: null,
        ammo: 0
    };

    // Камера
    let camera = { x: 0, y: 0 };

    let keys = {};
    let bullets = [];
    let droppedWeapons = [];
    let lastShot = 0;
    let isShooting = false;

    // Оружие
    const WEAPONS = {
        'Pistol': { ammo: 15, fireRate: 400, color: '#00ff00', speed: 12 },
        'Rifle': { ammo: 40, fireRate: 100, color: '#ff00ff', speed: 18 }
    };

    window.onkeydown = (e) => keys[e.code] = true;
    window.onkeyup = (e) => keys[e.code] = false;
    window.onmousedown = () => isShooting = true;
    window.onmouseup = () => isShooting = false;
    window.onmousemove = (e) => {
        // Угол с учетом положения камеры
        player.angle = Math.atan2(e.clientY - (player.y - camera.y), e.clientX - (player.x - camera.x));
    };

    function spawnWeapon() {
        if (droppedWeapons.length > 20) return; // Чтобы не лагало от кучи пушек
        const types = Object.keys(WEAPONS);
        const type = types[Math.floor(Math.random() * types.length)];
        droppedWeapons.push({
            x: Math.random() * WORLD_WIDTH,
            y: Math.random() * WORLD_HEIGHT,
            type: type,
            color: WEAPONS[type].color
        });
    }

    function update() {
        // Движение
        if (keys['KeyW'] && player.y > 0) player.y -= player.speed;
        if (keys['KeyS'] && player.y < WORLD_HEIGHT) player.y += player.speed;
        if (keys['KeyA'] && player.x > 0) player.x -= player.speed;
        if (keys['KeyD'] && player.x < WORLD_WIDTH) player.x += player.speed;

        // Камера следит за игроком
        camera.x = player.x - canvas.width / 2;
        camera.y = player.y - canvas.height / 2;

        // Стрельба
        if (isShooting && player.weapon && player.ammo > 0) {
            let now = Date.now();
            if (now - lastShot > WEAPONS[player.weapon].fireRate) {
                bullets.push({
                    x: player.x,
                    y: player.y,
                    vx: Math.cos(player.angle) * WEAPONS[player.weapon].speed,
                    vy: Math.sin(player.angle) * WEAPONS[player.weapon].speed,
                    color: WEAPONS[player.weapon].color,
                    dist: 0 // Считаем дистанцию
                });
                player.ammo--;
                lastShot = now;
                document.getElementById('ammo-count').innerText = player.ammo;
            }
        }

        // ОПТИМИЗАЦИЯ: Обновление и удаление лишних пуль
        for (let i = bullets.length - 1; i >= 0; i--) {
            let b = bullets[i];
            b.x += b.vx;
            b.y += b.vy;
            b.dist += 1; 

            // Если пуля слишком далеко или вылетела за мир — удаляем её!
            if (b.dist > 100 || b.x < 0 || b.x > WORLD_WIDTH || b.y < 0 || b.y > WORLD_HEIGHT) {
                bullets.splice(i, 1);
            }
        }

        // Подбор оружия
        if (keys['KeyE']) {
            for (let i = droppedWeapons.length - 1; i >= 0; i--) {
                let w = droppedWeapons[i];
                if (Math.hypot(player.x - w.x, player.y - w.y) < 40) {
                    player.weapon = w.type;
                    player.ammo = WEAPONS[w.type].ammo;
                    droppedWeapons.splice(i, 1);
                    document.getElementById('weapon-name').innerText = player.weapon;
                    document.getElementById('ammo-count').innerText = player.ammo;
                }
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        // Сдвигаем всё рисование под камеру
        ctx.translate(-camera.x, -camera.y);

        // Фон мира
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // Зеленая сетка
        ctx.strokeStyle = '#004400';
        ctx.lineWidth = 1;
        for(let i = 0; i <= WORLD_WIDTH; i += 100) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, WORLD_HEIGHT); ctx.stroke();
        }
        for(let i = 0; i <= WORLD_HEIGHT; i += 100) {
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(WORLD_WIDTH, i); ctx.stroke();
        }

        // Оружие на полу
        droppedWeapons.forEach(w => {
            ctx.fillStyle = w.color;
            ctx.fillRect(w.x - 10, w.y - 10, 20, 20);
        });

        // Пули
        bullets.forEach(b => {
            ctx.fillStyle = b.color;
            ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill();
        });

        // Игрок
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.angle);
        ctx.fillStyle = '#000'; // Оружие в руках
        ctx.fillRect(10, -5, 30, 10);
        ctx.fillStyle = player.color; // Тело
        ctx.beginPath(); ctx.arc(0, 0, player.size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        ctx.restore(); // Конец влияния камеры

        update();
        requestAnimationFrame(draw);
    }

    setInterval(spawnWeapon, 3000);
    spawnWeapon();
    draw();
};
