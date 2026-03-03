<script lang="ts">
  import pkg from "../../package.json";
  import LogoGithub20 from "./LogoGithub20.svelte";
</script>

<svelte:head>
  <title>{pkg.name}</title>
</svelte:head>

<header class="playground-header" aria-label="Navigation">
  <a href="/" class="playground-header__brand">
    <span class="playground-header__platform">
      {pkg.name}
      <code title="Version {pkg.version}">v{pkg.version}</code>
    </span>
  </a>
  <a
    href={pkg.homepage}
    target="_blank"
    rel="noopener noreferrer"
    class="playground-header__github"
    aria-label="GitHub"
  >
    <LogoGithub20 />
  </a>
</header>

<main class="playground-content">
  <slot />
</main>

<style>
  .playground-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--header-height, 3.5rem);
    padding: 0 1rem;
    background: var(--brand-charcoal);
    border-bottom: 1px solid var(--brand-ash);
  }

  .playground-header__brand {
    color: var(--brand-warm-white);
    text-decoration: none;
    display: flex;
    align-items: baseline;
  }

  .playground-header__brand:hover {
    color: var(--brand-bone);
  }

  .playground-header__platform code {
    margin-left: 0.5rem;
    font-size: 0.875rem;
    font-weight: 400;
    color: var(--brand-bone);
  }

  .playground-header__github {
    color: var(--brand-warm-white);
    padding: 0.25rem;
  }

  .playground-header__github:hover {
    color: var(--brand-accent-light);
  }

  .playground-content {
    padding: 1rem;
    background: var(--brand-void);
    min-height: calc(100vh - var(--header-height, 3.5rem));
  }
</style>
