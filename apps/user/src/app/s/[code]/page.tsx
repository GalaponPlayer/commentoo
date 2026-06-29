import { SessionView } from '../../../components/SessionView';

// Per-session route. Rendered dynamically (SSR) — the session data and
// participant token are fetched client-side in SessionView.
export const dynamic = 'force-dynamic';

export default async function SessionPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <SessionView code={code.toUpperCase()} />;
}
