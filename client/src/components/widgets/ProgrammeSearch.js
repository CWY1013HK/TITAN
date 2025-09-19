import React, { useState, useEffect, useRef } from 'react';
import programmeService from '../../services/programmeService';
import InstitutionFilter from '../blocks/InstitutionFilter';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../blocks/LoadingSpinner';

const ProgrammeSearch = ({ selectedCollection, onProgrammeSelect, selectedProgrammesCount = 0, onInstitutionsChange, selectedInstitutions = [] }) => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [localSelectedInstitutions, setLocalSelectedInstitutions] = useState(selectedInstitutions);
    const [error, setError] = useState(null);
    const searchRef = useRef(null);
    const inputRef = useRef(null);
    const searchTimeoutRef = useRef(null);

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

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    // Sync local state with parent's selectedInstitutions prop
    useEffect(() => {
        setLocalSelectedInstitutions(selectedInstitutions);
    }, [selectedInstitutions]);

    const performSearch = async (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const result = await programmeService.searchProgrammes(
                query,
                localSelectedInstitutions.length > 0 ? localSelectedInstitutions : null,
                selectedCollection
            );

            if (result.success) {
                setSearchResults(result.data);
                setShowDropdown(true);
            } else {
                setError(t('common.searchFailed'));
                setSearchResults([]);
            }
        } catch (err) {
            console.error('Error searching programmes:', err);
            setError(t('common.searchError'));
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearchInputChange = (query) => {
        setSearchQuery(query);

        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Debounce the search - wait 300ms after user stops typing
        searchTimeoutRef.current = setTimeout(() => {
            performSearch(query);
        }, 300);
    };

    const handleInstitutionsChange = (institutions) => {
        setLocalSelectedInstitutions(institutions);
        // Call parent callback if provided
        if (onInstitutionsChange) {
            onInstitutionsChange(institutions);
        }
        // Re-run search if there's an active query with debouncing
        if (searchQuery.trim()) {
            // Clear previous timeout
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }

            // Debounce the search
            searchTimeoutRef.current = setTimeout(() => {
                performSearch(searchQuery);
            }, 300);
        }
    };

    const handleProgrammeClick = (programme) => {
        onProgrammeSelect(programme);
        setSearchQuery('');
        setSearchResults([]);
        setShowDropdown(false);
        // Keep focus on input after selection
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const highlightMatch = (text, query) => {
        if (!text || !query) return text;

        const regex = new RegExp(`(${query})`, 'gi');
        const parts = text.split(regex);

        return parts.map((part, index) =>
            regex.test(part) ? (
                <span key={index} className="bg-yellow-200 font-semibold">{part}</span>
            ) : (
                part
            )
        );
    };

    /* // Hide search if 6 or more programmes are selected
    if (selectedProgrammesCount >= 6) {
        return (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-yellow-800">
                        {t('jupa.maximumOf6ProgrammesAllowed')}
                    </p>
                </div>
            </div>
        );
    }
    */

    return (
        <div className="space-y-4">
            {/* Institution Filter */}
            <InstitutionFilter
                selectedCollection={selectedCollection}
                onInstitutionChange={handleInstitutionsChange}
                selectedInstitutions={localSelectedInstitutions}
            />

            {/* Search Input */}
            <div className="relative" ref={searchRef}>
                <div className="relative">
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearchInputChange(e.target.value)}
                        placeholder={t('jupa.searchByProgrammeCode')}
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {isLoading && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <LoadingSpinner size="small" />
                        </div>
                    )}
                </div>

                {/* Search Results Dropdown */}
                {showDropdown && searchResults.length > 0 && (
                    <div
                        className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto"
                        onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
                    >
                        {searchResults.map((programme) => (
                            <div
                                key={programme.code}
                                onClick={() => handleProgrammeClick(programme)}
                                onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
                                className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-semibold text-blue-600">
                                        {highlightMatch(programme.code, searchQuery)}
                                    </span>
                                    {programme.short_name && (
                                        <span className="text-sm text-gray-500">
                                            {highlightMatch(programme.short_name, searchQuery)}
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm text-gray-700 mb-1">
                                    {highlightMatch(programme.full_title_en, searchQuery)}
                                </div>
                                {programme.full_title_cn && (
                                    <div className="text-sm text-gray-600">
                                        {highlightMatch(programme.full_title_cn, searchQuery)}
                                    </div>
                                )}
                                <div className="text-xs text-gray-500 mt-1">
                                    {t(`jupa.institutions.${getInstitutionKey(programme.institution)}`, { defaultValue: programme.institution })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* No Results */}
                {showDropdown && searchQuery && searchResults.length === 0 && !isLoading && !error && (
                    <div
                        className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4"
                        onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
                    >
                        <p className="text-gray-500 text-center">{t('jupa.noProgrammesFoundMatching') + ' "' + searchQuery + '"'}</p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div
                        className="absolute z-50 w-full mt-1 bg-white border border-red-300 rounded-lg shadow-lg p-4"
                        onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
                    >
                        <p className="text-red-600 text-center">{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProgrammeSearch; 