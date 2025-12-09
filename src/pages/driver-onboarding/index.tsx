import { useRoutes, Navigate } from "react-router-dom";
import PipelineDashboard from "./PipelineDashboard";
import ApplicationDetail from "./ApplicationDetail";
// import SupervisorView from "./SupervisorView"; // Hidden for now

const OnboardingModuleRoutes = () => {
  return useRoutes([
    { path: "/", element: <PipelineDashboard /> },
    { path: "/pipeline", element: <PipelineDashboard /> },
    { path: "/application/:id", element: <ApplicationDetail /> },
    // { path: "/supervisor", element: <SupervisorView /> }, // Hidden for now
    // fallback to pipeline dashboard
    {
      path: "*",
      element: <Navigate to="/driver-onboarding/pipeline" replace />,
    },
  ]);
};

export default OnboardingModuleRoutes;
