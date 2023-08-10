import { prisma } from "@blobscan/db";
import type { MetricsClient } from "@blobscan/db";
import { api } from "@blobscan/open-telemetry";

export const tracer = api.trace.getTracer("@blobscan/api");

export function getPrismaMetricsClient() {
  /**
   * A little workaround as, for some reason, the metrics client type is not expose in
   * extended prisma clients.
   */
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const metricsClient = prisma.$metrics as MetricsClient | undefined;

  return metricsClient;
}