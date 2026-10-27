// Global State & Constants
let selectedFiles = [];
let pendingModalAction = null;

const MAX_FILE_SIZE_MB = 100; 
const EXPIRE_MS = 24 * 60 * 60 * 1000; // 24 giờ tính theo millisecond

document.addEventListener('DOMContentLoaded', () => {
    loadLocalHistory();
    loadReceiveHistory();
    setupDragAndDrop();
});

// Hiển thị Toast thông báo ngắn
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    toastMsg.innerText = message;
    
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 2500);
}

// Custom Modal Dialog Popup
function showModal(title, message, isConfirm = false, onConfirm = null) {
    const modal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const cancelBtn = document.getElementById('modalCancelBtn');
    const confirmBtn = document.getElementById('modalConfirmBtn');

    modalTitle.innerText = title;
    modalMessage.innerText = message;

    if (isConfirm) {
        cancelBtn.classList.remove('hidden');
        confirmBtn.className = 'btn-modal-confirm';
        confirmBtn.innerText = 'Đồng ý';
    } else {
        cancelBtn.classList.add('hidden');
        confirmBtn.className = 'btn-modal-confirm info';
        confirmBtn.innerText = 'Đã hiểu';
    }

    pendingModalAction = onConfirm;
    confirmBtn.onclick = () => {
        if (pendingModalAction) pendingModalAction();
        closeModal();
    };

    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('customModal').classList.add('hidden');
    pendingModalAction = null;
}

// Bộ nhớ tạm Copy Clipboard thông minh
function copyToClipboard(text) {
    if (!text) return;
    const cleanText = String(text).trim();

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(cleanText).then(() => {
            showToast('✅ Đã sao chép vào bộ nhớ tạm!');
        }).catch(() => fallbackCopy(cleanText));
    } else {
        fallbackCopy(cleanText);
    }
}

function fallbackCopy(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        showToast('✅ Đã sao chép!');
    } catch (err) {
        showModal('Lỗi', 'Không thể tự động sao chép văn bản!');
    }
    document.body.removeChild(textArea);
}

// Chuyển Tab
function switchTab(tabName) {
    const uploadSection = document.getElementById('uploadSection');
    const downloadSection = document.getElementById('downloadSection');
    const tabUploadBtn = document.getElementById('tabUploadBtn');
    const tabDownloadBtn = document.getElementById('tabDownloadBtn');
    const uploadHistoryCard = document.getElementById('uploadHistoryCard');
    const receiveHistoryCard = document.getElementById('receiveHistoryCard');

    if (tabName === 'upload') {
        uploadSection.classList.remove('hidden');
        downloadSection.classList.add('hidden');
        tabUploadBtn.classList.add('active');
        tabDownloadBtn.classList.remove('active');
        if (uploadHistoryCard) uploadHistoryCard.classList.remove('hidden');
        if (receiveHistoryCard) receiveHistoryCard.classList.add('hidden');
    } else {
        uploadSection.classList.add('hidden');
        downloadSection.classList.remove('hidden');
        tabUploadBtn.classList.remove('active');
        tabDownloadBtn.classList.add('active');
        if (uploadHistoryCard) uploadHistoryCard.classList.add('hidden');
        if (receiveHistoryCard) receiveHistoryCard.classList.remove('hidden');
    }
}

// Đổi trạng thái Ẩn/Hiện Khóa Giải Mã
function toggleKeyVisibility() {
    const input = document.getElementById('keyInput');
    const btn = document.getElementById('toggleKey');
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    btn.textContent = showing ? 'Hiện' : 'Ẩn';
}

// Drag & Drop Handling
function setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    if (!dropZone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        handleFileSelect(dt.files);
    });
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function handleFileSelect(files) {
    if (!files || files.length === 0) return;
    const incoming = Array.from(files);
    incoming.forEach(f => selectedFiles.push(f));
    renderFileList();
}

function renderFileList() {
    const fileList = document.getElementById('fileList');
    const btnEncrypt = document.getElementById('btnEncrypt');
    if (!fileList) return;

    fileList.innerHTML = '';
    let totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);

    selectedFiles.forEach((file, index) => {
        const row = document.createElement('div');
        row.className = 'file-row';
        row.innerHTML = `
            <div class="file-icon">${file.type.startsWith('image/') ? '▧' : '▤'}</div>
            <div class="file-meta">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${formatBytes(file.size)}</div>
            </div>
            <button class="remove" type="button" onclick="removeSelectedFile(${index})">Xóa</button>
        `;
        fileList.appendChild(row);
    });

    if (selectedFiles.length > 0) {
        btnEncrypt.disabled = false;
        btnEncrypt.textContent = `Tiếp tục gửi (${selectedFiles.length} tệp - ${formatBytes(totalSize)})`;
    } else {
        btnEncrypt.disabled = true;
        btnEncrypt.textContent = 'Tiếp tục gửi tệp';
    }
}

function removeSelectedFile(index) {
    selectedFiles.splice(index, 1);
    renderFileList();
}

function clearSelectedFiles() {
    selectedFiles = [];
    renderFileList();
}

// Helpers Convert ArrayBuffer
function bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function hexToBuffer(hexString) {
    const cleanHex = hexString.replace(/[^0-9a-fA-F]/g, '');
    const bytes = new Uint8Array(Math.ceil(cleanHex.length / 2));
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
    }
    return bytes;
}

// Hàm đoán MIME type cho tệp
function getMimeType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const mimeMap = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mp3': 'audio/mpeg',
        'pdf': 'application/pdf',
        'txt': 'text/plain'
    };
    return mimeMap[ext] || 'application/octet-stream';
}

// 1. Mã hóa và Tải tệp lên
async function encryptAndUpload() {
    const resultBox = document.getElementById('uploadResult');
    const btnEncrypt = document.getElementById('btnEncrypt');

    if (!selectedFiles || selectedFiles.length === 0) {
        showModal('Thông báo', 'Vui lòng chọn ít nhất 1 tệp tin trước khi gửi!');
        return;
    }

    let totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);
    const totalMB = totalSize / (1024 * 1024);
    if (totalMB > MAX_FILE_SIZE_MB) {
        showModal('Quá dung lượng', `Tổng dung lượng tệp (${totalMB.toFixed(1)}MB) vượt quá giới hạn (${MAX_FILE_SIZE_MB}MB).`);
        return;
    }

    try {
        btnEncrypt.disabled = true;
        btnEncrypt.innerHTML = '<span>⏳ Đang mã hóa & nén tệp...</span>';
        resultBox.classList.add('hidden');

        let fileBuffer;
        let fileName;

        if (selectedFiles.length > 1) {
            const zip = new JSZip();
            selectedFiles.forEach(f => zip.file(f.name, f));
            fileBuffer = await zip.generateAsync({ type: 'arraybuffer' });
            fileName = `Archive_${Date.now()}.zip`;
        } else {
            const singleFile = selectedFiles[0];
            fileBuffer = await singleFile.arrayBuffer();
            fileName = singleFile.name;
        }

        const cryptoKey = await window.crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encryptedData = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            cryptoKey,
            fileBuffer
        );

        const exportedKey = await window.crypto.subtle.exportKey('raw', cryptoKey);
        const secretKeyHex = bufferToHex(exportedKey);

        const encoder = new TextEncoder();
        const nameBytes = encoder.encode(fileName);
        const nameLen = nameBytes.length;

        const payload = new Uint8Array(1 + nameLen + 12 + encryptedData.byteLength);
        payload[0] = nameLen;
        payload.set(nameBytes, 1);
        payload.set(iv, 1 + nameLen);
        payload.set(new Uint8Array(encryptedData), 1 + nameLen + 12);

        btnEncrypt.innerHTML = '<span>⏳ Đang tải tệp lên server...</span>';
        const blob = new Blob([payload], { type: 'application/octet-stream' });
        const formData = new FormData();
        formData.append('encryptedFile', blob, 'encrypted.bin');

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            if (response.status === 413) throw new Error('Tệp vượt quá giới hạn dung lượng Server (100MB)');
            throw new Error('Lỗi từ Server khi lưu tệp');
        }

        const data = await response.json();
        const fileId = data.fileId;

        // Lưu Lịch Sử
        saveToUploadHistory(fileId, secretKeyHex, fileName);

        // Render Kết Quả
        resultBox.innerHTML = `
            <div style="color: #4ade80; font-weight: 700; margin-bottom: 12px; font-size: 0.95rem;">✅ Mã hóa & Tải lên thành công!</div>
            
            <div class="result-item">
                <label>Mã Tệp (File ID):</label>
                <div class="copy-group">
                    <input type="text" value="${fileId}" readonly>
                    <button class="btn-copy" onclick="copyToClipboard('${fileId}')">📋 Copy</button>
                </div>
            </div>

            <div class="result-item">
                <label>Khóa Giải Mã (Secret Key):</label>
                <div class="copy-group">
                    <input type="text" class="red-text" value="${secretKeyHex}" readonly>
                    <button class="btn-copy" onclick="copyToClipboard('${secretKeyHex}')">📋 Copy</button>
                </div>
            </div>

            <div style="color: #9aa8c4; font-size: 0.8rem; border-top: 1px dashed #283650; padding-top: 8px; margin-top: 8px;">
                ⏱️ <i>Lưu ý: Tệp của bạn sẽ tự động xóa khỏi hệ thống sau 24 giờ.</i>
            </div>
        `;
        resultBox.classList.remove('hidden');

    } catch (err) {
        showModal('Tải lên thất bại', err.message || 'Không thể tải tệp lên server!');
    } finally {
        btnEncrypt.disabled = false;
        btnEncrypt.textContent = `Tiếp tục gửi (${selectedFiles.length} tệp)`;
    }
}

// 2. Tải về và Giải mã tệp (Hỗ trợ xem trước ảnh)
async function downloadAndDecrypt() {
    const rawFileId = document.getElementById('fileIdInput').value.trim();
    const rawKeyHex = document.getElementById('keyInput').value.trim();
    const resultBox = document.getElementById('downloadResult');
    const btnDecrypt = document.getElementById('btnDecrypt');

    if (!rawFileId || !rawKeyHex) {
        showModal('Thiếu thông tin', 'Vui lòng nhập đầy đủ Mã Tệp và Khóa Giải Mã!');
        return;
    }

    const cleanKeyHex = rawKeyHex.replace(/[^0-9a-fA-F]/g, '');
    if (cleanKeyHex.length !== 64 && cleanKeyHex.length !== 32) {
        showModal('Lỗi khóa giải mã', `Khóa AES phải dài 32 hoặc 64 ký tự Hex.`);
        return;
    }

    try {
        btnDecrypt.disabled = true;
        btnDecrypt.innerHTML = '<span>⏳ Đang tải tệp về...</span>';
        resultBox.classList.add('hidden');

        const cleanFileId = encodeURIComponent(rawFileId);
        const response = await fetch(`/api/download/${cleanFileId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Mã tệp không tồn tại hoặc đã tự động xóa sau 24h!');
            }
            throw new Error('Không thể kết nối tới server tải tệp!');
        }

        const encryptedBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(encryptedBuffer);

        const nameLen = bytes[0];
        const nameBytes = bytes.slice(1, 1 + nameLen);
        const fileName = new TextDecoder().decode(nameBytes);
        const iv = bytes.slice(1 + nameLen, 1 + nameLen + 12);
        const ciphertext = bytes.slice(1 + nameLen + 12);

        const rawKey = hexToBuffer(cleanKeyHex);
        const cryptoKey = await window.crypto.subtle.importKey(
            'raw',
            rawKey,
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        );

        btnDecrypt.innerHTML = '<span>⏳ Đang giải mã tệp...</span>';
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            cryptoKey,
            ciphertext
        );

        const mimeType = getMimeType(fileName);
        const blob = new Blob([decryptedBuffer], { type: mimeType });
        const downloadUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();

        saveToReceiveHistory(rawFileId, cleanKeyHex, fileName);

        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileName.split('.').pop().toLowerCase());
        let previewHtml = '';
        if (isImage) {
            previewHtml = `
                <div style="margin-top: 12px; text-align: center;">
                    <p style="font-size: 12px; color: #9aa8c4; margin-bottom: 6px;">Xem trước hình ảnh:</p>
                    <img src="${downloadUrl}" alt="${fileName}" style="max-width: 100%; max-height: 280px; border-radius: 10px; border: 1px solid #283650;" />
                </div>
            `;
        }

        resultBox.innerHTML = `
            <div style="color: #4ade80; font-weight: 600;">🎉 Giải mã & Tải về thành công: <b>${fileName}</b></div>
            ${previewHtml}
        `;
        resultBox.classList.remove('hidden');

    } catch (err) {
        showModal('Giải mã thất bại', err.message || 'Khóa giải mã không đúng hoặc tệp không còn tồn tại trên server!');
    } finally {
        btnDecrypt.disabled = false;
        btnDecrypt.innerHTML = 'Tải Về & Giải Mã';
    }
}

// --- LỊCH SỬ ĐÃ GỬI ---
function saveToUploadHistory(fileId, key, fileName) {
    let history = JSON.parse(localStorage.getItem('uploadHistory') || '[]');
    history.unshift({
        fileId: fileId,
        key: key,
        fileName: fileName,
        timestamp: Date.now()
    });
    localStorage.setItem('uploadHistory', JSON.stringify(history));
    loadLocalHistory();
}

function loadLocalHistory() {
    const container = document.getElementById('historyTableContainer');
    if (!container) return;

    const history = JSON.parse(localStorage.getItem('uploadHistory') || '[]');
    if (history.length === 0) {
        container.innerHTML = `<p style="color: #9aa8c4; font-size: 0.85rem; text-align: center; padding: 12px 0;">Bạn chưa gửi tệp nào trên thiết bị này.</p>`;
        return;
    }

    const NOW = Date.now();

    let html = `
    <table style="width: 100%; font-size: 0.85rem; color: #eef2ff; border-collapse: collapse;">
        <thead>
            <tr style="text-align: left; color: #9aa8c4; border-bottom: 1px solid #283650;">
                <th style="padding: 10px 8px;">Mã Tệp (File ID)</th>
                <th style="padding: 10px 8px;">Khóa Giải Mã</th>
                <th style="padding: 10px 8px;">Thời Gian</th>
                <th style="padding: 10px 8px;">Trạng Thái</th>
                <th style="padding: 10px 8px; text-align: center;">Xóa</th>
            </tr>
        </thead>
        <tbody>`;

    history.forEach((item, index) => {
        const shortId = item.fileId ? item.fileId.substring(0, 8) + '...' : '';
        const shortKey = item.key ? item.key.substring(0, 8) + '...' : '';

        const isExpired = item.timestamp ? (NOW - item.timestamp > EXPIRE_MS) : false;
        const statusText = isExpired 
            ? '<span style="color: #fb7185; font-weight: 500;">🔴 Đã hết hạn</span>' 
            : '<span style="color: #4ade80; font-weight: 500;">🟢 Còn hạn</span>';
        const rowOpacity = isExpired ? 'opacity: 0.5;' : '';

        let timeFormatted = 'N/A';
        if (typeof item.timestamp === 'number') {
            const dateObj = new Date(item.timestamp);
            timeFormatted = dateObj.toLocaleTimeString('vi-VN') + ' ' + dateObj.toLocaleDateString('vi-VN');
        }

        html += `
        <tr style="border-bottom: 1px solid #17223a; ${rowOpacity}">
            <td style="padding: 10px 8px;">
                <div class="badge-copy badge-blue" onclick="copyToClipboard('${item.fileId}')" title="Bấm để sao chép Mã Tệp">
                    <span>${shortId}</span> 📋
                </div>
            </td>
            <td style="padding: 10px 8px;">
                <div class="badge-copy badge-red" onclick="copyToClipboard('${item.key}')" title="Bấm để sao chép Khóa Giải Mã">
                    <span>${shortKey}</span> 📋
                </div>
            </td>
            <td style="padding: 10px 8px; color: #9aa8c4;">${timeFormatted}</td>
            <td style="padding: 10px 8px;">${statusText}</td>
            <td style="padding: 10px 8px; text-align: center;">
                <button class="btn-delete-item" onclick="deleteUploadHistoryItem(${index})" title="Xóa dòng này">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fb7185" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </td>
        </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function deleteUploadHistoryItem(index) {
    showModal(
        'Xác nhận xóa',
        'Bạn có chắc chắn muốn xóa dòng lịch sử này khỏi máy tính không?',
        true,
        () => {
            let history = JSON.parse(localStorage.getItem('uploadHistory') || '[]');
            history.splice(index, 1);
            localStorage.setItem('uploadHistory', JSON.stringify(history));
            loadLocalHistory();
            showToast('🗑️ Đã xóa dòng lịch sử!');
        }
    );
}

// --- LỊCH SỬ ĐÃ NHẬN ---
function saveToReceiveHistory(fileId, key, fileName) {
    let history = JSON.parse(localStorage.getItem('receiveHistory') || '[]');
    history.unshift({
        fileId: fileId,
        key: key,
        fileName: fileName,
        timestamp: Date.now()
    });
    localStorage.setItem('receiveHistory', JSON.stringify(history));
    loadReceiveHistory();
}

function loadReceiveHistory() {
    const container = document.getElementById('receiveHistoryTableContainer');
    if (!container) return;

    const history = JSON.parse(localStorage.getItem('receiveHistory') || '[]');
    if (history.length === 0) {
        container.innerHTML = `<p style="color: #9aa8c4; font-size: 0.85rem; text-align: center; padding: 12px 0;">Bạn chưa nhận tệp nào trên thiết bị này.</p>`;
        return;
    }

    const NOW = Date.now();

    let html = `
    <table style="width: 100%; font-size: 0.85rem; color: #eef2ff; border-collapse: collapse;">
        <thead>
            <tr style="text-align: left; color: #9aa8c4; border-bottom: 1px solid #283650;">
                <th style="padding: 10px 8px;">Mã Tệp (File ID)</th>
                <th style="padding: 10px 8px;">Khóa Giải Mã</th>
                <th style="padding: 10px 8px;">Thời Gian</th>
                <th style="padding: 10px 8px;">Trạng Thái</th>
                <th style="padding: 10px 8px; text-align: center;">Xóa</th>
            </tr>
        </thead>
        <tbody>`;

    history.forEach((item, index) => {
        const shortId = item.fileId ? item.fileId.substring(0, 8) + '...' : '';
        const shortKey = item.key ? item.key.substring(0, 8) + '...' : '';

        const isExpired = item.timestamp ? (NOW - item.timestamp > EXPIRE_MS) : false;
        const statusText = isExpired 
            ? '<span style="color: #fb7185; font-weight: 500;">🔴 Đã hết hạn</span>' 
            : '<span style="color: #4ade80; font-weight: 500;">🟢 Còn hạn</span>';
        const rowOpacity = isExpired ? 'opacity: 0.5;' : '';

        let timeFormatted = 'N/A';
        if (typeof item.timestamp === 'number') {
            const dateObj = new Date(item.timestamp);
            timeFormatted = dateObj.toLocaleTimeString('vi-VN') + ' ' + dateObj.toLocaleDateString('vi-VN');
        }

        html += `
        <tr style="border-bottom: 1px solid #17223a; ${rowOpacity}">
            <td style="padding: 10px 8px;">
                <div class="badge-copy badge-blue" onclick="copyToClipboard('${item.fileId}')" title="Bấm để sao chép Mã Tệp">
                    <span>${shortId}</span> 📋
                </div>
            </td>
            <td style="padding: 10px 8px;">
                <div class="badge-copy badge-red" onclick="copyToClipboard('${item.key}')" title="Bấm để sao chép Khóa Giải Mã">
                    <span>${shortKey}</span> 📋
                </div>
            </td>
            <td style="padding: 10px 8px; color: #9aa8c4;">${timeFormatted}</td>
            <td style="padding: 10px 8px;">${statusText}</td>
            <td style="padding: 10px 8px; text-align: center;">
                <button class="btn-delete-item" onclick="deleteReceiveHistoryItem(${index})" title="Xóa dòng này">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fb7185" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </td>
        </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function deleteReceiveHistoryItem(index) {
    showModal(
        'Xác nhận xóa',
        'Bạn có chắc chắn muốn xóa dòng lịch sử này khỏi máy tính không?',
        true,
        () => {
            let history = JSON.parse(localStorage.getItem('receiveHistory') || '[]');
            history.splice(index, 1);
            localStorage.setItem('receiveHistory', JSON.stringify(history));
            loadReceiveHistory();
            showToast('🗑️ Đã xóa dòng lịch sử!');
        }
    );
}

function refreshHistory(type, btnElement) {
    const titleName = type === 'upload' ? 'Lịch sử đã gửi' : 'Lịch sử đã nhận';

    showModal(
        'Xác nhận Làm mới',
        `Bạn có chắc chắn muốn làm mới và XÓA TOÀN BỘ danh sách trong "${titleName}" trên trình duyệt này không?`,
        true,
        () => {
            if (type === 'upload') {
                localStorage.removeItem('uploadHistory');
                loadLocalHistory();
            } else {
                localStorage.removeItem('receiveHistory');
                loadReceiveHistory();
            }
            showToast('🔄 Đã xóa toàn bộ lịch sử thành công!');
        }
    );
}
