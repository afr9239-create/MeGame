const socket = io('https://megame-server.onrender.com', { transports: ['websocket'] });
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const WORLD = { width: 600, height: 2000 }; 
let mySide = null; 
let gameActive = false;
let isSolo = false;
let soloSideTracker = 1; 
let players = { 1: { hp: 100, mana: 500 }, 2: { hp: 100, mana: 500 } };
let units = [];
let cameraY = 0;

const mapImg = new Image(); mapImg.src = 'map.jpg';
const bazaImg = new Image(); bazaImg.src = 'baza.jpg';

// ========================================================
// ЦЕХ №1: ЧЕРТЕЖИ (КЛАССЫ)
// ========================================================

class Warrior {
    constructor(id, side, type, x, y) {
        this.id = id;
        this.side = side;
        this.type = type; // 'scout', 'heavy', 'thief'
        this.x = x;
        this.y = y;
        this.hp = 100;
        
        // Настройки в зависимости от типа
        if (type === 'scout') {
            this.speed = 4;
            this.damage = 0.5;
            this.color = (side === 1) ? '#ff4757' : '#00d2ff';
        } else if (type === 'heavy') {
            this.speed = 1.5;
            this.hp = 250;
            this.damage = 1.2;
            this.color = (side === 1) ? '#b33939' : '#227093';
        }
    }

    update() {
        let target = null;
        // Поиск врага
        units.forEach(o => {
            if (this.side !== o.side && Math.abs(this.y - o.y) < 50 && Math.abs(this.x - o.x) < 40) {
                target = o;
            }
        });

        if (target) {
            target.hp -= this.damage; // Бьем врага
        } else {
            this.y += (this.side === 1) ? this.speed : -this.speed; // Идем
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, 18, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "white"; ctx.lineWidth = 3; ctx.stroke();
        // Полоска жизни
        ctx.fillStyle = "red"; ctx.fillRect(this.x-20, this.y-35, 40, 5);
        ctx.fillStyle = "lime"; ctx.fillRect(this.x-20, this.y-35, 40*(this.hp/(this.type === 'heavy' ? 250 : 100)), 5);
    }
}

// ========================================================
// ЦЕХ №2: СЕТЕВАЯ ЛОГИКА И УПРАВЛЕНИЕ
// ========================================================

socket.on('playerRole', role => { 
    mySide = role; 
    document.getElementById('net-info').innerText = "Ты Игрок " + role;
});

socket.on('playerCount', count => {
    if (count >= 2 && mySide === 2) document.getElementById('start-btn').style.display = 'block';
});

socket.on('gameStart', () => { launchGame(false); });

socket.on('spawnUnit', data => { 
    // Создаем воина по чертежу
    units.push(new Warrior(data.id, data.side, data.type, data.x, data.y)); 
});

function startSoloGame() {
    isSolo = true; mySide = 2; launchGame(true);
}

function launchGame(solo) {
    gameActive = true;
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';
    cameraY = (mySide === 1) ? -800 : 800;
}

function spawnUnit() {
    if (!gameActive) return;
    let targetSide = isSolo ? soloSideTracker : mySide;
    
    // Пока для теста спавним 'scout', позже добавим выбор
    const unitData = {
        id: Math.random(),
        side: targetSide,
        type: 'scout', 
        x: (Math.random() * 400) - 200,
        y: (targetSide === 1) ? -WORLD.height + 250 : WORLD.height - 250
    };

    units.push(new Warrior(unitData.id, unitData.side, unitData.type, unitData.x, unitData.y));
    if (!isSolo) socket.emit('spawnUnit', unitData);
    else soloSideTracker = (soloSideTracker === 1) ? 2 : 1; 
}

// ========================================================
// ЦЕХ №3: ОБЩИЙ ЦИКЛ ИГРЫ
// ========================================================

function update() {
    if (!gameActive) return;

    for (let i = units.length - 1; i >= 0; i--) {
        let u = units[i];
        u.update(); // Вызываем логику конкретного воина

        // Урон базе
        if (u.side === 2 && u.y < -WORLD.height + 150) { players[1].hp -= 5; units.splice(i, 1); }
        else if (u.side === 1 && u.y > WORLD.height - 150) { players[2].hp -= 5; units.splice(i, 1); }
        else if (u.hp <= 0) { units.splice(i, 1); }
    }

    players[1].mana += 0.2; players[2].mana += 0.2;
    
    if (players[1].hp <= 0 || players[2].hp <= 0) {
        gameActive = false;
        document.getElementById('result-title').innerText = (players[1].hp <= 0) ? "СИНИЕ ПОБЕДИЛИ" : "КРАСНЫЕ ПОБЕДИЛИ";
        document.getElementById('result-screen').style.display = 'flex';
    }

    document.getElementById('mana-val').innerText = Math.floor(players[mySide].mana);
    document.getElementById('hp-blue').style.width = players[2].hp + '%';
    document.getElementById('hp-red').style.width = players[1].hp + '%';
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2 - cameraY);
    
    // Дорога
    if (mapImg.complete) {
        for (let y = -WORLD.height; y < WORLD.height; y += 400) {
            ctx.drawImage(mapImg, -WORLD.width/2, y, WORLD.width, 405);
        }
    }
    
    // Базы
    if (bazaImg.complete) {
        ctx.drawImage(bazaImg, -WORLD.width/2, -WORLD.height, WORLD.width, 250);
        ctx.save(); ctx.translate(0, WORLD.height); ctx.rotate(Math.PI);
        ctx.drawImage(bazaImg, -WORLD.width/2, -250, WORLD.width, 250); ctx.restore();
    }
    
    // Рисуем всех воинов
    units.forEach(u => u.draw());

    ctx.restore();
    if (gameActive) update();
    requestAnimationFrame(draw);
}

// КАМЕРА
let isDrag = false, startY = 0;
canvas.ontouchstart = e => { isDrag = true; startY = e.touches[0].clientY + cameraY; };
canvas.ontouchmove = e => { if(isDrag) { cameraY = startY - e.touches[0].clientY; e.preventDefault(); } };
canvas.ontouchend = () => isDrag = false;

window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
draw();
