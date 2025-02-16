"use client";

import React from 'react';
import { Copy } from 'lucide-react';

import { toast } from "sonner"

const CopyButton: React.FC<{ vaultCode: string }> = ({ vaultCode }) => {
    const handleCopy = (e: React.MouseEvent<SVGSVGElement>) => {
        e.preventDefault(); 
        try {
          navigator.clipboard.writeText(`https://dropshare-ten.vercel.app/${vaultCode}`)
            .then(() => {
              toast.success("Vault code copied!");
            })
            .catch(err => {
              toast.error("Failed to copy: ", err);
            });
        } catch (error) {
          console.error("Failed to copy: ", error); 
          toast.error("An error occurred during copy.")
        }
      };

    return (
        <Copy className="w-5 h-5 cursor-pointer" onClick={handleCopy} />
    );
};

export default CopyButton;
