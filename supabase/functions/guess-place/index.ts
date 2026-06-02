import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    const { latitude, longitude } = await req.json();

    if (!apiKey || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return jsonResponse({
        placeName: typeof latitude === 'number' && typeof longitude === 'number'
          ? `위치 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
          : '위치 정보 없음'
      });
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.set('location', `${latitude},${longitude}`);
    url.searchParams.set('radius', '120');
    url.searchParams.set('language', 'ko');
    url.searchParams.set('key', apiKey);

    const response = await fetch(url);
    const data = await response.json();
    const placeName = data.results?.[0]?.name ?? `위치 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

    return jsonResponse({ placeName });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
