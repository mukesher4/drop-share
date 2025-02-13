"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { URL } from "@/app/constants";
import { useRouter } from 'next/navigation'; 
import { useState } from 'react'; 

export default function JoinVault() {
    const router = useRouter()
    const [vaultCode, setVaultCode] = useState(''); 
  
    const handleJoin = () => {
      if (vaultCode.length === 0) {
        toast.error("Enter vault code");
        return;
      }
      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
      fetch(`${URL}/verify/${vaultCode}`, options)
        .then(res => {
          if (res.ok) {
            toast.success("Vault found");
            router.push(`/${vaultCode}`); 
          } else { toast.error("Vault not found") }
        })
        .catch(err => { console.error(`${URL}/verify/${vaultCode}`, err) });
    };
  
    return (
      <div className="flex flex-row w-full h-full gap-2 items-stretch">
        <div className="flex flex-col gap-2 flex-1">
          <Input
            onChange={(e) => setVaultCode(e.target.value)} 
            type="text"
            value={vaultCode} 
            placeholder="Enter Vault Code"
          />
        </div>
        <div className="h-full">
          <Button onClick={handleJoin} className="font-medium text-sm">Join</Button>
        </div>
      </div>
    );
  }