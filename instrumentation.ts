// OpenTelemetry instrumentation for the Mr Frogs backend.
//
// Sends traces to Overmind via OTLP-HTTP. Per the Overmind docs:
//   OTLP endpoint:  https://api.overmindlab.ai/api/v1/traces
//   Auth header:    X-Api-Key: ovr_...
//
// Env vars:
//   OTEL_EXPORTER_OTLP_ENDPOINT  override the traces URL (optional)
//   OVERMIND_API_KEY             the Overmind API key (required to ship traces)
//
// Best-effort: if OVERMIND_API_KEY is unset, instrumentation initialises in a
// no-op mode (the @opentelemetry/api tracer becomes a noop tracer), so the
// app runs identically with or without Overmind configured.
//
// Next.js calls register() once per server process when
// experimental.instrumentationHook is enabled.
//
// We use the lower-level NodeTracerProvider rather than @opentelemetry/sdk-node
// because sdk-node has a hard transitive dependency on @opentelemetry/exporter-logs-otlp-grpc
// which pulls in @grpc/grpc-js, which references Node built-ins that Next's
// webpack pipeline can't resolve.

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const apiKey = process.env.OVERMIND_API_KEY;
  if (!apiKey) {
    console.log("[overmind] OVERMIND_API_KEY not set — tracing disabled.");
    return;
  }

  const endpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    "https://api.overmindlab.ai/api/v1/traces";

  try {
    const { NodeTracerProvider } = await import("@opentelemetry/sdk-trace-node");
    const { BatchSpanProcessor } = await import("@opentelemetry/sdk-trace-base");
    const { OTLPTraceExporter } = await import(
      "@opentelemetry/exporter-trace-otlp-http"
    );
    const { resourceFromAttributes } = await import("@opentelemetry/resources");
    const { ATTR_SERVICE_NAME } = await import(
      "@opentelemetry/semantic-conventions"
    );

    const exporter = new OTLPTraceExporter({
      url: endpoint,
      headers: { "X-Api-Key": apiKey },
    });

    const provider = new NodeTracerProvider({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: "mr-frogs",
      }),
      spanProcessors: [new BatchSpanProcessor(exporter)],
    });
    provider.register();

    console.log(`[overmind] tracing → ${endpoint}`);

    process.on("SIGTERM", () => {
      provider.shutdown().catch(() => {});
    });
  } catch (e) {
    // Initialisation must never break the app — log and continue without
    // tracing if any of the OTel deps fail to load.
    console.error("[overmind] failed to initialise OTel:", e);
  }
}
