import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const dir = mkdtempSync(join(tmpdir(), 'quiz-pb-'));
mkdirSync(join(dir, 'pb_migrations')); mkdirSync(join(dir, 'pb_hooks'));
const schema = JSON.parse(readFileSync('pb_schema.json'));
writeFileSync(join(dir, 'pb_migrations/100_init.js'), `migrate(app => { app.importCollections(${JSON.stringify(schema)}, false); let u=new Record(app.findCollectionByNameOrId('users')); u.set('email','host@example.test');u.set('password','test-password-123');app.save(u); });`);
for (const f of ['main.pb.js','quiz.js']) { try { copyFileSync('pb_hooks/'+f,join(dir,'pb_hooks',f)); } catch {} }
try { copyFileSync('pb_migrations/1800000000_gameplay.js',join(dir,'pb_migrations/1800000000_gameplay.js')); } catch {}
const child=spawn(resolve(process.env.PB_BINARY || '.test-pocketbase/pocketbase.exe'), ['serve','--dev','--http=127.0.0.1:18091','--dir='+join(dir,'pb_data'),'--hooksDir='+join(dir,'pb_hooks'),'--migrationsDir='+join(dir,'pb_migrations')]);
let logs='';child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
const base='http://127.0.0.1:18091';
async function req(path,body,token='',method=body?'POST':'GET') {const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Authorization:token},body:body?JSON.stringify(body):undefined});const text=await r.text();const data=text?JSON.parse(text):{};return {...data,status:r.status};}
try {
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,logs);
 const auth=await req('/api/collections/users/auth-with-password',{identity:'host@example.test',password:'test-password-123'});assert.equal(auth.status,200,JSON.stringify(auth));const token=auth.token;
 const create=(c,b)=>req('/api/collections/'+c+'/records',b,token);
 const quiz=await create('quizzes',{title:'Integration',owner:auth.record.id,isPublished:true});assert.equal(quiz.status,200,JSON.stringify(quiz));
 for(let order=1;order<=2;order++) {const q=await create('questions',{quiz:quiz.id,order,text:'Question '+order,options:['Yes','No'],correctIndex:0,timeLimit:5});assert.equal(q.status,200,JSON.stringify(q));}
 const game=await create('games',{quiz:quiz.id,host:auth.record.id});assert.equal(game.status,200,JSON.stringify(game));
 const url='/api/quiz/'+game.id;
 const p=await req(url+'/join',{nickname:'Alice'});assert.equal(p.status,200,'Player capability join endpoint must exist: '+JSON.stringify(p));assert.ok(p.token);
 const other=await req(url+'/join',{nickname:'Bob'});assert.equal(other.status,200);
 const action=(action,state)=>req(url+'/control',{action,expectedStatus:state.game.status,expectedQuestion:state.game.currentQuestion},token);
 let state=await req(url+'/state',{playerId:p.playerId,token:p.token});assert.equal(state.status,200,JSON.stringify(state));assert.equal(state.game.status,'lobby');
 assert.equal((await req(url+'/control',{action:'start'},'')).status,403);
 assert.equal((await req('/api/collections/games/records/'+game.id,{status:'question'},token,'PATCH')).status,403);
 assert.equal((await req('/api/collections/questions/records')).items.length,0);
 assert.equal((await req(url+'/state',{playerId:p.playerId,token:'forged'})).status,403);
 assert.equal((await action('start',state)).status,200);
 state=await req(url+'/state',{playerId:p.playerId,token:p.token});assert.equal(state.game.status,'question');assert.equal(state.question.correctIndex,undefined);assert.ok(state.deadline>state.serverNow);
 assert.equal((await req(url+'/join',{nickname:'Late'})).status,400);
 const original=await req('/api/collections/questions/records/'+state.question.id,undefined,token);assert.equal(original.status,200);
 assert.equal((await req('/api/collections/questions/records/'+state.question.id,undefined,token,'DELETE')).status,400);
 assert.equal((await req('/api/collections/games/records/'+game.id+'?expand=currentQuestion')).expand?.currentQuestion,undefined);
 assert.equal((await req('/api/collections/players/records/'+p.playerId)).capabilityHash,undefined);
 assert.equal((await req('/api/collections/games/records/'+game.id)).questionSnapshot,undefined);
 assert.equal((await action('next',state)).status,400);
 assert.equal((await req('/api/collections/answers/records',{game:game.id,player:p.playerId,question:state.question.id,optionIndex:0})).status,403);
 const answer={playerId:p.playerId,token:p.token,question:state.question.id,optionIndex:0,points:99999};
 assert.equal((await req(url+'/answer',{...answer,token:other.token})).status,403);
 assert.equal((await req(url+'/answer',{...answer,optionIndex:8})).status,400);
 const answers=await Promise.all([req(url+'/answer',answer),req(url+'/answer',answer)]);assert.equal(answers.filter(x=>x.status===200).length,1,JSON.stringify(answers));
 let hidden=await req(url+'/state',{playerId:p.playerId,token:p.token});assert.equal(hidden.me.answer.optionIndex,0);assert.equal(hidden.me.answer.points,undefined);assert.equal(hidden.players[0].score,0);
 assert.equal((await action('results',state)).status,200);state=await req(url+'/state',{playerId:p.playerId,token:p.token});assert.equal(state.question.correctIndex,0);assert.deepEqual(state.distribution,[1,0]);assert.ok(state.me.answer.points>=500);assert.equal(state.players.find(x=>x.id===p.playerId).score,state.me.answer.points);
 assert.equal((await req(url+'/answer',answer)).status,400);
 assert.equal((await action('next',state)).status,200);
 state=await req(url+'/state',{playerId:p.playerId,token:p.token});assert.equal(state.question.text,'Question 2');
 await new Promise(r=>setTimeout(r,5200));assert.equal((await req(url+'/answer',{...answer,question:state.question.id})).status,400);
 state=await req(url+'/state',{playerId:p.playerId,token:p.token});assert.equal(state.game.status,'results');assert.equal((await action('next',state)).status,200);
 state=await req(url+'/state',{playerId:p.playerId,token:p.token});assert.equal(state.game.status,'finished');
 const replay=await create('games',{quiz:quiz.id,host:auth.record.id});assert.equal(replay.status,200);assert.notEqual(replay.id,game.id);assert.notEqual(replay.code,game.code);
 console.log('PASS real PocketBase: two-player lifecycle, capabilities, privacy, concurrent unique scoring, deadline, replay');
} catch(e) {console.error(logs);throw e;} finally {if(child.exitCode===null){child.kill();await new Promise(r=>child.once('exit',r));}rmSync(dir,{recursive:true,force:true});}
