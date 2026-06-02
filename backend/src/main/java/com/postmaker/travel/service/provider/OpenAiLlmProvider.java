package com.postmaker.travel.service.provider;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class OpenAiLlmProvider implements LlmProvider {
    private final String apiKey;
    private final String model;
    private final RestClient restClient;

    public OpenAiLlmProvider(@Value("${app.openai.api-key}") String apiKey, @Value("${app.openai.model}") String model) {
        this.apiKey = apiKey;
        this.model = model;
        this.restClient = RestClient.builder().baseUrl("https://api.openai.com").build();
    }

    @Override
    @SuppressWarnings("unchecked")
    public BlogDraftText generate(BlogPrompt prompt) {
        if (apiKey == null || apiKey.isBlank()) {
            return fallbackDraft(prompt);
        }
        String placeText = prompt.places().stream()
                .map(p -> "- %s / %s / 사진 %d장 / 메모: %s".formatted(p.visitDate(), p.name(), p.photoCount(), p.userMemo()))
                .collect(Collectors.joining("\n"));
        String userPrompt = """
                다음 여행 정보를 바탕으로 블로그 초안을 Markdown으로 작성해줘.
                제목 후보 3개를 먼저 제시하고, 이어서 자연스러운 여행 후기 본문을 작성해.
                과장된 광고 문구는 피하고, 사용자 메모를 우선 반영해.

                여행: %s
                지역: %s
                기간: %s ~ %s
                장소:
                %s
                """.formatted(prompt.tripTitle(), prompt.region(), prompt.startDate(), prompt.endDate(), placeText);
        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", "너는 담백한 여행 블로그 초안을 작성하는 한국어 작가다."),
                        Map.of("role", "user", "content", userPrompt)));
        Map<String, Object> response = restClient.post()
                .uri("/v1/chat/completions")
                .header("Authorization", "Bearer " + apiKey)
                .body(body)
                .retrieve()
                .body(Map.class);
        List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        String markdown = (String) message.get("content");
        return new BlogDraftText(prompt.tripTitle() + " 여행기", markdown);
    }

    private BlogDraftText fallbackDraft(BlogPrompt prompt) {
        String titleCandidates = """
                ## 블로그 제목 후보
                1. %s에서 보낸 %s 여행
                2. %s 여행 기록: 장소별로 남긴 하루
                3. 사진으로 정리한 %s 여행 코스
                """.formatted(prompt.region(), prompt.tripTitle(), prompt.region(), prompt.region());
        String sections = prompt.places().stream()
                .map(p -> """
                        ## %s
                        방문일: %s
                        사진 %d장을 보며 이 장소에서의 시간을 정리했다.
                        %s
                        """.formatted(p.name(), p.visitDate(), p.photoCount(),
                        p.userMemo() == null || p.userMemo().isBlank() ? "아직 메모가 없어 사진 분위기를 중심으로 초안을 다듬으면 좋다." : p.userMemo()))
                .collect(Collectors.joining("\n"));
        String markdown = """
                %s
                # %s

                %s에서 %s부터 %s까지 다녀온 여행 기록이다. 사진의 촬영 날짜와 위치를 기준으로 주요 장소를 정리했다.

                %s
                """.formatted(titleCandidates, prompt.tripTitle(), prompt.region(), prompt.startDate(), prompt.endDate(), sections);
        return new BlogDraftText(prompt.tripTitle() + " 여행기", markdown);
    }
}
