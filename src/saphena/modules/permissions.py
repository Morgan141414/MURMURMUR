from enum import StrEnum


class RoleCode(StrEnum):
    platform_superadmin = "platform_superadmin"
    platform_moderator = "platform_moderator"
    support_agent = "support_agent"
    clinic_founder = "clinic_founder"
    clinic_ceo = "clinic_ceo"
    chief_doctor = "chief_doctor"
    doctor = "doctor"
    doctor_assistant = "doctor_assistant"
    reception_admin = "reception_admin"
    medical_moderator = "medical_moderator"
    nurse = "nurse"
    department_head = "department_head"
    sanitary = "sanitary"
    senior_nurse = "senior_nurse"
    call_center = "call_center"
    patient = "patient"


class PermissionCode(StrEnum):
    clinic_application_create = "clinic_application:create"
    clinic_application_moderate = "clinic_application:moderate"
    clinic_read = "clinic:read"
    org_structure_manage = "org_structure:manage"
    employee_manage = "employee:manage"
    patient_manage = "patient:manage"
    schedule_manage = "schedule:manage"
    appointment_manage = "appointment:manage"
    medical_record_read = "medical_record:read"
    document_manage = "document:manage"
    audit_read = "audit:read"
    support_manage = "support:manage"
    crm_manage = "crm:manage"


ROLE_TITLES: dict[RoleCode, str] = {
    RoleCode.platform_superadmin: "Platform Superadmin",
    RoleCode.platform_moderator: "Platform Moderator",
    RoleCode.support_agent: "Support Agent",
    RoleCode.clinic_founder: "Clinic Founder",
    RoleCode.clinic_ceo: "Clinic CEO",
    RoleCode.chief_doctor: "Глав. врач",
    RoleCode.doctor: "Врачи",
    RoleCode.doctor_assistant: "Ассистент врача",
    RoleCode.reception_admin: "Ресепшн",
    RoleCode.medical_moderator: "Модератор",
    RoleCode.nurse: "Медсестра/медбрат",
    RoleCode.department_head: "Заведующий отделением",
    RoleCode.sanitary: "Санитарка",
    RoleCode.senior_nurse: "Старший/ая медсестра/медбрат",
    RoleCode.call_center: "Call Center",
    RoleCode.patient: "Пациент",
}


ROLE_PERMISSIONS: dict[RoleCode, set[PermissionCode]] = {
    RoleCode.platform_superadmin: set(PermissionCode),
    RoleCode.platform_moderator: {
        PermissionCode.clinic_application_moderate,
        PermissionCode.clinic_read,
        PermissionCode.audit_read,
    },
    RoleCode.support_agent: {PermissionCode.support_manage, PermissionCode.audit_read},
    RoleCode.clinic_founder: {
        PermissionCode.clinic_read,
        PermissionCode.org_structure_manage,
        PermissionCode.employee_manage,
        PermissionCode.patient_manage,
        PermissionCode.schedule_manage,
        PermissionCode.appointment_manage,
        PermissionCode.document_manage,
        PermissionCode.audit_read,
        PermissionCode.crm_manage,
    },
    RoleCode.clinic_ceo: {
        PermissionCode.clinic_read,
        PermissionCode.org_structure_manage,
        PermissionCode.employee_manage,
        PermissionCode.patient_manage,
        PermissionCode.schedule_manage,
        PermissionCode.appointment_manage,
        PermissionCode.document_manage,
        PermissionCode.crm_manage,
    },
    RoleCode.chief_doctor: {
        PermissionCode.clinic_read,
        PermissionCode.org_structure_manage,
        PermissionCode.employee_manage,
        PermissionCode.patient_manage,
        PermissionCode.schedule_manage,
        PermissionCode.appointment_manage,
        PermissionCode.medical_record_read,
        PermissionCode.document_manage,
        PermissionCode.audit_read,
    },
    RoleCode.department_head: {
        PermissionCode.clinic_read,
        PermissionCode.org_structure_manage,
        PermissionCode.employee_manage,
        PermissionCode.patient_manage,
        PermissionCode.schedule_manage,
        PermissionCode.appointment_manage,
        PermissionCode.medical_record_read,
        PermissionCode.document_manage,
    },
    RoleCode.doctor: {
        PermissionCode.clinic_read,
        PermissionCode.appointment_manage,
        PermissionCode.medical_record_read,
        PermissionCode.document_manage,
    },
    RoleCode.doctor_assistant: {
        PermissionCode.clinic_read,
        PermissionCode.appointment_manage,
        PermissionCode.medical_record_read,
        PermissionCode.document_manage,
    },
    RoleCode.nurse: {
        PermissionCode.clinic_read,
        PermissionCode.patient_manage,
        PermissionCode.appointment_manage,
        PermissionCode.medical_record_read,
        PermissionCode.document_manage,
    },
    RoleCode.senior_nurse: {
        PermissionCode.clinic_read,
        PermissionCode.employee_manage,
        PermissionCode.patient_manage,
        PermissionCode.appointment_manage,
        PermissionCode.medical_record_read,
        PermissionCode.document_manage,
    },
    RoleCode.reception_admin: {
        PermissionCode.clinic_read,
        PermissionCode.patient_manage,
        PermissionCode.appointment_manage,
        PermissionCode.schedule_manage,
    },
    RoleCode.medical_moderator: {
        PermissionCode.clinic_read,
        PermissionCode.patient_manage,
        PermissionCode.document_manage,
        PermissionCode.audit_read,
    },
    RoleCode.sanitary: {PermissionCode.clinic_read, PermissionCode.appointment_manage},
    RoleCode.call_center: {
        PermissionCode.clinic_read,
        PermissionCode.appointment_manage,
        PermissionCode.crm_manage,
    },
    RoleCode.patient: {PermissionCode.clinic_application_create},
}
