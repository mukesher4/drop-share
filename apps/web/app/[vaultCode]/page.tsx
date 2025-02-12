"use client"

import { Separator } from "@/components/ui/separator"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import React, { useEffect, useState } from "react" 

import CopyButton from '@/components/ui/CopyButton';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface FileObject {  
  name: string;
  url: string;
}

interface FileResponse {
  fileName: string;
  fileURL: string;
}

import { useRouter } from "next/navigation";

import { URL } from "@/app/constants"

export default function Vault({ params }: { params: { vaultCode: string } }) {
  const router = useRouter(); 

    const vaultCode = params.vaultCode;
    const isLocked = true;

    const [files, setFiles] = useState<FileObject[]>([]); 
    const [expireAt, setExpireAt] = useState<string | null>(null); 
    const [timeLeft, setTimeLeft] = useState<number | null>(null); 


    useEffect(() => {
        if (!vaultCode) {
            console.warn("vaultCode is missing from params");
            return; 
        }

      const handleDisplay = () => {
        const options = {
          method: 'GET', 
          headers: {
            'Content-Type': 'application/json', 
          }
        };

        fetch(`${URL}/files/${vaultCode}`, options)
          .then(res => {
            if (!res.ok) {
              throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
          })
          .then(response => {
            setExpireAt(response.expireAt); 
            const resFiles = response.plainFiles;
            const fileSet = new Set<string>();
            const newFiles = resFiles.filter((res: any) => {
              if (fileSet.has(res.fileName)) return false;
              fileSet.add(res.fileName);
              return true;
            }).map((res: any) => ({
              name: res.fileName, 
              url: res.fileURL,
            }));

            setFiles(newFiles);
          })
          .catch(err => {
            console.error("File Retrival Error", err); 
          });
      };

      handleDisplay();
    }, [vaultCode]); 

    useEffect(() => {
      if (expireAt && typeof expireAt === 'string') { 
        const handleExpire = () => { 
          const date = new Date(expireAt);
          const now = new Date();
          const timeLeftMillis = date.getTime() - now.getTime();

          if (timeLeftMillis <= 0) {
            router.push(`/`);
            setTimeLeft(0); 
            return;
          }

          const timeLeftMins = Math.floor(timeLeftMillis / (1000 * 60));
          setTimeLeft(timeLeftMins);

          const intervalId = setInterval(() => {
              const now = new Date();
              const timeLeftMillis = date.getTime() - now.getTime();
              if (timeLeftMillis <= 0) {
                clearInterval(intervalId);
                setTimeLeft(0);
                router.push(`/`);
                return;
              }
              const timeLeftMins = Math.floor(timeLeftMillis / (1000 * 60));
              setTimeLeft(timeLeftMins)
          }, 60000); 

          return () => clearInterval(intervalId); 
        };

        handleExpire(); 
      } else {
        setTimeLeft(null); 
      }
    }, [expireAt]);
     
  return (
    <div className="font-mono flex mx-auto max-w-xl h-screen items-center justify-center min-h-screen font-[family-name:var(--font-geist-sans)]">
      <Card className="w-full h-auto">
        <CardContent>
          <div className="w-full flex flex-col mt-6 gap-6">
            <label 
              className="focus:outline-none flex items-center gap-2"
            >
              <Card className="flex flex-row items-center justify-center text-center text-md p-7 w-full">
                <div className="flex flex-row gap-3 text-left flex-1">
                    <div>Vault Code: {vaultCode}</div>
                    <div className="cursor-pointer">
                      <CopyButton vaultCode={vaultCode} />
                    </div>
                </div>
                <div className="text-right flex-1">Remaining: {timeLeft}</div>
              </Card>
            </label>            

            <Card className={`${isLocked?`h-80`:` h-64`} text-center text-md w-full overflow-hidden`}>
              {files.length==0 ?
                <div className="flex w-full h-full">
                  <span className=" my-auto mx-auto font-thin opacity-50">
                    Invalid Room Code
                  </span>
                </div>
               :
              <ScrollArea className="h-full pt-4 px-4">
                <div className="flex flex-col items-start justify-start ">
                  {files.map((file, idx)=>(
                    <>
                      <div className=" flex flex-row items-center w-full pr-2" key={idx}>
                          <div className=" text-left text-sm w-[calc(100%-4rem)] truncate" key={idx}>
                          <a key={idx} href={file.url}>
                              {file.name}
                            </a>
                          </div>
                      </div>
                      <Separator className="my-2 w-[calc(100%-0rem)] mx-auto" />
                    </>
                  ))}
                </div>
                <ScrollBar orientation="vertical"/>
              </ScrollArea>
              }
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