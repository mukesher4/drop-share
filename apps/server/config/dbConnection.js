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
const mongoose = require("mongoose");
const connectDb = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const connect = yield mongoose.connect(process.env.CONNECTION_STRING);
        console.log("Database Connected: ", connect.connection.host, connect.connection.name);
    }
    catch (err) {
        console.log(err);
        process.exit(1);
    }
});
const vaultSchema = new mongoose.Schema({
    vaultCode: {
        type: String,
        required: true
    },
    passwordHash: {
        type: String
    },
    expireAt: {
        type: Date,
        expires: '1m'
    }
});
const Vault = mongoose.model("Vault", vaultSchema);
const fileVaultSchema = new mongoose.Schema({
    vault_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Vault"
    },
    fileName: {
        type: String,
        required: true
    },
    fileURL: {
        type: String,
        required: true
    },
});
const FileVault = mongoose.model("FileVault", fileVaultSchema);
module.exports = { connectDb, Vault, FileVault };
