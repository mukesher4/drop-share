import {
  Card,
  CardContent,
} from "@/components/ui/card";
import VaultContent from './VaultContent';

export default async function Vault({ params }: { params: { vaultCode: string } }) {
  const { vaultCode } = await params;

  return (
    <div className="font-mono flex mx-auto max-w-xl h-screen items-center justify-center min-h-screen font-[family-name:var(--font-geist-sans)]">
      <Card className="w-full h-auto">
        <CardContent>
          <VaultContent vaultCode={vaultCode} /> 
        </CardContent>
      </Card>
    </div>
  );
}
