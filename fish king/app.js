// 全局变量
let originalImage = null;
let originalImageDataUrl = null; // 保存原始图片的 dataURL，便于恢复预览状态
let currentSettings = {
    brand: 'mard',
    size: 52,
    customWidth: 52,
    customHeight: 52
};
// 图片位置偏移（用于拖拽调整）
let imageOffsetX = 0;
let imageOffsetY = 0;
// 拖拽状态
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartOffsetX = 0;
let dragStartOffsetY = 0;

// DOM 元素
const imageInput = document.getElementById('imageInput');
const uploadArea = document.getElementById('uploadArea');
const imagePreviewSection = document.getElementById('imagePreviewSection');
const previewCanvas = document.getElementById('previewCanvas');
const gridCanvas = document.getElementById('gridCanvas');
const imageScale = document.getElementById('imageScale');
const scaleValue = document.getElementById('scaleValue');
const generateBtn = document.getElementById('generateBtn');
const reselectImageBtn = document.getElementById('reselectImageBtn');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    updateSettings();
    restoreCreateStateIfAny();
});

// 初始化事件监听
function initEventListeners() {
    // 品牌选择
    document.getElementById('brand').addEventListener('change', (e) => {
        currentSettings.brand = e.target.value;
    });

    // 画板尺寸
    const customSizeInputs = document.getElementById('customSizeInputs');
    const customWidth = document.getElementById('customWidth');
    const customHeight = document.getElementById('customHeight');
    
    document.querySelectorAll('input[name="size"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value === 'custom') {
                // 显示自定义尺寸输入框
                customSizeInputs.style.display = 'block';
                // 使用自定义尺寸
                currentSettings.size = 'custom';
                currentSettings.customWidth = parseInt(customWidth.value) || 52;
                currentSettings.customHeight = parseInt(customHeight.value) || 52;
            } else {
                // 隐藏自定义尺寸输入框
                customSizeInputs.style.display = 'none';
                // 使用预设尺寸
                currentSettings.size = parseInt(value);
            }
            if (originalImage) {
                updatePreview();
            }
        });
    });

    // 自定义尺寸输入框变化
    customWidth.addEventListener('input', (e) => {
        const value = parseInt(e.target.value) || 1;
        currentSettings.customWidth = Math.max(1, Math.min(200, value));
        if (currentSettings.size === 'custom' && originalImage) {
            updatePreview();
        }
    });
    
    customHeight.addEventListener('input', (e) => {
        const value = parseInt(e.target.value) || 1;
        currentSettings.customHeight = Math.max(1, Math.min(200, value));
        if (currentSettings.size === 'custom' && originalImage) {
            updatePreview();
        }
    });

    // 图片上传
    imageInput.addEventListener('change', handleImageUpload);
    
    // 选择图片按钮
    const selectImageBtn = document.getElementById('selectImageBtn');
    selectImageBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止事件冒泡
        imageInput.click();
    });

    // 重新选图按钮（预览出现后显示的小按钮）
    if (reselectImageBtn) {
        reselectImageBtn.addEventListener('click', () => {
            imageInput.click();
        });
    }
    
    // 点击上传区域（除了按钮）也触发文件选择
    uploadArea.addEventListener('click', (e) => {
        // 如果点击的是按钮，不处理（让按钮自己处理）
        if (e.target === selectImageBtn || selectImageBtn.contains(e.target)) {
            return;
        }
        imageInput.click();
    });
    
    // 拖拽上传
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            loadImageFromFile(file);
        }
    });

    // 图片缩放
    imageScale.addEventListener('input', (e) => {
        scaleValue.textContent = Math.round(e.target.value * 100) + '%';
        updatePreview();
    });

    // 图片拖拽功能
    initImageDrag();

    // 窗口大小改变时重新计算预览大小
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (originalImage) {
        updatePreview();
            }
        }, 250); // 防抖，250ms后执行
    });

    // 生成按钮
    generateBtn.addEventListener('click', generatePixelArt);
}

// 更新设置
function updateSettings() {
    currentSettings.brand = document.getElementById('brand').value;
    const sizeRadio = document.querySelector('input[name="size"]:checked');
    const sizeValue = sizeRadio.value;
    if (sizeValue === 'custom') {
        currentSettings.size = 'custom';
        currentSettings.customWidth = parseInt(document.getElementById('customWidth').value) || 52;
        currentSettings.customHeight = parseInt(document.getElementById('customHeight').value) || 52;
    } else {
        currentSettings.size = parseInt(sizeValue);
    }
}

// 获取当前画板的实际尺寸（宽度和高度）
function getCanvasSize() {
    if (currentSettings.size === 'custom') {
        return {
            width: currentSettings.customWidth,
            height: currentSettings.customHeight
        };
    } else {
        // 预设尺寸是正方形
        const size = currentSettings.size;
        return {
            width: size,
            height: size
        };
    }
}

// 处理图片上传
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
        loadImageFromFile(file);
    }
}

// 从文件加载图片
function loadImageFromFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            originalImageDataUrl = e.target.result;
            // 重置图片偏移
            imageOffsetX = 0;
            imageOffsetY = 0;
            imagePreviewSection.style.display = 'block';
            generateBtn.disabled = false;
            // 有预览图后：隐藏大上传框，只保留「重新选图」小按钮
            if (uploadArea) {
                uploadArea.classList.add('hidden');
            }
            if (reselectImageBtn) {
                reselectImageBtn.classList.remove('hidden');
            }
            updatePreview();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// 如果有上一次创作的状态（从生成结果页面返回），恢复到预览页面
function restoreCreateStateIfAny() {
    try {
        // 只有在 result.html 标记了返回时才恢复
        const shouldRestore = localStorage.getItem('shouldRestoreCreateState');
        if (shouldRestore !== '1') return;

        const saved = localStorage.getItem('tempCreateState');
        if (!saved) return;

        const state = JSON.parse(saved);
        if (!state.imageData) return;

        const { settings, imageScale: savedScale, imageOffsetX: savedOffsetX, imageOffsetY: savedOffsetY } = state;

        // 恢复设置（品牌、画板尺寸）
        if (settings) {
            currentSettings = {
                ...currentSettings,
                ...settings
            };

            // 品牌
            const brandSelect = document.getElementById('brand');
            if (brandSelect && settings.brand) {
                brandSelect.value = settings.brand;
            }

            // 画板尺寸（只处理 52 / 104 这两个选项）
            if (settings.size === 52 || settings.size === 104) {
                const sizeRadio = document.querySelector(`input[name="size"][value="${settings.size}"]`);
                if (sizeRadio) {
                    sizeRadio.checked = true;
                }
            }
        }

        // 恢复缩放滑块
        if (typeof savedScale === 'number' && imageScale) {
            imageScale.value = savedScale;
            if (scaleValue) {
                scaleValue.textContent = Math.round(savedScale * 100) + '%';
            }
        }

        // 恢复偏移
        imageOffsetX = typeof savedOffsetX === 'number' ? savedOffsetX : 0;
        imageOffsetY = typeof savedOffsetY === 'number' ? savedOffsetY : 0;

        // 恢复图片并显示预览
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            originalImageDataUrl = state.imageData;
            imagePreviewSection.style.display = 'block';
            generateBtn.disabled = false;

            // 隐藏大上传框，只显示「重新选图」
            if (uploadArea) {
                uploadArea.classList.add('hidden');
            }
            if (reselectImageBtn) {
                reselectImageBtn.classList.remove('hidden');
            }

            updatePreview();
        };
        img.src = state.imageData;

        // 使用一次后清除标记，避免从首页进入也被自动恢复
        localStorage.removeItem('shouldRestoreCreateState');
    } catch (e) {
        console.error('恢复上一次创作状态失败:', e);
    }
}

// 计算图片在画板中的位置和尺寸（共同函数，确保预览和生成使用相同的逻辑）
function calculateImageLayout(image, displaySize, scale, offsetX = 0, offsetY = 0) {
    const imgAspect = image.width / image.height;
    let imgWidth = displaySize * scale;
    let imgHeight = displaySize * scale;

    if (imgAspect > 1) {
        imgHeight = imgWidth / imgAspect;
    } else {
        imgWidth = imgHeight * imgAspect;
    }

    // 居中位置 + 用户拖拽的偏移
    const x = (displaySize - imgWidth) / 2 + offsetX;
    const y = (displaySize - imgHeight) / 2 + offsetY;

    return { x, y, width: imgWidth, height: imgHeight };
}

// 更新预览
function updatePreview() {
    if (!originalImage) return;

    updateSettings();
    const canvasSize = getCanvasSize();
    const gridWidth = canvasSize.width;
    const gridHeight = canvasSize.height;
    const scale = parseFloat(imageScale.value);

    // 获取预览容器和上传区域
    const previewContainer = document.querySelector('.preview-container');
    const uploadArea = document.querySelector('.upload-area');
    if (!previewContainer || !uploadArea) return;
    
    // 获取参考宽度：
    // - 正常情况下使用上传区域的宽度
    // - 如果上传区域被隐藏（offsetWidth 为 0），则使用其父容器的宽度
    const uploadWrapper = uploadArea.parentElement || uploadArea;
    const targetWidth = (uploadWrapper && uploadWrapper.offsetWidth) || uploadArea.offsetWidth;
    if (!targetWidth || targetWidth === 0) {
        // 如果获取不到，等待一下再试
        setTimeout(updatePreview, 100);
        return;
    }
    
    // 计算最大可用尺寸（使用上传区域的宽度，放大一倍）
    const padding = 0; // 不需要额外边距，直接使用上传区域的宽度
    const maxAvailableWidth = (targetWidth - padding) * 2; // 放大一倍
    const maxAvailableHeight = (window.innerHeight - 400) * 2; // 留出页面其他元素的空间，放大一倍
    
    // 计算包含外围边框的总尺寸需求
    // 对于自定义尺寸，需要考虑宽度和高度的比例
    const aspectRatio = gridWidth / gridHeight;
    
    // 计算宽度方向的显示尺寸
    const totalSize = Math.floor(maxAvailableWidth);
    const displaySizeWidth = Math.floor(totalSize / (1 + 2 / gridWidth));
    
    // 计算高度方向的显示尺寸
    const totalSizeByHeight = Math.floor(maxAvailableHeight);
    const displaySizeHeight = Math.floor(totalSizeByHeight / (1 + 2 / gridHeight));
    
    // 根据宽高比调整，确保画板比例正确
    let finalDisplayWidth, finalDisplayHeight;
    if (displaySizeWidth / aspectRatio <= displaySizeHeight) {
        finalDisplayWidth = displaySizeWidth;
        finalDisplayHeight = displaySizeWidth / aspectRatio;
    } else {
        finalDisplayHeight = displaySizeHeight;
        finalDisplayWidth = displaySizeHeight * aspectRatio;
    }
    
    // 确保不超出边界
    finalDisplayWidth = Math.min(finalDisplayWidth, displaySizeWidth);
    finalDisplayHeight = Math.min(finalDisplayHeight, displaySizeHeight);
    
    const cellSizeWidth = finalDisplayWidth / gridWidth; // 每个网格的宽度
    const cellSizeHeight = finalDisplayHeight / gridHeight; // 每个网格的高度
    const borderSizeWidth = cellSizeWidth; // 外围边框的宽度（一个网格的宽度）
    const borderSizeHeight = cellSizeHeight; // 外围边框的高度（一个网格的高度）
    
    const actualTotalWidth = Math.floor(finalDisplayWidth + borderSizeWidth * 2);
    const actualTotalHeight = Math.floor(finalDisplayHeight + borderSizeHeight * 2);
    
    // 保存显示尺寸到全局变量，供生成函数使用
    window.previewDisplaySize = Math.min(finalDisplayWidth, finalDisplayHeight); // 用于兼容性
    window.previewDisplayWidth = finalDisplayWidth;
    window.previewDisplayHeight = finalDisplayHeight;
    
    // 设置画布尺寸（包含外围边框）
    previewCanvas.width = actualTotalWidth;
    previewCanvas.height = actualTotalHeight;
    gridCanvas.width = actualTotalWidth;
    gridCanvas.height = actualTotalHeight;
    
    // 设置画布样式，确保正确显示
    previewCanvas.style.width = actualTotalWidth + 'px';
    previewCanvas.style.height = actualTotalHeight + 'px';
    previewCanvas.style.position = 'absolute';
    previewCanvas.style.top = '0';
    previewCanvas.style.left = '0';
    
    gridCanvas.style.width = actualTotalWidth + 'px';
    gridCanvas.style.height = actualTotalHeight + 'px';
    gridCanvas.style.position = 'absolute';
    gridCanvas.style.top = '0';
    gridCanvas.style.left = '0';
    
    // 更新预览容器的CSS尺寸，使其与画板尺寸一致
    previewContainer.style.width = actualTotalWidth + 'px';
    previewContainer.style.height = actualTotalHeight + 'px';

    const ctx = previewCanvas.getContext('2d');
    const gridCtx = gridCanvas.getContext('2d');

    // 清空画布
    ctx.clearRect(0, 0, actualTotalWidth, actualTotalHeight);
    gridCtx.clearRect(0, 0, actualTotalWidth, actualTotalHeight);

    // 使用共同函数计算图片位置和尺寸（包含用户拖拽的偏移）
    // 对于矩形画板，使用宽度作为参考尺寸
    const imgLayout = calculateImageLayout(originalImage, finalDisplayWidth, scale, imageOffsetX, imageOffsetY);

    // 绘制图片（在内部画板区域，需要加上 borderSize 偏移）
    const x = borderSizeWidth + imgLayout.x;
    const y = borderSizeHeight + imgLayout.y;

    // 绘制图片
    ctx.drawImage(originalImage, x, y, imgLayout.width, imgLayout.height);
    
    // 保存当前布局信息，供生成函数使用
    window.previewImageLayout = {
        displayWidth: finalDisplayWidth,
        displayHeight: finalDisplayHeight,
        gridWidth: gridWidth,
        gridHeight: gridHeight,
        scale: scale,
        offsetX: imageOffsetX,
        offsetY: imageOffsetY,
        borderSizeWidth: borderSizeWidth,
        borderSizeHeight: borderSizeHeight
    };

    // 绘制网格（包含外围边框）
    // 将画布坐标系偏移到内部画板区域
    gridCtx.save();
    gridCtx.translate(borderSizeWidth, borderSizeHeight);
    drawGrid(gridCtx, finalDisplayWidth, finalDisplayHeight, gridWidth, gridHeight);
    gridCtx.restore();
}

// 初始化图片拖拽功能
function initImageDrag() {
    const previewContainer = document.querySelector('.preview-container');
    if (!previewContainer) return;

    // 鼠标事件
    previewContainer.addEventListener('mousedown', handleDragStart);
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);

    // 触摸事件（移动端支持）
    previewContainer.addEventListener('touchstart', handleDragStart, { passive: false });
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);

    // 拖拽开始
    function handleDragStart(e) {
        if (!originalImage) return;
        
        // 检查是否点击在图片区域内
        const rect = previewContainer.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        // 获取画板区域（不包括边框）
        const size = currentSettings.size;
        const scale = parseFloat(imageScale.value);
        const displaySize = window.previewDisplaySize || size * 4;
        const borderSize = displaySize / size;
        
        // 计算图片在屏幕上的实际位置
        const actualTotalSize = rect.width; // 预览容器的实际宽度（包含边框）
        const scaleRatio = actualTotalSize / (displaySize * (1 + 2 / size)); // 屏幕像素与画布像素的比例
        
        const imgLayout = calculateImageLayout(originalImage, displaySize, scale, imageOffsetX, imageOffsetY);
        
        // 将画板坐标转换为屏幕坐标
        const imgStartX = rect.left + (borderSize + imgLayout.x) * scaleRatio;
        const imgEndX = imgStartX + imgLayout.width * scaleRatio;
        const imgStartY = rect.top + (borderSize + imgLayout.y) * scaleRatio;
        const imgEndY = imgStartY + imgLayout.height * scaleRatio;
        
        // 检查点击是否在图片区域内
        if (clientX >= imgStartX && clientX <= imgEndX && 
            clientY >= imgStartY && clientY <= imgEndY) {
            isDragging = true;
            dragStartX = clientX;
            dragStartY = clientY;
            dragStartOffsetX = imageOffsetX;
            dragStartOffsetY = imageOffsetY;
            
            // 防止默认行为
            e.preventDefault();
            previewContainer.style.cursor = 'grabbing';
        }
    }

    // 拖拽移动
    function handleDragMove(e) {
        if (!isDragging || !originalImage) return;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        // 计算移动距离（屏幕像素）
        const deltaX = clientX - dragStartX;
        const deltaY = clientY - dragStartY;
        
        // 将屏幕像素转换为画板坐标
        // 获取预览容器的实际显示尺寸
        const rect = previewContainer.getBoundingClientRect();
        const actualTotalSize = rect.width; // 预览容器的实际宽度（包含边框）
        
        // 获取画板内部显示尺寸
        const displaySize = window.previewDisplaySize || currentSettings.size * 4;
        
        // 计算比例：屏幕像素 -> 画板坐标
        // 屏幕上的 actualTotalSize 像素对应画板上的 displaySize 单位
        const scaleRatio = displaySize / actualTotalSize;
        
        const deltaXInCanvas = deltaX * scaleRatio;
        const deltaYInCanvas = deltaY * scaleRatio;
        
        // 更新图片偏移
        imageOffsetX = dragStartOffsetX + deltaXInCanvas;
        imageOffsetY = dragStartOffsetY + deltaYInCanvas;
        
        // 更新预览
        updatePreview();
        
        // 防止默认行为
        e.preventDefault();
    }

    // 拖拽结束
    function handleDragEnd(e) {
        if (isDragging) {
            isDragging = false;
            const previewContainer = document.querySelector('.preview-container');
            if (previewContainer) {
                previewContainer.style.cursor = 'default';
            }
        }
    }
}

// 绘制网格
function drawGrid(ctx, canvasWidth, canvasHeight, gridWidth, gridHeight) {
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    
    const cellSizeWidth = canvasWidth / gridWidth;
    const cellSizeHeight = canvasHeight / gridHeight;
    
    // 绘制垂直线
    for (let i = 0; i <= gridWidth; i++) {
        const pos = i * cellSizeWidth;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, canvasHeight);
        ctx.stroke();
    }
        
    // 绘制水平线
    for (let i = 0; i <= gridHeight; i++) {
        const pos = i * cellSizeHeight;
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(canvasWidth, pos);
        ctx.stroke();
    }
}

// 生成像素图
function generatePixelArt() {
    if (!originalImage) {
        alert('请先上传图片');
        return;
    }

    // 在生成前，确保预览已更新到最新状态
    // 这样可以确保 window.previewImageLayout 包含最新的布局信息
    updatePreview();

    updateSettings();

    // 生成前，把当前创作状态保存下来，方便从结果页返回时恢复到预览页
    if (originalImageDataUrl) {
        const createState = {
            imageData: originalImageDataUrl,
            settings: { ...currentSettings },
            imageScale: parseFloat(imageScale.value),
            imageOffsetX,
            imageOffsetY
        };
        localStorage.setItem('tempCreateState', JSON.stringify(createState));
        // 标记从创作页进入结果页，返回时回到创作页
        localStorage.setItem('returnTo', 'create');
    }
    
    // 获取当前预览中的图片状态（必须使用当前状态，不能使用初始状态）
    // 1. 缩放比例：从 input 获取当前值
    const scale = parseFloat(imageScale.value);
    
    // 2. 位置偏移：从全局变量获取当前值（这些值在拖拽和缩放时会实时更新）
    const offsetX = imageOffsetX;
    const offsetY = imageOffsetY;

    // 获取色板
    const palette = getColorPalette(currentSettings.brand);
    
    // 检查色板是否为空
    if (palette.length === 0) {
        alert('色号表数据为空，请先使用 extractColors.html 提取色号颜色数据！');
        return;
    }

    // 获取画板尺寸
    const canvasSize = getCanvasSize();
    const gridWidth = canvasSize.width;
    const gridHeight = canvasSize.height;
    
    // 获取预览中的实际显示尺寸和布局信息，确保生成逻辑与预览完全一致
    let displayWidth, displayHeight;
    if (window.previewImageLayout) {
        // 优先使用预览中保存的布局信息
        displayWidth = window.previewImageLayout.displayWidth;
        displayHeight = window.previewImageLayout.displayHeight;
    } else if (window.previewDisplayWidth && window.previewDisplayHeight) {
        // 使用保存的宽度和高度
        displayWidth = window.previewDisplayWidth;
        displayHeight = window.previewDisplayHeight;
    } else if (window.previewDisplaySize) {
        // 兼容旧版本：只有 displaySize（正方形）
        displayWidth = window.previewDisplaySize;
        displayHeight = window.previewDisplaySize;
    } else {
        // 如果预览还没有计算过，使用默认值（基于网格数量）
        const sampleMultiplier = 4;
        displayWidth = gridWidth * sampleMultiplier;
        displayHeight = gridHeight * sampleMultiplier;
    }
    
    // 临时画布尺寸：使用与预览相同的显示尺寸
    // 为了保持精度，我们需要一个足够大的分辨率
    // 使用预览中的 displaySize，但需要放大到足够的分辨率进行采样
    const sampleMultiplier = 4; // 每个网格采样4个像素，保证统计精度
    const tempWidth = Math.max(displayWidth, gridWidth * sampleMultiplier);
    const tempHeight = Math.max(displayHeight, gridHeight * sampleMultiplier);
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = tempWidth;
    tempCanvas.height = tempHeight;
    const tempCtx = tempCanvas.getContext('2d');

    // 先填充背景色（白色）
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempWidth, tempHeight);

    // 使用共同函数计算图片位置和尺寸（与预览完全一致，使用当前的 scale、offsetX、offsetY）
    // 对于矩形画板，使用宽度作为参考尺寸
    const imgLayout = calculateImageLayout(originalImage, displayWidth, scale, offsetX, offsetY);
    
    // 将预览中的尺寸和位置映射到临时画布
    // 预览中的 displayWidth 对应临时画布的 tempWidth
    const scaleRatioX = tempWidth / displayWidth;
    const scaleRatioY = tempHeight / displayHeight;
    const drawX = imgLayout.x * scaleRatioX;
    const drawY = imgLayout.y * scaleRatioY;
    const drawWidth = imgLayout.width * scaleRatioX;
    const drawHeight = imgLayout.height * scaleRatioY;

    // 将图片绘制到临时画布（使用与预览完全相同的尺寸和位置，按比例缩放）
    // 使用高质量缩放
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';
    tempCtx.drawImage(originalImage, drawX, drawY, drawWidth, drawHeight);

    // 获取像素数据（从临时画布）
    const pixelData = tempCtx.getImageData(0, 0, tempWidth, tempHeight);
    const pixels = pixelData.data;

    // 创建结果画布（使用画板尺寸）
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = gridWidth;
    resultCanvas.height = gridHeight;
    const ctx = resultCanvas.getContext('2d');
    
    // 创建结果图像数据（使用画板尺寸）
    const resultImageData = ctx.createImageData(gridWidth, gridHeight);
    const resultPixels = resultImageData.data;

    // 用于收集所有使用的色号和使用次数
    const colorCodeMap = new Map(); // code -> { code, rgb, count }

    // 像素化处理：对每个网格区域进行颜色统计
    // 每个网格对应图片中的一个区域，统计该区域内所有像素的颜色分布
    for (let gridY = 0; gridY < gridHeight; gridY++) {
        for (let gridX = 0; gridX < gridWidth; gridX++) {
            // 计算该网格在临时画布中对应的区域范围
            const cellWidth = tempWidth / gridWidth;
            const cellHeight = tempHeight / gridHeight;
            const startX = Math.floor(gridX * cellWidth);
            const endX = Math.floor((gridX + 1) * cellWidth);
            const startY = Math.floor(gridY * cellHeight);
            const endY = Math.floor((gridY + 1) * cellHeight);
            
            // 统计该网格区域内所有像素的颜色分布
            // 使用颜色量化来减少统计量（将相似颜色归为一类）
            const colorCount = new Map(); // 量化后的RGB字符串 -> 数量
            let totalPixels = 0;
            
            for (let y = startY; y < endY; y++) {
                for (let x = startX; x < endX; x++) {
                    // 确保坐标在画板范围内
                    if (x < 0 || x >= tempWidth || y < 0 || y >= tempHeight) continue;
                    const idx = (y * tempWidth + x) * 4;
                    const r = pixels[idx];
                    const g = pixels[idx + 1];
                    const b = pixels[idx + 2];
                    const a = pixels[idx + 3];
                    
                    // 跳过透明像素和白色背景
                    if (a > 0 && !(r === 255 && g === 255 && b === 255)) {
                        // 将颜色量化（每16个值归为一类，减少统计量）
                        const quantizedR = Math.floor(r / 16) * 16;
                        const quantizedG = Math.floor(g / 16) * 16;
                        const quantizedB = Math.floor(b / 16) * 16;
                        const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
                        
                        const count = colorCount.get(colorKey) || 0;
                        colorCount.set(colorKey, count + 1);
                        totalPixels++;
                    }
                }
            }
            
            // 计算每种颜色在该网格中的占比，选取占比最大的颜色
            let maxCount = 0;
            let dominantColorRGB = null;
            
            for (const [colorKey, count] of colorCount.entries()) {
                if (count > maxCount) {
                    maxCount = count;
                    dominantColorRGB = colorKey.split(',').map(Number);
                }
            }
            
            // 如果找到了主要颜色，匹配到最接近的色号；否则使用白色背景
            const resultIdx = (gridY * gridWidth + gridX) * 4;
            
            if (dominantColorRGB && totalPixels > 0) {
                const [r, g, b] = dominantColorRGB;
                
                // 找到最接近的色号颜色
                const closestColor = findClosestColor(r, g, b, palette);
                
                // 使用匹配后的色号颜色
                resultPixels[resultIdx] = closestColor.rgb[0];
                resultPixels[resultIdx + 1] = closestColor.rgb[1];
                resultPixels[resultIdx + 2] = closestColor.rgb[2];
                resultPixels[resultIdx + 3] = 255; // A (完全不透明)
                
                // 记录使用的色号和使用次数
                if (colorCodeMap.has(closestColor.code)) {
                    colorCodeMap.get(closestColor.code).count++;
                } else {
                    colorCodeMap.set(closestColor.code, {
                        code: closestColor.code,
                        rgb: closestColor.rgb,
                        count: 1
                    });
                }
            } else {
                // 透明区域或没有有效像素，使用白色背景
                resultPixels[resultIdx] = 255;     // R (白色背景)
                resultPixels[resultIdx + 1] = 255; // G
                resultPixels[resultIdx + 2] = 255; // B
                resultPixels[resultIdx + 3] = 255; // A
            }
        }
    }
    
    // 绘制像素图到结果画布
    ctx.putImageData(resultImageData, 0, 0);

    // 获取使用的颜色列表（按色号排序）
    const usedColors = Array.from(colorCodeMap.values()).sort((a, b) => {
        return a.code.localeCompare(b.code);
    });

    // 将结果转换为 base64 图片数据
    const resultImageDataUrl = resultCanvas.toDataURL('image/png');

    // 准备结果数据（保存画板尺寸和缩放比例）
    const resultData = {
        imageData: resultImageDataUrl,
        usedColors: usedColors,
        settings: { 
            ...currentSettings,
            size: currentSettings.size === 'custom' ? 'custom' : gridWidth,  // 保存画板尺寸
            width: gridWidth,  // 保存宽度
            height: gridHeight,  // 保存高度
            scale: scale  // 保存缩放比例（用于记录用户调整）
        }
    };

    // 保存到 localStorage
    localStorage.setItem('tempPixelArtResult', JSON.stringify(resultData));

    // 在新页面打开结果
    window.open('result.html', '_blank');
}


