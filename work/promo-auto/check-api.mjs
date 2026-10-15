// Read-only account/schema verification; never echo keys or post contents.
import {readFile} from 'node:fs/promises';
import {BufferAPI} from './worker.mjs';
const config=JSON.parse(await readFile(new URL('./config.json',import.meta.url),'utf8'));
const key=(await readFile(new URL('../../../buffer-api-key.txt',import.meta.url),'utf8')).trim();
const api=new BufferAPI(key),channel=await api.channel(config.channelId);
if(channel.name.replace(/^@/,'')!==config.handle||channel.service!=='tiktok')throw Error('Wrong account');
const posts=await api.posts(channel);
const schema=await api.gql('query { __type(name:"CreatePostInput") { inputFields { name } } }',{});
const fields=new Set(schema.__type.inputFields.map(x=>x.name));
for(const field of ['channelId','assets','mode','schedulingType','needsApproval'])if(!fields.has(field))throw Error('Schema mismatch');
console.log(JSON.stringify({channel:channel.name,connected:!channel.isDisconnected,postsRead:posts.length,mutationPerformed:false}));
