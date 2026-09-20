const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Tạo thư mục lưu tệp mã hóa nếu chưa tồn tại
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình Multer (Thêm giới hạn 300MB để tránh tràn RAM trên Render Free)
const upload = multer({ 
    dest: uploadDir,
    limits: { fileSize: 300 * 1024 * 1024 } 
});

// =========================================================================
// 🔄 DỌN DẸP TỆP HẾT HẠN SAU 24 GIỜ
// =========================================================================
const FILE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 giờ tính theo millisecond

function autoCleanupExpiredFiles() {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            console.error('[CleanUp Error]', err);
            return;
        }

        const now = Date.now();
        files.forEach(file => {
            const filePath = path.join(uploadDir, file);
            fs.stat(filePath, (err, stats) => {
                if (err) return;

                // Nếu thời gian sửa đổi (mtime) cũ hơn 24 giờ thì xóa
                if (now - stats.mtimeMs > FILE_MAX_AGE_MS) {
                    fs.unlink(filePath, unlinkErr => {
                        if (!unlinkErr) {
                            console.log(`[CleanUp] Đã xóa file hết hạn: ${file}`);
                        }
                    });
                }
            });
        });
    });
}

// Lập lịch quét dọn mỗi 1 giờ
setInterval(autoCleanupExpiredFiles, 60 * 60 * 1000);
// Chạy quét dọn 1 lần ngay khi khởi động server
autoCleanupExpiredFiles();

// =========================================================================
// MIDDLEWARE & ROUTES
// =========================================================================
app.use(express.json());

// Định vị chính xác thư mục giao diện tĩnh
app.use(express.static(path.join(__dirname, 'public')));

// Trả về trang index.html cho trang chủ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Tải tệp mã hóa lên (Server không nhận và không lưu khóa)
app.post('/api/upload', upload.single('encryptedFile'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Chưa có tệp được tải lên' });
    res.json({ fileId: req.file.filename });
});

// API Tải tệp mã hóa về
app.get('/api/download/:fileId', (req, res) => {
    const filePath = path.join(uploadDir, req.params.fileId);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Không tìm thấy tệp hoặc tệp đã tự xóa sau 24h' });
    }
    res.download(filePath, 'encrypted.bin');
});

// Chạy server
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running at http://localhost:${PORT}`));
