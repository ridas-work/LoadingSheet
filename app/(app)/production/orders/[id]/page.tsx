import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export default async function ProductionOrderRedirectPage(props: PageProps) {
  const { id } = await props.params;
  redirect(`/orders/${id}/loading-sheet?edit=1`);
}
