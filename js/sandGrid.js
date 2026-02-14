/**
 * 元胞自动机落沙算法核心
 * 256x256 像素画布，支持最多12种颜色的沙子
 * 
 * 核心玩法：
 * - 初始有一副完整的像素画（填满整个画框）
 * - 底部沙子被吸走后，上方沙子会垂直下落填补
 * - 保持图案的整体结构
 */

// 12种颜色定义
export const SAND_COLORS = [
  { r: 255, g: 0, b: 0, name: 'red' },      // 红 0
  { r: 255, g: 165, b: 0, name: 'orange' }, // 橙 1
  { r: 255, g: 255, b: 0, name: 'yellow' }, // 黄 2
  { r: 0, g: 255, b: 0, name: 'green' },    // 绿 3
  { r: 0, g: 255, b: 255, name: 'cyan' },   // 青 4
  { r: 0, g: 0, b: 255, name: 'blue' },     // 蓝 5
  { r: 128, g: 0, b: 128, name: 'purple' }, // 紫 6
  { r: 255, g: 192, b: 203, name: 'pink' }, // 粉 7
  { r: 139, g: 69, b: 19, name: 'brown' },  // 棕 8
  { r: 128, g: 128, b: 128, name: 'gray' }, // 灰 9
  { r: 255, g: 255, b: 255, name: 'white' },// 白 10
  { r: 0, g: 0, b: 0, name: 'black' },      // 黑 11
];

// 0 表示空，1-12 表示对应颜色的沙子
export const EMPTY = 0;

export default class SandGrid {
  constructor(width = 256, height = 256) {
    this.width = width;
    this.height = height;
    // 使用 Uint8Array 存储格子状态，0=空，1-12=颜色索引+1
    this.grid = new Uint8Array(width * height);
    this.nextGrid = new Uint8Array(width * height);
  }

  /**
   * 获取指定位置的值
   */
  get(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return EMPTY;
    return this.grid[y * this.width + x];
  }

  /**
   * 设置指定位置的值
   */
  set(x, y, value) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.grid[y * this.width + x] = value;
  }

  /**
   * 清空画布
   */
  clear() {
    this.grid.fill(EMPTY);
    this.nextGrid.fill(EMPTY);
  }

  /**
   * 生成填满画框的像素画
   * 从画框顶部到底部都填满沙子，保持图案稳定
   * @param {number[]} colorIndices - 使用的颜色索引
   */
  generatePixelArt(colorIndices = [6, 7, 1, 2]) {
    this.clear();
    
    // 使用粉色系创建猫咪图案（参考图片风格）
    const pink = 7;      // 粉色 - 主体
    const purple = 6;    // 紫色 - 轮廓和细节
    const yellow = 2;    // 黄色 - 鼻子和装饰
    
    const cx = this.width / 2;
    const cy = this.height / 2;
    
    // 首先，用粉色填满整个画框（背景）
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.set(x, y, pink + 1);
      }
    }
    
    // 绘制猫咪头部轮廓（在粉色背景上绘制紫色轮廓）
    for (let y = 20; y < 236; y++) {
      for (let x = 20; x < 236; x++) {
        const dx = x - cx;
        const dy = (y - cy) * 0.85;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // 头部轮廓 - 边缘用紫色
        if (dist > 65 && dist < 75) {
          this.set(x, y, purple + 1);
        }
        
        // 耳朵 - 三角形
        const leftEar = (x < cx - 30 && y < cy - 35);
        const rightEar = (x > cx + 30 && y < cy - 35);
        
        if (leftEar || rightEar) {
          if (y < cy - 55) {
            // 耳尖
            this.set(x, y, purple + 1);
          } else if (y < cy - 35) {
            // 耳朵内部粉色
            this.set(x, y, pink + 1);
          }
        }
      }
    }
    
    // 眼睛（紫色）- 大而圆
    const eyeY = cy - 5;
    const leftEyeX = cx - 35;
    const rightEyeX = cx + 35;
    
    for (let y = eyeY - 25; y < eyeY + 25; y++) {
      for (let x = leftEyeX - 20; x < leftEyeX + 20; x++) {
        const dist = Math.sqrt((x - leftEyeX) ** 2 + (y - eyeY) ** 2);
        if (dist < 18) {
          this.set(x, y, purple + 1);
        }
      }
      for (let x = rightEyeX - 20; x < rightEyeX + 20; x++) {
        const dist = Math.sqrt((x - rightEyeX) ** 2 + (y - eyeY) ** 2);
        if (dist < 18) {
          this.set(x, y, purple + 1);
        }
      }
    }
    
    // 鼻子（黄色）
    for (let y = cy + 15; y < cy + 35; y++) {
      for (let x = cx - 12; x < cx + 12; x++) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy - 25) ** 2);
        if (dist < 10) {
          this.set(x, y, yellow + 1);
        }
      }
    }
    
    // 嘴巴（紫色线条）
    for (let i = 0; i < 30; i++) {
      this.set(cx - 10 - i, cy + 40 + Math.floor(i * 0.3), purple + 1);
      this.set(cx + 10 + i, cy + 40 + Math.floor(i * 0.3), purple + 1);
    }
    
    // 胡须（紫色线条）
    for (let i = 0; i < 5; i++) {
      const yOffset = i * 8;
      // 左边胡须
      for (let x = cx - 80; x < cx - 30; x++) {
        this.set(x, cy + 30 + yOffset, purple + 1);
        this.set(x, cy + 30 - yOffset, purple + 1);
      }
      // 右边胡须
      for (let x = cx + 30; x < cx + 80; x++) {
        this.set(x, cy + 30 + yOffset, purple + 1);
        this.set(x, cy + 30 - yOffset, purple + 1);
      }
    }
    
    // 添加一些装饰性的黄色斑点
    for (let i = 0; i < 50; i++) {
      const spotX = Math.floor(30 + Math.random() * 196);
      const spotY = Math.floor(30 + Math.random() * 196);
      const dist = Math.sqrt((spotX - cx) ** 2 + (spotY - cy) ** 2);
      
      if (dist > 80 && dist < 110 && Math.random() > 0.5) {
        this.set(spotX, spotY, yellow + 1);
        this.set(spotX + 1, spotY, yellow + 1);
        this.set(spotX, spotY + 1, yellow + 1);
      }
    }
    
    // 边框装饰（紫色）
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < 8; y++) {
        if ((x + y) % 4 === 0) {
          this.set(x, y, purple + 1);
          this.set(x, this.height - 1 - y, purple + 1);
        }
      }
    }
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < 8; x++) {
        if ((x + y) % 4 === 0) {
          this.set(x, y, purple + 1);
          this.set(this.width - 1 - x, y, purple + 1);
        }
      }
    }
    
    // 复制到 nextGrid
    this.nextGrid.set(this.grid);
  }

  /**
   * 移除底部的特定颜色沙子（吸沙效果）
   * @param {number} colorIdx - 颜色索引 (0-11)
   * @param {number} xStart - 开始x坐标
   * @param {number} xEnd - 结束x坐标
   * @param {number} suctionDepth - 每列吸取深度（像素数量），默认3
   * @returns {number} - 实际移除的数量
   */
  removeBottomSand(colorIdx, xStart, xEnd, suctionDepth = 3) {
    const colorValue = colorIdx + 1;
    let removed = 0;

    // 在指定x范围内，从下往上找该颜色的沙子
    for (let x = Math.max(0, xStart); x < Math.min(this.width, xEnd); x++) {
      let countInColumn = 0;
      // 从下往上遍历，找到该颜色的沙子，最多吸suctionDepth个
      for (let y = this.height - 1; y >= 0 && countInColumn < suctionDepth; y--) {
        if (this.get(x, y) === colorValue) {
          this.set(x, y, EMPTY);
          removed++;
          countInColumn++;
        }
      }
    }
    return removed;
  }

  /**
   * 元胞自动机更新 - 真实沙子物理
   * 
   * 特性：
   * 1. 优先垂直下落（保持整体结构）
   * 2. 当正下方被阻时，有概率斜向滑落（模拟流动性）
   * 3. 随机性使下落模式不僵硬
   * 4. 防止多个沙子合并：检查目标位置是否已被占据
   */
  update() {
    // 复制当前状态到nextGrid
    this.nextGrid.set(this.grid);
    
    let hasMovement = false;

    // 从下往上遍历（确保沙子能正确下落）
    for (let y = this.height - 2; y >= 0; y--) {
      for (let x = 0; x < this.width; x++) {
        const current = this.get(x, y);
        if (current === EMPTY) continue;
        
        // 检查当前位置是否已经被其他沙子移动到这里了
        // 如果是，说明这个位置的沙子已经被处理过了，跳过
        if (this.nextGrid[y * this.width + x] !== current) {
          continue;
        }

        const below = this.get(x, y + 1);
        const belowLeft = this.get(x - 1, y + 1);
        const belowRight = this.get(x + 1, y + 1);

        // 优先尝试正下方下落
        if (below === EMPTY) {
          // 检查目标位置在nextGrid中是否已被占据
          if (this.nextGrid[(y + 1) * this.width + x] === EMPTY) {
            this.nextGrid[(y + 1) * this.width + x] = current;
            this.nextGrid[y * this.width + x] = EMPTY;
            hasMovement = true;
          }
        }
        // 如果正下方被占据，尝试斜向滑落
        else {
          const leftEmpty = belowLeft === EMPTY && this.nextGrid[(y + 1) * this.width + (x - 1)] === EMPTY;
          const rightEmpty = belowRight === EMPTY && this.nextGrid[(y + 1) * this.width + (x + 1)] === EMPTY;
          
          if (leftEmpty && rightEmpty) {
            // 两边都可以滑落 - 随机选择一边
            if (Math.random() < 0.5) {
              this.nextGrid[(y + 1) * this.width + (x - 1)] = current;
              this.nextGrid[y * this.width + x] = EMPTY;
              hasMovement = true;
            } else {
              this.nextGrid[(y + 1) * this.width + (x + 1)] = current;
              this.nextGrid[y * this.width + x] = EMPTY;
              hasMovement = true;
            }
          }
          else if (leftEmpty) {
            // 只有左边可以滑落
            this.nextGrid[(y + 1) * this.width + (x - 1)] = current;
            this.nextGrid[y * this.width + x] = EMPTY;
            hasMovement = true;
          }
          else if (rightEmpty) {
            // 只有右边可以滑落
            this.nextGrid[(y + 1) * this.width + (x + 1)] = current;
            this.nextGrid[y * this.width + x] = EMPTY;
            hasMovement = true;
          }
        }
        // 否则保持不动
      }
    }

    // 交换grid和nextGrid
    const temp = this.grid;
    this.grid = this.nextGrid;
    this.nextGrid = temp;
    
    return hasMovement;
  }

  /**
   * 渲染到 Canvas
   */
  render(ctx, offsetX, offsetY, scale = 1) {
    // 创建 ImageData
    const imageData = ctx.createImageData(this.width, this.height);
    const data = imageData.data;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const value = this.get(x, y);
        const idx = (y * this.width + x) * 4;

        if (value === EMPTY) {
          // 空洞 - 显示背景色
          data[idx] = 40;     // R
          data[idx + 1] = 45; // G
          data[idx + 2] = 50; // B - 微微偏蓝
          data[idx + 3] = 255;// A
        } else {
          const color = SAND_COLORS[value - 1];
          // 添加一点随机变化使沙子更有质感
          const variation = (Math.random() - 0.5) * 6;
          data[idx] = Math.max(0, Math.min(255, color.r + variation));
          data[idx + 1] = Math.max(0, Math.min(255, color.g + variation));
          data[idx + 2] = Math.max(0, Math.min(255, color.b + variation));
          data[idx + 3] = 255;
        }
      }
    }

    // 绘制到画布
    ctx.putImageData(imageData, offsetX, offsetY);
  }

  /**
   * 获取底部每种颜色的数量统计
   */
  getBottomStats() {
    const stats = new Array(12).fill(0);
    const bottomY = this.height - 1;
    for (let x = 0; x < this.width; x++) {
      const value = this.get(x, bottomY);
      if (value !== EMPTY) {
        stats[value - 1]++;
      }
    }
    return stats;
  }
  
  /**
   * 检查是否还有沙子
   */
  hasSand() {
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] !== EMPTY) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * 获取剩余沙子数量
   */
  getRemainingSandCount() {
    let count = 0;
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] !== EMPTY) {
        count++;
      }
    }
    return count;
  }
}
