import { redirect } from "next/navigation";

// Electrical quotes are listed on the main Quotes page
export default function ElectricalQuotesPage() {
  redirect("/quotes");
}
