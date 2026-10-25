"""Scan history model."""

import enum
from typing import Optional
from sqlalchemy import String, Text, Index, JSON, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class ScanType(str, enum.Enum):
    BREACH_NEWS = "breach_news"
    DARKWEB_AHMIA = "darkweb_ahmia"
    DARKWEB_URLHAUS = "darkweb_urlhaus"
    RANSOMWARE = "ransomware"
    DOMAIN = "domain"
    EMAIL = "email"
    USERNAME = "username"
    URL = "url"
    PHONE = "phone"
    MEDIA = "media"
    FULL = "full"


class ScanStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"


class ScanHistory(Base, TimestampMixin):
    """History of all automated and manual scans."""
    __tablename__ = "scan_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    scan_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    scan_type: Mapped[ScanType] = mapped_column(SQLEnum(ScanType), nullable=False, index=True)
    status: Mapped[ScanStatus] = mapped_column(SQLEnum(ScanStatus), default=ScanStatus.PENDING, nullable=False, index=True)
    triggered_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    parameters: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    results_summary: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    alerts_created: Mapped[int] = mapped_column(default=0, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    started_at: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    completed_at: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_seconds: Mapped[Optional[float]] = mapped_column(nullable=True)

    __table_args__ = (
        Index("ix_scan_type_status", "scan_type", "status"),
        Index("ix_scan_triggered_created", "triggered_by", "created_at"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "scan_id": self.scan_id,
            "scan_type": self.scan_type.value,
            "status": self.status.value,
            "triggered_by": self.triggered_by,
            "parameters": self.parameters,
            "results_summary": self.results_summary,
            "alerts_created": self.alerts_created,
            "error_message": self.error_message,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "duration_seconds": self.duration_seconds,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }