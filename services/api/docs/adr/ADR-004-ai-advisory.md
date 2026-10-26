# ADR-004: The AI is advisory; Tier 3 is decided by deterministic rules

- Status: Accepted (2026-10-24)
- Deciders: backend owner, clinical reviewer sign-off requested
- Related: R-CRISIS-01, B01, Global Rule 7

## Context

LLM providers are non-deterministic, can time out, can be rate-limited and can
return a plausible-sounding but wrong classification. Explicit statements of
intent to end one's life must not depend on a network call to a third party.

## Decision

1. A versioned, deterministic phrase/rule detector runs first, synchronously, in
   process. If it fires, the result is Tier 3 regardless of anything else.
2. Only when it does not fire is the AI consulted, within the remaining budget
   (total under 2 seconds, AI cap 1800 ms).
3. The AI can raise a signal to Tier 1/Tier 2 or flag `possible_concern`. It can
   never lower, delay or suppress a deterministic decision.
4. The rule version is stored on every `crisis_events` row (`rule_version`) so a
   decision can be explained later.
5. If every provider fails, the response is still a valid decision based on the
   rules; the text is queued for a background scan.

## Consequences

- The phrase list is clinical content. It is versioned, reviewed, and changed
  only with reviewer sign-off. It is not in this repository yet (`[ASSUMPTION]`,
  pending the consolidated spec).
- False positives are accepted. A human review step exists for exactly that.
- The AI can still add value on subtle language, without being a single point of
  failure.
