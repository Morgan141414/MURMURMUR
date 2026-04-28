from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from saphena.modules.enums import ClinicApplicationStatus, ClinicStatus
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
