const OPERATIONAL_PERMISSIONS = Object.freeze([
  "JOBS",
  "CANDIDATES",
  "INTERVIEWS",
  "ASSESSMENTS",
  "SCORECARDS",
  "RUBRICS",
  "QUESTION_SETS",
  "PERSONAS",
  "REVIEW_QUEUE",
  "MESSAGE_TEMPLATES",
  "INTENT_PHRASES",
]);

const ADMIN_PERMISSIONS = Object.freeze([
  ...OPERATIONAL_PERMISSIONS,
  "COMPANY_ANALYTICS",
  "TEAM_MANAGE",
  "WORKSPACE_SETTINGS",
  "SUBSCRIPTION_MANAGE",
  "BILLING_MANAGE",
  "SENSITIVE_DATA_RIGHTS",
]);

const ROLE_PERMISSIONS = Object.freeze({
  admin: ADMIN_PERMISSIONS,
  recruiter: OPERATIONAL_PERMISSIONS,
});

export function getCompanyPermissions(role) {
  return Object.hasOwn(ROLE_PERMISSIONS, role) ? ROLE_PERMISSIONS[role] : [];
}

export function hasCompanyPermission(role, permission) {
  return getCompanyPermissions(role).includes(permission);
}

export function isCompanyAdmin(role) {
  return role === "admin";
}

export function isCompanyUser(role) {
  return role === "admin" || role === "recruiter";
}
