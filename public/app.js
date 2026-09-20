let selectedFiles = []; // Lưu trữ danh sách tệp đã chọn

// Sao chép văn bản vào clipboard
function copyToClipboard(text, label) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        alert(`Đã sao chép ${label} đầy đủ vào bộ nhớ tạm!`);
    }).catch(err => {
        console.error('Lỗi sao chép:', err);
    });
}

// ------------------- LỊCH SỬ GỬI TỆP -------------------

const EXPIRE_MS = 24 * 60 * 60 * 1000; // 24 giờ

function deleteSentHistory(fileId) {
    let history = JSON.parse(localStorage.getItem('my_sent_files') || '[]');
    history = history.filter(item => item.fileId !== fileId);
    localStorage.setItem('my_sent_files', JSON.stringify(history));
    loadLocalHistory();
}

function loadLocalHistory(isManual = false) {
    const container = document.getElementById('historyTableContainer');
    if (!container) return;

    const history = JSON.parse(localStorage.getItem('my_sent_files') || '[]');
    const NOW = Date.now();

    if (history.length === 0) {
        container.innerHTML = '<p style="color: #94a3b8; font-size: 0.85rem;">Bạn chưa gửi tệp nào trên thiết bị này.</p>';
    } else {
        let html = `
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.8rem; color: #cbd5e1; table-layout: fixed;">
                <thead>
                    <tr style="border-bottom: 1px solid #1e293b; color: #94a3b8;">
                        <th style="padding: 8px 4px; width: 28%;">Mã Tệp (File ID)</th>
                        <th style="padding: 8px 4px; width: 28%;">Khóa Giải Mã</th>
                        <th style="padding: 8px 4px; width: 34%;">Trạng Thái / Thời Gian</th>
                        <th style="padding: 8px 4px; width: 10%; text-align: center;">Xóa</th>
                    </tr>
                </thead>
                <tbody>
        `;

        history.forEach(item => {
            const shortFileId = item.fileId ? (item.fileId.length > 10 ? item.fileId.substring(0, 8) + '...' : item.fileId) : '';
            const shortKey = item.secretKey ? (item.secretKey.length > 10 ? item.secretKey.substring(0, 8) + '...' : item.secretKey) : '';

            // Kiểm tra trạng thái hết hạn 24h
            const isExpired = item.timestamp ? (NOW - item.timestamp > EXPIRE_MS) : false;
            const statusText = isExpired 
                ? '<span style="color: #ef4444; font-weight: 500;">🔴 Đã hết hạn</span>' 
                : '<span style="color: #4ade80; font-weight: 500;">🟢 Còn hạn</span>';
            const rowOpacity = isExpired ? 'opacity: 0.5;' : '';

            html += `
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05); ${rowOpacity}">
                    <td style="padding: 8px 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="Bấm để copy Mã tệp đầy đủ: ${item.fileId}">
                        <code style="color: #818cf8; cursor: pointer; background: rgba(129, 140, 248, 0.1); padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;" onclick="copyToClipboard('${item.fileId}', 'Mã Tệp')">
                            ${shortFileId}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </code>
                    </td>
                    <td style="padding: 8px 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="Bấm để copy Khóa giải mã đầy đủ: ${item.secretKey}">
                        <code style="color: #f43f5e; cursor: pointer; background: rgba(244, 63, 94, 0.1); padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;" onclick="copyToClipboard('${item.secretKey}', 'Khóa Giải Mã')">
                            ${shortKey}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </code>
                    </td>
                    <td style="padding: 8px 4px; color: #94a3b8; font-size: 0.78rem;">
                        <div>${statusText}</div>
                        <div style="font-size: 0.72rem; opacity: 0.8;">${item.date}</div>
                    </td>
                    <td style="padding: 8px 4px; text-align: center;">
                        <button onclick="deleteSentHistory('${item.fileId}')" title="Xóa dòng này" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 2px; display: inline-flex; align-items: center; justify-content: center;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    if (isManual) alert("Đã cập nhật lại lịch sử gửi!");
}

function saveToLocalHistory(fileId, secretKey) {
    const history = JSON.parse(localStorage.getItem('my_sent_files') || '[]');
    const newItem = {
        fileId: fileId,
        secretKey: secretKey,
        timestamp: Date.now(), // Thêm timestamp để tính hết hạn 24h
        date: new Date().toLocaleString('vi-VN')
    };
    history.unshift(newItem);
    localStorage.setItem('my_sent_files', JSON.stringify(history));
    loadLocalHistory();
}

// ------------------- LỊCH SỬ NHẬN TỆP -------------------

function deleteReceiveHistory(fileId) {
    let history = JSON.parse(localStorage.getItem('my_received_files') || '[]');
    history = history.filter(item => item.fileId !== fileId);
    localStorage.setItem('my_received_files', JSON.stringify(history));
    loadReceiveHistory();
}

function loadReceiveHistory(isManual = false) {
    const container = document.getElementById('receiveHistoryTableContainer');
    if (!container) return;

    const history = JSON.parse(localStorage.getItem('my_received_files') || '[]');

    if (history.length === 0) {
        container.innerHTML = '<p style="color: #94a3b8; font-size: 0.85rem;">Bạn chưa nhận tệp nào trên thiết bị này.</p>';
    } else {
        let html = `
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.8rem; color: #cbd5e1; table-layout: fixed;">
                <thead>
                    <tr style="border-bottom: 1px solid #1e293b; color: #94a3b8;">
                        <th style="padding: 8px 4px; width: 32%;">Mã Tệp (File ID)</th>
                        <th style="padding: 8px 4px; width: 32%;">Khóa Giải Mã</th>
                        <th style="padding: 8px 4px; width: 26%;">Thời Gian</th>
                        <th style="padding: 8px 4px; width: 10%; text-align: center;">Xóa</th>
                    </tr>
                </thead>
                <tbody>
        `;

        history.forEach(item => {
            const shortFileId = item.fileId ? (item.fileId.length > 10 ? item.fileId.substring(0, 8) + '...' : item.fileId) : '';
            const shortKey = item.secretKey ? (item.secretKey.length > 10 ? item.secretKey.substring(0, 8) + '...' : item.secretKey) : '';

            html += `
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                    <td style="padding: 8px 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="Bấm để copy Mã tệp đầy đủ: ${item.fileId}">
                        <code style="color: #818cf8; cursor: pointer; background: rgba(129, 140, 248, 0.1); padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;" onclick="copyToClipboard('${item.fileId}', 'Mã Tệp')">
                            ${shortFileId}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </code>
                    </td>
                    <td style="padding: 8px 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="Bấm để copy Khóa giải mã đầy đủ: ${item.secretKey}">
                        <code style="color: #f43f5e; cursor: pointer; background: rgba(244, 63, 94, 0.1); padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;" onclick="copyToClipboard('${item.secretKey}', 'Khóa Giải Mã')">
                            ${shortKey}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </code>
                    </td>
                    <td style="padding: 8px 4px; color: #94a3b8; font-size: 0.78rem; white-space: nowrap;">${item.date}</td>
                    <td style="padding: 8px 4px; text-align: center;">
                        <button onclick="deleteReceiveHistory('${item.fileId}')" title="Xóa dòng này" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 2px; display: inline-flex; align-items: center; justify-content: center;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    if (isManual) alert("Đã cập nhật lại lịch sử nhận!");
}

function saveToReceiveHistory(fileId, secretKey) {
    let history = JSON.parse(localStorage.getItem('my_received_files') || '[]');
    const newItem = {
        fileId: fileId,
        secretKey: secretKey,
        date: new Date().toLocaleString('vi-VN')
    };

    history = history.filter(item => item.fileId !== fileId);
    history.unshift(newItem);

    localStorage.setItem('my_received_files', JSON.stringify(history));
    loadReceiveHistory();
}

// ------------------- TÁC VỤ TAB & UPLOAD/DOWNLOAD -------------------

function switchTab(tabName) {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const uploadSection = document.getElementById('uploadSection');
    const downloadSection = document.getElementById('downloadSection');

    tabButtons.forEach(btn => btn.classList.remove('active'));

    if (tabName === 'upload') {
        if (tabButtons[0]) tabButtons[0].classList.add('active');
        if (uploadSection) uploadSection.classList.remove('hidden');
        if (downloadSection) downloadSection.classList.add('hidden');
        loadLocalHistory();
    } else {
        if (tabButtons[1]) tabButtons[1].classList.add('active');
        if (uploadSection) uploadSection.classList.add('hidden');
        if (downloadSection) downloadSection.classList.remove('hidden');
        loadReceiveHistory();
    }
}

function handleFileSelect(files) {
    if (!files) return;
    
    // Nếu truyền 1 File đơn (từ input hoặc drop)
    if (files instanceof File) {
        selectedFiles = [files];
    } else if (files.length > 0) {
        selectedFiles = Array.from(files);
    }

    if (selectedFiles.length > 0) {
        const totalSizeMB = (selectedFiles.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2);
        const nameDisplay = document.getElementById('fileNameDisplay');
        if (nameDisplay) {
            if (selectedFiles.length === 1) {
                nameDisplay.innerText = `📄 ${selectedFiles[0].name} (${totalSizeMB} MB)`;
            } else {
                nameDisplay.innerText = `📦 Đã chọn ${selectedFiles.length} tệp (Tổng: ${totalSizeMB} MB)`;
            }
        }
    }
}

const dropZone = document.querySelector('.drop-zone') || document.querySelector('.upload-area');
if (dropZone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, e => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    dropZone.addEventListener('drop', e => {
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFileSelect(files);
    });
}

// MÃ HÓA VÀ UPLOAD
async function encryptAndUpload() {
    const resBox = document.getElementById('uploadResult');
    const btnUpload = document.getElementById('btnEncrypt') || document.querySelector('#uploadSection button.btn-primary');

    if (!selectedFiles || selectedFiles.length === 0) {
        alert("Vui lòng chọn tệp trước khi gửi!");
        return;
    }

    const totalBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);
    if (totalBytes > 250 * 1024 * 1024) {
        alert("Tổng dung lượng tệp quá lớn (>250MB). Vui lòng chọn tệp nhỏ hơn!");
        return;
    }

    try {
        // 1. Khóa nút bấm & Hiện thông báo tiến trình
        if (btnUpload) {
            btnUpload.disabled = true;
            btnUpload.style.opacity = '0.6';
            btnUpload.style.cursor = 'not-allowed';
        }

        resBox.classList.remove('hidden');
        resBox.innerHTML = '<span style="color:#818cf8;">⏳ 1/3 Đang chuẩn bị tệp...</span>';

        let targetBuffer;
        let targetFileName;

        // Xử lý nén nếu có nhiều tệp và thư viện JSZip tồn tại
        if (selectedFiles.length > 1 && typeof JSZip !== 'undefined') {
            const zip = new JSZip();
            selectedFiles.forEach(file => zip.file(file.name, file));
            const zipBlob = await zip.generateAsync({ type: "blob" });
            targetBuffer = await zipBlob.arrayBuffer();
            targetFileName = `Archive_${Date.now()}.zip`;
        } else {
            targetBuffer = await selectedFiles[0].arrayBuffer();
            targetFileName = selectedFiles[0].name;
        }

        // 2. Mã hóa E2EE ngay trên trình duyệt
        resBox.innerHTML = '<span style="color:#818cf8;">🔐 2/3 Đang mã hóa E2EE (AES-256)...</span>';

        const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const nameBytes = new TextEncoder().encode(targetFileName);
        const nameLen = new Uint8Array([nameBytes.length]);
        const combinedHeader = new Uint8Array(12 + 1 + nameBytes.length);
        combinedHeader.set(iv, 0);
        combinedHeader.set(nameLen, 12);
        combinedHeader.set(nameBytes, 13);

        const encryptedData = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, targetBuffer);
        const finalPayload = new Blob([combinedHeader, encryptedData]);

        const rawKeyBytes = await crypto.subtle.exportKey("raw", key);
        const secretKeyHex = Array.from(new Uint8Array(rawKeyBytes)).map(b => b.toString(16).padStart(2, '0')).join('');

        // 3. Tải tệp mã hóa lên server
        resBox.innerHTML = '<span style="color:#818cf8;">🚀 3/3 Đang tải tệp lên máy chủ...</span>';

        const formData = new FormData();
        formData.append('encryptedFile', finalPayload);

        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();

        if (res.ok) {
            resBox.innerHTML = `
                <div style="color: #4ade80; font-weight: 600; margin-bottom: 8px;">✅ Tải lên thành công! (Tệp tự xóa sau 24h)</div>
                <div style="margin-bottom: 6px;"><strong>Mã Tệp (File ID):</strong> <code style="color: #cbd5e1; cursor: pointer; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;" onclick="copyToClipboard('${data.fileId}', 'Mã Tệp')">${data.fileId} 📋</code></div>
                <div><strong>Khóa Giải Mã (Secret Key):</strong> <code style="color: #f43f5e; cursor: pointer; background: rgba(244, 63, 94, 0.1); padding: 2px 6px; border-radius: 4px;" onclick="copyToClipboard('${secretKeyHex}', 'Khóa Giải Mã')">${secretKeyHex} 📋</code></div>
            `;

            saveToLocalHistory(data.fileId, secretKeyHex);
        } else {
            throw new Error(data.error || 'Lỗi tải tệp lên máy chủ');
        }
    } catch (err) {
        resBox.innerHTML = `<span style="color:#ef4444;">❌ Lỗi: ${err.message}</span>`;
    } finally {
        // Mở lại nút bấm
        if (btnUpload) {
            btnUpload.disabled = false;
            btnUpload.style.opacity = '1';
            btnUpload.style.cursor = 'pointer';
        }
    }
}

// DOWNLOAD VÀ GIẢI MÃ
async function downloadAndDecrypt() {
    const fileId = document.getElementById('fileIdInput').value.trim();
    const secretKeyHex = document.getElementById('keyInput').value.trim();
    const resBox = document.getElementById('downloadResult');
    const btnDecrypt = document.getElementById('btnDecrypt') || document.querySelector('#downloadSection button.btn-primary');

    if (!fileId || !secretKeyHex) {
        alert("Vui lòng nhập đầy đủ Mã Tệp và Khóa Giải Mã!");
        return;
    }

    try {
        // Khóa nút bấm
        if (btnDecrypt) {
            btnDecrypt.disabled = true;
            btnDecrypt.style.opacity = '0.6';
            btnDecrypt.style.cursor = 'not-allowed';
        }

        resBox.classList.remove('hidden');
        resBox.innerHTML = '<span style="color:#818cf8;">⏳ 1/2 Đang tải tệp mã hóa từ máy chủ...</span>';

        const res = await fetch(`/api/download/${fileId}`);
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || 'Không tìm thấy tệp hoặc tệp đã bị xóa sau 24h.');
        }

        resBox.innerHTML = '<span style="color:#818cf8;">🔓 2/2 Đang giải mã dữ liệu E2EE...</span>';

        const buffer = await res.arrayBuffer();
        const iv = buffer.slice(0, 12);
        const nameLen = new Uint8Array(buffer.slice(12, 13))[0];
        const fileName = new TextDecoder().decode(buffer.slice(13, 13 + nameLen));
        const encryptedData = buffer.slice(13 + nameLen);

        const bytes = new Uint8Array(secretKeyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        const key = await crypto.subtle.importKey("raw", bytes.buffer, "AES-GCM", true, ["decrypt"]);
        const decryptedData = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(iv) }, key, encryptedData);

        const blob = new Blob([decryptedData]);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();

        resBox.innerHTML = `<span style="color:#4ade80;">✅ Giải mã & Tải về thành công: <strong>${fileName}</strong></span>`;

        saveToReceiveHistory(fileId, secretKeyHex);
    } catch (err) {
        resBox.innerHTML = `<span style="color:#ef4444;">❌ Thất bại: ${err.message}</span>`;
    } finally {
        // Mở lại nút bấm
        if (btnDecrypt) {
            btnDecrypt.disabled = false;
            btnDecrypt.style.opacity = '1';
            btnDecrypt.style.cursor = 'pointer';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadLocalHistory();
    loadReceiveHistory();
});
