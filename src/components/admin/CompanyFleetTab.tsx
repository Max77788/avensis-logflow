import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { carrierService, Truck, Driver } from "@/lib/carrierService";

interface CompanyFleetTabProps {
  companyId: string;
}

export const CompanyFleetTab = ({ companyId }: CompanyFleetTabProps) => {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFleetData();
  }, [companyId]);

  const loadFleetData = async () => {
    setIsLoading(true);
    const [trucksData, driversData] = await Promise.all([
      carrierService.getTrucksByCarrier(companyId),
      carrierService.getDriversByCarrier(companyId),
    ]);
    setTrucks(trucksData);
    setDrivers(driversData);
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Trucks */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Trucks ({trucks.length})</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Truck ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : trucks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    No trucks found
                  </TableCell>
                </TableRow>
              ) : (
                trucks.map((truck) => (
                  <TableRow key={truck.id}>
                    <TableCell className="font-medium">{truck.truck_id}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          truck.status === "active" ? "bg-green-500" : "bg-gray-500"
                        }
                      >
                        {truck.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(truck.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Drivers */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Drivers ({drivers.length})</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : drivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    No drivers found
                  </TableCell>
                </TableRow>
              ) : (
                drivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell>{driver.email}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          driver.status === "active" ? "bg-green-500" : "bg-gray-500"
                        }
                      >
                        {driver.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(driver.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

