import { Button, Card, CardContent, CardHeader, CardTitle } from '@commentoo/ui';

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Commentoo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground text-center">
            Interactive live comment system for presentations
          </p>
          <Button size="lg">Get Started</Button>
        </CardContent>
      </Card>
    </main>
  );
}
