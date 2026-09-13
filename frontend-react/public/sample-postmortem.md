# Incident Postmortem: Payment API Degradation, 14 March 2025

**Status:** Final · **Severity:** SEV-2 · **Author:** Platform Reliability Team

## Summary

On 14 March 2025 between 09:12 and 10:47 UTC, the Payment API returned
elevated error rates for 95 minutes. A database connection pool exhaustion
event caused 4.3% of all payment requests to fail with HTTP 503. No payment
was double-charged and no card data was exposed. 18,412 failed requests were
recovered through automatic retry within 6 hours of resolution.

## Impact

- 4.3% of Payment API requests failed during the 95-minute window
- 18,412 unique transactions were delayed, of which 312 required manual
  reconciliation by the billing team
- Merchant-facing status page showed "degraded performance" for 88 minutes
- Estimated revenue impact: under €4,000, all recovered

## Timeline (UTC)

- 08:55 — A scheduled migration added 40 read replicas to the analytics
  cluster, sharing the same connection broker as payments
- 09:12 — Payment API error rate crossed the 1% alert threshold; PagerDuty
  paged the on-call engineer
- 09:31 — First mitigation attempt (horizontal scale-out of API pods) had no
  effect because the bottleneck was the connection broker, not compute
- 10:02 — Root cause identified: analytics replica provisioning consumed
  1,900 of the 2,000 available broker connections
- 10:24 — Analytics workload was throttled, freeing 1,500 connections
- 10:47 — Error rate returned to baseline; incident closed

## Root cause

The payments and analytics workloads shared a single connection broker with a
hard limit of 2,000 connections. Nothing in the provisioning runbook required
capacity review for a 40-replica expansion, so the analytics migration was
approved automatically. The connection pool for the Payment API had no
priority reservation, meaning a burst from a non-critical workload could starve
a critical one.

## What went well

- Detection took 4 minutes and was automated
- The status page was updated within 15 minutes of first page
- Automatic retries recovered 98.3% of failed transactions without customer
  contact

## What went poorly

- The first 45 minutes of mitigation were spent on compute scaling, which was
  never the bottleneck
- The runbook for replica provisioning did not mention the shared broker
- Manual reconciliation of 312 transactions took the billing team 5 hours

## Action items

1. Reserve 800 broker connections exclusively for the Payment API — done
   21 March 2025
2. Split analytics and payments onto separate connection brokers — targeted
   for Q3 2025
3. Add a capacity-review gate to the provisioning runbook — done 18 March 2025
4. Alert when a single workload consumes more than 30% of broker capacity —
   done 25 March 2025

## Lessons

Isolation of critical workloads must be enforced by capacity reservations, not
by discipline alone. Shared infrastructure without explicit limits converts a
non-critical mistake into a customer-facing outage.
