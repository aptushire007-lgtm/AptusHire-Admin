export const JOB_FIELD_LABELS = {
  title: "Title", description: "Description", numberOfOpenings: "Number of openings",
  minExperienceYears: "Minimum experience", atsThreshold: "Screening threshold",
  interviewMinQuestions: "Minimum questions", interviewMaxQuestions: "Maximum questions",
  assessmentPolicy: "Assessment policy",
};

export function validateJobForm(form) {
  const errors = {};
  if (!form.title?.trim()) errors.title = "Enter a public role title.";
  if (!form.description?.trim()) errors.description = "Add the description candidates will read.";
  function integer(name, min, max, optional = false) {
    if (optional && (form[name] === "" || form[name] == null)) return;
    const value = Number(form[name]);
    if (String(form[name] ?? "").trim() === "" || !Number.isInteger(value) || value < min || value > max)
      errors[name] = `Enter a whole number from ${min.toLocaleString()} to ${max.toLocaleString()}.`;
  }
  integer("numberOfOpenings", 1, 10000);
  integer("minExperienceYears", 0, 50);
  integer("atsThreshold", 0, 100);
  integer("interviewMinQuestions", 1, 30, true);
  integer("interviewMaxQuestions", 1, 30, true);
  if (!errors.interviewMinQuestions && !errors.interviewMaxQuestions && form.interviewMinQuestions && form.interviewMaxQuestions && Number(form.interviewMinQuestions) > Number(form.interviewMaxQuestions))
    errors.interviewMaxQuestions = "Maximum questions must be at least the minimum questions.";
  if (!["off", "manual", "auto"].includes(form.assessmentPolicy)) errors.assessmentPolicy = "Choose an assessment policy.";
  return errors;
}
