"""Evidence record model."""

import enum
from typing import Optional
from sqlalchemy import String, Text, Index, JSON, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class EvidenceType(str, enum.Enum):
    EMAIL = "email"
    DOMAIN = "domain"
    URL = "url"
    PHONE = "phone"
    USERNAME = "username"
    MEDIA = "media"
    DARKWEB = "darkweb"
    BREACH_ALERT = "breach_alert"


class EvidenceRecord(Base, TimestampMixin):
    """Unified evidence storage across all OSINT modules."""
    __tablename__ = "evidence_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    evidence_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    evidence_type: Mapped[EvidenceType] = mapped_column(SQLEnum(EvidenceType), nullable=False, index=True)
    target: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    evidence_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    case_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    priority: Mapped[str] = mapped_column(String(16), default="medium", nullable=False)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    __table_args__ = (
        Index("ix_evidence_type_target", "evidence_type", "target"),
        Index("ix_evidence_case_created", "case_id", "created_at"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "evidence_id": self.evidence_id,
            "evidence_type": self.evidence_type.value,
            "target": self.target,
            "title": self.title,
            "description": self.description,
            "data": self.data,
            "evidence_hash": self.evidence_hash,
            "case_id": self.case_id,
            "priority": self.priority,
            "tags": self.tags,
            "notes": self.notes,
            "source": self.source,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }