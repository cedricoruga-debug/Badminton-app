import { JoinForm } from "@/app/join/JoinForm";

/**
 * Server wrapper around JoinForm (a client component) — the only reason
 * this file exists separately is to read the `?code=` query param on the
 * server and hand it down as a plain prop, rather than JoinForm calling
 * `useSearchParams()` itself, which would force it into a Suspense
 * boundary. `?code=` is what the dashboard's QR (see JoinQrSection) links
 * to, so scanning it lands here with the code already filled in.
 */
export default async function JoinPage(props: PageProps<"/join">) {
  const searchParams = await props.searchParams;
  const initialCode = typeof searchParams.code === "string" ? searchParams.code.replace(/\D/g, "").slice(0, 6) : "";

  return <JoinForm initialCode={initialCode} />;
}
