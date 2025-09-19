import React from 'react';
import { useTranslation } from 'react-i18next';

const ProgrammeRecommendations = ({
    recommendedProgrammes,
    selectedProgrammes,
    onAddProgramme,
    onBadgeTooltipShow,
    onBadgeTooltipHide
}) => {
    const { t } = useTranslation();

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

    // Calculate admission rate from band A apply vs offer data
    const calculateAdmissionRate = (programme) => {
        if (!programme.stats_apply?.[0] || !programme.stats_offer?.[0]) {
            return null;
        }

        const bandAApplicants = programme.stats_apply[0][1] || 0;
        const bandAOffers = programme.stats_offer[0][1] || 0;

        if (bandAApplicants === 0) {
            return null;
        }

        return ((bandAOffers / bandAApplicants) * 100).toFixed(1);
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

    if (!recommendedProgrammes || recommendedProgrammes.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-600">{t('jupa.noProgrammeRecommendationsFound')}</p>
                <p className="text-sm text-gray-500 mt-2">{t('jupa.tryImprovingScores')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendedProgrammes.map((programme) => {
                    const isSelected = selectedProgrammes.some(p => p.code === programme.code);
                    const admissionRate = calculateAdmissionRate(programme);

                    return (
                        <div
                            key={programme.code}
                            className={`border rounded-lg p-4 transition-all duration-200 flex flex-col h-full ${isSelected
                                ? 'border-green-500 bg-green-50 hover:bg-green-100'
                                : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-blue-600 text-lg truncate">
                                        {programme.code}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        {programme.short_name && (
                                            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                {programme.short_name}
                                            </span>
                                        )}
                                        {/* Interview Badge */}
                                        {(() => {
                                            const interviewInfo = getInterviewInfo(programme);
                                            if (!interviewInfo) return null;

                                            const interviewRef = React.createRef();
                                            return (
                                                <span
                                                    ref={interviewRef}
                                                    className="text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded border border-purple-200"
                                                    onMouseEnter={() => interviewInfo.showTooltip && onBadgeTooltipShow && onBadgeTooltipShow(interviewInfo.details, interviewRef)}
                                                    onMouseLeave={() => onBadgeTooltipHide && onBadgeTooltipHide()}
                                                    onFocus={() => interviewInfo.showTooltip && onBadgeTooltipShow && onBadgeTooltipShow(interviewInfo.details, interviewRef)}
                                                    onBlur={() => onBadgeTooltipHide && onBadgeTooltipHide()}
                                                >
                                                    {t('jupa.interview')}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>
                                {isSelected && (
                                    <span className="text-green-600 text-sm font-medium">
                                        ✓ {t('common.selected')}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-2 mb-3 flex-grow">
                                <p className="text-sm text-gray-800 line-clamp-2">
                                    {programme.full_title_en}
                                </p>
                                {programme.full_title_cn && (
                                    <p className="text-xs text-gray-600 line-clamp-2">
                                        {programme.full_title_cn}
                                    </p>
                                )}
                                <p className="text-xs text-gray-500">
                                    {t(`jupa.institutions.${getInstitutionKey(programme.institution)}`, { defaultValue: programme.institution })}
                                </p>
                            </div>

                            {/* Programme Info Section */}
                            <div className="space-y-1 mb-3">
                                {programme.duration && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-600">{t('jupa.duration')}</span>
                                        <span className="text-gray-800 font-medium">{programme.duration}</span>
                                    </div>
                                )}
                                {programme.intake && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-600">{t('jupa.intake')}</span>
                                        <span className="text-gray-800 font-medium">{programme.intake}</span>
                                    </div>
                                )}
                                {admissionRate && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-600">{t('jupa.admissionRate')}</span>
                                        <span className="text-gray-800 font-medium">{admissionRate}%</span>
                                    </div>
                                )}
                            </div>

                            {!isSelected && (
                                <button
                                    onClick={() => onAddProgramme(programme)}
                                    className="w-full bg-blue-600 text-white text-sm py-2 px-3 rounded-md hover:bg-blue-700 transition-colors mt-auto"
                                >
                                    {t('jupa.add')}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ProgrammeRecommendations; 