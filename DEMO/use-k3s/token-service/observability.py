"""Prometheus metrics for the HTTP surface.

Kubernetes already knows whether a pod is alive; what it cannot tell you is
whether the service is *working* — how many requests are arriving, how long
they take, and how many come back 5xx. That gap is why a pod can sit `1/1
Running` while every login fails, and it is what these metrics close.

Exposed at ``/metrics`` in the Prometheus text format. Deliberately not routed
by any IngressRoute: Prometheus scrapes pods directly over the cluster network,
so publishing this at the gateway would only hand an outsider a per-endpoint map
of the service's traffic.

The same file is copied into all three services, and into both the compose and
k3s folders. On the compose side nothing scrapes it, which costs one unused
endpoint and keeps the two copies of each service byte-identical — worth more
than saving that endpoint.
"""

import logging

from prometheus_fastapi_instrumentator import Instrumentator

logger = logging.getLogger("observability")


def instrument(app, service_name: str) -> None:
    """Attach request metrics to ``app`` and expose them at /metrics.

    ``service_name`` becomes part of the metric name, so a single Prometheus
    query can compare services without relabelling.
    """
    subsystem = service_name.replace("-", "_")

    Instrumentator(
        # Keep 401 and 403 apart from 404 and each other. Grouping to "4xx"
        # makes the one signal worth alerting on — a spike in 401s meaning
        # tokens stopped verifying — indistinguishable from someone
        # mistyping a URL.
        should_group_status_codes=False,
        # Probes fire every ten seconds per pod forever. Left in, they set a
        # constant floor under every request-rate graph and drag the latency
        # average toward "instant", which hides the requests that matter.
        excluded_handlers=["/metrics", "/health", "/ready"],
        # Report the route template (/users/{account_id}), not the resolved
        # path. Otherwise every account id becomes its own time series and the
        # cardinality grows without limit.
        should_instrument_requests_inprogress=True,
        inprogress_labels=True,
    ).instrument(
        app,
        metric_namespace="sudhood",
        metric_subsystem=subsystem,
    ).expose(
        app,
        endpoint="/metrics",
        include_in_schema=False,
        # No auth on this endpoint. It is reachable only from inside the
        # cluster, and adding a token here would mean giving Prometheus a
        # credential to hold — a worse trade than the exposure it prevents.
        should_gzip=True,
    )

    logger.info(f"metrics exposed at /metrics as sudhood_{subsystem}_*")
