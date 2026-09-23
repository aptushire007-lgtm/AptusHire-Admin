// Saved message templates: the placeholders a recruiter can use, and how they
// are filled. A placeholder with no value stays visible as {name} rather than
// vanishing, so a missing date reads as a gap to fill, not a finished sentence.

export const TEMPLATE_CATEGORIES = [
  { value: "offer", label: "Offer letter" },
  { value: "interview", label: "Interview invite" },
  { value: "rejection", label: "Rejection" },
  { value: "follow_up", label: "Follow-up" },
  { value: "other", label: "Other" },
];

export const PLACEHOLDERS = [
  { key: "candidate_name", label: "Candidate name", sample: "Asha Rao" },
  { key: "first_name", label: "First name", sample: "Asha" },
  { key: "job_title", label: "Job title", sample: "Senior Frontend Engineer" },
  { key: "company_name", label: "Company", sample: "Acme Corp" },
  { key: "date", label: "Date", sample: "1 October 2026" },
  { key: "link", label: "Link", sample: "https://example.com/offer" },
];

export const SAMPLE_VALUES = Object.fromEntries(PLACEHOLDERS.map((p) => [p.key, p.sample]));

export function fillTemplate(text, values = {}) {
  return String(text || "").replace(/\{(\w+)\}/g, (match, key) => (values[key] ? values[key] : match));
}

export function candidateValues(candidate, companyName) {
  const name = candidate?.basicDetails?.name || "";
  return {
    candidate_name: name,
    first_name: name.split(/\s+/)[0] || "",
    job_title: candidate?.job?.title || "",
    company_name: companyName || "",
  };
}

/** Examples a recruiter can start from. Opening one only fills the editor; nothing is saved until they save it. */
export const STARTERS = [
  {
    name: "Offer letter",
    category: "offer",
    subject: "Your offer from {company_name}",
    body:
      "Hi {first_name},\n\nWe're delighted to offer you the role of {job_title} at {company_name}.\n\nYou'll find the full offer, including compensation and start date, here: {link}\n\nPlease let us know your decision by {date}. If you have any questions, just reply to this email.\n\nWarm regards,\nThe {company_name} hiring team",
  },
  {
    name: "Interview invitation",
    category: "interview",
    subject: "Next step for {job_title} at {company_name}",
    body:
      "Hi {first_name},\n\nThanks for your interest in {job_title}. We'd like to invite you to an interview on {date}.\n\nJoin here: {link}\n\nBest,\nThe {company_name} hiring team",
  },
  {
    name: "Rejection (after interview)",
    category: "rejection",
    subject: "Your application for {job_title}",
    body:
      "Hi {first_name},\n\nThank you for the time you spent with us on your application for {job_title}. After careful consideration we've decided not to move forward at this stage.\n\nWe appreciate your interest in {company_name} and wish you the best.\n\nKind regards,\nThe {company_name} hiring team",
  },
  {
    name: "Rejection (after screening)",
    category: "rejection",
    subject: "Your application for {job_title}",
    body:
      "Hi {first_name},\n\nThank you for applying for {job_title} at {company_name}. We've reviewed your application and won't be taking it further this time.\n\nWe'll keep your details on file and may reach out if a better-matched role opens up.\n\nKind regards,\nThe {company_name} hiring team",
  },
  {
    name: "Application received",
    category: "follow_up",
    subject: "We've received your application for {job_title}",
    body:
      "Hi {first_name},\n\nThanks for applying for {job_title} at {company_name}. Our team is reviewing applications and we'll be in touch by {date} with next steps.\n\nBest,\nThe {company_name} hiring team",
  },
  {
    name: "Checking in on your offer",
    category: "follow_up",
    subject: "Following up on your offer for {job_title}",
    body:
      "Hi {first_name},\n\nJust checking in on the offer for {job_title}. If you have any questions about the role, compensation or start date, we're happy to talk them through.\n\nYou can review the offer here: {link}\n\nBest,\nThe {company_name} hiring team",
  },
  {
    name: "Welcome aboard",
    category: "other",
    subject: "Welcome to {company_name}, {first_name}!",
    body:
      "Hi {first_name},\n\nWe're thrilled you've accepted the {job_title} role. Your first day is {date}.\n\nEverything you need before you start is here: {link}\n\nSee you soon,\nThe {company_name} team",
  },
];
