"""Decentralized storage service wrapper.

Provides simple helper functions to upload files to Arweave (via Bundlr)
with IPFS as a fallback.  Designed so that the rest of the backend can call
`upload_to_arweave` and `upload_to_ipfs` without worrying about SDK details.

If the required SDKs are not installed in the environment this module will
log a warning and return `None` so that callers can degrade gracefully.

The functions return the resulting transaction ID / IPFS hash string on
success, or `None` on failure.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Optional imports – we do them lazily so that the whole backend does not fail
# if the libraries are missing.  Install with:
#   pip install bundlr-client ipfshttpclient
try:
    from bundlr import BundlrClient  # type: ignore
except ImportError:  # pragma: no cover
    BundlrClient = None  # type: ignore

try:
    import ipfshttpclient  # type: ignore
except ImportError:  # pragma: no cover
    ipfshttpclient = None  # type: ignore


ARWEAVE_CURRENCY = os.getenv("ARWEAVE_CURRENCY", "solana")
ARWEAVE_PRIVATE_KEY = os.getenv("ARWEAVE_PRIVATE_KEY")  # base58 for sol, json for arweave keyfile
ARWEAVE_NODE = os.getenv("ARWEAVE_NODE", "https://node1.bundlr.network")

IPFS_API = os.getenv("IPFS_API", "/dns/localhost/tcp/5001/http")


# ---------------------------------------------------------------------------
# Arweave via Bundlr
# ---------------------------------------------------------------------------

def _init_bundlr() -> Optional["BundlrClient"]:
    """Create a Bundlr client instance or None if SDK not available / mis-configured."""
    if BundlrClient is None:
        logger.warning("bundlr-client library not installed; Arweave upload disabled")
        return None

    if not ARWEAVE_PRIVATE_KEY:
        logger.warning("ARWEAVE_PRIVATE_KEY env var not set; Arweave upload disabled")
        return None

    try:
        client = BundlrClient(
            currency=ARWEAVE_CURRENCY,
            privkey=ARWEAVE_PRIVATE_KEY,
            node=ARWEAVE_NODE,
        )
        # sanity request to make sure node reachable
        _ = client.get_balance()
        return client
    except Exception as exc:  # pragma: no cover
        logger.error("Failed to initialise Bundlr client: %s", exc)
        return None


def upload_to_arweave(path: str | Path, content_type: str | None = None) -> Optional[str]:
    """Upload the given file to Arweave.

    Returns the transaction ID on success or ``None`` on failure.
    """
    path = Path(path)
    client = _init_bundlr()
    if client is None:
        return None

    try:
        tags = []
        if content_type:
            tags.append({"name": "Content-Type", "value": content_type})
        tx = client.upload_file(str(path), tags=tags)  # returns transaction ID string
        logger.info("Uploaded %s to Arweave: %s", path.name, tx)
        return tx
    except Exception as exc:  # pragma: no cover
        logger.error("Arweave upload failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# IPFS
# ---------------------------------------------------------------------------

def _init_ipfs_client():
    if ipfshttpclient is None:
        logger.warning("ipfshttpclient library not installed; IPFS upload disabled")
        return None
    try:
        return ipfshttpclient.connect(IPFS_API)
    except Exception as exc:  # pragma: no cover
        logger.error("Could not connect to IPFS API %s: %s", IPFS_API, exc)
        return None


def upload_to_ipfs(path: str | Path) -> Optional[str]:
    """Add the file to a local / remote IPFS node.

    Returns the resulting CID (hash) string on success or ``None`` on failure.
    """
    path = Path(path)
    client = _init_ipfs_client()
    if client is None:
        return None
    try:
        res = client.add(str(path))  # returns dict with 'Hash'
        cid = res["Hash"]
        logger.info("Uploaded %s to IPFS: %s", path.name, cid)
        return cid
    except Exception as exc:  # pragma: no cover
        logger.error("IPFS upload failed: %s", exc)
        return None
