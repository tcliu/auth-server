<script lang="ts">
  import { authClient } from '$lib/auth-client';

  let search = $derived.by(() => new URLSearchParams(window.location.search));
  let clientId = $derived(search.get('client_id') || '');
  let scope = $derived(search.get('scope') || '');
  let loading = $state(false);
  let error = $state('');

  async function submitConsent(accept: boolean) {
    loading = true;
    error = '';

    const result = await authClient.oauth2.consent({
      accept,
      scope: scope || undefined
    });

    if (result.error) {
      error = result.error.message || 'Failed to continue OAuth flow';
      loading = false;
      return;
    }

    const redirectUrl = result.data?.url;
    if (typeof redirectUrl === 'string' && redirectUrl) {
      window.location.href = redirectUrl;
      return;
    }

    error = 'OAuth consent completed but no redirect URL was returned';
    loading = false;
  }
</script>

<svelte:head>
  <title>Consent</title>
</svelte:head>

<div class="shell">
  <div class="card">
    <h1>Authorize application</h1>
    <p class="muted">Grant this client access to your account through a standard OAuth 2.1 authorization code flow.</p>

    <section>
      <h2>Client</h2>
      <pre>{clientId || 'Unknown client'}</pre>
    </section>

    <section>
      <h2>Scopes</h2>
      <pre>{scope || 'openid profile email'}</pre>
    </section>

    <div class="actions">
      <button disabled={loading} onclick={() => submitConsent(true)}>Allow</button>
      <button class="secondary" disabled={loading} onclick={() => submitConsent(false)}>Deny</button>
    </div>

    {#if error}
      <p class="error">{error}</p>
    {/if}
  </div>
</div>
