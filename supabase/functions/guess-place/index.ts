import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

type KakaoPlace = {
  place_name?: string;
  category_name?: string;
  address_name?: string;
  road_address_name?: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('KAKAO_REST_API_KEY');
    const { latitude, longitude } = await req.json();

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return jsonResponse({ placeName: '위치 정보 없음' });
    }

    if (!apiKey) {
      return jsonResponse({ placeName: formatFallback(latitude, longitude) });
    }

    const placeName = await searchNearbyPlace(apiKey, latitude, longitude);
    if (placeName) {
      return jsonResponse({ placeName });
    }

    const address = await reverseGeocode(apiKey, latitude, longitude);
    return jsonResponse({ placeName: address ?? formatFallback(latitude, longitude) });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

async function searchNearbyPlace(apiKey: string, latitude: number, longitude: number) {
  const categories = ['FD6', 'CE7', 'AT4', 'CT1'];

  for (const category of categories) {
    const url = new URL('https://dapi.kakao.com/v2/local/search/category.json');
    url.searchParams.set('category_group_code', category);
    url.searchParams.set('x', String(longitude));
    url.searchParams.set('y', String(latitude));
    url.searchParams.set('radius', '120');
    url.searchParams.set('sort', 'distance');
    url.searchParams.set('size', '1');

    const response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` }
    });

    if (!response.ok) {
      continue;
    }

    const data = await response.json();
    const place = data.documents?.[0] as KakaoPlace | undefined;
    if (place?.place_name) {
      return place.place_name;
    }
  }

  return null;
}

async function reverseGeocode(apiKey: string, latitude: number, longitude: number) {
  const url = new URL('https://dapi.kakao.com/v2/local/geo/coord2address.json');
  url.searchParams.set('x', String(longitude));
  url.searchParams.set('y', String(latitude));

  const response = await fetch(url, {
    headers: { Authorization: `KakaoAK ${apiKey}` }
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const document = data.documents?.[0];
  return document?.road_address?.address_name ?? document?.address?.address_name ?? null;
}

function formatFallback(latitude: number, longitude: number) {
  return `위치 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}
