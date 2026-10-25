"""Breach alert model."""

import enum
from typing import Optional
from sqlalchemy import String, Text, Index, JSON, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class AlertSeverity(str, enum.Enum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AlertType(str, enum.Enum):
    NEWS = "news"
    DARKWEB = "darkweb"
    URLHAUS = "urlhaus"
    FORUM = "forum"
    SOCIAL = "social"
    MANUAL = "manual"


class BreachAlert(Base, TimestampMixin):
    """Philippines-focused data breach alerts."""
    __tablename__ = "breach_alerts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    alert_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    target: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    severity: Mapped[AlertSeverity] = mapped_column(SQLEnum(AlertSeverity), nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    alert_type: Mapped[AlertType] = mapped_column(SQLEnum(AlertType), default=AlertType.NEWS, nullable=False, index=True)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    evidence_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    alert_metadata: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    acknowledged: Mapped[bool] = mapped_column(default=False, nullable=False)
    acknowledged_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    acknowledged_at: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("ix_breach_severity_created", "severity", "created_at"),
        Index("ix_breach_target_type", "target", "alert_type"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "alert_id": self.alert_id,
            "title": self.title,
            "target": self.target,
            "severity": self.severity.value,
            "source": self.source,
            "description": self.description,
            "link": self.link,
            "type": self.alert_type.value,
            "tags": self.tags,
            "evidence_hash": self.evidence_hash,
            "metadata": self.alert_metadata,
            "acknowledged": self.acknowledged,
            "acknowledged_by": self.acknowledged_by,
            "acknowledged_at": self.acknowledged_at,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }