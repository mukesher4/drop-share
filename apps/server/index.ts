import express, { Request, Response } from 'express';
import multer from 'multer';
import { BlobServiceClient, BlobSASPermissions, StorageSharedKeyCredential } from '@azure/storage-blob';
import dotenv from 'dotenv';
const bcrypt = require("bcrypt");
const { connectDb, Vault, FileVault } = require('./config/dbConnection');
import cors from 'cors';

dotenv.config();
connectDb();

const app = express();
const upload = multer({ limits: { fileSize: 1024 * 1024 * 512 } }); 

const corsOptions = {
    origin: '*', 
    methods: ['GET', 'POST'], 
  };

app.use(cors(corsOptions));
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


// app.post('/upload', upload.array('files'), async (req: any, res: any) => {
//     try {
//         if (!req.files || req.files.length === 0) {
//             return res.status(400).json({ error: 'No files uploaded' });
//         }

//         const password = req.body.password || '';
//         const passwordHash = password ? await bcrypt.hash(password, 10) : undefined; 
//         const vaultCode = await generateUniqueVaultCode();
//         const duration = parseInt(req.body.duration as string); 

//         if (isNaN(duration) || duration < 5 || duration > 1440) {
//             return res.status(400).json({ error: "Duration must be between 5 and 1440 minutes" });
//         }

//         const expireAt = new Date(Date.now() + duration * 60 * 1000);

//         let vault: any;
//         try {
//             vault = await Vault.create({
//                 vaultCode,
//                 passwordHash,
//                 duration,
//                 expireAt
//             });
//             console.log("Response from creating vault", vault);
//         } catch (err) {
//             console.error("Error adding vault info in mongodb", err);
//             return res.status(500).json({ error: "Error creating vault" }); 
//         }

//         const uploadPromises = (req.files as Express.Multer.File[]).map(async (file: Express.Multer.File) => { 
//             const blobName = file.originalname;
//             const blockBlobClient = containerClient.getBlockBlobClient(blobName);
//             const stream = file.buffer;

//             const permissions = new BlobSASPermissions();
//             permissions.read = true;

//             try {
//                 await blockBlobClient.uploadData(stream);

//                 const sasToken = await blockBlobClient.generateSasUrl({
//                     permissions,
//                     expiresOn: expireAt 
//                 });

//                 try {
//                     const newFileVault = await FileVault.create({
//                         vault_id: vault._id,
//                         vaultCode,
//                         fileName: blobName,
//                         fileURL: sasToken
//                     });
//                     console.log("Response from adding file in Vault", newFileVault);
//                 } catch (err) {
//                     console.error("Error adding file info in mongodb", err);
//                 }

//                 return { message: 'File uploaded successfully', fileName: blobName, url: sasToken, expiresAt: expireAt, success: true };
//             } catch (uploadError) {
//                 console.error(`Error uploading ${blobName}:`, uploadError);
//                 return { message: `Error uploading ${blobName}: ${(uploadError as Error).message}`, fileName: blobName, success: false };
//             }
//         });

//         const results = await Promise.all(uploadPromises);

//         res.status(200).json({ results, vaultCode });

//     } catch (error) {
//         console.error("Upload error:", error);
//         res.status(500).json({ error: (error as Error).message });
//     }
// });


// app.post('/files', async (req: any, res: any) => {
//     try {
//         const { vaultCode, password } = req.body;
//         console.log(vaultCode, password)
//         const vault = await Vault.findOne({ vaultCode });
//         console.log(vault)
//         if (!vault) {
//             return res.status(404).json({ error: 'Vault not found', passwordMissing: false });
//         }

//         if (vault.expireAt && vault.expireAt < new Date()) {
//             return res.status(400).json({ error: 'Vault has expired', expireAt: vault.expireAt, passwordMissing: false });
//         }

//         if (vault.passwordHash) {
//             if (!password || !(await bcrypt.compare(password, vault.passwordHash))) {
//                 return res.status(403).json({ 
//                     error: 'Password is missing or invalid', 
//                     passwordMissing: true 
//                 });
//             }
//         }

//         const files = await FileVault.find({ vault_id: vault._id });
//         const plainFiles = files.map((file: any) => file.toObject());

//         return res.status(200).json({ plainFiles, expireAt: vault.expireAt, passwordMissing: false });

//     } catch (err) {
//         console.error('File retrieval error:', err); 
//         res.status(500).json({ error: 'File retrieval error', passwordMissing: false });
//     }
// });

// app.get('/verify/:vaultCode', async (req: any, res: any) => {
//     // try {
//     //     const { vaultCode } = req.params;

//     //     if (!vaultCode) {
//     //         return res.status(400).json({ error: "Missing vaultCode" }); 
//     //     }
//     //     const vault = await Vault.findOne({ vaultCode });
//     //     if (!vault) {
//     //         return res.status(404).json({ error: "Vault not found" })
//     //     } else {
//     //         return res.status(200).json({ ok: true })
            
//     //     }
//     // } catch (err) {
//     //     console.error("Error in /verify", err);
//     //     res.status(404)
//     // }
//     res.status(200).json("Reached path /verify/"+req.params.vaultCode+"!")
// }) 

app.get('/:vaultCode', async (req: any, res: any) => {   
        const { vaultCode } = req.params 
        return res.status(200).json({ vaultCode })        
    }
)

const PORT: number = parseInt(process.env.PORT || '5001');
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
