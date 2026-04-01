/**
 * ShekarAI - Script Generator
 * Uses OpenAI GPT to generate a structured Hindi short film script
 */
const OpenAI = require('openai');
const config = require('../../config/config');
const logger = require('../../config/logger');

const openai = new OpenAI({ apiKey: config.openai.apiKey });

/**
 * Script format returned:
 * {
 *   title: "...",
 *   genre: "...",
 *   totalDurationSec: 600,
 *   scenes: [
 *     {
 *       sceneNumber: 1,
 *       durationSec: 75,
 *       setting: "गाँव का छोटा घर",
 *       characters: ["राहुल", "माँ"],
 *       narration: "...",      // Hindi narrator text
 *       dialogue: [            // Optional dialogues
 *         { character: "राहुल", text: "माँ, मैं एक दिन बड़ा आदमी बनूँगा।" }
 *       ],
 *       mood: "emotional",
 *       visualDescription: "..."  // For image generation
 *     }
 *   ]
 * }
 */
class ScriptGenerator {
  async generate(topic) {
    logger.info(`Generating script for topic: "${topic}"`);

    const systemPrompt = `तुम एक Hindi short film scriptwriter हो।
तुम्हें 10-minute (600 seconds) की एक complete short film script बनानी है।
Script में 8 scenes होनी चाहिए, हर scene ~75 seconds की।
Output STRICTLY valid JSON में होना चाहिए — नीचे दिए format में।

JSON FORMAT:
{
  "title": "फिल्म का नाम",
  "genre": "Drama/Motivational/Emotional",
  "totalDurationSec": 600,
  "scenes": [
    {
      "sceneNumber": 1,
      "durationSec": 75,
      "setting": "location description in Hindi",
      "characters": ["character names"],
      "narration": "Hindi narrator text for voiceover (3-5 sentences)",
      "dialogue": [
        { "character": "name", "text": "dialogue in Hindi" }
      ],
      "mood": "emotional/happy/sad/tense/motivational",
      "visualDescription": "What the scene looks like for image generation (English, detailed)"
    }
  ]
}

Rules:
- सभी narration और dialogue Hindi में होने चाहिए
- visualDescription English में हो (image generation के लिए)
- हर scene emotionally engaging हो
- Total 8 scenes, total ~600 seconds
- JSON के अलावा कुछ भी मत लिखो`;

    const userPrompt = `Topic: "${topic}" पर एक 10-minute Hindi short film script बनाओ।`;

    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: config.openai.maxTokens,
      temperature: 0.8,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0].message.content;
    let script;
    try {
      script = JSON.parse(raw);
    } catch (e) {
      logger.error('Script JSON parse failed — using fallback script');
      script = this._fallbackScript(topic);
    }

    // Validate structure
    if (!script.scenes || !Array.isArray(script.scenes) || script.scenes.length === 0) {
      logger.warn('Script missing scenes — using fallback');
      script = this._fallbackScript(topic);
    }

    logger.info(`Script ready | title="${script.title}" | scenes=${script.scenes.length}`);
    return script;
  }

  /** Fallback if OpenAI fails or key not set */
  _fallbackScript(topic) {
    return {
      title: topic,
      genre: 'Motivational',
      totalDurationSec: 600,
      scenes: Array.from({ length: 8 }, (_, i) => ({
        sceneNumber: i + 1,
        durationSec: 75,
        setting: 'एक छोटे गाँव में',
        characters: ['नायक'],
        narration: `यह कहानी एक साहसी व्यक्ति की है जिसने जीवन में कभी हार नहीं मानी। Scene ${i + 1}.`,
        dialogue: [],
        mood: 'motivational',
        visualDescription: `Scene ${i + 1}: A determined young person in a rural Indian village, cinematic lighting, warm tones, 35mm film look`,
      })),
    };
  }
}

module.exports = new ScriptGenerator();
