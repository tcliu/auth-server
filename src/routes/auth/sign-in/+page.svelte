<script lang="ts">
  import { authClient } from '$lib/auth-client';

  let email = $state('');
  let password = $state('');
  let username = $state('');
  let loading = $state(false);
  let error = $state('');

  async function signInWithEmail() {
    loading = true;
    error = '';

    const result = await authClient.signIn.email({ email, password, rememberMe: true });
    if (result.error) {
      error = result.error.message || 'Failed to sign in';
      loading = false;
      return;
    }

    window.location.href = '/auth/session';
  }

  async function signInWithUsername() {
    loading = true;
    error = '';

    const result = await authClient.signIn.username({ username, password });
    if (result.error) {
      error = result.error.message || 'Failed to sign in';
      loading = false;
      return;
    }

    window.location.href = '/auth/session';
  }
</script>

<svelte:head>
  <title>Sign In</title>
</svelte:head>

<div class="shell">
  <div class="card">
    <h1>Sign in</h1>
    <p class="muted">Use email or username. The server issues Better Auth sessions and JWTs for downstream apps.</p>

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
      <input bind:value={password} autocomplete="current-password" type="password" />
    </label>

    <div class="actions">
      <button disabled={loading || !email || !password} onclick={signInWithEmail}>Sign in with email</button>
      <button class="secondary" disabled={loading || !username || !password} onclick={signInWithUsername}>Sign in with username</button>
    </div>

    {#if error}
      <p class="error">{error}</p>
    {/if}

    <p class="muted small">
      Need an account? <a href="/auth/sign-up">Sign up</a>
      <br />
      Forgot your password? <a href="/auth/reset-password">Reset it</a>
    </p>
  </div>
</div>
