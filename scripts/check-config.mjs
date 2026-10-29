import fs from 'node:fs';
if(!fs.existsSync('wrangler.toml')){console.error('Copy wrangler.example.toml to wrangler.toml and fill your account-specific values.');process.exit(1);}
const text=fs.readFileSync('wrangler.toml','utf8'),problems=[];
if(/REPLACE_|YOUR-|YOUR_|SET_YOUR/.test(text))problems.push('Replace remaining example values in wrangler.toml.');
for(const key of ['SITE_ORIGIN','ADMIN_EMAIL','EMAIL_FROM','TURNSTILE_SITE_KEY'])if(!new RegExp('^'+key+'\\s*=','m').test(text))problems.push('Missing '+key);
for(const name of ['DB','PRIVATE_ASSETS'])if(!text.includes('binding = "'+name+'"'))problems.push('Missing binding '+name);
if(/^(OWNER_PASSWORD|PORTFOLIO_PASSWORD|RESEND_API_KEY|RATE_LIMIT_SALT|TURNSTILE_SECRET_KEY)\s*=/m.test(text))problems.push('Move secrets out of wrangler.toml into Cloudflare Secrets.');
if(!/^SITE_ORIGIN\s*=\s*"https:\/\/[^"/]+"/m.test(text))problems.push('SITE_ORIGIN must be an HTTPS origin without a trailing slash.');
if(problems.length){console.error(problems.join('\n'));process.exit(1);}
console.log('Local config structure passed. Confirm actual Cloudflare resources, secret values, and live connections separately.');
