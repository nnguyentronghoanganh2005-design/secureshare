let selectedFile = null;

// Tải lịch sử riêng từ LocalStorage của máy người gửi
function loadLocalHistory() {
    const container = document.getElementById('historyTableContainer');
    if (!container) return;

    const history = JSON.parse(localStorage.getItem('my_sent_files') || '[]');

    if (history.length === 0) {
        container.innerHTML = '<p style="color: #94a3b8; font-size: 0.85rem;">Bạn chưa gửi tệp nào trên thiết bị này.</p>';
        return;
    }

    let html = `
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.8rem; color: #cbd5e1; white-space: nowrap;">
            <thead>
                <tr style="border-bottom: 1px solid #334155; color: #94a3b8;">
                    <th style="padding: 8px 4px;">Mã Tệp (File ID)</th>
                    <th style="padding: 8px 4px;">Khóa Giải Mã (Secret Key)</th>
                    <th style="padding: 8px 4px;">Thời Gian</th>
                </tr>
            </thead>
            <tbody>
    `;

    history.forEach(item => {
        html += `
            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                <td style="padding: 8px 4px;"><code style="color: #818cf8;">${item.fileId.substring(0, 10)}...</code></td>
                <td style="padding: 8px 4px;"><code style="color: #f43f5e;">${item.secretKey.substring(0, 10)}...</code></td>
                <td style="padding: 8px 4px; color: #94a3b8;">${item.date}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// Lưu lịch sử gửi tệp vào LocalStorage
function saveToLocalHistory(fileId, secretKey) {
    const history = JSON.parse(localStorage.getItem('my_sent_files') || '[]');
    const newItem = {
        fileId: fileId,
        secretKey: secretKey,
        date: new Date().toLocaleString('vi-VN')
    };
    history.unshift(newItem);
    localStorage.setItem('my_sent_files', JSON.stringify(history));
    loadLocalHistory();
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('uploadTab').classList.add('hidden');
    document.getElementById('downloadTab').classList.add('hidden');

    if (tabName === 'upload') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('uploadTab').classList.remove('hidden');
    } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('downloadTab').classList.remove('hidden');
    }
}

function handleFileSelect(file) {
    if (file) {
        selectedFile = file;
        document.getElementById('fileNameDisplay').innerText = `📄 ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    }
}

// Xử lý Kéo / Thả tệp
const dropZone = document.querySelector('.drop-zone');
if (dropZone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, e => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    dropZone.addEventListener('drop', e => {
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFileSelect(files[0]);
    });
}

// Mã hóa và Tải tệp lên
async function encryptAndUpload() {
    const resBox = document.getElementById('uploadResult');
    if (!selectedFile) {
        alert("Vui lòng chọn tệp trước khi gửi!");
        return;
    }

    try {
        resBox.classList.remove('hidden');
        resBox.innerHTML = '<span style="color:#818cf8;">⏳ Đang mã hóa và tải tệp lên...</span>';

        const fileBuffer = await selectedFile.arrayBuffer();
        const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const nameBytes = new TextEncoder().encode(selectedFile.name);
        const nameLen = new Uint8Array([nameBytes.length]);
        const combinedHeader = new Uint8Array(12 + 1 + nameBytes.length);
        combinedHeader.set(iv, 0);
        combinedHeader.set(nameLen, 12);
        combinedHeader.set(nameBytes, 13);

        const encryptedData = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, fileBuffer);
        const finalPayload = new Blob([combinedHeader, encryptedData]);
        
        const rawKeyBytes = await crypto.subtle.exportKey("raw", key);
        const secretKeyHex = Array.from(new Uint8Array(rawKeyBytes)).map(b => b.toString(16).padStart(2, '0')).join('');

        const formData = new FormData();
        formData.append('encryptedFile', finalPayload);

        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();

        if (res.ok) {
            resBox.innerHTML = `
                <div style="color: #4ade80; font-weight: 600; margin-bottom: 8px;">✅ Tải lên thành công!</div>
                <div><strong>Mã Tệp (File ID):</strong> <code style="color: #cbd5e1;">${data.fileId}</code></div>
                <div style="margin-top: 4px;"><strong>Khóa Giải Mã (Secret Key):</strong> <code style="color: #f43f5e;">${secretKeyHex}</code></div>
            `;
            
            saveToLocalHistory(data.fileId, secretKeyHex);
        } else {
            throw new Error(data.error || 'Lỗi tải tệp');
        }
    } catch (err) {
        resBox.innerHTML = `<span style="color:#ef4444;">❌ Lỗi: ${err.message}</span>`;
    }
}

// Tải về và Giải mã
async function downloadAndDecrypt() {
    const fileId = document.getElementById('fileIdInput').value.trim();
    const secretKeyHex = document.getElementById('keyInput').value.trim();
    const resBox = document.getElementById('downloadResult');

    if (!fileId || !secretKeyHex) {
        alert("Vui lòng nhập đầy đủ Mã Tệp và Khóa Giải Mã!");
        return;
    }

    try {
        resBox.classList.remove('hidden');
        resBox.innerHTML = '<span style="color:#818cf8;">⏳ Đang tải tệp về và giải mã...</span>';

        const res = await fetch(`/api/download/${fileId}`);
        if (!res.ok) throw new Error('Không tìm thấy tệp.');

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

        resBox.innerHTML = `<span style="color:#4ade80;">✅ Tải về thành công: <strong>${fileName}</strong></span>`;
    } catch (err) {
        resBox.innerHTML = `<span style="color:#ef4444;">❌ Giải mã thất bại! Kiểm tra lại thông tin.</span>`;
    }
}

document.addEventListener('DOMContentLoaded', loadLocalHistory);