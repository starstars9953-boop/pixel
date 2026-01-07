// Mard 拼豆色号表
// 格式：{ code: '色号', rgb: [R, G, B] }
// 
// 重要说明：
// 1. 这里需要包含264个颜色的RGB值和对应的色号
// 2. RGB值用于颜色匹配和显示，色号用于标识（如 B3, C3, D9 等）
// 3. 您需要根据色号表图片，将每个色号的RGB值填入下面的数组
//
// 提取颜色RGB值的方法：
// - 使用在线取色工具（如 https://imagecolorpicker.com/）
// - 使用图片处理软件（如 Photoshop 的取色器）
// - 或者我可以创建一个简单的HTML工具来帮助提取

// 从图片描述中看到的色号示例（需要补充完整的264个颜色）：
// Grid 1: B3, C3, D9, E2, G1, A4, B5, C5, D6, E4, G5, A6, B8, C8, D7, F5, G7, A7, H1, H2, H3, H4, H5, H7
// Grid A: B10, C2, C3, C13, D16, D17, B6, C4, C10, C17, D1, D11, C15, C11, C5, C6, C7, D2, B19, B7, C8, C9, D3, C16
// ... 等等

const MARD_COLOR_PALETTE = [
    { code: 'A4', rgb: [251, 217, 20] },
    { code: 'A6', rgb: [242, 183, 51] },
    { code: 'A7', rgb: [248, 122, 4] },
    { code: 'B10', rgb: [155, 216, 190] },
    { code: 'B3', rgb: [135, 207, 132] },
    { code: 'B5', rgb: [97, 164, 70] },
    { code: 'B6', rgb: [91, 211, 174] },
    { code: 'B8', rgb: [5, 135, 66] },
    { code: 'C10', rgb: [11, 189, 225] },
    { code: 'C13', rgb: [190, 211, 230] },
    { code: 'C15', rgb: [35, 173, 164] },
    { code: 'C17', rgb: [98, 198, 210] },
    { code: 'C2', rgb: [180, 224, 227] },
    { code: 'C3', rgb: [186, 222, 231] },
    { code: 'C4', rgb: [117, 208, 235] },
    { code: 'C5', rgb: [11, 178, 193] },
    { code: 'C8', rgb: [38, 117, 175] },
    { code: 'D1', rgb: [151, 170, 218] },
    { code: 'D11', rgb: [192, 193, 233] },
    { code: 'D16', rgb: [214, 213, 231] },
    { code: 'D17', rgb: [188, 202, 234] },
    { code: 'D6', rgb: [174, 152, 193] },
    { code: 'D7', rgb: [101, 60, 133] },
    { code: 'D9', rgb: [195, 188, 223] },
    { code: 'E2', rgb: [251, 198, 221] },
    { code: 'E4', rgb: [234, 118, 166] },
    { code: 'F5', rgb: [187, 9, 22] },
    { code: 'G1', rgb: [245, 216, 194] },
    { code: 'G5', rgb: [228, 153, 106] },
    { code: 'G7', rgb: [154, 90, 59] },
    { code: 'H1', rgb: [243, 238, 237] },
    { code: 'H2', rgb: [253, 253, 253] },
    { code: 'H3', rgb: [176, 176, 176] },
    { code: 'H4', rgb: [119, 119, 119] },
    { code: 'H5', rgb: [67, 67, 67] },
    { code: 'H7', rgb: [2, 2, 2] },
];

// 获取品牌色板
function getColorPalette(brand) {
    switch(brand) {
        case 'mard':
            return MARD_COLOR_PALETTE;
        default:
            return MARD_COLOR_PALETTE;
    }
}

// 计算两个RGB颜色之间的加权距离（考虑人眼对不同颜色的敏感度）
function weightedColorDistance(rgb1, rgb2) {
    const rMean = (rgb1[0] + rgb2[0]) / 2;
    const rDiff = rgb1[0] - rgb2[0];
    const gDiff = rgb1[1] - rgb2[1];
    const bDiff = rgb1[2] - rgb2[2];
    
    // 使用加权公式，考虑人眼对不同颜色的敏感度
    const weightR = 2 + rMean / 256;
    const weightG = 4;
    const weightB = 2 + (255 - rMean) / 256;
    
    return Math.sqrt(weightR * rDiff * rDiff + weightG * gDiff * gDiff + weightB * bDiff * bDiff);
}

// 判断是否为灰色（用于避免优先匹配灰色）
function isGray(rgb) {
    const [r, g, b] = rgb;
    // 如果RGB三个值很接近，认为是灰色
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    return maxDiff < 30; // 如果RGB差值小于30，认为是灰色
}

// 找到最接近的色号颜色
function findClosestColor(r, g, b, palette) {
    if (palette.length === 0) {
        // 如果色板为空，返回原颜色
        return { code: 'N/A', rgb: [r, g, b] };
    }
    
    const sourceIsGray = isGray([r, g, b]);
    let minDistance = Infinity;
    let closestColor = palette[0];
    
    for (const color of palette) {
        const distance = weightedColorDistance([r, g, b], color.rgb);
        const targetIsGray = isGray(color.rgb);
        
        // 如果原颜色不是灰色，优先匹配非灰色色号
        // 只有当原颜色是灰色时，才匹配灰色色号
        let adjustedDistance = distance;
        if (!sourceIsGray && targetIsGray) {
            // 原颜色是彩色，但目标色号是灰色，增加距离惩罚
            adjustedDistance = distance * 1.5;
        } else if (sourceIsGray && !targetIsGray) {
            // 原颜色是灰色，但目标色号是彩色，增加距离惩罚
            adjustedDistance = distance * 1.5;
        }
        
        if (adjustedDistance < minDistance) {
            minDistance = adjustedDistance;
            closestColor = color;
        }
    }
    
    return closestColor;
}
