const socket = io('https://megame-server.onrender.com', { transports: ['websocket'] });
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const WORLD = { width: 700, height: 2500 }; 
const ZOOM = 0.55; 

let mySide = null; 
let gameActive = false;
let isSolo = false;
let soloSideTracker = 1; 
let players = { 1: { hp: 100, mana: 500 }, 2: { hp: 100, mana: 500 } };
let units = [];
let cameraY = 0;

const mapImg = new Image(); mapImg.src = 'map.jpg';
const bazaImg = new Image(); bazaImg.src = 'baza.jpg';

class Warrior {
    constructor(id, side, type, x, y) {
        this.id = id; this.side = side; this.type = type;
        this.x = x; this.y = y; this.hp = 100;
        this.range = 250; this.speed = 3.5; this.damage = 0.7;
        this.color = (side === 1) ? '#ff4757' : '#00d2ff';
    }
    update() {
        let target = null;
        let minDist = this.range;
        units.forEach(o => {
            if (this.side !== o.side) {
                let dx = o.x - this.x; let dy = o.y - this.y;
                let dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < minDist) { minDist = dist; target = o; }
            }
        });
        if (target) {
            if (minDist < 45) target.hp -= this.damage;
            else {
                let angle = Math.atan2(target.y - this.y, target.x - this.x);
                this.x += Math.cos(angle) * this.speed;
                this.y += Math.sin(angle) * this.speed;
            }
        } else { this.y += (this.side === 1) ? this.speed : -this.speed; }
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, 22, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "white"; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = "red"; ctx.fillRect(this.x-25, this.y-45, 50, 7);
        ctx.fillStyle = "lime"; ctx.fillRect(this.x-25, this.y-45, 50*(this.hp/100), 7);
    }
}

// ФУНКЦИИ МЕНЮ
function createHostRoom() {
    const randomRoom = Math.floor(1000 + Math.random() * 9000).toString();
    document.getElementById('room-input').value = randomRoom;
    joinLobby();
}

function joinLobby() {
    const roomName = document.getElementById('room-input').value;
    if (!roomName) return alert("Введите код комнаты!");
    socket.emit('joinRoom', roomName);
    document.getElementById('lobby-init').style.display = 'none';
    document.getElementById('lobby-waiting').style.display = 'block';
    document.getElementById('display-room-id').innerText = roomName;
}

function startSoloGame() { isSolo = true; mySide = 2; launchGame(); }
function startGameNetwork() { socket.emit('startGame'); }

// СЕТЕВЫЕ СОБЫТИЯ
socket.on('totalOnline', count => { document.getElementById('online-count').innerText = count; });
socket.on('playerRole', role => { 
    mySide = role; 
    document.getElementById('net-info').innerText = "Ты: " + (role === 1 ? "Красный (Верх)" : "Синий (Низ)"); 
});
socket.on('playerCount', count => { 
    if (count >= 2) {
        document.getElementById('waiting-status').innerText = "Игрок 2 подключился!";
        if (mySide === 2) document.getElementById('start-btn').style.display = 'block'; 
    } 
});
socket.on('gameStart', () => { launchGame(); });
socket.on('spawnUnit', d => { units.push(new Warrior(d.id, d.side, d.type, d.x, d.y)); });

function launchGame() {
    gameActive = true;
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';
    cameraY = (mySide === 1) ? -WORLD.height + 800 : WORLD.height - 800;
}

function spawnUnit() {
    if (!gameActive || players[mySide].mana < 50) return;
    players[mySide].mana -= 50;
    let targetSide = isSolo ? soloSideTracker : mySide;
    const unitData = {
        id: Math.random(), side: targetSide, type: 'scout',
        x: (Math.random() * (WORLD.width - 120)) - (WORLD.width/2 - 60),
        y: (targetSide === 1) ? -WORLD.height + 400 : WORLD.height - 400
    };
    units.push(new Warrior(unitData.id, unitData.side, unitData.type, unitData.x, unitData.y));
    if (!isSolo) socket.emit('spawnUnit', unitData);
    else soloSideTracker = (soloSideTracker === 1) ? 2 : 1;
}

function update() {
    if (!gameActive) return;
    for (let i = units.length - 1; i >= 0; i--) {
        let u = units[i]; u.update();
        if (u.side === 2 && u.y < -WORLD.height + 300) { players[1].hp -= 5; units.splice(i, 1); }
        else if (u.side === 1 && u.y > WORLD.height - 300) { players[2].hp -= 5; units.splice(i, 1); }
        else if (u.hp <= 0) units.splice(i, 1);
    }
    players[1].mana += 0.3; players[2].mana += 0.3;
    document.getElementById('mana-val').innerText = Math.floor(players[mySide].mana);
    document.getElementById('hp-blue').style.width = players[2].hp + '%';
    document.getElementById('hp-red').style.width = players[1].hp + '%';
    if (players[1].hp <= 0 || players[2].hp <= 0) {
        gameActive = false;
        document.getElementById('result-title').innerText = (players[1].hp <= 0) ? "ПОБЕДА СИНИХ" : "ПОБЕДА КРАСНЫХ";
        document.getElementById('result-screen').style.display = 'flex';
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.scale(ZOOM, ZOOM);
    ctx.translate(0, -cameraY);
    ctx.fillStyle = '#1a2b1a';
    ctx.fillRect(-WORLD.width*2, -WORLD.height - 1000, WORLD.width * 4, WORLD.height * 2 + 2000);
    if (mapImg.complete) {
        const roadH = mapImg.height * (WORLD.width / mapImg.width);
        for (let y = -WORLD.height; y < WORLD.height; y += roadH) { ctx.drawImage(mapImg, -WORLD.width/2, y, WORLD.width, roadH); }
    }
    if (bazaImg.complete) {
        const bW = 550, bH = 300, offset = 180;
        ctx.drawImage(bazaImg, -bW/2, -WORLD.height + offset, bW, bH);
        ctx.save(); ctx.translate(0, WORLD.height - offset); ctx.rotate(Math.PI);
        ctx.drawImage(bazaImg, -bW/2, -bH, bW, bH); ctx.restore();
    }
    units.forEach(u => u.draw());
    ctx.restore();
    if (gameActive) update();
    requestAnimationFrame(draw);
}

let isDrag = false, startY = 0;
canvas.ontouchstart = e => { isDrag = true; startY = e.touches[0].clientY / ZOOM + cameraY; };
canvas.ontouchmove = e => { 
    if(isDrag) { 
        let nextY = startY - e.touches[0].clientY / ZOOM;
        const limit = WORLD.height - 400; 
        if (nextY > limit) nextY = limit;
        if (nextY < -limit) nextY = -limit;
        cameraY = nextY; e.preventDefault(); 
    } 
};
canvas.ontouchend = () => isDrag = false;

window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
draw();
// ==========================================
// БЛОК 1: ЭКОНОМИКА И ПОСТРОЙКИ (WAR CASTLE)
// ==========================================

let playerGold = 100; // Стартовое золото
let buildings = [];   // Список всех построек (шахты, турели)

const BUILDING_TYPES = {
    MINE: { cost: 150, income: 15, hp: 200, color: '#ffd700', label: 'ШАХТА' },
    TURRET: { cost: 250, damage: 2, range: 400, hp: 500, color: '#95a5a6', label: 'ТУРЕЛЬ' }
};

// Функция постройки (вызывать при нажатии на кнопку в UI)
function buildStructure(type) {
    const config = BUILDING_TYPES[type];
    if (playerGold < config.cost) return console.log("Нужно больше золота!");

    playerGold -= config.cost;
    
    const newBuilding = {
        id: Math.random(),
        side: mySide,
        type: type,
        hp: config.hp,
        x: (Math.random() * 400) - 200, // Случайное место у базы
        y: (mySide === 1) ? -WORLD.height + 600 : WORLD.height - 600
    };

    buildings.push(newBuilding);
    if (!isSolo) socket.emit('spawnBuilding', newBuilding); // Синхронизация с сервером
}

// Каждые 4 секунды шахты приносят золото
setInterval(() => {
    if (!gameActive) return;
    const myMines = buildings.filter(b => b.type === 'MINE' && b.side === mySide);
    const earned = myMines.length * BUILDING_TYPES.MINE.income;
    playerGold += earned;
    
    // Обновляем текст золота (если в HTML есть элемент с id="gold-val")
    const goldUI = document.getElementById('gold-val');
    if (goldUI) goldUI.innerText = Math.floor(playerGold);
}, 4000);

// Слушаем сервер на предмет построек врага
socket.on('spawnBuilding', (bData) => {
    buildings.push(bData);
});
// ==========================================
// БЛОК 2: ВИЗУАЛИЗАЦИЯ И УРОН (WAR CASTLE)
// ==========================================

// Эту функцию мы вызываем внутри вашего основного draw()
function drawBuildings() {
    buildings.forEach(b => {
        const config = BUILDING_TYPES[b.type];
        ctx.fillStyle = config.color;
        
        // Рисуем здание как квадрат
        ctx.fillRect(b.x - 40, b.y - 40, 80, 80);
        
        // Полоска HP над зданием
        ctx.fillStyle = "red";
        ctx.fillRect(b.x - 40, b.y - 60, 80, 8);
        ctx.fillStyle = "lime";
        ctx.fillRect(b.x - 40, b.y - 60, 80 * (b.hp / config.hp), 8);
        
        // Название здания
        ctx.fillStyle = "white";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(config.label, b.x, b.y + 10);
    });
}

// Добавим вызов отрисовки зданий в ваш существующий цикл
// Нам нужно "вклиниться" в ваш draw(), поэтому просто добавим строчку ниже:
const originalDraw = draw;
draw = function() {
    originalDraw(); // Запускаем старый draw
    
    // Теперь рисуем здания ПОВЕРХ карты, но ДО интерфейса
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.scale(ZOOM, ZOOM);
    ctx.translate(0, -cameraY);
    drawBuildings();
    ctx.restore();
};
// ==========================================
// БЛОК 3: РАЗНООБРАЗИЕ ВОЙСК (WAR CASTLE)
// ==========================================

const UNIT_TYPES = {
    KNIGHT: { hp: 100, speed: 3.5, damage: 1, range: 45, cost: 50, color: null }, // Цвет берется из стороны
    MAGE:   { hp: 60,  speed: 2.5, damage: 3, range: 300, cost: 120, color: '#a55eea' }, 
    DRAGON: { hp: 300, speed: 4.5, damage: 5, range: 100, cost: 400, color: '#eb4d4b' }
};

// Улучшенная функция спавна (заменяет или дополняет старую)
function spawnAdvancedUnit(typeName) {
    const config = UNIT_TYPES[typeName];
    
    // Проверка: хватает ли маны (или золота, можно поменять)
    if (players[mySide].mana < config.cost) return console.log("Маны мало!");
    players[mySide].mana -= config.cost;

    let targetSide = isSolo ? soloSideTracker : mySide;
    
    // Создаем юнита на основе конфига
    const newUnit = new Warrior(
        Math.random(), 
        targetSide, 
        typeName, 
        (Math.random() * (WORLD.width - 120)) - (WORLD.width/2 - 60),
        (targetSide === 1) ? -WORLD.height + 400 : WORLD.height - 400
    );

    // Настраиваем уникальные параметры
    newUnit.hp = config.hp;
    newUnit.maxHp = config.hp;
    newUnit.speed = config.speed;
    newUnit.damage = config.damage;
    newUnit.range = config.range;
    if (config.color) newUnit.color = config.color;

    units.push(newUnit);
    
    if (!isSolo) socket.emit('spawnUnit', {
        id: newUnit.id, side: newUnit.side, type: typeName, x: newUnit.x, y: newUnit.y
    });
    else if (isSolo) soloSideTracker = (soloSideTracker === 1) ? 2 : 1;
}
