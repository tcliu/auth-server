<script lang="ts">
  import { authClient } from '$lib/auth-client';

  let email = $state('');
  let newPassword = $state('');
  let token = $state('');
  let loading = $state(false);
  let message = $state('');
  let error = $state('');

  async function requestReset() {
    loading = true;
    error = '';
    message = '';

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

    const result = await authClient.resetPassword({ token, newPassword });
    if (result.error) {
      error = result.error.message || 'Failed to reset password';
      loading = false;
      return;
    }

    message = 'Password reset complete. You can sign in now.';
    loading = false;
  }
</script>

<svelte:head>
  <title>Reset Password</title>
</svelte:head>

<div class="shell">
  <div class="card">
    <h1>Reset password</h1>

    <label>
      <span>Email</span>
      <input bind:value={email} autocomplete="email" type="email" />
    </label>

    <div class="actions">
      <button disabled={loading || !email} onclick={requestReset}>Send reset link</button>
    </div>

    <hr />

    <label>
      <span>Reset token</span>
      <input bind:value={token} />
    </label>

    <label>
      <span>New password</span>
      <input bind:value={newPassword} autocomplete="new-password" type="password" />
    </label>

    <div class="actions">
      <button class="secondary" disabled={loading || !token || !newPassword} onclick={resetPassword}>Apply new password</button>
    </div>

    {#if message}
      <p class="success">{message}</p>
    {/if}

    {#if error}
      <p class="error">{error}</p>
    {/if}
  </div>
</div>
