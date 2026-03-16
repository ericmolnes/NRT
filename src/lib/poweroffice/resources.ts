import { poweroffice } from "./client";
import type {
  POCustomerResponse,
  POProjectResponse,
  POEmployeeResponse,
  POOutgoingInvoiceResponse,
  PODepartmentResponse,
  POProductResponse,
} from "./types";

// ─── Kunder ────────────────────────────────────────────────────────

export function getCustomers() {
  return poweroffice.getPaginated<POCustomerResponse>("/Customers");
}

export function getCustomerById(id: number) {
  return poweroffice.get<POCustomerResponse>(`/Customers/${id}`);
}

export function createCustomer(data: Partial<POCustomerResponse>) {
  return poweroffice.post<POCustomerResponse>("/Customers", data);
}

export function updateCustomer(id: number, data: Partial<POCustomerResponse>) {
  return poweroffice.patch<POCustomerResponse>(`/Customers/${id}`, data);
}

// ─── Prosjekter ────────────────────────────────────────────────────

export function getProjects() {
  return poweroffice.getPaginated<POProjectResponse>("/Projects");
}

export function getProjectById(id: number) {
  return poweroffice.get<POProjectResponse>(`/Projects/${id}`);
}

export function createProject(data: Partial<POProjectResponse>) {
  return poweroffice.post<POProjectResponse>("/Projects", data);
}

export function updateProject(id: number, data: Partial<POProjectResponse>) {
  return poweroffice.patch<POProjectResponse>(`/Projects/${id}`, data);
}

// ─── Ansatte ───────────────────────────────────────────────────────

export function getEmployees() {
  return poweroffice.getPaginated<POEmployeeResponse>("/Employees");
}

export function getEmployeeById(id: number) {
  return poweroffice.get<POEmployeeResponse>(`/Employees/${id}`);
}

// ─── Utgående fakturaer ────────────────────────────────────────────

export function getOutgoingInvoices() {
  return poweroffice.getPaginated<POOutgoingInvoiceResponse>(
    "/OutgoingInvoices"
  );
}

export function getOutgoingInvoiceById(id: number) {
  return poweroffice.get<POOutgoingInvoiceResponse>(
    `/OutgoingInvoices/${id}`
  );
}

// ─── Avdelinger ────────────────────────────────────────────────────

export function getDepartments() {
  return poweroffice.getPaginated<PODepartmentResponse>("/Departments");
}

// ─── Produkter ─────────────────────────────────────────────────────

export function getProducts() {
  return poweroffice.getPaginated<POProductResponse>("/Products");
}

export function getProductById(id: number) {
  return poweroffice.get<POProductResponse>(`/Products/${id}`);
}
