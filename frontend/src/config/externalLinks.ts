export const CLINIC_CREATION_URL = 'https://tetis1.kz/dashboard?createOrg=1'

export function redirectToClinicCreation() {
  window.location.assign(CLINIC_CREATION_URL)
}
