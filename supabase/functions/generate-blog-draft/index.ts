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
    const orderedPlaces = orderPlacesByTakenTime(places ?? []);

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
          `${index + 1}. ${place.visit_date} ${place.first_taken_at ? `(${place.first_taken_at})` : ''}`,
          `장소명: ${place.name}`,
          `사진 수: ${place.photo_count}`,
          `사용자 메모 참고자료: ${memo}`,
          `사진 힌트: ${photoHints || '사진 메타데이터 없음'}`
        ].join('\n');
      })
      .join('\n\n');

    const prompt = `
다음 여행 정보를 바탕으로 한국어 여행 블로그 초안을 Markdown으로 작성해줘.

중요 요구사항:
- 장소 순서는 아래에 제공된 순서를 그대로 따른다. 이 순서는 업로드 순서가 아니라 사진 촬영 시각 기준이다.
- 좌표나 위도/경도는 절대 쓰지 말고, 제공된 장소명만 사용한다.
- 사용자가 쓴 메모를 그대로 복사하지 말고, 의미를 살려 블로그에 어울리는 자연스러운 문장으로 재작성한다.
- 메모가 없는 장소도 장소명, 방문일, 사진 수, 사진 파일명 힌트를 바탕으로 어색하지 않은 여행 기록 문장을 만든다.
- 과장된 광고 문구, 협찬 느낌, 확정할 수 없는 정보는 쓰지 않는다.
- 블로그 제목 후보 3개와 본문을 포함한다.
- 본문은 장소별 소제목을 두고, 전체 흐름이 여행 동선처럼 읽히게 작성한다.

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
              '너는 사진 메타데이터와 간단한 메모를 바탕으로 자연스러운 한국어 여행 블로그 초안을 쓰는 편집자다. 메모는 원문 인용이 아니라 블로그 문장으로 각색한다.'
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

function orderPlacesByTakenTime(places: PlaceInput[]) {
  return [...places].sort((a, b) => {
    const aTime = Date.parse(a.first_taken_at ?? `${a.visit_date}T00:00:00Z`);
    const bTime = Date.parse(b.first_taken_at ?? `${b.visit_date}T00:00:00Z`);
    if (aTime !== bTime) return aTime - bTime;
    return a.name.localeCompare(b.name, 'ko');
  });
}

function fallbackDraft(trip: TripInput, places: PlaceInput[]) {
  const sections = places
    .map((place) => {
      const memo = place.user_memo?.trim();
      const sentence = memo
        ? rewriteMemoFallback(place.name, memo)
        : `${place.name}에서는 사진 ${place.photo_count}장을 남기며 그날의 분위기를 차분히 기록했다. 사진 속 장면을 떠올리며 블로그 본문에는 방문 당시의 동선과 인상을 자연스럽게 덧붙이면 좋다.`;

      return `## ${place.name}

방문일: ${place.visit_date}
사진: ${place.photo_count}장

${sentence}
`;
    })
    .join('\n');

  return {
    title: `${trip.title} 여행기`,
    contentMarkdown: `## 블로그 제목 후보
1. ${trip.region}에서 보낸 ${trip.title}
2. 사진 순서대로 정리한 ${trip.region} 여행
3. ${trip.title}: 장소별로 남긴 여행 기록

# ${trip.title}

${trip.start_date}부터 ${trip.end_date}까지 ${trip.region}에서 보낸 시간을 사진 촬영 순서에 맞춰 정리했다. 각 장소의 메모와 사진 기록을 바탕으로 여행의 흐름이 자연스럽게 이어지도록 초안을 구성했다.

${sections}`
  };
}

function rewriteMemoFallback(placeName: string, memo: string) {
  const tone = memo.length > 80 ? '여러 장면이 함께 남아 있는' : '짧지만 인상이 분명한';
  return `${placeName}에서는 ${tone} 메모를 바탕으로, 방문 당시의 분위기와 기억에 남은 포인트를 자연스럽게 풀어낼 수 있다. 사진 흐름에 맞춰 그 순간의 감상과 동선을 이어 쓰면 블로그 문장으로 읽기 좋다.`;
}

function extractOutputText(data: any) {
  const content = data.output?.flatMap((item: any) => item.content ?? []) ?? [];
  return content
    .map((item: any) => item.text)
    .filter(Boolean)
    .join('\n')
    .trim();
}
