// DOM 元素
const resultCanvas = document.getElementById('resultCanvas');
const resultGridCanvas = document.getElementById('resultGridCanvas');
const colorList = document.getElementById('colorList');
const saveBtn = document.getElementById('saveBtn');
const downloadBtn = document.getElementById('downloadBtn');
const newArtBtn = document.getElementById('newArtBtn');

// 编辑工具栏元素
const editToolbar = document.getElementById('editToolbar');
const toolEraserBtn = document.getElementById('toolEraserBtn');
const toolPickerBtn = document.getElementById('toolPickerBtn');
const editCurrentColorDiv = document.getElementById('editCurrentColor');
const editColorPaletteDiv = document.getElementById('editColorPalette');
const editZoomInBtn = document.getElementById('editZoomInBtn');
const editZoomOutBtn = document.getElementById('editZoomOutBtn');
const editZoomValue = document.getElementById('editZoomValue');
const editUndoBtn = document.getElementById('editUndoBtn');
const editRedoBtn = document.getElementById('editRedoBtn');

// 结果数据
let resultData = null;

// 编辑模式状态与网格数据（页面始终处于编辑模式）
let isEditMode = true;
let editGridData = null;      // 二维数组：保存每个格子的色号
let editGridSize = 0;         // 网格尺寸（目前与 settings.size 一致，正方形）
let editCurrentTool = 'draw'; // 当前工具：draw / eraser / picker
let editCurrentColorCode = null;
let editCurrentColor = '#FFFFFF';
let editZoomLevel = 1;
let editColorMap = new Map(); // 色号 -> RGB
let editMouseDown = false;
let lastEditCellX = null;
let lastEditCellY = null;
let editUndoStack = [];
let editRedoStack = [];

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadResult();
    initEventListeners();

    // 根据来源动态更新左上角返回文案
    const returnTo = localStorage.getItem('returnTo') || 'create';
    const backLink = document.getElementById('backToCreate');
    if (backLink) {
        const textSpan = backLink.querySelector('span:last-child');
        if (textSpan) {
            textSpan.textContent = returnTo === 'gallery' ? '返回图纸库' : '返回创作';
        }
    }
});

// 初始化事件监听
function initEventListeners() {
    // 顶部「返回」链接：根据来源决定返回到创作页还是图纸库
    const backToCreateLink = document.getElementById('backToCreate');
    if (backToCreateLink) {
        backToCreateLink.addEventListener('click', (e) => {
            e.preventDefault();
            const returnTo = localStorage.getItem('returnTo') || 'create';

            if (returnTo === 'gallery') {
                // 返回图纸库，不恢复创作预览
                localStorage.removeItem('returnTo');
                window.location.href = 'gallery.html';
            } else {
                // 默认返回创作页，并恢复上次预览
                localStorage.setItem('shouldRestoreCreateState', '1');
                localStorage.setItem('returnTo', 'create');
                window.location.href = 'create.html';
            }
        });
    }

    // 保存按钮
    if (saveBtn) {
        saveBtn.addEventListener('click', saveToGallery);
    }

    // 下载按钮
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadResult);
    }

    // 创作新图纸按钮
    if (newArtBtn) {
        newArtBtn.addEventListener('click', () => {
            window.location.href = 'create.html';
        });
    }
}

// 加载结果
function loadResult() {
    // 从 localStorage 获取结果数据
    const savedData = localStorage.getItem('tempPixelArtResult');
    
    if (!savedData) {
        // 如果没有数据，显示提示并返回
        document.querySelector('.result-section').innerHTML = `
            <div class="empty-message">
                <p>没有找到生成结果</p>
                <a href="create.html" class="btn-primary">返回创作</a>
            </div>
        `;
        return;
    }

    try {
        resultData = JSON.parse(savedData);
        displayResult();
    } catch (e) {
        console.error('加载结果失败:', e);
        alert('加载结果失败，请重新生成');
        window.location.href = 'create.html';
    }
}

// 显示结果
function displayResult() {
    if (!resultData) return;

    const { imageData, usedColors, settings } = resultData;
    // 画板网格数量固定（52×52 或 104×104）
    const size = settings.size;
    
    // 创建图片并绘制到画布
    const img = new Image();
    img.onload = () => {
        // 获取容器
        const imageArea = document.querySelector('.result-image-area');
        if (!imageArea) return;
        
        // 等待容器渲染完成
        setTimeout(() => {
            const containerWidth = imageArea.offsetWidth;
            
            // 计算显示尺寸（正方形，保持宽高比）
            const padding = 5; // 容器边距
            const availableWidth = containerWidth - padding * 2;
            
            // 先计算cellSize（基于宽度）
            const cellSize = availableWidth / (size + 2); // 加上外围边框（左右各一个）
            const borderSize = cellSize; // 外围边框的宽度（一个网格的大小）
            const displaySize = cellSize * size; // 内部画板的显示尺寸
            const totalDisplaySize = displaySize + borderSize * 2; // 包含外围边框的总显示尺寸
            
            // 动态设置容器高度，确保能完整显示图纸（包括外围边框）
            const requiredHeight = totalDisplaySize + padding * 2;
            imageArea.style.height = requiredHeight + 'px';
            imageArea.style.paddingTop = '0'; // 取消padding-top，改用固定高度
            
            // 获取实际容器高度
            const containerHeight = imageArea.offsetHeight;
            
            // 居中显示
            const canvasX = (containerWidth - totalDisplaySize) / 2;
            const canvasY = (containerHeight - totalDisplaySize) / 2;
            
            // 设置结果画布尺寸（使用固定的网格尺寸）
            resultCanvas.width = size;
            resultCanvas.height = size;
            const ctx = resultCanvas.getContext('2d');
            // 清空画布
            ctx.clearRect(0, 0, size, size);
            // 绘制完整图片（确保不被裁剪）
            ctx.drawImage(img, 0, 0, size, size);

            // 设置显示位置和大小（正方形，包含外围边框）
            resultCanvas.style.position = 'absolute';
            resultCanvas.style.top = (canvasY + borderSize) + 'px';
            resultCanvas.style.left = (canvasX + borderSize) + 'px';
            resultCanvas.style.width = displaySize + 'px';
            resultCanvas.style.height = displaySize + 'px';
            resultCanvas.style.imageRendering = 'pixelated';

            // 设置网格画布（包含外围边框）
            resultGridCanvas.width = totalDisplaySize;
            resultGridCanvas.height = totalDisplaySize;
            resultGridCanvas.style.position = 'absolute';
            resultGridCanvas.style.top = canvasY + 'px';
            resultGridCanvas.style.left = canvasX + 'px';
            resultGridCanvas.style.width = totalDisplaySize + 'px';
            resultGridCanvas.style.height = totalDisplaySize + 'px';

            // 绘制网格（包含外围边框）
            const gridCtx = resultGridCanvas.getContext('2d');
            // 清空画布
            gridCtx.clearRect(0, 0, totalDisplaySize, totalDisplaySize);
            // 将坐标系偏移到内部画板区域
            gridCtx.save();
            gridCtx.translate(borderSize, borderSize);
            drawGrid(gridCtx, displaySize, size);
            gridCtx.restore();

            // 初始化编辑网格数据和工具栏（基于当前结果图）
            initEditState(size, usedColors, settings);
        }, 100);
    };
    img.src = imageData;

    // 显示颜色列表（使用和下载图片相同的样式）
    displayColorListForPage(usedColors);
}

// 初始化编辑网格数据和工具栏
function initEditState(size, usedColors, settings) {
    // 仅在首次初始化时执行
    if (editGridData && editGridSize === size) return;
    if (!resultData || !resultCanvas) return;

    editGridSize = size;
    editGridData = [];

    const img = new Image();
    img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = size;
        tempCanvas.height = size;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0, size, size);

        const imageDataObj = tempCtx.getImageData(0, 0, size, size);
        const pixels = imageDataObj.data;

        // 构建色号 -> RGB 映射
        editColorMap.clear();
        const palette = getColorPalette(settings.brand || 'mard');
        for (const color of palette) {
            editColorMap.set(color.code, color.rgb);
        }

        // 从像素生成网格色号数据
        for (let y = 0; y < size; y++) {
            const row = [];
            for (let x = 0; x < size; x++) {
                const idx = (y * size + x) * 4;
                const r = pixels[idx];
                const g = pixels[idx + 1];
                const b = pixels[idx + 2];
                const a = pixels[idx + 3];

                if (a === 0) {
                    row.push(null);
                    continue;
                }

                // 使用色板匹配最近色号
                const closestColor = findClosestColor(r, g, b, palette);
                row.push(closestColor.code);
            }
            editGridData.push(row);
        }

        // 初始化工具栏当前颜色和色板
        initEditPalette(usedColors);

        // 页面默认即为编辑状态：启用画布编辑与缩放
        enableCanvasEdit();
        editZoomLevel = 1;
        updateEditZoom();
    };
    img.src = resultData.imageData;
}

// 初始化编辑色板
function initEditPalette(usedColors) {
    if (!editColorPaletteDiv || !editCurrentColorDiv) return;

    editColorPaletteDiv.innerHTML = '';

    // 白色（用于清除）
    const whiteItem = document.createElement('div');
    whiteItem.className = 'color-item';
    whiteItem.style.backgroundColor = '#FFFFFF';
    whiteItem.title = '白色（清除）';
    whiteItem.addEventListener('click', () => {
        editCurrentColorCode = null;
        editCurrentColor = '#FFFFFF';
        updateEditCurrentColor();
        updateEditPaletteSelection();
        // 选择白色等同于使用橡皮擦
        setEditTool('eraser');
    });
    editColorPaletteDiv.appendChild(whiteItem);

    // 使用结果中的颜色列表；如果没有（例如旧图纸库数据），则从当前网格数据自动提取
    let paletteColors = (usedColors || []).slice();

    if ((!paletteColors || paletteColors.length === 0) && editGridData && editColorMap && editColorMap.size > 0) {
        const codeSet = new Set();
        const autoColors = [];

        for (let y = 0; y < editGridData.length; y++) {
            for (let x = 0; x < editGridData[y].length; x++) {
                const code = editGridData[y][x];
                if (!code || codeSet.has(code)) continue;
                const rgb = editColorMap.get(code);
                if (!rgb) continue;
                codeSet.add(code);
                autoColors.push({ code, rgb, count: 0 });
            }
        }

        paletteColors = autoColors;
    }

    paletteColors.sort((a, b) => a.code.localeCompare(b.code));

    paletteColors.forEach(colorData => {
        const item = document.createElement('div');
        item.className = 'color-item';
        const [r, g, b] = colorData.rgb;
        const hex = rgbToHex(r, g, b);
        item.style.backgroundColor = hex;
        item.title = colorData.code;
        item.dataset.code = colorData.code;

        item.addEventListener('click', () => {
            editCurrentTool = 'draw';
            editCurrentColorCode = colorData.code;
            editCurrentColor = hex;
            updateEditCurrentColor();
            updateEditPaletteSelection();
        });

        editColorPaletteDiv.appendChild(item);
    });

    // 设置默认当前颜色
    if (paletteColors.length > 0) {
        const first = paletteColors[0];
        editCurrentColorCode = first.code;
        editCurrentColor = rgbToHex(first.rgb[0], first.rgb[1], first.rgb[2]);
    } else {
        editCurrentColorCode = null;
        editCurrentColor = '#FFFFFF';
    }
    updateEditCurrentColor();
    updateEditPaletteSelection();
}

function updateEditCurrentColor() {
    if (editCurrentColorDiv) {
        editCurrentColorDiv.style.backgroundColor = editCurrentColor;
    }
}

function updateEditPaletteSelection() {
    if (!editColorPaletteDiv) return;
    const items = editColorPaletteDiv.querySelectorAll('.color-item');
    items.forEach(item => {
        item.classList.remove('selected');
        const code = item.dataset.code || null;
        if (code && code === editCurrentColorCode) {
            item.classList.add('selected');
        }
    });
}

// 启用画布编辑（绑定事件和工具按钮）
function enableCanvasEdit() {
    if (!resultCanvas || !editGridData) return;

    // 工具按钮
    if (toolEraserBtn) {
        toolEraserBtn.onclick = () => {
            setEditTool('eraser');
        };
    }
    if (toolPickerBtn) {
        toolPickerBtn.onclick = () => {
            setEditTool('picker');
        };
    }

    // 缩放按钮
    if (editZoomInBtn) {
        editZoomInBtn.onclick = () => {
            editZoomLevel = Math.min(editZoomLevel + 0.1, 3);
            updateEditZoom();
        };
    }
    if (editZoomOutBtn) {
        editZoomOutBtn.onclick = () => {
            editZoomLevel = Math.max(editZoomLevel - 0.1, 0.5);
            updateEditZoom();
        };
    }

    // 撤销 / 重做
    if (editUndoBtn) {
        editUndoBtn.onclick = () => {
            undoEdit();
        };
    }
    if (editRedoBtn) {
        editRedoBtn.onclick = () => {
            redoEdit();
        };
    }

    // 画布事件
    resultCanvas.addEventListener('mousedown', handleEditMouseDown);
    resultCanvas.addEventListener('mousemove', handleEditMouseMove);
    resultCanvas.addEventListener('mouseup', handleEditMouseUp);
    resultCanvas.addEventListener('mouseleave', handleEditMouseUp);
}

// 禁用画布编辑
function disableCanvasEdit() {
    if (!resultCanvas) return;
    resultCanvas.removeEventListener('mousedown', handleEditMouseDown);
    resultCanvas.removeEventListener('mousemove', handleEditMouseMove);
    resultCanvas.removeEventListener('mouseup', handleEditMouseUp);
    resultCanvas.removeEventListener('mouseleave', handleEditMouseUp);
}

// 撤销上一步编辑
function undoEdit() {
    if (!editUndoStack.length || !editGridData) return;
    const currentSnapshot = editGridData.map(row => row.slice());
    const prev = editUndoStack.pop();
    editRedoStack.push(currentSnapshot);
    editGridData = prev.map(row => row.slice());
    paintEditCell();
}

// 重做上一步撤销
function redoEdit() {
    if (!editRedoStack.length || !editGridData) return;
    const currentSnapshot = editGridData.map(row => row.slice());
    const next = editRedoStack.pop();
    editUndoStack.push(currentSnapshot);
    editGridData = next.map(row => row.slice());
    paintEditCell();
}

function setEditTool(tool) {
    editCurrentTool = tool;

    // 更新按钮样式
    if (toolEraserBtn) toolEraserBtn.classList.remove('active');
    if (toolPickerBtn) toolPickerBtn.classList.remove('active');

    if (tool === 'eraser' && toolEraserBtn) {
        toolEraserBtn.classList.add('active');
    } else if (tool === 'picker' && toolPickerBtn) {
        toolPickerBtn.classList.add('active');
    }
}

// 更新编辑模式缩放显示
function updateEditZoom() {
    if (!resultCanvas || !resultGridCanvas) return;

    resultCanvas.style.transformOrigin = 'center center';
    resultGridCanvas.style.transformOrigin = 'center center';
    resultCanvas.style.transform = `scale(${editZoomLevel})`;
    resultGridCanvas.style.transform = `scale(${editZoomLevel})`;

    if (editZoomValue) {
        editZoomValue.textContent = Math.round(editZoomLevel * 100) + '%';
    }
}

// 画布编辑事件处理
function handleEditMouseDown(e) {
    if (!isEditMode) return;
    if (!editGridData) return;

    // 新的一次编辑开始：将当前网格数据推入撤销栈，清空重做栈
    if (editGridData && editGridData.length > 0) {
        const snapshot = editGridData.map(row => row.slice());
        editUndoStack.push(snapshot);
        // 控制撤销栈长度，避免无限增长（这里保留最近50步）
        if (editUndoStack.length > 50) {
            editUndoStack.shift();
        }
        editRedoStack = [];
    }

    editMouseDown = true;
    // 每次新的拖动开始时，重置上一次记录的格子，避免错误跳过
    lastEditCellX = null;
    lastEditCellY = null;
    applyEditAtEvent(e);
}

function handleEditMouseMove(e) {
    if (!isEditMode || !editMouseDown) return;
    // 橡皮擦和绘制模式都支持拖动连续处理
    if (editCurrentTool === 'draw' || editCurrentTool === 'eraser') {
        applyEditAtEvent(e);
    }
}

function handleEditMouseUp() {
    editMouseDown = false;
}

// 在当前事件位置应用编辑操作
function applyEditAtEvent(e) {
    if (!resultCanvas || !editGridData) return;

    const rect = resultCanvas.getBoundingClientRect();
    const scaleX = resultCanvas.width / rect.width;
    const scaleY = resultCanvas.height / rect.height;

    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const x = Math.floor(canvasX);
    const y = Math.floor(canvasY);

    // 超出画板范围则不处理
    if (x < 0 || x >= editGridSize || y < 0 || y >= editGridSize) return;

    // 同一拖动过程中，如果还是同一个格子，则不重复处理
    if (lastEditCellX === x && lastEditCellY === y && editMouseDown) {
        return;
    }

    if (editCurrentTool === 'eraser') {
        // 橡皮擦：清除颜色（设为白色）
        editGridData[y][x] = null;
        paintEditCell();
    } else if (editCurrentTool === 'picker') {
        // 取色器：从当前格子读取色号
        const code = editGridData[y][x];
        if (code && editColorMap.has(code)) {
            editCurrentColorCode = code;
            const rgb = editColorMap.get(code);
            editCurrentColor = rgbToHex(rgb[0], rgb[1], rgb[2]);
            updateEditCurrentColor();
            updateEditPaletteSelection();
            // 切回绘制模式
            setEditTool('draw');
        }
    } else {
        // 绘制模式：填充当前颜色
        // 如果当前颜色代码为空，等同于清除（绘制白色）
        if (!editCurrentColorCode) {
            editGridData[y][x] = null;
            paintEditCell();
        } else {
            editGridData[y][x] = editCurrentColorCode;
            paintEditCell();
        }
    }

    // 记录本次处理的格子，用于避免重复处理
    lastEditCellX = x;
    lastEditCellY = y;
}

// 根据当前网格数据整体重绘结果画布
function paintEditCell() {
    const ctx = resultCanvas.getContext('2d');
    if (!ctx || !editGridData || !editGridSize) return;

    const size = editGridSize;
    const imageData = ctx.createImageData(size, size);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            let r = 255, g = 255, b = 255, a = 255;
            const code = editGridData[y][x];

            if (code && editColorMap.has(code)) {
                const rgb = editColorMap.get(code);
                r = rgb[0];
                g = rgb[1];
                b = rgb[2];
            }

            imageData.data[idx] = r;
            imageData.data[idx + 1] = g;
            imageData.data[idx + 2] = b;
            imageData.data[idx + 3] = a;
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

// 工具函数：RGB 转 Hex
function rgbToHex(r, g, b) {
    const toHex = (v) => {
        const h = v.toString(16);
        return h.length === 1 ? '0' + h : h;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// 绘制网格（包含外围参考边框）
function drawGrid(ctx, canvasSize, gridSize) {
    const cellSize = canvasSize / gridSize;
    
    // 绘制外围参考边框（淡蓝色）
    ctx.fillStyle = '#87CEEB'; // 淡蓝色
    ctx.strokeStyle = '#87CEEB';
    ctx.lineWidth = 1;
    
    // 绘制顶部外围边框
    ctx.fillRect(0, -cellSize, canvasSize, cellSize);
    // 绘制底部外围边框
    ctx.fillRect(0, canvasSize, canvasSize, cellSize);
    // 绘制左侧外围边框
    ctx.fillRect(-cellSize, 0, cellSize, canvasSize);
    // 绘制右侧外围边框
    ctx.fillRect(canvasSize, 0, cellSize, canvasSize);
    
    // 绘制内部网格线（灰色）
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= gridSize; i++) {
        const pos = i * cellSize;
        // 垂直线
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, canvasSize);
        ctx.stroke();
        
        // 水平线
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(canvasSize, pos);
        ctx.stroke();
    }
    
    // 绘制编号
    ctx.fillStyle = '#333';
    // 根据网格数量动态调整字号，避免重叠
    // 104×104时使用更小的字号比例，52×52时使用正常比例
    let fontSize;
    if (gridSize === 104) {
        // 104×104画板：使用更小的字号，确保不重叠
        // 根据cellSize动态计算，但限制最大字号为8px，最小为4px
        fontSize = Math.max(4, Math.min(8, Math.floor(cellSize * 0.25)));
    } else {
        // 52×52画板：使用正常字号
        fontSize = Math.max(6, Math.min(10, Math.floor(cellSize * 0.3)));
    }
    
    // 统一字体：正常粗细，Arial字体
    ctx.font = `${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // 优化文字渲染，提高清晰度
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    for (let i = 0; i < gridSize; i++) {
        const num = i + 1;
        const numStr = String(num);
        const pos = i * cellSize + cellSize / 2;
        
        // 横向编号（顶部外围边框）- 正着显示
        ctx.fillText(numStr, pos, -cellSize / 2);
        
        // 横向编号（底部外围边框）- 正着显示
        ctx.fillText(numStr, pos, canvasSize + cellSize / 2);
        
        // 纵向编号（左侧外围边框）- 正着显示，不旋转
        ctx.fillText(numStr, -cellSize / 2, pos);
        
        // 纵向编号（右侧外围边框）- 正着显示，不旋转
        ctx.fillText(numStr, canvasSize + cellSize / 2, pos);
    }
}


// 显示颜色列表（页面显示用，与下载图片布局一致）
function displayColorListForPage(colors) {
    colorList.innerHTML = '';
    
    if (!colors || colors.length === 0) {
        colorList.innerHTML = '<p class="color-list-empty">暂无颜色</p>';
        return;
    }
    
    // 按色号排序
    const sortedColors = [...colors].sort((a, b) => {
        return a.code.localeCompare(b.code);
    });
    
    // 使用与下载图片相同的布局
    sortedColors.forEach(colorData => {
        const colorItem = document.createElement('div');
        colorItem.className = 'result-color-item';
        
        const colorBox = document.createElement('div');
        colorBox.className = 'result-color-box';
        const [r, g, b] = colorData.rgb;
        colorBox.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
        
        const colorCode = document.createElement('span');
        colorCode.className = 'result-color-code';
        // 显示格式：B10（120）
        const count = (colorData.count !== undefined && colorData.count !== null) ? colorData.count : 0;
        colorCode.textContent = `${colorData.code}（${count}）`;
        
        colorItem.appendChild(colorBox);
        colorItem.appendChild(colorCode);
        colorList.appendChild(colorItem);
    });
}

// 保存到图纸库
function saveToGallery() {
    if (!resultData) return;

    const canvas = resultCanvas;
    // 使用当前画布内容，包含所有编辑后的修改
    const dataURL = canvas.toDataURL('image/png');

    // 从当前网格数据重新统计使用的颜色，确保与编辑后的结果一致
    let usedColorsForSave = [];
    if (editGridData && editColorMap && editColorMap.size > 0) {
        const colorCountMap = new Map(); // code -> count

        for (let y = 0; y < editGridSize; y++) {
            for (let x = 0; x < editGridSize; x++) {
                const code = editGridData[y][x];
                if (!code) continue;
                const prev = colorCountMap.get(code) || 0;
                colorCountMap.set(code, prev + 1);
            }
        }

        // 生成 usedColors 数组（包含 code、rgb、count）
        colorCountMap.forEach((count, code) => {
            const rgb = editColorMap.get(code);
            if (rgb) {
                usedColorsForSave.push({ code, rgb, count });
            }
        });

        // 按色号排序
        usedColorsForSave.sort((a, b) => a.code.localeCompare(b.code));
    } else {
        // 如果没有编辑网格数据，就退回到原始的 usedColors（兼容旧数据）
        usedColorsForSave = resultData.usedColors || [];
    }

    // 保存用于再次编辑的完整结果数据
    const storedResult = {
        imageData: dataURL,             // 使用当前编辑后的图像
        usedColors: usedColorsForSave,  // 重新统计后的颜色与数量
        settings: resultData.settings   // 原有生成参数
    };
    
    // 获取已保存的图纸
    let gallery = JSON.parse(localStorage.getItem('pixelArtGallery') || '[]');
    
    // 添加新图纸（同时保存可编辑的数据）
    const newArt = {
        id: Date.now().toString(),
        dataURL: dataURL,
        settings: resultData.settings,
        result: storedResult,
        createdAt: new Date().toISOString()
    };
    
    gallery.push(newArt);
    localStorage.setItem('pixelArtGallery', JSON.stringify(gallery));
    
    // 清除临时数据
    localStorage.removeItem('tempPixelArtResult');
    
    alert('已保存到图纸库！');
    window.location.href = 'gallery.html';
}

// 下载结果
function downloadResult() {
    if (!resultData) return;

    // 使用高分辨率画布（2倍像素密度，提高清晰度）
    const scale = 2; // 2倍分辨率
    const phoneWidth = 750 * scale;  // 手机宽度（像素）
    const phoneHeight = 1334 * scale; // 手机高度（像素）
    
    const downloadCanvas = document.createElement('canvas');
    downloadCanvas.width = phoneWidth;
    downloadCanvas.height = phoneHeight;
    const downloadCtx = downloadCanvas.getContext('2d');
    
    // 开启图像平滑（用于高质量缩放）
    downloadCtx.imageSmoothingEnabled = true;
    downloadCtx.imageSmoothingQuality = 'high';
    
    // 背景色
    downloadCtx.fillStyle = '#ffffff';
    downloadCtx.fillRect(0, 0, phoneWidth, phoneHeight);
    
    // 计算各部分区域（调整比例，确保颜色列表有足够空间）
    const resultHeight = Math.floor(phoneHeight * 0.65);  // 生成结果占65%
    const colorListHeight = phoneHeight - resultHeight;   // 颜色列表占35%
    
    // 绘制生成结果（带网格）
    const resultImg = new Image();
    resultImg.onload = () => {
        const resultSize = resultData.settings.size;
        const padding = 80 * scale; // 边距也按比例放大
        const resultDisplaySize = resultHeight - padding; // 留出上下边距
        
        // 计算绘制位置（居中）
        const resultX = (phoneWidth - resultDisplaySize) / 2;
        const resultY = 40 * scale;
        
        // 绘制生成结果图片（放大到合适大小，使用高质量缩放）
        downloadCtx.imageSmoothingEnabled = false; // 像素图不使用平滑
        downloadCtx.drawImage(resultImg, resultX, resultY, resultDisplaySize, resultDisplaySize);
        downloadCtx.imageSmoothingEnabled = true; // 恢复平滑用于文字
        
        // 绘制网格（使用细线）
        downloadCtx.strokeStyle = '#ccc';
        downloadCtx.lineWidth = 1 * scale; // 线宽按比例放大
        const cellSize = resultDisplaySize / resultSize;
        
        for (let i = 0; i <= resultSize; i++) {
            const pos = resultX + i * cellSize;
            // 垂直线
            downloadCtx.beginPath();
            downloadCtx.moveTo(Math.round(pos), resultY);
            downloadCtx.lineTo(Math.round(pos), resultY + resultDisplaySize);
            downloadCtx.stroke();
            
            // 水平线
            downloadCtx.beginPath();
            downloadCtx.moveTo(resultX, Math.round(resultY + i * cellSize));
            downloadCtx.lineTo(resultX + resultDisplaySize, Math.round(resultY + i * cellSize));
            downloadCtx.stroke();
        }
        
        // 绘制编号
        downloadCtx.fillStyle = '#333';
        const fontSize = Math.max(12 * scale, Math.min(24 * scale, Math.floor(cellSize * 0.25 * scale)));
        downloadCtx.font = `bold ${fontSize}px Arial, sans-serif`;
        downloadCtx.textAlign = 'center';
        downloadCtx.textBaseline = 'middle';
        const offset = cellSize * 0.15;
        
        for (let i = 0; i < resultSize; i++) {
            // 行编号（左侧，从1开始）
            const y = resultY + i * cellSize + cellSize / 2;
            downloadCtx.fillText(String(i + 1), resultX + offset, y);
            
            // 列编号（顶部，从1开始）
            const x = resultX + i * cellSize + cellSize / 2;
            downloadCtx.fillText(String(i + 1), x, resultY + offset);
        }
        
        // 绘制颜色列表
        drawColorListOnCanvas(downloadCtx, 0, resultHeight, phoneWidth, colorListHeight, scale);
        
        // 下载（使用 setTimeout 确保所有绘制完成）
        setTimeout(() => {
            const dataURL = downloadCanvas.toDataURL('image/png', 1.0); // 最高质量
            const a = document.createElement('a');
            a.href = dataURL;
            a.download = `pixel-art-${resultData.settings.size}x${resultData.settings.size}-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }, 100);
    };
    // 使用当前画布内容，确保包含所有手动编辑后的结果
    resultImg.src = resultCanvas.toDataURL('image/png');
}

// 在画布上绘制颜色列表
function drawColorListOnCanvas(ctx, x, y, width, height, scale = 1) {
    if (!resultData || !resultData.usedColors) return;
    
    const colors = [...resultData.usedColors].sort((a, b) => a.code.localeCompare(b.code));
    
    // 标题（按比例放大）
    ctx.fillStyle = '#333';
    ctx.font = `bold ${36 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const titleY = y + 40 * scale;
    ctx.fillText('使用颜色', x + width / 2, titleY);
    
    // 颜色项布局参数（按比例放大，确保清晰可见）
    const padding = 50 * scale;
    const colorBoxSize = 70 * scale;  // 颜色方块尺寸（增大确保清晰）
    const textSize = 28 * scale;       // 文字大小
    const colorItemWidth = 200 * scale; // 每个颜色项的宽度（包括颜色方块和文字）
    const colorItemHeight = 85 * scale; // 每个颜色项的高度
    const itemSpacingX = 25 * scale;    // 横向间距
    const itemSpacingY = 18 * scale;    // 纵向间距
    
    // 计算每行可以放置多少个颜色项
    const itemsPerRow = Math.max(1, Math.floor((width - padding * 2 + itemSpacingX) / (colorItemWidth + itemSpacingX)));
    
    // 计算需要的行数
    const totalRows = Math.ceil(colors.length / itemsPerRow);
    const titleHeight = 100 * scale; // 标题区域高度
    const availableHeight = height - titleHeight; // 可用高度
    
    // 计算实际行高（如果内容太多，压缩行高）
    let actualItemHeight = colorItemHeight;
    const neededHeight = totalRows * colorItemHeight + (totalRows - 1) * itemSpacingY;
    if (neededHeight > availableHeight) {
        // 压缩行高和间距
        actualItemHeight = Math.floor((availableHeight - (totalRows - 1) * itemSpacingY) / totalRows);
    }
    
    // 计算起始位置（居中）
    const contentWidth = itemsPerRow * colorItemWidth + (itemsPerRow - 1) * itemSpacingX;
    const startX = padding + (width - padding * 2 - contentWidth) / 2;
    const startY = titleY + 60 * scale + (availableHeight - (totalRows * actualItemHeight + (totalRows - 1) * itemSpacingY)) / 2;
    
    let currentRow = 0;
    let currentCol = 0;
    
    colors.forEach((colorData) => {
        const itemX = startX + currentCol * (colorItemWidth + itemSpacingX);
        const itemY = startY + currentRow * (actualItemHeight + itemSpacingY);
        
        // 绘制颜色方块（带边框的长方形）
        const [r, g, b] = colorData.rgb;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(itemX, itemY, colorBoxSize, colorBoxSize);
        
        // 绘制边框（确保清晰可见）
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2 * scale;
        ctx.strokeRect(itemX, itemY, colorBoxSize, colorBoxSize);
        
        // 绘制色号（确保清晰）
        ctx.fillStyle = '#333';
        ctx.font = `bold ${textSize}px "Courier New", monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const textX = itemX + colorBoxSize + 20 * scale;
        const textY = itemY + colorBoxSize / 2;
        // 显示格式：B10（120）
        const count = (colorData.count !== undefined && colorData.count !== null) ? colorData.count : 0;
        ctx.fillText(`${colorData.code}（${count}）`, textX, textY);
        
        currentCol++;
        if (currentCol >= itemsPerRow) {
            currentCol = 0;
            currentRow++;
        }
    });
}

// 打开编辑页面
function openEditPage() {
    console.log('openEditPage 被调用');
    console.log('resultData:', resultData);
    
    if (!resultData) {
        alert('没有可编辑的数据');
        return;
    }
    
    try {
        const { imageData, usedColors, settings } = resultData;
        console.log('settings:', settings);
        
        const size = settings.size || settings.width || 52;
        const width = settings.width || size;
        const height = settings.height || size;
        
        console.log('尺寸:', width, 'x', height);
        
        // 从图片生成网格数据
        const img = new Image();
        img.onload = () => {
            console.log('图片加载完成，开始生成网格数据');
            try {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = width;
                tempCanvas.height = height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(img, 0, 0, width, height);
                
                const imageDataObj = tempCtx.getImageData(0, 0, width, height);
                const pixels = imageDataObj.data;
                
                const gridData = [];
                const palette = getColorPalette(settings.brand || 'mard');
                
                for (let y = 0; y < height; y++) {
                    gridData[y] = [];
                    for (let x = 0; x < width; x++) {
                        const idx = (y * width + x) * 4;
                        const r = pixels[idx];
                        const g = pixels[idx + 1];
                        const b = pixels[idx + 2];
                        
                        // 找到最接近的颜色
                        const closestColor = findClosestColor(r, g, b, palette);
                        gridData[y][x] = closestColor.code;
                    }
                }
                
                console.log('网格数据生成完成，行数:', gridData.length);
                
                // 保存编辑数据
                const editData = {
                    imageData: imageData,
                    gridData: gridData,
                    width: width,
                    height: height,
                    size: size,
                    usedColors: usedColors,
                    settings: settings
                };
                
                localStorage.setItem('editPixelArtData', JSON.stringify(editData));
                console.log('编辑数据已保存到 localStorage');
                
                // 数据准备好后跳转
                window.location.href = 'edit.html';
            } catch (e) {
                console.error('生成网格数据时出错:', e);
                alert('生成网格数据失败: ' + e.message);
            }
        };
        img.onerror = (e) => {
            console.error('图片加载失败:', e);
            alert('加载图片失败，无法进入编辑模式');
        };
        img.src = imageData;
    } catch (e) {
        console.error('openEditPage 出错:', e);
        alert('打开编辑页面失败: ' + e.message);
    }
}

