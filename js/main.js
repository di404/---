/**
 * 游戏入口
 */

import SandGame from './game.js';

// 获取 Canvas 上下文
GameGlobal.canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// 获取屏幕尺寸
const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
const screenWidth = windowInfo.screenWidth;
const screenHeight = windowInfo.screenHeight;

// 设置 Canvas 尺寸
canvas.width = screenWidth;
canvas.height = screenHeight;

/**
 * 游戏主类
 */
class Main {
  constructor() {
    this.game = new SandGame(ctx, screenWidth, screenHeight);
    this.aniId = 0;

    // 开始游戏循环
    this.loop();
  }

  /**
   * 游戏主循环
   */
  loop() {
    // 更新游戏逻辑
    this.game.update();

    // 渲染游戏画面
    this.game.render();

    // 请求下一帧
    this.aniId = requestAnimationFrame(this.loop.bind(this));
  }
}

// 启动游戏
new Main();
