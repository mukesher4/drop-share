import express, { Request, Response } from 'express';
import multer from 'multer';
import { BlobServiceClient, BlobSASPermissions, StorageSharedKeyCredential } from '@azure/storage-blob';
import dotenv from 'dotenv';
import { permission } from 'process';
const connectDb = require('./config/dbConnection');
const cors = require('cors')

const Vault = require("./models/vaultModel")

dotenv.config();
connectDb();

const app = express();
const upload = multer({ limits: { fileSize: 1024 * 1024 * 2048 } }); // 2GB limit

app.use(cors());

const account: string = process.env.ACCOUNT_NAME || '';
const containerName: string = process.env.CONTAINER || '';

const accountKey = process.env.ACCOUNT_KEY || '';

const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);

const blobServiceClient = new BlobServiceClient(
    `https://${account}.blob.core.windows.net`,
    sharedKeyCredential
);

const containerClient = blobServiceClient.getContainerClient(containerName);

interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

app.post('/upload', upload.array('files'), async (req: any, res: any) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const passwordHash = req.body.passwordHash || ''
        const vaultCode = req.body.vaultCode || ''

        let duration = parseInt(req.body.duration) || 60; 
        if (duration < 15 || duration > 1440) { 
            return res.status(400).json({ error: "Duration must be between 15 minutes and 24 hours" });
        }

        const expiryTime = new Date();
        expiryTime.setMinutes(expiryTime.getMinutes() + duration);

        const uploadPromises = req.files.map(async (file: any) => {
            const blobName = file.originalname;
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            const stream = file.buffer;

            const permissions = new BlobSASPermissions();
            permissions.read = true; 
            permissions.delete = true; 

            try {
                await blockBlobClient.uploadData(stream);

                // Generate a temporary SAS URL
                const sasToken = await blockBlobClient.generateSasUrl({
                    permissions,
                    expiresOn: expiryTime
                });

                const vault = await Vault.crete({
                    vaultCode, passwordHash, duration
                })

                return { message: 'File uploaded successfully', fileName: blobName, url: sasToken, expiresAt: expiryTime, success: true };
            } catch (uploadError) {
                console.error(`Error uploading ${blobName}:`, uploadError);
                return { message: `Error uploading ${blobName}: ${(uploadError as Error).message}`, fileName: blobName, success: false };
            }
        });

        const results = await Promise.all(uploadPromises);

        res.status(200).json({ results });

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
