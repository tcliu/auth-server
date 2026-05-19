<script lang="ts">
  import { authClient } from '$lib/auth-client';

  let { data } = $props();
  let jwtToken = $state('');
  let tokenError = $state('');
  let signingOut = $state(false);

  async function fetchToken() {
    tokenError = '';
    const result = await authClient.token();
    if (result.error) {
      tokenError = result.error.message || 'Failed to fetch JWT';
      return;
    }
    jwtToken = result.data?.token || '';
  }

  async function signOut() {
    signingOut = true;
    await authClient.signOut();
    window.location.href = '/auth/sign-in';
  }
</script>

<svelte:head>
  <title>Session</title>
</svelte:head>

<div class="shell">
  <div class="card wide">
    <h1>Session</h1>

    <p class="muted">Use this page to verify the authenticated session and fetch a JWT for downstream apps.</p>

    <div class="actions">
      <button onclick={fetchToken}>Fetch JWT</button>
      <button class="secondary" disabled={signingOut} onclick={signOut}>Sign out</button>
    </div>

    {#if tokenError}
      <p class="error">{tokenError}</p>
    {/if}

    <section>
      <h2>User</h2>
      <pre>{JSON.stringify(data.user, null, 2)}</pre>
    </section>

    <section>
      <h2>Session</h2>
      <pre>{JSON.stringify(data.session, null, 2)}</pre>
    </section>

    <section>
      <h2>JWT</h2>
      <pre>{jwtToken || 'Fetch a token to inspect it here.'}</pre>
    </section>
  </div>
</div>
