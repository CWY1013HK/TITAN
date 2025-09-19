import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const DSEScoreInputer = ({ onScoresChange }) => {
    const { t, i18n } = useTranslation();
    const { isAuthenticated } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');

    // Check if translations are ready
    const isTranslationReady = i18n.isInitialized && t('dseSubjects.CHI') !== 'dseSubjects.CHI';

    // Compulsory subjects (first 3 rows)
    const compulsorySubjects = [
        t('dseSubjects.CHI'),
        t('dseSubjects.ENG'),
        t('dseSubjects.MAT')
    ];

    // Core subject options for 4th row
    const coreSubjectOptions = [
        t('dseSubjects.CSD'),
        t('dseSubjects.LS')
    ];

    // Elective subjects (remaining rows) - aligned with DSE subject codes
    const electiveSubjects = [
        t('dseSubjects.CHL'),
        t('dseSubjects.LIE'),
        t('dseSubjects.CHH'),
        t('dseSubjects.ECO'),
        t('dseSubjects.ERS'),
        t('dseSubjects.GEO'),
        t('dseSubjects.HIS'),
        t('dseSubjects.THS'),
        t('dseSubjects.BIO'),
        t('dseSubjects.CHE'),
        t('dseSubjects.PHY'),
        t('dseSubjects.MEP_M1'),
        t('dseSubjects.MEP_M2'),
        t('dseSubjects.BAF'),
        t('dseSubjects.BAF_ACC'),
        t('dseSubjects.BAF_BUS'),
        t('dseSubjects.DAT'),
        t('dseSubjects.HSC'),
        t('dseSubjects.ICT'),
        t('dseSubjects.FST'),
        t('dseSubjects.FCT'),
        t('dseSubjects.MUS'),
        t('dseSubjects.VSA'),
        t('dseSubjects.PHE')
    ];

    // Regular DSE scores (reversed order)
    const regularScores = ["5**", "5*", "5", "4", "3", "2", "1"];

    // Special scores for Citizenship and Social Development
    const csdScores = [t('dse.attained'), t('dse.failed')];

    // Helper function to get subject code from display name
    const getSubjectCode = (displayName) => {
        const codeMap = {
            [t('dseSubjects.CHI')]: 'CHI',
            [t('dseSubjects.ENG')]: 'ENG',
            [t('dseSubjects.MAT')]: 'MAT',
            [t('dseSubjects.CSD')]: 'CSD',
            [t('dseSubjects.LS')]: 'LS',
            [t('dseSubjects.BIO')]: 'BIO',
            [t('dseSubjects.CHE')]: 'CHE',
            [t('dseSubjects.PHY')]: 'PHY',
            [t('dseSubjects.CHL')]: 'CHL',
            [t('dseSubjects.LIE')]: 'LIE',
            [t('dseSubjects.CHH')]: 'CHH',
            [t('dseSubjects.ECO')]: 'ECO',
            [t('dseSubjects.ERS')]: 'ERS',
            [t('dseSubjects.GEO')]: 'GEO',
            [t('dseSubjects.HIS')]: 'HIS',
            [t('dseSubjects.THS')]: 'THS',
            [t('dseSubjects.BAF')]: 'BAF',
            [t('dseSubjects.BAF_ACC')]: 'BAF_ACC',
            [t('dseSubjects.BAF_BUS')]: 'BAF_BUS',
            [t('dseSubjects.DAT')]: 'DAT',
            [t('dseSubjects.HSC')]: 'HSC',
            [t('dseSubjects.ICT')]: 'ICT',
            [t('dseSubjects.FST')]: 'FST',
            [t('dseSubjects.FCT')]: 'FCT',
            [t('dseSubjects.MUS')]: 'MUS',
            [t('dseSubjects.VSA')]: 'VSA',
            [t('dseSubjects.PHE')]: 'PHE',
            [t('dseSubjects.MEP_M1')]: 'MEP_M1',
            [t('dseSubjects.MEP_M2')]: 'MEP_M2',
            // Fallback for English names
            'Chinese Language': 'CHI',
            'English Language': 'ENG',
            'Mathematics Compulsory Part': 'MAT',
            'Citizenship and Social Development': 'CSD',
            'Liberal Studies': 'LS',
            'Biology': 'BIO',
            'Chemistry': 'CHE',
            'Physics': 'PHY',
            'Chinese Literature': 'CHL',
            'Literature in English': 'LIE',
            'Chinese History': 'CHH',
            'Economics': 'ECO',
            'Ethics and Religious Studies': 'ERS',
            'Geography': 'GEO',
            'History': 'HIS',
            'Tourism and Hospitality Studies': 'THS',
            'Business, Accounting and Financial Studies': 'BAF',
            'Business, Accounting and Financial Studies (Accounting)': 'BAF_ACC',
            'Business, Accounting and Financial Studies (Business Management)': 'BAF_BUS',
            'Design and Applied Technology': 'DAT',
            'Health Management and Social Care': 'HSC',
            'Information and Communication Technology': 'ICT',
            'Technology and Living (Food Science and Technology)': 'FST',
            'Technology and Living (Fashion, Clothing and Textiles)': 'FCT',
            'Music': 'MUS',
            'Visual Arts': 'VSA',
            'Physical Education': 'PHE',
            'Mathematics Extended Part (Calculus and Statistics) - Module 1': 'MEP_M1',
            'Mathematics Extended Part (Algebra and Calculus) - Module 2': 'MEP_M2'
        };
        return codeMap[displayName] || displayName; // Return original if not found
    };

    // Helper function to get display name from subject code
    const getSubjectDisplayName = (code) => {
        const displayMap = {
            'CHI': t('dseSubjects.CHI'),
            'ENG': t('dseSubjects.ENG'),
            'MAT': t('dseSubjects.MAT'),
            'CSD': t('dseSubjects.CSD'),
            'LS': t('dseSubjects.LS'),
            'BIO': t('dseSubjects.BIO'),
            'CHE': t('dseSubjects.CHE'),
            'PHY': t('dseSubjects.PHY'),
            'CHL': t('dseSubjects.CHL'),
            'LIE': t('dseSubjects.LIE'),
            'CHH': t('dseSubjects.CHH'),
            'ECO': t('dseSubjects.ECO'),
            'ERS': t('dseSubjects.ERS'),
            'GEO': t('dseSubjects.GEO'),
            'HIS': t('dseSubjects.HIS'),
            'THS': t('dseSubjects.THS'),
            'BAF': t('dseSubjects.BAF'),
            'BAF_ACC': t('dseSubjects.BAF_ACC'),
            'BAF_BUS': t('dseSubjects.BAF_BUS'),
            'DAT': t('dseSubjects.DAT'),
            'HSC': t('dseSubjects.HSC'),
            'ICT': t('dseSubjects.ICT'),
            'FST': t('dseSubjects.FST'),
            'FCT': t('dseSubjects.FCT'),
            'MUS': t('dseSubjects.MUS'),
            'VSA': t('dseSubjects.VSA'),
            'PHE': t('dseSubjects.PHE'),
            'MEP_M1': t('dseSubjects.MEP_M1'),
            'MEP_M2': t('dseSubjects.MEP_M2')
        };
        return displayMap[code] || code; // Return code if translation not found
    };

    // Helper function to translate CSD scores to English for backend storage
    const translateCSDScoreToEnglish = (score) => {
        if (!score) return score;

        // Handle Traditional Chinese
        if (score === '達標') return 'Attained';
        if (score === '不達標') return 'Failed';

        // Handle Simplified Chinese
        if (score === '达标') return 'Attained';
        if (score === '不达标') return 'Failed';

        // Already in English or other format
        return score;
    };

    // Helper function to translate CSD scores from English to current language for display
    const translateCSDScoreFromEnglish = (score) => {
        if (!score) return score;

        // If it's already in the current language, return as is
        if (score === t('dse.attained') || score === t('dse.failed')) {
            return score;
        }

        // Translate from English to current language
        if (score === 'Attained') return t('dse.attained');
        if (score === 'Failed') return t('dse.failed');

        // Return original if not recognized
        return score;
    };

    // Initialize state with compulsory subjects in first 3 rows + CSD default in 4th row + 1 elective row
    const [scores, setScores] = useState([
        { subjectCode: 'CHI', subject: t('dseSubjects.CHI'), score: "", isCompulsory: true },
        { subjectCode: 'ENG', subject: t('dseSubjects.ENG'), score: "", isCompulsory: true },
        { subjectCode: 'MAT', subject: t('dseSubjects.MAT'), score: "", isCompulsory: true },
        { subjectCode: 'CSD', subject: t('dseSubjects.CSD'), score: "", isCore: true },
        { subjectCode: "", subject: "", score: "", isCompulsory: false }
    ]);

    // Update scores when language changes
    useEffect(() => {
        setScores(prevScores => {
            // Update the display names for all subjects while preserving codes
            return prevScores.map((score, index) => {
                if (score.subjectCode) {
                    return {
                        ...score,
                        subject: getSubjectDisplayName(score.subjectCode)
                    };
                }
                return score;
            });
        });
    }, [t, i18n.language]);

    // Load saved scores when component mounts (if user is authenticated)
    useEffect(() => {
        if (isAuthenticated) {
            loadSavedScores();
        }
    }, [isAuthenticated]);

    // Load saved scores from backend
    const loadSavedScores = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('token');

            const response = await fetch('/api/dse-scores/load', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(t('dse.failedToLoadSavedScores'));
            }

            const data = await response.json();
            const savedScores = data.scores;

            if (savedScores && Object.keys(savedScores).length > 0) {
                // Convert saved scores back to component format
                const convertedScores = convertSavedScoresToComponentFormat(savedScores);
                setScores(convertedScores);
                // console.log('Loaded saved DSE scores:', savedScores);

                // Notify parent component about loaded scores
                if (onScoresChange) {
                    onScoresChange(convertedScores.filter(score => score.subjectCode && score.score));
                }
            }
        } catch (error) {
            console.error('Error loading saved scores:', error);
            setSaveStatus(t('dse.failedToLoadSavedScores'));
        } finally {
            setIsLoading(false);
        }
    };

    // Convert saved scores object to component format
    const convertSavedScoresToComponentFormat = (savedScores) => {
        const convertedScores = [
            { subjectCode: 'CHI', subject: getSubjectDisplayName('CHI'), score: savedScores["Chinese Language"] || "", isCompulsory: true },
            { subjectCode: 'ENG', subject: getSubjectDisplayName('ENG'), score: savedScores["English Language"] || "", isCompulsory: true },
            { subjectCode: 'MAT', subject: getSubjectDisplayName('MAT'), score: savedScores["Mathematics Compulsory Part"] || "", isCompulsory: true },
            { subjectCode: savedScores["Core Subject Code"] || 'CSD', subject: getSubjectDisplayName(savedScores["Core Subject Code"] || 'CSD'), score: translateCSDScoreFromEnglish(savedScores["Core Score"] || ""), isCore: true }
        ];

        // Add elective subjects - handle both old format (subject names) and new format (subject codes)
        const electiveEntries = Object.entries(savedScores).filter(([key, value]) =>
            !["Chinese Language", "English Language", "Mathematics Compulsory Part", "Core Subject", "Core Subject Code", "Core Score"].includes(key) && value
        );

        electiveEntries.forEach(([subjectKey, score]) => {
            if (subjectKey && score) {
                // Check if this is a subject code (new format) or subject name (old format)
                let subjectCode = subjectKey;
                let subjectName = subjectKey;

                // If it looks like a subject name, try to convert it to a code
                if (subjectKey.length > 3 && !subjectKey.includes('_')) {
                    // This might be a subject name, try to get the code
                    subjectCode = getSubjectCode(subjectKey);
                    subjectName = getSubjectDisplayName(subjectCode);
                } else {
                    // This looks like a subject code, get the display name
                    subjectName = getSubjectDisplayName(subjectCode);
                }

                convertedScores.push({
                    subjectCode,
                    subject: subjectName,
                    score: subjectCode === 'CSD' ? translateCSDScoreFromEnglish(score) : score, // Translate CSD scores from English to current language
                    isCompulsory: false
                });
            }
        });

        // Only add empty elective row if no elective subjects were found
        if (electiveEntries.length === 0) {
            convertedScores.push({ subjectCode: "", subject: "", score: "", isCompulsory: false });
        }

        return convertedScores;
    };

    // Convert component format to saved scores object
    const convertComponentFormatToSavedScores = (componentScores) => {
        const savedScores = {};

        componentScores.forEach((row, index) => {
            if (row.subjectCode && row.score) {
                let translatedScore = row.score;

                // Translate CSD scores to English for consistent backend storage
                if (row.subjectCode === 'CSD') {
                    translatedScore = translateCSDScoreToEnglish(row.score);
                }

                if (row.isCompulsory) {
                    // Map subject codes to backend keys for compulsory subjects
                    if (row.subjectCode === 'CHI') {
                        savedScores["Chinese Language"] = translatedScore;
                    } else if (row.subjectCode === 'ENG') {
                        savedScores["English Language"] = translatedScore;
                    } else if (row.subjectCode === 'MAT') {
                        savedScores["Mathematics Compulsory Part"] = translatedScore;
                    } else {
                        savedScores[row.subjectCode] = translatedScore;
                    }
                } else if (row.isCore) {
                    savedScores["Core Subject Code"] = row.subjectCode;
                    savedScores["Core Score"] = translatedScore;
                } else {
                    savedScores[row.subjectCode] = translatedScore;
                }
            }
        });

        return savedScores;
    };

    // Save scores to backend
    const saveScores = async (scoresToSave) => {
        if (!isAuthenticated) return;

        try {
            setIsLoading(true);
            const token = localStorage.getItem('token');
            const scoresObject = convertComponentFormatToSavedScores(scoresToSave);

            const response = await fetch('/api/dse-scores/save', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ scores: scoresObject })
            });

            if (!response.ok) {
                throw new Error(t('dse.failedToSaveScores'));
            }

            setSaveStatus(t('dse.scoresSavedAutomatically'));
            setTimeout(() => setSaveStatus(''), 3000); // Clear status after 3 seconds
            // console.log('DSE scores saved successfully:', scoresObject);
        } catch (error) {
            console.error('Error saving scores:', error);
            setSaveStatus(t('dse.failedToSaveScores'));
        } finally {
            setIsLoading(false);
        }
    };

    // Handle subject selection (for core and elective subjects)
    const handleSubjectChange = (index, subjectCode) => {
        const newScores = [...scores];
        newScores[index] = {
            subjectCode: subjectCode,
            subject: getSubjectDisplayName(subjectCode),
            score: "",
            isCompulsory: false,
            isCore: index === 3 // 4th row (index 3) is always a core subject
        };
        setScores(newScores);

        // Notify parent component
        if (onScoresChange) {
            onScoresChange(newScores.filter(score => score.subjectCode && score.score));
        }

        // Auto-save if user is authenticated
        if (isAuthenticated) {
            saveScores(newScores);
        }
    };

    // Handle score selection
    const handleScoreChange = (index, score) => {
        const newScores = [...scores];
        newScores[index] = {
            ...newScores[index],
            score: score
        };
        setScores(newScores);

        // Notify parent component
        if (onScoresChange) {
            onScoresChange(newScores.filter(score => score.subjectCode && score.score));
        }

        // Auto-save if user is authenticated
        if (isAuthenticated) {
            saveScores(newScores);
        }
    };

    // Add a new elective row
    const addRow = () => {
        setScores([...scores, { subjectCode: "", subject: "", score: "", isCompulsory: false }]);
    };

    // Remove a row (only elective rows can be removed)
    const removeRow = (index) => {
        if (scores.length > 4 && !scores[index].isCompulsory && !scores[index].isCore) {
            const newScores = scores.filter((_, i) => i !== index);
            setScores(newScores);

            // Notify parent component
            if (onScoresChange) {
                onScoresChange(newScores.filter(score => score.subjectCode && score.score));
            }

            // Auto-save if user is authenticated
            if (isAuthenticated) {
                saveScores(newScores);
            }
        }
    };

    // Get available scores based on selected subject
    const getAvailableScores = (subjectCode) => {
        if (subjectCode === 'CSD') {
            return csdScores;
        }
        return regularScores;
    };

    // Get available subjects for a row
    const getAvailableSubjects = (index) => {
        if (index === 3) { // 4th row - core subjects
            return [
                { code: 'CSD', name: t('dseSubjects.CSD') },
                { code: 'LS', name: t('dseSubjects.LS') }
            ];
        }
        // Elective subjects
        return [
            { code: 'BIO', name: t('dseSubjects.BIO') },
            { code: 'CHE', name: t('dseSubjects.CHE') },
            { code: 'PHY', name: t('dseSubjects.PHY') },
            { code: 'CHL', name: t('dseSubjects.CHL') },
            { code: 'LIE', name: t('dseSubjects.LIE') },
            { code: 'CHH', name: t('dseSubjects.CHH') },
            { code: 'ECO', name: t('dseSubjects.ECO') },
            { code: 'ERS', name: t('dseSubjects.ERS') },
            { code: 'GEO', name: t('dseSubjects.GEO') },
            { code: 'HIS', name: t('dseSubjects.HIS') },
            { code: 'THS', name: t('dseSubjects.THS') },
            { code: 'BAF', name: t('dseSubjects.BAF') },
            { code: 'BAF_ACC', name: t('dseSubjects.BAF_ACC') },
            { code: 'BAF_BUS', name: t('dseSubjects.BAF_BUS') },
            { code: 'DAT', name: t('dseSubjects.DAT') },
            { code: 'HSC', name: t('dseSubjects.HSC') },
            { code: 'ICT', name: t('dseSubjects.ICT') },
            { code: 'FST', name: t('dseSubjects.FST') },
            { code: 'FCT', name: t('dseSubjects.FCT') },
            { code: 'MUS', name: t('dseSubjects.MUS') },
            { code: 'VSA', name: t('dseSubjects.VSA') },
            { code: 'PHE', name: t('dseSubjects.PHE') },
            { code: 'MEP_M1', name: t('dseSubjects.MEP_M1') },
            { code: 'MEP_M2', name: t('dseSubjects.MEP_M2') }
        ];
    };

    return (
        <div className="dse-score-inputer" key={i18n.language}>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{t('dse.yourDseProfile')}</h2>
                {isAuthenticated && (
                    <div className="flex items-center space-x-2">
                        {isLoading && (
                            <div className="text-sm text-gray-500">{t('dse.saving')}</div>
                        )}
                        {saveStatus && (
                            <div className={`text-sm ${saveStatus.includes(t('dse.failed')) ? 'text-red-500' : 'text-green-500'}`}>
                                {saveStatus}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-300 rounded-lg">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b min-w-[140px]">
                                {t('dse.subject')}
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b min-w-[100px]">
                                {t('dse.score')}
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-b min-w-[80px]">
                                {t('dse.action')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {scores.map((row, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 border-b  min-w-[140px]">
                                    {row.isCompulsory ? (
                                        <div className="flex items-center">
                                            <span className="text-sm font-medium text-gray-900">{row.subject}</span>
                                            <span className={`ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full text-center ${i18n.language === 'en' ? 'min-w-[100px]' : 'min-w-[40px]'}`}>{t('dse.compulsory')}</span>
                                        </div>
                                    ) : (
                                        <select
                                            value={row.subjectCode}
                                            onChange={(e) => handleSubjectChange(index, e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            {index === 3 ? (
                                                // For 4th row (CSD/LS), no "Select Subject" option
                                                getAvailableSubjects(index).map((subject) => (
                                                    <option key={subject.code} value={subject.code}>
                                                        {subject.name}
                                                    </option>
                                                ))
                                            ) : (
                                                // For elective rows, include "Select Subject" option
                                                <>
                                                    <option value="">{t('dse.selectSubject')}</option>
                                                    {getAvailableSubjects(index).map((subject) => (
                                                        <option key={subject.code} value={subject.code}>
                                                            {subject.name}
                                                        </option>
                                                    ))}
                                                </>
                                            )}
                                        </select>
                                    )}
                                </td>
                                <td className="px-4 py-3 border-b min-w-[100px]">
                                    <select
                                        value={row.score}
                                        onChange={(e) => handleScoreChange(index, e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">{t('dse.selectScore')}</option>
                                        {row.subjectCode && getAvailableScores(row.subjectCode).map((score) => (
                                            <option key={score} value={score}>
                                                {score}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-4 py-3 border-b text-center min-w-[80px]">
                                    {!row.isCompulsory && !row.isCore && scores.length > 4 && (
                                        <button
                                            onClick={() => removeRow(index)}
                                            className="text-red-600 hover:text-red-800 font-medium text-sm"
                                        >
                                            {t('dse.remove')}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 w-full">
                <button
                    onClick={addRow}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full"
                >
                    {t('dse.addAnotherElectiveSubject')}
                </button>
            </div>

            <div className="mt-4 text-sm text-gray-600">
                <p><strong>{t('dse.note')}</strong> {t('dse.noteText')}</p>
                {isAuthenticated && (
                    <p className="text-blue-600"><strong>{t('dse.autoSaveEnabled')}</strong> {t('dse.autoSaveEnabledText')}</p>
                )}
                {!isAuthenticated && (
                    <p className="text-red-600"><strong>{t('dse.autoSaveDisabled')}</strong> {t('dse.autoSaveDisabledText')}</p>
                )}
            </div>
        </div>
    );
};

export default DSEScoreInputer; 