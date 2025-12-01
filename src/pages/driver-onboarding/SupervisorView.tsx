import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";

const SupervisorView = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header showHomeButton onHomeClick={() => navigate("/home")} />
      <main className="container mx-auto px-4 py-8 flex-1">
        <h2 className="text-xl font-bold mb-6">Supervisor View: Cleared Candidates</h2>
        <Card className="mb-4 p-4">[Cleared candidates table/list placeholder]</Card>
        <Card className="p-4">[Onboarding/Training actions placeholder]</Card>
        <div className="pt-6">
          <Button variant="outline" onClick={() => navigate("/driver-onboarding")}>Back to Onboarding Home</Button>
        </div>
      </main>
    </div>
  );
};

export default SupervisorView;
