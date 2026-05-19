document.addEventListener('DOMContentLoaded', () => {
    const charInput = document.getElementById('charInput');
    const generateBtn = document.getElementById('generateBtn');
    const articleInput = document.getElementById('articleInput');
    const generateArticleBtn = document.getElementById('generateArticleBtn');
    
    const errorMsg = document.getElementById('errorMsg');
    const animationSection = document.getElementById('animationSection');
    const animateBtn = document.getElementById('animateBtn');
    const exportControls = document.getElementById('exportControls');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const worksheetWrapper = document.getElementById('worksheetWrapper');
    const animPinyin = document.getElementById('animPinyin');
    const playAudioBtn = document.getElementById('playAudioBtn');
    
    const singleInputGroup = document.getElementById('singleInputGroup');
    const articleInputGroup = document.getElementById('articleInputGroup');
    const modeRadios = document.querySelectorAll('input[name="mode"]');

    let writer = null;
    let currentChar = '';
    let currentMode = 'single';
    let currentArticleText = '';

    // 汉字校验正则
    const isChineseChar = (str) => /^[\u4e00-\u9fa5]$/.test(str);

    // 模式切换
    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentMode = e.target.value;
            if (currentMode === 'single') {
                singleInputGroup.style.display = 'flex';
                articleInputGroup.style.display = 'none';
            } else {
                singleInputGroup.style.display = 'none';
                articleInputGroup.style.display = 'flex';
            }
            // 隐藏旧的生成结果
            animationSection.style.display = 'none';
            worksheetWrapper.style.display = 'none';
            exportControls.style.display = 'none';
            clearError();
        });
    });

    generateBtn.addEventListener('click', handleGenerateSingle);
    generateArticleBtn.addEventListener('click', handleGenerateArticle);
    
    animateBtn.addEventListener('click', () => {
        if (writer) {
            writer.animateCharacter();
        }
    });
    
    exportPdfBtn.addEventListener('click', exportToPDF);

    charInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleGenerateSingle();
        }
    });

    async function handleGenerateSingle() {
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
        worksheetWrapper.style.display = 'block';
        exportControls.style.display = 'block';

        renderAnimation(currentChar);
        await renderWorksheet(currentChar);
    }

    async function handleGenerateArticle() {
        // 过滤非中文字符，可以保留常见标点，但为了铺满田字格全描红，可以保留全部或者只保留中文
        // 需求：输入整篇文章也就是输入N多字，将这N多字以文章的开工铺满一张田字格
        // 我们保留所有中文，非中文字符将被视为空白格跳过，或者直接用文本渲染
        let val = articleInput.value.trim();
        if (!val) {
            showError('请输入文章内容');
            return;
        }
        clearError();
        currentArticleText = val;
        
        // 文章模式不显示动画
        animationSection.style.display = 'none';
        worksheetWrapper.style.display = 'block';
        exportControls.style.display = 'block';

        await renderArticleWorksheet(currentArticleText);
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
        
        // 渲染拼音
        const pinyinStr = window.pinyinPro ? window.pinyinPro.pinyin(char) : '';
        animPinyin.textContent = pinyinStr;
        
        // 发音功能
        playAudioBtn.onclick = () => {
            if ('speechSynthesis' in window) {
                const msg = new SpeechSynthesisUtterance(char);
                msg.lang = 'zh-CN';
                window.speechSynthesis.speak(msg);
            } else {
                alert('您的浏览器不支持语音播报');
            }
        };

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
            // console.error('获取汉字数据失败', e);
        }
        return null;
    }

    function buildPageElement(pageIndex, totalPages) {
        const container = document.createElement('div');
        container.className = 'worksheet-container';
        
        const header = document.createElement('div');
        header.className = 'worksheet-header';
        header.innerHTML = `<span>姓名：__________</span><span>班级：__________</span><span>日期：__________</span>`;
        container.appendChild(header);

        const body = document.createElement('div');
        body.className = 'worksheet-body';
        container.appendChild(body);

        const footer = document.createElement('div');
        footer.className = 'worksheet-footer';
        footer.innerHTML = `<span>第 ${pageIndex + 1} 页 / 共 ${totalPages} 页</span>`;
        container.appendChild(footer);

        return { container, body };
    }

    async function renderWorksheet(char) {
        worksheetWrapper.innerHTML = '';
        
        const { container, body } = buildPageElement(0, 1);
        worksheetWrapper.appendChild(container);

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
        
        container.insertBefore(demoArea, body);

        // 2. 描红区排版
        const rowsCount = 12;
        const colsCount = 12; // 180mm / 15mm = 12格

        // 计算笔顺拆解需要的总格数（1个实心字 + 所有笔画拆解）
        const breakdownTotalCells = 1 + strokeTotal;
        const breakdownRowsNeeded = Math.ceil(breakdownTotalCells / colsCount);
        const actualBreakdownRows = Math.min(breakdownRowsNeeded, rowsCount);

        let currentStrokeIndex = 0;
        let isSolidCharRendered = false;

        for (let r = 0; r < actualBreakdownRows; r++) {
            const row = document.createElement('div');
            row.className = 'grid-row';
            
            for (let c = 0; c < colsCount; c++) {
                if (!isSolidCharRendered) {
                    row.appendChild(createGridCell(char, 'solid', strokes, strokeTotal - 1));
                    isSolidCharRendered = true;
                } else if (currentStrokeIndex < strokeTotal) {
                    row.appendChild(createGridCell(char, 'stroke-breakdown', strokes, currentStrokeIndex));
                    currentStrokeIndex++;
                } else {
                    row.appendChild(createGridCell('', 'empty'));
                }
            }
            body.appendChild(row);
        }

        const remainingRows = rowsCount - actualBreakdownRows;
        const traceRowsNeeded = Math.ceil(remainingRows * (6 / 9));
        const emptyRowsNeeded = remainingRows - traceRowsNeeded;

        for (let r = 0; r < traceRowsNeeded; r++) {
            const row = document.createElement('div');
            row.className = 'grid-row';
            for (let j = 0; j < colsCount; j++) {
                row.appendChild(createGridCell(char, 'trace', strokes, strokeTotal - 1));
            }
            body.appendChild(row);
        }

        for (let r = 0; r < emptyRowsNeeded; r++) {
            const row = document.createElement('div');
            row.className = 'grid-row';
            for (let j = 0; j < colsCount; j++) {
                row.appendChild(createGridCell('', 'empty'));
            }
            body.appendChild(row);
        }
    }

    async function renderArticleWorksheet(text) {
        worksheetWrapper.innerHTML = '';
        
        // 简单处理排版，保留换行符
        const lines = text.split('\n');
        let formattedChars = [];
        const colsCount = 12;
        const rowsCount = 12;
        const cellsPerPage = colsCount * rowsCount;
        
        for (let line of lines) {
            for (let char of line) {
                formattedChars.push(char);
            }
            // 补齐一行的空白
            const remainder = formattedChars.length % colsCount;
            if (remainder !== 0) {
                const padding = colsCount - remainder;
                for(let i=0; i<padding; i++) {
                    formattedChars.push('');
                }
            }
        }
        
        const totalPages = Math.max(1, Math.ceil(formattedChars.length / cellsPerPage));
        
        for (let p = 0; p < totalPages; p++) {
            const { container, body } = buildPageElement(p, totalPages);
            worksheetWrapper.appendChild(container);
            
            for (let r = 0; r < rowsCount; r++) {
                const row = document.createElement('div');
                row.className = 'grid-row';
                for (let c = 0; c < colsCount; c++) {
                    const idx = p * cellsPerPage + r * colsCount + c;
                    const char = formattedChars[idx];
                    
                    if (char && isChineseChar(char)) {
                        row.appendChild(createGridCell(char, 'trace'));
                    } else if (char && !isChineseChar(char)) {
                        // 标点符号等非中文字符，直接用文本显示
                        row.appendChild(createGridCell(char, 'solid'));
                    } else {
                        row.appendChild(createGridCell('', 'empty'));
                    }
                }
                body.appendChild(row);
            }
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
                // 降级使用文本（文章模式描红使用该方式，性能更好）
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
            const pages = document.querySelectorAll('.worksheet-container');
            if (!pages.length) return;
            
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            for (let i = 0; i < pages.length; i++) {
                if (i > 0) {
                    pdf.addPage();
                }
                
                const element = pages[i];
                const canvas = await html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    windowWidth: element.scrollWidth,
                    windowHeight: element.scrollHeight
                });

                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            }
            
            const fileName = currentMode === 'single' ? `汉字字帖-${currentChar}.pdf` : `文章字帖.pdf`;
            pdf.save(fileName);
        } catch (error) {
            console.error('导出PDF失败:', error);
            alert('导出PDF失败，请重试');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
});