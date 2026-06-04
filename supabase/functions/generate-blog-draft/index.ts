import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

type TripInput = {
  title: string;
  region: string;
  start_date: string;
  end_date: string;
};

type DraftPhotoInput = {
  original_file_name?: string;
  taken_at?: string | null;
};

type PlaceInput = {
  name: string;
  visit_date: string;
  visit_order?: number;
  photo_count: number;
  user_memo?: string;
  first_taken_at?: string | null;
  photos?: DraftPhotoInput[];
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4.1-mini';
    const { trip, places } = await req.json() as { trip: TripInput; places: PlaceInput[] };
    const orderedPlaces = orderPlacesByVisitOrder(places ?? []);

    if (!apiKey) {
      return jsonResponse(fallbackDraft(trip, orderedPlaces));
    }

    const placeLines = orderedPlaces
      .map((place, index) => {
        const memo = place.user_memo?.trim() || '메모 없음';
        const photoHints = (place.photos ?? [])
          .slice(0, 5)
          .map((photo) => `${photo.taken_at ?? '촬영시각 없음'} ${photo.original_file_name ?? ''}`.trim())
          .join(', ');
        return [
          `${index + 1}. 방문 순서: ${place.visit_order ?? index}`,
          `방문일: ${place.visit_date}`,
          `첫 촬영 시각: ${place.first_taken_at ?? '정보 없음'}`,
          `장소명: ${place.name}`,
          `사진 수: ${place.photo_count}`,
          `사용자 메모 참고자료: ${memo}`,
          `사진 힌트: ${photoHints || '사진 메타데이터 없음'}`
        ].join('\n');
      })
      .join('\n\n');

    const prompt = `
다음 여행 정보를 바탕으로 한국어 여행 블로그 글을 Markdown으로 완성해줘.

작성 규칙:
- "어떻게 쓰면 좋다", "덧붙이면 좋다", "작성해보자" 같은 가이드 문장을 쓰지 말고 실제 블로그 본문을 작성한다.
- 장소 순서는 아래에 제공된 방문 순서를 그대로 따른다. 이 순서는 업로드 순서가 아니라 사진 촬영 시각 기준이다.
- 같은 장소명이 여러 번 나오더라도 합치지 않는다. 중간에 다른 장소가 끼어 있었다면 각각 별도의 방문으로 보고 별도 문단으로 작성한다.
- 같은 장소 재방문은 소제목에 "다시 들른 ..."처럼 자연스럽게 구분한다.
- 좌표나 위도/경도는 절대 쓰지 말고, 제공된 장소명만 사용한다.
- 사용자가 쓴 메모를 그대로 복사하지 말고, 의미를 살려 블로그에 어울리는 자연스러운 문장으로 재작성한다.
- 메모가 없는 장소도 장소명, 방문일, 사진 수, 사진 파일명 힌트를 바탕으로 실제 여행 후기처럼 작성한다.
- 과장된 광고 문구, 협찬 느낌, 확정할 수 없는 정보는 쓰지 않는다.
- 결과물은 블로그 제목 후보 3개와 완성된 본문으로 구성한다.

여행 제목: ${trip.title}
여행 지역: ${trip.region}
여행 기간: ${trip.start_date} ~ ${trip.end_date}

장소 목록:
${placeLines}
`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'system',
            content:
              '너는 사진 메타데이터와 간단한 메모를 바탕으로 완성된 한국어 여행 블로그 글을 쓰는 편집자다. 메모는 원문 인용이 아니라 자연스러운 블로그 문장으로 각색한다. 조언이나 작성 가이드를 출력하지 않는다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return jsonResponse({ error: errorText }, response.status);
    }

    const data = await response.json();
    const contentMarkdown = data.output_text ?? extractOutputText(data) ?? fallbackDraft(trip, orderedPlaces).contentMarkdown;

    return jsonResponse({
      title: `${trip.title} 여행기`,
      contentMarkdown
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

function orderPlacesByVisitOrder(places: PlaceInput[]) {
  return [...places].sort((a, b) => {
    const orderCompare = (a.visit_order ?? Number.MAX_SAFE_INTEGER) - (b.visit_order ?? Number.MAX_SAFE_INTEGER);
    if (orderCompare !== 0) return orderCompare;
    const aTime = Date.parse(a.first_taken_at ?? `${a.visit_date}T00:00:00Z`);
    const bTime = Date.parse(b.first_taken_at ?? `${b.visit_date}T00:00:00Z`);
    if (aTime !== bTime) return aTime - bTime;
    return a.name.localeCompare(b.name, 'ko');
  });
}

function fallbackDraft(trip: TripInput, places: PlaceInput[]) {
  const sections = places.map((place, index) => renderFallbackSection(place, places, index)).join('\n');

  return {
    title: `${trip.title} 여행기`,
    contentMarkdown: `## 블로그 제목 후보
1. ${trip.region}에서 보낸 ${trip.title}
2. 사진 순서대로 따라간 ${trip.region} 여행
3. ${trip.title}, 장소별로 남긴 하루의 기록

# ${trip.title}

${trip.start_date}부터 ${trip.end_date}까지 ${trip.region}에서 보낸 시간을 사진 촬영 순서대로 정리했다. 사진을 다시 보니 장소마다 분위기가 조금씩 달랐고, 중간에 다시 들른 장소까지 여행의 흐름 속에 자연스럽게 남아 있었다.

${sections}`
  };
}

function renderFallbackSection(place: PlaceInput, places: PlaceInput[], index: number) {
  const previousSamePlace = places.slice(0, index).some((candidate) => candidate.name === place.name);
  const heading = previousSamePlace ? `다시 들른 ${place.name}` : place.name;
  const memo = place.user_memo?.trim();
  const memoSentence = memo ? memoToSentence(place.name, memo) : `${place.name}에서는 사진 ${place.photo_count}장을 남겼다. 특별한 메모는 없지만, 사진 속 장면만으로도 그 순간의 분위기가 다시 떠오른다.`;

  return `## ${heading}

${place.visit_date}에 들른 ${place.name}은 이번 여행의 한 장면으로 남았다. ${memoSentence} 사진이 나뉘어 있는 만큼 이 방문은 앞뒤 동선과 분리된 하나의 기억으로 읽힌다.
`;
}

function memoToSentence(placeName: string, memo: string) {
  const normalized = memo.replace(/\s+/g, ' ').trim();
  const mood = normalized.length > 80 ? '여러 장면이 겹쳐진 곳' : '짧지만 인상이 선명한 곳';
  const focus = /맛|음식|커피|카페|식사|디저트/.test(normalized)
    ? '먹고 마신 경험'
    : /예쁘|풍경|사진|뷰|바다|산|거리/.test(normalized)
      ? '눈에 들어온 풍경'
      : /힘들|아쉽|복잡|기다|덥|춥/.test(normalized)
        ? '이동 중의 작은 변수'
        : '그때의 분위기';
  return `${placeName}은 ${mood}이었다. ${focus}이 기억에 남아, 사진을 넘겨볼수록 그 순간의 감정과 동선이 자연스럽게 이어졌다.`;
}

function extractOutputText(data: any) {
  const content = data.output?.flatMap((item: any) => item.content ?? []) ?? [];
  return content
    .map((item: any) => item.text)
    .filter(Boolean)
    .join('\n')
    .trim();
}
