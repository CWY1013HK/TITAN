import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const TestResultsSection = ({
    data,
    isCreatingChat,
    isRegenerating,
    setCreatingChat,
    handleRegenerateRecommendation,
    getChatMessages,
    currentUser
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const handleChatWithEddy = async () => {
        try {
            setCreatingChat(true);
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const chatMessages = getChatMessages(data.career.title, data.career.text);

            // Create a new chat
            const chatResponse = await fetch('/api/chat/create', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    User_ID: currentUser.User_ID,
                    initial_message: chatMessages.initialMessage
                })
            });

            if (!chatResponse.ok) {
                throw new Error('Failed to create chat');
            }

            const chatData = await chatResponse.json();

            // Generate initial response from chatbot
            const messageResponse = await fetch(`/api/chat/${chatData.Chat_ID}/message`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    Text: chatMessages.responsePrompt,
                    reference_analysis_id: null
                })
            });

            if (!messageResponse.ok) {
                throw new Error('Failed to get chatbot response');
            }

            navigate('/eddy', { state: { chatId: chatData.Chat_ID } });
        } catch (error) {
            console.error('Error creating chat:', error);
            alert('Failed to start chat. Please try again.');
        } finally {
            setCreatingChat(false);
        }
    };

    return (
        <div className="p-6 rounded-lg">
            <div className="flex flex-col lg:flex-row gap-6">
                <div className="w-full lg:w-1/2">
                    <h3 className="text-xl font-bold mb-6">{t('report.yourAbilityScores')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {Object.entries(data.abilities).map(([key, value]) => (
                            <div key={key} className="bg-white rounded-lg shadow-sm p-6">
                                <h4 className="font-semibold text-gray-800">
                                    {key === 'NumericalReasoning' ? t('report.numericalReasoning') :
                                        key === 'LogicalReasoning' ? t('report.logicalReasoning') :
                                            key === 'GraphicalReasoning' ? t('report.graphicalReasoning') :
                                                key === 'VerbalReasoning' ? t('report.verbalReasoning') :
                                                    key === 'Memory' ? t('report.memory') :
                                                        key === 'Creativity' ? t('report.creativity') :
                                                            key.replace(/([A-Z])/g, " $1").trim()}
                                </h4>
                                <div className="mt-2">
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div
                                            className="bg-blue-600 h-2.5 rounded-full"
                                            style={{ width: `${(value / 5) * 100}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">{value}/5</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-full lg:w-1/2">
                    <h3 className="text-xl font-bold mb-6">{t('report.eddysRecommendation')}</h3>
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h4 className="font-semibold text-gray-800 mb-2">{data.career.title}</h4>
                        <p className="text-gray-600 mb-4">{data.career.text}</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={handleChatWithEddy}
                                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                                disabled={isCreatingChat}
                            >
                                {isCreatingChat ? t('report.creatingChat') : t('report.chatWithEddy')}
                            </button>
                            <button
                                onClick={handleRegenerateRecommendation}
                                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                                disabled={isRegenerating}
                            >
                                {isRegenerating ? t('report.regeneratingRecommendation') : t('report.regenerateRecommendation')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recommendations Section */}
            <div className="mt-12">
                <h3 className="text-xl font-bold mb-6">{t('report.recommendedSubjects')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {data.recommendations.subjects.map((subject, index) => (
                        <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                            <h4 className="font-semibold text-gray-800">{subject.name}</h4>
                            <div className="mt-2">
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div
                                        className="bg-green-600 h-2.5 rounded-full"
                                        style={{ width: `${subject.score}%` }}
                                    ></div>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">{Math.round(subject.score)}% {t('report.match')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-12">
                <h3 className="text-xl font-bold mb-6">{t('report.recommendedProgrammes')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {data.recommendations.programs.map((program, index) => (
                        <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                            <h4 className="font-semibold text-gray-800">{program.name}</h4>
                            <p className="text-sm text-gray-600">{program.university}</p>
                            <p className="text-sm text-gray-500">{program.faculty}</p>
                            <div className="mt-2">
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div
                                        className="bg-blue-600 h-2.5 rounded-full"
                                        style={{ width: `${program.score}%` }}
                                    ></div>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">{Math.round(program.score)}% {t('report.match')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TestResultsSection; 