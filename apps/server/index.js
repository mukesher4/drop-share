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
const bodyParser = require('body-parser');
const multer_1 = __importDefault(require("multer"));
const storage_blob_1 = require("@azure/storage-blob");
const dotenv_1 = __importDefault(require("dotenv"));
const bcrypt = require("bcrypt");
const { connectDb, Vault, FileVault } = require('./config/dbConnection');
const cors_1 = __importDefault(require("cors"));
dotenv_1.default.config();
connectDb();
const app = (0, express_1.default)();
[
    "http://localhost:3000",
    "https://dropshare-ten.vercel.app",
    "https://dropshare-mukesh-rs-projects.vercel.app",
    "https://dropshare-git-main-mukesh-rs-projects.vercel.app"
];
const corsOptions = {
    origin: "*",
    methods: ['GET', 'POST'],
};
app.use(bodyParser.json({ limit: '512mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '512mb' }));
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
const upload = (0, multer_1.default)({
    limits: {
        fileSize: 1024 * 1024 * 512
    }
});
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
app.post('/gen-sas', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(req.body);
        const { duration } = req.body;
        const fileNames = req.body.fileNames;
        if (!fileNames || !Array.isArray(fileNames) || fileNames.length === 0) {
            // console.log(fileNames)
            return res.status(400).json({ error: "File names required" });
        }
        const password = req.body.password || '';
        const passwordHash = password ? yield bcrypt.hash(password, 10) : undefined;
        const vaultCode = yield generateUniqueVaultCode();
        if (isNaN(duration) || duration < 5 || duration > 1440) {
            return res.status(400).json({ error: "Duration must be between 5 and 1440 minutes" });
        }
        const expireAt = new Date(Date.now() + duration * 60 * 1000);
        let vault;
        try {
            vault = yield Vault.create({
                vaultCode,
                duration,
                expireAt,
                passwordHash
            });
        }
        catch (err) {
            res.status(500).json({ error: "Error adding vault in mongodb" });
        }
        const sasTokens = yield Promise.all(fileNames.map((fileName) => __awaiter(void 0, void 0, void 0, function* () {
            const blobName = `${Date.now()}-${fileName}`;
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            const sasToken = (0, storage_blob_1.generateBlobSASQueryParameters)({
                containerName,
                blobName,
                permissions: storage_blob_1.BlobSASPermissions.parse("cw"),
                expiresOn: expireAt,
            }, sharedKeyCredential).toString();
            yield FileVault.create({
                vault_id: vault._id,
                fileName: blobName,
                fileURL: "",
                pending: true,
                expireAt
            });
            return { fileName: blobName, uploadUrl: `${blockBlobClient.url}?${sasToken}` };
        })));
        return res.status(201).json({ sasTokens, vaultCode });
    }
    catch (err) {
        res.status(502).json({ error: "Error in generating SAS token: " + err });
    }
}));
app.post('/confirm-upload', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { vaultCode } = req.body;
        const vault = yield Vault.findOne({ vaultCode });
        if (!vault) {
            return res.status(404).json({ error: "Vault not found" });
        }
        const files = yield FileVault.find({ vault_id: vault._id });
        const results = yield Promise.all(files.map((file) => __awaiter(void 0, void 0, void 0, function* () {
            const blockBlobClient = containerClient.getBlockBlobClient(file.fileName);
            const sasToken = (0, storage_blob_1.generateBlobSASQueryParameters)({
                containerName,
                blobName: file.fileName,
                permissions: storage_blob_1.BlobSASPermissions.parse("r"),
                expiresOn: new Date(Date.now() + vault.duration * 60 * 1000)
            }, sharedKeyCredential).toString();
            const url = `${blockBlobClient.url}?${sasToken}`;
            yield FileVault.updateOne({ vault_id: vault._id, fileName: file.fileName }, { $set: { pending: false, fileURL: url } });
            return {
                fileName: file.fileName,
                pending: false
            };
        })));
        res.status(200).json({ results, vaultCode });
    }
    catch (error) {
        console.error("Error confirming upload:", error);
        res.status(500).json({ error: "Internal Server Error" });
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
    try {
        const { vaultCode } = req.params;
        if (!vaultCode) {
            return res.status(400).json({ error: "Missing vaultCode" });
        }
        const vault = yield Vault.findOne({ vaultCode });
        if (!vault) {
            return res.status(404).json({ error: "Vault not found" });
        }
        else {
            return res.status(200).json({ ok: true });
        }
    }
    catch (err) {
        console.error("Error in /verify", err);
        res.status(404);
    }
}));
app.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return res.status(200).json({ message: "CORS worked!" });
}));
const PORT = parseInt(process.env.PORT || '5001');
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
