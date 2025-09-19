import express from 'express';
import axios from 'axios';
const router = express.Router();

// Sample chatbot route, input {text, language}, return {content}
router.post('/chatbot/generate', async (req, res) => {
  const url = "https://api.fireworks.ai/inference/v1/chat/completions";
  const { text, language = 'en' } = req.body;

  // Language-specific instructions
  let languageInstruction = '';
  switch (language) {
    case 'tc':
      languageInstruction = 'Please respond in vernacular Cantonese (廣東話/粵語). Use natural, conversational Cantonese that Hong Kong students would use. Feel free to use Cantonese expressions and phrases. Refer to yourself as 愛迪生 instead of Eddy.';
      break;
    case 'sc':
      languageInstruction = 'Please respond in Simplified Chinese (简体中文). Use clear, natural Chinese that mainland Chinese students would understand. Refer to yourself as 爱迪生 instead of Eddy.';
      break;
    case 'en':
    default:
      languageInstruction = 'Please respond in English.';
      break;
  }

  const payload = {
    model: "accounts/fireworks/models/llama-v3p3-70b-instruct",
    messages: [
      {
        role: "system",
        content: `You are a secondary school career consultant, Eddy. ${languageInstruction} Please answer student question briefly.`
      },
      {
        role: "user",
        content: text
      }
    ]
  };
  const headers = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Authorization": "Bearer fw_3ZcXEuXj75H9tozkM3zciTLc"
  };
  try {
    const response = await axios.post(url, payload, { headers });
    const content = response.data.choices[0].message.content;
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: 'Request to Fireworks API failed', details: error.message });
  }
});

export let chatbotRoutes = router;