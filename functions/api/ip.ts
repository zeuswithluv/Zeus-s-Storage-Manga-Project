export async function onRequest(context) {
  const { request } = context;
  
  // Get IP and Country from Cloudflare Headers
  const cfIp = request.headers.get('cf-connecting-ip');
  const cfCountry = request.headers.get('cf-ipcountry');
  const forwarded = request.headers.get('x-forwarded-for');

  const ip = cfIp || (forwarded ? forwarded.split(',')[0] : 'Unknown');
  const country = cfCountry || 'Unknown';

  return new Response(JSON.stringify({ ip, country }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, max-age=0'
    },
  });
}
