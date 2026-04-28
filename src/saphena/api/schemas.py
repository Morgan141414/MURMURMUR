from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from saphena.modules.enums import (
    AppointmentStatus,
    ClinicApplicationStatus,
    ClinicStatus,
    LeadStatus,
    SupportTicketStatus,
)
from saphena.modules.permissions import RoleCode


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
    iin: str = Field(min_length=12, max_length=12)
    password: str = Field(min_length=8, max_length=128)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    middle_name: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None


class LoginRequest(BaseModel):
    iin: str = Field(min_length=12, max_length=12)
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    account: AccountRead


class ClinicApplicationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    legal_name: str = Field(min_length=1, max_length=255)
    bin_iin: str = Field(min_length=10, max_length=32)
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


class MembershipRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clinic_id: int
    account_id: int
    role_code: RoleCode
    department: str | None = None
    position: str | None = None
    is_active: bool


class RoleDefinitionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    scope: str
    title: str
    permissions: str
    is_system: bool


class ClinicEmployeeAssign(BaseModel):
    iin: str = Field(min_length=12, max_length=12)
    role_code: RoleCode
    department: str | None = Field(default=None, max_length=120)
    position: str | None = Field(default=None, max_length=120)


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


class PatientCreate(BaseModel):
    iin: str = Field(min_length=12, max_length=12)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    middle_name: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
    notes: str | None = None


class PatientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    person_id: int
    notes: str | None = None
    person: PersonRead


class AppointmentCreate(BaseModel):
    patient_profile_id: int
    doctor_membership_id: int | None = None
    starts_at: datetime
    ends_at: datetime
    reason: str | None = None
    status: AppointmentStatus = AppointmentStatus.created


class AppointmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clinic_id: int
    patient_profile_id: int
    doctor_membership_id: int | None = None
    starts_at: datetime
    ends_at: datetime
    status: AppointmentStatus
    reason: str | None = None


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


class SupportTicketCreate(BaseModel):
    clinic_id: int | None = None
    topic: str = Field(min_length=1, max_length=120)
    message: str = Field(min_length=1)


class SupportTicketRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    requester_account_id: int
    clinic_id: int | None = None
    topic: str
    message: str
    status: SupportTicketStatus
    created_at: datetime


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: int
    title: str
    body: str
    read_at: datetime | None = None
    created_at: datetime
