'use client'; 

import { redirect } from 'next/navigation';

import { Button } from "@/components/ui/button"; // Your UI button component

interface ServerButtonProps {
  children?: React.ReactNode;
  className?: string; 
}

export default function ServerButton ({ children, className, ...rest }: ServerButtonProps) {

  return (
    <Button onClick={()=>redirect('/new')} className={className} {...rest}> 
      {children}
    </Button>
  );
};
