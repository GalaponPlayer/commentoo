import { Button, Card, CardContent, CardHeader, CardTitle } from '@commentoo/ui';

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Commentoo Admin</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground text-center">Administration Dashboard</p>
          <Button size="lg">Sign In</Button>
        </CardContent>
      </Card>
    </main>
  );
}
