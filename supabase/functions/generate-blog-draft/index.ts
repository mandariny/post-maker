import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

type TripInput = {
  title: string;
  region: string;
  start_date: string;
  end_date: string;
};

type PlaceInput = {
  name: string;
  visit_date: string;
  photo_count: number;
  user_memo: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4.1-mini';
    const { trip, places } = await req.json() as { trip: TripInput; places: PlaceInput[] };

    if (!apiKey) {
      return jsonResponse(fallbackDraft(trip, places));
    }

    const placeLines = places
      .map((place) => `- ${place.visit_date} / ${place.name} / 사진 ${place.photo_count}장 / 메모: ${place.user_memo || '없음'}`)
      .join('\n');

    const prompt = `
다음 여행 정보를 바탕으로 한국어 여행 블로그 초안을 Markdown으로 작성해줘.

요구사항:
- 블로그 제목 후보 3개
- 본문 Markdown
- 장소별 소제목
- 자연스러운 여행 후기 톤
- 과장된 광고 문구 금지
- 사용자가 입력한 메모를 우선 반영

여행 제목: ${trip.title}
여행 지역: ${trip.region}
여행 기간: ${trip.start_date} ~ ${trip.end_date}
장소:
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
            content: '너는 담백하고 구체적인 한국어 여행 블로그 초안을 작성하는 작가다.'
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
    const contentMarkdown = data.output_text ?? extractOutputText(data) ?? fallbackDraft(trip, places).contentMarkdown;

    return jsonResponse({
      title: `${trip.title} 여행기`,
      contentMarkdown
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

function fallbackDraft(trip: TripInput, places: PlaceInput[]) {
  const sections = places
    .map((place) => `## ${place.name}

방문일: ${place.visit_date}
사진: ${place.photo_count}장

${place.user_memo || '사진과 동선을 기준으로 이 장소의 분위기를 더 적어보면 좋습니다.'}
`)
    .join('\n');

  return {
    title: `${trip.title} 여행기`,
    contentMarkdown: `## 블로그 제목 후보
1. ${trip.region}에서 보낸 ${trip.title}
2. 사진으로 정리한 ${trip.region} 여행
3. ${trip.title}: 장소별로 남긴 기록

# ${trip.title}

${trip.region}에서 ${trip.start_date}부터 ${trip.end_date}까지 보낸 여행 기록입니다. 사진의 촬영 시간과 위치를 기준으로 장소를 정리했습니다.

${sections}`
  };
}

function extractOutputText(data: any) {
  const content = data.output?.flatMap((item: any) => item.content ?? []) ?? [];
  return content
    .map((item: any) => item.text)
    .filter(Boolean)
    .join('\n')
    .trim();
}
