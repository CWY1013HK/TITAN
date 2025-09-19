import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, isPresenter } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

import LoadingSpinner from '../blocks/LoadingSpinner';
import useLoadingScrollReset from '../../hooks/useLoadingScrollReset';
import JupasProgrammesSection from '../widgets/JupasProgrammesSection';
import TestResultsWidget from '../widgets/TestResultsWidget';
import TrajectoryStatsWidget from '../widgets/TrajectoryStatsWidget';

const UserDashboard = ({ userData }) => {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const displayName = currentUser?.Nickname || currentUser?.First_Name || '';
  const [summaryData, setSummaryData] = useState({
    testResults: {
      numerical: 0,
      logical: 0,
      graphical: 0,
      verbal: 0,
      memory: 0,
      creativity: 0
    },
    trajectoryStats: {
      events: 0,
      connections: 0,
      lastAnalysis: null
    }
  });
  const [jupasProgrammes, setJupasProgrammes] = useState([]);
  const [isLoadingJupas, setIsLoadingJupas] = useState(false);
  // Classification state
  const [programmeClassifications, setProgrammeClassifications] = useState({});
  const [isLoadingClassifications, setIsLoadingClassifications] = useState(false);

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

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!currentUser) return;

        setSummaryData({
          testResults: {
            numerical: currentUser.ability_6d?.[0] || 0,
            logical: currentUser.ability_6d?.[1] || 0,
            graphical: currentUser.ability_6d?.[2] || 0,
            verbal: currentUser.ability_6d?.[3] || 0,
            memory: currentUser.ability_6d?.[4] || 0,
            creativity: currentUser.ability_6d?.[5] || 0
          },
          trajectoryStats: {
            events: currentUser.trajectory_events?.length || 0,
            connections: currentUser.trajectory_connections?.length || 0,
            lastAnalysis: currentUser.trajectory_analyses?.[0]?.timestamp || null
          }
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [currentUser]);

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
            // console.log('UserDashboard: Collection response:', collectionData);
            if (collectionData.success && collectionData.collection) {
              collection = collectionData.collection;
            }
          }
        } catch (error) {
          // console.log('UserDashboard: Could not get current collection, using fallback');
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
        // console.log('UserDashboard: API response:', result);

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
        // console.log('UserDashboard: Final programmes:', filteredProgrammes);

        // If no programmes found, create placeholder programmes
        if (filteredProgrammes.length === 0 && top2Codes.length > 0) {
          // console.log('UserDashboard: No programmes found, creating placeholders');
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
          // console.log('UserDashboard: Using placeholder programmes:', placeholderProgrammes);
          setJupasProgrammes(placeholderProgrammes);
        } else {
          // console.log('UserDashboard: Using real programmes:', filteredProgrammes);
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

  const formatDate = (timestamp) => {
    if (!timestamp) return 'No analysis yet';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };



  // Use loading scroll reset hook for loading states
  useLoadingScrollReset({
    isLoading: isLoadingJupas || isLoadingClassifications,
    behavior: 'smooth',
    delay: 200,
    enabled: true
  });

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
      case 8: return t('jupa.classificationBadges.goldenTicket');
      case 7: return t('jupa.classificationBadges.secure');
      case 6: return t('jupa.classificationBadges.verySafe');
      case 5: return t('jupa.classificationBadges.safe');
      case 4: return t('jupa.classificationBadges.moderate');
      case 3: return t('jupa.classificationBadges.risky');
      case 2: return t('jupa.classificationBadges.veryRisky');
      case 1: return t('jupa.classificationBadges.dangerous');
      case 0: return t('jupa.classificationBadges.missionImpossible');
      default: return t('jupa.classificationBadges.error');
    }
  };

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
          // console.log('UserDashboard: No DSE scores found, skipping classifications');
          return;
        }
      } catch (error) {
        // console.log('UserDashboard: Error loading DSE scores:', error);
        return;
      }

      // Check if we have any scores
      if (!userScores || Object.keys(userScores).length === 0) {
        // console.log('UserDashboard: No DSE scores available, skipping classifications');
        return;
      }

      // Convert backend scores to classification API format
      const convertedScores = convertBackendScoresToClassificationFormat(userScores);
      // console.log('UserDashboard: Converted scores for classification:', convertedScores);

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
        // console.log('UserDashboard: Could not get current collection for classifications');
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



  return (
    <div className="bg-gray-50">
      {/* Welcome Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('userDashboard.welcome')}{displayName ? `${displayName}` : ''}{t('userDashboard.exclamation')}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('userDashboard.continueJourney')}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div
            className="bg-gray-100 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-not-allowed opacity-60"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-gray-200 rounded-md p-3">
                <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-500">{t('userDashboard.personalityTest')}</h3>
                <p className="mt-1 text-sm text-gray-400">
                  {t('userDashboard.personalityTestDesc')}
                </p>
              </div>
            </div>
          </div>

          {/* <Link
            to="/personality-test"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">{t('userDashboard.personalityTest')}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t('userDashboard.personalityTestDesc')}
                </p>
              </div>
            </div>
          </Link> */}

          <Link
            to="/view-report"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">{t('userDashboard.viewReport')}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t('userDashboard.viewReportDesc')}
                </p>
              </div>
            </div>
          </Link>

          {/* <Link
            to="/eddy"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">{t('userDashboard.chatWithEddy')}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t('userDashboard.chatWithEddyDesc')}
                </p>
              </div>
            </div>
          </Link> */}

          <div
            className="bg-gray-100 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-not-allowed opacity-60"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-gray-200 rounded-md p-3">
                <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-500">{t('userDashboard.chatWithEddy')}</h3>
                <p className="mt-1 text-sm text-gray-400">
                  {t('userDashboard.chatWithEddyDesc')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('userDashboard.progressSummary')}</h2>

          {/* Test Results Widget */}
          {isPresenter(currentUser) && (
            <TestResultsWidget testResults={summaryData.testResults} />
          )}

          {/* JUPAS Programmes Section (already modularized) */}
          <JupasProgrammesSection
            jupasProgrammes={jupasProgrammes}
            programmeClassifications={programmeClassifications}
            isLoadingClassifications={isLoadingClassifications}
            getDurationNumber={getDurationNumber}
            getInstitutionKey={getInstitutionKey}
            getClassificationColor={getClassificationColor}
            getClassificationBadgeText={getClassificationBadgeText}
            standAlone={false}
          />

          {/* Trajectory Stats Widget */}
          {isPresenter(currentUser) && (
            <TrajectoryStatsWidget trajectoryStats={summaryData.trajectoryStats} formatDate={formatDate} />
          )}
        </div>

        {/* Trajectory Button */}
        {isPresenter(currentUser) && (
          <Link
            to="/trajectory"
            className="block bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">{t('userDashboard.createTrajectory')}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t('userDashboard.createTrajectoryDesc')}
                </p>
              </div>
            </div>
          </Link>
        )}
      </div>


    </div>
  );
};

export default UserDashboard;   