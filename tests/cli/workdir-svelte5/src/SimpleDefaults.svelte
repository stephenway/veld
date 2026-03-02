<script lang="ts">
  interface Props {
    size?: "sm" | "md";
    count?: number;
  }

  let { size = "md", count = 0 }: Props = $props();
</script>

<div class="size-{size}">Count: {count}</div>
