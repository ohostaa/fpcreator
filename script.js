// パーティデータ
let partyData = {
    characters: {},
    remnants: {}
};

let currentSquare = null;
let currentType = null;
let availableImages = {
    characters: [],
    remnants: []
};

// 使用中の画像を追跡
let usedImages = new Set();

// 初期化
function init() {
    loadAvailableImages();
}

// 利用可能な画像を自動読み込み
async function loadAvailableImages() {
    try {
        // キャラクター画像を読み込み
        const characterImages = await loadImagesFromFolder('./image/character/');
        availableImages.characters = characterImages.map(filename => ({
            name: filename.replace('.png', ''),
            path: `./image/character/${filename}`
        }));

        // 残滓画像を読み込み
        const remnantImages = await loadImagesFromFolder('./image/zanshi/');
        availableImages.remnants = remnantImages.map(filename => ({
            name: filename.replace('.png', ''),
            path: `./image/zanshi/${filename}`
        }));
    } catch (error) {
        console.error('画像読み込みエラー:', error);
        // フォールバック
        await loadFallbackImages();
    }
}

// フォルダから画像ファイルを自動取得
async function loadImagesFromFolder(folderPath) {
    try {
        const response = await fetch(folderPath);
        const html = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const links = Array.from(doc.querySelectorAll('a'));
        
        const imageFiles = links
            .map(link => link.href.split('/').pop())
            .filter(filename => filename.endsWith('.png'))
            .sort();
        
        return imageFiles;
    } catch (error) {
        console.warn(`フォルダ ${folderPath} からの読み込みに失敗`);
        return [];
    }
}

// フォールバック画像読み込み
async function loadFallbackImages() {
    const characterNames = [
        'gojo', 'yuji', 'megumi', 'nobara', 'maki', 'toge', 'panda', 'yuta', 'sukuna', 'nanami'
    ];
    
    const remnantNames = Array.from({length: 20}, (_, i) => `zanshi${i + 1}`);

    // キャラクター画像の存在確認
    for (const name of characterNames) {
        const path = `./image/character/${name}.png`;
        if (await imageExists(path)) {
            availableImages.characters.push({ name, path });
        }
    }

    // 残滓画像の存在確認
    for (const name of remnantNames) {
        const path = `./image/zanshi/${name}.png`;
        if (await imageExists(path)) {
            availableImages.remnants.push({ name, path });
        }
    }
}

// 画像の存在確認
function imageExists(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
    });
}

// モーダルを開く
function openModal(square, type) {
    currentSquare = square;
    currentType = type;
    
    const modal = document.getElementById('imageModal');
    const title = document.getElementById('modalTitle');
    const options = document.getElementById('imageOptions');
    
    title.textContent = type === 'character' ? 'キャラを選んでね' : '残滓を選んでね';
    
    // 画像オプションを生成
    options.innerHTML = '';
    options.className = 'image-grid';
    
    const images = type === 'character' ? availableImages.characters : availableImages.remnants;
    
    images.forEach((image) => {
        const option = document.createElement('div');
        option.className = 'image-option';
        
        // 使用中の画像は無効化
        const isUsed = usedImages.has(image.path);
        if (isUsed) {
            option.classList.add('disabled');
        }
        
        const img = document.createElement('img');
        img.src = image.path;
        img.alt = image.name;
        img.onerror = () => {
            option.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; font-size: 12px; color: #666;">${image.name}</div>`;
        };
        
        option.appendChild(img);
        
        if (!isUsed) {
            option.onclick = () => selectImage(image);
        }
        
        options.appendChild(option);
    });
    
    modal.style.display = 'flex';
}

// 画像選択
function selectImage(image) {
    if (!currentSquare) return;
    
    // 既存の画像があれば使用状態を解除
    const existingImg = currentSquare.querySelector('img');
    if (existingImg) {
        usedImages.delete(existingImg.src);
    }
    
    // 新しい画像を設定
    currentSquare.innerHTML = `<img src="${image.path}" alt="${image.name}">`;
    currentSquare.classList.add('selected');
    
    // 使用中としてマーク
    usedImages.add(image.path);
    
    // パーティデータに保存
    const slotIndex = Array.from(currentSquare.parentNode.children).indexOf(currentSquare);
    if (currentType === 'character') {
        partyData.characters[slotIndex] = image;
    } else {
        partyData.remnants[slotIndex] = image;
    }
    
    closeModal();
}

// モーダルを閉じる
function closeModal() {
    document.getElementById('imageModal').style.display = 'none';
    currentSquare = null;
    currentType = null;
}

// 全てリセット
function resetAll() {
    if (confirm('全てリセットしますか？')) {
        // スロットをクリア
        document.querySelectorAll('.square').forEach(square => {
            square.innerHTML = '';
            square.classList.remove('selected');
        });
        
        // データをクリア
        partyData = { characters: {}, remnants: {} };
        usedImages.clear();
    }
}

// スクリーンショット
function takeScreenshot() {
    const captureArea = document.getElementById('captureArea');
    html2canvas(captureArea, {
        backgroundColor: '#f9f9f9',
        scale: 2, // 高画質化
        useCORS: true // CORS対応
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `jujutsu_party_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }).catch(error => {
        console.error('スクリーンショット失敗:', error);
        alert('スクリーンショットの生成に失敗しました');
    });
}

// モーダル外クリックで閉じる
window.addEventListener('click', e => {
    if (e.target.classList.contains('modal')) {
        closeModal();
    }
});

// 初期化実行
document.addEventListener('DOMContentLoaded', init);
