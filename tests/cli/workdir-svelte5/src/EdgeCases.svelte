<script lang="ts">
  let {
    longPropName: short = "x",
    a,
    id = crypto.randomUUID(),
    ...rest
  }: {
    longPropName?: string;
    a: number;
    id?: string;
    [key: string]: unknown;
  } = $props();
</script>

<div data-short={short} data-a={a}>id: {id}</div>
