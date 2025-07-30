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
    console.log('画像読み込み開始...');
    
    try {
        // キャラクター画像を読み込み
        console.log('キャラクター画像を読み込み中...');
        const characterImages = await loadAllImagesFromFolder('./image/character/');
        availableImages.characters = characterImages.map(filename => ({
            name: filename.replace('.png', ''),
            path: `./image/character/${filename}`,
            filename: filename
        }));
        console.log(`キャラクター画像 ${characterImages.length} 個読み込み完了:`, characterImages);

        // 残滓画像を読み込み
        console.log('残滓画像を読み込み中...');
        const remnantImages = await loadAllImagesFromFolder('./image/zanshi/');
        availableImages.remnants = remnantImages.map(filename => ({
            name: filename.replace('.png', ''),
            path: `./image/zanshi/${filename}`,
            filename: filename
        }));
        console.log(`残滓画像 ${remnantImages.length} 個読み込み完了:`, remnantImages);
        
    } catch (error) {
        console.error('画像読み込みエラー:', error);
        // フォールバック方式を試行
        await loadImagesByScanning();
    }
}

// フォルダから全ての画像ファイルを自動取得
async function loadAllImagesFromFolder(folderPath) {
    try {
        console.log(`フォルダ ${folderPath} にアクセス中...`);
        const response = await fetch(folderPath);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const html = await response.text();
        console.log(`フォルダ ${folderPath} のHTMLを取得:`, html.substring(0, 200) + '...');
        
        // HTMLから.pngファイルのリンクを抽出
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const links = Array.from(doc.querySelectorAll('a'));
        
        console.log(`${links.length} 個のリンクが見つかりました`);
        
        const imageFiles = links
            .map(link => {
                const href = link.getAttribute('href');
                if (href && href.endsWith('.png')) {
                    return href;
                }
                // フルURLからファイル名を抽出
                const fullUrl = link.href;
                if (fullUrl && fullUrl.includes('.png')) {
                    const parts = fullUrl.split('/');
                    const filename = parts[parts.length - 1];
                    if (filename.endsWith('.png')) {
                        return filename;
                    }
                }
                return null;
            })
            .filter(filename => filename !== null && filename.endsWith('.png'))
            .sort();
        
        console.log(`${imageFiles.length} 個のPNGファイルが見つかりました:`, imageFiles);
        return imageFiles;
        
    } catch (error) {
        console.warn(`フォルダ ${folderPath} からの読み込みに失敗:`, error);
        return [];
    }
}

// スキャン方式での画像読み込み（フォールバック）
async function loadImagesByScanning() {
    console.log('フォールバック: スキャン方式で画像を検索中...');
    
    // より多くのパターンでスキャン
    const patterns = [];
    
    // i_ch パターン
    for (let i = 1; i <= 100; i++) {
        patterns.push(`i_ch${i}`);
    }
    
    // その他の一般的なパターン
    for (let i = 1; i <= 50; i++) {
        patterns.push(`char${i}`);
        patterns.push(`character${i}`);
        patterns.push(`ch${i}`);
        patterns.push(`zanshi${i}`);
        patterns.push(`remnant${i}`);
        patterns.push(`item${i}`);
    }
    
    // アルファベット + 数字パターン
    ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'].forEach(letter => {
        for (let i = 1; i <= 20; i++) {
            patterns.push(`${letter}${i}`);
            patterns.push(`${letter}_${i}`);
        }
    });

    // キャラクター画像をスキャン
    console.log('キャラクター画像をスキャン中...');
    for (const pattern of patterns) {
        const path = `./image/character/${pattern}.png`;
        if (await imageExists(path)) {
            availableImages.characters.push({ 
                name: pattern, 
                path: path,
                filename: `${pattern}.png`
            });
            console.log(`キャラクター画像発見: ${pattern}.png`);
        }
    }

    // 残滓画像をスキャン
    console.log('残滓画像をスキャン中...');
    for (const pattern of patterns) {
        const path = `./image/zanshi/${pattern}.png`;
        if (await imageExists(path)) {
            availableImages.remnants.push({ 
                name: pattern, 
                path: path,
                filename: `${pattern}.png`
            });
            console.log(`残滓画像発見: ${pattern}.png`);
        }
    }
    
    console.log(`スキャン完了 - キャラクター: ${availableImages.characters.length}個, 残滓: ${availableImages.remnants.length}個`);
}

// 画像の存在確認
function imageExists(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
        // タイムアウトを設定
        setTimeout(() => resolve(false), 3000);
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
    
    // ローディング表示
    options.innerHTML = '<div class="loading">画像を読み込み中</div>';
    options.className = '';
    
    // 画像オプションを生成
    setTimeout(() => {
        generateImageOptions(options, type);
    }, 100);
    
    modal.style.display = 'flex';
}

// 画像オプションを生成
function generateImageOptions(container, type) {
    container.innerHTML = '';
    container.className = 'image-grid';
    
    const images = type === 'character' ? availableImages.characters : availableImages.remnants;
    
    if (images.length === 0) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #666;">画像が見つかりませんでした</div>';
        return;
    }
    
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
        
        img.onload = () => {
            console.log(`画像読み込み成功: ${image.filename}`);
        };
        
        img.onerror = () => {
            console.warn(`画像読み込み失敗: ${image.filename}`);
            option.innerHTML = `<div class="no-image-placeholder">${image.filename}</div>`;
        };
        
        option.appendChild(img);
        
        // ファイル名表示
        const nameDiv = document.createElement('div');
        nameDiv.className = 'image-name';
        nameDiv.textContent = image.filename;
        option.appendChild(nameDiv);
        
        if (!isUsed) {
            option.onclick = () => selectImage(image);
        }
        
        container.appendChild(option);
    });
}

// 画像選択
function selectImage(image) {
    if (!currentSquare) return;
    
    console.log(`画像選択: ${image.filename}`);
    
    // 既存の画像があれば使用状態を解除
    const existingImg = currentSquare.querySelector('img');
    if (existingImg) {
        const existingPath = existingImg.src;
        usedImages.delete(existingPath);
        console.log(`既存画像の使用状態を解除: ${existingPath}`);
    }
    
    // 新しい画像を設定
    currentSquare.innerHTML = `<img src="${image.path}" alt="${image.name}">`;
    currentSquare.classList.add('selected');
    
    // 使用中としてマーク
    usedImages.add(image.path);
    console.log(`新しい画像を使用中としてマーク: ${image.path}`);
    
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
        console.log('全てリセット');
        
        // スロットをクリア
        document.querySelectorAll('.square').forEach(square => {
            square.innerHTML = '';
            square.classList.remove('selected');
        });
        
        // データをクリア
        partyData = { characters: {}, remnants: {} };
        usedImages.clear();
        
        console.log('リセット完了');
    }
}

// スクリーンショット
function takeScreenshot() {
    console.log('スクリーンショット開始');
    
    const captureArea = document.getElementById('captureArea');
    html2canvas(captureArea, {
        backgroundColor: '#f9f9f9',
        scale: 2, // 高画質化
        useCORS: true, // CORS対応
        allowTaint: true,
        logging: true // デバッグ用
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `jujutsu_party_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        console.log('スクリーンショット完了');
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
document.addEventListener('DOMContentLoaded', () => {
    console.log('アプリケーション初期化開始');
    init();
});
