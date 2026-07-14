<script lang="ts">
  // Read-only admin dashboard. This is a WINDOW, not a control panel: strictly
  // NO forms, NO actions, NO edit/delete/impersonate controls. It only observes
  // data. If you need to mutate something, build that surface elsewhere and keep
  // this one observe-only.
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '$lib/components/ui/card';
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '$lib/components/ui/table';
  import { Badge } from '$lib/components/ui/badge';

  let { data } = $props();

  function formatDateTime(value: string | Date): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
  }
</script>

<div class="space-y-8">
  <div>
    <h1 class="text-2xl font-bold tracking-tight">Admin</h1>
    <p class="text-muted-foreground mt-1">A read-only overview of your application's data.</p>
  </div>

  <!-- Model counts (extension point lives in +page.server.ts: MODEL_CARDS) -->
  <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
    {#each data.modelCards as card (card.key)}
      <Card>
        <CardHeader>
          <CardDescription>{card.label}</CardDescription>
          <CardTitle class="text-3xl tabular-nums">{card.count}</CardTitle>
        </CardHeader>
      </Card>
    {/each}
  </div>

  <div class="grid gap-4 md:grid-cols-2">
    <!-- Sessions summary -->
    <Card>
      <CardHeader>
        <CardTitle>Sessions</CardTitle>
        <CardDescription>Active (non-expired) vs. total across all users.</CardDescription>
      </CardHeader>
      <CardContent class="flex gap-10">
        <div>
          <p class="text-3xl font-bold tabular-nums">{data.sessions.active}</p>
          <p class="text-muted-foreground text-sm">Active</p>
        </div>
        <div>
          <p class="text-3xl font-bold tabular-nums">{data.sessions.total}</p>
          <p class="text-muted-foreground text-sm">Total</p>
        </div>
      </CardContent>
    </Card>

    <!-- App metadata -->
    <Card>
      <CardHeader>
        <CardTitle>Application</CardTitle>
        <CardDescription>Runtime metadata.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt class="text-muted-foreground">Environment</dt>
          <dd class="font-mono">{data.meta.nodeEnv}</dd>
          <dt class="text-muted-foreground">Version</dt>
          <dd class="font-mono">v{data.meta.version}</dd>
          <dt class="text-muted-foreground">Git SHA</dt>
          <dd class="truncate font-mono">{data.meta.gitSha}</dd>
          <dt class="text-muted-foreground">Database</dt>
          <dd class="truncate font-mono">{data.meta.dbHost}</dd>
        </dl>
      </CardContent>
    </Card>
  </div>

  <!-- Recent signups -->
  <Card>
    <CardHeader>
      <CardTitle>Recent signups</CardTitle>
      <CardDescription>The 10 most recently created users.</CardDescription>
    </CardHeader>
    <CardContent>
      {#if data.recentSignups.length === 0}
        <p class="text-muted-foreground text-sm">No users yet.</p>
      {:else}
        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Methods</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {#each data.recentSignups as signup (signup.id)}
                <TableRow>
                  <TableCell class="font-medium">
                    {signup.email}
                    {#if signup.isAdmin}<Badge variant="secondary" class="ml-1">Admin</Badge>{/if}
                  </TableCell>
                  <TableCell>{signup.name}</TableCell>
                  <TableCell>
                    {#if signup.methods.length === 0}
                      <span class="text-muted-foreground">—</span>
                    {:else}
                      <div class="flex flex-wrap gap-1">
                        {#each signup.methods as method (method)}
                          <Badge variant="outline">{method}</Badge>
                        {/each}
                      </div>
                    {/if}
                  </TableCell>
                  <TableCell>
                    {#if signup.emailVerified}
                      <Badge variant="secondary">Verified</Badge>
                    {:else}
                      <Badge variant="outline">Pending</Badge>
                    {/if}
                  </TableCell>
                  <TableCell class="text-muted-foreground whitespace-nowrap">
                    {formatDateTime(signup.createdAt)}
                  </TableCell>
                </TableRow>
              {/each}
            </TableBody>
          </Table>
        </div>
      {/if}
    </CardContent>
  </Card>

  <!-- Recent sessions -->
  {#if data.sessions.recent.length > 0}
    <Card>
      <CardHeader>
        <CardTitle>Recent sessions</CardTitle>
        <CardDescription>The latest sign-ins.</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {#each data.sessions.recent as session (session.id)}
                <TableRow>
                  <TableCell class="font-medium">{session.email}</TableCell>
                  <TableCell class="text-muted-foreground whitespace-nowrap">
                    {formatDateTime(session.createdAt)}
                  </TableCell>
                  <TableCell class="text-muted-foreground whitespace-nowrap">
                    {formatDateTime(session.expiresAt)}
                  </TableCell>
                  <TableCell>
                    {#if session.active}
                      <Badge variant="secondary">Active</Badge>
                    {:else}
                      <Badge variant="outline">Expired</Badge>
                    {/if}
                  </TableCell>
                </TableRow>
              {/each}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  {/if}
</div>
