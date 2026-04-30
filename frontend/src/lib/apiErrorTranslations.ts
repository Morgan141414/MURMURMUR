import i18n from '@/i18n'

const API_ERROR_KEY_MAP: Record<string, string> = {
  'Admin or Super Admin only': 'errors.api.adminOrSuperAdminOnly',
  'Department head can delete only department teams': 'errors.api.departmentHeadDeleteOnlyDepartmentTeams',
  'Insufficient permissions': 'errors.api.insufficientPermissions',
  'Insufficient permissions to approve join requests': 'errors.api.insufficientPermissionsApproveJoinRequests',
  'Insufficient permissions to approve or publish vacancy': 'errors.api.insufficientPermissionsApproveOrPublishVacancy',
  'Insufficient permissions to create invitations': 'errors.api.insufficientPermissionsCreateInvitations',
  'Insufficient permissions to create project': 'errors.api.insufficientPermissionsCreateProject',
  'Insufficient permissions to invite to department': 'errors.api.insufficientPermissionsInviteToDepartment',
  'Insufficient permissions to manage HR profile': 'errors.api.insufficientPermissionsManageHrProfile',
  'Insufficient permissions to manage board columns': 'errors.api.insufficientPermissionsManageBoardColumns',
  'Insufficient permissions to move team to another department': 'errors.api.insufficientPermissionsMoveTeamToAnotherDepartment',
  'Insufficient permissions to reject join requests': 'errors.api.insufficientPermissionsRejectJoinRequests',
  'Insufficient permissions to update budget approval': 'errors.api.insufficientPermissionsUpdateBudgetApproval',
  'Insufficient permissions to update department': 'errors.api.insufficientPermissionsUpdateDepartment',
  'Insufficient permissions to update offer status': 'errors.api.insufficientPermissionsUpdateOfferStatus',
  'Insufficient permissions to update team': 'errors.api.insufficientPermissionsUpdateTeam',
  'Insufficient permissions to view invitations': 'errors.api.insufficientPermissionsViewInvitations',
  'Insufficient permissions to view join requests': 'errors.api.insufficientPermissionsViewJoinRequests',
  'Insufficient permissions to view moderation summary': 'errors.api.insufficientPermissionsViewModerationSummary',
  'Insufficient role to assign permissions': 'errors.api.insufficientRoleAssignPermissions',
  'No access to this HR document': 'errors.api.noAccessHrDocument',
  'No access to this support thread': 'errors.api.noAccessSupportThread',
  'No role in this organization': 'errors.api.noRoleInOrg',
  'Only Founder can edit registration submission': 'errors.api.onlyFounderEditRegistrationSubmission',
  'Only Founder can submit company changes for moderation': 'errors.api.onlyFounderSubmitCompanyChangesModeration',
  'Only Founder or CEO can assign department head': 'errors.api.onlyFounderOrCeoAssignDepartmentHead',
  'Only Founder or CEO can submit ownership changes for moderation': 'errors.api.onlyFounderOrCeoSubmitOwnershipChangesModeration',
  'Only order author or leadership can execute this termination': 'errors.api.onlyOrderAuthorOrLeadershipExecuteTermination',
  'Only your own task can be marked as personal': 'errors.api.onlyOwnTaskMarkedPersonal',
  'Organization context is required for legal support requests': 'errors.api.organizationContextRequiredForLegalSupport',
  'Personal tasks can only be created for yourself': 'errors.api.personalTasksOnlyForSelf',
  'Support administrators cannot create tickets in their own support queue': 'errors.api.supportAdminsCannotCreateTicketsInOwnQueue',
  'Team members can only update team logo': 'errors.api.teamMembersOnlyUpdateTeamLogo',
  'Tech support cannot create tickets to its own queue': 'errors.api.techSupportCannotCreateTicketsOwnQueue',
  'This invitation is assigned to another email': 'errors.api.invitationAssignedToAnotherEmail',
  'You are not an approver for this termination order': 'errors.api.notApproverForTerminationOrder',
  'You can delete only your own comments': 'errors.api.onlyOwnCommentsDelete',
  'You can edit only your own comments': 'errors.api.onlyOwnCommentsEdit',
  'You cannot ban your own account': 'errors.api.cannotBanOwnAccount',
  'You cannot change your own platform role': 'errors.api.cannotChangeOwnPlatformRole',
  'You cannot remove your own platform role': 'errors.api.cannotRemoveOwnPlatformRole',
}

export function translateApiErrorDetail(detail: string): string {
  const key = API_ERROR_KEY_MAP[detail]
  if (!key) return detail
  const translated = i18n.t(key)
  return translated || detail
}
