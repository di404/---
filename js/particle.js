/**
 * 粒子特效系统 - 像素风格
 * 沙子像素飞入杯子的效果
 */

import { SAND_COLORS } from './sandGrid.js';

export default class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  /**
   * 创建吸沙粒子
   * @param {number} count - 粒子数量
   * @param {number} startX - 吸沙范围起始X
   * @param {number} endX - 吸沙范围结束X
   * @param {number} y - 起始Y坐标（画框底部）
   * @param {number} colorIdx - 颜色索引
   * @param {Object} cup - 杯子对象
   */
  createSuctionParticles(count, startX, endX, y, colorIdx, cup) {
    const range = endX - startX;
    const color = SAND_COLORS[colorIdx];

    for (let i = 0; i < count; i++) {
      const offsetX = Math.random() * range;
      const startXPos = startX + offsetX;
      
      this.particles.push({
        x: startXPos,
        y: y,
        cup: cup,
        color: color,
        colorIdx: colorIdx,
        // 速度参数
        vx: (Math.random() - 0.5) * 2,  // 初始水平速度
        vy: -2 - Math.random() * 2,     // 初始向上速度（被吸起）
        // 物理参数
        gravity: 0.3,
        friction: 0.98,
        // 追踪参数
        followStrength: 0.8,  // 追踪杯子的强度
        // 渲染参数
        size: 3 + Math.random() * 2.5,  // 2-3.5像素
      });
    }
  }

  /**
   * 更新所有粒子
   */
  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // 检查杯子是否还存在
      if (!p.cup || p.cup.state === 0) {
        this.particles.splice(i, 1);
        continue;
      }
      
      // 实时获取杯子的当前位置（追踪移动中的杯子）
      const targetX = p.cup.x;
      const targetY = p.cup.y + 18;  // 杯子内部位置
      
      // 计算到目标的距离
      const dx = targetX - p.x;
      const dy = targetY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // 如果到达杯子，消失
      if (dist < 16) {
        this.particles.splice(i, 1);
        continue;
      }
      
      // 追踪目标（实时调整速度朝向杯子）
      p.vx += dx * p.followStrength * 0.1;
      p.vy += dy * p.followStrength * 0.1;
      
      // 应用重力和摩擦力
      p.vy += p.gravity;
      p.vx *= p.friction;
      p.vy *= p.friction;
      
      // 限制最大速度
      const maxSpeed = 12;
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > maxSpeed) {
        p.vx = (p.vx / speed) * maxSpeed;
        p.vy = (p.vy / speed) * maxSpeed;
      }
      
      // 更新位置
      p.x += p.vx;
      p.y += p.vy;
    }
  }

  /**
   * 渲染所有粒子 - 纯像素风格
   */
  render(ctx) {
    for (const p of this.particles) {
      const { r, g, b } = p.color;
      
      // 纯像素绘制，无发光效果
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      
      // 绘制正方形像素点
      const size = p.size;
      const drawX = Math.floor(p.x - size / 2);
      const drawY = Math.floor(p.y - size / 2);
      ctx.fillRect(drawX, drawY, size, size);
      
      // 可选：中心更亮的像素点（保持像素感）
      if (size > 2) {
        ctx.fillStyle = `rgb(${Math.min(255, r + 30)}, ${Math.min(255, g + 30)}, ${Math.min(255, b + 30)})`;
        ctx.fillRect(drawX + 1, drawY + 1, size - 2, size - 2);
      }
    }
  }

  /**
   * 清空所有粒子
   */
  clear() {
    this.particles = [];
  }
}
