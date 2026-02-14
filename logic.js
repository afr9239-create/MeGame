        const socket = io('https://megame-server.onrender.com', { transports: ['websocket'] });
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ПАРАМЕТРЫ МИРА
const WORLD = { width: 800, height: 3000 }; 
const ZOOM = 0.7; // Отдаление камеры (чем меньше число, тем дальше камера)

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
// КЛАСС ВОИНА (С логикой сближения)
// ========================================================
class Warrior {
    constructor(id, side, type, x, y) {
        this.id = id;
        this.side = side;
        this.type = type;
        this.x = x;
        this.y = y;
        this.hp = 100;
        this.range = 200; // Радиус обнаружения
        
        if (type === 'scout') {
            this.speed = 4;
            this.damage = 0.5;
            this.color = (side === 1) ? '#ff4757' : '#00d2ff';
        }
    }

    update() {
        let target = null;
        let minDist = this.range;

        units.forEach(o => {
            if (this.side !== o.side) {
                let dx = o.x - this.x;
                let dy = o.y - this.y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist) { minDist = dist; target = o; }
            }
        });

        if (target) {
            if (minDist < 45) {
                target.hp -= this.damage;
            } else {
                let dx = target.x - this.x;
                let dy = target.y - this.y;
                let angle = Math.atan2(dy, dx);
                this.x += Math.cos(angle) * this.speed;
                this.y += Math.sin(angle) * this.speed;
            }
        } else {
            this.y += (this.side === 1) ? this.speed : -this.speed;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, 20, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "white"; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = "red"; ctx.fillRect(this.x-20, this.y-40, 40, 6);
        ctx.fillStyle = "lime"; ctx.fillRect(this.x-20, this.y-40, 40*(this.hp/100), 6);
    }
}

// ========================================================
// ЛОГИКА И СЕТЬ
// ========================================================
socket.on('playerRole', role => { 
    mySide = role; 
    document.getElementById('net-info').innerText = "Игрок " + role;
});
socket.on('playerCount', count => {
    if (count >= 2 && mySide === 2) document.getElementById('start-btn').style.display = 'block';
});
socket.on('gameStart', () => { launchGame(false); });
socket.on('spawnUnit', data => { units.push(new Warrior(data.id, data.side, data.type, data.x, data.y)); });

function startSoloGame() { isSolo = true; mySide = 2; launchGame(true); }

function launchGame(solo) {
    gameActive = true;
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';
    cameraY = (mySide === 1) ? -WORLD.height + 500 : WORLD.height - 500;
}

function spawnUnit() {
    if (!gameActive) return;
    let targetSide = isSolo ? soloSideTracker : mySide;
    const unitData = {
        id: Math.random(),
        side: targetSide,
        type: 'scout',
        x: (Math.random() * (WORLD.width - 100)) - (WORLD.width/2 - 50),
        y: (targetSide === 1) ? -WORLD.height + 300 : WORLD.height - 300
    };
    units.push(new Warrior(unitData.id, unitData.side, unitData.type, unitData.x, unitData.y));
    if (!isSolo) socket.emit('spawnUnit', unitData);
    else soloSideTracker = (soloSideTracker === 1) ? 2 : 1;
}

function update() {
    if (!gameActive) return;
    for (let i = units.length - 1; i >= 0; i--) {
        let u = units[i];
        u.update();
        if (u.side === 2 && u.y < -WORLD.height + 200) { players[1].hp -= 5; units.splice(i, 1); }
        else if (u.side === 1 && u.y > WORLD.height - 200) { players[2].hp -= 5; units.splice(i, 1); }
        else if (u.hp <= 0) { units.splice(i, 1); }
    }
    players[1].mana += 0.2; players[2].mana += 0.2;
    updateUI();
}

function updateUI() {
    document.getElementById('mana-val').innerText = Math.floor(players[mySide].mana);
    document.getElementById('hp-blue').style.width = players[2].hp + '%';
    document.getElementById('hp-red').style.width = players[1].hp + '%';
    if (players[1].hp <= 0 || players[2].hp <= 0) {
        gameActive = false;
        document.getElementById('result-title').innerText = (players[1].hp <= 0) ? "ПОБЕДА СИНИХ" : "ПОБЕДА КРАСНЫХ";
        document.getElementById('result-screen').style.display = 'flex';
    }
}

// ========================================================
// ОТРИСОВКА (КАЧЕСТВО И КАМЕРА)
// ========================================================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    // Центрируем и применяем ZOOM
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.scale(ZOOM, ZOOM);
    ctx.translate(0, -cameraY);

    // 1. РИСУЕМ ФОН (Трава)
    ctx.fillStyle = '#1a2b1a';
    ctx.fillRect(-WORLD.width, -WORLD.height - 500, WORLD.width * 2, WORLD.height * 2 + 1000);

    // 2. РИСУЕМ ДОРОГУ (Без растягивания)
    if (mapImg.complete) {
        const imgW = WORLD.width;
        const imgH = mapImg.height * (imgW / mapImg.width); // Сохраняем пропорции картинки
        for (let y = -WORLD.height; y < WORLD.height; y += imgH) {
            ctx.drawImage(mapImg, -imgW/2, y, imgW, imgH);
        }
    }

    // 3. РИСУЕМ БАЗЫ (Фиксированный размер)
    if (bazaImg.complete) {
        const bW = WORLD.width + 100;
        const bH = 300;
        ctx.drawImage(bazaImg, -bW/2, -WORLD.height, bW, bH); // Верх
        ctx.save();
        ctx.translate(0, WORLD.height);
        ctx.rotate(Math.PI);
        ctx.drawImage(bazaImg, -bW/2, -bH, bW, bH); // Низ
        ctx.restore();
    }

    units.forEach(u => u.draw());
    ctx.restore();

    if (gameActive) update();
    requestAnimationFrame(draw);
}

// УПРАВЛЕНИЕ КАМЕРОЙ (С учетом ZOOM)
let isDrag = false, startY = 0;
canvas.ontouchstart = e => { isDrag = true; startY = e.touches[0].clientY / ZOOM + cameraY; };
canvas.ontouchmove = e => { if(isDrag) { cameraY = startY - e.touches[0].clientY / ZOOM; e.preventDefault(); } };
canvas.ontouchend = () => isDrag = false;

window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
draw();
    
