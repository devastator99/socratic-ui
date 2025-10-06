import os
import logging
from arweave import Transaction, Wallet
from ipfshttpclient import Client

logger = logging.getLogger(__name__)

ARWEAVE_WALLET_PATH = os.getenv("ARWEAVE_WALLET_PATH")
IPFS_API_URL = os.getenv("IPFS_API_URL", "http://localhost:5001")

class ArweaveIPFSHandler:
    def __init__(self):
        self.wallet = Wallet(ARWEAVE_WALLET_PATH)
        self.ipfs_client = Client(IPFS_API_URL)

    def upload_to_arweave(self, file_path: str) -> str:
        try:
            with open(file_path, "rb") as file:
                tx = Transaction(wallet=self.wallet, data=file.read())
                tx.sign()
                tx.send()
            return tx.id
        except Exception as e:
            logger.error(f"Failed to upload to Arweave: {e}")
            raise

    def upload_to_ipfs(self, file_path: str) -> str:
        try:
            res = self.ipfs_client.add(file_path)
            return res['Hash']
        except Exception as e:
            logger.error(f"Failed to upload to IPFS: {e}")
            raise
