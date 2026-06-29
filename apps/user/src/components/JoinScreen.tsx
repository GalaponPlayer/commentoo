'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { joinCodeSchema } from '@commentoo/shared';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@commentoo/ui';

/** Entry screen: enter a 6-char join code, then route to the live session. */
export function JoinScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!joinCodeSchema.safeParse(normalized).success) {
      setError('6桁の参加コードを入力してください。');
      return;
    }
    router.push(`/s/${normalized}`);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-xl">Commentoo に参加</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Input
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              placeholder="参加コード（例: ABC234）"
              autoFocus
              autoCapitalize="characters"
              maxLength={6}
              aria-label="参加コード"
              aria-invalid={error !== null}
              className="text-center text-lg tracking-[0.3em] tabular-nums uppercase"
            />
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" size="lg">
              参加する
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
