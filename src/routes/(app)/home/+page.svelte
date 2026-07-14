<script lang="ts">
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';

  let { data } = $props();
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold tracking-tight">Home</h1>
    <p class="text-muted-foreground mt-1">You're signed in as {data.user?.email}.</p>
  </div>

  <Card>
    <CardHeader>
      <CardTitle>You're in</CardTitle>
      <CardDescription>This is the authenticated area. Build your app here.</CardDescription>
    </CardHeader>
    <CardContent>
      <Button href="/account" variant="outline">Manage account &amp; passkeys</Button>
    </CardContent>
  </Card>
</div>
