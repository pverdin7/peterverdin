// Equivalent Cloudflare Worker entrypoint for the existing workers.dev deployment.
// Static assets stay public. The /api/* surface uses the same guarded backend
// as Pages Functions; private files only ever come from the bound private R2.
import {onRequest} from '../functions/api/[[path]].js';
export default {
  async fetch(request,env,ctx){
    const path=new URL(request.url).pathname;
    if(path.startsWith('/api/')) return onRequest({request,env,waitUntil:ctx.waitUntil?.bind(ctx)});
    return env.ASSETS.fetch(request);
  }
};
