"""Production visibility: grep-able structured logs + optional Sentry.

Render's log viewer is plain text, so every operational event is emitted as
ONE line with `event=... key=value` fields — filterable with a substring
search (e.g. grep `event=providers_exhausted`) without any log infrastructure.

Sentry is fully optional: it activates only when SENTRY_DSN is set in the
environment, so local runs and deploys without Sentry change behaviour at all.
"""

import logging
import os
import sys
from datetime import datetime, timezone

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

LOG = logging.getLogger("neuraldocs")

# Longest a single field value may get inside a log line. Provider errors
# embed multi-KB JSON bodies; the useful part (status + reason) is early.
MAX_FIELD = 300


def _one_line(value):
    """Collapse whitespace and clip, so a log line stays one line."""
    text = " ".join(str(value).split())
    if len(text) > MAX_FIELD:
        text = text[: MAX_FIELD - 1] + "…"
    return text


def setup_logging():
    """Route the app logger to stdout (Render collects stdout)."""
    root = logging.getLogger()
    if not any(getattr(h, "_neuraldocs", False) for h in root.handlers):
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s %(levelname)s %(message)s",
                datefmt="%Y-%m-%dT%H:%M:%S",
            )
        )
        handler._neuraldocs = True
        root.addHandler(handler)
    LOG.setLevel(logging.INFO)


def log_event(level, event, **fields):
    """Emit one structured line: `event=x kind=y detail="z"`.

    `level` is the friendly name ("info"/"warning"/"error") so call sites
    read like log statements, not logging constants."""
    if isinstance(level, str):
        level = getattr(logging, level.upper(), logging.INFO)
    parts = [f"event={event}"]
    for key, value in fields.items():
        text = _one_line(value)
        if not text:
            continue
        parts.append(f"{key}={text}" if " " not in text else f'{key}="{text}"')
    LOG.log(level, " ".join(parts))


# ------------------------------------------------------------------
# SENTRY
# ------------------------------------------------------------------

def init_sentry():
    """Init the SDK only when a DSN is configured; returns whether active."""
    dsn = os.getenv("SENTRY_DSN")
    if not dsn:
        return False
    sentry_sdk.init(
        dsn=dsn,
        integrations=[FastApiIntegration()],
        # Render injects the commit sha of the deploy as RENDER_GIT_COMMIT.
        release=os.getenv("RENDER_GIT_COMMIT") or None,
        environment=os.getenv("SENTRY_ENVIRONMENT", "production"),
        traces_sample_rate=0.0,   # error tracking only, no paid tracing
        send_default_pii=False,
    )
    return True


def _sentry_active():
    try:
        return sentry_sdk.get_client().is_active()
    except Exception:
        return False


def capture_error(message, *, fingerprint=None, **extra):
    """Send a handled-but-important failure (e.g. provider exhaustion) to
    Sentry with diagnostic context. No-op when Sentry isn't configured."""
    if not _sentry_active():
        return
    try:
        with sentry_sdk.new_scope() as scope:
            if fingerprint:
                scope.fingerprint = list(fingerprint)
            for key, value in extra.items():
                scope.set_extra(key, _one_line(value))
            sentry_sdk.capture_message(message, level="error")
    except Exception:
        # Telemetry must never take down the request path.
        pass


def capture_exception(exc, *, fingerprint=None, **extra):
    if not _sentry_active():
        return
    try:
        with sentry_sdk.new_scope() as scope:
            if fingerprint:
                scope.fingerprint = list(fingerprint)
            for key, value in extra.items():
                scope.set_extra(key, _one_line(value))
            sentry_sdk.capture_exception(exc)
    except Exception:
        pass
