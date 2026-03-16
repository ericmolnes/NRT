// PowerOffice Go API v2 response types

export interface POCustomerResponse {
  id: number;
  code: number | null;
  name: string;
  organizationNumber: string | null;
  emailAddress: string | null;
  phoneNumber: string | null;
  contactPersonName: string | null;
  invoiceEmailAddress: string | null;
  isActive: boolean;
  since: string | null;
  lastChanged: string | null;
}

export interface POProjectResponse {
  id: number;
  code: string | null;
  name: string;
  description: string | null;
  contactId: number | null;
  projectManagerEmployeeId: number | null;
  isCompleted: boolean;
  lastChanged: string | null;
}

export interface POEmployeeResponse {
  id: number;
  code: string | null;
  firstName: string;
  lastName: string;
  emailAddress: string | null;
  phoneNumber: string | null;
  departmentCode: string | null;
  isActive: boolean;
  jobTitle: string | null;
  socialSecurityNumber: string | null;
  lastChanged: string | null;
}

export interface POOutgoingInvoiceResponse {
  id: number;
  invoiceNumber: string | null;
  customerCode: number | null;
  customerId: number | null;
  projectCode: string | null;
  status: string | null;
  netAmount: number | null;
  totalAmount: number | null;
  currencyCode: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  lastChanged: string | null;
}

export interface PODepartmentResponse {
  id: number;
  code: string | null;
  name: string;
  isActive: boolean;
  lastChanged: string | null;
}

export interface POProductResponse {
  id: number;
  code: string | null;
  name: string;
  description: string | null;
  salesPrice: number | null;
  unit: string | null;
  isActive: boolean;
  lastChanged: string | null;
}

/** Paginert respons fra PowerOffice v2 API */
export interface POPaginatedResponse<T> {
  data: T[];
  count: number;
  next: string | null;
}
