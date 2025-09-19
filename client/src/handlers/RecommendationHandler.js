import DBTable from './DatabaseHandler';
import apiClient from '../utils/apiClient.js';

// Initialize database handlers
const subjectTable = new DBTable(
  "preset_subjects",
  "_id",
  {
    _id: "",
    code: "",
    item: "",
    reqr: [0, 0, 0, 0, 0, 0]
  }
);

const programTable = new DBTable(
  "prog_data_2025",
  "_id",
  {
    _id: "",
    code: "",
    name_short: "",
    name_eng: "",
    name_chi: "",
    description: "",
    website: "",
    ability: [0, 0, 0, 0, 0, 0, 0, 0],
    area_like: Array(36).fill(0),
    area_disl: Array(36).fill(0)
  }
);

// Calculate the similarity score between two ability arrays
const calculateSimilarityScore = (userAbilities, targetAbilities) => {
  if (!userAbilities || !targetAbilities || !Array.isArray(userAbilities) || !Array.isArray(targetAbilities)) {
    return 0;
  }
  // Convert user's 6D abilities to match program's 8D abilities
  const userAbilities8D = [
    userAbilities[0], // Numerical
    userAbilities[1], // Logical
    userAbilities[2], // Graphical
    userAbilities[3], // Verbal
    userAbilities[4], // Memory
    userAbilities[5], // Creativity
    0, // Additional ability 1
    0  // Additional ability 2
  ];

  const squaredDifferences = targetAbilities.map((targetVal, index) => {
    return Math.max(0, targetVal - userAbilities8D[index]) ** 2;
  });
  const sumSquaredDifferences = squaredDifferences.reduce((acc, val) => acc + val, 0);
  return 100 - 5 * Math.sqrt(sumSquaredDifferences);
};

// Get top 5 subject recommendations
export const getSubjectRecommendations = async (userAbilities) => {
  try {
    const response = await apiClient.post('/api/database/readAll', { collection: 'preset_subjects' });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message}`);
    }

    const responseData = await response.json();
    const subjects = responseData.data || [];
    if (!subjects || !Array.isArray(subjects)) {
      // console.warn('No valid subjects data received');
      return [];
    }

    const recommendations = subjects
      .filter(subject => subject.item !== "Others" &&
        !['CHI', 'ENG', 'MAT'].includes(subject.code))
      .map(subject => ({
        name: subject.item,
        code: subject.code,
        score: calculateSimilarityScore(userAbilities, subject.reqr)
      }));

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  } catch (error) {
    console.error('Error getting subject recommendations:', error);
    return [];
  }
};

// Get top 5 program recommendations
export const getProgramRecommendations = async (userAbilities) => {
  try {
    const response = await apiClient.post('/api/database/readAll', { collection: 'prog_data_2025' });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message}`);
    }

    const responseData = await response.json();
    const programs = responseData.data || [];
    if (!programs || !Array.isArray(programs)) {
      // console.warn('No valid programs data received');
      return [];
    }

    const recommendations = programs.map(program => ({
      name: program.name_eng,
      code: program.code,
      university: program.name_short,
      faculty: program.name_chi,
      score: calculateSimilarityScore(userAbilities, program.ability),
      requirements: program.ability
    }));

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  } catch (error) {
    console.error('Error getting program recommendations:', error);
    return [];
  }
};

// Direct LLM communication for recommendations
const getLLMResponse = async (prompt) => {
  try {
    const response = await apiClient.post('/api/llm/generate', { prompt });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error getting LLM response:', error);
    throw error;
  }
};

// Generate recommendations based on user abilities
export const generateRecommendations = async (userData) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Get user's language preference
    const userLanguage = userData.preferred_language || 'en';

    // Create language-specific recommendation prompt
    let recommendationPrompt = '';
    switch (userLanguage) {
      case 'tc':
        recommendationPrompt = `Hi 愛迪生！我係${userData.Nickname || `${userData.Last_Name} ${userData.First_Name}`}，喺${userData.School_Name}讀緊中${userData.Form}。` +
          Object.entries({
            NumericalReasoning: userData.ability_6d[0],
            LogicalReasoning: userData.ability_6d[1],
            GraphicalReasoning: userData.ability_6d[2],
            VerbalReasoning: userData.ability_6d[3],
            Memory: userData.ability_6d[4],
            Creativity: userData.ability_6d[5]
          })
            .map(([key, value]) => `我嘅${key.replace(/([A-Z])/g, " $1").trim()}係${value}分（滿分5分）。`)
            .join("") +
          `我應該讀咩科？多謝！`;
        break;
      case 'sc':
        recommendationPrompt = `嗨！爱迪生！我是${userData.Nickname || `${userData.Last_Name} ${userData.First_Name}`}，在${userData.School_Name}读中${userData.Form}。` +
          Object.entries({
            NumericalReasoning: userData.ability_6d[0],
            LogicalReasoning: userData.ability_6d[1],
            GraphicalReasoning: userData.ability_6d[2],
            VerbalReasoning: userData.ability_6d[3],
            Memory: userData.ability_6d[4],
            Creativity: userData.ability_6d[5]
          })
            .map(([key, value]) => `我的${key.replace(/([A-Z])/g, " $1").trim()}是${value}分（满分5分）。`)
            .join("") +
          `我应该读什么科？谢谢！`;
        break;
      case 'en':
      default:
        recommendationPrompt = `Hi Eddy! I am ${userData.Nickname || `${userData.Last_Name} ${userData.First_Name}`} in ${userData.School_Name}, form ${userData.Form}. ` +
          Object.entries({
            NumericalReasoning: userData.ability_6d[0],
            LogicalReasoning: userData.ability_6d[1],
            GraphicalReasoning: userData.ability_6d[2],
            VerbalReasoning: userData.ability_6d[3],
            Memory: userData.ability_6d[4],
            Creativity: userData.ability_6d[5]
          })
            .map(([key, value]) => `My ${key.replace(/([A-Z])/g, " $1").trim()} is ${value} out of 5. `)
            .join("") +
          `What should I study for HKDSE? Thanks!`;
        break;
    }

    // Get the main recommendation text
    const textResponse = await apiClient.post('/api/chatbot/generate', {
      text: recommendationPrompt,
      language: userLanguage
    });

    if (!textResponse.ok) {
      throw new Error('Failed to get recommendation text');
    }

    const textData = await textResponse.json();
    if (!textData || !textData.content) {
      throw new Error('Invalid recommendation text data received');
    }

    const recommendationText = textData.content;

    // Get the title (short advice) with the recommendation text as context
    const titleResponse = await apiClient.post('/api/chatbot/generate', {
      text: `Based on this recommendation: "${recommendationText}"\n\nPlease give me just strictly one phrase -- within 5 words -- as a word of advice; no punctuations, and nothing more.`,
      language: userLanguage
    });

    if (!titleResponse.ok) {
      throw new Error('Failed to get recommendation title');
    }

    const titleData = await titleResponse.json();
    if (!titleData || !titleData.content) {
      throw new Error('Invalid recommendation title data received');
    }

    return {
      title: titleData.content,
      text: recommendationText
    };
  } catch (error) {
    console.error('Error generating recommendations:', error);
    throw error;
  }
}; 