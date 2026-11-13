"""
Storage abstraction for MY CLINIX medical document storage.

CURRENT IMPLEMENTATION: Local filesystem storage (development).
PRODUCTION NOTE: This abstraction is designed to allow plugging in
cloud storage (S3, GCS, Azure Blob) by implementing the StorageBackend
interface. Local storage is NOT suitable for production medical records
without additional security controls (filesystem encryption, backups,
access controls at OS level).

Encryption: AES-256-GCM authenticated encryption via cryptography library.
Key management: DOCUMENT_ENCRYPTION_KEY env var (32-byte hex string = 64 hex chars).
If key is not set, documents are stored unencrypted with a WARNING log.
Never hardcode encryption keys.
"""

import os
import logging
import struct
from pathlib import Path

logger = logging.getLogger(__name__)

_plaintext_warning_emitted = False


class StorageBackend:
    """Abstract base class for storage backends."""

    def save(self, data: bytes, filename: str) -> str:
        """Persist data and return the stored path."""
        raise NotImplementedError

    def load(self, stored_path: str) -> bytes:
        """Load and return raw (decrypted) bytes from stored_path."""
        raise NotImplementedError

    def delete(self, stored_path: str) -> None:
        """Delete the file at stored_path."""
        raise NotImplementedError


class LocalEncryptedStorageBackend(StorageBackend):
    """
    AES-256-GCM authenticated encryption for local filesystem storage.

    On-disk format per file:
        [12-byte random nonce] + [ciphertext] + [16-byte GCM authentication tag]

    Files are stored with the original extension replaced by .enc
    (e.g., abc123.pdf → abc123.pdf.enc).
    """

    def __init__(self, key_hex: str, upload_dir: str):
        raw = bytes.fromhex(key_hex)
        if len(raw) != 32:
            raise ValueError(
                "DOCUMENT_ENCRYPTION_KEY must be a 64-character hex string "
                f"(32 bytes). Got {len(raw)} bytes."
            )
        self._key = raw
        self._upload_dir = upload_dir
        os.makedirs(upload_dir, exist_ok=True)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _enc_path(self, filename: str) -> str:
        return os.path.join(self._upload_dir, filename + ".enc")

    def _encrypt(self, plaintext: bytes) -> bytes:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        nonce = os.urandom(12)
        aesgcm = AESGCM(self._key)
        # encrypt() returns ciphertext + tag (tag appended automatically)
        ct_with_tag = aesgcm.encrypt(nonce, plaintext, None)
        return nonce + ct_with_tag

    def _decrypt(self, blob: bytes) -> bytes:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        if len(blob) < 12 + 16:  # nonce + minimum tag
            raise ValueError("Encrypted blob is too short to be valid.")
        nonce = blob[:12]
        ct_with_tag = blob[12:]
        aesgcm = AESGCM(self._key)
        return aesgcm.decrypt(nonce, ct_with_tag, None)

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def save(self, data: bytes, filename: str) -> str:
        enc_path = self._enc_path(filename)
        blob = self._encrypt(data)
        with open(enc_path, "wb") as fh:
            fh.write(blob)
        logger.debug("Encrypted and saved: %s", enc_path)
        return enc_path

    def load(self, stored_path: str) -> bytes:
        # Support both .enc paths and bare paths (graceful fallback)
        if not stored_path.endswith(".enc"):
            enc_path = stored_path + ".enc"
        else:
            enc_path = stored_path

        if os.path.exists(enc_path):
            with open(enc_path, "rb") as fh:
                blob = fh.read()
            return self._decrypt(blob)

        # Fallback: plaintext file exists (pre-encryption legacy file)
        if os.path.exists(stored_path):
            logger.warning(
                "Loading plaintext fallback for %s — file was stored before "
                "encryption was enabled. Consider re-encrypting.",
                stored_path,
            )
            with open(stored_path, "rb") as fh:
                return fh.read()

        raise FileNotFoundError(f"Document not found at {enc_path} or {stored_path}")

    def delete(self, stored_path: str) -> None:
        for path in (stored_path + ".enc", stored_path):
            if os.path.exists(path):
                os.remove(path)
                logger.debug("Deleted: %s", path)
                return
        logger.warning("delete() called but no file found at %s", stored_path)


class LocalPlaintextStorageBackend(StorageBackend):
    """
    Fallback backend: stores files as plaintext on the local filesystem.
    Used when DOCUMENT_ENCRYPTION_KEY is not configured.
    Emits a one-time WARNING at startup.
    """

    def __init__(self, upload_dir: str):
        self._upload_dir = upload_dir
        os.makedirs(upload_dir, exist_ok=True)

    def save(self, data: bytes, filename: str) -> str:
        path = os.path.join(self._upload_dir, filename)
        with open(path, "wb") as fh:
            fh.write(data)
        return path

    def load(self, stored_path: str) -> bytes:
        # Also check .enc path in case backend was switched
        enc_path = stored_path + ".enc" if not stored_path.endswith(".enc") else stored_path
        if os.path.exists(enc_path):
            raise EnvironmentError(
                f"File {enc_path} appears to be encrypted, but no "
                "DOCUMENT_ENCRYPTION_KEY is configured. Set the key to decrypt."
            )
        with open(stored_path, "rb") as fh:
            return fh.read()

    def delete(self, stored_path: str) -> None:
        if os.path.exists(stored_path):
            os.remove(stored_path)


def get_storage_backend() -> StorageBackend:
    """
    Factory: returns an encrypted backend when DOCUMENT_ENCRYPTION_KEY is set,
    otherwise falls back to plaintext with a one-time WARNING.
    """
    global _plaintext_warning_emitted

    # Import here to avoid circular imports at module load time
    from app.core.config import settings

    upload_dir = settings.UPLOAD_DIRECTORY
    key_hex: str | None = settings.DOCUMENT_ENCRYPTION_KEY

    if key_hex:
        try:
            backend = LocalEncryptedStorageBackend(key_hex=key_hex, upload_dir=upload_dir)
            logger.info(
                "Storage backend: AES-256-GCM encrypted local filesystem (%s)",
                upload_dir,
            )
            return backend
        except Exception as exc:
            logger.error(
                "Failed to initialise encrypted storage backend: %s. "
                "Falling back to PLAINTEXT storage. Fix DOCUMENT_ENCRYPTION_KEY.",
                exc,
            )

    if not _plaintext_warning_emitted:
        logger.warning(
            "⚠️  DOCUMENT_ENCRYPTION_KEY is not set. "
            "Medical documents will be stored as PLAINTEXT on disk. "
            "Set a 64-character hex string in DOCUMENT_ENCRYPTION_KEY "
            "before deploying to production."
        )
        _plaintext_warning_emitted = True

    return LocalPlaintextStorageBackend(upload_dir=upload_dir)


# Module-level singleton — initialised once at import time.
storage = get_storage_backend()
