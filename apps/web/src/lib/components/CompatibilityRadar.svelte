<script lang="ts">
  import BaseRadarChart from './BaseRadarChart.svelte';

  let {
    userData = [
      { label: 'Frontend', value: 90 },
      { label: 'Backend', value: 40 },
      { label: 'DevOps', value: 30 },
      { label: 'Database', value: 50 },
      { label: 'Design', value: 80 }
    ],
    matchData = [
      { label: 'Frontend', value: 40 },
      { label: 'Backend', value: 95 },
      { label: 'DevOps', value: 85 },
      { label: 'Database', value: 90 },
      { label: 'Design', value: 20 }
    ],
    size = 280
  } = $props<{
    userData?: { label: string, value: number }[];
    matchData?: { label: string, value: number }[];
    size?: number;
  }>();
</script>

<BaseRadarChart
  title="Skill Overlap Radar"
  data={userData}
  compareData={matchData}
  {size}
  accentColor="var(--primary)"
  fillColor="rgba(99, 102, 241, 0.25)"
  compareAccentColor="#22c55e"
  compareFillColor="rgba(34, 197, 94, 0.25)"
  legendLabel1="You"
  legendLabel2="Match"
  ariaLabel="Radar chart showing skill compatibility between you and the matched developer"
/>
