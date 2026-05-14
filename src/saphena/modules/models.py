from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from saphena.core.database import Base
from saphena.core.security import utcnow
from saphena.modules.enums import (
    AccountStatus,
    AppointmentStatus,
    ClinicApplicationStatus,
    ClinicStatus,
    LeadStatus,
    ScheduleSlotStatus,
    SupportPriority,
    SupportThreadStatus,
    SupportTicketStatus,
)
from saphena.modules.permissions import RoleCode


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class RoleDefinition(Base):
    __tablename__ = "role_definitions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    scope: Mapped[str] = mapped_column(String(32), default="clinic")
    title: Mapped[str] = mapped_column(String(255))
    permissions: Mapped[str] = mapped_column(Text)
    is_system: Mapped[bool] = mapped_column(Boolean, default=True)


class Person(Base, TimestampMixin):
    __tablename__ = "persons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    qtrix_user_id: Mapped[str | None] = mapped_column(String(120), unique=True, index=True, default=None)
    iin: Mapped[str] = mapped_column(String(12), unique=True, index=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    middle_name: Mapped[str | None] = mapped_column(String(100), default=None)
    birth_date: Mapped[date | None] = mapped_column(Date, default=None)
    gender: Mapped[str | None] = mapped_column(String(32), default=None)
    phone: Mapped[str | None] = mapped_column(String(32), default=None)
    email: Mapped[str | None] = mapped_column(String(255), default=None)
    address: Mapped[str | None] = mapped_column(String(255), default=None)
    phone_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)


class Account(Base, TimestampMixin):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("persons.id"))
    password_hash: Mapped[str] = mapped_column(String(255))
    status: Mapped[AccountStatus] = mapped_column(Enum(AccountStatus), default=AccountStatus.active)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)

    person: Mapped[Person] = relationship()


class SessionToken(Base):
    __tablename__ = "session_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), index=True)
    token: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    user_agent: Mapped[str | None] = mapped_column(String(255), default=None)
    ip_address: Mapped[str | None] = mapped_column(String(64), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)

    account: Mapped[Account] = relationship()


class Clinic(Base, TimestampMixin):
    __tablename__ = "clinics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    qtrix_org_id: Mapped[str | None] = mapped_column(String(120), unique=True, index=True, default=None)
    qtrix_sync_status: Mapped[str | None] = mapped_column(String(64), default=None)
    qtrix_last_synced_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    name: Mapped[str] = mapped_column(String(255), index=True)
    legal_name: Mapped[str] = mapped_column(String(255))
    bin_iin: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    address: Mapped[str] = mapped_column(String(255))
    contacts: Mapped[str | None] = mapped_column(Text, default=None)
    status: Mapped[ClinicStatus] = mapped_column(Enum(ClinicStatus), default=ClinicStatus.active)


class ClinicBranch(Base, TimestampMixin):
    __tablename__ = "clinic_branches"
    __table_args__ = (UniqueConstraint("clinic_id", "name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    clinic_id: Mapped[int] = mapped_column(ForeignKey("clinics.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    address: Mapped[str] = mapped_column(String(255))
    contacts: Mapped[str | None] = mapped_column(Text, default=None)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class ClinicDepartment(Base, TimestampMixin):
    __tablename__ = "clinic_departments"
    __table_args__ = (UniqueConstraint("clinic_id", "branch_id", "name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    clinic_id: Mapped[int] = mapped_column(ForeignKey("clinics.id"), index=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("clinic_branches.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, default=None)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class ClinicRoom(Base, TimestampMixin):
    __tablename__ = "clinic_rooms"
    __table_args__ = (UniqueConstraint("clinic_id", "branch_id", "number"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    clinic_id: Mapped[int] = mapped_column(ForeignKey("clinics.id"), index=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("clinic_branches.id"), index=True)
    department_id: Mapped[int | None] = mapped_column(
        ForeignKey("clinic_departments.id"), default=None, index=True
    )
    number: Mapped[str] = mapped_column(String(80))
    title: Mapped[str | None] = mapped_column(String(255), default=None)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class ClinicService(Base, TimestampMixin):
    __tablename__ = "clinic_services"
    __table_args__ = (UniqueConstraint("clinic_id", "code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    clinic_id: Mapped[int] = mapped_column(ForeignKey("clinics.id"), index=True)
    department_id: Mapped[int | None] = mapped_column(
        ForeignKey("clinic_departments.id"), default=None, index=True
    )
    code: Mapped[str] = mapped_column(String(80))
    title: Mapped[str] = mapped_column(String(255))
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30)
    price: Mapped[int | None] = mapped_column(Integer, default=None)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class ClinicApplication(Base, TimestampMixin):
    __tablename__ = "clinic_applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    applicant_account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), index=True)
    clinic_id: Mapped[int | None] = mapped_column(ForeignKey("clinics.id"), default=None)
    name: Mapped[str] = mapped_column(String(255))
    legal_name: Mapped[str] = mapped_column(String(255))
    bin_iin: Mapped[str] = mapped_column(String(32), index=True)
    address: Mapped[str] = mapped_column(String(255))
    contacts: Mapped[str | None] = mapped_column(Text, default=None)
    founder_data: Mapped[str | None] = mapped_column(Text, default=None)
    requisites: Mapped[str | None] = mapped_column(Text, default=None)
    license_info: Mapped[str | None] = mapped_column(Text, default=None)
    oked: Mapped[str | None] = mapped_column(String(64), default=None)
    activity_description: Mapped[str | None] = mapped_column(Text, default=None)
    moderator_comment: Mapped[str | None] = mapped_column(Text, default=None)
    status: Mapped[ClinicApplicationStatus] = mapped_column(
        Enum(ClinicApplicationStatus), default=ClinicApplicationStatus.draft
    )

    applicant: Mapped[Account] = relationship()
    clinic: Mapped[Clinic | None] = relationship()


class ClinicMembership(Base, TimestampMixin):
    __tablename__ = "clinic_memberships"
    __table_args__ = (UniqueConstraint("account_id", "clinic_id", "role_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    qtrix_membership_id: Mapped[str | None] = mapped_column(String(160), unique=True, index=True, default=None)
    qtrix_user_id: Mapped[str | None] = mapped_column(String(120), index=True, default=None)
    qtrix_org_id: Mapped[str | None] = mapped_column(String(120), index=True, default=None)
    qtrix_role: Mapped[str | None] = mapped_column(String(128), default=None)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), index=True)
    clinic_id: Mapped[int] = mapped_column(ForeignKey("clinics.id"), index=True)
    role_code: Mapped[RoleCode] = mapped_column(Enum(RoleCode))
    department: Mapped[str | None] = mapped_column(String(120), default=None)
    position: Mapped[str | None] = mapped_column(String(120), default=None)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    account: Mapped[Account] = relationship()
    clinic: Mapped[Clinic] = relationship()


class PatientProfile(Base, TimestampMixin):
    __tablename__ = "patient_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("persons.id"), unique=True)
    notes: Mapped[str | None] = mapped_column(Text, default=None)

    person: Mapped[Person] = relationship()


class ClinicPatient(Base, TimestampMixin):
    __tablename__ = "clinic_patients"
    __table_args__ = (UniqueConstraint("clinic_id", "patient_profile_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    clinic_id: Mapped[int] = mapped_column(ForeignKey("clinics.id"), index=True)
    patient_profile_id: Mapped[int] = mapped_column(ForeignKey("patient_profiles.id"), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Appointment(Base, TimestampMixin):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    clinic_id: Mapped[int] = mapped_column(ForeignKey("clinics.id"), index=True)
    patient_profile_id: Mapped[int] = mapped_column(ForeignKey("patient_profiles.id"), index=True)
    doctor_membership_id: Mapped[int | None] = mapped_column(
        ForeignKey("clinic_memberships.id"), default=None
    )
    room_id: Mapped[int | None] = mapped_column(ForeignKey("clinic_rooms.id"), default=None)
    service_id: Mapped[int | None] = mapped_column(ForeignKey("clinic_services.id"), default=None)
    starts_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    ends_at: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus), default=AppointmentStatus.created
    )
    reason: Mapped[str | None] = mapped_column(Text, default=None)


class ScheduleSlot(Base, TimestampMixin):
    __tablename__ = "schedule_slots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    clinic_id: Mapped[int] = mapped_column(ForeignKey("clinics.id"), index=True)
    doctor_membership_id: Mapped[int] = mapped_column(
        ForeignKey("clinic_memberships.id"), index=True
    )
    room_id: Mapped[int | None] = mapped_column(ForeignKey("clinic_rooms.id"), default=None)
    service_id: Mapped[int | None] = mapped_column(ForeignKey("clinic_services.id"), default=None)
    starts_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    ends_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    status: Mapped[ScheduleSlotStatus] = mapped_column(
        Enum(ScheduleSlotStatus), default=ScheduleSlotStatus.available
    )
    note: Mapped[str | None] = mapped_column(Text, default=None)


class MedicalRecordEntry(Base, TimestampMixin):
    __tablename__ = "medical_record_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    clinic_id: Mapped[int] = mapped_column(ForeignKey("clinics.id"), index=True)
    patient_profile_id: Mapped[int] = mapped_column(ForeignKey("patient_profiles.id"), index=True)
    author_membership_id: Mapped[int | None] = mapped_column(
        ForeignKey("clinic_memberships.id"), default=None
    )
    appointment_id: Mapped[int | None] = mapped_column(ForeignKey("appointments.id"), default=None)
    complaint: Mapped[str | None] = mapped_column(Text, default=None)
    anamnesis: Mapped[str | None] = mapped_column(Text, default=None)
    diagnosis: Mapped[str | None] = mapped_column(Text, default=None)
    prescription: Mapped[str | None] = mapped_column(Text, default=None)
    conclusion: Mapped[str | None] = mapped_column(Text, default=None)


class DocumentTemplate(Base, TimestampMixin):
    __tablename__ = "document_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    clinic_id: Mapped[int | None] = mapped_column(ForeignKey("clinics.id"), default=None)
    code: Mapped[str] = mapped_column(String(80), index=True)
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)


class GeneratedDocument(Base, TimestampMixin):
    __tablename__ = "generated_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    clinic_id: Mapped[int] = mapped_column(ForeignKey("clinics.id"), index=True)
    template_id: Mapped[int | None] = mapped_column(
        ForeignKey("document_templates.id"), default=None
    )
    patient_profile_id: Mapped[int | None] = mapped_column(
        ForeignKey("patient_profiles.id"), default=None, index=True
    )
    appointment_id: Mapped[int | None] = mapped_column(ForeignKey("appointments.id"), default=None)
    medical_record_entry_id: Mapped[int | None] = mapped_column(
        ForeignKey("medical_record_entries.id"), default=None
    )
    code: Mapped[str] = mapped_column(String(80), index=True)
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    read_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)


class SupportThread(Base, TimestampMixin):
    __tablename__ = "support_threads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    requester_account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), index=True)
    clinic_id: Mapped[int | None] = mapped_column(ForeignKey("clinics.id"), default=None, index=True)
    subject: Mapped[str] = mapped_column(String(160))
    request_type: Mapped[str] = mapped_column(String(64), default="general")
    status: Mapped[SupportThreadStatus] = mapped_column(
        Enum(SupportThreadStatus), default=SupportThreadStatus.open
    )
    priority: Mapped[SupportPriority] = mapped_column(
        Enum(SupportPriority), default=SupportPriority.normal
    )
    assigned_to_account_id: Mapped[int | None] = mapped_column(
        ForeignKey("accounts.id"), default=None, index=True
    )
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime, default=None, index=True)
    request_meta: Mapped[dict[str, object] | None] = mapped_column(JSON, default=None)


class SupportMessage(Base, TimestampMixin):
    __tablename__ = "support_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    thread_id: Mapped[int] = mapped_column(ForeignKey("support_threads.id"), index=True)
    author_account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), index=True)
    body: Mapped[str] = mapped_column(Text)


class SupportTicket(Base, TimestampMixin):
    __tablename__ = "support_tickets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    support_thread_id: Mapped[int | None] = mapped_column(
        ForeignKey("support_threads.id"), default=None, index=True
    )
    requester_account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), index=True)
    clinic_id: Mapped[int | None] = mapped_column(ForeignKey("clinics.id"), default=None)
    topic: Mapped[str] = mapped_column(String(120))
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[SupportTicketStatus] = mapped_column(
        Enum(SupportTicketStatus), default=SupportTicketStatus.open
    )


class CrmLead(Base, TimestampMixin):
    __tablename__ = "crm_leads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    clinic_id: Mapped[int] = mapped_column(ForeignKey("clinics.id"), index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(32), default=None)
    source: Mapped[str | None] = mapped_column(String(120), default=None)
    status: Mapped[LeadStatus] = mapped_column(Enum(LeadStatus), default=LeadStatus.new)
    note: Mapped[str | None] = mapped_column(Text, default=None)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor_account_id: Mapped[int | None] = mapped_column(ForeignKey("accounts.id"), default=None)
    clinic_id: Mapped[int | None] = mapped_column(ForeignKey("clinics.id"), default=None)
    action: Mapped[str] = mapped_column(String(120), index=True)
    entity_type: Mapped[str] = mapped_column(String(120))
    entity_id: Mapped[str | None] = mapped_column(String(64), default=None)
    details: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
