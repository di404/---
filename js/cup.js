/**
 * 杯子/桶系统
 * 
 * 桶放在传送带的凹槽上
 * 经过画框底部时会吸取对应颜色的沙子
 */

import { SAND_COLORS } from './sandGrid.js';

// 桶容量 - 调整到1000-2000范围，一幅画有6万+像素
export const CUP_CAPACITY = 4500;

// 桶状态
export const CUP_STATE = {
  IDLE: 0,      // 空闲（在颜色选择器中）
  MOVING: 1,    // 正在传送带上移动
  FULL: 2,      // 已满
};

export default class Cup {
  constructor(colorIdx) {
    this.colorIdx = colorIdx;  // 0-11
    this.color = SAND_COLORS[colorIdx];
    this.amount = 0;           // 当前收集的沙子数量
    this.state = CUP_STATE.IDLE;
    this.x = 0;
    this.y = 0;
    this.slotIndex = -1;
    this.width = 44;
    this.height = 40;
  }

  /**
   * 重置桶
   */
  reset() {
    this.amount = 0;
    this.state = CUP_STATE.IDLE;
    this.slotIndex = -1;
  }

  /**
   * 放置到指定凹槽
   */
  place(slotIndex, slotX, slotY) {
    this.slotIndex = slotIndex;
    this.x = slotX;
    this.y = slotY;
    this.state = CUP_STATE.MOVING;
  }

  /**
   * 添加沙子
   * @returns {boolean} - 是否已满
   */
  addSand() {
    if (this.state !== CUP_STATE.MOVING) {
      return false;
    }
    this.amount++;
    if (this.amount >= CUP_CAPACITY) {
      this.state = CUP_STATE.FULL;
      return true;
    }
    return false;
  }

  /**
   * 检查是否已满
   */
  isFull() {
    return this.amount >= CUP_CAPACITY;
  }

  /**
   * 更新位置
   */
  updatePosition(conveyorX) {
    // 位置由传送带管理
  }

  /**
   * 渲染桶
   */
  render(ctx) {
    const { r, g, b } = this.color;
    const centerX = this.x;
    const centerY = this.y + this.height / 2;

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(centerX + 2, this.y + this.height + 1, this.width / 2 - 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 桶身渐变
    const gradient = ctx.createLinearGradient(centerX - this.width/2, this.y, centerX + this.width/2, this.y);
    gradient.addColorStop(0, `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`);
    gradient.addColorStop(0.5, `rgb(${r}, ${g}, ${b})`);
    gradient.addColorStop(1, `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`);
    
    // 桶身形状
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(centerX - this.width / 2 + 4, this.y + 8);
    ctx.lineTo(centerX - this.width / 2 + 2, this.y + this.height - 6);
    ctx.quadraticCurveTo(centerX - this.width / 2 + 2, this.y + this.height, centerX - this.width / 2 + 8, this.y + this.height);
    ctx.lineTo(centerX + this.width / 2 - 8, this.y + this.height);
    ctx.quadraticCurveTo(centerX + this.width / 2 - 2, this.y + this.height, centerX + this.width / 2 - 2, this.y + this.height - 6);
    ctx.lineTo(centerX + this.width / 2 - 4, this.y + 8);
    ctx.closePath();
    ctx.fill();

    // 桶口
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.9)`;
    ctx.beginPath();
    ctx.ellipse(centerX, this.y + 8, this.width / 2 - 4, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 桶口内阴影
    ctx.fillStyle = `rgba(${Math.max(0, r - 60)}, ${Math.max(0, g - 60)}, ${Math.max(0, b - 60)}, 0.6)`;
    ctx.beginPath();
    ctx.ellipse(centerX, this.y + 10, this.width / 2 - 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 填充的沙子
    if (this.amount > 0) {
      const fillRatio = this.amount / CUP_CAPACITY;
      const fillHeight = fillRatio * (this.height - 18);
      const surfaceY = this.y + this.height - 6 - fillHeight;
      
      // 沙子主体 - 带颗粒感的渐变
      const sandGradient = ctx.createLinearGradient(
        centerX - this.width / 2 + 8, surfaceY,
        centerX + this.width / 2 - 8, this.y + this.height - 6
      );
      sandGradient.addColorStop(0, `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`);
      sandGradient.addColorStop(0.5, `rgb(${r}, ${g}, ${b})`);
      sandGradient.addColorStop(1, `rgb(${Math.max(0, r - 10)}, ${Math.max(0, g - 10)}, ${Math.max(0, b - 10)})`);
      
      ctx.fillStyle = sandGradient;
      ctx.fillRect(centerX - this.width / 2 + 8, surfaceY, this.width - 16, fillHeight);
      
      // 沙子表面 - 微微鼓起的效果
      ctx.fillStyle = `rgb(${Math.min(255, r + 30)}, ${Math.min(255, g + 30)}, ${Math.min(255, b + 30)})`;
      ctx.beginPath();
      ctx.ellipse(centerX, surfaceY + 2, this.width / 2 - 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // 沙子表面高光
      ctx.fillStyle = `rgba(255, 255, 255, 0.3)`;
      ctx.beginPath();
      ctx.ellipse(centerX - 5, surfaceY, (this.width / 2 - 12) * 0.6, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 桶身边框
    ctx.strokeStyle = `rgba(${Math.max(0, r - 80)}, ${Math.max(0, g - 80)}, ${Math.max(0, b - 80)}, 0.4)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - this.width / 2 + 4, this.y + 8);
    ctx.lineTo(centerX - this.width / 2 + 2, this.y + this.height - 6);
    ctx.quadraticCurveTo(centerX - this.width / 2 + 2, this.y + this.height, centerX - this.width / 2 + 8, this.y + this.height);
    ctx.lineTo(centerX + this.width / 2 - 8, this.y + this.height);
    ctx.quadraticCurveTo(centerX + this.width / 2 - 2, this.y + this.height, centerX + this.width / 2 - 2, this.y + this.height - 6);
    ctx.lineTo(centerX + this.width / 2 - 4, this.y + 8);
    ctx.stroke();

    // 进度数字 - 显示为 "当前/总量" 格式
    ctx.fillStyle = '#fff';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 2;
    
    // 简化显示，超过1000显示为1k
    let amountText = this.amount.toString();
    if (this.amount >= 1000) {
      amountText = (this.amount / 1000).toFixed(1) + 'k';
    }
    ctx.fillText(amountText, centerX, this.y + 26);
    ctx.shadowBlur = 0;

    // 已满标记 - 自动销毁前的提示
    if (this.state === CUP_STATE.FULL) {
      // 闪烁效果提示即将移除
      const flashAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 100);
      ctx.fillStyle = `rgba(46, 204, 113, ${flashAlpha})`;
      ctx.beginPath();
      ctx.arc(centerX, this.y + this.height / 2, 15, 0, Math.PI * 2);
      ctx.fill();
      
      // 对勾
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(centerX - 8, this.y + this.height / 2);
      ctx.lineTo(centerX - 3, this.y + this.height / 2 + 5);
      ctx.lineTo(centerX + 6, this.y + this.height / 2 - 6);
      ctx.stroke();
    }
  }
}
