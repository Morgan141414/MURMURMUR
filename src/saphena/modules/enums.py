from enum import StrEnum


class AccountStatus(StrEnum):
    active = "active"
    blocked = "blocked"


class ClinicApplicationStatus(StrEnum):
    draft = "draft"
    submitted = "submitted"
    in_review = "in_review"
    needs_changes = "needs_changes"
    approved = "approved"
    rejected = "rejected"
    blocked = "blocked"


class ClinicStatus(StrEnum):
    active = "active"
    blocked = "blocked"


class AppointmentStatus(StrEnum):
    created = "created"
    confirmed = "confirmed"
    waiting_confirmation = "waiting_confirmation"
    arrived = "arrived"
    started = "started"
    completed = "completed"
    canceled = "canceled"
    no_show = "no_show"
    rescheduled = "rescheduled"


class ScheduleSlotStatus(StrEnum):
    available = "available"
    booked = "booked"
    blocked = "blocked"
    canceled = "canceled"


class SupportTicketStatus(StrEnum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"


class SupportThreadStatus(StrEnum):
    open = "open"
    in_progress = "in_progress"
    answered = "answered"
    closed = "closed"


class SupportPriority(StrEnum):
    low = "low"
    normal = "normal"
    high = "high"
    critical = "critical"


class LeadStatus(StrEnum):
    new = "new"
    contacted = "contacted"
    converted = "converted"
    closed = "closed"
