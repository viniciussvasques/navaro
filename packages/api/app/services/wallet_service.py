"""Wallet service."""

from collections.abc import Sequence
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.wallet import TransactionStatus, TransactionType, UserWallet, WalletTransaction


class WalletService:
    """Wallet service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_wallet(self, user_id: UUID) -> UserWallet:
        """Get or create user wallet."""
        query = (
            select(UserWallet)
            .where(UserWallet.user_id == user_id)
            .options(selectinload(UserWallet.transactions))
        )
        result = await self.db.execute(query)
        wallet = result.scalar_one_or_none()

        if not wallet:
            wallet = UserWallet(user_id=user_id, balance=0.0)
            wallet.transactions = []  # Initialize to avoid lazy load on NEW object
            self.db.add(wallet)
            await self.db.flush()  # To get wallet.id

        return wallet

    async def add_balance(
        self, user_id: UUID, amount: float, description: str, reference_id: str | None = None
    ) -> UserWallet:
        """Add balance to user wallet."""
        wallet = await self.get_wallet(user_id)

        transaction = WalletTransaction(
            wallet_id=wallet.id,
            type=TransactionType.deposit,
            amount=amount,
            status=TransactionStatus.completed,
            description=description,
            reference_id=reference_id,
        )

        wallet.balance = float(Decimal(str(wallet.balance)) + Decimal(str(amount)))
        self.db.add(transaction)
        await self.db.commit()
        return wallet

    async def withdraw_balance(
        self, user_id: UUID, amount: float, description: str, reference_id: str | None = None
    ) -> UserWallet:
        """Withdraw balance from user wallet."""
        wallet = await self.get_wallet(user_id)

        if wallet.balance < amount:
            raise ValueError("Saldo insuficiente")

        transaction = WalletTransaction(
            wallet_id=wallet.id,
            type=TransactionType.payment,
            amount=amount,
            status=TransactionStatus.completed,
            description=description,
            reference_id=reference_id,
        )

        wallet.balance = float(Decimal(str(wallet.balance)) - Decimal(str(amount)))
        self.db.add(transaction)
        await self.db.commit()
        return wallet

    async def get_transactions(self, user_id: UUID) -> Sequence[WalletTransaction]:
        """Get user wallet transactions."""
        wallet = await self.get_wallet(user_id)
        query = (
            select(WalletTransaction)
            .where(WalletTransaction.wallet_id == wallet.id)
            .order_by(WalletTransaction.created_at.desc())
        )
        result = await self.db.execute(query)
        return result.scalars().all()
