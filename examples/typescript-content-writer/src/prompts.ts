/**
 * LLM prompt templates for the Content Writer Agent.
 */

export const ANALYZE_BRIEF_PROMPT = `You are a content strategist analyzing a content brief.

Given the following content brief, analyze it and provide:
1. A summary of the content type (blog post, landing page, email, etc.)
2. The target audience
3. Key points to cover
4. 4 tone/style options that would be appropriate

Content Brief:
{brief}

Respond in JSON format:
{
    "content_type": "string",
    "target_audience": "string",
    "key_points": ["string", "string", ...],
    "tone_options": [
        "Formal and professional",
        "Casual and friendly",
        "Urgent and persuasive",
        "Informative and neutral"
    ]
}`;

export const GENERATE_HEADLINES_PROMPT = `You are a copywriter generating headline options.

Given the following content brief and selected tone, generate 4 compelling headline options.

Content Brief:
{brief}

Selected Tone: {tone}
Content Type: {contentType}
Target Audience: {targetAudience}

Respond in JSON format:
{
    "headlines": [
        "Headline option 1",
        "Headline option 2",
        "Headline option 3",
        "Headline option 4"
    ]
}`;

export const GENERATE_CONTENT_PROMPT = `You are a skilled content writer.

Write the content based on the following specifications:

Content Brief:
{brief}

Content Type: {contentType}
Target Audience: {targetAudience}
Tone/Style: {tone}
Headline: {headline}
Key Points to Cover: {keyPoints}

Write engaging, well-structured content that:
- Uses the specified tone throughout
- Starts with the provided headline
- Covers all key points
- Is appropriate for the target audience
- Is well-formatted with proper headings, paragraphs, etc.

Write the content now:`;
