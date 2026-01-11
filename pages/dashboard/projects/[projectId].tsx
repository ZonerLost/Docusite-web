import { useRouter } from "next/router";
import ProjectDetailsScreen from "@/components/project-details/ProjectDetailsScreen";

export default function ProjectDetailsPage() {
  const router = useRouter();
  const projectId = Array.isArray(router.query.projectId)
    ? router.query.projectId[0]
    : router.query.projectId;

  if (typeof projectId !== "string") {
    return null;
  }

  return <ProjectDetailsScreen projectId={projectId} />;
}
