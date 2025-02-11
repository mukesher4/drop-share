import { Separator } from "@/components/ui/separator"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import React from "react"

import { JSX } from "react";

import DurationCounter from "@/components/ui/duration-counter"
import { Upload } from "lucide-react"
import { Trash } from "lucide-react"
import { Copy } from 'lucide-react';

import CopyButton from '@/components/ui/CopyButton';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default async function vault({
    params,
}: {params: Promise<{ vaultId: string }>}): Promise<JSX.Element> {

    const isLocked = true

//   const [files, setFiles] = useState<File[]>([])

//   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const filesArray = event.target.files ? Array.from(event.target.files) : [];
    
//     if (event.target.files) {
//       setFiles((prevFiles)=>[...prevFiles, ...filesArray])
//     }
//   };

//   const handleDelete = (idx: number) => {
//     setFiles(prevFiles => prevFiles.filter((_, i) => idx !== i ))
//   } 

//   useEffect(()=>{
//     console.log(durationData[duration], password, files)
//   }, [password])

    const handleCopy = async (e: any) => {
        e.preventDefault()
        try {
        await navigator.clipboard.writeText((await params).vaultId);
        } catch (err) {
        console.error("Failed to copy: ", err);
        }
    };

  return (
    <div className="font-mono flex mx-auto max-w-xl h-screen items-center justify-center min-h-screen font-[family-name:var(--font-geist-sans)]">
      <Card className="w-full h-auto">
        <CardContent>
          <div className="w-full flex flex-col mt-6 gap-6">
            {/* <input
            type="file"
            className="hidden"
            id="fileUpload"
            multiple
            onChange={handleFileChange}
            /> */}
            
            <label 
              className="focus:outline-none flex items-center gap-2"
            >
              <Card className="flex flex-row items-center justify-center text-center text-md p-7 w-full">
                <div className="flex flex-row gap-3 text-left flex-1">
                    <div>Vault Code: {(await params).vaultId}</div>
                    <div className="cursor-pointer">
                      <CopyButton  vaultId={(await params).vaultId} />
                    </div>
                </div>
                <div className="text-right flex-1">Remaining: 15 hours</div>
              </Card>
            </label>            

            <Card className={`${isLocked?`h-80`:` h-64`} text-center text-md w-full overflow-hidden`}>
              {/* {files.length==0 ? */}
                <div className="flex w-full h-full">
                  <span className=" my-auto mx-auto font-thin opacity-50">
                    Files would be displayed here
                  </span>
                </div>
              {/* :
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
              } */}
            </Card>
            
            {isLocked ?
                <></> 
            : 
                <div className="flex flex-row w-full gap-4">
                <Button className="flex-1 font-medium">Upload</Button>
                <Button className="flex-1 bg-red-500">Terminate Vault</Button>
                </div>
            }
            

          </div>
        </CardContent>
      </Card>
    </div>
  );
    
}