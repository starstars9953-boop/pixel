// 加载图纸库
document.addEventListener('DOMContentLoaded', () => {
    loadGallery();
});

// 加载图纸库
function loadGallery() {
    const gallery = JSON.parse(localStorage.getItem('pixelArtGallery') || '[]');
    const container = document.getElementById('galleryContainer');
    const emptyMessage = document.getElementById('emptyMessage');

    if (gallery.length === 0) {
        emptyMessage.style.display = 'block';
        return;
    }

    emptyMessage.style.display = 'none';

    // 清空容器
    container.innerHTML = '';

    // 按创建时间倒序排列
    gallery.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 创建图纸卡片
    gallery.forEach(art => {
        const card = document.createElement('div');
        card.className = 'gallery-card';
        
        const img = document.createElement('img');
        img.src = art.dataURL;
        img.alt = `像素图 ${art.settings.size}x${art.settings.size}`;
        // 点击缩略图直接进入编辑页面
        img.onclick = () => editArt(art.id);
        
        const info = document.createElement('div');
        info.className = 'gallery-card-info';
        info.innerHTML = `
            <p>尺寸: ${art.settings.size} x ${art.settings.size}</p>
            <p>品牌: ${art.settings.brand}</p>
            <p class="gallery-date">${formatDate(art.createdAt)}</p>
        `;
        
        card.appendChild(img);
        card.appendChild(info);
        container.appendChild(card);
    });
}

// 查看图纸详情
function viewArt(art) {
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="modal-close">&times;</span>
            <h2>图纸详情</h2>
            <div class="modal-image">
                <img src="${art.dataURL}" alt="像素图">
            </div>
            <div class="modal-info">
                <p><strong>尺寸:</strong> ${art.settings.size} x ${art.settings.size}</p>
                <p><strong>品牌:</strong> ${art.settings.brand}</p>
                <p><strong>创建时间:</strong> ${formatDate(art.createdAt)}</p>
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" onclick="editArt('${art.id}')">编辑</button>
                <button class="btn-secondary" onclick="downloadArt('${art.id}')">下载</button>
                <button class="btn-secondary btn-danger" onclick="deleteArt('${art.id}')">删除</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 关闭模态框
    modal.querySelector('.modal-close').onclick = () => {
        document.body.removeChild(modal);
    };
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
}

// 下载图纸
function downloadArt(id) {
    const gallery = JSON.parse(localStorage.getItem('pixelArtGallery') || '[]');
    const art = gallery.find(a => a.id === id);
    
    if (art) {
        const a = document.createElement('a');
        a.href = art.dataURL;
        a.download = `pixel-art-${art.settings.size}x${art.settings.size}-${id}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

// 从图纸库进入可编辑状态
function editArt(id) {
    const gallery = JSON.parse(localStorage.getItem('pixelArtGallery') || '[]');
    const art = gallery.find(a => a.id === id);

    if (!art) {
        alert('未找到图纸数据');
        return;
    }

    // 标记从图纸库进入，方便结果页返回时回到图纸库
    localStorage.setItem('returnTo', 'gallery');

    // 优先使用保存时存下来的完整 result 数据（包含 usedColors 等）
    let tempResult;
    if (art.result) {
        tempResult = art.result;
    } else {
        // 兼容老数据：只用图片和基础设置构造一个最简单的 result
        tempResult = {
            imageData: art.dataURL,
            usedColors: [],
            settings: art.settings || { size: 52, brand: 'mard' }
        };
    }

    // 写入临时结果，跳转到生成结果页继续编辑
    localStorage.setItem('tempPixelArtResult', JSON.stringify(tempResult));
    window.location.href = 'result.html';
}

// 删除图纸
function deleteArt(id) {
    if (confirm('确定要删除这张图纸吗？')) {
        let gallery = JSON.parse(localStorage.getItem('pixelArtGallery') || '[]');
        gallery = gallery.filter(a => a.id !== id);
        localStorage.setItem('pixelArtGallery', JSON.stringify(gallery));
        loadGallery();
        
        // 关闭模态框
        const modal = document.querySelector('.modal');
        if (modal) {
            document.body.removeChild(modal);
        }
    }
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

