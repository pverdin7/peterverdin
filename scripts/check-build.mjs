import fs from 'node:fs';
console.log('CHECK_BUILD_RESUME_FIX_V2_ACTIVE');
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
for(const file of [...walk('public'),...walk('functions'),...walk('scripts')].filter(f=>/\.(m?js)$/.test(f))){
 const r=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});
 if(r.status!==0)process.exit(r.status||1);
}
await import('./check-public.mjs');
console.log('JavaScript and public-output checks passed.');
