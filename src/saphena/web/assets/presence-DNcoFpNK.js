function i(e,t=300*1e3){if(!e.last_seen_at)return"offline";const n=new Date(e.last_seen_at).getTime();return Number.isNaN(n)?"offline":Date.now()-n<=t?"online":"offline"}export{i as g};
