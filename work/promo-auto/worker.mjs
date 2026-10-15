// Shared worker, exercised by Node tests and hosted by the Supabase Edge Function.
export const BASE = 'https://zephiroxdev.github.io/avant-usine/';
const FIELDS = 'id text status sentAt externalLink channelId';
export const keyOf = item => {
  if (!/^(?:\d{2}V\d{2}(?:\.\d+)?|\d+\.\d+(?:\.\d+)?)$/.test(item.patch)) throw Error('invalid_patch');
  return item.patch.toLowerCase();
};
export const videoOf = item => {
  if (!/^promo-[a-z0-9-]+\.mp4$/.test(item.animation)) throw Error('invalid_video');
  return BASE + item.animation;
};
export const captionOf = item => `Avant l’usine — ${item.patch}\n${item.platforms.join(' · ')}\n${BASE}\n#avantlusine #jul #ALU${item.patch.replaceAll('.', '_')}`;

export function receipt(record, post, channelId) {
  if (post.channelId !== channelId || !post.id) throw Error('wrong_post_channel');
  const published = post.status === 'sent' && !!post.sentAt;
  Object.assign(record, {postId: post.id, status: post.status, published,
    checkedAt: new Date().toISOString(), publishedAt: published ? post.sentAt : null,
    url: published && /^https:\/\/(?:www\.)?tiktok\.com\//.test(post.externalLink || '') ? post.externalLink : null});
}

export class BufferAPI {
  constructor(key, fetcher = fetch) { this.key = key; this.fetcher = fetcher; }
  async gql(query, variables) {
    const response = await this.fetcher('https://api.buffer.com', {method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${this.key}`},
      body: JSON.stringify({query, variables}), signal: AbortSignal.timeout(10000)});
    if (!response.ok) throw Error('buffer_http_' + response.status);
    const result = await response.json();
    if (result.errors || !result.data) throw Error('buffer_graphql_error');
    return result.data;
  }
  async channel(id) {
    return (await this.gql('query($input:ChannelInput!){channel(input:$input){id name service organizationId isDisconnected isLocked isQueuePaused}}', {input: {id}})).channel;
  }
  async post(id) {
    return (await this.gql(`query($input:PostInput!){post(input:$input){${FIELDS}}}`, {input: {id}})).post;
  }
  async posts(channel) {
    let after = null; const posts = [];
    for (let page = 0; page < 10; page++) {
      const data = (await this.gql(`query($input:PostsInput!,$after:String){posts(input:$input,first:100,after:$after){edges{node{${FIELDS}}}pageInfo{hasNextPage endCursor}}}`,
        {input: {organizationId: channel.organizationId, filter: {channelIds: [channel.id]}}, after})).posts;
      posts.push(...data.edges.map(edge => edge.node));
      if (!data.pageInfo.hasNextPage) return posts;
      after = data.pageInfo.endCursor;
    }
    throw Error('duplicate_scan_incomplete');
  }
  async create(channelId, text, video) {
    const result = (await this.gql(`mutation($input:CreatePostInput!){createPost(input:$input){__typename ... on PostActionSuccess{post{${FIELDS}}} ... on MutationError{message}}}`,
      {input: {channelId, text, assets: [{video: {url: video}}], mode: 'shareNow',
        schedulingType: 'automatic', needsApproval: false, saveToDraft: false}})).createPost;
    if (result.__typename !== 'PostActionSuccess') throw Error('buffer_submission_rejected');
    return result.post;
  }
}

export async function processPromos({state, manifest, api, persist, mediaReady}) {
  const {config} = state;
  if (!config.enabled) return {disabled: true, errors: []};
  const all = [...manifest.images];
  // Keep tracking an accepted video even if removed from the promotional catalogue.
  for (const record of Object.values(state.items)) {
    if (!record.published && record.item && !all.some(x => keyOf(x) === keyOf(record.item))) all.push(record.item);
  }
  const eligible = all.filter(x => x.animation && !config.excludedPatches.includes(keyOf(x)));
  if (!eligible.some(x => !state.items[keyOf(x)]?.published)) return {idle: true, errors: []};
  const channel = await api.channel(config.channelId);
  if (channel.service !== 'tiktok' || channel.name.replace(/^@/, '').toLowerCase() !== config.handle) throw Error('wrong_tiktok_account');
  if (channel.isDisconnected || channel.isLocked || channel.isQueuePaused) throw Error('tiktok_unavailable');
  let remote = null, created = 0; const errors = [], seen = new Set();
  for (const item of eligible.reverse()) {
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    let record = state.items[key];
    if (record?.published) continue;
    if (record?.postId) {
      try {
        receipt(record, await api.post(record.postId), channel.id);
        await persist(state);
        if (['error', 'needs_approval', 'draft'].includes(record.status)) errors.push(key + ':buffer_intervention');
      } catch { errors.push(key + ':status_unavailable'); }
      continue;
    }
    remote ??= await api.posts(channel);
    const matches = remote.filter(post => post.text === captionOf(item));
    if (matches.length > 1) { errors.push(key + ':multiple_posts'); continue; }
    if (matches.length === 1) {
      record ??= state.items[key] = {imageId: item.id, item};
      receipt(record, matches[0], channel.id);
      await persist(state);
      if (['error', 'needs_approval', 'draft'].includes(record.status)) errors.push(key + ':buffer_intervention');
      continue;
    }
    if (record) { errors.push(key + ':submission_uncertain'); continue; }
    if (created >= 2 || !await mediaReady(videoOf(item))) continue;
    record = state.items[key] = {imageId: item.id, item, status: 'submitting', published: false,
      startedAt: new Date().toISOString()};
    await persist(state); // Mandatory durable intent before transmission.
    created++;
    try { receipt(record, await api.create(channel.id, captionOf(item), videoOf(item)), channel.id); }
    catch { record.status = 'uncertain'; errors.push(key + ':submission_uncertain'); }
    await persist(state);
  }
  return {created, errors};
}
