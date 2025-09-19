import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import DBTable from "../handlers/DatabaseHandler";
import { getSubjectRecommendations, getProgramRecommendations, generateRecommendations } from '../handlers/RecommendationHandler';
import { FaHome, FaUser, FaCog } from 'react-icons/fa';
import { useAuth, isPresenter } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/blocks/LoadingSpinner';
import { createPortal } from 'react-dom';
import useLoadingScrollReset from '../hooks/useLoadingScrollReset';
import TestResultsSection from '../components/widgets/TestResultsSection';
import JupasProgrammesSection from '../components/widgets/JupasProgrammesSection';

function ViewReport() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isLoading, setLoading] = useState(true);
  const [isCreatingChat, setCreatingChat] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const mountedRef = useRef(true);
  const timeoutRef = useRef(null);
  const loadingRef = useRef(false); // Use ref to track loading state without causing re-renders
  const retryCountRef = useRef(0); // Track retry attempts

  // JUPAS section state
  const [jupasProgrammes, setJupasProgrammes] = useState([]);
  const [isLoadingJupas, setIsLoadingJupas] = useState(false);

  // Classification state
  const [programmeClassifications, setProgrammeClassifications] = useState({});
  const [isLoadingClassifications, setIsLoadingClassifications] = useState(false);

  const [data, setData] = useState({
    profile: {
      image: "/asset/images/student.jpg",
      name: "",
      school: "",
      sex: "",
      curriculum: "HKDSE",
      form: "",
      title: "",
      email: "",
      tel: "",
      userRole: "",
      role: ""
    },
    abilities: {
      NumericalReasoning: 0,
      LogicalReasoning: 0,
      GraphicalReasoning: 0,
      VerbalReasoning: 0,
      Memory: 0,
      Creativity: 0
    },
    career: {
      title: "",
      text: "",
      needsRegeneration: true
    },
    recommendations: {
      subjects: [],
      programs: []
    }
  });

  const { t, i18n } = useTranslation();

  const userTable = new DBTable(
    "USER",
    "User_ID",
    {
      User_ID: "",
      First_Name: "",
      Last_Name: "",
      Nickname: "",
      Title: "",
      Gender: "",
      Email_Address: "",
      Tel: "",
      User_Role: "",
      School_Name: "",
      Form: "",
      direct_marketing: false,
      email_list: false,
      card_id: "",
      ability_6d: [1.5, 1.5, 1.5, 1.5, 1.5, 1.5],
      eddy_recommendation_title: "",
      eddy_recommendation_text: "",
      needs_recommendation_regeneration: true
    }
  );

  // Helper function to get duration number from duration string
  const getDurationNumber = (durationString) => {
    if (!durationString) return null;
    const match = durationString.match(/(\d+)/);
    return match ? match[1] : null;
  };

  // Helper function to get institution key
  const getInstitutionKey = (institutionName) => {
    if (!institutionName) return 'unknown';
    return institutionName.toLowerCase().replace(/\s+/g, '');
  };

  // Helper function to convert backend DSE scores to classification API format
  const convertBackendScoresToClassificationFormat = (backendScores) => {
    const convertedScores = {};

    // Map full subject names to short codes
    const subjectMapping = {
      "Chinese Language": "CHI",
      "English Language": "ENG",
      "Mathematics Compulsory Part": "MAT",
      "Core Subject Code": "CSD",
      "Core Score": "CSD"
    };

    Object.entries(backendScores).forEach(([subjectKey, score]) => {
      if (subjectKey && score) {
        // Check if this is a subject code (new format) or subject name (old format)
        let subjectCode = subjectKey;

        // If it looks like a subject name, try to convert it to a code
        if (subjectKey.length > 3 && !subjectKey.includes('_')) {
          // This might be a subject name, try to get the code
          subjectCode = subjectMapping[subjectKey] || subjectKey;
        }

        convertedScores[subjectCode] = score;
      }
    });

    return convertedScores;
  };

  // Function to get classification color
  const getClassificationColor = (classification) => {
    switch (classification) {
      case 8: return 'bg-green-100 text-green-800 border-green-200'; // Secure
      case 7: return 'bg-green-50 text-green-700 border-green-200'; // Very Safe
      case 6: return 'bg-green-100 text-green-800 border-green-200'; // Safe (light green)
      case 5: return 'bg-yellow-100 text-yellow-800 border-yellow-200'; // Basically Safe (greenish yellow)
      case 4: return 'bg-yellow-50 text-yellow-700 border-yellow-200'; // Moderate (lighter yellow)
      case 3: return 'bg-orange-100 text-orange-800 border-orange-200'; // Risky
      case 2: return 'bg-red-100 text-red-800 border-red-200'; // Very Risky
      case 1: return 'bg-red-50 text-red-700 border-red-200'; // Dangerous
      case 0: return 'bg-red-900 text-red-100 border-red-800'; // Mission Impossible (dark red)
      default: return 'bg-gray-50 text-gray-700 border-gray-200'; // Error
    }
  };

  // Function to get translated classification badge text
  const getClassificationBadgeText = (classification) => {
    switch (classification) {
      case 8: return t('jupa.classificationBadges.secure');
      case 7: return t('jupa.classificationBadges.verySafe');
      case 6: return t('jupa.classificationBadges.safe');
      case 5: return t('jupa.classificationBadges.basicallySafe');
      case 4: return t('jupa.classificationBadges.moderate');
      case 3: return t('jupa.classificationBadges.risky');
      case 2: return t('jupa.classificationBadges.veryRisky');
      case 1: return t('jupa.classificationBadges.dangerous');
      case 0: return t('jupa.classificationBadges.missionImpossible');
      default: return t('jupa.classificationBadges.error');
    }
  };

  // Load JUPAS programmes from user's saved order
  useEffect(() => {
    const loadJupasProgrammes = async () => {
      if (!currentUser?.jupas_programme_order || Object.keys(currentUser.jupas_programme_order).length === 0) {
        return;
      }

      try {
        setIsLoadingJupas(true);
        const token = localStorage.getItem('token');

        // Get the top 2 programmes from the saved order
        const orderEntries = Object.entries(currentUser.jupas_programme_order);
        orderEntries.sort(([, posA], [, posB]) => posA - posB);
        const top2Codes = orderEntries.slice(0, 2).map(([code]) => code);

        if (top2Codes.length === 0) {
          return;
        }

        // Try to get the current collection first
        let collection = 'dse'; // fallback
        try {
          const collectionResponse = await fetch('/api/programmes/year/current');
          if (collectionResponse.ok) {
            const collectionData = await collectionResponse.json();
            if (collectionData.success && collectionData.collection) {
              collection = collectionData.collection;
            }
          }
        } catch (error) {
          // console.log('ViewReport: Could not get current collection, using fallback');
        }

        // Fetch programme information for the top 2 codes
        const response = await fetch(`/api/programmes/${collection}/codes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ codes: top2Codes })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch JUPAS programme information');
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Failed to fetch programme information');
        }

        // Create ordered array of programmes
        const programmes = [];
        top2Codes.forEach((code, index) => {
          const programme = result.programmes_by_code[code];
          if (programme) {
            programmes[index] = programme;
          }
        });

        const filteredProgrammes = programmes.filter(programme => programme !== undefined);

        // If no programmes found, create placeholder programmes
        if (filteredProgrammes.length === 0 && top2Codes.length > 0) {
          const placeholderProgrammes = top2Codes.map((code, index) => ({
            code: code,
            full_title_en: `Programme ${code}`,
            full_title_cn: `課程 ${code}`,
            institution: 'Institution',
            short_name: code,
            duration: '4-year', // Add duration for badge
            stats_offer: [], // Empty array to trigger new programme badge
            stats_apply: []
          }));
          setJupasProgrammes(placeholderProgrammes);
        } else {
          setJupasProgrammes(filteredProgrammes);
        }
      } catch (error) {
        console.error('Error loading JUPAS programmes:', error);
      } finally {
        setIsLoadingJupas(false);
      }
    };

    loadJupasProgrammes();
  }, [currentUser]);

  // Load classifications when programmes are loaded
  useEffect(() => {
    if (jupasProgrammes.length > 0 && currentUser) {
      loadProgrammeClassifications();
    }
  }, [jupasProgrammes, currentUser]);

  // Load programme classifications
  const loadProgrammeClassifications = async () => {
    if (!currentUser || jupasProgrammes.length === 0) return;

    try {
      setIsLoadingClassifications(true);

      // Load DSE scores from backend
      let userScores = {};
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/dse-scores/load', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          userScores = data.scores || {};
        } else {
          // console.log('ViewReport: No DSE scores found, skipping classifications');
          return;
        }
      } catch (error) {
        // console.log('ViewReport: Error loading DSE scores:', error);
        return;
      }

      // Check if we have any scores
      if (!userScores || Object.keys(userScores).length === 0) {
        // console.log('ViewReport: No DSE scores available, skipping classifications');
        return;
      }

      // Convert backend scores to classification API format
      const convertedScores = convertBackendScoresToClassificationFormat(userScores);
      // console.log('ViewReport: Converted scores for classification:', convertedScores);

      // Get current collection
      let collection = 'dse'; // fallback
      try {
        const collectionResponse = await fetch('/api/programmes/year/current');
        if (collectionResponse.ok) {
          const collectionData = await collectionResponse.json();
          if (collectionData.success && collectionData.collection) {
            collection = collectionData.collection;
          }
        }
      } catch (error) {
        // console.log('ViewReport: Could not get current collection for classifications');
      }

      const classificationPromises = jupasProgrammes.map(async (programme) => {
        try {
          const response = await fetch(`/api/programmes/${collection}/classify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              programmeCode: programme.code,
              userScores: convertedScores
            })
          });

          if (response.ok) {
            const result = await response.json();
            return {
              code: programme.code,
              classification: result.classification,
              classification_text: result.classification_text,
              user_score: result.user_score
            };
          } else {
            console.error(`Failed to classify programme ${programme.code}`);
            return {
              code: programme.code,
              classification: -1,
              classification_text: 'Error',
              user_score: null
            };
          }
        } catch (error) {
          console.error(`Error classifying programme ${programme.code}:`, error);
          return {
            code: programme.code,
            classification: -1,
            classification_text: 'Error',
            user_score: null
          };
        }
      });

      const classifications = await Promise.all(classificationPromises);
      const classificationsMap = {};
      classifications.forEach(item => {
        classificationsMap[item.code] = {
          classification: item.classification,
          classification_text: item.classification_text,
          user_score: item.user_score
        };
      });

      setProgrammeClassifications(classificationsMap);
    } catch (error) {
      console.error('Error loading programme classifications:', error);
    } finally {
      setIsLoadingClassifications(false);
    }
  };

  // Use loading scroll reset hook for main loading state
  useLoadingScrollReset({
    isLoading: isLoading,
    behavior: 'smooth',
    delay: 200,
    enabled: true
  });

  const readProfile = async () => {
    try {
      if (!currentUser || !currentUser.User_ID) {
        console.error("No user data found");
        return;
      }

      // console.log("ViewReport: Reading profile for user:", currentUser.User_ID);

      // Add timeout to database read
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database read timeout')), 10000) // 10 second timeout
      );

      const readPromise = userTable.handleRead({ User_ID: currentUser.User_ID }, false);
      const userData = await Promise.race([readPromise, timeoutPromise]);

      // console.log("ViewReport: Profile data received:", userData ? "success" : "failed");

      if (userData) {
        // First update the state with the current data
        setData(prevData => ({
          ...prevData,
          profile: {
            ...prevData.profile,
            name: `${userData.Last_Name} ${userData.First_Name}${userData.Nickname ? `, ${userData.Nickname}` : ''}`,
            school: userData.School_Name,
            form: userData.Form,
            role: userData.User_Role === 'Stu' ? 'student' :
              userData.User_Role === 'Sta' ? 'staff' :
                userData.User_Role === 'Tea' ? 'teacher' :
                  userData.User_Role
          },
          career: {
            title: userData.eddy_recommendation_title || "",
            text: userData.eddy_recommendation_text || "",
            needsRegeneration: userData.needs_recommendation_regeneration
          }
        }));

        // Only generate recommendations if needs_recommendation_regeneration is true
        if (userData.needs_recommendation_regeneration === true || !userData.eddy_recommendation_title || !userData.eddy_recommendation_text) {
          // console.log("ViewReport: Generating new recommendations as needs_recommendation_regeneration is true");

          try {
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Recommendation generation timeout')), 30000) // 30 second timeout
            );

            const recommendationPromise = generateRecommendations(userData);
            const { title, text } = await Promise.race([recommendationPromise, timeoutPromise]);

            // console.log("ViewReport: Recommendations generated successfully");

            // Update the database with new recommendations
            const updates = {
              eddy_recommendation_title: title,
              eddy_recommendation_text: text,
              needs_recommendation_regeneration: false
            };

            const updateResult = await userTable.handleUpdate(
              { User_ID: userData.User_ID },
              updates,
              false
            );

            if (!updateResult) {
              // Update the local state with new recommendations
              setData(prevData => ({
                ...prevData,
                career: {
                  title: title,
                  text: text,
                  needsRegeneration: false
                }
              }));
            }
          } catch (error) {
            console.error("ViewReport: Error generating recommendations:", error);
            // Continue without recommendations rather than failing completely
            setData(prevData => ({
              ...prevData,
              career: {
                title: "Recommendation generation failed",
                text: "Unable to generate recommendations at this time. Please try again later.",
                needsRegeneration: true
              }
            }));
          }
        } else {
          // console.log("ViewReport: Using existing recommendations as needs_recommendation_regeneration is false");
        }
      } else {
        console.error("Profile error");
      }
    } catch (error) {
      console.error("Network error:", error);
    }
  };

  const readAbilities = async () => {
    try {
      if (!currentUser || !currentUser.User_ID) {
        console.error("No user data found");
        return;
      }

      // console.log("ViewReport: Reading abilities for user:", currentUser.User_ID);

      // Add timeout to database read
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database read timeout')), 10000) // 10 second timeout
      );

      const readPromise = userTable.handleRead({ User_ID: currentUser.User_ID }, false);
      const userData = await Promise.race([readPromise, timeoutPromise]);

      // console.log("ViewReport: Abilities data received:", userData ? "success" : "failed");

      if (userData) {
        setData(prevData => ({
          ...prevData,
          abilities: {
            NumericalReasoning: userData.ability_6d[0],
            LogicalReasoning: userData.ability_6d[1],
            GraphicalReasoning: userData.ability_6d[2],
            VerbalReasoning: userData.ability_6d[3],
            Memory: userData.ability_6d[4],
            Creativity: userData.ability_6d[5]
          }
        }));

        // Get recommendations based on ability_6d
        // console.log("ViewReport: Getting subject and program recommendations...");

        try {
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Recommendation fetching timeout')), 30000) // 15 second timeout
          );

          const recommendationPromise = Promise.all([
            getSubjectRecommendations(userData.ability_6d),
            getProgramRecommendations(userData.ability_6d)
          ]);

          const [subjectRecs, programRecs] = await Promise.race([recommendationPromise, timeoutPromise]);
          // console.log("ViewReport: Recommendations received - subjects:", subjectRecs.length, "programs:", programRecs.length);

          setData(prevData => ({
            ...prevData,
            recommendations: {
              subjects: subjectRecs,
              programs: programRecs
            }
          }));
        } catch (error) {
          console.error("ViewReport: Error fetching recommendations:", error);
          // Continue with empty recommendations rather than failing completely
          setData(prevData => ({
            ...prevData,
            recommendations: {
              subjects: [],
              programs: []
            }
          }));
        }
      } else {
        console.error("Abilities error");
      }
    } catch (error) {
      console.error("Network error:", error);
    }
  };

  const handleEditProfile = () => {
    navigate('/edit-profile');
  };

  const handleRegenerateRecommendation = async () => {
    try {
      setIsRegenerating(true);

      if (!currentUser || !currentUser.User_ID) {
        console.error("No user data found");
        return;
      }

      // Generate new recommendations
      const userData = await userTable.handleRead({ User_ID: currentUser.User_ID }, false);
      if (!userData) {
        throw new Error("Failed to fetch user data");
      }

      const { title, text } = await generateRecommendations(userData);

      // Update the database with new recommendations
      const updates = {
        eddy_recommendation_title: title,
        eddy_recommendation_text: text,
        needs_recommendation_regeneration: false
      };

      const updateResult = await userTable.handleUpdate(
        { User_ID: userData.User_ID },
        updates,
        false
      );

      if (updateResult) {
        // Update the local state with new recommendations
        setData(prevData => ({
          ...prevData,
          career: {
            title: title,
            text: text,
            needsRegeneration: false
          }
        }));
      }
    } catch (error) {
      console.error('Error regenerating recommendation:', error);
      alert('Failed to regenerate recommendation. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRead = useCallback(async () => {
    // Prevent multiple simultaneous calls or calls after unmount
    if (loadingRef.current || !mountedRef.current) {
      // console.log("ViewReport: Skipping handleRead - loading:", loadingRef.current, "mounted:", mountedRef.current);
      return;
    }

    // Prevent infinite retries
    if (retryCountRef.current >= 3) {
      // console.log("ViewReport: Maximum retries reached, stopping");
      setLoading(false);
      return;
    }

    // console.log("ViewReport: Starting handleRead for user:", currentUser?.User_ID, "retry:", retryCountRef.current);

    try {
      loadingRef.current = true;
      setLoading(true);
      retryCountRef.current++;

      // console.log("ViewReport: Calling readProfile...");
      await readProfile();
      // console.log("ViewReport: Calling readAbilities...");
      await readAbilities();
      // console.log("ViewReport: handleRead completed successfully");

      // Reset retry count on success
      retryCountRef.current = 0;
    } catch (error) {
      console.error("Error in handleRead:", error);
    } finally {
      if (mountedRef.current) {
        loadingRef.current = false;
        setLoading(false);
        // console.log("ViewReport: Loading state reset to false");
      }
    }
  }, [currentUser?.User_ID]); // Only recreate when User_ID changes

  useEffect(() => {
    // console.log("ViewReport: useEffect triggered - User_ID:", currentUser?.User_ID);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (currentUser?.User_ID) {
      // Debounce the call to prevent rapid successive requests
      timeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          // console.log("ViewReport: Executing handleRead after debounce");
          handleRead();
        }
      }, 100); // 100ms debounce
    } else {
      // If no user ID, set loading to false to prevent infinite loading
      // console.log("ViewReport: No user ID available, setting loading to false");
      setLoading(false);
    }
  }, [currentUser?.User_ID, handleRead]);

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Get language-specific chat messages
  const getChatMessages = (recommendationTitle, recommendationText) => {
    const currentLanguage = i18n.language || 'en';

    switch (currentLanguage) {
      case 'tc':
        return {
          initialMessage: `我想同愛迪生討論呢個建議：\n\n${recommendationTitle}\n\n${recommendationText}`,
          responsePrompt: "請幫我更好地理解呢個建議，同埋建議我點樣可以喺呢啲方面努力。"
        };
      case 'sc':
        return {
          initialMessage: `嗨！我想和爱迪生讨论这个建议：\n\n${recommendationTitle}\n\n${recommendationText}`,
          responsePrompt: "请帮我更好地理解这个建议，并建议我如何可以在这些方面努力。"
        };
      case 'en':
      default:
        return {
          initialMessage: `I'd like to discuss this recommendation:\n\n${recommendationTitle}\n\n${recommendationText}`,
          responsePrompt: "Please help me understand this recommendation better and suggest how I can work on these areas."
        };
    }
  };

  // Show loading popup for main loading state
  if (isLoading) {
    return (
      <div className="bg-gray-50 flex flex-col">
        {/* Loading Popup */}
        {createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="flex flex-col items-center">
                <LoadingSpinner size="large" className="mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{t('report.loadingProfile')}</h3>
                <p className="text-gray-600 text-center">{t('report.loadingProfileDesc')}</p>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 flex flex-col">
      <div className="p-6 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-gray-900">{t('report.yourProfile')}</h2>
            <button
              onClick={handleEditProfile}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full sm:w-auto"
            >
              {t('common.editProfile')}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-500 text-sm">{t('report.name')}</p>
              <p className="font-semibold text-gray-800">{data.profile.name}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-500 text-sm">{t('report.school')}</p>
              <p className="font-semibold text-gray-800">{data.profile.school}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-500 text-sm">{t('report.form')}</p>
              <p className="font-semibold text-gray-800">{data.profile.form}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-500 text-sm">{t('report.role')}</p>
              <p className="font-semibold text-gray-800">{t(`report.${data.profile.role}`)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <div className="max-w-7xl mx-auto mt-6 mb-16 px-4 sm:px-6">
          {/* Test Results Section */}
          {isPresenter(currentUser) && (
            <TestResultsSection
              data={data}
              isCreatingChat={isCreatingChat}
              isRegenerating={isRegenerating}
              setCreatingChat={setCreatingChat}
              handleRegenerateRecommendation={handleRegenerateRecommendation}
              getChatMessages={getChatMessages}
              currentUser={currentUser}
            />
          )}

          {/* JUPAS Programmes Section */}
          <JupasProgrammesSection
            jupasProgrammes={jupasProgrammes}
            programmeClassifications={programmeClassifications}
            isLoadingClassifications={isLoadingClassifications}
            getDurationNumber={getDurationNumber}
            getInstitutionKey={getInstitutionKey}
            getClassificationColor={getClassificationColor}
            getClassificationBadgeText={getClassificationBadgeText}
          />
        </div>
      </div>



      {/* Loading Popups */}
      {(isLoadingJupas || isLoadingClassifications || isRegenerating) && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex flex-col items-center">
              <LoadingSpinner size="large" className="mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {isLoadingJupas ? t('report.loadingJupasProgrammes') :
                  isLoadingClassifications ? t('report.loadingClassifications') :
                    t('report.regeneratingRecommendation')}
              </h3>
              <p className="text-gray-600 text-center">
                {isLoadingJupas ? t('report.loadingJupasProgrammesDesc') :
                  isLoadingClassifications ? t('report.loadingClassificationsDesc') :
                    t('report.regeneratingRecommendationDesc')}
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isCreatingChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex flex-col items-center">
              <LoadingSpinner size="large" className="mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{t('common.creatingYourChat')}</h3>
              <p className="text-gray-600 text-center">{t('common.pleaseWait')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewReport;
