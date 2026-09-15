import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from './gameplay.js';
test('game watcher refreshes private state on realtime, reads back writes, and cleans up',async()=>{
 let reads=0, callback, removed=0;
 const pb={send:async(path,options)=>{assert.equal(options.method,'POST');if(path.endsWith('state')){reads++;assert.equal(options.body.token,'secret');return {game:{status:'question'}};}return {accepted:true};},collection:()=>({subscribe:async(_topic,fn)=>{callback=fn;return ()=>removed++;}})};
 let seen;const stop=game.watchGame(pb,'g',{playerId:'p',token:'secret'},s=>seen=s,assert.fail);
 await new Promise(r=>setTimeout(r,10));assert.equal(seen.game.status,'question');callback({record:{game:'g'}});await new Promise(r=>setTimeout(r,10));assert.ok(reads>=2);stop();assert.equal(removed,2);
 await game.sendGame(pb,'g','answer',{token:'secret'});
});
