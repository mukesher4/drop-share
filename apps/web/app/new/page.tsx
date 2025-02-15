"use client"

import { Separator } from "@/components/ui/separator"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import React from "react"
import { useState } from "react"

import DurationCounter from "@/components/ui/duration-counter"
import { Trash, Loader2, Upload } from "lucide-react"

import { useRouter } from "next/navigation";
import { toast } from "sonner"

import { URL } from "@/app/constants"

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

  const durationData: number[] = [5, 15, 30, 60, 180, 360, 720, 1440]
  let vaultCode = ''

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

  const postFiles = async () => {
    interface Body {
      duration: string;
      password: string;
      fileNames: string[];
    }

    const body : Body = {
      duration: (durationData[duration]).toString(),
      password: isPass ? password : '',
      fileNames: []
    }

    for (const file of files) {
      body.fileNames.push(file.name)
    }

    try {
      const response = await fetch(`${URL}/gen-sas`, {
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

      console.log("data: " + JSON.stringify(data))

      const { vaultCode } = data
      const results = data.sasTokens as Result[]

      await Promise.all(files.map(async (file, index) => {
        const { uploadUrl } = results[index];

        await fetch(uploadUrl, {
          method: "PUT",
          headers: new Headers({
            "x-ms-blob-type": "BlockBlob",
          }),
          body: file,
        });
    }));

    const readFileResponse = await fetch(`${URL}/confirm-upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vaultCode  }),
    });

    if (!readFileResponse.ok) {
      const errorData = await readFileResponse.json()
      const errorMessage = errorData.error || 'Error in fetching server'
      throw new Error(errorMessage)      
    }

    const readData = await readFileResponse.json() as ReadFileResponse

    return readData

    } catch (err) {
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
        console.log(file.url)
        if (file.success===false) {
          success = false
          break
        }
      }

      if (success===true) {
        setIsLoader(false)
        toast.success("Vault created successfully")
        router.push(`/${vaultCode}`);
      } else {
        toast.error("Error creating vault")
        setFiles([])
      }
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
                    <div className="absolute inset-0 flex items-center justify-center bg-transparent">
                      <Loader2 className="h-8 w-8 animate-spin" />
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