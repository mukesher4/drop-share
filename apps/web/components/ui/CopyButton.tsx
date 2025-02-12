"use client";

import React from 'react';
import { Copy } from 'lucide-react';

import { toast } from "sonner"

const CopyButton: React.FC<{ vaultCode: string }> = ({ vaultCode }) => {
    const handleCopy = (e: any, vaultCode: string) => {
        e.preventDefault(); 
        try {
          navigator.clipboard.writeText(vaultCode)
            .then(() => {
              toast.success("Vault code copied!");
            })
            .catch(err => {
              toast.error("Failed to copy: ", err);
            });
        } catch (error) {
          console.error("Failed to copy: ", error); 
        }
      };

    return (
        <Copy className="w-5 h-5" onClick={()=>{handleCopy(event, vaultCode)}} />
    );
};

export default CopyButton;