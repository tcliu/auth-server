<script lang="ts">
  import { page } from '$app/state';
  import { authClient } from '$lib/auth-client';

  let email = $state('');
  let newPassword = $state('');
  let token = $state('');
  let loading = $state(false);
  let message = $state('');
  let error = $state('');
  let resetComplete = $state(false);

  const resetTokenFromURL = $derived.by(() => {
    const tokenFromQuery = page.url.searchParams.get('token')?.trim();
    if (tokenFromQuery) return tokenFromQuery;

    const parts = page.url.pathname.split('/').filter(Boolean);
    const resetPasswordIndex = parts.lastIndexOf('reset-password');
    const tokenFromPath = resetPasswordIndex >= 0 ? parts[resetPasswordIndex + 1] : '';

    return tokenFromPath?.trim() || '';
  });

  $effect(() => {
    if (resetTokenFromURL) {
      token = resetTokenFromURL;
    }
  });

  async function requestReset() {
    loading = true;
    error = '';
    message = '';
    resetComplete = false;

    const result = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/auth/reset-password`
    });

    if (result.error) {
      error = result.error.message || 'Failed to request password reset';
      loading = false;
      return;
    }

    message = 'If the account exists, a password reset link has been sent.';
    loading = false;
  }

  async function resetPassword() {
    loading = true;
    error = '';
    message = '';
    resetComplete = false;

    const result = await authClient.resetPassword({ token, newPassword });
    if (result.error) {
      error = result.error.message || 'Failed to reset password';
      loading = false;
      return;
    }

    message = 'Password reset complete.';
    token = '';
    resetComplete = true;
    loading = false;
  }
</script>

<svelte:head>
  <title>Reset Password</title>
</svelte:head>

<div class="shell">
  <div aria-busy={loading} class="card">
    <h1>Reset password</h1>

    {#if !resetTokenFromURL}
      <label>
        <span>Email</span>
        <input bind:value={email} autocomplete="email" disabled={loading} type="email" />
      </label>

      <div class="actions">
        <button disabled={loading || !email} onclick={requestReset}>
          {#if loading}
            <span aria-hidden="true" class="button-spinner"></span>
          {/if}
          <span>Send reset link</span>
        </button>
      </div>

      <hr />
    {/if}

    {#if !resetTokenFromURL}
      <label>
        <span>Reset token</span>
        <input bind:value={token} disabled={loading} />
      </label>
    {:else}
      <p class="success">Reset link verified. Enter a new password below.</p>
    {/if}

    <label>
      <span>New password</span>
      <input bind:value={newPassword} autocomplete="new-password" disabled={loading} type="password" />
    </label>

    <div class="actions">
      <button class="secondary" disabled={loading || !token || !newPassword} onclick={resetPassword}>
        {#if loading}
          <span aria-hidden="true" class="button-spinner"></span>
        {/if}
        <span>Apply new password</span>
      </button>
    </div>

    {#if message}
      <p class="success">
        {message}
        {#if resetComplete}
          {' '}
          <a href="/auth/sign-in">Sign in</a>
          {' '}now.
        {/if}
      </p>
    {/if}

    {#if error}
      <p class="error">{error}</p>
    {/if}
  </div>
</div>
