import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react"

interface DurationCounterProps {
    duration: number;
    onClick: (value: number) => void;
    durationData: number[]
}

export default function DurationCounter({ duration, onClick, durationData }: DurationCounterProps) {
    return (
        <div className="flex items-center justify-center space-x-2">
        <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full"
            onClick={() => onClick(-1)}
            disabled={duration <= 0}
        >
            <Minus />
            <span className="sr-only">Decrease</span>
        </Button>
        <div className="flex-1 text-center">
            <div className="text-4xl font-medium tracking-tighter">{durationData[duration]>=60 ? `${durationData[duration]/60} hours` : `${durationData[duration]} mins`}</div>
            <div className="text-[0.70rem] uppercase text-muted-foreground">
            Duration
            </div>
        </div>
        <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full"
            onClick={() => onClick(+1)}
            disabled={duration >= 7}
        >
            <Plus />
            <span className="sr-only">Increase</span>
        </Button>
        </div>
    );
}