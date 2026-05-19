<script lang="ts">
  import { authClient } from '$lib/auth-client';

  let name = $state('');
  let email = $state('');
  let username = $state('');
  let password = $state('');
  let loading = $state(false);
  let error = $state('');

  async function signUp() {
    loading = true;
    error = '';

    const result = await authClient.signUp.email({
      name,
      email,
      username,
      password,
      callbackURL: '/auth/session'
    });

    if (result.error) {
      error = result.error.message || 'Failed to sign up';
      loading = false;
      return;
    }

    window.location.href = '/auth/session';
  }
</script>

<svelte:head>
  <title>Sign Up</title>
</svelte:head>

<div class="shell">
  <div class="card">
    <h1>Create account</h1>
    <p class="muted">This creates a reusable Better Auth account for downstream apps.</p>

    <label>
      <span>Name</span>
      <input bind:value={name} autocomplete="name" />
    </label>

    <label>
      <span>Email</span>
      <input bind:value={email} autocomplete="email" type="email" />
    </label>

    <label>
      <span>Username</span>
      <input bind:value={username} autocomplete="username" />
    </label>

    <label>
      <span>Password</span>
      <input bind:value={password} autocomplete="new-password" type="password" />
    </label>

    <div class="actions">
      <button disabled={loading || !name || !email || !username || !password} onclick={signUp}>Create account</button>
    </div>

    {#if error}
      <p class="error">{error}</p>
    {/if}

    <p class="muted small">
      Already have an account? <a href="/auth/sign-in">Sign in</a>
    </p>
  </div>
</div>
