import React, { useEffect, useState, useCallback } from "react";
import { sendnsee, getAvailableAnalyses } from "../handlers/ChatbotHandler.js";
import { useNavigate } from "react-router-dom";
import { FaUserGraduate, FaHistory, FaFileAlt, FaTrash, FaPlus } from 'react-icons/fa';
import { renderMarkdown } from '../handlers/MarkdownHandler';
import { Popover } from '@headlessui/react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/blocks/LoadingSpinner';
import apiClient from '../utils/apiClient.js';

function Chatbot() {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, loading } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [showAnalyses, setShowAnalyses] = useState(false);
  const [availableAnalyses, setAvailableAnalyses] = useState([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [showAnalysisPopup, setShowAnalysisPopup] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detailed, setDetailed] = useState(false);
  const [isInitializingChat, setIsInitializingChat] = useState(false);
  const { t, i18n } = useTranslation();

  // Get language-specific initial messages
  const getInitialMessage = () => {
    const currentLanguage = i18n.language || 'en';
    switch (currentLanguage) {
      case 'tc':
        return "Hi 愛迪生，請幫我分析我嘅人生軌跡！";
      case 'sc':
        return "嗨！爱迪生，请帮我分析我的人生轨迹！";
      case 'en':
      default:
        return "Hi Eddy, please analyse my life trajectory!";
    }
  };

  const initializeChat = async () => {
    try {
      setIsInitializingChat(true);
      if (!currentUser || !currentUser.User_ID) {
        console.error('No user data available');
        navigate('/login');
        return;
      }

      // Load all chats
      const chatsResponse = await apiClient.get(`/api/chat/user/${currentUser.User_ID}`);

      if (!chatsResponse.ok) {
        const errorData = await chatsResponse.json();
        throw new Error(errorData.message || 'Failed to fetch chat history');
      }

      const chats = await chatsResponse.json();
      const sortedChats = chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      setChatHistory(sortedChats);

      if (sortedChats.length > 0) {
        // Set the latest chat as active
        const latestChat = sortedChats[0];
        setActiveChatId(latestChat.Chat_ID);
        await loadChatHistory(latestChat.Chat_ID);
      } else {
        // Create a new chat if none exist
        const initialMessage = localStorage.getItem('initialChatMessage');
        if (initialMessage) {
          await createNewChat(initialMessage);
          localStorage.removeItem('initialChatMessage');
        } else {
          await createNewChat(getInitialMessage());
        }
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      alert(error.message || 'An error occurred while initializing the chat. Please try again.');
      navigate('/login');
    } finally {
      setIsInitializingChat(false);
    }
  };

  // Initialize chat when user is authenticated
  useEffect(() => {
    if (currentUser && isAuthenticated) {
      initializeChat();
    }
  }, [currentUser, isAuthenticated]);

  const createNewChat = async (message) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const chatResponse = await apiClient.post('/api/chat/create', {
        User_ID: currentUser.User_ID,
        initial_message: message
      });

      if (!chatResponse.ok) {
        const errorData = await chatResponse.json();
        throw new Error(errorData.message || 'Failed to create chat');
      }

      const chatData = await chatResponse.json();
      setActiveChatId(chatData.Chat_ID);
      await loadChatHistory(chatData.Chat_ID);
      return chatData;
    } catch (error) {
      console.error('Error creating chat:', error);
      alert(error.message || 'Failed to start chat. Please try again.');
      return null;
    }
  };

  const loadAllChats = async () => {
    if (!currentUser?.User_ID) return [];

    try {
      const response = await apiClient.get(`/api/chat/user/${currentUser.User_ID}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch chat history');
      }

      const chats = await response.json();
      const sortedChats = chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      setChatHistory(sortedChats);
      return sortedChats;
    } catch (error) {
      console.error('Error loading chat history:', error);
      alert(error.message || 'Failed to load chat history. Please try again.');
      setChatHistory([]);
      return [];
    }
  };

  // Load available analyses when chat changes
  useEffect(() => {
    // console.log('Active chat changed:', activeChatId);
    if (activeChatId) {
      loadAvailableAnalyses(activeChatId);
    } else {
      // console.log('No active chat ID, clearing analyses');
      setAvailableAnalyses([]);
    }
  }, [activeChatId]);

  // Add effect to load analyses when drawer is opened
  useEffect(() => {
    if (showAnalyses && currentUser) {
      // console.log('Drawer opened, loading analyses for user:', currentUser.User_ID);
      loadUserAnalyses();
    }
  }, [showAnalyses, currentUser]);

  const loadUserAnalyses = async () => {
    try {
      // console.log('Loading user analyses');
      const response = await apiClient.get('/api/auth/me');

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await response.json();
      // console.log('User data with analyses:', userData);

      if (userData.trajectory_analyses && userData.trajectory_analyses.length > 0) {
        const formattedAnalyses = userData.trajectory_analyses.map(analysis => ({
          id: analysis.id,
          timestamp: new Date(analysis.timestamp),
          content: analysis.content
        }));
        setAvailableAnalyses(formattedAnalyses);
      } else {
        setAvailableAnalyses([]);
      }
    } catch (error) {
      console.error('Error loading user analyses:', error);
      setAvailableAnalyses([]);
    }
  };

  const loadAvailableAnalyses = async (chatId) => {
    try {
      // console.log('Loading analyses for chat:', chatId);
      if (!chatId) {
        // If no active chat, try to load the latest chat
        const chats = await loadAllChats();
        if (chats && chats.length > 0) {
          const latestChat = chats[0];
          setActiveChatId(latestChat.Chat_ID);
          await loadChatHistory(latestChat.Chat_ID);
          const analyses = await getAvailableAnalyses(latestChat.Chat_ID);
          setAvailableAnalyses(analyses || []);
          return;
        }
        // console.log('No chats available');
        setAvailableAnalyses([]);
        return;
      }
      const analyses = await getAvailableAnalyses(chatId);
      // console.log('Received analyses:', analyses);
      setAvailableAnalyses(analyses || []);
    } catch (error) {
      console.error('Error loading analyses:', error);
      setAvailableAnalyses([]);
    }
  };

  const loadChatHistory = async (chatId) => {
    try {
      const response = await apiClient.get(`/api/chat/${chatId}`);

      if (response.ok) {
        const chatData = await response.json();
        const formattedMessages = chatData.Messages.map(msg => ({
          text: msg.Text,
          isBot: msg.Is_Bot
        }));
        setMessages(formattedMessages);
        setActiveChatId(chatId);
        localStorage.setItem('activeChatId', chatId);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      setMessages([]);
    }
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading || !currentUser?.User_ID || !activeChatId) {
      // console.log('Cannot send message:', { input, isLoading, userId: currentUser?.User_ID, activeChatId }); // Debug log
      return;
    }

    setIsLoading(true);
    const userMessage = { text: input, isBot: false };
    setMessages(prev => [...prev, userMessage]);

    try {
      // console.log('Sending message with analysis:', selectedAnalysis); // Debug log
      const response = await sendnsee(input, activeChatId, selectedAnalysis, detailed);
      setInput("");
      setMessages(prev => [...prev, { text: response, isBot: true }]);
      // Refresh chat list after sending message
      loadAllChats();
      // Clear selected analysis after sending
      setSelectedAnalysis(null);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        text: "Sorry, there was an error processing your message. Please try again.",
        isBot: true
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, selectedAnalysis, currentUser, activeChatId, detailed]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleAnalysisSelect = async (analysis) => {
    try {
      // console.log('Analysis selected:', analysis);

      // If no active chat, create a new one
      if (!activeChatId) {
        // console.log('No active chat, creating new chat with analysis');
        const response = await apiClient.post('/api/chat/create', {
          User_ID: currentUser.User_ID,
          initial_analysis_id: analysis.id
        });

        if (!response.ok) {
          throw new Error('Failed to create chat');
        }

        const chatData = await response.json();
        setActiveChatId(chatData.Chat_ID);
        localStorage.setItem('activeChatId', chatData.Chat_ID);

        // Set the selected analysis
        setSelectedAnalysis(analysis.id);
        setShowAnalyses(false);

        // Load the new chat's messages
        loadChatHistory(chatData.Chat_ID);
      } else {
        // If there's an active chat, just set the analysis for the next message
        setSelectedAnalysis(analysis.id);
        setShowAnalyses(false);
      }
    } catch (error) {
      console.error('Error handling analysis selection:', error);
      alert('Failed to start conversation with analysis. Please try again.');
    }
  };

  const handleDeleteChat = async (chatId) => {
    try {
      const response = await apiClient.post('/api/database/delete', {
        collection: 'CHAT',
        ID: 'Chat_ID',
        rowID: chatId
      });

      if (response.ok) {
        // If the deleted chat was active, clear it
        if (activeChatId === chatId) {
          setActiveChatId(null);
          setMessages([]);
        }

        // Reload chat history and set the latest chat as active
        const updatedChats = await loadAllChats();
        if (updatedChats && updatedChats.length > 0) {
          const latestChat = updatedChats[0];
          setActiveChatId(latestChat.Chat_ID);
          await loadChatHistory(latestChat.Chat_ID);
        } else {
          // If no chats left, create a new one
          await createNewChat(getInitialMessage());
        }
      } else {
        throw new Error('Failed to delete chat');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      alert('Failed to delete chat. Please try again.');
    }
  };

  const handleDeleteAnalysis = async (analysisId) => {
    try {
      if (!currentUser?.User_ID) {
        throw new Error("No user data found");
      }

      const updatedAnalyses = availableAnalyses.filter(analysis => analysis.id !== analysisId);

      const response = await apiClient.patch('/api/auth/me', {
        trajectory_analyses: updatedAnalyses
      });

      if (!response.ok) {
        throw new Error('Failed to delete analysis');
      }

      setAvailableAnalyses(updatedAnalyses);
      if (selectedAnalysis === analysisId) {
        setSelectedAnalysis(null);
      }
    } catch (error) {
      console.error('Error deleting analysis:', error);
      alert('Failed to delete analysis. Please try again.');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 relative">
      {/* Show loading state while auth is being checked */}
      {loading && (
        <div className="flex items-center justify-center h-full">
          <div className="text-lg">Loading...</div>
        </div>
      )}

      {/* Show login prompt if not authenticated */}
      {!loading && !isAuthenticated && (
        <div className="flex items-center justify-center h-full">
          <div className="text-lg">Please log in to access the chatbot.</div>
        </div>
      )}

      {/* Show chat interface if authenticated */}
      {!loading && isAuthenticated && (
        <>
          {/* Loading Pane */}
          {isInitializingChat && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="flex flex-col items-center">
                  <LoadingSpinner size="large" className="mb-4" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{t('chatbot.initializingChat')}</h3>
                  <p className="text-gray-600 text-center">{t('common.pleaseWait')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Chat History Drawer */}
          <div className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${showHistory ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setShowHistory(false)}>
          </div>

          <div className={`fixed left-0 top-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 z-50 ${showHistory ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">{t('chatbot.chatHistory')}</h2>
            </div>
            <div className="overflow-y-auto h-[calc(100%-8rem)]">
              {chatHistory.length === 0 ? (
                <p className="p-4 text-gray-500 text-center">{t('common.noChatHistoryAvailable')}</p>
              ) : (
                chatHistory.map((chat) => (
                  <div
                    key={chat.Chat_ID}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${activeChatId === chat.Chat_ID ? 'bg-blue-50' : ''}`}
                    onClick={() => {
                      loadChatHistory(chat.Chat_ID);
                      setShowHistory(false);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-sm font-medium truncate max-w-[180px]">
                          {chat.Messages[0]?.Text?.length > 22 ? chat.Messages[0]?.Text.substring(0, 22) + '...' : chat.Messages[0]?.Text || 'New Chat'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(chat.updatedAt)}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Are you sure you want to delete this chat?')) {
                            handleDeleteChat(chat.Chat_ID);
                          }
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                        title={t('common.deleteChat')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t">
              <button
                onClick={() => {
                  createNewChat(getInitialMessage());
                  setShowHistory(false);
                }}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors duration-200"
              >
                {t('chatbot.addNewChat')}
              </button>
            </div>
          </div>

          {/* Analyses Drawer */}
          <div className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${showAnalyses ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setShowAnalyses(false)}>
          </div>

          <div className={`fixed left-0 top-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 z-50 ${showAnalyses ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">{t('chatbot.availableAnalyses')}</h2>
            </div>
            <div className="overflow-y-auto h-[calc(100%-12rem)]">
              {availableAnalyses.length === 0 ? (
                <p className="p-4 text-gray-500 text-center">{t('common.noAnalysesAvailable')}</p>
              ) : (
                availableAnalyses.map((analysis) => (
                  <div
                    key={analysis.id}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${selectedAnalysis === analysis.id ? 'bg-blue-50' : ''}`}
                    onClick={() => handleAnalysisSelect(analysis)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {formatDate(analysis.timestamp)}
                        </div>
                        <div className="text-xs text-gray-500 max-w-[180px]">
                          {analysis.content.split('\n').slice(0, 3).map((line, index) => (
                            <p key={index} className="truncate">
                              {line.length > 30 ? line.substring(0, 30) + '...' : line}
                            </p>
                          ))}
                          {analysis.content.split('\n').length > 3 && (
                            <p className="text-blue-500 mt-1">Click to attach full analysis...</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Are you sure you want to delete this analysis?')) {
                            handleDeleteAnalysis(analysis.id);
                          }
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                        title={t('common.deleteAnalysis')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t space-y-2">
              <button
                onClick={() => {
                  navigate('/trajectory');
                  setShowAnalyses(false);
                }}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors duration-200"
              >
                {t('chatbot.myTrajectories')}
              </button>
            </div>
          </div>

          {/* Analysis Popup */}
          {showAnalysisPopup && currentAnalysis && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 50 }}>
              <div className="bg-white p-6 rounded-lg shadow-lg w-3/4 max-h-[80vh] flex flex-col">
                <h3 className="text-lg font-semibold mb-4">
                  Analysis from {formatDate(currentAnalysis.timestamp)}
                </h3>
                <div className="flex-1 overflow-y-auto mb-4">
                  <div className="prose max-w-none">
                    {currentAnalysis.content.split('\n\n').map((section, sectionIndex) => {
                      const lines = section.split('\n');
                      const heading = lines[0];
                      const content = lines.slice(1).join('\n');

                      return (
                        <div key={sectionIndex} className="mb-4">
                          <h4 className="text-lg font-medium text-gray-900 mb-2">{heading}</h4>
                          <p className="text-gray-700 whitespace-pre-wrap">{content}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      if (!activeChatId) {
                        handleAnalysisSelect(currentAnalysis);
                      } else {
                        setSelectedAnalysis(currentAnalysis.id);
                        setShowAnalysisPopup(false);
                      }
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    {!activeChatId ? t('common.startNewChat') : t('common.useInCurrentChat')}
                  </button>
                  <button
                    onClick={() => {
                      localStorage.setItem('initialChatMessage', `I'd like to discuss this analysis:\n\n${currentAnalysis.content}`);
                      window.location.reload();
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    {t('chatbot.askEddy')}
                  </button>
                  <button
                    onClick={() => {
                      setShowAnalysisPopup(false);
                      setCurrentAnalysis(null);
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    {t('common.close')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Chat Area */}
          <div className="flex-1 p-4 overflow-y-auto mb-16">
            <div className="max-w-2xl mx-auto space-y-2">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.isBot ? "justify-start" : "justify-end"
                    }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${message.isBot ? "bg-white shadow-md" : "bg-blue-500 text-white"
                      }`}
                  >
                    {message.isBot && (
                      <div className="flex items-center mb-1">
                        <FaUserGraduate className="mr-2 text-blue-500" size={20} />
                        <span className="text-sm font-medium text-gray-500">{t('chatbot.eddy')}</span>
                      </div>
                    )}
                    <div className="prose max-w-none">
                      {renderMarkdown(message.text, {
                        isBot: message.isBot,
                        toggleDarkHeader: !message.isBot,
                        showFullContent: true
                      })}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-lg p-3 shadow-md max-w-[70%]">
                    <div className="flex items-center mb-1">
                      <FaUserGraduate className="mr-2 text-blue-500" size={20} />
                      <span className="text-sm font-medium text-gray-500">{t('chatbot.eddy')}</span>
                    </div>
                    <div className="text-gray-700">{t('chatbot.thinking')}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
            <div className="max-w-2xl mx-auto flex gap-2">
              <div className="relative group">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="bg-gray-200 text-gray-700 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-300 transition-colors duration-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-sm text-white bg-gray-900 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                  {t('common.chatHistory')}
                </div>
              </div>

              <div className="relative group">
                <button
                  onClick={() => setShowAnalyses(!showAnalyses)}
                  className={`rounded-full w-10 h-10 flex items-center justify-center transition-colors duration-200 ${selectedAnalysis ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-sm text-white bg-gray-900 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                  {t('common.availableAnalyses')}
                </div>
              </div>

              <input
                type="text"
                name="message"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                className="flex-1 rounded-full px-4 py-2 border focus:outline-none focus:border-blue-500"
                placeholder={t('common.typeMessage')}
                disabled={isLoading}
              />

              <div className="relative group">
                <button
                  onClick={() => setDetailed(!detailed)}
                  className={`rounded-full w-10 h-10 flex items-center justify-center transition-colors duration-200 ${detailed ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 100 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-sm text-white bg-gray-900 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                  {detailed ? t('common.switchToBriefResponses') : t('common.switchToDetailedResponses')}
                </div>
              </div>

              <div className="relative group">
                <button
                  onClick={handleSend}
                  disabled={isLoading}
                  className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-blue-600 transition-colors duration-200 disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-sm text-white bg-gray-900 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                  {t('common.sendMessage')}
                </div>
              </div>
            </div>
            {selectedAnalysis && (
              <div className="max-w-2xl mx-auto mt-2 text-sm text-gray-600">
                Referencing analysis from {formatDate(availableAnalyses.find(a => a.id === selectedAnalysis)?.timestamp)}
                <button
                  onClick={() => setSelectedAnalysis(null)}
                  className="ml-2 text-blue-500 hover:text-blue-700"
                >
                  {t('common.clear')}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Chatbot;





