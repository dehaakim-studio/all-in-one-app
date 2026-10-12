// Serverless Function Vercel: /api/metadata
const BROWSER_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = req.query?.url || new URL(req.url, 'http://localhost').searchParams.get('url');

  if (!targetUrl) {
    return res.status(400).json({ error: 'Parameter url diperlukan' });
  }

  const sendJson = (obj) => res.status(200).json(obj);

  try {
    /* ----------------------------------------------------------
       1. YOUTUBE — oEmbed official API
    ---------------------------------------------------------- */
    const ytMatch = targetUrl.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/i
    );
    if (ytMatch) {
      const vid = ytMatch[1];
      try {
        const r = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`,
          { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(5000) }
        );
        if (r.ok) {
          const d = await r.json();
          return sendJson({
            title:     d.title       || `YouTube Video (${vid})`,
            author:    d.author_name || '@YouTubeCreator',
            thumbnail: d.thumbnail_url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
            platform:  'YouTube',
            duration:  'HD Video',
            videoId:   vid
          });
        }
      } catch (_) {}

      return sendJson({
        title: `YouTube Video (${vid})`,
        author: '@YouTubeCreator',
        thumbnail: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
        platform: 'YouTube',
        duration: 'HD Video',
        videoId: vid
      });
    }

    /* ----------------------------------------------------------
       2. TIKTOK — TikWM API
    ---------------------------------------------------------- */
    if (/tiktok\.com/i.test(targetUrl)) {
      try {
        const twRes = await fetch(
          `https://www.tikwm.com/api/?url=${encodeURIComponent(targetUrl)}`,
          { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(6000) }
        );
        if (twRes.ok) {
          const twData = await twRes.json();
          if (twData.code === 0 && twData.data) {
            const d = twData.data;
            const dur = d.duration ? `${Math.floor(d.duration / 60)}:${(d.duration % 60).toString().padStart(2, '0')}` : '00:45';
            const authHandle = d.author?.unique_id ? `@${d.author.unique_id}` : (d.author?.nickname ? `@${d.author.nickname}` : '@TikTokCreator');
            return sendJson({
              title:       d.title || `TikTok Video #${d.id}`,
              author:      authHandle,
              thumbnail:   d.cover || d.origin_cover || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600',
              platform:    'TikTok',
              duration:    dur,
              videoId:     d.id,
              resolvedUrl: targetUrl
            });
          }
        }
      } catch (_) {}

      let resolvedUrl = targetUrl;
      if (/vt\.tiktok\.com/i.test(targetUrl)) {
        try {
          const r = await fetch(targetUrl, {
            method:   'GET',
            redirect: 'follow',
            headers:  BROWSER_HEADERS,
            signal:   AbortSignal.timeout(6000)
          });
          if (r.url && r.url !== targetUrl) resolvedUrl = r.url;
        } catch (_) {}
      }

      try {
        const r = await fetch(
          `https://www.tiktok.com/oembed?url=${encodeURIComponent(resolvedUrl)}`,
          { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(5000) }
        );
        if (r.ok) {
          const d = await r.json();
          if (d.title && !d.error) {
            return sendJson({
              title:       d.title,
              author:      d.author_name || d.author_unique_id || '@TikTokCreator',
              thumbnail:   d.thumbnail_url || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600',
              platform:    'TikTok',
              duration:    '00:45',
              resolvedUrl
            });
          }
        }
      } catch (_) {}

      const authorMatch = resolvedUrl.match(/@([a-zA-Z0-9_.]+)/);
      const vidMatch    = resolvedUrl.match(/video\/(\d+)/);
      return sendJson({
        title:       vidMatch ? `TikTok Video #${vidMatch[1]}` : 'TikTok Video',
        author:      authorMatch ? `@${authorMatch[1]}` : '@TikTokCreator',
        thumbnail:   'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600',
        platform:    'TikTok',
        duration:    '00:45',
        resolvedUrl
      });
    }

    /* ----------------------------------------------------------
       3. INSTAGRAM — noembed
    ---------------------------------------------------------- */
    if (/instagram\.com/i.test(targetUrl)) {
      try {
        const r = await fetch(
          `https://noembed.com/embed?url=${encodeURIComponent(targetUrl)}`,
          { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(7000) }
        );
        if (r.ok) {
          const d = await r.json();
          if (d.title && !d.error) {
            return sendJson({
              title:     d.title,
              author:    d.author_name || '@instagramcreator',
              thumbnail: d.thumbnail_url || null,
              platform:  'Instagram'
            });
          }
        }
      } catch (_) {}

      const scMatch = targetUrl.match(/(?:reel|p)\/([a-zA-Z0-9_-]+)/);
      return sendJson({
        title:    scMatch ? `Instagram Reel (${scMatch[1]})` : 'Instagram Content',
        author:   '@instagramcreator',
        thumbnail: null,
        platform: 'Instagram'
      });
    }

    /* ----------------------------------------------------------
       4. GENERIC — noembed universal
    ---------------------------------------------------------- */
    try {
      const noRes  = await fetch(
        `https://noembed.com/embed?url=${encodeURIComponent(targetUrl)}`,
        { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(7000) }
      );
      if (noRes.ok) {
        const noData = await noRes.json();
        return sendJson({
          title:     noData.title || 'Media File',
          author:    noData.author_name || '@creator',
          thumbnail: noData.thumbnail_url || null,
          platform:  noData.provider_name || 'Generic Video'
        });
      }
    } catch (_) {}

    return sendJson({
      title: 'Media File',
      author: '@creator',
      thumbnail: null,
      platform: 'Generic Video'
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
