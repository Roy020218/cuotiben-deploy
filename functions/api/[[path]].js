// Cloudflare Pages Functions - API 路由
// 所有 /api/* 请求走这里

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export async function onRequest({ request, env, waitUntil }) {
  const url = new URL(request.url);

  // CORS 预检
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 获取所有记录（支持增量：?since=秒时间戳）
    if (url.pathname === '/api/records' && request.method === 'GET') {
      const since = url.searchParams.get('since');
      let stmt;
      if (since) {
        stmt = env.DB.prepare('SELECT * FROM records WHERE updated_at > ? ORDER BY updated_at ASC').bind(Math.floor(Number(since) / 1000));
      } else {
        stmt = env.DB.prepare('SELECT * FROM records ORDER BY created_at DESC');
      }
      const { results } = await stmt.all();
      return new Response(JSON.stringify(results), { headers: corsHeaders });
    }

    // 保存记录
    if (url.pathname === '/api/records' && request.method === 'POST') {
      const { id, data } = await request.json();
      const nowSec = Math.floor(Date.now() / 1000);
      await env.DB.prepare(
        'INSERT OR REPLACE INTO records (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).bind(id, data, nowSec, nowSec).run();
      return new Response(JSON.stringify({ success: true, id }), { headers: corsHeaders });
    }

    // 删除记录
    if (url.pathname.startsWith('/api/records/') && request.method === 'DELETE') {
      const id = url.pathname.split('/').pop();
      await env.DB.prepare('DELETE FROM records WHERE id = ?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // 获取单条记录
    if (url.pathname.startsWith('/api/records/') && request.method === 'GET') {
      const id = url.pathname.split('/').pop();
      const { results } = await env.DB.prepare('SELECT * FROM records WHERE id = ?').bind(id).all();
      if (results.length === 0) {
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders });
      }
      return new Response(JSON.stringify(results[0]), { headers: corsHeaders });
    }

    // 保存/更新知识点
    if (url.pathname === '/api/kp' && request.method === 'POST') {
      const { id, data } = await request.json();
      const nowSec = Math.floor(Date.now() / 1000);
      await env.DB.prepare(
        'INSERT OR REPLACE INTO records (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).bind(id, data, nowSec, nowSec).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // 获取知识点
    if (url.pathname.startsWith('/api/kp/') && request.method === 'GET') {
      const id = url.pathname.split('/').pop();
      const { results } = await env.DB.prepare('SELECT * FROM records WHERE id = ?').bind(id).all();
      if (results.length === 0) {
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders });
      }
      return new Response(JSON.stringify(results[0]), { headers: corsHeaders });
    }

    // 迁移：毫秒时间戳转秒
    if (url.pathname === '/api/migrate' && request.method === 'POST') {
      const { results: all } = await env.DB.prepare('SELECT id, created_at, updated_at FROM records').all();
      let migrated = 0;
      for (const r of all) {
        const newCreated = r.created_at > 9999999999 ? Math.floor(r.created_at / 1000) : r.created_at;
        const newUpdated = r.updated_at > 9999999999 ? Math.floor(r.updated_at / 1000) : r.updated_at;
        if (newCreated !== r.created_at || newUpdated !== r.updated_at) {
          await env.DB.prepare('UPDATE records SET created_at = ?, updated_at = ? WHERE id = ?')
            .bind(newCreated, newUpdated, r.id).run();
          migrated++;
        }
      }
      return new Response(JSON.stringify({ success: true, migrated }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
