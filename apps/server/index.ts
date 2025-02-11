import express, { Request, Response } from 'express';
import multer from 'multer';
import { BlobServiceClient } from '@azure/storage-blob';
import dotenv from 'dotenv';
const connectDb = require('./config/dbConnection');

dotenv.config();
connectDb();

const app = express();
const upload = multer({ limits: { fileSize: 1024 * 1024 * 2048 } }); // 2GB limit

const account: string = process.env.ACCOUNT_NAME || '';
const sasToken: string = process.env.SAS_TOKEN || '';
const containerName: string = process.env.CONTAINER || '';

const blobServiceClient = new BlobServiceClient(`https://${account}.blob.core.windows.net/?${sasToken}`);
const containerClient = blobServiceClient.getContainerClient(containerName);

// Extend Request type to include file property
interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

// Upload file to Azure Blob Storage using stream
app.post('/upload', upload.single('file'), async (req: any, res: any) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const blobName: string = req.file.originalname;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const stream = req.file.buffer;

        await blockBlobClient.uploadData(stream);

        res.status(200).json({ message: 'File uploaded successfully', fileName: blobName });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: (error as Error).message });
    }
});

// Retrieve file from Azure Blob Storage
app.get('/download/:fileName', async (req: Request, res: Response) => {
    try {
        const blobName: string = req.params.fileName;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const downloadResponse = await blockBlobClient.download();

        res.setHeader('Content-Disposition', `attachment; filename=${blobName}`);
        res.setHeader('Content-Type', 'application/octet-stream');
        
        if (downloadResponse.readableStreamBody) {
            downloadResponse.readableStreamBody.pipe(res);
        } else {
            throw new Error("File not found or unreadable.");
        }
    } catch (error) {
        console.error("Download error:", error);
        res.status(500).json({ error: (error as Error).message });
    }
});

const PORT: number = parseInt(process.env.PORT || '4000');
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
