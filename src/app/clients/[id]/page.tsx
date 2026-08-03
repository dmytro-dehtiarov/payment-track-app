import { notFound } from "next/navigation";
import { ClientDetailView } from "@/components/ClientDetailView";
import { getClientDetail } from "@/lib/clients";
import { getSettings } from "@/lib/settings";

interface ClientPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientPage({ params }: ClientPageProps) {
  const { id } = await params;
  const [client, settings] = await Promise.all([getClientDetail(id), getSettings()]);

  if (!client) {
    notFound();
  }

  return <ClientDetailView client={client} currencySymbol={settings.currencySymbol} />;
}
