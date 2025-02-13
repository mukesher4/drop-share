import JoinVault from '@/app/JoinVault'

import ServerButton from '@/app/ServerButton'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function Home() {
  
   return (
    <div className="font-mono flex mx-auto max-w-xl h-screen items-center justify-center min-h-screen font-[family-name:var(--font-geist-sans)]">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="leading-relaxed  font-bold text-2xl">DropShare</CardTitle>
          <CardDescription className="text-sm font-mono">Create temporary vaults, share files securely</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full space-y-6">
            <ServerButton className="w-full font-medium text-base">Create New Vault</ServerButton>
            <JoinVault />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
