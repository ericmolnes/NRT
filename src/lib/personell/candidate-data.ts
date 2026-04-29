type CandidateCreateInput = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  title?: string;
  city?: string;
  country?: string;
  nationality?: string;
  gender?: string;
  dob?: string;
  description?: string;
  rating?: number;
};

type VerifiedCandidate = Partial<
  Pick<
    CandidateCreateInput,
    | "firstName"
    | "lastName"
    | "email"
    | "phone"
    | "mobilePhone"
    | "title"
    | "city"
  >
>;

function optionalString(value: string | null | undefined): string | null {
  return value || null;
}

function optionalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildLocalCandidateCreateData({
  recmanId,
  input,
  verified,
}: {
  recmanId: string;
  input: CandidateCreateInput;
  verified?: VerifiedCandidate | null;
}) {
  const phone = verified?.phone || input.phone || input.mobilePhone || null;
  const mobilePhone = verified?.mobilePhone || input.mobilePhone || null;

  return {
    recmanId,
    firstName: verified?.firstName || input.firstName,
    lastName: verified?.lastName || input.lastName,
    email: optionalString(verified?.email || input.email),
    phone,
    mobilePhone,
    title: optionalString(verified?.title || input.title),
    city: optionalString(verified?.city || input.city),
    country: optionalString(input.country),
    nationality: optionalString(input.nationality),
    gender: optionalString(input.gender),
    dob: optionalDate(input.dob),
    description: optionalString(input.description),
    rating: input.rating || 0,
    isEmployee: false,
    skills: [],
    education: [],
    experience: [],
    courses: [],
    languages: [],
    references: [],
    attributes: [],
    driversLicense: [],
    lastSyncedAt: new Date(),
  };
}
