export const dynamic = "force-dynamic";

function value(name: string) {
  const raw = process.env[name]?.trim();
  return raw || null;
}

export async function GET() {
  const commit = value("RAILWAY_GIT_COMMIT_SHA") || value("GIT_COMMIT_SHA") || value("VERCEL_GIT_COMMIT_SHA");
  const deployment = {
    provider: value("RAILWAY_ENVIRONMENT_ID") ? "railway" : "unknown",
    projectId: value("RAILWAY_PROJECT_ID"),
    serviceId: value("RAILWAY_SERVICE_ID"),
    environmentId: value("RAILWAY_ENVIRONMENT_ID"),
    deploymentId: value("RAILWAY_DEPLOYMENT_ID"),
    serviceName: value("RAILWAY_SERVICE_NAME"),
    environmentName: value("RAILWAY_ENVIRONMENT_NAME"),
    branch: value("RAILWAY_GIT_BRANCH"),
    commit,
    commitShort: commit?.slice(0, 8) || null,
  };

  return Response.json(
    {
      ok: true,
      service: "ifixit",
      deployment,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-iFixMV-Commit": deployment.commitShort || "unknown",
        "X-iFixMV-Service": deployment.serviceId || deployment.serviceName || "unknown",
      },
    },
  );
}
