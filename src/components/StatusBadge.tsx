import type { TicketStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, Truck, Package } from "lucide-react";

interface StatusBadgeProps {
  status: TicketStatus;
  className?: string;
}

const statusConfig = {
  CREATED: {
    label: "Created",
    icon: Clock,
    className: "bg-warning text-warning-foreground",
  },
  VERIFIED_AT_SCALE: {
    label: "Verified",
    icon: CheckCircle,
    className: "bg-status-verified text-white",
  },
  IN_TRANSIT: {
    label: "In Transit",
    icon: Truck,
    className: "bg-primary text-primary-foreground",
  },
  DELIVERED: {
    label: "Delivered",
    icon: Package,
    className: "bg-success text-success-foreground",
  },
};

export const StatusBadge = ({ status, className = "" }: StatusBadgeProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge className={`${config.className} ${className} gap-1.5 px-3 py-1.5 font-semibold`}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
};
