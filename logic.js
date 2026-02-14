class Warrior {
    constructor(id, side, type, x, y) {
        this.id = id;
        this.side = side;
        this.type = type;
        this.x = x;
        this.y = y;
        this.hp = 100;
        this.range = 150; // Радиус обнаружения врага (в пикселях)
        
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
        let minDist = this.range;

        // 1. Поиск ближайшего врага в радиусе видимости
        units.forEach(o => {
            if (this.side !== o.side) {
                // Вычисляем расстояние по формуле Пифагора
                let dx = o.x - this.x;
                let dy = o.y - this.y;
                let dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < minDist) {
                    minDist = dist;
                    target = o;
                }
            }
        });

        if (target) {
            // 2. Если враг очень близко (40 пикселей) — атакуем
            if (minDist < 45) {
                target.hp -= this.damage;
            } else {
                // 3. Если враг в радиусе видимости, но далеко — идем к нему!
                let dx = target.x - this.x;
                let dy = target.y - this.y;
                let angle = Math.atan2(dy, dx);
                
                this.x += Math.cos(angle) * this.speed;
                this.y += Math.sin(angle) * this.speed;
            }
        } else {
            // 4. Если врагов нет — просто идем к базе противника
            this.y += (this.side === 1) ? this.speed : -this.speed;
        }
    }

    draw() {
        // Отрисовка радиуса видимости (только для теста, потом можно убрать)
        /*
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.range, 0, Math.PI*2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.stroke();
        */

        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, 18, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "white"; ctx.lineWidth = 3; ctx.stroke();
        
        // ХП
        ctx.fillStyle = "red"; ctx.fillRect(this.x-20, this.y-35, 40, 5);
        let maxHp = (this.type === 'heavy' ? 250 : 100);
        ctx.fillStyle = "lime"; ctx.fillRect(this.x-20, this.y-35, 40*(this.hp/maxHp), 5);
    }
}
