'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { JoinResponse, Session, SessionStatus } from '@commentoo/shared';
import { Badge, Button } from '@commentoo/ui';
import type { ConnectionState } from '@commentoo/realtime/client';
import { ApiClientError, apiClient } from '../lib/api';
import { generateNickname } from '../lib/nickname';
import { loadToken, saveToken } from '../lib/token-store';
import { useSessionRoom } from '../hooks/useSessionRoom';
import { CommentList } from './CommentList';
import { CommentForm } from './CommentForm';

type Phase =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; session: Session; join: JoinResponse };

/** Resolves the session + participant token for a join code, then renders the room. */
export function SessionView({ code }: { code: string }) {
  const [phase, setPhase] = useState<Phase>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const session = await apiClient.getSession(code);
        let join = loadToken(code);
        if (!join) {
          join = await apiClient.joinSession(code);
          saveToken(code, join);
        }
        if (!cancelled) setPhase({ status: 'ready', session, join });
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof ApiClientError && error.code === 'NOT_FOUND'
            ? 'セッションが見つかりませんでした。コードをご確認ください。'
            : 'セッションに接続できませんでした。';
        setPhase({ status: 'error', message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (phase.status === 'loading') {
    return <Centered>接続中…</Centered>;
  }
  if (phase.status === 'error') {
    return (
      <Centered>
        <p className="text-destructive">{phase.message}</p>
        <Button asChild variant="outline">
          <Link href="/">戻る</Link>
        </Button>
      </Centered>
    );
  }
  return <LiveRoom session={phase.session} join={phase.join} code={code} />;
}

function LiveRoom({ session, join, code }: { session: Session; join: JoinResponse; code: string }) {
  const { comments, connectionState, error, post } = useSessionRoom({
    sessionId: join.sessionId,
    code,
    token: join.token,
  });
  const defaultNickname = useMemo(() => generateNickname(), []);

  return (
    <main className="flex h-dvh flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h1 className="truncate text-lg font-semibold">{session.title}</h1>
        <StatusIndicator status={session.status} connectionState={connectionState} />
      </header>
      {error?.code === 'RATE_LIMITED' ? (
        <p role="alert" className="bg-cheer-subtle px-4 py-2 text-sm text-cheer-subtle-foreground">
          {error.message}
        </p>
      ) : null}
      <CommentList comments={comments} />
      <CommentForm
        defaultNickname={defaultNickname}
        onPost={post}
        disabled={connectionState !== 'open'}
      />
    </main>
  );
}

function StatusIndicator({
  status,
  connectionState,
}: {
  status: SessionStatus;
  connectionState: ConnectionState;
}) {
  if (connectionState !== 'open') {
    return <span className="text-xs text-muted-foreground">接続中…</span>;
  }
  if (status === 'live') {
    return (
      <Badge variant="cheer" className="gap-1.5">
        <span aria-hidden className="size-1.5 rounded-full bg-cheer-foreground" />
        LIVE
      </Badge>
    );
  }
  if (status === 'preparing') {
    return <Badge variant="secondary">準備中</Badge>;
  }
  return <Badge variant="outline">終了</Badge>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4 text-center">
      {children}
    </main>
  );
}
