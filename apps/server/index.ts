import express, { Request, Response } from 'express';
import multer from 'multer';
import { BlobServiceClient, BlobSASPermissions, StorageSharedKeyCredential } from '@azure/storage-blob';
import dotenv from 'dotenv';
const bcrypt = require("bcrypt");
const { connectDb, Vault, FileVault } = require('./config/dbConnection');
const cors = require('cors')

const axios = require('axios');

import { hashPassword, comparePassword } from './auth';
import { error } from 'console';

dotenv.config();
connectDb();

const app = express();
const upload = multer({ limits: { fileSize: 1024 * 1024 * 2048 } }); 

app.use(cors());
app.use(express.json())

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

const crypto = require('crypto'); 

async function generateUniqueVaultCode() {
  const codeLength = 2; 
  let vaultCode;

  do {
    vaultCode = crypto.randomBytes(codeLength).toString('hex').toUpperCase(); 
  } while (await Vault.findOne({ vaultCode })); 

  return vaultCode;
}

app.post('/verify', async (req: any, res: any) => {
    try {
        console.log(`req.body: ${req.body}`)
        const { vaultCode, password } = req.body;

        if (!vaultCode || !password) {
            return res.status(400).json({ error: "Missing vaultCode or password" }); 
        }
        const vault = await Vault.findOne({ vaultCode });
        if (!vault) {
            throw new Error("Vault not found")
        }
        if (vault?.passwordHash && (await bcrypt.compare(password, vault.passwordHash))) {
            res.status(200).json({ ok: true })
        } else {
            res.status(200).json({ ok: false })
        }

    } catch (err) {
        console.error("Error in /verify", err);
        res.status(404)
    }
}) 

app.post('/upload', upload.array('files'), async (req: any, res: any) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        console.log(req.body)

        const password = req.body.password || '';
        const passwordHash = password ? await bcrypt.hash(password, 10) : undefined; // Hash only if password provided
        const vaultCode = await generateUniqueVaultCode();
        const duration = parseInt(req.body.duration as string); // Type assertion for duration

        if (isNaN(duration) || duration < 5 || duration > 1440) {
            return res.status(400).json({ error: "Duration must be between 5 and 1440 minutes" });
        }

        const expireAt = new Date(Date.now() + duration * 60 * 1000);

        let vault: any;
        try {
            vault = await Vault.create({
                vaultCode,
                passwordHash,
                duration,
                expireAt
            });
            console.log("Response from creating vault", vault);
        } catch (err) {
            console.error("Error adding vault info in mongodb", err);
            return res.status(500).json({ error: "Error creating vault" }); // Return error response
        }

        const uploadPromises = (req.files as Express.Multer.File[]).map(async (file: Express.Multer.File) => { // Type assertion for req.files and file
            const blobName = file.originalname;
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            const stream = file.buffer;

            const permissions = new BlobSASPermissions();
            permissions.read = true;

            try {
                await blockBlobClient.uploadData(stream);

                const sasToken = await blockBlobClient.generateSasUrl({
                    permissions,
                    expiresOn: expireAt // Use the same expireAt for SAS token
                });

                try {
                    const newFileVault = await FileVault.create({
                        vault_id: vault._id,
                        vaultCode,
                        fileName: blobName,
                        fileURL: sasToken
                    });
                    console.log("Response from adding file in Vault", newFileVault);
                } catch (err) {
                    console.error("Error adding file info in mongodb", err);
                }

                return { message: 'File uploaded successfully', fileName: blobName, url: sasToken, expiresAt: expireAt, success: true };
            } catch (uploadError) {
                console.error(`Error uploading ${blobName}:`, uploadError);
                return { message: `Error uploading ${blobName}: ${(uploadError as Error).message}`, fileName: blobName, success: false };
            }
        });

        const results = await Promise.all(uploadPromises);

        res.status(200).json({ results, vaultCode });

    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: (error as Error).message });
    }
});


app.get('/files/:vaultCode', async (req: any, res: any) => {
    try {
        const { vaultCode } = req.params;
        const providedPasswordHash = req.query.passwordHash as string | undefined; // Type assertion and optional

        const vault = await Vault.findOne({ vaultCode });

        if (!vault) {
            return res.status(404).json({ error: 'Vault not found' });
        }

        if (vault.expireAt && vault.expireAt < new Date()) {
            return res.status(400).json({ error: 'Vault has expired' });
        }

        if (vault.passwordHash) {
            if (!providedPasswordHash || !(await bcrypt.compare(providedPasswordHash, vault.passwordHash))) {
                return res.status(403).json({ error: 'Password is missing or invalid' });
            }
        }

        const files: (any)[] = await FileVault.find({ vault_id: vault._id });
        const plainFiles: any[] = files.map((file: any) => file.toObject() as any);

        return res.status(200).json({ plainFiles, expireAt: vault.expireAt});

    } catch (err) {
        console.error('File retrieval error:', err); // Corrected error variable
        res.status(500).json({ error: 'File retrieval error' });
    }
});

const PORT: number = parseInt(process.env.PORT || '4000');
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
