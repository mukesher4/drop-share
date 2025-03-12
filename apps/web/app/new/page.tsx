"use client"

import { Separator } from "@/components/ui/separator"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import React from "react"
import { useState, useEffect, useRef } from "react"

import DurationCounter from "@/components/ui/duration-counter"
import { Trash, Loader2, Upload, Clock, Lock } from "lucide-react"

import { useRouter } from "next/navigation";
import { toast } from "sonner"

import { BASE_URL } from "@/app/constants"

import {
  Card,
  CardContent,
} from "@/components/ui/card"

interface Result {
  fileName: string;
  uploadUrl: string;
}

interface ResponseData {
  sasTokens: Result[];
  vaultCode: string;
}    

interface ReadFile {
  fileName: string;
  url: string;
  success: boolean;
}

interface ReadFileResponse {
  results: ReadFile[];
  vaultCode: string
}

export default function New() {
  const router = useRouter(); 

  const [duration, setDuration] = useState<number>(0)
  const [files, setFiles] = useState<File[]>([])
  const [isPass, setIsPass] = useState<boolean>(false)
  const [password, setPassword] = useState<string>('')
  const [uploadEta, setUploadEta] = useState<number | null>(null)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [isEncrypting, setIsEncrypting] = useState<boolean>(false)
  
  // Timer reference for cleanup
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const durationData: number[] = [5, 15, 30, 60, 180, 360, 720, 1440]
  let vaultCode = ''

  // Upload rate in MB per second (0.5 Mbps = 0.0625 MB/s)
  const UPLOAD_RATE = 0.5;

  // Cleanup timer on component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Calculate total file size in MB
  const calculateTotalSize = () => {
    let totalSize = 0;
    files.forEach(file => {
      totalSize += file.size;
    });
    return totalSize / (1024 * 1024); // Convert bytes to MB
  };

  // Calculate initial ETA based on file size and upload rate
  const calculateInitialEta = () => {
    const totalSizeMB = calculateTotalSize();
    return Math.ceil(totalSizeMB / UPLOAD_RATE);
  };

  // Update ETA every 3 seconds
  const startEtaTimer = (initialEta: number) => {
    let remainingSeconds = initialEta;
    setUploadEta(remainingSeconds);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      remainingSeconds -= Math.ceil(Math.random()*3); 
      
      // If ETA reaches 0 but upload is still in progress, keep showing 0
      if (remainingSeconds <= 0) {
        setUploadEta(0);
      } else {
        setUploadEta(remainingSeconds);
      }
    }, 3000); // Update every 3 seconds
  };

  function onClick(change: number) {
    setDuration(Math.max(0, Math.min(7, duration + change)))
  }

  const fileSizeExceeded = (maxMB: number, newFileSize: number) => {
    let sizeCal =  newFileSize
    files.map(file=>{sizeCal += file.size})
    sizeCal = sizeCal*(10**-6)
    return maxMB < sizeCal ? true : false
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (fileSizeExceeded(128, event.target.files?.length ? event.target.files[0].size : 0)) {
      toast.error("Files size should not exceed 128 MB")
      return;
    }

    const filesArray = event.target.files ? Array.from(event.target.files) : [];
    
    if (event.target.files) {
      setFiles((prevFiles) => {
        const newFiles = filesArray.filter(
          (file) => !prevFiles.some((prevFile) => prevFile.name === file.name && prevFile.size === file.size)
        );
        
        return [...prevFiles, ...newFiles];
      })
    }
  };

  const handleDelete = (idx: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => idx !== i ))
  } 

  // Encryption utilities
  const generateEncryptionKey = async (password: string): Promise<CryptoKey> => {
    // Convert password to a key using PBKDF2
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    
    // Create a salt
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
      ['encrypt']
    );
  };

  const encryptFile = async (file: File, key: CryptoKey): Promise<{ encryptedFile: Blob, iv: Uint8Array }> => {
    // Generate a random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Read the file as ArrayBuffer
    const fileBuffer = await file.arrayBuffer();
    
    // Encrypt the file
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      fileBuffer
    );
    
    // Combine IV and encrypted data (IV needs to be stored for decryption)
    const encryptedFile = new Blob([iv, encryptedBuffer], { type: 'application/encrypted' });
    
    return { encryptedFile, iv };
  };

  const encryptFiles = async (files: File[], encryptionPassword: string): Promise<File[]> => {
    // If there's no password, return the original files
    if (!encryptionPassword) {
      return files;
    }
    
    // Generate encryption key from password
    const key = await generateEncryptionKey(encryptionPassword);
    
    // Encrypt each file
    const encryptedFiles = await Promise.all(files.map(async (file) => {
      const { encryptedFile } = await encryptFile(file, key);
      
      // Create a new File object with the encrypted content
      return new File([encryptedFile], `${file.name}.encrypted`, {
        type: 'application/encrypted',
        lastModified: new Date().getTime()
      });
    }));
    
    return encryptedFiles;
  };

  const postFiles = async () => {
    interface Body {
      duration: string;
      password: string;
      fileNames: string[];
      encrypted: boolean;
    }

    // Prepare file names for upload
    const fileNames = files.map(file => {
      // If encryption is enabled, add .encrypted extension
      return isPass ? `${file.name}.encrypted` : file.name;
    });

    const body : Body = {
      duration: (durationData[duration]).toString(),
      password: isPass ? password : '',
      fileNames: fileNames,
      encrypted: isPass // Indicate to server that files are encrypted
    }

    try {
      const response = await fetch(`${BASE_URL}/gen-sas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Error in fetching server'
        throw new Error(errorMessage)
      }   

      const data = await response.json() as ResponseData

      const { vaultCode } = data
      const results = data.sasTokens as Result[]

      // If password is set, encrypt files before uploading
      let filesToUpload = files;
      if (isPass) {
        setIsEncrypting(true);
        filesToUpload = await encryptFiles(files, password);
        setIsEncrypting(false);
      }

      // Start upload process
      setIsUploading(true);
      const initialEta = calculateInitialEta();
      startEtaTimer(initialEta);

      await Promise.all(filesToUpload.map(async (file, index) => {
        const { uploadUrl } = results[index];

        await fetch(uploadUrl, {
          method: "PUT",
          headers: new Headers({
            "x-ms-blob-type": "BlockBlob",
          }),
          body: file,
        });
      }));

      // Upload completed
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setIsUploading(false);
      setUploadEta(null);

      const readFileResponse = await fetch(`${BASE_URL}/confirm-upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaultCode }),
      });

      if (!readFileResponse.ok) {
        const errorData = await readFileResponse.json()
        const errorMessage = errorData.error || 'Error in fetching server'
        throw new Error(errorMessage)      
      }

      const readData = await readFileResponse.json() as ReadFileResponse

      return readData

    } catch (err) {
      // Clear timer and reset upload status on error
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setIsUploading(false);
      setUploadEta(null);
      setIsEncrypting(false);
      console.error("Error in fetching server", err)
    }
  } 

  const [loader, setIsLoader] = useState<boolean>(false)

  const handleCreate = async () => {
    if (files.length === 0) {
      toast.error("Please provide files");
    } else {
      setIsLoader(true)
      const res = await postFiles()
      vaultCode = res.vaultCode
      let success = true
      for (const file of res.results) {
        if (file.success===false) {
          success = false
          break
        }
      }

      if (success===true) {
        setIsLoader(false)
        toast.success(`Vault created ${isPass ? 'with encryption' : ''} successfully`)
        router.push(`/${vaultCode}`);
      } else {
        toast.error("Error creating vault")
        setFiles([])
      }
    }
  };

  // Format seconds to show ETA
  const formatEta = (seconds: number) => {
    if (seconds <= 0) return "0 sec";
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes} min ${remainingSeconds} sec`;
    } else {
      return `${remainingSeconds} sec`;
    }
  };

  return (
    <div className="font-mono flex mx-auto max-w-xl h-screen items-center justify-center min-h-screen font-[family-name:var(--font-geist-sans)]">
      <Card className="w-full h-auto">
        <CardContent>
          <div className="w-full flex flex-col mt-6 gap-6">
            <input
            type="file"
            className="hidden"
            id="fileUpload"
            multiple
            onChange={handleFileChange}
          />
            
            <label 
              htmlFor="fileUpload" 
              className="cursor-pointer focus:outline-none flex items-center gap-2"
            >
              <Card className="flex flex-row gap-4 items-center justify-center border-dashed text-center text-2xl p-10 w-full">
                <Upload/>
                <div>Upload</div>
              </Card>
            </label>            

            <Card className="text-center h-44 text-lg w-full overflow-hidden">
              {files.length==0 ?
                <div className="flex w-full h-full">
                  <span className=" my-auto mx-auto font-thin opacity-50">
                    Files would be displayed here
                  </span>
                </div>
              :
                <div className="relative h-full w-full"> 
                  <ScrollArea className={`h-full pt-4 px-4 ${loader ? 'opacity-50 pointer-events-none' : ''}`}> 
                    <div className="flex flex-col items-start justify-start">
                      {files.map((file, idx) => (
                        <React.Fragment key={idx}>
                          <div className="flex flex-row items-center w-full pr-2">
                            <div className="text-left text-sm w-[400px] truncate">
                              {file.name}
                            </div>
                            <Trash
                              onClick={() => handleDelete(idx)}
                              className={`pl-12 flex-1 flex-shrink-0 w-4 h-4 text-red-500 hover:text-red-700 ${loader ? 'disabled' : ''}`} 
                            />
                          </div>
                          <Separator className="my-2 w-[calc(100%-0rem)] mx-auto" />
                        </React.Fragment>
                      ))}
                    </div>
                    <ScrollBar orientation="vertical" />
                  </ScrollArea>
                  {loader && ( 
                    <div className="absolute inset-0 flex flex-col gap-8 items-center justify-center bg-transparent">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      {isEncrypting ? (
                        <div className="flex items-center justify-center gap-2 text-sm">
                          <Lock className="w-4 h-4" />
                          <span>Encrypting files...</span>
                        </div>
                      ) : isUploading ? (
                        <div className="flex items-center justify-center gap-2 text-sm">
                          <Clock className="w-4 h-4" />
                          <span>Estimated upload time: {uploadEta !== null ? formatEta(uploadEta) : '0 sec'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 text-sm">
                          <span>Uploading...</span>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              }
            </Card>
            
            <DurationCounter
            duration={duration}
            onClick={onClick}
            durationData={durationData}/>

            <div className="flex flex-row w-full gap-4 justify-center items-center">
              <div className="flex-1">
                {!isPass ? 
                  <Button onClick={() => setIsPass(true)} className="font-medium w-full">
                    Password: off
                  </Button>
                 :
              <div className="relative w-full">
                <Input
                className="pr-10"
                type="password"
                placeholder="Enter Password"
                value={password}
                onChange={(e)=>setPassword(e.target.value)}>
                </Input>

                <Button
                onClick={()=>{setIsPass(false); setPassword('')}}
                className="bg-transparent hover:bg-transparent absolute inset-y-0 right-2 flex items-center text-gray-500">
                x
                </Button>
              </div> 
              } 
              </div>
              <div className="flex-1">                
                <Button onClick={handleCreate} className="w-full">Create</Button>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
    
}
