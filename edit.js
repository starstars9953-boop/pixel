// 编辑页面状态
let gridData = null; // 网格数据：二维数组，存储每个格子的颜色代码
let gridWidth = 0;
let gridHeight = 0;
let cellSize = 20; // 每个格子的显示大小（像素）
let zoomLevel = 1; // 缩放级别
let currentTool = 'draw'; // 当前工具：draw, eraser, picker
let currentColor = '#FFFFFF'; // 当前选择的颜色
let currentColorCode = null; // 当前选择的颜色代码
let colorPalette = []; // 可用颜色列表
let colorMap = new Map(); // 颜色代码到RGB的映射

// DOM 元素
const editCanvas = document.getElementById('editCanvas');
const ctx = editCanvas.getContext('2d');
const eraserBtn = document.getElementById('eraserBtn');
const pickerBtn = document.getElementById('pickerBtn');
const currentColorDiv = document.getElementById('currentColor');
const colorPaletteDiv = document.getElementById('colorPalette');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomValue = document.getElementById('zoomValue');
const downloadBtn = document.getElementById('downloadBtn');
const saveBtn = document.getElementById('saveBtn');
const newArtBtn = document.getElementById('newArtBtn');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadEditData();
    initEventListeners();
});

// 加载编辑数据
function loadEditData() {
    const editData = localStorage.getItem('editPixelArtData');
    if (!editData) {
        alert('没有找到可编辑的数据，将返回结果页面');
        window.location.href = 'result.html';
        return;
    }

    const data = JSON.parse(editData);
    gridWidth = data.width || data.size || 52;
    gridHeight = data.height || data.size || 52;
    gridData = data.gridData || [];
    colorPalette = data.usedColors || [];
    
    // 如果没有网格数据，从图片数据生成
    if (!gridData || gridData.length === 0) {
        if (data.imageData) {
            generateGridDataFromImage(data.imageData, gridWidth, gridHeight);
        } else {
            alert('没有找到可编辑的数据');
            window.location.href = 'result.html';
            return;
        }
    } else {
        // 构建颜色映射
        buildColorMap();
        
        // 设置初始颜色
        if (colorPalette.length > 0) {
            currentColorCode = colorPalette[0].code;
            currentColor = rgbToHex(colorPalette[0].rgb);
            updateCurrentColorDisplay();
        }
        
        // 初始化色板并绘制
        initColorPalette();
        drawGrid();
    }
}

// 从图片生成网格数据
function generateGridDataFromImage(imageDataUrl, width, height) {
    const img = new Image();
    img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0, width, height);
        
        const imageData = tempCtx.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        
        gridData = [];
        const palette = getColorPalette('mard');
        
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
        
        // 构建颜色映射
        buildColorMap();
        
        // 设置初始颜色
        if (colorPalette.length > 0) {
            currentColorCode = colorPalette[0].code;
            currentColor = rgbToHex(colorPalette[0].rgb);
            updateCurrentColorDisplay();
        }
        
        // 初始化色板并绘制
        initColorPalette();
        drawGrid();
    };
    img.src = imageDataUrl;
}

// 构建颜色映射
function buildColorMap() {
    colorMap.clear();
    const palette = getColorPalette('mard');
    
    for (const color of palette) {
        colorMap.set(color.code, color.rgb);
    }
}

// 初始化事件监听
function initEventListeners() {
    // 工具按钮
    eraserBtn.addEventListener('click', () => {
        setTool('eraser');
    });
    
    pickerBtn.addEventListener('click', () => {
        setTool('picker');
    });
    
    // 画布点击事件
    editCanvas.addEventListener('click', handleCanvasClick);
    editCanvas.addEventListener('mousemove', handleCanvasMove);
    
    // 缩放控制
    zoomInBtn.addEventListener('click', () => {
        zoomLevel = Math.min(zoomLevel + 0.1, 3);
        updateZoom();
    });
    
    zoomOutBtn.addEventListener('click', () => {
        zoomLevel = Math.max(zoomLevel - 0.1, 0.5);
        updateZoom();
    });
    
    // 底部按钮
    downloadBtn.addEventListener('click', downloadImage);
    saveBtn.addEventListener('click', saveToGallery);
    newArtBtn.addEventListener('click', () => {
        if (confirm('确定要创作新图纸吗？当前编辑内容将丢失。')) {
            window.location.href = 'create.html';
        }
    });
}

// 设置工具
function setTool(tool) {
    currentTool = tool;
    
    // 更新按钮状态
    eraserBtn.classList.remove('active');
    pickerBtn.classList.remove('active');
    
    if (tool === 'eraser') {
        eraserBtn.classList.add('active');
        editCanvas.style.cursor = 'grab';
    } else if (tool === 'picker') {
        pickerBtn.classList.add('active');
        editCanvas.style.cursor = 'crosshair';
    } else {
        editCanvas.style.cursor = 'crosshair';
    }
}

// 处理画布点击
function handleCanvasClick(e) {
    const rect = editCanvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / (cellSize * zoomLevel));
    const y = Math.floor((e.clientY - rect.top) / (cellSize * zoomLevel));
    
    if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) return;
    
    if (currentTool === 'eraser') {
        // 橡皮擦：清除颜色（设为白色）
        gridData[y][x] = null;
        drawGrid();
    } else if (currentTool === 'picker') {
        // 取色器：获取当前格子的颜色
        const colorCode = gridData[y][x];
        if (colorCode && colorMap.has(colorCode)) {
            currentColorCode = colorCode;
            const rgb = colorMap.get(colorCode);
            currentColor = rgbToHex(rgb);
            updateCurrentColorDisplay();
            setTool('draw');
        }
    } else {
        // 绘制模式：填充颜色
        if (currentColorCode) {
            gridData[y][x] = currentColorCode;
            drawGrid();
        }
    }
}

// 处理画布移动（用于预览）
let isMouseDown = false;
editCanvas.addEventListener('mousedown', (e) => {
    isMouseDown = true;
    handleCanvasClick(e);
});

editCanvas.addEventListener('mousemove', (e) => {
    if (isMouseDown && currentTool === 'draw') {
        handleCanvasClick(e);
    }
});

editCanvas.addEventListener('mouseup', () => {
    isMouseDown = false;
});

editCanvas.addEventListener('mouseleave', () => {
    isMouseDown = false;
});

// 初始化色板
function initColorPalette() {
    colorPaletteDiv.innerHTML = '';
    
    // 添加白色（用于清除）
    const whiteItem = document.createElement('div');
    whiteItem.className = 'color-item';
    whiteItem.style.backgroundColor = '#FFFFFF';
    whiteItem.title = '白色（清除）';
    whiteItem.addEventListener('click', () => {
        currentColorCode = null;
        currentColor = '#FFFFFF';
        updateCurrentColorDisplay();
        setTool('draw');
        updateColorSelection();
    });
    colorPaletteDiv.appendChild(whiteItem);
    
    // 添加可用颜色
    for (const colorData of colorPalette) {
        const colorItem = document.createElement('div');
        colorItem.className = 'color-item';
        const rgb = colorData.rgb || colorMap.get(colorData.code);
        if (rgb) {
            colorItem.style.backgroundColor = rgbToHex(rgb);
            colorItem.title = colorData.code;
            colorItem.addEventListener('click', () => {
                currentColorCode = colorData.code;
                currentColor = rgbToHex(rgb);
                updateCurrentColorDisplay();
                setTool('draw');
                updateColorSelection();
            });
            colorPaletteDiv.appendChild(colorItem);
        }
    }
    
    updateColorSelection();
}

// 更新颜色选择状态
function updateColorSelection() {
    const items = colorPaletteDiv.querySelectorAll('.color-item');
    items.forEach(item => {
        item.classList.remove('selected');
        const rgb = hexToRgb(item.style.backgroundColor);
        if (rgb) {
            const code = findColorCodeByRgb(rgb[0], rgb[1], rgb[2]);
            if (code === currentColorCode) {
                item.classList.add('selected');
            }
        }
    });
}

// 更新当前颜色显示
function updateCurrentColorDisplay() {
    currentColorDiv.style.backgroundColor = currentColor;
}

// 更新缩放
function updateZoom() {
    zoomValue.textContent = Math.round(zoomLevel * 100) + '%';
    drawGrid();
}

// 绘制网格
function drawGrid() {
    const canvasWidth = gridWidth * cellSize * zoomLevel;
    const canvasHeight = gridHeight * cellSize * zoomLevel;
    
    editCanvas.width = canvasWidth;
    editCanvas.height = canvasHeight;
    editCanvas.style.width = canvasWidth + 'px';
    editCanvas.style.height = canvasHeight + 'px';
    
    // 清空画布
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // 绘制每个格子
    const scaledCellSize = cellSize * zoomLevel;
    
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            const colorCode = gridData[y][x];
            let color = '#FFFFFF';
            
            if (colorCode && colorMap.has(colorCode)) {
                const rgb = colorMap.get(colorCode);
                color = rgbToHex(rgb);
            }
            
            ctx.fillStyle = color;
            ctx.fillRect(x * scaledCellSize, y * scaledCellSize, scaledCellSize, scaledCellSize);
            
            // 绘制网格线
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 1;
            ctx.strokeRect(x * scaledCellSize, y * scaledCellSize, scaledCellSize, scaledCellSize);
        }
    }
}

// 下载图片
function downloadImage() {
    // 创建高分辨率画布
    const scale = 4; // 放大4倍以提高清晰度
    const downloadCanvas = document.createElement('canvas');
    downloadCanvas.width = gridWidth * cellSize * scale;
    downloadCanvas.height = gridHeight * cellSize * scale;
    const downloadCtx = downloadCanvas.getContext('2d');
    
    // 绘制每个格子
    const scaledCellSize = cellSize * scale;
    
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            const colorCode = gridData[y][x];
            let color = '#FFFFFF';
            
            if (colorCode && colorMap.has(colorCode)) {
                const rgb = colorMap.get(colorCode);
                color = rgbToHex(rgb);
            }
            
            downloadCtx.fillStyle = color;
            downloadCtx.fillRect(x * scaledCellSize, y * scaledCellSize, scaledCellSize, scaledCellSize);
        }
    }
    
    // 下载
    const link = document.createElement('a');
    link.download = 'pixel-art-edited.png';
    link.href = downloadCanvas.toDataURL('image/png');
    link.click();
}

// 保存到图纸库
function saveToGallery() {
    // 生成图片数据
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = gridWidth * cellSize;
    tempCanvas.height = gridHeight * cellSize;
    const tempCtx = tempCanvas.getContext('2d');
    
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            const colorCode = gridData[y][x];
            let color = '#FFFFFF';
            
            if (colorCode && colorMap.has(colorCode)) {
                const rgb = colorMap.get(colorCode);
                color = rgbToHex(rgb);
            }
            
            tempCtx.fillStyle = color;
            tempCtx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
    }
    
    const imageData = tempCanvas.toDataURL('image/png');
    
    // 统计使用的颜色
    const usedColorsMap = new Map();
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            const colorCode = gridData[y][x];
            if (colorCode) {
                if (usedColorsMap.has(colorCode)) {
                    usedColorsMap.get(colorCode).count++;
                } else {
                    const rgb = colorMap.get(colorCode);
                    usedColorsMap.set(colorCode, {
                        code: colorCode,
                        rgb: rgb,
                        count: 1
                    });
                }
            }
        }
    }
    
    const usedColors = Array.from(usedColorsMap.values()).sort((a, b) => {
        return a.code.localeCompare(b.code);
    });
    
    // 保存到本地存储
    const artData = {
        id: Date.now(),
        imageData: imageData,
        gridData: gridData,
        width: gridWidth,
        height: gridHeight,
        usedColors: usedColors,
        settings: {
            brand: 'mard',
            size: gridWidth === gridHeight ? gridWidth : 'custom',
            width: gridWidth,
            height: gridHeight
        },
        createdAt: new Date().toISOString()
    };
    
    let gallery = JSON.parse(localStorage.getItem('pixelArtGallery') || '[]');
    gallery.push(artData);
    localStorage.setItem('pixelArtGallery', JSON.stringify(gallery));
    
    alert('已保存到图纸库！');
    window.location.href = 'gallery.html';
}

// 工具函数
function rgbToHex(rgb) {
    return '#' + rgb.map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : null;
}

function findColorCodeByRgb(r, g, b) {
    const palette = getColorPalette('mard');
    const closestColor = findClosestColor(r, g, b, palette);
    return closestColor ? closestColor.code : null;
}

