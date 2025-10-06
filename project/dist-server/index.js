"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
// no types available for express-tus, use require
// eslint-disable-next-line @typescript-eslint/no-var-requires
// express-tus exports its API as default
// express-tus exports its API directly (CommonJS)
// eslint-disable-next-line @typescript-eslint/no-var-requires
// express-tus v2 exports createTusMiddleware factory
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createTusMiddleware } = require('express-tus');
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
// In-memory stores (replace with DB/queue in production)
const processingStatus = new Map();
const uploadResults = new Map();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ---------------- Tus Upload Endpoint ----------------
// All tus requests go to /uploads/*
app.all('/uploads/*', createTusMiddleware({
    directory: path_1.default.join(__dirname, 'uploads'),
    maxSize: 1024 * 1024 * 1024, // 1 GB
}));
// ---------------- Post-upload Processing -------------
// Minimal stub: client calls /process after tus completes
app.post('/process/:uploadId', async (req, res) => {
    const { uploadId } = req.params;
    processingStatus.set(uploadId, {
        upload_id: uploadId,
        status: 'PROCESSING',
        progress: 10,
        message: 'Starting AI processing',
        processing_stage: 'ocr',
    });
    // Fake async processing
    setTimeout(() => {
        processingStatus.set(uploadId, {
            upload_id: uploadId,
            status: 'COMPLETED',
            progress: 100,
            message: 'Done',
            processing_stage: 'complete',
        });
        uploadResults.set(uploadId, {
            upload_id: uploadId,
            status: 'COMPLETED',
            message: 'Processing finished',
            total_chunks: 0,
            estimated_time: '0s',
            preview_chunks: [],
            file_type: 'pdf',
            supported_operations: ['summary', 'qa'],
        });
    }, 5000);
    res.json({ ok: true, upload_id: uploadId });
});
// ---------------- Status + Result Endpoints ----------
app.get('/status/:uploadId', (req, res) => {
    const status = processingStatus.get(req.params.uploadId);
    if (!status)
        return res.status(404).json({ error: 'Not found' });
    res.json(status);
});
app.get('/result/:uploadId', (req, res) => {
    const result = uploadResults.get(req.params.uploadId);
    if (!result)
        return res.status(404).json({ error: 'Not found' });
    res.json(result);
});
// Health check
app.get('/', (_req, res) => res.send('Tus server running'));
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Tus server listening on http://localhost:${PORT}`);
});
