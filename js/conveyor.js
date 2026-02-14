/**
 * 传送带系统
 * 
 * 传送带从左到右无限循环移动
 * 槽位和杯子随传送带一起移动
 * 当从右边出去后，重新从左边进来
 */

import Cup, { CUP_STATE } from './cup.js';

// 传送带配置
export const CONVEYOR_CONFIG = {
  SLOT_COUNT: 5,        // 凹槽数量
  SLOT_SPACING: 75,     // 凹槽间距（像素）
  SPEED: 1.5,           // 移动速度（像素/帧）
};

export default class ConveyorBelt {
  constructor(screenWidth, canvasY, conveyorY) {
    this.screenWidth = screenWidth;
    this.canvasY = canvasY;
    this.y = conveyorY;
    
    // 传送带移动偏移量
    this.offsetX = 0;
    this.speed = CONVEYOR_CONFIG.SPEED;
    this.slotCount = CONVEYOR_CONFIG.SLOT_COUNT;
    this.slotSpacing = CONVEYOR_CONFIG.SLOT_SPACING;
    
    // 传送带总长度（包括屏幕外的部分，确保循环平滑）
    this.totalWidth = this.slotCount * this.slotSpacing;

    // 初始化槽位
    // 槽位使用相对位置，实际渲染时会加上 offsetX
    this.slots = [];
    for (let i = 0; i < this.slotCount; i++) {
      this.slots.push({
        index: i,
        baseX: i * this.slotSpacing,  // 槽位的基础相对位置
        occupied: false,
        cup: null,
      });
    }

    // 所有在传送带上的杯子
    this.activeCups = [];
  }

  /**
   * 初始化传送带
   */
  init() {
    this.activeCups = [];
    for (const slot of this.slots) {
      slot.occupied = false;
      slot.cup = null;
    }
    this.offsetX = 0;
  }

  /**
   * 重置
   */
  reset() {
    this.activeCups = [];
    for (const slot of this.slots) {
      slot.occupied = false;
      slot.cup = null;
    }
    this.offsetX = 0;
  }

  /**
   * 获取槽位的实际屏幕X坐标
   */
  getSlotScreenX(slot) {
    // 槽位位置 = 基础位置 + 偏移量
    let x = slot.baseX + this.offsetX;
    
    // 循环处理：当槽位完全移出右边界时，从左边重新进入
    // 使用模运算确保循环
    while (x > this.screenWidth) {
      x -= this.totalWidth;
    }
    
    return x;
  }

  /**
   * 找一个空槽位（基于当前可见区域）
   * @returns {number} 槽位索引，如果没有空位返回 -1
   */
  findEmptySlot() {
    for (const slot of this.slots) {
      if (!slot.occupied) {
        return slot.index;
      }
    }
    return -1;
  }

  /**
   * 获取指定屏幕位置的槽位索引
   */
  getSlotAt(screenX) {
    for (const slot of this.slots) {
      const slotX = this.getSlotScreenX(slot);
      if (screenX >= slotX && screenX < slotX + this.slotSpacing) {
        return slot.index;
      }
    }
    return -1;
  }

  /**
   * 放置杯子到指定凹槽
   * @param {Cup} cup - 要放置的杯子
   * @param {number} slotIndex - 凹槽索引
   * @returns {boolean} - 是否成功
   */
  placeCup(cup, slotIndex) {
    if (slotIndex < 0 || slotIndex >= this.slotCount) return false;
    
    const slot = this.slots[slotIndex];
    if (slot.occupied) return false;

    const slotX = this.getSlotScreenX(slot);
    cup.place(slotIndex, slotX, this.y + 12);
    cup.state = CUP_STATE.MOVING;
    
    slot.occupied = true;
    slot.cup = cup;
    this.activeCups.push(cup);

    return true;
  }

  /**
   * 检查并移除已满的杯子（自动销毁）
   * @returns {number} 移除的杯子数量
   */
  removeFullCups() {
    let removedCount = 0;
    
    for (const slot of this.slots) {
      if (slot.cup && slot.cup.isFull()) {
        // 从活跃列表中移除
        const idx = this.activeCups.indexOf(slot.cup);
        if (idx > -1) {
          this.activeCups.splice(idx, 1);
        }
        
        // 重置槽位
        slot.cup = null;
        slot.occupied = false;
        removedCount++;
      }
    }
    
    return removedCount;
  }

  /**
   * 检查指定位置是否在画框底部吸沙区域
   */
  isInSuctionArea(cupX, canvasX) {
    // 杯子的吸沙范围
    const suctionStart = cupX - 25;
    const suctionEnd = cupX + 25;
    // 画框底部范围
    const canvasBottomStart = canvasX;
    const canvasBottomEnd = canvasX + 256;

    return suctionStart < canvasBottomEnd && suctionEnd > canvasBottomStart;
  }

  /**
   * 获取杯子在画框底部的吸沙范围
   */
  getSuctionRange(cupX, canvasX) {
    const relativeX = cupX - canvasX;
    const suctionWidth = 50; // 吸沙宽度
    return {
      start: Math.max(0, Math.floor(relativeX - suctionWidth / 2)),
      end: Math.min(256, Math.floor(relativeX + suctionWidth / 2)),
    };
  }

  /**
   * 更新传送带
   */
  update() {
    // 增加偏移量，使传送带向右移动
    this.offsetX += this.speed;
    
    // 当偏移量超过一个周期时，重置以保持数值不会无限增大
    // 同时保持循环的平滑性
    if (this.offsetX >= this.totalWidth) {
      this.offsetX -= this.totalWidth;
    }

    // 更新所有杯子的位置
    for (const slot of this.slots) {
      if (slot.cup && slot.cup.state === CUP_STATE.MOVING) {
        // 杯子跟随槽位移动
        slot.cup.x = this.getSlotScreenX(slot) + this.slotSpacing / 2;
      }
    }
    
    // 自动移除已满的杯子
    this.removeFullCups();
  }

  /**
   * 渲染传送带
   */
  render(ctx, canvasX) {
    // 传送带主体 - 银灰色金属质感
    const gradient = ctx.createLinearGradient(0, this.y - 5, 0, this.y + 65);
    gradient.addColorStop(0, '#95A5A6');
    gradient.addColorStop(0.3, '#BDC3C7');
    gradient.addColorStop(0.7, '#BDC3C7');
    gradient.addColorStop(1, '#7F8C8D');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, this.y - 5, this.screenWidth, 70);
    
    // 传送带侧边
    ctx.fillStyle = '#5D6D7E';
    ctx.fillRect(0, this.y - 8, this.screenWidth, 6);
    ctx.fillRect(0, this.y + 62, this.screenWidth, 6);
    
    // 滚轴效果 - 向右滚动的视觉
    ctx.fillStyle = '#85929E';
    const rollerSpacing = 25;
    const rollerOffset = this.offsetX % rollerSpacing;
    for (let i = -rollerSpacing; i < this.screenWidth + rollerSpacing; i += rollerSpacing) {
      ctx.beginPath();
      ctx.arc(i - rollerOffset, this.y - 5, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(i - rollerOffset, this.y + 65, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 绘制槽位
    for (const slot of this.slots) {
      const slotX = this.getSlotScreenX(slot);
      const isOccupied = slot.occupied;
      
      // 只渲染在屏幕内的槽位
      if (slotX + this.slotSpacing < 0 || slotX > this.screenWidth) {
        continue;
      }

      // 凹槽背景
      ctx.fillStyle = isOccupied ? '#1a252f' : '#2C3E50';
      this.roundRect(ctx, slotX + 5, this.y + 5, this.slotSpacing - 10, 55, 6, true);
      
      // 凹槽内阴影（底部）
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(slotX + 8, this.y + 45, this.slotSpacing - 16, 12);

      // 凹槽边框
      ctx.strokeStyle = isOccupied ? '#2ECC71' : '#5D6D7E';
      ctx.lineWidth = 2;
      this.roundRect(ctx, slotX + 5, this.y + 5, this.slotSpacing - 10, 55, 6, false);
      
      // 如果没有杯子，显示提示
      if (!isOccupied) {
        ctx.fillStyle = '#5D6D7E';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('空', slotX + this.slotSpacing / 2, this.y + 38);
      }
    }

    // 渲染所有杯子
    for (const cup of this.activeCups) {
      // 只渲染在屏幕内的杯子
      if (cup.x > -50 && cup.x < this.screenWidth + 50) {
        cup.render(ctx);
      }
    }
  }

  /**
   * 绘制圆角矩形
   */
  roundRect(ctx, x, y, width, height, radius, fill) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) {
      ctx.fill();
    } else {
      ctx.stroke();
    }
  }
}
