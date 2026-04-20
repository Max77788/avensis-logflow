import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import {
  biddingService,
  formatMoney,
  type BidWithCarrier,
} from "@/lib/bidding";
import { toast } from "@/hooks/use-toast";

interface Props {
  bid: BidWithCarrier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAwarded: () => void;
}

export const AwardModal: React.FC<Props> = ({ bid, open, onOpenChange, onAwarded }) => {
  const [working, setWorking] = useState(false);

  const handleAward = async () => {
    if (!bid) return;
    setWorking(true);
    try {
      await biddingService.awardBid(bid.id);
      toast({
        title: "Bid awarded",
        description: `${bid.carrier.name} won this load.`,
      });
      onAwarded();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Failed to award",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setWorking(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Award this bid?</AlertDialogTitle>
          <AlertDialogDescription>
            {bid ? (
              <>
                You're about to award <strong>{bid.carrier.name}</strong> the
                load at <strong>{formatMoney(bid.price)}</strong>
                {bid.price_per_mile
                  ? ` (${formatMoney(bid.price_per_mile)}/mi)`
                  : ""}
                . All other bids on this load will be marked as declined.
              </>
            ) : (
              "Select a bid to award."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={working}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleAward} disabled={working || !bid}>
            {working && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Award bid
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
