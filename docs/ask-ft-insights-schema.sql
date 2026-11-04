create schema if not exists ft_ask_private;
create table public.ft_ask_daily(day date not null default current_date,topic text not null,club text not null default '',intent text not null,answered boolean not null,requests integer not null default 1 check(requests between 1 and 100000),primary key(day,topic,club,intent,answered));
alter table public.ft_ask_daily enable row level security;
revoke all on public.ft_ask_daily from anon,authenticated;
grant select on public.ft_ask_daily to authenticated;
create policy "Ask FT insights only for administrators" on public.ft_ask_daily for select to authenticated using ((select auth.jwt()->'app_metadata'->>'role')='admin');
create function ft_ask_private.record(p_topic text,p_club text,p_intent text,p_answered boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_topic is null or not(p_topic=any(array['match-centre','fixtures','results','tables','lineups','tv','transfers','news','ref-watch','fan-voice','quiz','women','grassroots','founder','advertising','directory','shop','contact','home','more','unknown','offside','goal-difference','stoppage-time','var','points','extra-time','predicted-lineups','football-talk'])) or p_club is null or not(p_club=any(array['','Manchester United','Manchester City','Tottenham Hotspur','Wolverhampton Wanderers','Brighton & Hove Albion','Newcastle United','Nottingham Forest','AFC Bournemouth','West Ham United','Leeds United','Sheffield United','West Bromwich Albion','Queens Park Rangers','Arsenal','Aston Villa','Brentford','Burnley','Chelsea','Crystal Palace','Everton','Fulham','Liverpool','Sunderland','Birmingham City','Blackburn Rovers','Bristol City','Cardiff City','Charlton Athletic','Coventry City','Derby County','Hull City','Ipswich Town','Leicester City','Lincoln City','Middlesbrough','Millwall','Norwich City','Oxford United','Portsmouth','Preston North End','Sheffield Wednesday','Southampton','Stoke City','Swansea City','Watford','Wrexham','Real Madrid','Barcelona','Bayern Munich','Paris Saint-Germain'])) or p_intent is null or not(p_intent=any(array['navigation','fixtures','results','standings','tv','news','explanation','unknown'])) or p_answered is null then raise exception 'Invalid metric';end if;
 insert into public.ft_ask_daily(day,topic,club,intent,answered) values((now() at time zone 'Europe/London')::date,p_topic,p_club,p_intent,p_answered) on conflict(day,topic,club,intent,answered) do update set requests=least(public.ft_ask_daily.requests+1,100000);
 delete from public.ft_ask_daily where day<current_date-90;
end;$$;
revoke all on function ft_ask_private.record(text,text,text,boolean) from public;
grant usage on schema ft_ask_private to anon,authenticated;
grant execute on function ft_ask_private.record(text,text,text,boolean) to anon,authenticated;
create function public.ft_ask_record(p_topic text,p_club text,p_intent text,p_answered boolean) returns void language sql security invoker set search_path='' as $$select ft_ask_private.record(p_topic,p_club,p_intent,p_answered);$$;
revoke all on function public.ft_ask_record(text,text,text,boolean) from public;
grant execute on function public.ft_ask_record(text,text,text,boolean) to anon,authenticated;
