/**
 * 粒子特效系统
 * 被吸走的沙子（像素）会飞向杯子
 * 粒子会实时追踪移动中的杯子
 */

import { SAND_COLORS } from './sandGrid.js';

export default class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  /**
   * 创建吸沙粒子（一个像素对应一个粒子）
   * @param {number} x - 起始X坐标（像素精确位置）
   * @param {number} y - 起始Y坐标（像素精确位置）
   * @param {number} colorIdx - 颜色索引
   * @param {Object} cup - 杯子对象（粒子会追踪这个杯子）
   */
  createSuctionParticle(x, y, colorIdx, cup) {
    const color = SAND_COLORS[colorIdx];
    
    this.particles.push({
      x: x,
      y: y,
      cup: cup,  // 存储杯子引用，实时追踪
      color: color,
      colorIdx: colorIdx,
      life: 1.0,  // 生命值 1.0 -> 0.0
      size: 1,  // 粒子大小 = 1像素（与沙子大小相同）
      speed: 0.12 + Math.random() * 0.08,  // 飞行速度
    });
  }

  /**
   * 创建多个吸沙粒子（一个沙子一个粒子）
   * @param {number} count - 沙子数量（粒子数量）
   * @param {number} startX - 吸沙范围起始X
   * @param {number} endX - 吸沙范围结束X
   * @param {number} y - 起始Y坐标（画框底部）
   * @param {number} colorIdx - 颜色索引
   * @param {Object} cup - 杯子对象（粒子会追踪这个杯子）
   */
  createSuctionParticles(count, startX, endX, y, colorIdx, cup) {
    // 在吸沙范围内均匀分布粒子
    const range = endX - startX;
    for (let i = 0; i < count; i++) {
      // 在吸沙范围内随机分布
      const offsetX = Math.random() * range;
      this.createSuctionParticle(startX + offsetX, y, colorIdx, cup);
    }
  }

  /**
   * 更新所有粒子
   */
  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // 获取杯子的当前位置（实时追踪）
      let targetX, targetY;
      if (p.cup && p.cup.state !== 0) {  // 杯子还存在且不是空闲状态
        targetX = p.cup.x;
        targetY = p.cup.y + 20;  // 杯子内部位置
      } else {
        // 杯子已被移除，粒子直接消失
        p.life = 0;
        continue;
      }
      
      // 计算朝向目标的速度向量
      const dx = targetX - p.x;
      const dy = targetY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 3) {
        // 到达目标，移除粒子
        p.life = 0;
      } else {
        // 向目标移动（速度随距离变化，近慢远快）
        const moveSpeed = Math.min(dist * p.speed, 8);  // 最大速度限制
        p.vx = (dx / dist) * moveSpeed;
        p.vy = (dy / dist) * moveSpeed;
        
        p.x += p.vx;
        p.y += p.vy;
      }
      
      // 生命值衰减
      p.life -= 0.015;
      
      // 移除死亡的粒子
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * 渲染所有粒子
   */
  render(ctx) {
    for (const p of this.particles) {
      const { r, g, b } = p.color;
      
      // 根据生命值调整透明度
      const alpha = Math.min(1, p.life * 1.5);
      
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      
      // 绘制1x1像素的粒子
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 1, 1);
    }
  }

  /**
   * 清空所有粒子
   */
  clear() {
    this.particles = [];
  }
}
