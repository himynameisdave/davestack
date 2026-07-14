<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import { authClient } from '$lib/client/auth';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Badge } from '$lib/components/ui/badge';
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '$lib/components/ui/card';

  let { data } = $props();

  let newPasskeyName = $state('');
  let addingPasskey = $state(false);
  let editingId = $state<string | null>(null);
  let renameValue = $state('');

  function formatDate(value: string | Date): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString();
  }

  async function handleAddPasskey() {
    if (addingPasskey) return;
    const name = newPasskeyName.trim() || 'My passkey';
    addingPasskey = true;

    let result;
    try {
      // No authenticatorAttachment: allow platform authenticators AND roaming
      // security keys.
      result = await authClient.passkey.addPasskey({ name });
    } catch (err) {
      console.error('[account] addPasskey threw:', err);
      toast.error('Could not add passkey. Please try again.');
      addingPasskey = false;
      return;
    }

    if (result?.error) {
      const code = 'code' in result.error ? result.error.code : undefined;
      toast.error(
        code === 'ERROR_CEREMONY_ABORTED'
          ? 'Passkey setup was cancelled.'
          : (result.error.message ?? 'Could not add passkey.'),
      );
      addingPasskey = false;
      return;
    }

    newPasskeyName = '';
    addingPasskey = false;
    toast.success('Passkey added');
    await invalidateAll();
  }

  function startRename(id: string, currentName: string | null) {
    editingId = id;
    renameValue = currentName ?? '';
  }
</script>

<div class="mx-auto max-w-lg space-y-6">
  <div>
    <h1 class="text-2xl font-bold tracking-tight">Account</h1>
    <p class="text-muted-foreground mt-1">Manage your profile and passkeys.</p>
  </div>

  <!-- Profile -->
  <Card>
    <CardHeader>
      <CardTitle>Profile</CardTitle>
      <CardDescription>{data.user?.email}</CardDescription>
    </CardHeader>
    <CardContent>
      <form
        method="POST"
        action="?/updateProfile"
        class="space-y-4"
        use:enhance={() =>
          async ({ result, update }) => {
            await update({ reset: false });
            if (result.type === 'success') toast.success('Profile saved');
            else if (result.type === 'failure') toast.error('Could not save profile');
          }}
      >
        <div class="space-y-2">
          <Label for="name">Name</Label>
          <Input id="name" name="name" value={data.user?.name ?? ''} required />
        </div>
        <Button type="submit">Save changes</Button>
      </form>
    </CardContent>
  </Card>

  <!-- Passkeys -->
  <Card>
    <CardHeader>
      <CardTitle>Passkeys</CardTitle>
      <CardDescription
        >Sign in without a password using Face ID, Touch ID, or a security key.</CardDescription
      >
    </CardHeader>
    <CardContent class="space-y-4">
      <form
        class="flex items-end gap-2"
        onsubmit={(e) => {
          e.preventDefault();
          void handleAddPasskey();
        }}
      >
        <div class="flex-1 space-y-2">
          <Label for="passkey-name">New passkey name</Label>
          <Input
            id="passkey-name"
            bind:value={newPasskeyName}
            placeholder="e.g. MacBook Touch ID"
            disabled={addingPasskey}
          />
        </div>
        <Button type="submit" disabled={addingPasskey}>
          {addingPasskey ? 'Waiting…' : 'Add passkey'}
        </Button>
      </form>

      {#if data.passkeys.length === 0}
        <p class="text-muted-foreground text-sm">No passkeys yet. Add one above.</p>
      {:else}
        <ul class="space-y-2">
          {#each data.passkeys as passkey (passkey.id)}
            <li class="rounded-md border p-3">
              {#if editingId === passkey.id}
                <form
                  method="POST"
                  action="?/renamePasskey"
                  class="flex items-center gap-2"
                  use:enhance={() =>
                    async ({ result, update }) => {
                      await update();
                      if (result.type === 'success') {
                        toast.success('Passkey renamed');
                        editingId = null;
                      } else if (result.type === 'failure') {
                        toast.error('Could not rename passkey');
                      }
                    }}
                >
                  <input type="hidden" name="id" value={passkey.id} />
                  <Input name="name" bind:value={renameValue} required class="flex-1" />
                  <Button type="submit" size="sm">Save</Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onclick={() => (editingId = null)}
                  >
                    Cancel
                  </Button>
                </form>
              {:else}
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium">{passkey.name ?? 'Passkey'}</p>
                    <p class="text-muted-foreground text-xs">
                      Added {formatDate(passkey.createdAt)}
                      <Badge variant="secondary" class="ml-1">{passkey.deviceType}</Badge>
                      {#if passkey.backedUp}<Badge variant="outline" class="ml-1">Synced</Badge
                        >{/if}
                    </p>
                  </div>
                  <div class="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onclick={() => startRename(passkey.id, passkey.name)}
                    >
                      Rename
                    </Button>
                    <form
                      method="POST"
                      action="?/revokePasskey"
                      use:enhance={() =>
                        async ({ result, update }) => {
                          await update();
                          if (result.type === 'success') toast.success('Passkey removed');
                          else if (result.type === 'failure')
                            toast.error('Could not remove passkey');
                        }}
                    >
                      <input type="hidden" name="id" value={passkey.id} />
                      <Button type="submit" size="sm" variant="outline">Remove</Button>
                    </form>
                  </div>
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </CardContent>
  </Card>

  <p class="text-muted-foreground text-center text-xs">v{__APP_VERSION__}</p>
</div>
