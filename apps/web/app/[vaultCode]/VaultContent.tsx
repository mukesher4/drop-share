"use client";

import { Separator } from "@/components/ui/separator";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import React, { useEffect, useState, useCallback } from "react";
import CopyButton from '@/components/ui/CopyButton';
import { Input } from "@/components/ui/input";
import { Lock, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { URL } from "@/app/constants";


interface FileObject {
  name: string;
  url: string;
}

interface plainFiles {
  fileName: string;
  fileURL: string;
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
  const [vaildAuth, setVaildAuth] = useState<boolean>(false);

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

      const res = await fetch(`${URL}/files`, options);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `HTTP error! status: ${res.status}`);
      }
      const response: FileResponse = await res.json();
      if (!response?.passwordMissing) {
        toast.success("Vaild password")
        setVaildAuth(true)
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

  }

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

      const res = await fetch(`${URL}/files`, options);
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
      }));

      setFiles(newFiles);
      setPasswordMissing(false);
      setInvalidVault(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message && err.message.includes("missing")) {
          // toast.error("Enter valid password");
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
  }, [vaildAuth, vaultCode, password]);

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
                  onChange={(e) => setPassword(e.target.value)} // Only updates password
                  placeholder="Password"
                />
                <Lock
                  onClick={handleOnClickLock} // Calls handleDisplay only when the lock is clicked
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
            <div className="flex flex-col items-start justify-start ">
              {files.map((file, idx) => (
                <React.Fragment key={idx}>
                  <div className=" flex flex-row items-center w-full pr-2">
                    <div className=" text-left text-sm w-[calc(100%-4rem)] truncate">
                      <a href={file.url} download={(file.name).split('-').slice(1).join('-')}>
                        {(file.name).split('-').slice(1).join('-')}
                      </a>
                    </div>
                  </div>
                  <Separator className="my-2 w-[calc(100%-0rem)] mx-auto" />
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
