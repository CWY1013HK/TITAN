import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DSEScoreInputer from '../components/widgets/DSEScoreInputer';
import programmeService from '../services/programmeService';
import ProgrammeSearch from '../components/widgets/ProgrammeSearch';
import MySelection from '../components/widgets/MySelection';
import ProgrammeRecommendations from '../components/widgets/ProgrammeRecommendations';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import LoadingSpinner from '../components/blocks/LoadingSpinner';
import useLoadingScrollReset from '../hooks/useLoadingScrollReset';
import ContactForm from '../components/blocks/ContactForm';

const JUPASelect = () => {
    const navigate = useNavigate();
    const { isAuthenticated, currentUser } = useAuth();
    const [dseScores, setDseScores] = useState([]);
    const [showBlocks, setShowBlocks] = useState(false);
    const [fadeOutBlocks, setFadeOutBlocks] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [programmes, setProgrammes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [availableCollections, setAvailableCollections] = useState([]);
    const [selectedCollection, setSelectedCollection] = useState(null);
    const [serviceInitialized, setServiceInitialized] = useState(false);
    const [selectedProgrammes, setSelectedProgrammes] = useState([]);
    const [selectedInstitutions, setSelectedInstitutions] = useState([]);

    // Animation states
    const [animatedScores, setAnimatedScores] = useState({
        totalScore: 0,
        best6Score: 0,
        best5Score: 0,
        coreScore: 0,
        topProgrammes: 0,
        competitiveProgrammes: 0,
        safetyProgrammes: 0
    });
    const animationRefs = useRef({});
    const isFirstRender = useRef(true);

    // Drag and drop states
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);

    // Block 4 visibility state
    const [showBlock4, setShowBlock4] = useState(false);
    const [fadeOutBlock4, setFadeOutBlock4] = useState(false);

    // Save status for programme ordering
    const [saveStatus, setSaveStatus] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Separate save status for Block 4 (JUPAS ordering)
    const [block4SaveStatus, setBlock4SaveStatus] = useState('');
    const [isBlock4Saving, setIsBlock4Saving] = useState(false);

    // Chat creation state
    const [isCreatingChat, setIsCreatingChat] = useState(false);

    // Contact form state
    const [showContactForm, setShowContactForm] = useState(false);

    // Classification state
    const [programmeClassifications, setProgrammeClassifications] = useState({});
    const [isLoadingClassifications, setIsLoadingClassifications] = useState(false);

    // Recommendation classification level state
    const [selectedClassificationLevel, setSelectedClassificationLevel] = useState(5);

    // Number of recommendations state
    const [selectedNumberOfRecommendations, setSelectedNumberOfRecommendations] = useState(6);

    const { t, i18n } = useTranslation();

    // Helper function to get institution translation key
    const getInstitutionKey = (institutionName) => {
        const institutionMap = {
            'The University of Hong Kong': 'hku',
            'The Chinese University of Hong Kong': 'cuhk',
            'The Hong Kong Polytechnic University': 'polyu',
            'City University of Hong Kong': 'cityu',
            'Lingnan University': 'lingnan',
            'Hong Kong Metropolitan University': 'hkmu',
            'The Hang Seng University of Hong Kong': 'hsu',
            'Saint Francis University': 'sfu',
            'Tung Wah College': 'twc',
            'UOW College Hong Kong': 'uowchk',
            'Hong Kong Baptist University': 'hkbu',
            'Hong Kong Chu Hai College': 'hkchu',
            'Hong Kong Shue Yan University': 'hksyu',
            'The Hong Kong University of Science and Technology': 'hkust',
            'The Education University of Hong Kong': 'eduhk',
            'Technological and Higher Education Institute of Hong Kong, Vocational Training Council': 'thei'
        };
        return institutionMap[institutionName] || institutionName;
    };

    // Helper function to extract duration number from duration string
    const getDurationNumber = (durationString) => {
        if (!durationString) return null;
        const match = durationString.match(/(\d+)/);
        return match ? match[1] : null;
    };

    // Initialize programme service and load available collections on component mount
    useEffect(() => {
        initializeProgrammeService();
    }, []);

    // Load saved programme ordering when component mounts (if user is authenticated)
    useEffect(() => {
        if (isAuthenticated && selectedCollection) {
            loadSavedProgrammeOrder();
        }
    }, [isAuthenticated, selectedCollection]);

    // Load classifications when selected programmes change
    useEffect(() => {
        if (selectedProgrammes.length > 0 && dseScores.length > 0) {
            loadProgrammeClassifications();
        }
    }, [selectedProgrammes, dseScores]);

    // Cache for recommendations to avoid unnecessary API calls
    const [recommendationsCache, setRecommendationsCache] = useState({});
    const [lastScoresHash, setLastScoresHash] = useState('');

    // Create a hash of scores and selected institutions for caching
    const createScoresHash = (scores) => {
        const scoresPart = scores
            .filter(score => score.subjectCode && score.score)
            .map(score => `${score.subjectCode}:${score.score}`)
            .sort()
            .join('|');

        const institutionsPart = selectedInstitutions.length > 0
            ? `|institutions:${selectedInstitutions.sort().join(',')}`
            : '|institutions:none';

        const classificationPart = `|classification:${selectedClassificationLevel}`;
        const numberOfRecommendationsPart = `|numberOfRecommendations:${selectedNumberOfRecommendations}`;

        return scoresPart + institutionsPart + classificationPart + numberOfRecommendationsPart;
    };

    // Debounced fetch function to prevent rapid API calls
    const debouncedFetch = useRef(null);

    // Refetch recommendations only when scores change or selected programmes change
    useEffect(() => {
        if (showBlocks && dseScores.length > 0 && serviceInitialized) {
            const scoresHash = createScoresHash(dseScores);

            // Only fetch if scores actually changed or cache doesn't exist
            if (scoresHash !== lastScoresHash || !recommendationsCache[scoresHash]) {
                // Clear existing timeout
                if (debouncedFetch.current) {
                    clearTimeout(debouncedFetch.current);
                }

                // Debounce the fetch to prevent rapid calls
                debouncedFetch.current = setTimeout(() => {
                    fetchProgrammeRecommendations(dseScores, scoresHash);
                }, 500); // 500ms delay
            }
        }

        // Cleanup timeout on unmount
        return () => {
            if (debouncedFetch.current) {
                clearTimeout(debouncedFetch.current);
            }
        };
    }, [dseScores, selectedProgrammes.length, selectedInstitutions, selectedClassificationLevel, selectedNumberOfRecommendations, showBlocks, serviceInitialized]); // Include dseScores to detect changes

    // Function to load programme classifications
    const loadProgrammeClassifications = async () => {
        if (!selectedCollection || !dseScores || dseScores.length === 0) return;

        setIsLoadingClassifications(true);
        try {
            // Convert DSE scores to the format expected by the backend
            const scoresObject = {};
            dseScores.forEach(score => {
                if (score.subjectCode && score.score) {
                    scoresObject[score.subjectCode] = score.score;
                }
            });

            // Fetch classifications for all selected programmes
            const classificationPromises = selectedProgrammes.map(async (programme) => {
                try {
                    const response = await fetch(`/api/programmes/${selectedCollection}/classify`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            programmeCode: programme.code,
                            userScores: scoresObject
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

    // Helper function to extract interview details
    const getInterviewInfo = (programme) => {
        if (!programme.interview || programme.interview === 'No') {
            return null;
        }

        // Handle different interview types
        if (programme.interview === 'Yes (on a selective basis)') {
            return {
                mainPart: 'Yes',
                details: t('jupa.interviewSelectiveBasis'),
                showTooltip: true
            };
        } else if (programme.interview === 'May require interview and/or test') {
            return {
                mainPart: 'May require',
                details: t('jupa.interviewMayRequire'),
                showTooltip: true
            };
        }

        // Extract the main part (before brackets) and details (in brackets) for other cases
        const match = programme.interview.match(/^([^(]+)(?:\(([^)]+)\))?$/);
        if (match) {
            const mainPart = match[1].trim();
            const details = match[2] ? match[2].trim() : null;
            return { mainPart, details, showTooltip: !!details };
        }

        return { mainPart: programme.interview, details: null, showTooltip: false };
    };

    const initializeProgrammeService = async () => {
        try {
            // Initialize the service with backend-determined current year
            await programmeService.initialize();

            // Load available collections
            const collectionsResult = await programmeService.getAvailableCollections();
            if (collectionsResult.success && collectionsResult.collections.length > 0) {
                setAvailableCollections(collectionsResult.collections);

                // Get current year info
                const currentYearResult = await programmeService.getCurrentYear();
                if (currentYearResult.success) {
                    setSelectedCollection(currentYearResult.collection);
                }
            }

            setServiceInitialized(true);
        } catch (err) {
            console.error('Error initializing programme service:', err);
            setError(t('jupa.failedToInitializeProgrammeService'));
        }
    };

    // Load saved programme ordering from backend
    const loadSavedProgrammeOrder = async () => {
        if (!selectedCollection) {
            // console.log('No collection selected yet, skipping programme order load');
            return;
        }

        try {
            setIsSaving(true);
            const token = localStorage.getItem('token');

            const response = await fetch('/api/jupas-order/load', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load saved programme order');
            }

            const data = await response.json();
            const savedOrder = data.programmeOrder;

            if (savedOrder && Object.keys(savedOrder).length > 0) {
                // console.log('Loading saved programme order:', savedOrder);
                // Convert saved order back to programme array
                const orderedProgrammes = await convertSavedOrderToProgrammes(savedOrder);
                // console.log('Converted to programmes:', orderedProgrammes);
                setSelectedProgrammes(orderedProgrammes);
            } else {
                // console.log('No saved programme order found');
            }
        } catch (error) {
            console.error('Error loading saved programme order:', error);
            setSaveStatus(t('jupa.failedToLoadSavedProgrammeOrder'));
        } finally {
            setIsSaving(false);
        }
    };

    // Convert saved order object to programme array
    const convertSavedOrderToProgrammes = async (savedOrder) => {
        // Convert the order object to an array of [code, position] pairs
        const orderEntries = Object.entries(savedOrder);

        // Sort by position (value) to get the correct order
        orderEntries.sort(([, posA], [, posB]) => posA - posB);

        // Extract just the programme codes in order
        const orderedCodes = orderEntries.map(([code]) => code);

        if (orderedCodes.length === 0) {
            return [];
        }

        try {
            // Fetch full programme information from backend
            const response = await fetch(`/api/programmes/${selectedCollection}/codes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ codes: orderedCodes })
            });

            if (!response.ok) {
                throw new Error('Failed to fetch programme information');
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || t('jupa.failedToFetchProgrammeInformation'));
            }

            // Create ordered array of programmes based on saved order
            const orderedProgrammes = [];
            orderEntries.forEach(([code, position]) => {
                const programme = result.programmes_by_code[code];
                if (programme) {
                    orderedProgrammes[position] = programme;
                }
            });

            // Filter out any undefined entries (in case some programmes weren't found)
            return orderedProgrammes.filter(programme => programme !== undefined);
        } catch (error) {
            console.error('Error fetching programme information:', error);
            // Fallback to placeholder data if fetch fails
            return orderedCodes.map(code => ({
                code: code,
                full_title_en: `Programme ${code}`,
                institution: 'Institution',
                short_name: code
            }));
        }
    };

    // Convert programme array to saved order object
    const convertProgrammesToSavedOrder = (programmes) => {
        const savedOrder = {};
        programmes.forEach((programme, index) => {
            savedOrder[programme.code] = index;
        });
        return savedOrder;
    };

    // Save programme ordering to backend
    const saveProgrammeOrder = async (programmesToSave) => {
        if (!isAuthenticated) return;

        try {
            setIsSaving(true);
            const token = localStorage.getItem('token');
            const orderObject = convertProgrammesToSavedOrder(programmesToSave);

            const response = await fetch('/api/jupas-order/save', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ programmeOrder: orderObject })
            });

            if (!response.ok) {
                throw new Error('Failed to save programme order');
            }

            setSaveStatus(t('jupa.programmeOrderSaved'));
            setTimeout(() => setSaveStatus(''), 3000); // Clear status after 3 seconds
            // console.log('Programme order saved successfully:', orderObject);
        } catch (error) {
            console.error('Error saving programme order:', error);
            setSaveStatus(t('jupa.failedToSaveProgrammeOrder'));
        } finally {
            setIsSaving(false);
        }
    };

    // Save programme ordering for Block 4 (JUPAS ordering)
    const saveBlock4ProgrammeOrder = async (programmesToSave) => {
        if (!isAuthenticated) return;

        try {
            setIsBlock4Saving(true);
            const token = localStorage.getItem('token');
            const orderObject = convertProgrammesToSavedOrder(programmesToSave);

            const response = await fetch('/api/jupas-order/save', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ programmeOrder: orderObject })
            });

            if (!response.ok) {
                throw new Error('Failed to save programme order');
            }

            setBlock4SaveStatus(t('jupa.jupasOrderSaved'));
            setTimeout(() => setBlock4SaveStatus(''), 3000); // Clear status after 3 seconds
            // console.log('Block 4 programme order saved successfully:', orderObject);
        } catch (error) {
            console.error('Error saving Block 4 programme order:', error);
            setBlock4SaveStatus(t('jupa.failedToSaveJupasOrder'));
        } finally {
            setIsBlock4Saving(false);
        }
    };

    const handleScoresChange = (scores) => {
        setDseScores(scores);

        // Check if there are at least 5 completed rows
        const completedRows = scores.filter(score => score.subjectCode && score.score);
        const shouldShowBlocks = completedRows.length >= 5;

        if (shouldShowBlocks && !showBlocks) {
            // Criteria newly met - show blocks
            setShowBlocks(true);
            setFadeOutBlocks(false);
            // Fetch programme recommendations
            fetchProgrammeRecommendations(scores);
        } else if (!shouldShowBlocks && showBlocks) {
            // Criteria no longer met - fade out blocks
            setFadeOutBlocks(true);
            // Remove blocks after fade-out animation completes
            setTimeout(() => {
                setShowBlocks(false);
                setFadeOutBlocks(false);
                // Also hide Block 4 when main blocks are hidden
                setShowBlock4(false);
                setFadeOutBlock4(false);
            }, 700); // Match the CSS transition duration
        }

        // Mark initial load as complete
        if (isInitialLoad) {
            setIsInitialLoad(false);
        }
    };

    // Handle collection change
    const handleCollectionChange = (collection) => {
        setSelectedCollection(collection);
        programmeService.setCollection(collection);
        // Refetch recommendations if blocks are currently shown
        if (showBlocks && dseScores.length > 0) {
            fetchProgrammeRecommendations(dseScores);
        }
    };

    const handleInstitutionsChange = (institutions) => {
        setSelectedInstitutions(institutions);
        // Refetch recommendations if blocks are currently shown
        if (showBlocks && dseScores.length > 0) {
            fetchProgrammeRecommendations(dseScores);
        }
    };

    // Fetch programme recommendations based on DSE scores
    const fetchProgrammeRecommendations = async (scores, scoresHash) => {
        if (scores.length === 0 || !serviceInitialized) return;

        // Check cache first
        if (recommendationsCache[scoresHash]) {
            // console.log('Using cached recommendations');
            setProgrammes(recommendationsCache[scoresHash]);
            setLastScoresHash(scoresHash);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Use the new recommendations by classification endpoint
            const result = await programmeService.getRecommendationsByClassification(scores, selectedProgrammes, selectedCollection, selectedInstitutions, selectedClassificationLevel, selectedNumberOfRecommendations);
            if (result.success) {
                setProgrammes(result.data);
                // console.log(`Found ${result.data.selectedProgrammeCodes.length} programmes`);

                // Cache the result
                setRecommendationsCache(prev => ({
                    ...prev,
                    [scoresHash]: result.data
                }));
                setLastScoresHash(scoresHash);
            } else {
                setError('Failed to fetch programme recommendations');
            }
        } catch (err) {
            console.error('Error fetching programme recommendations:', err);
            setError(t('jupa.errorLoadingProgrammeRecommendations'));
        } finally {
            setLoading(false);
        }
    };

    // Handle initial data loading for authenticated users
    useEffect(() => {
        // If user has existing data, the DSEScoreInputer will call handleScoresChange
        // after loading, which will trigger the criteria check
        // This useEffect ensures we handle the initial state properly
        if (isInitialLoad && dseScores.length > 0 && serviceInitialized) {
            const completedRows = dseScores.filter(score => score.subjectCode && score.score);
            const shouldShowBlocks = completedRows.length >= 5;

            if (shouldShowBlocks) {
                setShowBlocks(true);
                setFadeOutBlocks(false);
                // Fetch programme recommendations for initial data
                fetchProgrammeRecommendations(dseScores);
            }

            setIsInitialLoad(false);
        }
    }, [dseScores, isInitialLoad, serviceInitialized]);

    // Handle Block 4 visibility based on selected programmes
    useEffect(() => {
        const shouldShowBlock4 = selectedProgrammes.length > 0;

        if (shouldShowBlock4 && !showBlock4) {
            // Show Block 4 when programmes are selected
            setShowBlock4(true);
            setFadeOutBlock4(false);
        } else if (!shouldShowBlock4 && showBlock4) {
            // Fade out Block 4 when no programmes are selected
            setFadeOutBlock4(true);
            // Remove Block 4 after fade-out animation completes
            setTimeout(() => {
                setShowBlock4(false);
                setFadeOutBlock4(false);
            }, 700); // Match the CSS transition duration
        }
    }, [selectedProgrammes.length, showBlock4]);

    // Sigmoid function for smooth easing
    const sigmoid = (x) => {
        return 1 / (1 + Math.exp(-x));
    };

    // Animate number from start to end
    const animateNumber = (start, end, duration = 1000, onUpdate) => {
        const startTime = performance.now();
        const difference = end - start;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Apply sigmoid easing
            const easedProgress = sigmoid((progress - 0.5) * 6); // Scale for better curve
            const currentValue = Math.round(start + (difference * easedProgress));

            onUpdate(currentValue);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    };

    // Calculate scores from DSE scores
    const calculateScores = (scores) => {
        const scoreValues = scores.map(score => {
            const scoreValue = score.score === "5**" ? 7 :
                score.score === "5*" ? 6 :
                    score.score === "5" ? 5 :
                        score.score === "4" ? 4 :
                            score.score === "3" ? 3 :
                                score.score === "2" ? 2 :
                                    score.score === "1" ? 1 : 0;
            return scoreValue;
        });

        const totalScore = scoreValues.reduce((sum, score) => sum + score, 0);
        const sortedScores = scoreValues.sort((a, b) => b - a);
        const best6Score = sortedScores.slice(0, 6).reduce((sum, score) => sum + score, 0);
        const best5Score = sortedScores.slice(0, 5).reduce((sum, score) => sum + score, 0);

        const coreScore = scores.filter(score =>
            ["CHI", "ENG", "MAT"].includes(score.subjectCode)
        ).reduce((total, score) => {
            const scoreValue = score.score === "5**" ? 7 :
                score.score === "5*" ? 6 :
                    score.score === "5" ? 5 :
                        score.score === "4" ? 4 :
                            score.score === "3" ? 3 :
                                score.score === "2" ? 2 :
                                    score.score === "1" ? 1 : 0;
            return total + scoreValue;
        }, 0);

        const topProgrammes = Math.min(100, Math.round((best6Score / 42) * 100));
        const competitiveProgrammes = Math.min(100, Math.round((best5Score / 35) * 100));
        const safetyProgrammes = Math.min(100, Math.round((best5Score / 25) * 100));

        return {
            totalScore,
            best6Score,
            best5Score,
            coreScore,
            topProgrammes,
            competitiveProgrammes,
            safetyProgrammes
        };
    };

    // Animate all scores when DSE scores change
    useEffect(() => {
        if (dseScores.length > 0) {
            const newScores = calculateScores(dseScores);

            // Define animation durations for different score types
            const animationDurations = {
                totalScore: 800,
                best6Score: 600, // 0.75 of 800ms
                best5Score: 400, // 0.5 of 800ms
                coreScore: 800,
                topProgrammes: 800,
                competitiveProgrammes: 400, // 0.5 of 800ms
                safetyProgrammes: 200 // 0.25 of 800ms
            };

            // Animate each score with its specific duration
            Object.keys(newScores).forEach(key => {
                const startValue = animatedScores[key] || 0;
                const endValue = newScores[key];

                if (startValue !== endValue) {
                    // For first render, set values immediately to avoid showing 0
                    if (isFirstRender.current) {
                        setAnimatedScores(prev => ({
                            ...prev,
                            [key]: endValue
                        }));
                    } else {
                        // For subsequent changes, animate from current value to new value
                        const duration = animationDurations[key] || 800;
                        animateNumber(startValue, endValue, duration, (value) => {
                            setAnimatedScores(prev => ({
                                ...prev,
                                [key]: value
                            }));
                        });
                    }
                }
            });

            // Mark first render as complete after processing
            if (isFirstRender.current) {
                isFirstRender.current = false;
            }
        }
    }, [dseScores]);

    // Add CSS styles for fade-in and fade-out animation
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            .fade-in-block {
                opacity: 0;
                transform: translateY(32px);
                transition: opacity 0.7s ease-out, transform 0.7s ease-out;
            }
            
            .fade-in-block.fade-in-visible {
                opacity: 1;
                transform: translateY(0);
            }

            .fade-in-block.fade-out {
                opacity: 0;
                transform: translateY(32px);
            }

            .progress-bar {
                transition: width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }

            .score-counter {
                transition: all 0.1s ease-out;
            }

            .draggable-row {
                transition: all 0.2s ease;
                cursor: grab;
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                -khtml-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
                touch-action: pan-y;
                -webkit-tap-highlight-color: transparent;
            }

            .draggable-row:active {
                cursor: grabbing;
            }

            .draggable-row.dragging {
                opacity: 0.5;
                transform: rotate(5deg);
                z-index: 10;
                touch-action: none !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }

            .auto-scroll-active {
                scroll-behavior: smooth !important;
            }

            .draggable-row.drag-over {
                border-top: 3px solid #3b82f6;
                margin-top: 8px;
            }

            @media (max-width: 768px) {
                .draggable-row {
                    touch-action: none;
                }
                
                .draggable-row.dragging {
                    touch-action: none;
                }
            }

            .band-a {
                background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
                border-left: 4px solid #ec4899;
            }

            .band-b {
                background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);
                border-left: 4px solid #f97316;
            }
        `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

    // Intersection Observer for fade-in animation
    useEffect(() => {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const shouldShowBlock5 = selectedProgrammes.length >= 6;
                if (entry.isIntersecting && (
                    (showBlocks && !fadeOutBlocks) ||
                    (showBlock4 && !fadeOutBlock4) ||
                    shouldShowBlock5
                )) {
                    entry.target.classList.add('fade-in-visible');
                }
            });
        }, observerOptions);

        const blocks = document.querySelectorAll('.fade-in-block');
        blocks.forEach(block => observer.observe(block));

        return () => {
            blocks.forEach(block => observer.unobserve(block));
        };
    }, [showBlocks, fadeOutBlocks, showBlock4, fadeOutBlock4, selectedProgrammes.length]);

    // Apply fade-out class when needed
    useEffect(() => {
        if (fadeOutBlocks) {
            const blocks = document.querySelectorAll('.fade-in-block:not([data-block="4"])');
            blocks.forEach(block => {
                block.classList.remove('fade-in-visible');
                block.classList.add('fade-out');
            });
        }
    }, [fadeOutBlocks]);

    // Apply fade-out class for Block 4 when needed
    useEffect(() => {
        if (fadeOutBlock4) {
            const block4 = document.querySelector('.fade-in-block[data-block="4"]');
            if (block4) {
                block4.classList.remove('fade-in-visible');
                block4.classList.add('fade-out');
            }
        }
    }, [fadeOutBlock4]);

    // Helper function to get match level based on score comparison
    const getMatchLevel = (programme) => {
        if (!programme.median_score) return 'Unknown';

        const best5Score = dseScores
            .map(score => {
                const scoreValue = score.score === "5**" ? 7 :
                    score.score === "5*" ? 6 :
                        score.score === "5" ? 5 :
                            score.score === "4" ? 4 :
                                score.score === "3" ? 3 :
                                    score.score === "2" ? 2 :
                                        score.score === "1" ? 1 : 0;
                return scoreValue;
            })
            .sort((a, b) => b - a)
            .slice(0, 5)
            .reduce((sum, score) => sum + score, 0);

        const scoreDiff = best5Score - programme.median_score;

        if (scoreDiff >= 3) return 'High Match';
        if (scoreDiff >= 0) return 'Good Match';
        if (scoreDiff >= -2) return 'Borderline';
        return 'Low Match';
    };

    // Helper function to get match color
    const getMatchColor = (matchLevel) => {
        switch (matchLevel) {
            case 'High Match': return 'bg-green-200 text-green-800';
            case 'Good Match': return 'bg-blue-200 text-blue-800';
            case 'Borderline': return 'bg-yellow-200 text-yellow-800';
            case 'Low Match': return 'bg-red-200 text-red-800';
            default: return 'bg-gray-200 text-gray-800';
        }
    };

    const handleProgrammeSelect = (programme) => {
        // Check if programme is already selected
        const isAlreadySelected = selectedProgrammes.some(p => p.code === programme.code);
        if (!isAlreadySelected) {
            const newSelectedProgrammes = [...selectedProgrammes, programme];
            setSelectedProgrammes(newSelectedProgrammes);

            // Auto-save if user is authenticated (Block 3 operation)
            if (isAuthenticated) {
                saveProgrammeOrder(newSelectedProgrammes);
            }
        }
    };

    const handleRemoveProgramme = (programme) => {
        const newSelectedProgrammes = selectedProgrammes.filter(p => p.code !== programme.code);
        setSelectedProgrammes(newSelectedProgrammes);

        // Auto-save if user is authenticated (Block 3 operation)
        if (isAuthenticated) {
            saveProgrammeOrder(newSelectedProgrammes);
        }
    };

    // Drag and drop handlers
    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.target.classList.add('dragging');
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIndex(index);

        // Handle auto-scroll for mouse drag
        if (draggedIndex !== null) {
            handleAutoScroll(e.clientY);
        }
    };

    const handleDragLeave = (e) => {
        setDragOverIndex(null);
    };

    const handleDrop = (e, dropIndex) => {
        e.preventDefault();

        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        const newProgrammes = [...selectedProgrammes];
        const draggedProgramme = newProgrammes[draggedIndex];

        // Remove the dragged item
        newProgrammes.splice(draggedIndex, 1);

        // Insert at the new position
        newProgrammes.splice(dropIndex, 0, draggedProgramme);

        setSelectedProgrammes(newProgrammes);
        setDraggedIndex(null);
        setDragOverIndex(null);

        // Auto-save if user is authenticated (Block 4 operation)
        if (isAuthenticated) {
            saveBlock4ProgrammeOrder(newProgrammes);
        }
    };

    const handleDragEnd = (e) => {
        e.target.classList.remove('dragging');
        setDraggedIndex(null);
        setDragOverIndex(null);
        cleanupAutoScroll();
    };

    // Touch handlers for mobile drag and drop
    const [touchStartY, setTouchStartY] = useState(null);
    const [touchStartIndex, setTouchStartIndex] = useState(null);
    const [isDragging, setIsDragging] = useState(false);



    const handleTouchStart = (e, index) => {
        // Only handle touch on the main row container, not on interactive elements
        if (e.target.closest('button') || e.target.closest('a') || e.target.closest('[onClick]')) {
            return;
        }

        setTouchStartY(e.touches[0].clientY);
        setTouchStartIndex(index);
        setIsDragging(false);

        // Prevent text selection and scrolling
        e.preventDefault();
        e.stopPropagation();

        const rowElement = e.currentTarget;
        rowElement.style.userSelect = 'none';
        rowElement.style.webkitUserSelect = 'none';
        rowElement.style.mozUserSelect = 'none';
        rowElement.style.msUserSelect = 'none';

        // Add subtle visual feedback
        rowElement.style.transform = 'scale(0.98)';
        rowElement.style.transition = 'transform 0.1s ease';
    };

    const handleTouchMove = (e) => {
        if (touchStartIndex === null) return;

        const touchY = e.touches[0].clientY;
        const deltaY = Math.abs(touchY - touchStartY);

        // Start dragging if moved more than 8px (more sensitive)
        if (deltaY > 8 && !isDragging) {
            setIsDragging(true);
            setDraggedIndex(touchStartIndex);
            const rowElement = document.querySelector(`[data-index="${touchStartIndex}"]`);
            if (rowElement) {
                rowElement.classList.add('dragging');
                // Add haptic feedback if available
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            }

            // Prevent scrolling on the entire document during drag
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none';
        }

        if (isDragging) {
            // Prevent scrolling while dragging
            e.preventDefault();
            e.stopPropagation();

            // Update drag-over index for visual feedback (same logic as mouse drag)
            const dropIndex = findDropIndex(touchY);
            if (dropIndex !== null && dropIndex !== draggedIndex) {
                setDragOverIndex(dropIndex);
            } else {
                setDragOverIndex(null);
            }

            // Handle auto-scroll
            handleAutoScroll(touchY);
        }
    };

    const handleTouchEnd = (e) => {
        if (touchStartIndex === null) return;

        if (isDragging) {
            // Find the drop target based on touch position
            const touchY = e.changedTouches[0].clientY;
            const dropIndex = findDropIndex(touchY);

            if (dropIndex !== null && dropIndex !== touchStartIndex) {
                // Perform the drop
                const newProgrammes = [...selectedProgrammes];
                const draggedProgramme = newProgrammes[touchStartIndex];

                // Remove the dragged item
                newProgrammes.splice(touchStartIndex, 1);

                // Insert at the new position
                newProgrammes.splice(dropIndex, 0, draggedProgramme);

                setSelectedProgrammes(newProgrammes);

                // Auto-save if user is authenticated (Block 4 operation)
                if (isAuthenticated) {
                    saveBlock4ProgrammeOrder(newProgrammes);
                }
            }

            // Clean up
            const rowElement = document.querySelector(`[data-index="${touchStartIndex}"]`);
            if (rowElement) {
                rowElement.classList.remove('dragging');
            }
            setDraggedIndex(null);
            setDragOverIndex(null);
        }

        // Reset touch state
        setTouchStartY(null);
        setTouchStartIndex(null);
        setIsDragging(false);

        // Cleanup auto-scroll
        cleanupAutoScroll();

        // Re-enable scrolling and text selection
        document.body.style.overflow = '';
        document.body.style.touchAction = '';

        // Re-enable text selection and reset visual feedback
        const rowElement = e.currentTarget;
        if (rowElement) {
            rowElement.style.userSelect = '';
            rowElement.style.webkitUserSelect = '';
            rowElement.style.mozUserSelect = '';
            rowElement.style.msUserSelect = '';
            rowElement.style.transform = '';
            rowElement.style.transition = '';
        }
    };

    const findDropIndex = (touchY) => {
        const rows = document.querySelectorAll('.draggable-row');
        for (let i = 0; i < rows.length; i++) {
            const rect = rows[i].getBoundingClientRect();
            if (touchY >= rect.top && touchY <= rect.bottom) {
                return i;
            }
        }
        return null;
    };

    // Auto-scroll function
    const handleAutoScroll = (clientY) => {
        // Find the container that holds the draggable items
        const container = document.body;
        if (!container) return;

        const viewportHeight = window.innerHeight;
        const scrollThreshold = window.innerHeight * 0.1; // 10% of window height
        const scrollSpeed = 60; // pixels per frame

        let newDirection = null;

        // Check if cursor is in top 10% of window
        if (clientY < scrollThreshold * 2) {
            newDirection = 'up';
            console.log('up');
            container.scrollBy(0, -scrollSpeed);
        }
        // Check if cursor is in bottom 10% of window
        else if (clientY > viewportHeight - scrollThreshold * 1.5) {
            newDirection = 'down';
            console.log('down');
            container.scrollBy(0, scrollSpeed);
        }

        // Scroll immediately when direction is detected
        if (newDirection) {
            console.log('scrollstart');
            container.classList.add('auto-scroll-active');
        } else {
            container.classList.remove('auto-scroll-active');
        }
    };

    // Cleanup auto-scroll
    const cleanupAutoScroll = () => {
        document.body.classList.remove('auto-scroll-active');
        console.log('scrollstop');

        // Re-enable scrolling
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
    };

    // Handle Chat with Eddy button click
    const handleChatWithEddy = async () => {
        try {
            setIsCreatingChat(true);
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            // Get current language for localized messages
            const currentLanguage = i18n.language || 'en';

            // Prepare programme list in order (from saved data - matches UI)
            const programmeList = selectedProgrammes.map((programme, index) => {
                const band = index < 3 ? 'Band A' : index < 6 ? 'Band B' : 'Additional';
                return `${index + 1}. ${programme.code} - ${programme.full_title_en} (${t(`jupa.institutions.${getInstitutionKey(programme.institution)}`, { defaultValue: programme.institution })}) [${band}]`;
            }).join('\n');

            // Calculate scores from the same DSE data that's displayed in UI
            const calculatedScores = calculateScores(dseScores);

            // Prepare score information (using calculated scores that match UI display)
            const scoreInfo = `DSE Scores:
- Total Score: ${calculatedScores.totalScore}
- Best 6 Subjects: ${calculatedScores.best6Score}
- Best 5 Subjects: ${calculatedScores.best5Score}
- Core Subjects: ${calculatedScores.coreScore}

Competitiveness:
- Top Programmes: ${calculatedScores.topProgrammes}%
- Competitive Programmes: ${calculatedScores.competitiveProgrammes}%
- Safety Programmes: ${calculatedScores.safetyProgrammes}%`;

            // Create language-specific initial message
            let initialMessage = '';
            switch (currentLanguage) {
                case 'tc':
                    initialMessage = `我想同愛迪生討論我嘅聯招課程選擇同埋攞建議。

${scoreInfo}

我嘅聯招課程列表（按順序）：
${programmeList}

請幫我檢視我嘅課程選擇同埋提供聯招申請策略嘅指導。`;
                    break;
                case 'sc':
                    initialMessage = `嗨！我想和爱迪生讨论我的联招课程选择并获取建议。

${scoreInfo}

我的联招课程列表（按顺序）：
${programmeList}

请帮我检视我的课程选择并提供联招申请策略的指导。`;
                    break;
                case 'en':
                default:
                    initialMessage = `I'd like to discuss my JUPAS programme selection and get advice on my choices.

${scoreInfo}

My JUPAS Programme List (in order):
${programmeList}

Please help me review my programme choices and provide guidance on my JUPAS application strategy.`;
                    break;
            }

            // Debug: Log the complete prompt being sent to Eddy
            // console.log('🎯 Eddy Chat Prompt Debug:');
            // console.log('📊 DSE Scores:', calculatedScores);
            // console.log('📋 Programme List:', programmeList);
            // console.log('💬 Complete Initial Message:', initialMessage);

            // Create a new chat
            const chatResponse = await fetch('/api/chat/create', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    User_ID: currentUser.User_ID,
                    initial_message: initialMessage
                })
            });

            if (!chatResponse.ok) {
                throw new Error('Failed to create chat');
            }

            const chatData = await chatResponse.json();

            // Generate language-specific initial response prompt
            let responsePrompt = '';
            switch (currentLanguage) {
                case 'tc':
                    responsePrompt = "請分析我嘅聯招課程選擇同埋提供個人化建議，包括改進建議同埋你可能會有嘅疑慮。";
                    break;
                case 'sc':
                    responsePrompt = "请分析我的联招课程选择并提供个性化建议，包括改进建议以及你可能有的疑虑。";
                    break;
                case 'en':
                default:
                    responsePrompt = "Please analyze my JUPAS programme choices and provide personalized advice on my application strategy, including suggestions for improvement and any concerns you might have.";
                    break;
            }

            // Generate initial response from chatbot
            const messageResponse = await fetch(`/api/chat/${chatData.Chat_ID}/message`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    Text: responsePrompt,
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
            setIsCreatingChat(false);
        }
    };

    // Handle classification level change
    const handleClassificationLevelChange = (newLevel) => {
        setSelectedClassificationLevel(newLevel);
        // Clear cache to force refetch with new classification level
        setRecommendationsCache({});
        setLastScoresHash('');
    };

    // Handle number of recommendations change
    const handleNumberOfRecommendationsChange = (newNumber) => {
        setSelectedNumberOfRecommendations(newNumber);
        // Clear cache to force refetch with new number of recommendations
        setRecommendationsCache({});
        setLastScoresHash('');
    };

    // Get sorted programmes for Block 3 (alphabetical order)
    const getSortedProgrammesForBlock3 = () => {
        return [...selectedProgrammes].sort((a, b) => a.code.localeCompare(b.code));
    };

    const [tooltipInfo, setTooltipInfo] = useState({ visible: false, code: null, left: 0, top: 0, direction: 'above' });
    const classificationRefs = useRef({});
    const [tooltipHeight, setTooltipHeight] = useState(0);
    const tooltipRef = useRef();

    const handleTooltipShow = (code) => {
        const ref = classificationRefs.current[code];
        if (ref) {
            const rect = ref.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const direction = rect.top < viewportHeight * 0.4 ? 'below' : 'above';
            setTooltipInfo({
                visible: true,
                code,
                left: rect.left + rect.width / 2,
                top: direction === 'below' ? rect.bottom : rect.top,
                direction
            });
        }
    };
    const handleTooltipHide = () => setTooltipInfo({ visible: false, code: null, left: 0, top: 0, direction: 'above' });

    useEffect(() => {
        if (tooltipInfo.visible && tooltipRef.current) {
            setTooltipHeight(tooltipRef.current.offsetHeight);
        }
    }, [tooltipInfo.visible, tooltipInfo.code, tooltipInfo.left, tooltipInfo.top, tooltipInfo.direction]);

    useEffect(() => {
        if (!tooltipInfo.visible) return;
        const updatePosition = () => {
            const ref = classificationRefs.current[tooltipInfo.code];
            if (ref) {
                const rect = ref.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const direction = rect.top < viewportHeight * 0.4 ? 'below' : 'above';
                setTooltipInfo(info => ({
                    ...info,
                    left: rect.left + rect.width / 2,
                    top: direction === 'below' ? rect.bottom : rect.top,
                    direction
                }));
            }
        };
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [tooltipInfo.visible, tooltipInfo.code]);

    const [badgeTooltip, setBadgeTooltip] = useState({ visible: false, content: '', left: 0, top: 0, direction: 'above' });
    const badgeTooltipRef = useRef();

    const onBadgeTooltipShow = (content, ref) => {
        if (ref && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            // Use 20% threshold for badge tooltips
            const direction = rect.top < viewportHeight * 0.2 ? 'below' : 'above';
            setBadgeTooltip({
                visible: true,
                content,
                left: rect.left + rect.width / 2,
                top: direction === 'below' ? rect.bottom : rect.top,
                direction
            });
        }
    };
    const onBadgeTooltipHide = () => setBadgeTooltip({ visible: false, content: '', left: 0, top: 0, direction: 'above' });

    // Use loading scroll reset hook for programme recommendations loading
    useLoadingScrollReset({
        isLoading: loading,
        behavior: 'smooth',
        delay: 200,
        enabled: true
    });

    // Cleanup auto-scroll on unmount
    useEffect(() => {
        return () => {
            cleanupAutoScroll();
        };
    }, []);

    // Add global touch event listeners to prevent scrolling during drag
    useEffect(() => {
        const preventScroll = (e) => {
            // Only prevent if we're actually dragging and not on interactive elements
            if ((isDragging || draggedIndex !== null) &&
                !e.target.closest('button') &&
                !e.target.closest('a') &&
                !e.target.closest('[onClick]')) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        // Use passive: false to allow preventDefault
        document.addEventListener('touchmove', preventScroll, { passive: false });

        return () => {
            document.removeEventListener('touchmove', preventScroll);
        };
    }, [isDragging, draggedIndex]);

    return (
        <div id="jupaselect-container" className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">{t('jupa.title')}</h1>
                    {availableCollections.length > 0 && selectedCollection && (
                        <div className="flex items-center space-x-2">
                            <label htmlFor="collection-select" className="text-sm font-medium text-gray-700">
                                {t('jupa.programmeYear')}
                            </label>
                            <select
                                id="collection-select"
                                value={selectedCollection}
                                onChange={(e) => handleCollectionChange(e.target.value)}
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {availableCollections.map((collection) => (
                                    <option key={collection} value={collection}>
                                        {collection.replace('Programmes_', '').replace('programmes_', '')}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    {!serviceInitialized && (
                        <div className="flex items-center space-x-2">
                            <LoadingSpinner size="small" />
                            <span className="text-sm text-gray-600">{t('jupa.initializing')}</span>
                        </div>
                    )}
                </div>

                {/* First block - DSE Score Input */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <DSEScoreInputer onScoresChange={handleScoresChange} />
                </div>

                {/* Second block - Admission Statistics */}
                {showBlocks && (
                    <div className="fade-in-block bg-white rounded-lg shadow-md p-6 mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('jupa.admissionStatistics')}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('jupa.yourScoreAnalysis')}</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                        <span className="text-gray-700">{t('jupa.totalScore')}</span>
                                        <span className="font-semibold text-gray-900 score-counter">
                                            {animatedScores.totalScore}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                        <span className="text-gray-700">{t('jupa.best6Subjects')}</span>
                                        <span className="font-semibold text-gray-900 score-counter">
                                            {animatedScores.best6Score}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                        <span className="text-gray-700">{t('jupa.best5Subjects')}</span>
                                        <span className="font-semibold text-gray-900 score-counter">
                                            {animatedScores.best5Score}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                        <span className="text-gray-700">{t('jupa.coreSubjects')}</span>
                                        <span className="font-semibold text-gray-900 score-counter">
                                            {animatedScores.coreScore}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('jupa.competitiveness')}</h3>
                                <div className="space-y-3">
                                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-yellow-800 font-medium">{t('jupa.topProgrammes')}</span>
                                            <span className="text-yellow-600 text-sm score-counter">
                                                {animatedScores.topProgrammes}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-yellow-200 rounded-full h-2">
                                            <div
                                                className="bg-yellow-500 h-2 rounded-full progress-bar"
                                                style={{
                                                    width: `${animatedScores.topProgrammes}%`
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-green-800 font-medium">{t('jupa.competitiveProgrammes')}</span>
                                            <span className="text-green-600 text-sm score-counter">
                                                {animatedScores.competitiveProgrammes}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-green-200 rounded-full h-2">
                                            <div
                                                className="bg-green-500 h-2 rounded-full progress-bar"
                                                style={{
                                                    width: `${animatedScores.competitiveProgrammes}%`
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-blue-800 font-medium">{t('jupa.safetyProgrammes')}</span>
                                            <span className="text-blue-600 text-sm score-counter">
                                                {animatedScores.safetyProgrammes}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-blue-200 rounded-full h-2">
                                            <div
                                                className="bg-blue-500 h-2 rounded-full progress-bar"
                                                style={{
                                                    width: `${animatedScores.safetyProgrammes}%`
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Third block - Program Selector */}
                {showBlocks && (
                    <div className="fade-in-block bg-white rounded-lg shadow-md p-6 mb-4">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('jupa.programSelector')}</h2>

                        {/* Search Subsection */}
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('jupa.searchProgrammes')}</h3>
                            <ProgrammeSearch
                                selectedCollection={selectedCollection}
                                onProgrammeSelect={handleProgrammeSelect}
                                selectedProgrammesCount={selectedProgrammes.length}
                                onInstitutionsChange={handleInstitutionsChange}
                                selectedInstitutions={selectedInstitutions}
                            />
                        </div>

                        {/* Recommendations Subsection */}
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('jupa.programmeRecommendations')}</h3>

                            {/* Classification Level and Number of Recommendations Dropdowns */}
                            <div className="flex justify-between items-center mb-4">
                                <div className="text-sm text-gray-600">
                                    {t('jupa.generalRecommendations', { count: programmes.length })}
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <label htmlFor="number-of-recommendations" className="text-sm text-gray-600 font-medium">
                                            {t('jupa.numberOfRecommendations')}:
                                        </label>
                                        <select
                                            id="number-of-recommendations"
                                            value={selectedNumberOfRecommendations}
                                            onChange={(e) => handleNumberOfRecommendationsChange(parseInt(e.target.value))}
                                            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            {[6, 12, 18, 24, 30].map(number => (
                                                <option key={number} value={number}>
                                                    {number}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <label htmlFor="classification-level" className="text-sm text-gray-600 font-medium">
                                            {t('jupa.recommendationLevel')}:
                                        </label>
                                        <select
                                            id="classification-level"
                                            value={selectedClassificationLevel}
                                            onChange={(e) => handleClassificationLevelChange(parseInt(e.target.value))}
                                            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            {[
                                                { value: 8, label: t('jupa.classificationBadges.goldenTicket') },
                                                { value: 7, label: t('jupa.classificationBadges.secure') },
                                                { value: 6, label: t('jupa.classificationBadges.verySafe') },
                                                { value: 5, label: t('jupa.classificationBadges.safe') },
                                                { value: 4, label: t('jupa.classificationBadges.moderate') },
                                                { value: 3, label: t('jupa.classificationBadges.risky') },
                                                { value: 2, label: t('jupa.classificationBadges.veryRisky') },
                                                { value: 1, label: t('jupa.classificationBadges.dangerous') },
                                                { value: 0, label: t('jupa.classificationBadges.missionImpossible') }
                                            ].map(level => (
                                                <option key={level.value} value={level.value}>
                                                    {level.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {loading && (
                                <div className="text-center py-8">
                                    <LoadingSpinner size="medium" text={t('jupa.loadingProgrammeRecommendations')} showText={true} />
                                </div>
                            )}

                            {error && (
                                <div className="text-center py-8">
                                    <p className="text-red-600">{error}</p>
                                    <button
                                        onClick={() => fetchProgrammeRecommendations(dseScores)}
                                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                    >
                                        {t('jupa.retry')}
                                    </button>
                                </div>
                            )}

                            {!loading && !error && (
                                <ProgrammeRecommendations
                                    recommendedProgrammes={programmes}
                                    selectedProgrammes={selectedProgrammes}
                                    onAddProgramme={handleProgrammeSelect}
                                    onBadgeTooltipShow={onBadgeTooltipShow}
                                    onBadgeTooltipHide={onBadgeTooltipHide}
                                />
                            )}
                        </div>

                        {/* My Selection Subsection - Hidden as redundant with Block 4 */}
                        {/* <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-800">{t('jupa.mySelection')}</h3>
                                {isAuthenticated && (
                                    <div className="flex items-center space-x-2">
                                        {isSaving && (
                                            <div className="text-sm text-gray-500">{t('jupa.saving')}</div>
                                        )}
                                        {saveStatus && (
                                            <div className={`text-sm ${saveStatus.includes('Failed') ? 'text-red-500' : 'text-green-500'}`}>
                                                {saveStatus}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <MySelection
                                selectedProgrammes={getSortedProgrammesForBlock3()}
                                onRemoveProgramme={handleRemoveProgramme}
                                onBadgeTooltipShow={onBadgeTooltipShow}
                                onBadgeTooltipHide={onBadgeTooltipHide}
                            />
                        </div> */}
                    </div>
                )}

                {/* Fourth block - JUPAS Ordering */}
                {showBlock4 && (
                    <div className="fade-in-block z-50" data-block="4" style={{ minHeight: fadeOutBlock4 ? '0' : 'auto' }}>
                        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-gray-900">{t('jupa.jupasProgrammeOrdering')}</h2>
                                {isAuthenticated && (
                                    <div className="flex items-center space-x-2">
                                        {isBlock4Saving && (
                                            <div className="text-sm text-gray-500">{t('jupa.saving')}</div>
                                        )}
                                        {block4SaveStatus && (
                                            <div className={`text-sm ${block4SaveStatus.includes('Failed') ? 'text-red-500' : 'text-green-500'}`}>
                                                {block4SaveStatus}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <p className="text-gray-600 mb-6">
                                {t('jupa.dragAndDropInstructions')}
                            </p>

                            <div className="overflow-x-auto">
                                <div className="space-y-3 w-full min-w-0">
                                    {selectedProgrammes.map((programme, index) => {
                                        const isBandA = index < 3;
                                        const isBandB = index >= 3 && index < 6;
                                        const bandClass = isBandA ? 'band-a' : isBandB ? 'band-b' : '';
                                        const bandLabel = isBandA ? t('jupa.bandA') : isBandB ? t('jupa.bandB') : '';

                                        // Get classification data
                                        const classificationData = programmeClassifications[programme.code];
                                        const classification = classificationData?.classification ?? -1;
                                        const classificationText = isLoadingClassifications ? t('common.loading') : getClassificationBadgeText(classification);

                                        // Get latest application and offer statistics (2024 data)
                                        const latestApplyStats = programme.stats_apply?.[0];
                                        const latestOfferStats = programme.stats_offer?.[0];

                                        // Calculate offer rates for each band
                                        const bandAOffers = latestOfferStats?.[1] || 0;
                                        const bandAApplicants = latestApplyStats?.[1] || 0;
                                        const bandAOfferRate = bandAApplicants > 0 ? ((bandAOffers / bandAApplicants) * 100).toFixed(1) : 0;

                                        const bandBOffers = latestOfferStats?.[2] || 0;
                                        const bandBApplicants = latestApplyStats?.[2] || 0;
                                        const bandBOfferRate = bandBApplicants > 0 ? ((bandBOffers / bandBApplicants) * 100).toFixed(1) : 0;

                                        return (
                                            <div
                                                key={programme.code}
                                                data-index={index}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, index)}
                                                onDragOver={(e) => handleDragOver(e, index)}
                                                onDragLeave={handleDragLeave}
                                                onDrop={(e) => handleDrop(e, index)}
                                                onDragEnd={handleDragEnd}
                                                onTouchStart={(e) => handleTouchStart(e, index)}
                                                onTouchMove={handleTouchMove}
                                                onTouchEnd={handleTouchEnd}
                                                className={`draggable-row w-full min-w-0 p-4 rounded-lg border border-gray-200 ${bandClass} ${dragOverIndex === index ? 'drag-over' : ''}`}
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 w-full min-w-0">
                                                    {/* First row: Banding/number */}
                                                    <div className="flex items-center space-x-4 flex-shrink-0">
                                                        <div className="flex items-center space-x-3">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${isBandA
                                                                ? 'bg-pink-200 text-pink-800'
                                                                : isBandB
                                                                    ? 'bg-orange-200 text-orange-800'
                                                                    : 'bg-gray-200 text-gray-600'
                                                                }`}>
                                                                {index + 1}
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                {bandLabel && (
                                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${isBandA
                                                                        ? 'bg-pink-100 text-pink-800 border border-pink-200'
                                                                        : 'bg-orange-100 text-orange-800 border border-orange-200'
                                                                        }`}>
                                                                        {bandLabel}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Second row: Programme info (badges) */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2 mb-1 min-w-0">
                                                            <span className="font-bold text-blue-600 text-base md:text-lg truncate break-words">{programme.code}</span>
                                                            {programme.short_name && (() => {
                                                                const shortNameRef = React.createRef();
                                                                return (
                                                                    <span
                                                                        ref={shortNameRef}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (programme.url) {
                                                                                window.open(programme.url, '_blank', 'noopener,noreferrer');
                                                                            }
                                                                        }}
                                                                        onMouseEnter={() => programme.url && onBadgeTooltipShow(t('common.clickToView'), shortNameRef)}
                                                                        onMouseLeave={onBadgeTooltipHide}
                                                                        onFocus={() => programme.url && onBadgeTooltipShow(t('common.clickToView'), shortNameRef)}
                                                                        onBlur={onBadgeTooltipHide}
                                                                        className={`text-xs md:text-sm px-2 py-1 rounded cursor-pointer transition-colors ${programme.url
                                                                            ? 'hover:bg-red-100 hover:text-red-700 border border-transparent hover:border-red-300'
                                                                            : ''
                                                                            } ${isBandA
                                                                                ? 'bg-pink-200 text-pink-800'
                                                                                : isBandB
                                                                                    ? 'bg-orange-200 text-orange-800'
                                                                                    : 'bg-gray-200 text-gray-600'
                                                                            }`}>
                                                                        {programme.short_name}
                                                                    </span>
                                                                );
                                                            })()}
                                                            {/* Duration Badge */}
                                                            {programme.duration && (() => {
                                                                const durationNumber = getDurationNumber(programme.duration);
                                                                const durationRef = React.createRef();
                                                                return durationNumber && (
                                                                    <span
                                                                        ref={durationRef}
                                                                        className={`text-xs md:text-sm px-2 py-1 rounded border ${isBandA
                                                                            ? 'bg-pink-100 text-pink-800 border-pink-200'
                                                                            : isBandB
                                                                                ? 'bg-orange-100 text-orange-800 border-orange-200'
                                                                                : 'bg-gray-100 text-gray-800 border-gray-200'
                                                                            }`}
                                                                        onMouseEnter={() => onBadgeTooltipShow(t('jupa.durationBadgeTooltip'), durationRef)}
                                                                        onMouseLeave={onBadgeTooltipHide}
                                                                        onFocus={() => onBadgeTooltipShow(t('jupa.durationBadgeTooltip'), durationRef)}
                                                                        onBlur={onBadgeTooltipHide}
                                                                    >
                                                                        {durationNumber}
                                                                    </span>
                                                                );
                                                            })()}
                                                            {/* Interview Badge */}
                                                            {(() => {
                                                                const interviewInfo = getInterviewInfo(programme);
                                                                if (!interviewInfo) return null;

                                                                const interviewRef = React.createRef();
                                                                return (
                                                                    <span
                                                                        ref={interviewRef}
                                                                        className={`text-xs md:text-sm px-2 py-1 rounded border ${isBandA
                                                                            ? 'bg-pink-100 text-pink-800 border-pink-200'
                                                                            : isBandB
                                                                                ? 'bg-orange-100 text-orange-800 border-orange-200'
                                                                                : 'bg-purple-100 text-purple-700 border-purple-200'
                                                                            }`}
                                                                        onMouseEnter={() => interviewInfo.showTooltip && onBadgeTooltipShow(interviewInfo.details, interviewRef)}
                                                                        onMouseLeave={onBadgeTooltipHide}
                                                                        onFocus={() => interviewInfo.showTooltip && onBadgeTooltipShow(interviewInfo.details, interviewRef)}
                                                                        onBlur={onBadgeTooltipHide}
                                                                    >
                                                                        {t('jupa.interview')}
                                                                    </span>
                                                                );
                                                            })()}
                                                            {Array.isArray(programme.stats_offer) && programme.stats_offer.length === 0 && (() => {
                                                                const badgeRef = React.createRef();
                                                                const tooltipContent = t('jupa.newProgrammeTooltip', {
                                                                    lower:
                                                                        programme.new_prog === 'No Estimation' ? t('jupa.newProgrammeLowerNoEstimation') :
                                                                            programme.new_prog === 'By Restructure' ? t('jupa.newProgrammeLowerByRestructure') :
                                                                                programme.new_prog === 'By Expected Score' ? t('jupa.newProgrammeLowerByExpectedScore') :
                                                                                    programme.new_prog === 'By Similar Programme' ? t('jupa.newProgrammeLowerBySimilarProgramme') :
                                                                                        ''
                                                                });
                                                                return (
                                                                    <span
                                                                        ref={badgeRef}
                                                                        className="text-xs text-white bg-blue-500 px-2 py-1 rounded"
                                                                        onMouseEnter={() => onBadgeTooltipShow(tooltipContent, badgeRef)}
                                                                        onMouseLeave={onBadgeTooltipHide}
                                                                        onFocus={() => onBadgeTooltipShow(tooltipContent, badgeRef)}
                                                                        onBlur={onBadgeTooltipHide}
                                                                    >
                                                                        {t('jupa.newProgrammeBadge')}
                                                                    </span>
                                                                );
                                                            })()}
                                                            {Array.isArray(programme.stats_offer) && programme.stats_offer[0] && programme.stats_offer[0][2] === 0 && (index >= 3 && index <= 5) && (() => {
                                                                const badgeRef = React.createRef();
                                                                const tooltipContent = t('jupa.noBandBOfferTooltip');
                                                                return (
                                                                    <span
                                                                        ref={badgeRef}
                                                                        className="text-xs text-yellow-900 bg-yellow-200 px-2 py-1 rounded border border-yellow-400"
                                                                        onMouseEnter={() => onBadgeTooltipShow(tooltipContent, badgeRef)}
                                                                        onMouseLeave={onBadgeTooltipHide}
                                                                        onFocus={() => onBadgeTooltipShow(tooltipContent, badgeRef)}
                                                                        onBlur={onBadgeTooltipHide}
                                                                    >
                                                                        {t('jupa.noBandBOfferBadge')}
                                                                    </span>
                                                                );
                                                            })()}
                                                            {/* Classification score */}
                                                            <div
                                                                className="relative group flex items-center z-50"
                                                                ref={el => classificationRefs.current[programme.code] = el}
                                                                onMouseEnter={() => handleTooltipShow(programme.code)}
                                                                onMouseLeave={handleTooltipHide}
                                                                onFocus={() => handleTooltipShow(programme.code)}
                                                                onBlur={handleTooltipHide}
                                                            >
                                                                <span className={`px-2 py-1 rounded text-xs font-medium cursor-help border ${getClassificationColor(classification)}`}>
                                                                    {classificationText}
                                                                </span>
                                                            </div>

                                                        </div>
                                                        <div className="text-sm text-gray-800 mb-1 break-words mt-2 sm:mt-0">
                                                            {programme.full_title_en}
                                                        </div>
                                                        {programme.full_title_cn && (
                                                            <div className="text-sm text-gray-600 mb-1 break-words">
                                                                {programme.full_title_cn}
                                                            </div>
                                                        )}
                                                        <div className="text-xs text-gray-500 break-words">
                                                            {t(`jupa.institutions.${getInstitutionKey(programme.institution)}`, { defaultValue: programme.institution })}
                                                        </div>
                                                    </div>
                                                    {/* Third row: Action buttons */}
                                                    <div className="flex items-center justify-between sm:justify-end space-x-2 w-full sm:w-auto mt-2 sm:mt-0">
                                                        <div className={`${isBandA ? 'text-pink-500' : isBandB ? 'text-orange-500' : 'text-gray-400'} flex items-center space-x-2`}>
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                                            </svg>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveProgramme(programme)}
                                                            className={`font-medium text-sm px-2 py-1 rounded transition-colors w-full sm:w-auto mt-2 sm:mt-0 ${isBandA
                                                                ? 'text-pink-600 hover:text-pink-800 hover:bg-pink-50'
                                                                : isBandB
                                                                    ? 'text-orange-600 hover:text-orange-800 hover:bg-orange-50'
                                                                    : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                                                                }`}
                                                            title={t('common.removeFromSelection')}
                                                        >
                                                            {t('jupa.remove')}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                    <div>
                                        <p className="text-sm text-blue-800">
                                            <span className="font-semibold">{selectedProgrammes.length}</span> {t('jupa.programmesOnMockJupasList', { count: selectedProgrammes.length !== 1 ? 's' : '' })}
                                        </p>
                                        <p className="text-xs text-blue-600 mt-1">
                                            {selectedProgrammes.length >= 3 ? t('jupa.bandAFirst3Programmes') : t('jupa.addMoreProgrammesForBandA')} •
                                            {selectedProgrammes.length >= 6 ? ` ${t('jupa.bandBNext3Programmes')}` : ` ${t('jupa.addMoreProgrammesForBandB')}`}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-blue-600">
                                            {t('jupa.dragToReorderHint')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Fifth block - Completion Message */}
                {selectedProgrammes.length >= 6 && (
                    <div className="fade-in-block bg-white rounded-lg shadow-md p-6 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-1">{t('jupa.completionMessage')}</h2>
                            </div>
                            {/* isAuthenticated && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Still unsure? Ask Eddy!</h3>
                                    <button
                                        onClick={handleChatWithEddy}
                                        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                                    >
                                        Chat with Eddy about this
                                    </button>
                                </div>
                            ) */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('jupa.spottedProblem')}</h3>
                                <button
                                    onClick={() => setShowContactForm(true)}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                                >
                                    {t('help.contactButton')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {
                isCreatingChat && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
                            <div className="flex flex-col items-center">
                                <LoadingSpinner size="large" className="mb-4" />
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">{t('common.creatingYourChat')}</h3>
                                <p className="text-gray-600 text-center">Please wait while we set up your conversation with Eddy...</p>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Portal Tooltip */}
            {tooltipInfo.visible && tooltipInfo.code && createPortal(
                <div
                    ref={tooltipRef}
                    className={`fixed px-3 py-2 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap z-[9999] min-w-max transition-opacity duration-200 pointer-events-none`}
                    style={{
                        left: tooltipInfo.left,
                        top: tooltipInfo.direction === 'below'
                            ? tooltipInfo.top + 8
                            : tooltipInfo.top - tooltipHeight - 8,
                        transform: 'translateX(-50%)',
                        opacity: 1
                    }}
                >
                    <div className="font-semibold mb-1">{t('jupa.tooltipTitle', { code: tooltipInfo.code })}</div>
                    <div className="space-y-1">
                        {/* Classification Section */}
                        {(() => {
                            const programme = selectedProgrammes.find(p => p.code === tooltipInfo.code);
                            const classificationData = programmeClassifications[tooltipInfo.code];
                            if (!programme || !classificationData) return null;
                            return (
                                <>
                                    <div className="border-b border-gray-700 pb-1 mb-1">
                                        <div className="font-semibold">
                                            {isLoadingClassifications
                                                ? t('jupa.yourScore', { score: t('common.loading') })
                                                : (classificationData?.user_score === null || classificationData?.user_score === undefined)
                                                    ? t('jupa.yourScore', { score: t('jupa.requirementNotMet') })
                                                    : t('jupa.yourScore', { score: classificationData?.user_score })}
                                        </div>
                                        <div className="text-xs">
                                            {(() => {
                                                const classification = classificationData?.classification;
                                                const userScore = classificationData?.user_score;
                                                const uq = programme.score_uq;
                                                const md = programme.score_md;
                                                const lq = programme.score_lq;

                                                // Get color for the explanation text based on classification
                                                const getExplanationColor = (classification) => {
                                                    switch (classification) {
                                                        case 8: return 'text-green-300'; // Secure
                                                        case 7: return 'text-green-300'; // Very Safe
                                                        case 6: return 'text-green-300'; // Safe
                                                        case 5: return 'text-yellow-300'; // Basically Safe
                                                        case 4: return 'text-yellow-300'; // Moderate
                                                        case 3: return 'text-orange-300'; // Risky
                                                        case 2: return 'text-red-300'; // Very Risky
                                                        case 1: return 'text-red-300'; // Dangerous
                                                        case 0: return 'text-red-300'; // Mission Impossible
                                                        default: return 'text-gray-300';
                                                    }
                                                };

                                                const explanationColor = getExplanationColor(classification);

                                                switch (classification) {
                                                    case 8: return <span className={explanationColor}>{t('jupa.classification8', { score: userScore, uq: uq })}</span>;
                                                    case 7: return <span className={explanationColor}>{t('jupa.classification7', { score: userScore, uq: uq })}</span>;
                                                    case 6: return <span className={explanationColor}>{t('jupa.classification6', { score: userScore, md: md, uq: uq })}</span>;
                                                    case 5: return <span className={explanationColor}>{t('jupa.classification5', { score: userScore, md: md })}</span>;
                                                    case 4: return <span className={explanationColor}>{t('jupa.classification4', { score: userScore, lq: lq, md: md })}</span>;
                                                    case 3: return <span className={explanationColor}>{t('jupa.classification3', { score: userScore, md: md })}</span>;
                                                    case 2: return <span className={explanationColor}>{t('jupa.classification2', { score: userScore, lq: lq })}</span>;
                                                    case 1: return <span className={explanationColor}>{t('jupa.classification1', { score: userScore, lq: lq })}</span>;
                                                    case 0: return <span className={explanationColor}>{t('jupa.classification0')}</span>;
                                                    default: return <span className="text-gray-300">{t('jupa.classificationUnknown')}</span>;
                                                }
                                            })()}
                                        </div>
                                    </div>
                                    {/* Score Statistics Section */}
                                    <div className="border-b border-gray-700 pb-1 mb-1">
                                        <div className="font-semibold">{t('jupa.scoreStatistics')}</div>
                                        {programme.score_uq && (
                                            <div>{t('jupa.upperQuartile', { score_uq: programme.score_uq })}</div>
                                        )}
                                        {programme.score_md && (
                                            <div>{t('jupa.medianScore', { score_md: programme.score_md })}</div>
                                        )}
                                        {programme.score_lq && (
                                            <div>{t('jupa.lowerQuartile', { score_lq: programme.score_lq })}</div>
                                        )}
                                    </div>
                                    {/* Application Statistics */}
                                    {programme.stats_apply?.[0] && (
                                        <div className="border-b border-gray-700 pb-1 mb-1">
                                            <div className="font-semibold">{t('jupa.applications2024')}</div>
                                            <div>{t('jupa.bandAtt', { num: programme.stats_apply[0][1] || 0 })}</div>
                                            <div>{t('jupa.bandBtt', { num: programme.stats_apply[0][2] || 0 })}</div>
                                            <div>{t('jupa.total', { num: programme.stats_apply[0][6] || 0 })}</div>
                                        </div>
                                    )}
                                    {/* Offer Statistics */}
                                    {programme.stats_offer?.[0] && (
                                        <div className="border-b border-gray-700 pb-1 mb-1">
                                            <div className="font-semibold">{t('jupa.offers2024')}</div>
                                            <div>{t('jupa.bandAtt', { num: `${programme.stats_offer[0][1] || 0} (${((programme.stats_offer[0][1] || 0) / (programme.stats_apply?.[0]?.[1] || 1) * 100).toFixed(1)}%)` })}</div>
                                            <div>{t('jupa.bandBtt', { num: `${programme.stats_offer[0][2] || 0} (${((programme.stats_offer[0][2] || 0) / (programme.stats_apply?.[0]?.[2] || 1) * 100).toFixed(1)}%)` })}</div>
                                            <div>{t('jupa.total', { num: programme.stats_offer[0][6] || 0 })}</div>
                                        </div>
                                    )}
                                    {/* Intake Information */}
                                    {programme.intake && (
                                        <div>
                                            <div className="font-semibold">{t('jupa.intake')}</div>
                                            <div>{programme.intake}</div>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>,
                document.body
            )}
            {badgeTooltip.visible && createPortal(
                <div
                    ref={badgeTooltipRef}
                    className="fixed px-3 py-2 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap z-[9999] min-w-max transition-opacity duration-200 pointer-events-none"
                    style={{
                        left: badgeTooltip.left,
                        top: badgeTooltip.direction === 'below' ? badgeTooltip.top + 8 : badgeTooltip.top - 40,
                        transform: 'translateX(-50%)',
                        opacity: 1
                    }}
                >
                    {badgeTooltip.content}
                </div>,
                document.body
            )}

            {/* Contact Form Modal */}
            <ContactForm
                isOpen={showContactForm}
                onClose={() => setShowContactForm(false)}
            />
        </div >
    );
};

export default JUPASelect; 