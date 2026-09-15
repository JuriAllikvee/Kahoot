export function sendGame(pb, gameId, action, body = {}) {
  return pb.send(`/api/quiz/${gameId}/${action}`, { method: 'POST', body, requestKey: null });
}

// Realtime is an invalidation signal only. Never derive scores or time limits locally.
// Polling catches missed SSE events/reconnects and expires the server deadline.
export function watchGame(pb, gameId, session, onChange, onError = () => {}) {
  let stopped=false, loading=false, pending=false;
  const subscriptions=[];
  const refresh=async()=>{
    if(stopped) return;
    if(loading){pending=true;return;}
    loading=true;
    try {
      const value=await sendGame(pb,gameId,'state',session ? {playerId:session.playerId,token:session.token} : {});
      if(!stopped) onChange(value);
    } catch(error) {if(!stopped) onError(error);}
    finally {loading=false;if(pending){pending=false;refresh();}}
  };
  const subscribe=async(collection,topic)=>{
    try {const unsubscribe=await pb.collection(collection).subscribe(topic,event=>{if(collection==='games'||event.record.game===gameId) refresh();});if(stopped) unsubscribe();else subscriptions.push(unsubscribe);}
    catch { /* Polling remains active if SSE is blocked by the proxy. */ }
  };
  subscribe('games',gameId);subscribe('players','*');refresh();
  const timer=setInterval(refresh,1000);
  return ()=>{stopped=true;clearInterval(timer);subscriptions.forEach(stop=>stop());};
}
