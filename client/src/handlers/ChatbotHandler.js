import apiClient from '../utils/apiClient.js';

export const sendnsee = async (message, chatId, reference_analysis_id = null, detailed = false) => {
    try {
        // console.log('Sending message to chat:', chatId, 'with analysis:', reference_analysis_id, 'detailed:', detailed);

        const response = await apiClient.post(`/api/chat/${chatId}/message`, {
            Text: message,
            reference_analysis_id: reference_analysis_id,
            detailed: detailed
        });

        const data = await response.json();
        // console.log('Received response:', data);
        return data.Messages[data.Messages.length - 1].Text;
    } catch (error) {
        console.error('Error in sendnsee:', error);
        throw error;
    }
};

// Function to get available analyses for a chat
export const getAvailableAnalyses = async (chatId) => {
    try {
        // console.log('Fetching analyses for chat:', chatId);
        const response = await apiClient.get(`/api/chat/${chatId}/analyses`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        // console.log('Received analyses:', data);
        return data;
    } catch (error) {
        console.error('Error fetching analyses:', error);
        throw error;
    }
};

/*async function fr (inputmsg) {
  // POST request using fetch with async/await
  const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: inputmsg
  };
  try {
    const response = await fetch('api/chatbot/test', requestOptions).then(console.log("Connected!")).catch(error => {
        this.setState({ errorMessage: error.toString() });
        console.error('There was an error!', error);
    });
    const data = await response.json();
    // console.log(data.body);
    // console.log("Welp");
    if (response.ok) return data.body;
    else return "Sorry, our service is temporarily unavailable :(";
  } catch (err) {
    console.log("Welp");
    return "Sorry, our service is temporarily unavailable :(";
  }
}*/