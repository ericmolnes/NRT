import { db } from "@/lib/db";

const CORPORATION_ID = process.env.RECMAN_CORPORATION_ID || "2484";

export type CandidateRowData = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  title?: string;
  description?: string;
  address?: string;
  postalCode?: string;
  postalPlace?: string;
  city?: string;
  country?: string;
  nationality?: string;
  gender?: string;
  dob?: string;
  rating?: number;
  isContractor?: boolean;
  company?: string;
  linkedIn?: string;
  skills?: string[];
  courses?: string[];
  driversLicense?: string[];
  languages?: string[];
};

function safeParseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}

/**
 * Opprett ny RecmanCandidate lokalt i NRT. Recman-synk (cron) pusher til
 * Recman API ved neste kjøring og erstatter tempRecmanId med ekte ID.
 *
 * Hvis isContractor: oppretter også ContractorPeriod og Personnel (rolle="Innleid"),
 * og lenker alt sammen. Ellers: oppretter Personnel med rolle=title || "Ansatt".
 *
 * Returnerer ny candidate-ID.
 */
export async function createCandidateWithPersonnel(
  rowData: CandidateRowData
): Promise<string> {
  const tempRecmanId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return db.$transaction(async (tx) => {
    const created = await tx.recmanCandidate.create({
      data: {
        recmanId: tempRecmanId,
        corporationId: CORPORATION_ID,
        firstName: rowData.firstName,
        lastName: rowData.lastName,
        email: rowData.email || null,
        phone: rowData.phone || null,
        mobilePhone: rowData.mobilePhone || null,
        title: rowData.title || null,
        description: rowData.description || null,
        address: rowData.address || null,
        postalCode: rowData.postalCode || null,
        postalPlace: rowData.postalPlace || null,
        city: rowData.city || null,
        country: rowData.country || null,
        nationality: rowData.nationality || null,
        gender: rowData.gender || null,
        dob: safeParseDate(rowData.dob),
        rating: rowData.rating ?? 0,
        linkedIn: rowData.linkedIn || null,
        isEmployee: false,
        isContractor: rowData.isContractor || false,
        skills: rowData.skills?.map((name) => ({ name })) || [],
        courses: rowData.courses?.map((name) => ({ name })) || [],
        languages: rowData.languages?.map((name) => ({ name })) || [],
        driversLicense: rowData.driversLicense || [],
        education: [],
        experience: [],
        references: [],
        attributes: [],
        lastSyncedAt: new Date(),
      },
    });

    const fullName = `${rowData.firstName} ${rowData.lastName}`.trim();

    if (rowData.isContractor) {
      await tx.contractorPeriod.create({
        data: {
          recmanCandidateId: created.id,
          startDate: new Date(),
          company: rowData.company || null,
        },
      });

      const personnel = await tx.personnel.create({
        data: {
          name: fullName,
          email: rowData.email || null,
          role: "Innleid",
          status: "ACTIVE",
        },
      });

      await tx.recmanCandidate.update({
        where: { id: created.id },
        data: { personnelId: personnel.id },
      });
    } else {
      const personnel = await tx.personnel.create({
        data: {
          name: fullName,
          email: rowData.email || null,
          role: rowData.title || "Ansatt",
          status: "ACTIVE",
        },
      });

      await tx.recmanCandidate.update({
        where: { id: created.id },
        data: { personnelId: personnel.id },
      });
    }

    return created.id;
  });
}
