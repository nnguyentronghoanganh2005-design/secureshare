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

const upload = multer({ dest: uploadDir });

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
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Không tìm thấy tệp' });
    res.download(filePath, 'encrypted.bin');
});

// Chạy server
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running at http://localhost:${PORT}`));
