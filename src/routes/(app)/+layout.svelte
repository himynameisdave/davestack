<script lang="ts">
  import { authClient } from '$lib/client/auth';
  import { Button } from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

  let { data, children } = $props();

  async function signOut() {
    await authClient.signOut();
    window.location.href = '/';
  }
</script>

<div class="flex min-h-svh flex-col">
  <header class="border-b">
    <nav class="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
      <a href="/home" class="font-bold tracking-tight">davestack</a>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button variant="ghost" size="sm" {...props}>
              {data.user?.name ?? data.user?.email ?? 'Account'}
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" class="w-56">
          <DropdownMenu.Label class="truncate">{data.user?.email}</DropdownMenu.Label>
          <DropdownMenu.Separator />
          <DropdownMenu.Item>
            {#snippet child({ props })}
              <a href="/account" {...props}>Account</a>
            {/snippet}
          </DropdownMenu.Item>
          {#if data.user?.isAdmin}
            <DropdownMenu.Item>
              {#snippet child({ props })}
                <a href="/admin" {...props}>Admin</a>
              {/snippet}
            </DropdownMenu.Item>
          {/if}
          <DropdownMenu.Separator />
          <DropdownMenu.Item variant="destructive" onSelect={signOut}>Sign out</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </nav>
  </header>

  <main class="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
    {@render children()}
  </main>
</div>
