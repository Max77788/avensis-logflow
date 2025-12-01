import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";

const PipelineDashboard = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header showHomeButton onHomeClick={() => navigate("/home")} />
      <main className="container mx-auto px-4 py-8 flex-1">
        <h2 className="text-xl font-bold mb-6">Driver Onboarding Pipeline Dashboard</h2>
        <Card className="mb-4 p-4">[Filters placeholder]</Card>
        <Card className="p-4">
          <div className="mb-2 font-semibold">Applications</div>
          <div className="border rounded bg-muted/30 min-h-[240px] flex flex-col items-center justify-center">
            [Table/Kanban pipeline will appear here]
            <Button className="mt-4" onClick={() => navigate("/driver-onboarding/application/uuid_placeholder")}>View Application Detail</Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default PipelineDashboard;
