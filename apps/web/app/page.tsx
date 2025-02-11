"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { toast } from "sonner"

import Link from "next/link"

import { useState } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function Home() {
  const [vaultCode, setVaultCode] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const handleJoin = () => {
    if (vaultCode.length === 0)
    toast.error("Enter vault code")
  }
  return (
    <div className="font-mono flex mx-auto max-w-xl h-screen items-center justify-center min-h-screen font-[family-name:var(--font-geist-sans)]">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="leading-relaxed  font-bold text-2xl">DropShare</CardTitle>
          <CardDescription className="text-sm font-mono">Create temporary vaults, share files securely</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full space-y-6">
            <Link href="/new">
              <Button className="w-full font-medium text-base" >Create New Vault</Button>
            </Link>  
            <div className="flex flex-row w-full h-full gap-2 items-stretch">
              <div className="flex flex-col gap-2 flex-1">
                <Input
                onChange={(e)=>setVaultCode(e.target.value)}
                type="text"
                value={vaultCode}
                placeholder="Enter Vault Code" />
                <Input
                onChange={(e)=>setPassword(e.target.value)}
                type="password"
                value={password}
                placeholder="Enter Password" />

              </div>
              <div className="h-full">
                  {vaultCode.length===0 ? (
                      <Button onClick={handleJoin} className="font-medium text-sm h-[80px]">Join</Button>
                    )
                    :
                    <Link onClick={handleJoin} href={`/${vaultCode}`}>
                      <Button className="font-medium text-sm h-[80px]">Join</Button> 
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
