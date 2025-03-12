"use client";

import { Separator } from "@/components/ui/separator";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import React, { useEffect, useState, useCallback } from "react";
import CopyButton from '@/components/ui/CopyButton';
import { Input } from "@/components/ui/input";
import { Lock, Loader2, Download, FileKey } from 'lucide-react';
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { BASE_URL } from "@/app/constants";

interface FileObject {
  name: string;
  url: string;
  encrypted: boolean;
}

interface plainFiles {
  fileName: string;
  fileURL: string;
  encrypted: boolean;
}

interface FileResponse {
  plainFiles: plainFiles[];
  expireAt: number;
  passwordMissing: boolean;
}

export default function VaultContent({ vaultCode }: { vaultCode: string }) {
  const isLocked = true;
  const router = useRouter();
  const [files, setFiles] = useState<FileObject[]>([]);
  const [expireAt, setExpireAt] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [passwordMissing, setPasswordMissing] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [invalidVault, setInvalidVault] = useState<boolean>(false);
  const [validAuth, setValidAuth] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [decryptingFile, setDecryptingFile] = useState<string>('');

  // Encryption/Decryption utilities
  const generateEncryptionKey = async (password: string): Promise<CryptoKey> => {
    // Convert password to a key using PBKDF2
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    
    // Create a salt - in a real app, the salt should be stored with the encrypted file
    // For simplicity, we're using a fixed salt here
    const salt = new Uint8Array([
      0x63, 0x72, 0x79, 0x70, 0x74, 0x6f, 0x73, 0x61,
      0x6c, 0x74, 0x76, 0x61, 0x6c, 0x75, 0x65, 0x73
    ]);
    
    // Import the password as a key
    const importedKey = await crypto.subtle.importKey(
      'raw',
      passwordData,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    // Derive a key for AES-GCM
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      importedKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['decrypt']
    );
  };

  const decryptFile = async (encryptedFileUrl: string, fileName: string, decryptionPassword: string): Promise<void> => {
    try {
      setIsDecrypting(true);
      setDecryptingFile(fileName);

      // Get the encrypted file
      const response = await fetch(encryptedFileUrl);
      const encryptedBlob = await response.blob();
      const encryptedBuffer = await encryptedBlob.arrayBuffer();

      // The first 12 bytes are the IV, the rest is the encrypted data
      const iv = new Uint8Array(encryptedBuffer.slice(0, 12));
      const encryptedData = new Uint8Array(encryptedBuffer.slice(12));

      // Generate the key from the password
      console.log(decryptionPassword);
      const key = await generateEncryptionKey(decryptionPassword);

      // Decrypt the data
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv
        },
        key,
        encryptedData
      );

      // Create a Blob from the decrypted data
      const decryptedBlob = new Blob([decryptedBuffer], { type: 'application/octet-stream' });

      // Create a download link
      let originalFileName = fileName.replace('.encrypted', '');
      const parts = originalFileName.split('-');
      originalFileName = parts.slice(1).join('-'); 
      const downloadUrl = URL.createObjectURL(decryptedBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = originalFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(downloadUrl);
      toast.success(`Decrypted and downloaded ${originalFileName}`);
    } catch (error) {
      console.error("Error decrypting file:", error);
      toast.error("Failed to decrypt file. Please check your password.");
    } finally {
      setIsDecrypting(false);
      setDecryptingFile('');
    }
  };

  const handleOnClickLock = async () => {
    try {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vaultCode: vaultCode,
          password
        })
      };

      const res = await fetch(`${BASE_URL}/files`, options);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `HTTP error! status: ${res.status}`);
      }
      const response: FileResponse = await res.json();
      if (!response?.passwordMissing) {
        toast.success("Valid password");
        setValidAuth(true);
      }      
    } catch (err) {
      if (err instanceof Error) {
        if (err.message && err.message.includes("missing")) {
          toast.error("Enter valid password");
          setPasswordMissing(true);
          setInvalidVault(false);
        } else if (err.message && err.message.includes("Vault has expired")) {
          toast.error("Vault has expired");
          setInvalidVault(true);
          setPasswordMissing(false);
        } else {
          toast.error("An error occurred");
          setInvalidVault(true);
          setPasswordMissing(false);
        }
      }
    }
  };

  const handleDisplay = useCallback(async () => {
    try {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vaultCode: vaultCode,
          password
        })
      };

      const res = await fetch(`${BASE_URL}/files`, options);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `HTTP error! status: ${res.status}`);
      }

      const response: FileResponse = await res.json();

      if (response?.passwordMissing) {
        setExpireAt(response.expireAt);
        throw new Error("missingPassword");
      }

      setExpireAt(response.expireAt);
      const newFiles = response.plainFiles.map((res: plainFiles) => ({
        name: res.fileName,
        url: res.fileURL,
        encrypted: res.fileName.endsWith('.encrypted') || res.encrypted === true
      }));

      setFiles(newFiles);
      setPasswordMissing(false);
      setInvalidVault(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message && err.message.includes("missing")) {
          setPasswordMissing(true);
          setInvalidVault(false);
        } else if (err.message && err.message.includes("Vault has expired")) {
          toast.error("Vault has expired");
          setInvalidVault(true);
          setPasswordMissing(false);
        } else {
          toast.error("An error occurred");
          setInvalidVault(true);
          setPasswordMissing(false);
        }
      }
    }
  }, [validAuth, vaultCode, password]);

  useEffect(() => {
    if (vaultCode) {
      handleDisplay();
    }
  }, [vaultCode, handleDisplay]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const handleExpire = () => {
      if (expireAt) {
        const date = new Date(expireAt);
        const now = new Date();
        const timeLeftMillis = date.getTime() - now.getTime();

        if (timeLeftMillis <= 0) {
          setTimeLeft(0);
          return;
        }

        const timeLeftMins = Math.floor(timeLeftMillis / (1000 * 60));
        setTimeLeft(timeLeftMins);

        intervalId = setInterval(() => {
          const now = new Date();
          const timeLeftMillis = date.getTime() - now.getTime();
          if (timeLeftMillis <= 0) {
            clearInterval(intervalId!);
            setTimeLeft(0);
            return;
          }
          const timeLeftMins = Math.floor(timeLeftMillis / (1000 * 60));
          setTimeLeft(timeLeftMins);
        }, 60000);
      }
    };

    handleExpire();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [expireAt, router]);

  const handleFileDownload = async (file: FileObject) => {
    if (file.encrypted) {
      // For encrypted files, decrypt them before download
      await decryptFile(file.url, file.name, password);
    } else {
      // For non-encrypted files, direct download
      window.location.href = file.url;
    }
  };

  // Get original filename without vault prefix and without .encrypted extension
  const getDisplayFileName = (fileName: string): string => {
    const nameWithoutPrefix = fileName.split('-').slice(1).join('-');
    return nameWithoutPrefix.replace('.encrypted', '');
  };

  return (
    <div className="w-full flex flex-col mt-6 gap-6">
      <label className="focus:outline-none flex items-center gap-2">
        <Card className="flex flex-row items-center justify-center text-center text-md p-7 w-full">
          <div className="flex flex-row gap-3 text-left flex-1">
            <div className="text-sm sm:text-base">Vault Code: {vaultCode}</div>
            <div className="cursor-pointer">
              <CopyButton vaultCode={vaultCode} />
            </div>
          </div>
          <div className="text-right flex-1 text-sm sm:text-base sm:whitespace-nowrap whitespace-normal">
            Remaining: <br className="sm:hidden" />
            {timeLeft >= 60 ? `${Math.floor(timeLeft / 60)} hour` : `${timeLeft === 0 ? `-` : timeLeft + ` mins`}`}
          </div>
        </Card>
      </label>

      <Card className={`${isLocked ? `h-80` : ` h-64`} text-center text-md w-full overflow-hidden`}>
        {files.length === 0 ? (
          passwordMissing ? (
            <div className="flex w-full h-full items-center justify-center">
              <div className="flex gap-4 items-center">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                />
                <Lock
                  onClick={handleOnClickLock}
                  className="w-8 h-8 cursor-pointer"
                />
              </div>
            </div>
          ) : invalidVault ? (
            <div className="flex w-full h-full items-center justify-center">
              <span className="font-thin opacity-50">Invalid Room Code</span>
            </div>
          ) : (
            <div className="flex w-full h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )
        ) : (
          <ScrollArea className="h-full pt-4 px-4">
            <div className="flex flex-col items-start justify-start">
              {files.map((file, idx) => (
                <React.Fragment key={idx}>
                  <div className="flex flex-row items-center w-full pr-2">
                    <div className="text-left text-sm flex-grow truncate">
                      {getDisplayFileName(file.name)}
                    </div>
                    <div className="flex items-center ml-2">
                      {isDecrypting && decryptingFile === file.name ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      ) : file.encrypted ? (
                        <FileKey
                          onClick={() => handleFileDownload(file)}
                          className="w-5 h-5 text-blue-500 cursor-pointer hover:text-blue-700"
                        />
                      ) : (
                        <Download
                          onClick={() => handleFileDownload(file)}
                          className="w-5 h-5 cursor-pointer hover:text-blue-700"
                        />
                      )}
                    </div>
                  </div>
                  <Separator className="my-2 w-full mx-auto" />
                </React.Fragment>
              ))}
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        )}
      </Card>
    </div>
  );
}
