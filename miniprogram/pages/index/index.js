import createHanziWriterContext from 'hanzi-writer-miniprogram';
import { pinyin } from 'pinyin-pro';

Page({
  data: {
    inputValue: '',
    errorMsg: '',
    showResult: false,
    currentChar: ''
  },

  onLoad() {
    // 页面加载
  },

  onInputChange(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  generateWorksheet() {
    const val = this.data.inputValue.trim();
    if (!val) {
      this.setData({ errorMsg: '请输入一个汉字', showResult: false });
      return;
    }
    if (val.length > 1) {
      this.setData({ errorMsg: '只能输入单个汉字', showResult: false });
      return;
    }
    if (!/^[\u4e00-\u9fa5]$/.test(val)) {
      this.setData({ errorMsg: '请输入规范的中文汉字', showResult: false });
      return;
    }

    this.setData({
      errorMsg: '',
      currentChar: val,
      showResult: true
    }, () => {
      // 在 DOM 更新后渲染动画和生成字帖
      this.renderAnimation(val);
      this.drawWorksheet(val);
    });
  },

  renderAnimation(char) {
    if (this.writerCtx) {
      this.writerCtx.destroy && this.writerCtx.destroy();
    }
    
    // 初始化 hanzi-writer-miniprogram
    this.writerCtx = createHanziWriterContext({
      id: 'writerCanvas',
      character: char,
      page: this,
      width: 150,
      height: 150,
      padding: 5,
      strokeColor: '#1890ff',
      radicalColor: '#1890ff',
      showOutline: true,
      delayBetweenStrokes: 200,
    });
    
    this.writerCtx.animateCharacter();
  },

  animateCharacter() {
    if (this.writerCtx) {
      this.writerCtx.animateCharacter();
    }
  },

  fetchCharData(char) {
    return new Promise((resolve) => {
      wx.request({
        url: `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${char}.json`,
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            resolve(res.data);
          } else {
            resolve(null);
          }
        },
        fail: () => resolve(null)
      });
    });
  },

  drawStrokesPath(canvas, ctx, strokes, maxIndex, x, y, size, color) {
    if (!strokes || strokes.length === 0 || !canvas.createPath2D) return;
    
    const offset = size * 0.1;
    const svgSize = size * 0.8;
    const scale = svgSize / 1024;
    
    ctx.save();
    ctx.translate(x + offset, y + offset);
    ctx.scale(scale, scale);
    ctx.translate(0, 900);
    ctx.scale(1, -1);
    
    ctx.fillStyle = color;
    for (let i = 0; i <= maxIndex; i++) {
      if (strokes[i]) {
        const path = canvas.createPath2D(strokes[i]);
        ctx.fill(path);
      }
    }
    ctx.restore();
  },

  drawWorksheet(char) {
    const query = wx.createSelectorQuery();
    query.select('#worksheetCanvas')
      .fields({ node: true, size: true })
      .exec(async (res) => {
        if (!res[0]) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        
        const charData = await this.fetchCharData(char);
        const strokes = charData ? charData.strokes : [];
        const strokeTotal = strokes.length;
        let charPinyin = '';
        try {
          charPinyin = pinyin(char);
        } catch (e) {
          console.error(e);
        }
        
        // 缩放比例，保证高清，这里设置A4大小，比例为 210 x 297 mm
        // 放大 10 倍以确保清晰度：2100 x 2970 像素
        const width = 2100;
        const height = 2970;
        canvas.width = width;
        canvas.height = height;
        
        // 填充白色背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // 绘制标题
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 80px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('姓名：__________  班级：__________  日期：__________', width / 2, 200);

        // 绘制大字示范区 (位置：x=200, y=300, 尺寸=450)
        const demoSize = 450;
        const demoX = 200;
        const demoY = 300;
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeRect(demoX, demoY, demoSize, demoSize);
        // 绘制虚线
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(demoX, demoY + demoSize / 2);
        ctx.lineTo(demoX + demoSize, demoY + demoSize / 2);
        ctx.moveTo(demoX + demoSize / 2, demoY);
        ctx.lineTo(demoX + demoSize / 2, demoY + demoSize);
        ctx.stroke();
        ctx.setLineDash([]); // 恢复实线

        // 示范字
        if (strokeTotal > 0 && canvas.createPath2D) {
          this.drawStrokesPath(canvas, ctx, strokes, strokeTotal - 1, demoX, demoY, demoSize, '#000000');
        } else {
          ctx.font = '360px "Kaiti", "STKaiti", serif';
          ctx.fillStyle = '#000000';
          ctx.textBaseline = 'middle';
          ctx.fillText(char, demoX + demoSize / 2, demoY + demoSize / 2);
        }

        // 注音
        if (charPinyin) {
          ctx.font = 'bold 80px sans-serif';
          ctx.fillStyle = '#333333';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(charPinyin, demoX + demoSize / 2, demoY + 30);
        }

        // 示范区信息
        ctx.font = 'bold 70px "Kaiti", "STKaiti", serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic'; // 恢复基线
        ctx.fillStyle = '#000000';
        ctx.fillText(`拼音：${charPinyin ? `__${charPinyin}__` : '________'}`, demoX + demoSize + 100, demoY + 120);
        ctx.fillText('部首：________', demoX + demoSize + 100, demoY + 250);
        ctx.fillText(`笔画：${strokeTotal ? `__${strokeTotal}__` : '________'}`, demoX + demoSize + 100, demoY + 380);

        // 绘制田字格
        const colsCount = 12;
        const rowsCount = 12;
        const cellSize = 150; // 每个格子 150px
        const startX = 150;
        const startY = 850;

        ctx.lineWidth = 2;
        ctx.font = '120px "Kaiti", "STKaiti", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 计算排版
        const breakdownTotalCells = 1 + strokeTotal;
        const breakdownRowsNeeded = Math.ceil(breakdownTotalCells / colsCount);
        const actualBreakdownRows = Math.min(breakdownRowsNeeded, rowsCount);
        
        const remainingRows = rowsCount - actualBreakdownRows;
        const traceRowsNeeded = Math.ceil(remainingRows * (6 / 9));
        
        let currentStrokeIndex = 0;
        let isSolidCharRendered = false;

        for (let r = 0; r < rowsCount; r++) {
          for (let c = 0; c < colsCount; c++) {
            const x = startX + c * cellSize;
            const y = startY + r * cellSize;
            
            // 绘制边框
            ctx.strokeStyle = '#000000';
            ctx.strokeRect(x, y, cellSize, cellSize);
            
            // 绘制虚线
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(x, y + cellSize / 2);
            ctx.lineTo(x + cellSize, y + cellSize / 2);
            ctx.moveTo(x + cellSize / 2, y);
            ctx.lineTo(x + cellSize / 2, y + cellSize);
            ctx.stroke();
            ctx.setLineDash([]); // 恢复实线
            
            // 绘制文字
            if (r < actualBreakdownRows) {
              // 笔顺拆解区
              if (!isSolidCharRendered) {
                // 第一格：完整实心字
                if (strokeTotal > 0 && canvas.createPath2D) {
                  this.drawStrokesPath(canvas, ctx, strokes, strokeTotal - 1, x, y, cellSize, '#000000');
                } else {
                  ctx.fillStyle = '#000000';
                  ctx.fillText(char, x + cellSize / 2, y + cellSize / 2);
                }
                isSolidCharRendered = true;
              } else if (currentStrokeIndex < strokeTotal) {
                // 后续格：拆解笔画
                if (strokeTotal > 0 && canvas.createPath2D) {
                  this.drawStrokesPath(canvas, ctx, strokes, currentStrokeIndex, x, y, cellSize, '#cccccc');
                } else {
                  ctx.fillStyle = '#cccccc';
                  ctx.fillText(char, x + cellSize / 2, y + cellSize / 2);
                }
                currentStrokeIndex++;
              }
            } else if (r >= actualBreakdownRows && r < actualBreakdownRows + traceRowsNeeded) {
              // 描红区
              if (strokeTotal > 0 && canvas.createPath2D) {
                this.drawStrokesPath(canvas, ctx, strokes, strokeTotal - 1, x, y, cellSize, '#cccccc');
              } else {
                ctx.fillStyle = '#cccccc';
                ctx.fillText(char, x + cellSize / 2, y + cellSize / 2);
              }
            } else {
              // 留白区
              // 留白不需要绘制文字
            }
          }
        }
        
        ctx.fillStyle = '#666666';
        ctx.font = '50px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('第 1 页', width / 2, height - 100);

        this.worksheetCanvasNode = canvas;
      });
  },

  saveWorksheet() {
    if (!this.worksheetCanvasNode) {
      wx.showToast({ title: '字帖生成中，请稍候', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    
    wx.canvasToTempFilePath({
      canvas: this.worksheetCanvasNode,
      success: (res) => {
        const filePath = res.tempFilePath;
        wx.saveImageToPhotosAlbum({
          filePath,
          success: () => {
            wx.hideLoading();
            wx.showToast({ title: '保存成功', icon: 'success' });
          },
          fail: (err) => {
            wx.hideLoading();
            if (err.errMsg === "saveImageToPhotosAlbum:fail auth deny") {
              wx.showModal({
                title: '提示',
                content: '需要您授权保存相册',
                success: modalRes => {
                  if (modalRes.confirm) {
                    wx.openSetting();
                  }
                }
              });
            } else {
              wx.showToast({ title: '保存失败', icon: 'none' });
            }
          }
        });
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('canvasToTempFilePath failed', err);
        wx.showToast({ title: '生成图片失败', icon: 'none' });
      }
    });
  }
});