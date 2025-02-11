"use client"

import { Separator } from "@/components/ui/separator"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import React from "react"
import { useState, useEffect } from "react"

import DurationCounter from "@/components/ui/duration-counter"
import { Upload } from "lucide-react"
import { Trash } from "lucide-react"

import Link from "next/link"

import { toast } from "sonner"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const durationData: number[] = [5, 15, 30, 60, 180, 360, 720, 1440]

export default function New() {
  const vaultCode = "503E"

  const [duration, setDuration] = useState<number>(0)

  const [isPass, setIsPass] = useState<boolean>(false)
  const [password, setPassword] = useState<string>('')
  function onClick(change: number) {
    setDuration(Math.max(0, Math.min(7, duration + change)))
  }

  const [files, setFiles] = useState<File[]>([])

  const fileSizeExceeded = (maxMB: number, newFileSize: number) => {
    let sizeCal =  newFileSize
    files.map(file=>{sizeCal += file.size})
    sizeCal = sizeCal*(10**-6)
    return maxMB < sizeCal ? true : false
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (fileSizeExceeded(10, event.target.files?.length ? event.target.files[0].size : 0)) {
      toast.error("Files size should not exceed 10 MB")
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

  const [shouldRedirect, setShouldRedirect] = useState(false);

  const handleCreate = () => {
    if (files.length === 0) {
      toast.error("Please provide files");
    } else {
      setShouldRedirect(true); 
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
              <ScrollArea className="h-full pt-4 px-4">
                <div className="flex flex-col items-start justify-start ">
                  {files.map((file, idx)=>(
                    <>
                      <div className=" flex flex-row items-center w-full pr-2" key={idx}>
                        <div className=" text-left text-sm w-[calc(100%-4rem)] truncate" key={idx}>
                            {file.name}
                        </div>
                          <Trash
                          onClick={()=>handleDelete(idx)}
                          className="pl-12 flex-1 flex-shrink-0 w-4 h-4 text-red-500 cursor-pointer hover:text-red-700" />
                      </div>
                        
                      <Separator className="my-2 w-[calc(100%-0rem)] mx-auto" />
                    </>
                  ))}
                </div>
                <ScrollBar orientation="vertical"/>
              </ScrollArea>
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
                
                {files.length===0 ? (
                    <Button onClick={handleCreate} className="w-full">Create</Button>
                  )
                  :
                  <Link onClick={handleCreate} href={`/${vaultCode}`}>
                    <Button className="w-full">Create</Button> 
                  </Link>
                }
              </div>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
    
}