// FotMob uses lineupType="standard" for released team sheets and
// lineupType="predicted" for forecasts. Older payloads used luType.
export function fotmobLineupType(details,lineups){
  if(!Array.isArray(lineups)||!lineups.length)return 'pending';
  const box=details?.content?.lineup||details?.content?.lineups||details?.lineup||details?.lineups||{};
  const flags=[box.lineupType,box.luType].map(v=>String(v||'').trim().toLowerCase());
  if(flags.includes('predicted'))return 'predicted';
  const complete=lineups.length===2&&lineups.every(team=>Array.isArray(team.startXI)&&team.startXI.length===11);
  if(complete&&flags.some(flag=>flag==='standard'||flag==='confirmed'))return 'confirmed';
  return 'predicted';
}
