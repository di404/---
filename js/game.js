/**
 * 游戏主逻辑
 * 整合落沙模拟、传送带、杯子系统
 * 
 * 正确玩法：
 * 1. 初始有一副完整的像素画
 * 2. 点击下方颜色桶，自动飞到传送带上
 * 3. 传送带从左到右无限循环移动
 * 4. 桶经过画框底部时吸取对应颜色的沙子
 * 5. 被吸走的地方形成空洞，上方沙子塌陷下落
 * 6. 桶装满后自动销毁移除
 */

import SandGrid, { SAND_COLORS, EMPTY } from './sandGrid.js';
import ConveyorBelt, { CONVEYOR_CONFIG } from './conveyor.js';
import Cup, { CUP_STATE, CUP_CAPACITY } from './cup.js';
import ParticleSystem from './particle.js';

// 游戏配置
const GAME_CONFIG = {
  CANVAS_SIZE: 350,       // 画框显示大小（固定，用于布局）
  SAND_GRID_SIZE: 100,    // 沙格逻辑大小（可以是 64/128/256 等，会拉伸填满 Canvas）
  UPDATE_INTERVAL: 2,     // 落沙更新间隔
  SUCTION_INTERVAL: 1,    // 吸沙间隔（每帧都吸，更流畅）
  SUCTION_DEPTH: 1,       // 吸取深度：每列每次吸取1个（更细腻）
  SUCTION_RANGE: 12,      // 吸取垂直范围：距离画框底部多少像素内的沙子才能被吸到（Canvas 坐标）
};

// 布局配置
const LAYOUT = {
  HEADER_HEIGHT: 60,
  BOARD_MARGIN_TOP: 10,
  CONVEYOR_HEIGHT: 70,
  CONVEYOR_MARGIN: 15,
  GRID_ROWS: 2,
  GRID_COLS: 6,
  GRID_CELL_SIZE: 50,
  FOOTER_HEIGHT: 80,
};

// 本关使用的颜色
const LEVEL_COLORS = [6, 7, 1, 2]; // 紫色、粉色、黄色、橙色

export default class SandGame {
  constructor(ctx, screenWidth, screenHeight) {
    this.ctx = ctx;
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;

    // 计算画框位置（居中）
    this.canvasX = (screenWidth - GAME_CONFIG.CANVAS_SIZE) / 2;
    this.canvasY = LAYOUT.HEADER_HEIGHT + LAYOUT.BOARD_MARGIN_TOP;

    // 计算传送带位置
    this.conveyorY = this.canvasY + GAME_CONFIG.CANVAS_SIZE + LAYOUT.CONVEYOR_MARGIN;

    // 计算颜色选择器位置
    this.gridStartY = this.conveyorY + LAYOUT.CONVEYOR_HEIGHT + 35;
    this.gridStartX = (screenWidth - LEVEL_COLORS.length * LAYOUT.GRID_CELL_SIZE) / 2;

    // 初始化落沙网格（使用逻辑大小，渲染时会拉伸到 Canvas 大小）
    this.sandGrid = new SandGrid(GAME_CONFIG.SAND_GRID_SIZE, GAME_CONFIG.SAND_GRID_SIZE);

    // 初始化传送带
    this.conveyor = new ConveyorBelt(screenWidth, this.canvasY, this.conveyorY);
    
    // 初始化粒子系统
    this.particles = new ParticleSystem();

    // 游戏状态
    this.frame = 0;
    this.score = 0;
    this.level = 40;
    this.lives = 3;
    this.timeLeft = 1420;
    this.coins = 425;
    this.isPaused = false;
    this.isGameOver = false;
    this.levelDifficulty = 'SUPER HARD';

    // 初始化
    this.init();
  }

  /**
   * 初始化游戏
   */
  init() {
    // 生成像素画（猫咪图案）
    this.sandGrid.generatePixelArt(LEVEL_COLORS);

    // 初始化传送带
    this.conveyor.init();

    // 绑定点击事件
    this.bindEvents();
  }

  /**
   * 绑定触摸/点击事件
   */
  bindEvents() {
    wx.onTouchStart((e) => {
      if (this.isPaused || this.isGameOver) return;

      const touch = e.touches[0];
      this.handleTouch(touch.clientX, touch.clientY);
    });
  }

  /**
   * 处理触摸
   * 点击颜色桶 -> 自动飞到传送带上
   */
  handleTouch(x, y) {
    // 检查是否点击了设置按钮
    if (x < 45 && y < 45) {
      this.togglePause();
      return;
    }

    // 检查是否点击了重置按钮
    if (x > 45 && x < 90 && y < 45) {
      this.restart();
      return;
    }

    // 检查是否点击了底部道具区
    if (y > this.screenHeight - LAYOUT.FOOTER_HEIGHT) {
      this.handlePowerUpClick(x);
      return;
    }

    // 检查是否点击了颜色选择器
    if (y > this.gridStartY && y < this.gridStartY + LAYOUT.GRID_ROWS * LAYOUT.GRID_CELL_SIZE) {
      this.handleColorSelectorClick(x, y);
      return;
    }
  }

  /**
   * 处理颜色选择器点击
   * 点击颜色 -> 自动创建桶并飞到传送带上
   */
  handleColorSelectorClick(x, y) {
    const col = Math.floor((x - this.gridStartX) / LAYOUT.GRID_CELL_SIZE);
    const row = Math.floor((y - this.gridStartY) / LAYOUT.GRID_CELL_SIZE);
    
    if (row >= 0 && row < LAYOUT.GRID_ROWS && col >= 0 && col < LEVEL_COLORS.length) {
      const colorIndex = row * LAYOUT.GRID_COLS + col;
      if (colorIndex < LEVEL_COLORS.length) {
        const colorIdx = LEVEL_COLORS[colorIndex];
        this.spawnCup(colorIdx);
      }
    }
  }

  /**
   * 在传送带上生成一个桶
   */
  spawnCup(colorIdx) {
    // 找传送带上的空位
    const slotIndex = this.conveyor.findEmptySlot();
    if (slotIndex === -1) {
      // 传送带已满，显示提示（可选）
      return false;
    }
    
    // 创建新桶
    const cup = new Cup(colorIdx);
    cup.y = this.conveyorY + 12;
    
    // 放置到传送带
    const success = this.conveyor.placeCup(cup, slotIndex);
    if (success) {
      this.coins = Math.max(0, this.coins - 5); // 消耗金币
    }
    return success;
  }

  /**
   * 处理道具点击
   */
  handlePowerUpClick(x) {
    const buttonWidth = 60;
    const spacing = 30;
    const startX = (this.screenWidth - (3 * buttonWidth + 2 * spacing)) / 2;
    
    for (let i = 0; i < 3; i++) {
      const btnX = startX + i * (buttonWidth + spacing);
      if (x >= btnX && x <= btnX + buttonWidth) {
        this.activatePowerUp(i);
        break;
      }
    }
  }

  /**
   * 激活道具
   */
  activatePowerUp(index) {
    const effects = [
      () => { this.score += 50; },
      () => { this.timeLeft += 30; },
      () => { this.coins += 10; },
    ];
    if (effects[index]) {
      effects[index]();
    }
  }

  /**
   * 将 Canvas 坐标转换为 Sand Grid 坐标
   */
  canvasToGridX(canvasX) {
    const relativeX = canvasX - this.canvasX;
    return Math.floor((relativeX / GAME_CONFIG.CANVAS_SIZE) * GAME_CONFIG.SAND_GRID_SIZE);
  }

  /**
   * 将 Canvas 距离转换为 Sand Grid 距离
   */
  canvasToGridDistance(canvasDist) {
    return Math.floor((canvasDist / GAME_CONFIG.CANVAS_SIZE) * GAME_CONFIG.SAND_GRID_SIZE);
  }

  /**
   * 处理吸沙逻辑
   */
  processSuction() {
    for (const slot of this.conveyor.slots) {
      if (!slot.cup) continue;
      if (slot.cup.isFull()) continue;

      const cup = slot.cup;

      // 检查是否在吸沙区域（画框底部）
      if (!this.conveyor.isInSuctionArea(cup.x, this.canvasX)) continue;

      // 获取吸沙范围（桶下方的区域）- Canvas 坐标
      const range = this.conveyor.getSuctionRange(cup.x, this.canvasX);

      // 转换为 Sand Grid 坐标
      const gridStart = this.canvasToGridX(this.canvasX + range.start);
      const gridEnd = this.canvasToGridX(this.canvasX + range.end);
      const gridSuctionRange = this.canvasToGridDistance(GAME_CONFIG.SUCTION_RANGE);

      // 尝试吸取对应颜色的沙子
      const removed = this.sandGrid.removeBottomSand(cup.colorIdx, gridStart, gridEnd, GAME_CONFIG.SUCTION_DEPTH, gridSuctionRange);

      if (removed > 0) {
        // 添加沙子到桶
        for (let i = 0; i < removed; i++) {
          if (cup.addSand()) {
            break; // 桶已满
          }
        }
        this.score += removed * 10;
        
        // 创建粒子特效：沙子从画框底部飞向杯子
        const suctionY = this.canvasY + GAME_CONFIG.CANVAS_SIZE;  // 画框底部（Canvas 坐标）
        
        // 创建粒子（使用 Canvas 坐标进行视觉展示）
        this.particles.createSuctionParticles(
          removed * 5, // 粒子数量（每个沙子生成多个粒子）
          this.canvasX + range.start,
          this.canvasX + range.end,
          suctionY,
          cup.colorIdx,
          cup
        );
      }
    }
  }

  /**
   * 检查关卡完成
   */
  checkLevelComplete() {
    const remaining = this.sandGrid.getRemainingSandCount();
    const totalPixels = this.sandGrid.width * this.sandGrid.height;
    
    // 剩余沙子少于总量的2%时才算过关（约5000像素）
    // 避免吸走少量沙子就触发重置
    if (remaining < 5000) {
      this.level++;
      this.score += 1000;
      this.coins += 50;
      // 清空传送带
      this.conveyor.reset();
      // 重新生成像素画
      this.sandGrid.generatePixelArt(LEVEL_COLORS);
    }
  }

  /**
   * 更新游戏逻辑
   */
  update() {
    if (this.isPaused || this.isGameOver) return;

    this.frame++;

    // 更新时间
    if (this.frame % 60 === 0 && this.timeLeft > 0) {
      this.timeLeft--;
    }

    // 更新落沙
    if (this.frame % GAME_CONFIG.UPDATE_INTERVAL === 0) {
      this.sandGrid.update();
    }

    // 更新传送带（包含自动移除已满的杯子）
    this.conveyor.update();

    // 处理吸沙
    if (this.frame % GAME_CONFIG.SUCTION_INTERVAL === 0) {
      this.processSuction();
    }
    
    // 更新粒子特效
    this.particles.update();

    // 检查关卡完成
    if (this.frame % 60 === 0) {
      this.checkLevelComplete();
    }
    
    // 检查游戏结束
    if (this.timeLeft <= 0) {
      this.isGameOver = true;
    }
  }

  /**
   * 渲染游戏画面
   */
  render() {
    // 清空画布
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.screenHeight);
    gradient.addColorStop(0, '#B8E6FF');
    gradient.addColorStop(1, '#87CEEB');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    // 绘制顶部状态栏
    this.renderHeader();

    // 绘制画框
    this.renderCanvasFrame();

    // 绘制落沙像素画（拉伸到 Canvas 大小）
    this.sandGrid.render(this.ctx, this.canvasX, this.canvasY, GAME_CONFIG.CANVAS_SIZE);

    // 绘制传送带
    this.conveyor.render(this.ctx, this.canvasX);
    
    // 绘制粒子特效（在传送带和画框之间）
    this.particles.render(this.ctx);

    // 绘制颜色选择器
    this.renderColorSelector();

    // 绘制底部道具栏
    this.renderFooter();

    // 游戏结束画面
    if (this.isGameOver) {
      this.renderGameOver();
    }
  }

  /**
   * 绘制顶部状态栏
   */
  renderHeader() {
    this.renderCircleButton(25, 30, '#4ECDC4', '⚙');
    this.renderCircleButton(70, 30, '#4ECDC4', '↺');

    const levelX = this.screenWidth / 2;
    const levelY = 30;
    
    this.ctx.fillStyle = '#9B59B6';
    this.roundRect(levelX - 55, levelY - 20, 110, 40, 10, true);
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 20px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`Level ${this.level}`, levelX, levelY + 7);
    
    this.ctx.fillStyle = '#7D3C98';
    this.roundRect(levelX - 35, levelY + 22, 70, 14, 7, true);
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '9px sans-serif';
    this.ctx.fillText(this.levelDifficulty, levelX, levelY + 32);

    const heartX = levelX + 80;
    this.ctx.fillStyle = '#E74C3C';
    this.ctx.font = '20px sans-serif';
    this.ctx.fillText('❤', heartX, levelY + 5);
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.fillText(this.lives.toString(), heartX + 15, levelY + 5);

    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    this.ctx.fillStyle = '#2C3E50';
    this.ctx.font = '16px sans-serif';
    this.ctx.fillText(timeStr, heartX + 60, levelY + 5);

    const coinX = this.screenWidth - 20;
    this.ctx.fillStyle = '#F1C40F';
    this.ctx.beginPath();
    this.ctx.arc(coinX - 50, levelY, 12, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#E67E22';
    this.ctx.font = '12px sans-serif';
    this.ctx.fillText('$', coinX - 50, levelY + 4);
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.fillText(this.coins.toString(), coinX - 25, levelY + 5);
  }

  /**
   * 绘制圆形按钮
   */
  renderCircleButton(x, y, color, text) {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 18, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '16px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, x, y + 6);
  }

  /**
   * 绘制圆角矩形
   */
  roundRect(x, y, width, height, radius, fill) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
    if (fill) {
      this.ctx.fill();
    }
  }

  /**
   * 绘制画框
   */
  renderCanvasFrame() {
    this.ctx.fillStyle = '#F8F9FA';
    this.ctx.fillRect(this.canvasX - 8, this.canvasY - 8, 272, 272);
    
    this.ctx.strokeStyle = '#BDC3C7';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(this.canvasX - 6, this.canvasY - 6, 268, 268);
    
    this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(this.canvasX - 2, this.canvasY - 2, 260, 260);
  }

  /**
   * 绘制颜色选择器
   */
  renderColorSelector() {
    const cellSize = LAYOUT.GRID_CELL_SIZE;
    
    this.ctx.fillStyle = '#2C3E50';
    this.ctx.font = '14px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('点击选择颜色', this.screenWidth / 2, this.gridStartY - 10);
    
    this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
    this.roundRect(
      this.gridStartX - 5, 
      this.gridStartY - 5, 
      LEVEL_COLORS.length * cellSize + 10, 
      cellSize + 10, 
      10, 
      true
    );

    for (let i = 0; i < LEVEL_COLORS.length; i++) {
      const x = this.gridStartX + i * cellSize;
      const y = this.gridStartY;
      const colorIdx = LEVEL_COLORS[i];
      const color = SAND_COLORS[colorIdx];
      
      this.renderColorBucket(x, y, cellSize, color, colorIdx);
    }
  }

  /**
   * 绘制单个颜色桶
   */
  renderColorBucket(x, y, size, color, colorIdx) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const { r, g, b } = color;
    
    this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
    this.roundRect(x + 2, y + 2, size - 4, size - 4, 8, true);
    
    this.ctx.fillStyle = 'rgba(0,0,0,0.15)';
    this.ctx.beginPath();
    this.ctx.ellipse(centerX + 2, centerY + 18, 18, 6, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    const gradient = this.ctx.createLinearGradient(centerX - 20, centerY - 10, centerX + 20, centerY - 10);
    gradient.addColorStop(0, `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})`);
    gradient.addColorStop(0.5, `rgb(${r}, ${g}, ${b})`);
    gradient.addColorStop(1, `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})`);
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - 18, centerY - 5);
    this.ctx.lineTo(centerX - 15, centerY + 15);
    this.ctx.quadraticCurveTo(centerX - 15, centerY + 18, centerX - 10, centerY + 18);
    this.ctx.lineTo(centerX + 10, centerY + 18);
    this.ctx.quadraticCurveTo(centerX + 15, centerY + 18, centerX + 15, centerY + 15);
    this.ctx.lineTo(centerX + 18, centerY - 5);
    this.ctx.closePath();
    this.ctx.fill();
    
    this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.8)`;
    this.ctx.beginPath();
    this.ctx.ellipse(centerX, centerY - 5, 16, 6, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.fillStyle = `rgba(${Math.max(0, r - 50)}, ${Math.max(0, g - 50)}, ${Math.max(0, b - 50)}, 0.5)`;
    this.ctx.beginPath();
    this.ctx.ellipse(centerX, centerY - 3, 12, 4, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    this.ctx.lineWidth = 1;
    this.roundRect(x + 2, y + 2, size - 4, size - 4, 8, false);
  }

  /**
   * 绘制底部道具栏
   */
  renderFooter() {
    const footerY = this.screenHeight - LAYOUT.FOOTER_HEIGHT + 10;
    const buttonWidth = 60;
    const buttonHeight = 50;
    const spacing = 30;
    const startX = (this.screenWidth - (3 * buttonWidth + 2 * spacing)) / 2;
    
    const powerUps = [
      { color: '#F1C40F', icon: '🌶️' },
      { color: '#3498DB', icon: '🧲' },
      { color: '#E74C3C', icon: '🌶️' },
    ];
    
    for (let i = 0; i < 3; i++) {
      const x = startX + i * (buttonWidth + spacing);
      const powerUp = powerUps[i];
      
      this.ctx.fillStyle = '#fff';
      this.ctx.beginPath();
      this.ctx.ellipse(
        x + buttonWidth / 2, 
        footerY + buttonHeight / 2, 
        buttonWidth / 2, 
        buttonHeight / 2, 
        0, 0, Math.PI * 2
      );
      this.ctx.fill();
      
      this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      
      this.ctx.fillStyle = powerUp.color;
      this.ctx.beginPath();
      this.ctx.ellipse(
        x + buttonWidth / 2, 
        footerY + buttonHeight / 2 - 3, 
        20, 16, 0, 0, Math.PI * 2
      );
      this.ctx.fill();
      
      this.ctx.font = '20px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(powerUp.icon, x + buttonWidth / 2, footerY + buttonHeight / 2 + 5);
    }
  }

  /**
   * 渲染游戏结束画面
   */
  renderGameOver() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 40px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('游戏结束', this.screenWidth / 2, this.screenHeight / 2 - 40);

    this.ctx.font = '24px sans-serif';
    this.ctx.fillText(`最终分数: ${this.score}`, this.screenWidth / 2, this.screenHeight / 2 + 20);

    this.ctx.font = '18px sans-serif';
    this.ctx.fillText('点击重新开始', this.screenWidth / 2, this.screenHeight / 2 + 70);
  }

  togglePause() {
    this.isPaused = !this.isPaused;
  }

  restart() {
    this.frame = 0;
    this.score = 0;
    this.level = 40;
    this.lives = 3;
    this.timeLeft = 1420;
    this.coins = 425;
    this.isPaused = false;
    this.isGameOver = false;

    this.sandGrid.clear();
    this.sandGrid.generatePixelArt(LEVEL_COLORS);
    this.conveyor.reset();
    this.particles.clear();
  }
}
