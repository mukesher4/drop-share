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
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.comparePassword = comparePassword;
const argon2 = require('argon2');
function hashPassword(password) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const hash = yield argon2.hash(password);
            return hash;
        }
        catch (err) {
            console.error("Hashing error:", err);
            return null;
        }
    });
}
function comparePassword(password, hash) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const match = yield argon2.verify(hash, password);
            return match;
        }
        catch (err) {
            console.error("Verification error:", err);
            return false;
        }
    });
}
