let selectedFiles = [];

// Khởi tạo ứng dụng
document.addEventListener('DOMContentLoaded', () => {
    loadLocalHistory();
    loadReceiveHistory();
    setupDragAndDrop();
});

// Chuyển đổi Tab
function switchTab(tabName) {
    const uploadSection = document.getElementById('uploadSection');
    const downloadSection = document.getElementById('downloadSection');
    const tabUploadBtn = document.getElementById('tabUploadBtn');
    const tabDownloadBtn = document.getElementById('tabDownloadBtn');

    if (tabName === 'upload') {
        uploadSection.classList.remove('hidden');
        downloadSection.classList.add('hidden');
        tabUploadBtn.classList.add('active');
        tabDownloadBtn.classList.remove('active');
    } else {
        uploadSection.classList.add('hidden');
        downloadSection.classList.remove('hidden');
        tabUploadBtn.classList.remove('active');
        tabDownloadBtn.classList.add('active');
    }
}

// Xử lý sự kiện kéo thả file vào DropZone
function setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFileSelect(files);
    });
}

// Xử lý khi người dùng chọn file
function handleFileSelect(files) {
    if (!files || files.length === 0) return;
    selectedFiles = Array.from(files);

    const display = document.getElementById('fileNameDisplay');
    if (selectedFiles.length === 1) {
        const file = selectedFiles[0];
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        display.innerText = `${file.name} (${sizeMB} MB)`;
    } else {
        let totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);
        const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
        display.innerText = `Đã chọn ${selectedFiles.length} tệp (Tổng: ${totalSizeMB} MB)`;
    }
}

// Chuyển ArrayBuffer thành chuỗi Hex
function bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Chuyển chuỗi Hex thành Uint8Array
function hexToBuffer(hexString) {
    const bytes = new Uint8Array(Math.ceil(hexString.length / 2));
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
    }
    return bytes;
}

// Mã hóa và Tải lên
async function encryptAndUpload() {
    const resultBox = document.getElementById('uploadResult');
    const btnEncrypt = document.getElementById('btnEncrypt');

    if (!selectedFiles || selectedFiles.length === 0) {
        alert('Vui lòng chọn ít nhất 1 tệp tin!');
        return;
    }

    try {
        btnEncrypt.disabled = true;
        btnEncrypt.innerHTML = '<span>⏳ Đang mã hóa & nén tệp...</span>';
        resultBox.classList.add('hidden');

        let fileBuffer;
        let fileName;

        // Nếu chọn nhiều file -> tự động nén ZIP
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

        // Tạo khóa AES-GCM 256-bit
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

        // Xuất khóa thô
        const exportedKey = await window.crypto.subtle.exportKey('raw', cryptoKey);
        const secretKeyHex = bufferToHex(exportedKey);

        // Đóng gói Header: Tên tệp + IV + Dữ liệu mã hóa
        const encoder = new TextEncoder();
        const nameBytes = encoder.encode(fileName);
        const nameLen = nameBytes.length;

        const payload = new Uint8Array(1 + nameLen + 12 + encryptedData.byteLength);
        payload[0] = nameLen;
        payload.set(nameBytes, 1);
        payload.set(iv, 1 + nameLen);
        payload.set(new Uint8Array(encryptedData), 1 + nameLen + 12);

        // Gửi tệp mã hóa lên Server
        btnEncrypt.innerHTML = '<span>⏳ Đang tải tệp lên server...</span>';
        const response = await fetch('/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: payload
        });

        if (!response.ok) throw new Error('Không thể tải tệp lên server');
        const data = await response.json();
        const fileId = data.fileId;

        // Lưu lịch sử gửi
        saveToUploadHistory(fileId, secretKeyHex, fileName);

        // Hiển thị kết quả
        resultBox.innerHTML = `
            <div style="color: #4ade80; font-weight: 600; margin-bottom: 8px;">Tải lên & Mã hóa thành công!</div>
            <div style="margin-bottom: 6px;"><b>Mã Tệp (File ID):</b> <code style="color:#818cf8;">${fileId}</code></div>
            <div><b>Khóa Giải Mã (Secret Key):</b> <code style="color:#f43f5e;">${secretKeyHex}</code></div>
        `;
        resultBox.classList.remove('hidden');

    } catch (err) {
        alert('Lỗi: ' + err.message);
    } finally {
        btnEncrypt.disabled = false;
        btnEncrypt.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>Mã Hóa & Gửi Tệp</span>
        `;
    }
}

// Tải về và Giải mã
async function downloadAndDecrypt() {
    const fileId = document.getElementById('fileIdInput').value.trim();
    const keyHex = document.getElementById('keyInput').value.trim();
    const resultBox = document.getElementById('downloadResult');
    const btnDecrypt = document.getElementById('btnDecrypt');

    if (!fileId || !keyHex) {
        alert('Vui lòng nhập đầy đủ Mã Tệp và Khóa Giải Mã!');
        return;
    }

    try {
        btnDecrypt.disabled = true;
        btnDecrypt.innerHTML = '<span>⏳ Đang tải tệp về...</span>';
        resultBox.classList.add('hidden');

        const response = await fetch(`/file/${fileId}`);
        if (!response.ok) throw new Error('Không tìm thấy tệp hoặc tệp đã bị xóa sau 24h');

        const encryptedBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(encryptedBuffer);

        // Bóc tách Header
        const nameLen = bytes[0];
        const nameBytes = bytes.slice(1, 1 + nameLen);
        const fileName = new TextDecoder().decode(nameBytes);
        const iv = bytes.slice(1 + nameLen, 1 + nameLen + 12);
        const ciphertext = bytes.slice(1 + nameLen + 12);

        // Nhập khóa giải mã
        const rawKey = hexToBuffer(keyHex);
        const cryptoKey = await window.crypto.subtle.importKey(
            'raw',
            rawKey,
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        );

        // Giải mã
        btnDecrypt.innerHTML = '<span>⏳ Đang giải mã tệp...</span>';
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            cryptoKey,
            ciphertext
        );

        // Tự động kích hoạt tải xuống
        const blob = new Blob([decryptedBuffer]);
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(downloadUrl);

        // Lưu lịch sử nhận
        saveToReceiveHistory(fileId, keyHex, fileName);

        resultBox.innerHTML = `<div style="color: #4ade80; font-weight: 600;">Giải mã & Tải về thành công: <b>${fileName}</b></div>`;
        resultBox.classList.remove('hidden');

    } catch (err) {
        alert('Giải mã thất bại: Mã tệp hoặc Khóa giải mã không chính xác!');
    } finally {
        btnDecrypt.disabled = false;
        btnDecrypt.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            <span>Tải Về & Giải Mã</span>
        `;
    }
}

// --- QUẢN LÝ LỊCH SỬ GỬI ---
function saveToUploadHistory(fileId, key, fileName) {
    let history = JSON.parse(localStorage.getItem('uploadHistory') || '[]');
    history.unshift({
        fileId: fileId,
        key: key,
        fileName: fileName,
        timestamp: new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN')
    });
    localStorage.setItem('uploadHistory', JSON.stringify(history));
    loadLocalHistory();
}

function loadLocalHistory() {
    const container = document.getElementById('historyTableContainer');
    if (!container) return;

    const history = JSON.parse(localStorage.getItem('uploadHistory') || '[]');
    if (history.length === 0) {
        container.innerHTML = `<p style="color: #64748b; font-size: 0.85rem; text-align: center; padding: 10px 0;">Bạn chưa gửi tệp nào trên thiết bị này.</p>`;
        return;
    }

    let html = `
    <table style="width: 100%; font-size: 0.85rem; color: #f1f5f9; border-collapse: collapse;">
        <thead>
            <tr style="text-align: left; color: #94a3b8; border-bottom: 1px solid #1e293b;">
                <th style="padding: 8px;">Mã Tệp (File ID)</th>
                <th style="padding: 8px;">Khóa Giải Mã</th>
                <th style="padding: 8px;">Thời Gian</th>
                <th style="padding: 8px; text-align: center;">Xóa</th>
            </tr>
        </thead>
        <tbody>`;

    history.forEach((item, index) => {
        const shortId = item.fileId.length > 10 ? item.fileId.substring(0, 8) + '...' : item.fileId;
        const shortKey = item.key.length > 10 ? item.key.substring(0, 8) + '...' : item.key;

        html += `
        <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 8px; font-family: monospace; color: #818cf8;">${shortId}</td>
            <td style="padding: 8px; font-family: monospace; color: #f43f5e;">${shortKey}</td>
            <td style="padding: 8px; color: #94a3b8;">${item.timestamp}</td>
            <td style="padding: 8px; text-align: center;">
                <button class="btn-delete-item" onclick="deleteUploadHistoryItem(${index})" title="Xóa dòng này">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </td>
        </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

// Xóa sạch toàn bộ lịch sử gửi khi bấm nút Làm mới
function clearUploadHistory() {
    if (confirm("Bạn có chắc chắn muốn xóa sạch toàn bộ lịch sử đã gửi không?")) {
        localStorage.removeItem('uploadHistory');
        loadLocalHistory();
    }
}

function deleteUploadHistoryItem(index) {
    let history = JSON.parse(localStorage.getItem('uploadHistory') || '[]');
    history.splice(index, 1);
    localStorage.setItem('uploadHistory', JSON.stringify(history));
    loadLocalHistory();
}

// --- QUẢN LÝ LỊCH SỬ NHẬN ---
function saveToReceiveHistory(fileId, key, fileName) {
    let history = JSON.parse(localStorage.getItem('receiveHistory') || '[]');
    history.unshift({
        fileId: fileId,
        key: key,
        fileName: fileName,
        timestamp: new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN')
    });
    localStorage.setItem('receiveHistory', JSON.stringify(history));
    loadReceiveHistory();
}

function loadReceiveHistory() {
    const container = document.getElementById('receiveHistoryTableContainer');
    if (!container) return;

    const history = JSON.parse(localStorage.getItem('receiveHistory') || '[]');
    if (history.length === 0) {
        container.innerHTML = `<p style="color: #64748b; font-size: 0.85rem; text-align: center; padding: 10px 0;">Bạn chưa nhận tệp nào trên thiết bị này.</p>`;
        return;
    }

    let html = `
    <table style="width: 100%; font-size: 0.85rem; color: #f1f5f9; border-collapse: collapse;">
        <thead>
            <tr style="text-align: left; color: #94a3b8; border-bottom: 1px solid #1e293b;">
                <th style="padding: 8px;">Mã Tệp (File ID)</th>
                <th style="padding: 8px;">Khóa Giải Mã</th>
                <th style="padding: 8px;">Thời Gian</th>
                <th style="padding: 8px; text-align: center;">Xóa</th>
            </tr>
        </thead>
        <tbody>`;

    history.forEach((item, index) => {
        const shortId = item.fileId.length > 10 ? item.fileId.substring(0, 8) + '...' : item.fileId;
        const shortKey = item.key ? (item.key.length > 10 ? item.key.substring(0, 8) + '...' : item.key) : '---';

        html += `
        <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 8px; font-family: monospace; color: #818cf8;">${shortId}</td>
            <td style="padding: 8px; font-family: monospace; color: #f43f5e;">${shortKey}</td>
            <td style="padding: 8px; color: #94a3b8;">${item.timestamp}</td>
            <td style="padding: 8px; text-align: center;">
                <button class="btn-delete-item" onclick="deleteReceiveHistoryItem(${index})" title="Xóa dòng này">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </td>
        </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

// Xóa sạch toàn bộ lịch sử nhận khi bấm nút Làm mới
function clearReceiveHistory() {
    if (confirm("Bạn có chắc chắn muốn xóa sạch toàn bộ lịch sử đã nhận không?")) {
        localStorage.removeItem('receiveHistory');
        loadReceiveHistory();
    }
}

function deleteReceiveHistoryItem(index) {
    let history = JSON.parse(localStorage.getItem('receiveHistory') || '[]');
    history.splice(index, 1);
    localStorage.setItem('receiveHistory', JSON.stringify(history));
    loadReceiveHistory();
}
