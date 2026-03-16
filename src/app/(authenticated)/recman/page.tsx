import { redirect } from "next/navigation";

export default function RecmanPage() {
  redirect("/personell?sync=recman");
}
