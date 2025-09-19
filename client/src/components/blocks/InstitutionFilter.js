import React, { useState, useEffect } from 'react';
import programmeService from '../../services/programmeService';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from './LoadingSpinner';

const InstitutionFilter = ({ selectedCollection, onInstitutionChange, selectedInstitutions = [] }) => {
    const [institutions, setInstitutions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
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

    // Prestige order for sorting
    const prestigeOrder = [
        'The University of Hong Kong', // HKU
        'The Chinese University of Hong Kong', // CUHK
        'The Hong Kong University of Science and Technology', // HKUST
        'City University of Hong Kong', // CityU
        'The Hong Kong Polytechnic University', // PolyU
        'Hong Kong Baptist University', // HKBU
        'Lingnan University', // LingU
        'Hong Kong Shue Yan University', // SYU
        'The Education University of Hong Kong', // EDUHK
        'Hong Kong Metropolitan University', // HKMU
        'The Hang Seng University of Hong Kong', // HSU
        'Saint Francis University', // SFU
        'Tung Wah College', // TWC
        'UOW College Hong Kong', // uowCHK
        'Hong Kong Chu Hai College', // HKCHU
        'Technological and Higher Education Institute of Hong Kong, Vocational Training Council' // THEI
    ];

    // Load institutions when collection changes
    useEffect(() => {
        if (selectedCollection) {
            loadInstitutions();
        }
    }, [selectedCollection]);

    const loadInstitutions = async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await programmeService.getAvailableInstitutions(selectedCollection);
            if (result.success) {
                // Sort institutions by prestige order
                const sortedInstitutions = [...result.data].sort((a, b) => {
                    const indexA = prestigeOrder.indexOf(a);
                    const indexB = prestigeOrder.indexOf(b);
                    if (indexA === -1 && indexB === -1) return 0;
                    if (indexA === -1) return 1;
                    if (indexB === -1) return -1;
                    return indexA - indexB;
                });
                setInstitutions(sortedInstitutions);
            } else {
                setError(t('common.failedToLoadInstitutions'));
            }
        } catch (err) {
            setError(t('common.errorLoadingInstitutions'));
        } finally {
            setLoading(false);
        }
    };

    const handleInstitutionToggle = (institution) => {
        const isSelected = selectedInstitutions.includes(institution);
        let newSelection;

        if (isSelected) {
            newSelection = selectedInstitutions.filter(inst => inst !== institution);
        } else {
            newSelection = [...selectedInstitutions, institution];
        }

        onInstitutionChange(newSelection);
    };

    const handleSelectAll = () => {
        onInstitutionChange(institutions);
    };

    const handleClearAll = () => {
        onInstitutionChange([]);
    };

    if (loading) {
        return (
            <div className="mb-4">
                <div className="flex items-center space-x-2">
                    <LoadingSpinner size="small" />
                    <span className="text-sm text-gray-600">{t('common.loadingInstitutions')}</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mb-4">
                <p className="text-red-600 text-sm">{error}</p>
                <button
                    onClick={loadInstitutions}
                    className="mt-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                    {t('common.retry')}
                </button>
            </div>
        );
    }

    return (
        <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-medium text-gray-700 flex items-center">{t('trajectory.filterByInstitution')}</h4>
                <div className="flex space-x-2">
                    <button
                        onClick={handleSelectAll}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center"
                    >
                        {t('common.selectAll')}
                    </button>
                    <button
                        onClick={handleClearAll}
                        className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center"
                    >
                        {t('common.clearAll')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {institutions.map((institution) => {
                    const isSelected = selectedInstitutions.includes(institution);
                    return (
                        <button
                            key={institution}
                            onClick={() => handleInstitutionToggle(institution)}
                            className={`p-2 text-xs rounded border transition-colors ${isSelected
                                ? 'bg-blue-100 border-blue-300 text-blue-800'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {t(`jupa.institutions.${getInstitutionKey(institution)}`, { defaultValue: institution })}
                        </button>
                    );
                })}
            </div>

            <div className="mt-2 text-xs text-gray-600">
                {i18n.language !== 'tc' && i18n.language !== 'sc' ? (
                    // English: "3 of 10 institutions selected"
                    <>{selectedInstitutions.length} {t('common.of')} {institutions.length} {t('common.institutionsSelected')}</>
                ) : (
                    // Chinese: "10 間院校之中已揀 3 間" or "10 所院校之中已选择 3 所"
                    <>{institutions.length} {t('common.institutionsSelected')} {selectedInstitutions.length} {i18n.language === 'tc' ? '間' : '所'}</>
                )}
            </div>
        </div>
    );
};

export default InstitutionFilter; 