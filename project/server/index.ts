import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import { createTusMiddleware } from 'express-tus';
import path from 'path';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { IncomingHttpHeaders } from 'http';

// Type definitions for TUS middleware
interface TusUpload {
  id: string;
  upload_name: string;
  size: number;
  offset: number;
  metadata: Record<string, string>;
  creation_date: string;
  length: number;
}

// Type definitions for our in-memory stores
type Status = 'processing' | 'completed' | 'failed';

interface ProcessingStatus {
  status: Status;
  progress?: number;
  error?: string;
  result?: any;
  message?: string;
  processing_stage?: string;
  upload_id?: string;
}

interface UploadResult {
  id: string;
  upload_id: string;
  filename: string;
  size: number;
  mimetype?: string;
  uploadDate: Date;
  status: Status;
  message?: string;
  total_chunks?: number;
  estimated_time?: string;
  preview_chunks?: any[];
  file_type?: string;
  supported_operations?: string[];
}

// In-memory stores (replace with DB/queue in production)
const processingStatus = new Map<string, ProcessingStatus>();
const uploadResults = new Map<string, UploadResult>();

const app = express();
app.use(cors());
app.use(express.json());

// ---------------- Tus Upload Endpoint ----------------
// All tus requests go to /uploads/*
// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');

// Create uploads directory if it doesn't exist
import { existsSync, mkdirSync } from 'fs';
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

// Configure TUS middleware
app.all('/uploads/*', createTusMiddleware({
  directory: uploadsDir,
  maxSize: 1024 * 1024 * 1024, // 1 GB
  namingFunction: (req: { headers: IncomingHttpHeaders }) => {
    // Generate a unique filename for each upload
    return `${uuidv4()}-${req.headers['x-file-name']?.toString() || 'file'}`;
  },
  onUploadFinish: (req: Request, res: Response, upload: TusUpload) => {
    const fileInfo: UploadResult = {
      id: upload.id,
      upload_id: upload.id,
      filename: upload.upload_name,
      size: upload.size,
      uploadDate: new Date(),
      status: 'completed',
      message: 'Upload completed',
      total_chunks: 1,
      estimated_time: '0s',
      preview_chunks: [],
      file_type: 'unknown',
      supported_operations: []
    };
    uploadResults.set(upload.id, fileInfo);
    processingStatus.set(upload.id, { 
      status: 'completed', 
      result: fileInfo,
      progress: 100,
      message: 'Upload completed',
      processing_stage: 'uploaded'
    });
  },
  onError: (error: Error, req: Request, res: Response) => {
    console.error('TUS upload error:', error);
    const uploadId = req.params.uploadId as string;
    if (uploadId) {
      processingStatus.set(uploadId, { 
        status: 'failed', 
        error: error.message 
      });
    }
  }
}));

// ---------------- Post-upload Processing -------------
// Minimal stub: client calls /process after tus completes
app.post('/process/:uploadId', async (req: Request, res: Response) => {
  const { uploadId } = req.params;
  processingStatus.set(uploadId, {
    upload_id: uploadId,
    status: 'processing',
    progress: 10,
    message: 'Starting AI processing',
    processing_stage: 'ocr',
  });

  // Fake async processing
  setTimeout(() => {
    const result: UploadResult = {
      id: uploadId,
      upload_id: uploadId,
      filename: `processed-${uploadId}`,
      size: 0, // This would be set with actual file size
      uploadDate: new Date(),
      status: 'completed',
      message: 'Processing finished',
      total_chunks: 0,
      estimated_time: '0s',
      preview_chunks: [],
      file_type: 'pdf',
      supported_operations: ['summary', 'qa'],
    };
    
    const statusUpdate: ProcessingStatus = {
      status: 'completed',
      progress: 100,
      message: 'Done',
      processing_stage: 'complete',
      result: result
    };
    
    processingStatus.set(uploadId, statusUpdate);
    uploadResults.set(uploadId, result);
  }, 5000);

  res.json({ ok: true, upload_id: uploadId });
});

// ---------------- Status + Result Endpoints ----------
app.get('/status/:uploadId', (req: Request, res: Response) => {
  const { uploadId } = req.params;
  const status = processingStatus.get(uploadId);
  if (!status) return res.status(404).json({ error: 'Not found' });
  if (status.status === 'processing') {
    const processingStatusUpdate: ProcessingStatus = { 
      status: 'processing',
      upload_id: uploadId,
      progress: 0,
      message: 'Processing started',
      processing_stage: 'initializing'
    };
    processingStatus.set(uploadId, processingStatusUpdate);
    return res.status(202).json(processingStatusUpdate);
  }
  res.json(status);
});

app.get('/result/:uploadId', (req: Request, res: Response) => {
  const result = uploadResults.get(req.params.uploadId);
  if (!result) return res.status(404).json({ error: 'Not found' });
  res.json(result);
});

// Health check
app.get('/', (_req: express.Request, res: express.Response) => res.send('Tus server running'));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Tus server listening on http://localhost:${PORT}`);
});
