import { AdminSummaryDashboard } from "@/components/AdminSummaryDashboard";
import { ChemicalRequestsBanner } from "@/components/ChemicalRequestsBanner";
import { PackagingReorderAlertsBanner } from "@/components/PackagingReorderAlertsBanner";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <PackagingReorderAlertsBanner />
      <ChemicalRequestsBanner />
      <AdminSummaryDashboard />
    </div>
  );
}
