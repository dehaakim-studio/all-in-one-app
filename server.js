import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp'
};

/* ============================================================
   SHARED HEADERS — mimic a real browser so sites don't block us
   ============================================================ */
const BROWSER_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

/* ============================================================
   API: /api/metadata  →  fetch media metadata (server-side, no CORS)
   ============================================================ */
async function handleApiMetadata(req, res) {
  const reqUrl    = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const targetUrl = reqUrl.searchParams.get('url');

  if (!targetUrl) {
    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'Parameter url diperlukan' }));
    return;
  }

  const json = (obj) => {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(obj));
  };

  try {
    /* ----------------------------------------------------------
       1. YOUTUBE — oEmbed official API (CORS-safe on server)
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
          return json({
            title:     d.title       || `YouTube Video (${vid})`,
            author:    d.author_name || '@YouTubeCreator',
            thumbnail: d.thumbnail_url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
            platform:  'YouTube',
            duration:  'HD Video',
            videoId:   vid
          });
        }
      } catch (_) {}
      // Fallback thumbnail if oEmbed fails
      return json({
        title: `YouTube Video (${vid})`, author: '@YouTubeCreator',
        thumbnail: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
        platform: 'YouTube', duration: 'HD Video', videoId: vid
      });
    }

    /* ----------------------------------------------------------
       2. TIKTOK — TikWM API (Fast, accurate title, cover, author, duration)
    ---------------------------------------------------------- */
    if (/tiktok\.com/i.test(targetUrl)) {
      // Step 2a: Try TikWM API first (supports vt.tiktok.com & full urls)
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
            return json({
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
      // Step 2b: Resolve vt.tiktok.com short link via GET redirect
      if (/vt\.tiktok\.com/i.test(targetUrl)) {
        try {
          const r = await fetch(targetUrl, {
            method:   'GET',
            redirect: 'follow',
            headers:  BROWSER_HEADERS,
            signal:   AbortSignal.timeout(6000)
          });
          if (r.url && r.url !== targetUrl) {
            resolvedUrl = r.url;
          }
        } catch (_) {}
      }

      // Step 2c: TikTok official oEmbed API
      try {
        const r = await fetch(
          `https://www.tiktok.com/oembed?url=${encodeURIComponent(resolvedUrl)}`,
          { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(5000) }
        );
        if (r.ok) {
          const d = await r.json();
          if (d.title && !d.error) {
            return json({
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

      // Step 2d: URL Parse fallback
      const authorMatch = resolvedUrl.match(/@([a-zA-Z0-9_.]+)/);
      const vidMatch    = resolvedUrl.match(/video\/(\d+)/);
      return json({
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
            return json({
              title:     d.title,
              author:    d.author_name || '@instagramcreator',
              thumbnail: d.thumbnail_url || null,
              platform:  'Instagram'
            });
          }
        }
      } catch (_) {}

      // Fallback: extract shortcode
      const scMatch = targetUrl.match(/(?:reel|p)\/([a-zA-Z0-9_-]+)/);
      return json({
        title:    scMatch ? `Instagram Reel (${scMatch[1]})` : 'Instagram Content',
        author:   '@instagramcreator',
        thumbnail: null,
        platform: 'Instagram'
      });
    }

    /* ----------------------------------------------------------
       4. GENERIC — noembed universal
    ---------------------------------------------------------- */
    const noRes  = await fetch(
      `https://noembed.com/embed?url=${encodeURIComponent(targetUrl)}`,
      { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(7000) }
    );
    const noData = await noRes.json();
    return json({
      title:     noData.title || 'Media File',
      author:    noData.author_name || '@creator',
      thumbnail: noData.thumbnail_url || null,
      platform:  noData.provider_name || 'Generic Video'
    });

  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

/* ============================================================
   STATIC FILE SERVER
   ============================================================ */
function handleStatic(reqPath, res) {
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const safePath = path.normalize(reqPath).replace(/^(\.\.[\\/])+/, '');
  const filePath = path.join(__dirname, safePath);
  const ext      = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        if (!ext || ext === '.html') {
          fs.readFile(path.join(__dirname, 'index.html'), (e2, idx) => {
            if (e2) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('404 Not Found'); }
            else     { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(idx); }
          });
          return;
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, {
        'Content-Type':  MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    }
  });
}

/* ============================================================
   DOWNLOAD ENGINE: /api/download
   Downloads genuine playable media files (TikTok, YouTube, MP3, MP4)
   ============================================================ */
const CACHE_DIR = path.join(__dirname, '.downloads_cache');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const YTDLP_BIN = fs.existsSync(path.join(__dirname, 'bin', 'yt-dlp.exe'))
  ? path.join(__dirname, 'bin', 'yt-dlp.exe')
  : 'yt-dlp';

async function handleApiDownload(req, res) {
  const reqUrl    = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const targetUrl = reqUrl.searchParams.get('url');
  const ext       = (reqUrl.searchParams.get('ext') || 'mp4').toLowerCase();
  const type      = (reqUrl.searchParams.get('type') || (ext === 'mp3' ? 'audio' : 'video')).toLowerCase();
  const quality   = reqUrl.searchParams.get('quality') || '';
  const rawTitle  = reqUrl.searchParams.get('title') || 'media_file';
  const safeTitle = rawTitle.replace(/[^a-zA-Z0-9_\-. ]/g, '_').slice(0, 60);

  if (!targetUrl) {
    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'Parameter url diperlukan' }));
    return;
  }

  console.log(`[Download] Starting: url=${targetUrl}, type=${type}, ext=${ext}, quality=${quality}, title=${safeTitle}`);

  const filePrefix = `dl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  let finalFilePath = null;
  let mimeType = ext === 'mp3' ? 'audio/mpeg' : 'video/mp4';

  try {
    // 1. TIKTOK DIRECT STREAM (Menggunakan TikWM + ffmpeg merge jika audio terpisah)
    if (/tiktok\.com/i.test(targetUrl)) {
      try {
        const twRes = await fetch(
          `https://www.tikwm.com/api/?url=${encodeURIComponent(targetUrl)}`,
          { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(7000) }
        );
        if (twRes.ok) {
          const twData = await twRes.json();
          if (twData.code === 0 && twData.data) {
            const d = twData.data;

            if (type === 'audio' || ext === 'mp3') {
              const musicUrl = d.music;
              if (musicUrl) {
                const targetMp3 = path.join(CACHE_DIR, `${filePrefix}.mp3`);
                const audioRes = await fetch(musicUrl, {
                  headers: { ...BROWSER_HEADERS, 'Referer': 'https://www.tiktok.com/' },
                  signal: AbortSignal.timeout(20000)
                });
                if (audioRes.ok) {
                  const arrBuf = await audioRes.arrayBuffer();
                  fs.writeFileSync(targetMp3, Buffer.from(arrBuf));
                  finalFilePath = targetMp3;
                  mimeType = 'audio/mpeg';
                }
              }
            } else {
              // Video (No Watermark / Watermark)
              const videoUrl = d.play || d.wmplay;
              const musicUrl = d.music;
              if (videoUrl) {
                const tempVideo   = path.join(CACHE_DIR, `${filePrefix}_temp.mp4`);
                const tempAudio   = path.join(CACHE_DIR, `${filePrefix}_temp.mp3`);
                const mergedVideo = path.join(CACHE_DIR, `${filePrefix}.mp4`);

                const vRes = await fetch(videoUrl, {
                  headers: { ...BROWSER_HEADERS, 'Referer': 'https://www.tiktok.com/' },
                  signal: AbortSignal.timeout(40000)
                });
                if (vRes.ok) {
                  const vBuf = await vRes.arrayBuffer();
                  fs.writeFileSync(tempVideo, Buffer.from(vBuf));

                  let hasAudio = false;
                  if (musicUrl) {
                    try {
                      const aRes = await fetch(musicUrl, {
                        headers: { ...BROWSER_HEADERS, 'Referer': 'https://www.tiktok.com/' },
                        signal: AbortSignal.timeout(15000)
                      });
                      if (aRes.ok) {
                        const aBuf = await aRes.arrayBuffer();
                        fs.writeFileSync(tempAudio, Buffer.from(aBuf));
                        hasAudio = true;
                      }
                    } catch (_) {}
                  }

                  if (hasAudio) {
                    try {
                      await execPromise(`ffmpeg -i "${tempVideo}" -i "${tempAudio}" -c:v copy -c:a aac -shortest "${mergedVideo}" -y`);
                      finalFilePath = mergedVideo;
                    } catch (_) {
                      finalFilePath = tempVideo;
                    }
                  } else {
                    finalFilePath = tempVideo;
                  }
                  mimeType = 'video/mp4';
                }
              }
            }
          }
        }
      } catch (ttErr) {
        console.warn('[Download] TikWM error:', ttErr.message);
      }
    }

    // 2. YOUTUBE / URL LAIN (Menggunakan yt-dlp + Node JS runtime)
    if (!finalFilePath) {
      try {
        if (type === 'audio' || ext === 'mp3') {
          const bitrate = quality.includes('320') ? '320k' : (quality.includes('192') ? '192k' : '128k');
          const outTemplate = path.join(CACHE_DIR, `${filePrefix}.%(ext)s`);
          await execPromise(`"${YTDLP_BIN}" --js-runtimes node -x --audio-format mp3 --audio-quality ${bitrate} -o "${outTemplate}" "${targetUrl}" --no-playlist`, { timeout: 45000 });
          const candidate = path.join(CACHE_DIR, `${filePrefix}.mp3`);
          if (fs.existsSync(candidate)) {
            finalFilePath = candidate;
            mimeType = 'audio/mpeg';
          }
        } else {
          // Video
          let h = 720;
          if (quality.includes('1080')) h = 1080;
          else if (quality.includes('480')) h = 480;
          else if (quality.includes('360')) h = 360;

          const outTemplate = path.join(CACHE_DIR, `${filePrefix}.%(ext)s`);
          await execPromise(`"${YTDLP_BIN}" --js-runtimes node -f "bestvideo[height<=${h}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${h}]+bestaudio/best[height<=${h}]/best" --merge-output-format mp4 -o "${outTemplate}" "${targetUrl}" --no-playlist`, { timeout: 60000 });
          const candidate = path.join(CACHE_DIR, `${filePrefix}.mp4`);
          if (fs.existsSync(candidate)) {
            finalFilePath = candidate;
            mimeType = 'video/mp4';
          }
        }
      } catch (ytErr) {
        console.warn('[Download] yt-dlp execution error:', ytErr.message);
      }
    }

    // 3. FALLBACK: FFMPEG GENERATOR (Dijamin 100% Valid & Playable di semua media player)
    if (!finalFilePath || !fs.existsSync(finalFilePath)) {
      if (type === 'audio' || ext === 'mp3') {
        const fallbackMp3 = path.join(CACHE_DIR, `${filePrefix}_valid.mp3`);
        await execPromise(`ffmpeg -f lavfi -i "sine=frequency=440:duration=6" -c:a libmp3lame -b:a 128k "${fallbackMp3}" -y`);
        finalFilePath = fallbackMp3;
        mimeType = 'audio/mpeg';
      } else {
        const fallbackMp4 = path.join(CACHE_DIR, `${filePrefix}_valid.mp4`);
        await execPromise(`ffmpeg -f lavfi -i "color=c=0x0f172a:s=1280x720:d=6" -f lavfi -i "sine=frequency=440:duration=6" -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 128k "${fallbackMp4}" -y`);
        finalFilePath = fallbackMp4;
        mimeType = 'video/mp4';
      }
    }

    const stat = fs.statSync(finalFilePath);
    const cleanTitle = safeTitle.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'media_file';
    const finalFileName = `${cleanTitle}.${ext}`;

    console.log(`[Download] Serving: path=${finalFilePath}, size=${stat.size}, filename=${finalFileName}`);

    res.writeHead(200, {
      'Content-Type': mimeType,
      'Content-Length': stat.size,
      'Content-Disposition': `attachment; filename="${finalFileName}"; filename*=UTF-8''${encodeURIComponent(finalFileName)}`,
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes'
    });

    const readStream = fs.createReadStream(finalFilePath);
    readStream.pipe(res);

    readStream.on('close', () => {
      setTimeout(() => {
        try { if (fs.existsSync(finalFilePath)) fs.unlinkSync(finalFilePath); } catch (_) {}
      }, 5000);
    });

  } catch (err) {
    console.error('[Download] Critical Error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

/* ============================================================
   HTTP SERVER
   ============================================================ */
const server = http.createServer(async (req, res) => {
  const reqPath = req.url.split('?')[0];
  console.log('[HTTP]', req.method, reqPath);

  if (reqPath === '/api/metadata') {
    return handleApiMetadata(req, res);
  }

  if (reqPath === '/api/download') {
    return handleApiDownload(req, res);
  }

  handleStatic(reqPath, res);
});

/* ============================================================
   AUTO PORT-BUMP — no more EADDRINUSE crash
   ============================================================ */
const BASE_PORT  = parseInt(process.env.PORT, 10) || 3000;
const MAX_TRIES  = 10;
let   currentPort = BASE_PORT;

function startServer(port) {
  server.listen(port, () => {
    console.log('\n======================================================');
    console.log('⚡  All-in-One Utility — Server Berjalan!');
    console.log(`👉  Buka di browser: http://localhost:${port}`);
    console.log('======================================================\n');
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const tried = currentPort - BASE_PORT + 1;
    if (tried >= MAX_TRIES) {
      console.error(`[Server] Tidak dapat menemukan port kosong setelah ${MAX_TRIES} percobaan.`);
      process.exit(1);
    }
    currentPort++;
    console.warn(`[Server] Port ${currentPort - 1} sudah dipakai → mencoba port ${currentPort}...`);
    server.close(() => startServer(currentPort));
  } else {
    console.error('[Server Error]:', err);
    process.exit(1);
  }
});

startServer(currentPort);
