// ─── Recman API Response Types ──────────────────────────────────────

export type RecmanGetResponse<T> = {
  success: true;
  numRows: number;
  data: Record<string, T>;
} | {
  success: false;
  error: Array<{ code?: number; message: string }>;
};

export type RecmanPostResponse = {
  success: true;
  candidateId?: string;
} | {
  success: false;
  error: Array<{ code?: number; message: string }>;
};

// ─── Candidate Fields ───────────────────────────────────────────────

export type RecmanSkill = {
  skillId: string;
  name: string;
};

export type RecmanEducation = {
  educationId: string;
  schoolName: string;
  type: string;
  degree: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
};

export type RecmanExperience = {
  experienceId: string;
  companyName: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  current: string;
  description: string;
};

export type RecmanCourse = {
  courseId: string;
  name: string;
  issueDate: string;
  expiryDate: string;
  description: string;
  verified: boolean;
  files: Array<{
    fileId: string;
    fileName: string;
    url: string;
  }>;
};

/** Certification as returned by the Recman v2 API (replaces the old `course` field). */
export type RecmanCertification = {
  certificationId: string;
  name: string;
  endDate: string;
  description: string;
  candidateAccess: number;
  files: Array<{
    certificationFileId: number;
    name: string;
    ext: string;
    size: number;
    candidateFileId: number;
  }>;
};

export type RecmanProjectExperience = {
  projectExperienceId: string;
  title: string;
  startDate: string;
  endDate: string;
  current: string;
  description: string;
};

export type RecmanRelative = {
  relativeId: string;
  name: string;
  relation: string;
  email: string;
  mobilePhone: string;
};

export type RecmanEmployeeInfo = {
  number: number;
  socialSecurityNo: string;
  bankAccount: string;
  bic: string;
  iban: string;
  startDate: string;
  endDate: string;
  notes: string;
  seniority: string;
  salary: string;
  hogiaEmploymentStatus: string;
};

export type RecmanAttributeCheckbox = {
  checkboxId: number;
  name: string;
};

export type RecmanAttribute = {
  candidateAttributeId: number;
  attributeId: number;
  checkbox: RecmanAttributeCheckbox[];
};

export type RecmanLanguage = {
  languageId: string;
  name: string;
  level: string;
};

export type RecmanReference = {
  referenceId: string;
  name: string;
  companyName: string;
  mobilePhone: string;
  officePhone: string;
  email: string;
  description: string;
  notes: string | null;
};

export type RecmanCandidate = {
  candidateId: string;
  corporationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  postalCode?: string;
  postalPlace?: string;
  city?: string;
  country?: string;
  nationality?: string;
  gender?: string;
  dob?: string;
  title?: string;
  description?: string;
  created: string;
  updated: string;
  rating?: string;
  image?: string;
  linkedIn?: string;
  // Nested data
  employee?: RecmanEmployeeInfo;
  skills?: RecmanSkill[];
  education?: RecmanEducation[];
  experience?: RecmanExperience[];
  course?: RecmanCourse[];
  certification?: RecmanCertification[];
  projectExperience?: RecmanProjectExperience[];
  relative?: RecmanRelative[];
  attributes?: RecmanAttribute[];
  language?: RecmanLanguage[];
  driversLicense?: string[];
  reference?: RecmanReference[];
  files?: RecmanFile[];
};

export type RecmanFile = {
  fileId: string;
  fileName: string;
  /** Recman v2 returns `name` instead of `fileName` */
  name?: string;
  url: string;
  category?: string;
  description?: string;
};

// ─── Company, Project, Job types ────────────────────────────────────

export type RecmanCompany = {
  companyId: string;
  name: string;
  email?: string;
  description?: string;
  type?: string;
  notes?: string;
  vatNumber?: string;
  created: string;
  updated: string;
};

export type RecmanProject = {
  projectId: string;
  name: string;
  description?: string;
  status?: string;
  type?: string;
  companyId?: string;
  startDate?: string;
  endDate?: string;
  number?: number;
  notes?: string;
  created: string;
  updated: string;
};

export type RecmanJob = {
  jobId: string;
  candidateId: string;
  projectId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  salary?: string;
  created: string;
  updated: string;
};

export const COMPANY_FIELDS = "name,email,description,type,notes,vatNumber,created,updated" as const;
export const PROJECT_FIELDS = "name,description,status,type,companyId,startDate,endDate,number,notes,created,updated" as const;
export const JOB_FIELDS = "name,description,startDate,endDate,salary,created,updated" as const;

// ─── All available GET fields ───────────────────────────────────────

export const CANDIDATE_BASIC_FIELDS = "firstName,lastName,email,phone,mobilePhone,address,postalCode,postalPlace,city,country,nationality,gender,dob,title,description,created,updated,rating,image,linkedIn" as const;
export const CANDIDATE_NESTED_FIELDS = "employee,skills,education,experience,certification,projectExperience,relative,attributes,language,driversLicense,reference,files" as const;
export const CANDIDATE_ALL_FIELDS = `${CANDIDATE_BASIC_FIELDS},${CANDIDATE_NESTED_FIELDS}` as const;

// ─── Filter/Search Types ────────────────────────────────────────────

export type CandidateFilter = {
  isEmployee?: boolean;
  isActiveEmployee?: boolean;
  hasExSkills?: boolean;
  hasFallsikring?: boolean;
  hasGSK?: boolean;
  skillSearch?: string;
  titleSearch?: string;
  nameSearch?: string;
  citySearch?: string;
  attributeId?: number;
  minRating?: number;
  hasDriversLicense?: string;
  languageName?: string;
};

// ─── Skill Categories (for grouping) ────────────────────────────────

export const SKILL_CATEGORIES = {
  "Ex/ATEX": ["ex ", "ex-", "atex", "iecex", "compex"],
  "Fallsikring": ["fallsikring", "fallsikringsarbeid"],
  "Offshore": ["gsk", "bosiet", "offshore kurs", "offshore helsesertifikat", "offshore certified"],
  "Fiber": ["fiber", "fiberoptisk", "fiber optic"],
  "Instrument": ["instrument", "automasjon", "automation"],
  "Commissioning": ["commissioning", "mc ", "mechanical completion"],
  "Engineering": ["field engineer", "inspector", "prosjektleder", "project management"],
  "Kabel": ["kabel", "cable", "terminering", "termination"],
} as const;

export type SkillCategoryKey = keyof typeof SKILL_CATEGORIES;

// Skill keywords used to highlight important certifications in table views
export const EX_SKILL_KEYWORDS = ["ex ", "ex-", "atex", "iecex"] as const;
export const SAFETY_SKILL_KEYWORDS = ["fallsikring", "gsk", "bosiet"] as const;
export const HIGHLIGHT_SKILL_KEYWORDS = [...EX_SKILL_KEYWORDS, ...SAFETY_SKILL_KEYWORDS] as const;
