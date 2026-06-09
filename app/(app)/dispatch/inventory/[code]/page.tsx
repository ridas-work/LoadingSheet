import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ code: string }>;
};

/** Legacy detail URLs — inventory is edited inline on the list page. */
export default async function PackagingItemRedirectPage(_props: PageProps) {
  redirect("/dispatch/inventory");
}
