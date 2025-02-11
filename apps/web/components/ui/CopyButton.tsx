"use client";

import React from 'react';
import { Copy } from 'lucide-react';

import { toast } from "sonner"

const CopyButton: React.FC<{ vaultId: string }> = ({ vaultId }) => {
    const handleCopy = async (e: React.MouseEvent<HTMLOrSVGElement>) => {
        e.preventDefault();
        try {
            await navigator.clipboard.writeText(vaultId);
            toast.success("Vault ID copied!")
        } catch (err) {
            toast.error("Failed to copy")
        }
    };

    return (
        <Copy className="w-5 h-5" onClick={handleCopy} />
    );
};

export default CopyButton;