<script lang="ts">
  let {
    format = "bluray",
    regionCode = null,
  }: {
    format?: "dvd" | "bluray" | "4k";
    regionCode?: string | null;
  } = $props();

  let label = $derived.by(() => `${format}${regionCode ? ` (${regionCode})` : ""}`);
</script>

<span class="badge">{label}</span>
