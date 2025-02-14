"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const storage_blob_1 = require("@azure/storage-blob");
const dotenv_1 = __importDefault(require("dotenv"));
const bcrypt = require("bcrypt");
const { connectDb, Vault, FileVault } = require('./config/dbConnection');
const cors_1 = __importDefault(require("cors"));
dotenv_1.default.config();
connectDb();
const app = (0, express_1.default)();
const upload = (0, multer_1.default)({ limits: { fileSize: 1024 * 1024 * 512 } });
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST'],
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
const account = process.env.ACCOUNT_NAME || '';
const containerName = process.env.CONTAINER || '';
const accountKey = process.env.ACCOUNT_KEY || '';
const sharedKeyCredential = new storage_blob_1.StorageSharedKeyCredential(account, accountKey);
const blobServiceClient = new storage_blob_1.BlobServiceClient(`https://${account}.blob.core.windows.net`, sharedKeyCredential);
const containerClient = blobServiceClient.getContainerClient(containerName);
const crypto = require('crypto');
function generateUniqueVaultCode() {
    return __awaiter(this, void 0, void 0, function* () {
        const codeLength = 2;
        let vaultCode;
        do {
            vaultCode = crypto.randomBytes(codeLength).toString('hex').toUpperCase();
        } while (yield Vault.findOne({ vaultCode }));
        return vaultCode;
    });
}
app.post('/upload', upload.array('files'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
        const password = req.body.password || '';
        const passwordHash = password ? yield bcrypt.hash(password, 10) : undefined;
        const vaultCode = yield generateUniqueVaultCode();
        const duration = parseInt(req.body.duration);
        if (isNaN(duration) || duration < 5 || duration > 1440) {
            return res.status(400).json({ error: "Duration must be between 5 and 1440 minutes" });
        }
        const expireAt = new Date(Date.now() + duration * 60 * 1000);
        let vault;
        try {
            vault = yield Vault.create({
                vaultCode,
                passwordHash,
                duration,
                expireAt
            });
            console.log("Response from creating vault", vault);
        }
        catch (err) {
            console.error("Error adding vault info in mongodb", err);
            return res.status(500).json({ error: "Error creating vault" });
        }
        const uploadPromises = req.files.map((file) => __awaiter(void 0, void 0, void 0, function* () {
            const blobName = file.originalname;
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            const stream = file.buffer;
            const permissions = new storage_blob_1.BlobSASPermissions();
            permissions.read = true;
            try {
                yield blockBlobClient.uploadData(stream);
                const sasToken = yield blockBlobClient.generateSasUrl({
                    permissions,
                    expiresOn: expireAt
                });
                try {
                    const newFileVault = yield FileVault.create({
                        vault_id: vault._id,
                        vaultCode,
                        fileName: blobName,
                        fileURL: sasToken
                    });
                    console.log("Response from adding file in Vault", newFileVault);
                }
                catch (err) {
                    console.error("Error adding file info in mongodb", err);
                }
                return { message: 'File uploaded successfully', fileName: blobName, url: sasToken, expiresAt: expireAt, success: true };
            }
            catch (uploadError) {
                console.error(`Error uploading ${blobName}:`, uploadError);
                return { message: `Error uploading ${blobName}: ${uploadError.message}`, fileName: blobName, success: false };
            }
        }));
        const results = yield Promise.all(uploadPromises);
        res.status(200).json({ results, vaultCode });
    }
    catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: error.message });
    }
}));
app.post('/files', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { vaultCode, password } = req.body;
        console.log(vaultCode, password);
        const vault = yield Vault.findOne({ vaultCode });
        console.log(vault);
        if (!vault) {
            return res.status(404).json({ error: 'Vault not found', passwordMissing: false });
        }
        if (vault.expireAt && vault.expireAt < new Date()) {
            return res.status(400).json({ error: 'Vault has expired', expireAt: vault.expireAt, passwordMissing: false });
        }
        if (vault.passwordHash) {
            if (!password || !(yield bcrypt.compare(password, vault.passwordHash))) {
                return res.status(403).json({
                    error: 'Password is missing or invalid',
                    passwordMissing: true
                });
            }
        }
        const files = yield FileVault.find({ vault_id: vault._id });
        const plainFiles = files.map((file) => file.toObject());
        return res.status(200).json({ plainFiles, expireAt: vault.expireAt, passwordMissing: false });
    }
    catch (err) {
        console.error('File retrieval error:', err);
        res.status(500).json({ error: 'File retrieval error', passwordMissing: false });
    }
}));
app.get('/verify/:vaultCode', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // try {
    //     const { vaultCode } = req.params;
    //     if (!vaultCode) {
    //         return res.status(400).json({ error: "Missing vaultCode" }); 
    //     }
    //     const vault = await Vault.findOne({ vaultCode });
    //     if (!vault) {
    //         return res.status(404).json({ error: "Vault not found" })
    //     } else {
    //         return res.status(200).json({ ok: true })
    //     }
    // } catch (err) {
    //     console.error("Error in /verify", err);
    //     res.status(404)
    // }
    res.status(200).json("Reached path /verify/" + req.params.vaultCode + "!");
}));
app.get('/:vaultCode', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { vaultCode } = req.params;
    const vault = yield Vault.findOne({ vaultCode });
    if (!vault) {
        return res.status(404).json({ error: "Vault not found" });
    }
    else {
        return res.status(200).json({ ok: true });
    }
}));
const PORT = parseInt(process.env.PORT || '5001');
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
