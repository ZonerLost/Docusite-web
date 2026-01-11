import { useEffect } from "react";
import { useRouter } from "next/router";

export default function ProjectDetailsRedirectPage() {
  const router = useRouter();
  const projectId = Array.isArray(router.query.projectId)
    ? router.query.projectId[0]
    : router.query.projectId;

  useEffect(() => {
    if (typeof projectId === "string") {
      router.replace(`/dashboard/projects/${projectId}`);
    }
  }, [projectId, router]);

  if (typeof projectId === "string") {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-700">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <p className="text-sm text-gray-700">No project selected.</p>
    </div>
  );
}
