<script lang="ts">
  import { authClient } from '$lib/auth-client';

  let { data } = $props();
  let jwtToken = $state('');
  let tokenError = $state('');
  let fetchingToken = $state(false);
  let signingOut = $state(false);

  function formatJwtToken(token: string) {
    return token
      .split('.')
      .map((part) => part.match(/.{1,64}/g)?.join('\n') || part)
      .join('.\n');
  }

  async function fetchToken() {
    fetchingToken = true;
    tokenError = '';
    jwtToken = '';

    try {
      const response = await fetch('/api/auth/token', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        tokenError = `Failed to fetch JWT (${response.status})`;
        return;
      }

      const data = await response.json();
      jwtToken = typeof data?.token === 'string' ? data.token : '';
    } catch {
      tokenError = 'Failed to fetch JWT';
    } finally {
      fetchingToken = false;
    }
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
      <button disabled={fetchingToken || signingOut} onclick={fetchToken}>
        {#if fetchingToken}
          <span aria-hidden="true" class="button-spinner"></span>
        {/if}
        <span>Fetch JWT</span>
      </button>
      <button class="secondary" disabled={fetchingToken || signingOut} onclick={signOut}>
        {#if signingOut}
          <span aria-hidden="true" class="button-spinner"></span>
        {/if}
        <span>Sign out</span>
      </button>
    </div>

    {#if tokenError}
      <p class="error">{tokenError}</p>
    {/if}

    <section>
      <h2>User</h2>
      <pre class="data-output">{JSON.stringify(data.user, null, 2)}</pre>
    </section>

    <section>
      <h2>Session</h2>
      <pre class="data-output">{JSON.stringify(data.session, null, 2)}</pre>
    </section>

    <section>
      <h2>JWT</h2>
      <pre class="data-output token-output">{jwtToken ? formatJwtToken(jwtToken) : 'Fetch a token to inspect it here.'}</pre>
    </section>
  </div>
</div>

<style>
  .data-output {
    max-width: 100%;
    overflow-x: auto;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    word-break: break-word;
    box-sizing: border-box;
  }

  .token-output {
    line-break: anywhere;
  }
</style>
