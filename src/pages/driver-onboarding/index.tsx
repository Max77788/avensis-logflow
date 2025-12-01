import { useRoutes, Navigate } from "react-router-dom";
import PipelineDashboard from "./PipelineDashboard";
import ApplicationDetail from "./ApplicationDetail";
import SupervisorView from "./SupervisorView";

const OnboardingModuleRoutes = () => {
  return useRoutes([
    { path: "/pipeline", element: <PipelineDashboard /> },
    { path: "/application/:id", element: <ApplicationDetail /> },
    { path: "/supervisor", element: <SupervisorView /> },
    // fallback to onboarding home
    { path: "*", element: <Navigate to="/driver-onboarding" replace /> },
  ]);
};

export default OnboardingModuleRoutes;
