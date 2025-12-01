import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";

const ApplicationDetail = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header showHomeButton onHomeClick={() => navigate("/home")} />
      <main className="container mx-auto px-4 py-8 flex-1">
        <h2 className="text-xl font-bold mb-6">Application Detail</h2>
        <Tabs defaultValue="overview" className="w-full max-w-3xl mx-auto">
          <TabsList className="mb-4 gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          </TabsList>
          <TabsContent value="overview"><Card className="p-4">[Overview tab placeholder]</Card></TabsContent>
          <TabsContent value="verification"><Card className="p-4">[Verification tab placeholder]</Card></TabsContent>
          <TabsContent value="documents"><Card className="p-4">[Documents/Consent tab placeholder]</Card></TabsContent>
          <TabsContent value="compliance"><Card className="p-4">[Compliance/MVR/Drug tab placeholder]</Card></TabsContent>
          <TabsContent value="onboarding"><Card className="p-4">[Onboarding/Training tab placeholder]</Card></TabsContent>
        </Tabs>
        <div className="pt-6">
          <Button variant="outline" onClick={() => navigate("/driver-onboarding/pipeline")}>Back to Pipeline</Button>
        </div>
      </main>
    </div>
  );
};

export default ApplicationDetail;
