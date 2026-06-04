import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

type KakaoPlace = {
  place_name?: string;
};

type Diagnostic = {
  source: 'category' | 'address' | 'fallback';
  reason?: string;
  categoryAttempts?: Array<{
    category: string;
    ok: boolean;
    status?: number;
    count?: number;
    error?: string;
  }>;
};

type AddressResult = {
  placeName: string | null;
  regionName: string | null;
  reason?: string;
};

const CATEGORY_GROUPS = ['AT4', 'CT1', 'FD6', 'CE7', 'AD5', 'PK6', 'MT1', 'CS2', 'PS3', 'AC5', 'BK9', 'HP8', 'PM9', 'SC4', 'OL7', 'SW8'];
const FALLBACK_PLACE_NAME = '장소명 확인 필요';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('KAKAO_REST_API_KEY');
    const { latitude, longitude } = await req.json();

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return jsonResponse({
        placeName: '위치 정보 없음',
        regionName: null,
        diagnostic: { source: 'fallback', reason: 'invalid_coordinates' } satisfies Diagnostic
      });
    }

    if (!apiKey) {
      return jsonResponse({
        placeName: FALLBACK_PLACE_NAME,
        regionName: null,
        diagnostic: { source: 'fallback', reason: 'missing_kakao_rest_api_key' } satisfies Diagnostic
      });
    }

    const [categoryResult, addressResult] = await Promise.all([
      searchNearbyPlace(apiKey, latitude, longitude),
      reverseGeocode(apiKey, latitude, longitude)
    ]);

    if (categoryResult.placeName) {
      return jsonResponse({
        placeName: categoryResult.placeName,
        regionName: addressResult.regionName,
        diagnostic: { source: 'category', categoryAttempts: categoryResult.attempts } satisfies Diagnostic
      });
    }

    if (addressResult.placeName) {
      return jsonResponse({
        placeName: addressResult.placeName,
        regionName: addressResult.regionName,
        diagnostic: {
          source: 'address',
          reason: 'no_category_place_result',
          categoryAttempts: categoryResult.attempts
        } satisfies Diagnostic
      });
    }

    return jsonResponse({
      placeName: FALLBACK_PLACE_NAME,
      regionName: addressResult.regionName,
      diagnostic: {
        source: 'fallback',
        reason: addressResult.reason ?? 'no_place_or_address_result',
        categoryAttempts: categoryResult.attempts
      } satisfies Diagnostic
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

async function searchNearbyPlace(apiKey: string, latitude: number, longitude: number) {
  const attempts: Diagnostic['categoryAttempts'] = [];

  for (const category of CATEGORY_GROUPS) {
    const url = new URL('https://dapi.kakao.com/v2/local/search/category.json');
    url.searchParams.set('category_group_code', category);
    url.searchParams.set('x', String(longitude));
    url.searchParams.set('y', String(latitude));
    url.searchParams.set('radius', '500');
    url.searchParams.set('sort', 'distance');
    url.searchParams.set('size', '3');

    try {
      const response = await fetch(url, {
        headers: { Authorization: `KakaoAK ${apiKey}` }
      });

      if (!response.ok) {
        attempts.push({ category, ok: false, status: response.status, error: await response.text() });
        continue;
      }

      const data = await response.json();
      const documents = (data.documents ?? []) as KakaoPlace[];
      attempts.push({ category, ok: true, count: documents.length });

      const place = documents.find((document) => document.place_name);
      if (place?.place_name) {
        return { placeName: place.place_name, attempts };
      }
    } catch (error) {
      attempts.push({ category, ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  return { placeName: null, attempts };
}

async function reverseGeocode(apiKey: string, latitude: number, longitude: number): Promise<AddressResult> {
  const url = new URL('https://dapi.kakao.com/v2/local/geo/coord2address.json');
  url.searchParams.set('x', String(longitude));
  url.searchParams.set('y', String(latitude));

  const response = await fetch(url, {
    headers: { Authorization: `KakaoAK ${apiKey}` }
  });

  if (!response.ok) {
    return { placeName: null, regionName: null, reason: `kakao_address_http_${response.status}` };
  }

  const data = await response.json();
  const document = data.documents?.[0];
  const roadAddress = document?.road_address;
  const address = document?.address;
  const placeName = roadAddress?.building_name || roadAddress?.address_name || address?.address_name || null;
  const regionName = [address?.region_1depth_name, address?.region_2depth_name].filter(Boolean).join(' ') || null;
  return { placeName, regionName, reason: placeName ? undefined : 'no_address_result' };
}
