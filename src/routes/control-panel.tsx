import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/control-panel")({
  component: () => <Navigate to="/panel" />,
});
