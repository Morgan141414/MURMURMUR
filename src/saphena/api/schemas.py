from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from saphena.modules.enums import (
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
from saphena.services.identity import is_valid_iin


def _normalize_non_empty(value: str, *, field: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise ValueError(field + " must not be empty")
    return normalized


class PersonRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    iin: str
    first_name: str
    last_name: str
    middle_name: str | None = None
    phone: str | None = None
    email: str | None = None


class AccountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    person: PersonRead
    is_superuser: bool


class RegisterRequest(BaseModel):
    iin: str = Field(min_length=12, max_length=12, pattern=r"^\d{12}$")
    password: str = Field(min_length=8, max_length=128)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    middle_name: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None

    @field_validator("iin")
    @classmethod
    def validate_iin_checksum(cls, value: str) -> str:
        if not is_valid_iin(value):
            raise ValueError("Invalid IIN checksum")
        return value


class LoginRequest(BaseModel):
    iin: str = Field(min_length=12, max_length=12, pattern=r"^\d{12}$")
    password: str

    @field_validator("iin")
    @classmethod
    def validate_iin_checksum(cls, value: str) -> str:
        if not is_valid_iin(value):
            raise ValueError("Invalid IIN checksum")
        return value


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    account: AccountRead


class ClinicApplicationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    legal_name: str = Field(min_length=1, max_length=255)
    bin_iin: str = Field(min_length=12, max_length=12, pattern=r"^\d{12}$")
    address: str = Field(min_length=1, max_length=255)
    contacts: str | None = None
    founder_data: str | None = None
    requisites: str | None = None
    license_info: str | None = None
    oked: str | None = Field(default=None, max_length=64)
    activity_description: str | None = None
    submit: bool = True


class ClinicApplicationModerate(BaseModel):
    status: ClinicApplicationStatus
    moderator_comment: str | None = None


class ClinicApplicationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    legal_name: str
    bin_iin: str
    address: str
    contacts: str | None = None
    founder_data: str | None = None
    requisites: str | None = None
    license_info: str | None = None
    oked: str | None = None
    activity_description: str | None = None
    moderator_comment: str | None = None
    status: ClinicApplicationStatus
    clinic_id: int | None = None
    created_at: datetime
    updated_at: datetime


class ClinicRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    legal_name: str
    bin_iin: str
    address: str
    contacts: str | None = None
    status: ClinicStatus


class TetisFounderPayload(BaseModel):
    iin: str = Field(min_length=12, max_length=12, pattern=r"^\d{12}$")
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    middle_name: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None

    @field_validator("iin")
    @classmethod
    def validate_iin_checksum(cls, value: str) -> str:
        if not is_valid_iin(value):
            raise ValueError("Invalid IIN checksum")
        return value


class TetisClinicSyncRequest(BaseModel):
    external_id: str | None = Field(default=None, max_length=120)
    status: ClinicApplicationStatus = ClinicApplicationStatus.approved
    name: str = Field(min_length=1, max_length=255)
    legal_name: str = Field(min_length=1, max_length=255)
    bin_iin: str = Field(min_length=12, max_length=12, pattern=r"^\d{12}$")
    address: str = Field(min_length=1, max_length=255)
    contacts: str | None = None
    founder: TetisFounderPayload
    founder_data: str | None = None
    requisites: str | None = None
    license_info: str | None = None
    oked: str | None = Field(default=None, max_length=64)
    activity_description: str | None = None
    moderator_comment: str | None = None


class TetisClinicSyncResponse(BaseModel):
    clinic_id: int | None
    application_id: int
    founder_account_id: int
    founder_membership_id: int | None
    status: ClinicApplicationStatus
    created_clinic: bool
    created_founder_account: bool
    created_founder_membership: bool


class TetisEmployeePersonPayload(BaseModel):
    qtrix_user_id: str = Field(min_length=1, max_length=120)
    iin: str = Field(min_length=12, max_length=12, pattern=r"^\d{12}$")
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    middle_name: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None

    @field_validator("iin")
    @classmethod
    def validate_employee_iin_checksum(cls, value: str) -> str:
        if not is_valid_iin(value):
            raise ValueError("Invalid IIN checksum")
        return value


class TetisEmployeeSyncRequest(BaseModel):
    qtrix_membership_id: str = Field(min_length=1, max_length=160)
    qtrix_org_id: str = Field(min_length=1, max_length=120)
    clinic_bin_iin: str = Field(min_length=12, max_length=12, pattern=r"^\d{12}$")
    person: TetisEmployeePersonPayload
    qtrix_role: str = Field(min_length=1, max_length=128)
    role_code: RoleCode
    department: str | None = Field(default=None, max_length=120)
    position: str | None = Field(default=None, max_length=120)
    is_active: bool = True
    employee_status: str | None = Field(default=None, max_length=64)


class TetisEmployeeSyncResponse(BaseModel):
    clinic_id: int
    account_id: int
    membership_id: int
    role_code: RoleCode
    is_active: bool
    created_account: bool
    created_membership: bool


class TetisTransitionLoginRequest(BaseModel):
    token: str = Field(min_length=20, max_length=4096)


class TetisTransitionLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    account: AccountRead


class ClinicBranchCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    address: str = Field(min_length=1, max_length=255)
    contacts: str | None = None


class ClinicBranchRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clinic_id: int
    name: str
    address: str
    contacts: str | None = None
    is_active: bool


class ClinicDepartmentCreate(BaseModel):
    branch_id: int
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None


class ClinicDepartmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clinic_id: int
    branch_id: int
    name: str
    description: str | None = None
    is_active: bool


class ClinicRoomCreate(BaseModel):
    branch_id: int
    department_id: int | None = None
    number: str = Field(min_length=1, max_length=80)
    title: str | None = Field(default=None, max_length=255)


class ClinicRoomRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clinic_id: int
    branch_id: int
    department_id: int | None = None
    number: str
    title: str | None = None
    is_active: bool


class ClinicServiceCreate(BaseModel):
    department_id: int | None = None
    doctor_membership_id: int | None = None
    code: str = Field(min_length=2, max_length=80)
    title: str = Field(min_length=1, max_length=255)
    duration_minutes: int = Field(default=30, ge=5, le=480)
    price: int | None = Field(default=None, ge=0)


class ClinicServiceUpdate(BaseModel):
    department_id: int | None = None
    doctor_membership_id: int | None = None
    title: str | None = Field(default=None, min_length=1, max_length=255)
    duration_minutes: int | None = Field(default=None, ge=5, le=480)
    price: int | None = None
    is_active: bool | None = None


class ClinicServiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clinic_id: int
    department_id: int | None = None
    doctor_membership_id: int | None = None
    code: str
    title: str
    duration_minutes: int
    price: int | None = None
    is_active: bool


class MembershipPersonRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    first_name: str
    last_name: str
    middle_name: str | None = None
    phone: str | None = None


class MembershipRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clinic_id: int
    account_id: int
    role_code: RoleCode
    department: str | None = None
    position: str | None = None
    is_active: bool
    person: MembershipPersonRead | None = None


class RoleDefinitionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    scope: str
    title: str
    permissions: str
    is_system: bool


class ClinicEmployeeAssign(BaseModel):
    iin: str = Field(min_length=12, max_length=12, pattern=r"^\d{12}$")
    role_code: RoleCode
    department: str | None = Field(default=None, max_length=120)
    position: str | None = Field(default=None, max_length=120)

    @field_validator("iin")
    @classmethod
    def validate_iin_checksum(cls, value: str) -> str:
        if not is_valid_iin(value):
            raise ValueError("Invalid IIN checksum")
        return value


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_account_id: int | None
    clinic_id: int | None
    action: str
    entity_type: str
    entity_id: str | None
    details: str | None
    created_at: datetime


class BootstrapDemoResponse(BaseModel):
    message: str
    superadmin_iin: str
    superadmin_password: str
    founder_iin: str
    founder_password: str
    doctor_iin: str
    doctor_password: str
    patient_iin: str
    patient_password: str
    reception_iin: str
    reception_password: str
    support_iin: str
    support_password: str


class PatientCreate(BaseModel):
    iin: str = Field(min_length=12, max_length=12, pattern=r"^\d{12}$")
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    middle_name: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
    notes: str | None = None

    @field_validator("iin")
    @classmethod
    def validate_iin_checksum(cls, value: str) -> str:
        if not is_valid_iin(value):
            raise ValueError("Invalid IIN checksum")
        return value


class PatientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    person_id: int
    notes: str | None = None
    person: PersonRead


class AppointmentCreate(BaseModel):
    patient_profile_id: int
    doctor_membership_id: int | None = None
    room_id: int | None = None
    service_id: int | None = None
    starts_at: datetime
    ends_at: datetime
    reason: str | None = None
    status: AppointmentStatus = AppointmentStatus.created

    @model_validator(mode="after")
    def validate_time_window(self) -> "AppointmentCreate":
        if self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be greater than starts_at")
        return self


class AppointmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clinic_id: int
    patient_profile_id: int
    doctor_membership_id: int | None = None
    room_id: int | None = None
    service_id: int | None = None
    starts_at: datetime
    ends_at: datetime
    status: AppointmentStatus
    reason: str | None = None


class AppointmentUpdate(BaseModel):
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    status: AppointmentStatus | None = None
    reason: str | None = None
    doctor_membership_id: int | None = None
    room_id: int | None = None
    service_id: int | None = None

    @model_validator(mode="after")
    def validate_time_window(self) -> "AppointmentUpdate":
        if (
            self.starts_at is not None
            and self.ends_at is not None
            and self.ends_at <= self.starts_at
        ):
            raise ValueError("ends_at must be greater than starts_at")
        return self


class ScheduleSlotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    doctor_membership_id: int | None = None
    patient_profile_id: int
    starts_at: datetime
    ends_at: datetime
    status: AppointmentStatus
    reason: str | None = None


class DoctorScheduleSlotCreate(BaseModel):
    doctor_membership_id: int
    room_id: int | None = None
    service_id: int | None = None
    starts_at: datetime
    ends_at: datetime
    status: ScheduleSlotStatus = ScheduleSlotStatus.available
    note: str | None = None

    @model_validator(mode="after")
    def validate_time_window(self) -> "DoctorScheduleSlotCreate":
        if self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be greater than starts_at")
        return self


class DoctorScheduleSlotUpdate(BaseModel):
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    status: ScheduleSlotStatus | None = None
    note: str | None = None
    room_id: int | None = None
    service_id: int | None = None

    @model_validator(mode="after")
    def validate_time_window(self) -> "DoctorScheduleSlotUpdate":
        if (
            self.starts_at is not None
            and self.ends_at is not None
            and self.ends_at <= self.starts_at
        ):
            raise ValueError("ends_at must be greater than starts_at")
        return self


class DoctorScheduleSlotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clinic_id: int
    doctor_membership_id: int
    room_id: int | None = None
    service_id: int | None = None
    starts_at: datetime
    ends_at: datetime
    status: ScheduleSlotStatus
    note: str | None = None


class ScheduleTemplateRuleCreate(BaseModel):
    weekday: int  # 0=Mon … 6=Sun
    start_time: str  # "HH:MM"
    end_time: str    # "HH:MM"
    room_id: int | None = None
    service_id: int | None = None


class ScheduleTemplateRuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    weekday: int
    start_time: str
    end_time: str
    room_id: int | None = None
    service_id: int | None = None


class ScheduleTemplateCreate(BaseModel):
    doctor_membership_id: int
    name: str
    rules: list[ScheduleTemplateRuleCreate]


class ScheduleTemplateUpdate(BaseModel):
    name: str | None = None
    rules: list[ScheduleTemplateRuleCreate] | None = None


class ScheduleTemplateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clinic_id: int
    doctor_membership_id: int
    name: str
    rules: list[ScheduleTemplateRuleRead]


class MedicalRecordEntryCreate(BaseModel):
    patient_profile_id: int
    author_membership_id: int | None = None
    appointment_id: int | None = None
    complaint: str | None = None
    anamnesis: str | None = None
    diagnosis: str | None = None
    prescription: str | None = None
    conclusion: str | None = None


class MedicalRecordEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clinic_id: int
    patient_profile_id: int
    author_membership_id: int | None = None
    appointment_id: int | None = None
    complaint: str | None = None
    anamnesis: str | None = None
    diagnosis: str | None = None
    prescription: str | None = None
    conclusion: str | None = None
    created_at: datetime


class DocumentTemplateCreate(BaseModel):
    code: str = Field(min_length=2, max_length=80)
    title: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1)


class DocumentTemplateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clinic_id: int | None = None
    code: str
    title: str
    body: str
    created_at: datetime
    updated_at: datetime


class DocumentRenderRequest(BaseModel):
    template_id: int | None = None
    template_code: str | None = Field(default=None, max_length=80)
    title: str | None = Field(default=None, max_length=255)
    patient_profile_id: int | None = None
    appointment_id: int | None = None
    medical_record_entry_id: int | None = None
    extras: dict[str, str] | None = None


class GeneratedDocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clinic_id: int
    template_id: int | None = None
    patient_profile_id: int | None = None
    appointment_id: int | None = None
    medical_record_entry_id: int | None = None
    code: str
    title: str
    body: str
    created_at: datetime


class LeadCreate(BaseModel):
    clinic_id: int
    full_name: str = Field(min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    source: str | None = Field(default=None, max_length=120)
    note: str | None = None
    status: LeadStatus = LeadStatus.new


class LeadRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clinic_id: int
    full_name: str
    phone: str | None = None
    source: str | None = None
    status: LeadStatus
    note: str | None = None
    created_at: datetime


class LeadUpdate(BaseModel):
    status: LeadStatus | None = None
    note: str | None = None


class SupportThreadCreate(BaseModel):
    clinic_id: int | None = None
    subject: str = Field(min_length=1, max_length=160)
    body: str = Field(min_length=1)
    request_type: str = Field(default="general", min_length=1, max_length=64)
    priority: SupportPriority = SupportPriority.normal
    request_meta: dict[str, object] | None = None

    @field_validator("subject", "body", "request_type")
    @classmethod
    def validate_thread_text_fields(cls, value: str, info):
        return _normalize_non_empty(value, field=info.field_name)


class SupportThreadUpdate(BaseModel):
    status: SupportThreadStatus | None = None
    priority: SupportPriority | None = None
    assigned_to_account_id: int | None = None


class SupportMessageCreate(BaseModel):
    body: str = Field(min_length=1)

    @field_validator("body")
    @classmethod
    def validate_message_body(cls, value: str) -> str:
        return _normalize_non_empty(value, field="body")


class SupportMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    thread_id: int
    author_account_id: int
    body: str
    created_at: datetime


class SupportThreadRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    requester_account_id: int
    clinic_id: int | None = None
    subject: str
    request_type: str
    status: SupportThreadStatus
    priority: SupportPriority
    assigned_to_account_id: int | None = None
    last_message_at: datetime | None = None
    request_meta: dict[str, object] | None = None
    created_at: datetime
    updated_at: datetime


class SupportThreadDetailRead(SupportThreadRead):
    messages: list[SupportMessageRead]


class SupportTicketCreate(BaseModel):
    clinic_id: int | None = None
    topic: str = Field(min_length=1, max_length=120)
    message: str = Field(min_length=1)

    @field_validator("topic", "message")
    @classmethod
    def validate_ticket_text_fields(cls, value: str, info):
        return _normalize_non_empty(value, field=info.field_name)


class SupportTicketRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    requester_account_id: int
    support_thread_id: int | None = None
    clinic_id: int | None = None
    topic: str
    message: str
    status: SupportTicketStatus
    created_at: datetime


class SupportTicketUpdate(BaseModel):
    status: SupportTicketStatus
    message: str | None = None


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: int
    title: str
    body: str
    read_at: datetime | None = None
    created_at: datetime


class NotificationMarkReadResponse(BaseModel):
    id: int
    read_at: datetime


class CrmServiceRead(BaseModel):
    """Service from Qtrix CRM price list."""
    qtrix_id: str
    name: str
    category: str | None = None
    price_type: str = "not_set"
    exact_price: float | None = None
    min_price: float | None = None
    max_price: float | None = None
    currency: str = "KZT"


class CrmAppointmentRead(BaseModel):
    """Appointment sourced from Qtrix CRM, normalized for calendar display."""
    id: str                          # Qtrix UUID as string
    source: str = "crm"
    doctor_membership_id: int | None = None   # resolved from qtrix_user_id
    doctor_qtrix_id: str | None = None
    lead_name: str | None = None
    lead_mobile: str | None = None
    starts_at: datetime
    ends_at: datetime
    status: str
    title: str
    notes: str | None = None
