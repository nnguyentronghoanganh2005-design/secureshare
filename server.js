
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Tạo thư mục lưu tệp mã hóa nếu chưa tồn tại
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.static('public'));

// API Tải tệp mã hóa lên (Server không nhận và không lưu khóa)
app.post('/api/upload', upload.single('encryptedFile'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Chưa có tệp được tải lên' });
    res.json({ fileId: req.file.filename });
});

// API Tải tệp mã hóa về
app.get('/api/download/:fileId', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.fileId);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Không tìm thấy tệp' });
    res.download(filePath, 'encrypted.bin');
});

// Chạy server lắng nghe tất cả giao diện mạng (0.0.0.0 hỗ trợ truy cập từ điện thoại)
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running at http://localhost:${PORT}`));
