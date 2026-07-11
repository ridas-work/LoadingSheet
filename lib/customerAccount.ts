import type { CustomerApprovalStatus } from "@/lib/customerAccountAccess";
import { normalizeCustomerApprovalStatus } from "@/lib/customerAccountAccess";

export const TAX_STATUSES = ["filer", "non_filer"] as const;
export type TaxStatus = (typeof TAX_STATUSES)[number];

export const CONTRACT_STATUSES = ["contract", "non_contract"] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export type CustomerAccountContact = {
  contactPerson: string;
  designation: string;
  phone: string;
  email: string;
};

export type CustomerAccountInput = {
  companyName: string;
  taxStatus: TaxStatus;
  ntn: string;
  strn: string;
  contractStatus: ContractStatus;
  contractDescription: string;
  address: string;
  city: string;
  contactPerson: string;
  designation: string;
  email: string;
  phone: string;
  contacts: CustomerAccountContact[];
  notes: string;
};

export type CustomerAccountParseResult =
  | { ok: true; value: CustomerAccountInput }
  | { ok: false; errors: Record<string, string> };

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function parseTaxStatus(v: unknown): TaxStatus {
  return v === "filer" ? "filer" : "non_filer";
}

function parseContractStatus(v: unknown): ContractStatus {
  return v === "contract" ? "contract" : "non_contract";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseContactRow(raw: unknown, index: number, errors: Record<string, string>) {
  const row = raw as Record<string, unknown> | null;
  const contactPerson = str(row?.contactPerson);
  const designation = str(row?.designation);
  const phone = str(row?.phone);
  const email = str(row?.email);
  const prefix = `contacts.${index}`;

  if (!contactPerson) errors[`${prefix}.contactPerson`] = "Contact person is required.";
  if (!phone) errors[`${prefix}.phone`] = "Phone number is required.";
  if (email && !EMAIL_RE.test(email)) errors[`${prefix}.email`] = "Enter a valid email address.";

  const hasAny = contactPerson || designation || phone || email;
  if (!hasAny) return null;

  return { contactPerson, designation, phone, email };
}

function contactsFromBody(body: Record<string, unknown>, errors: Record<string, string>) {
  if (Array.isArray(body.contacts)) {
    const parsed: CustomerAccountContact[] = [];
    for (let i = 0; i < body.contacts.length; i += 1) {
      const row = parseContactRow(body.contacts[i], i, errors);
      if (row) parsed.push(row);
    }
    if (parsed.length === 0) {
      errors.contacts = "Add at least one contact person.";
    }
    return parsed;
  }

  const legacy = parseContactRow(
    {
      contactPerson: body.contactPerson,
      designation: body.designation,
      phone: body.phone,
      email: body.email,
    },
    0,
    errors,
  );
  if (!legacy) {
    errors.contacts = "Add at least one contact person.";
    return [];
  }
  return [legacy];
}

function primaryContactFields(contacts: CustomerAccountContact[]) {
  const first = contacts[0] ?? {
    contactPerson: "",
    designation: "",
    phone: "",
    email: "",
  };
  return {
    contactPerson: first.contactPerson,
    designation: first.designation,
    phone: first.phone,
    email: first.email,
  };
}

export function contactsFromAccountDoc(doc: {
  contacts?: unknown;
  contactPerson?: string | null;
  designation?: string | null;
  phone?: string | null;
  email?: string | null;
}): CustomerAccountContact[] {
  if (Array.isArray(doc.contacts) && doc.contacts.length > 0) {
    return doc.contacts.map((row) => {
      const item = row as Partial<CustomerAccountContact>;
      return {
        contactPerson: str(item?.contactPerson),
        designation: str(item?.designation),
        phone: str(item?.phone),
        email: str(item?.email),
      };
    });
  }
  const contactPerson = str(doc.contactPerson);
  if (!contactPerson && !str(doc.phone)) return [];
  return [
    {
      contactPerson,
      designation: str(doc.designation),
      phone: str(doc.phone),
      email: str(doc.email),
    },
  ];
}

/** Parse + validate the account-opening form body with conditional field rules. */
export function parseCustomerAccountBody(raw: unknown): CustomerAccountParseResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, errors: { form: "Body must be a JSON object." } };
  }
  const body = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const companyName = str(body.companyName);
  if (!companyName) errors.companyName = "Company name is required.";
  else if (companyName.length > 160) errors.companyName = "Company name is too long (max 160).";

  const taxStatus = parseTaxStatus(body.taxStatus);
  let ntn = "";
  let strn = "";
  if (taxStatus === "filer") {
    ntn = str(body.ntn);
    strn = str(body.strn);
    if (!ntn) errors.ntn = "NTN is required for a filer.";
    if (!strn) errors.strn = "STRN is required for a filer.";
  }

  const contractStatus = parseContractStatus(body.contractStatus);
  let contractDescription = "";
  if (contractStatus === "contract") {
    contractDescription = str(body.contractDescription);
    if (!contractDescription) {
      errors.contractDescription = "Describe the contract when the customer is on contract.";
    } else if (contractDescription.length > 2000) {
      errors.contractDescription = "Contract description is too long (max 2000).";
    }
  }

  const address = str(body.address);
  if (!address) errors.address = "Address is required.";

  const city = str(body.city);
  const contacts = contactsFromBody(body, errors);

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      companyName,
      taxStatus,
      ntn,
      strn,
      contractStatus,
      contractDescription,
      address,
      city,
      ...primaryContactFields(contacts),
      contacts,
      notes: str(body.notes),
    },
  };
}

export type SerializedCustomerAccount = {
  id: string;
  companyName: string;
  taxStatus: TaxStatus;
  ntn: string;
  strn: string;
  contractStatus: ContractStatus;
  contractDescription: string;
  address: string;
  city: string;
  contactPerson: string;
  designation: string;
  email: string;
  phone: string;
  contacts: CustomerAccountContact[];
  notes: string;
  approvalStatus: CustomerApprovalStatus;
  reviewedByName: string;
  reviewedAt: string | null;
  createdByName: string;
  createdAt: string | null;
};

type Nullable = string | null | undefined;

export function serializeCustomerAccount(doc: {
  _id: { toString(): string };
  companyName: string;
  taxStatus?: Nullable;
  ntn?: Nullable;
  strn?: Nullable;
  contractStatus?: Nullable;
  contractDescription?: Nullable;
  address?: Nullable;
  city?: Nullable;
  contactPerson?: Nullable;
  designation?: Nullable;
  email?: Nullable;
  phone?: Nullable;
  contacts?: unknown;
  notes?: Nullable;
  approvalStatus?: Nullable;
  reviewedByName?: Nullable;
  reviewedAt?: Date | string | null;
  createdByName?: Nullable;
  createdAt?: Date | string | null;
}): SerializedCustomerAccount {
  const contacts = contactsFromAccountDoc(doc);
  const primary = primaryContactFields(contacts);
  return {
    id: doc._id.toString(),
    companyName: doc.companyName,
    taxStatus: parseTaxStatus(doc.taxStatus),
    ntn: doc.ntn ?? "",
    strn: doc.strn ?? "",
    contractStatus: parseContractStatus(doc.contractStatus),
    contractDescription: doc.contractDescription ?? "",
    address: doc.address ?? "",
    city: doc.city ?? "",
    contactPerson: primary.contactPerson,
    designation: primary.designation,
    email: primary.email,
    phone: primary.phone,
    contacts,
    notes: doc.notes ?? "",
    approvalStatus: normalizeCustomerApprovalStatus(doc.approvalStatus),
    reviewedByName: doc.reviewedByName ?? "",
    reviewedAt: doc.reviewedAt ? new Date(doc.reviewedAt).toISOString() : null,
    createdByName: doc.createdByName ?? "",
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
  };
}
