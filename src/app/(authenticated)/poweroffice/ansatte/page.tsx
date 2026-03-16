import { redirect } from "next/navigation";

export default function PowerOfficeEmployeesPage() {
  redirect("/personell?sync=po");
}
