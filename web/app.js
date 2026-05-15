document.addEventListener('DOMContentLoaded', () => {
    const charInput = document.getElementById('charInput');
    const generateBtn = document.getElementById('generateBtn');
    const errorMsg = document.getElementById('errorMsg');
    const animationSection = document.getElementById('animationSection');
    const animateBtn = document.getElementById('animateBtn');
    const exportControls = document.getElementById('exportControls');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const worksheetContainer = document.getElementById('worksheetContainer');
    const worksheetBody = document.getElementById('worksheetBody');

    let writer = null;
    let currentChar = '';

    // 汉字校验正则
    const isChineseChar = (str) => /^[\u4e00-\u9fa5]$/.test(str);

    generateBtn.addEventListener('click', handleGenerate);
    animateBtn.addEventListener('click', () => {
        if (writer) {
            writer.animateCharacter();
        }
    });
    exportPdfBtn.addEventListener('click', exportToPDF);

    charInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleGenerate();
        }
    });

    async function handleGenerate() {
        const val = charInput.value.trim();
        if (!val) {
            showError('请输入一个汉字');
            return;
        }
        if (val.length > 1) {
            showError('只能输入单个汉字');
            return;
        }
        if (!isChineseChar(val)) {
            showError('请输入规范的中文汉字');
            return;
        }

        clearError();
        currentChar = val;
        
        // 显示区域
        animationSection.style.display = 'block';
        worksheetContainer.style.display = 'block';
        exportControls.style.display = 'block';

        renderAnimation(currentChar);
        await renderWorksheet(currentChar);
    }

    function showError(msg) {
        errorMsg.textContent = msg;
    }

    function clearError() {
        errorMsg.textContent = '';
    }

    function renderAnimation(char) {
        const target = document.getElementById('character-target');
        target.innerHTML = ''; // 清空旧动画
        
        writer = HanziWriter.create('character-target', char, {
            width: 150,
            height: 150,
            padding: 5,
            strokeColor: '#1890ff', // 蓝色笔画
            radicalColor: '#1890ff',
            showOutline: true,
            delayBetweenStrokes: 200,
        });
        
        writer.animateCharacter();
    }

    async function fetchCharData(char) {
        try {
            // 这里使用 HanziWriter 官方默认使用的数据源加载字符笔顺数据
            const res = await fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${char}.json`);
            if (res.ok) {
                return await res.json();
            }
        } catch (e) {
            console.error('获取汉字数据失败', e);
        }
        return null;
    }

    async function renderWorksheet(char) {
        worksheetBody.innerHTML = '';

        const charData = await fetchCharData(char);
        const strokes = charData ? charData.strokes : [];
        const strokeTotal = strokes.length;
        const charPinyin = window.pinyinPro ? window.pinyinPro.pinyin(char) : '';

        // 1. 示范区 (大字)
        const demoArea = document.createElement('div');
        demoArea.className = 'demo-area';
        
        const demoCellWrapper = document.createElement('div');
        demoCellWrapper.className = 'demo-cell-wrapper';
        const demoCell = createGridCell(char, 'solid', strokes, strokeTotal - 1);
        
        // 注音
        if (charPinyin) {
            const pinyinDiv = document.createElement('div');
            pinyinDiv.style.position = 'absolute';
            pinyinDiv.style.top = '2%';
            pinyinDiv.style.width = '100%';
            pinyinDiv.style.textAlign = 'center';
            pinyinDiv.style.fontSize = '18px';
            pinyinDiv.style.fontFamily = 'sans-serif';
            pinyinDiv.style.color = '#333';
            pinyinDiv.style.zIndex = '3';
            pinyinDiv.textContent = charPinyin;
            demoCell.appendChild(pinyinDiv);
        }
        
        demoCellWrapper.appendChild(demoCell);
        
        const demoInfo = document.createElement('div');
        demoInfo.className = 'demo-info';
        demoInfo.innerHTML = `<div><span>拼音：</span>${charPinyin ? `__${charPinyin}__` : '________'} </div><br><div><span>部首：</span>________ </div><br><div><span>笔画：</span>${strokeTotal ? `__${strokeTotal}__` : '________'} </div>`;
        
        demoArea.appendChild(demoCellWrapper);
        demoArea.appendChild(demoInfo);
        
        const worksheetParent = worksheetBody.parentNode;
        const oldDemo = worksheetParent.querySelector('.demo-area');
        if (oldDemo) {
            worksheetParent.removeChild(oldDemo);
        }
        worksheetParent.insertBefore(demoArea, worksheetBody);

        // 2. 描红区排版
        const rowsCount = 12;
        const colsCount = 12; // 180mm / 15mm = 12格

        // 计算笔顺拆解需要的总格数（1个实心字 + 所有笔画拆解）
        const breakdownTotalCells = 1 + strokeTotal;
        // 计算笔顺拆解需要占用多少行（向上取整）
        const breakdownRowsNeeded = Math.ceil(breakdownTotalCells / colsCount);
        // 限制最多占用所有行，通常不会超过3行
        const actualBreakdownRows = Math.min(breakdownRowsNeeded, rowsCount);

        // 记录当前渲染到第几个笔画
        let currentStrokeIndex = 0;
        let isSolidCharRendered = false;

        // 渲染笔顺拆解行
        for (let r = 0; r < actualBreakdownRows; r++) {
            const row = document.createElement('div');
            row.className = 'grid-row';
            
            for (let c = 0; c < colsCount; c++) {
                if (!isSolidCharRendered) {
                    // 第一格：完整实心字
                    row.appendChild(createGridCell(char, 'solid', strokes, strokeTotal - 1));
                    isSolidCharRendered = true;
                } else if (currentStrokeIndex < strokeTotal) {
                    // 后续格子：逐步增加笔画
                    row.appendChild(createGridCell(char, 'stroke-breakdown', strokes, currentStrokeIndex));
                    currentStrokeIndex++;
                } else {
                    // 补充空白格
                    row.appendChild(createGridCell('', 'empty'));
                }
            }
            worksheetBody.appendChild(row);
        }

        // 计算剩余行数
        const remainingRows = rowsCount - actualBreakdownRows;
        // 将剩余行数分配给“描红行”和“留白行”
        // 原逻辑是 6行描红，3行留白（比例大概 2:1）
        // 这里动态分配：剩余行数的前 2/3 给描红，后 1/3 留白
        const traceRowsNeeded = Math.ceil(remainingRows * (6 / 9));
        const emptyRowsNeeded = remainingRows - traceRowsNeeded;

        // 渲染描红行
        for (let r = 0; r < traceRowsNeeded; r++) {
            const row = document.createElement('div');
            row.className = 'grid-row';
            for (let j = 0; j < colsCount; j++) {
                row.appendChild(createGridCell(char, 'trace', strokes, strokeTotal - 1));
            }
            worksheetBody.appendChild(row);
        }

        // 渲染留白行
        for (let r = 0; r < emptyRowsNeeded; r++) {
            const row = document.createElement('div');
            row.className = 'grid-row';
            for (let j = 0; j < colsCount; j++) {
                row.appendChild(createGridCell('', 'empty'));
            }
            worksheetBody.appendChild(row);
        }
    }

    function createSvgChar(strokes, maxIndex, color) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 1024 1024');
        svg.style.width = '80%';
        svg.style.height = '80%';
        svg.style.position = 'absolute';
        svg.style.top = '10%';
        svg.style.left = '10%';
        svg.style.zIndex = '2';
        
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', 'translate(0, 900) scale(1, -1)');
        
        for (let i = 0; i <= maxIndex; i++) {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', strokes[i]);
            path.setAttribute('fill', color);
            g.appendChild(path);
        }
        svg.appendChild(g);
        return svg;
    }

    function createGridCell(char, type, strokes = [], maxIndex = -1) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        
        if (char && type !== 'empty') {
            if (strokes && strokes.length > 0 && maxIndex >= 0) {
                const color = (type === 'solid') ? '#000' : '#ccc';
                const svg = createSvgChar(strokes, maxIndex, color);
                cell.appendChild(svg);
            } else {
                // 降级使用文本
                const text = document.createElement('div');
                text.className = `grid-text ${type}`;
                text.textContent = char;
                cell.appendChild(text);
            }
        }
        
        return cell;
    }

    async function exportToPDF() {
        const btn = exportPdfBtn;
        const originalText = btn.textContent;
        btn.textContent = '生成中...';
        btn.disabled = true;

        try {
            const element = document.getElementById('worksheetContainer');
            
            // 为了保证清晰度，调整scale
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            });

            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`汉字字帖-${currentChar}.pdf`);
        } catch (error) {
            console.error('导出PDF失败:', error);
            alert('导出PDF失败，请重试');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
});