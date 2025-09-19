import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import JupasSelectButton from '../blocks/JupasSelectButton';

const JupasProgrammesSection = ({
    jupasProgrammes,
    programmeClassifications,
    isLoadingClassifications,
    getDurationNumber,
    getInstitutionKey,
    getClassificationColor,
    getClassificationBadgeText,
    standAlone = true
}) => {
    const { t } = useTranslation();

    // Internal tooltip state
    const [badgeTooltip, setBadgeTooltip] = React.useState({ visible: false, content: '', left: 0, top: 0, direction: 'above' });
    const [classificationTooltip, setClassificationTooltip] = React.useState({ visible: false, code: null, left: 0, top: 0, direction: 'above' });
    const [classificationTooltipHeight, setClassificationTooltipHeight] = React.useState(0);
    const badgeTooltipRef = React.useRef();
    const classificationTooltipRef = React.useRef();
    const classificationRefs = React.useRef({});

    // Badge tooltip handlers
    const onBadgeTooltipShow = (content, ref) => {
        if (ref && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
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

    const onBadgeTooltipHide = () => setBadgeTooltip({ visible: false, content: '', left: 0, top: 0, direction: 'above' });

    // Classification tooltip handlers
    const handleClassificationTooltipShow = (code) => {
        const ref = classificationRefs.current[code];
        if (ref) {
            const rect = ref.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const direction = rect.top < viewportHeight * 0.4 ? 'below' : 'above';
            setClassificationTooltip({
                visible: true,
                code,
                left: rect.left + rect.width / 2,
                top: direction === 'below' ? rect.bottom : rect.top,
                direction
            });
        }
    };

    const handleClassificationTooltipHide = () => setClassificationTooltip({ visible: false, code: null, left: 0, top: 0, direction: 'above' });

    // Track tooltip height
    React.useEffect(() => {
        if (classificationTooltip.visible && classificationTooltipRef.current) {
            setClassificationTooltipHeight(classificationTooltipRef.current.offsetHeight);
        }
    }, [classificationTooltip.visible, classificationTooltip.code, classificationTooltip.left, classificationTooltip.top, classificationTooltip.direction]);

    // Update tooltip position on scroll/resize
    React.useEffect(() => {
        if (!classificationTooltip.visible) return;
        const updatePosition = () => {
            const ref = classificationRefs.current[classificationTooltip.code];
            if (ref) {
                const rect = ref.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const direction = rect.top < viewportHeight * 0.4 ? 'below' : 'above';
                setClassificationTooltip(info => ({
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
    }, [classificationTooltip.visible, classificationTooltip.code]);

    return (
        <div className={`${standAlone ? 'bg-white rounded-lg shadow-sm p-6 mt-6' : 'pt-2'} mb-6`}>
            {jupasProgrammes.length > 0 && (
                <div className="mt-2 mb-2">
                    <h3 className={`${standAlone ? 'text-xl font-bold mb-6' : 'text-lg font-medium text-gray-900 mb-3'}`}>{t('userDashboard.topJupasProgrammes')}</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* First Programme - Left Column */}
                        {jupasProgrammes[0] && (
                            <div className="lg:col-span-2">
                                <div
                                    className="p-4 rounded-lg border border-gray-200 h-full flex flex-col cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                                    style={{
                                        background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
                                        borderLeft: '4px solid #ec4899'
                                    }}
                                    onClick={() => {
                                        if (jupasProgrammes[0].url) {
                                            window.open(jupasProgrammes[0].url, '_blank', 'noopener,noreferrer');
                                        }
                                    }}
                                >
                                    <div className="flex items-center space-x-3 mb-2">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold bg-pink-200 text-pink-800">
                                            1
                                        </div>
                                    </div>

                                    {/* Programme Code and Badges */}
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="font-bold text-blue-600 text-base">{jupasProgrammes[0].code}</span>
                                        {jupasProgrammes[0].short_name && (() => {
                                            const shortNameRef = React.createRef();
                                            return (
                                                <span
                                                    ref={shortNameRef}
                                                    className="text-xs px-2 py-1 rounded bg-pink-200 text-pink-800 cursor-pointer transition-colors hover:bg-red-100 hover:text-red-700 border border-transparent hover:border-red-300"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (jupasProgrammes[0].url) {
                                                            window.open(jupasProgrammes[0].url, '_blank', 'noopener,noreferrer');
                                                        }
                                                    }}
                                                    onMouseEnter={() => jupasProgrammes[0].url && onBadgeTooltipShow(t('common.clickToView'), shortNameRef)}
                                                    onMouseLeave={onBadgeTooltipHide}
                                                    onFocus={() => jupasProgrammes[0].url && onBadgeTooltipShow(t('common.clickToView'), shortNameRef)}
                                                    onBlur={onBadgeTooltipHide}
                                                >
                                                    {jupasProgrammes[0].short_name}
                                                </span>
                                            );
                                        })()}
                                        {/* Duration Badge */}
                                        {jupasProgrammes[0].duration && (() => {
                                            const durationNumber = getDurationNumber(jupasProgrammes[0].duration);
                                            const durationRef = React.createRef();
                                            return durationNumber && (
                                                <span
                                                    ref={durationRef}
                                                    className="text-xs px-2 py-1 rounded border bg-pink-100 text-pink-800 border-pink-200 cursor-help"
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
                                            const interviewInfo = getInterviewInfo(jupasProgrammes[0]);
                                            if (!interviewInfo) return null;

                                            const interviewRef = React.createRef();
                                            return (
                                                <span
                                                    ref={interviewRef}
                                                    className="text-xs px-2 py-1 rounded border bg-pink-100 text-pink-800 border-pink-200 cursor-help"
                                                    onMouseEnter={() => interviewInfo.showTooltip && onBadgeTooltipShow(interviewInfo.details, interviewRef)}
                                                    onMouseLeave={onBadgeTooltipHide}
                                                    onFocus={() => interviewInfo.showTooltip && onBadgeTooltipShow(interviewInfo.details, interviewRef)}
                                                    onBlur={onBadgeTooltipHide}
                                                >
                                                    {t('jupa.interview')}
                                                </span>
                                            );
                                        })()}
                                        {/* New Programme Badge */}
                                        {Array.isArray(jupasProgrammes[0].stats_offer) && jupasProgrammes[0].stats_offer.length === 0 && (() => {
                                            const badgeRef = React.createRef();
                                            const tooltipContent = t('jupa.newProgrammeTooltip', {
                                                lower:
                                                    jupasProgrammes[0].new_prog === 'No Estimation' ? t('jupa.newProgrammeLowerNoEstimation') :
                                                        jupasProgrammes[0].new_prog === 'By Restructure' ? t('jupa.newProgrammeLowerByRestructure') :
                                                            jupasProgrammes[0].new_prog === 'By Expected Score' ? t('jupa.newProgrammeLowerByExpectedScore') :
                                                                jupasProgrammes[0].new_prog === 'By Similar Programme' ? t('jupa.newProgrammeLowerBySimilarProgramme') :
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
                                                    {t('jupa.newProgrammeBadge') || 'New'}
                                                </span>
                                            );
                                        })()}
                                        {/* Classification Badge */}
                                        {(() => {
                                            const classificationData = programmeClassifications[jupasProgrammes[0].code];
                                            const classification = classificationData?.classification ?? -1;
                                            const classificationText = isLoadingClassifications ? t('common.loading') : getClassificationBadgeText(classification);
                                            return (
                                                <div
                                                    className="relative group flex items-center z-50"
                                                    ref={el => classificationRefs.current[jupasProgrammes[0].code] = el}
                                                    onMouseEnter={() => handleClassificationTooltipShow(jupasProgrammes[0].code)}
                                                    onMouseLeave={handleClassificationTooltipHide}
                                                    onFocus={() => handleClassificationTooltipShow(jupasProgrammes[0].code)}
                                                    onBlur={handleClassificationTooltipHide}
                                                >
                                                    <span className={`px-2 py-1 rounded text-xs font-medium cursor-help border ${getClassificationColor(classification)}`}>
                                                        {classificationText}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Programme Titles */}
                                    <div className="text-sm text-gray-800 break-words flex-grow">
                                        {jupasProgrammes[0].full_title_en}
                                    </div>
                                    {jupasProgrammes[0].full_title_cn && (
                                        <div className="text-sm text-gray-600 break-words mt-1">
                                            {jupasProgrammes[0].full_title_cn}
                                        </div>
                                    )}

                                    {/* Institution */}
                                    <div className="text-xs text-gray-500 break-words mt-2">
                                        {t(`jupa.institutions.${getInstitutionKey(jupasProgrammes[0].institution)}`, { defaultValue: jupasProgrammes[0].institution })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Second Programme and Button - Right Column */}
                        <div className="lg:col-span-1 space-y-4">
                            {/* Second Programme */}
                            {jupasProgrammes[1] && (
                                <div
                                    className="p-4 rounded-lg border border-gray-200 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                                    style={{
                                        background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
                                        borderLeft: '4px solid #ec4899'
                                    }}
                                    onClick={() => {
                                        if (jupasProgrammes[1].url) {
                                            window.open(jupasProgrammes[1].url, '_blank', 'noopener,noreferrer');
                                        }
                                    }}
                                >
                                    <div className="flex items-center space-x-3 mb-2">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold bg-pink-200 text-pink-800">
                                            2
                                        </div>
                                    </div>

                                    {/* Programme Code and Badges */}
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="font-bold text-blue-600 text-base">{jupasProgrammes[1].code}</span>
                                        {jupasProgrammes[1].short_name && (() => {
                                            const shortNameRef = React.createRef();
                                            return (
                                                <span
                                                    ref={shortNameRef}
                                                    className="text-xs px-2 py-1 rounded bg-pink-200 text-pink-800 cursor-pointer transition-colors hover:bg-red-100 hover:text-red-700 border border-transparent hover:border-red-300"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (jupasProgrammes[1].url) {
                                                            window.open(jupasProgrammes[1].url, '_blank', 'noopener,noreferrer');
                                                        }
                                                    }}
                                                    onMouseEnter={() => jupasProgrammes[1].url && onBadgeTooltipShow(t('common.clickToView'), shortNameRef)}
                                                    onMouseLeave={onBadgeTooltipHide}
                                                    onFocus={() => jupasProgrammes[1].url && onBadgeTooltipShow(t('common.clickToView'), shortNameRef)}
                                                    onBlur={onBadgeTooltipHide}
                                                >
                                                    {jupasProgrammes[1].short_name}
                                                </span>
                                            );
                                        })()}
                                        {/* Duration Badge */}
                                        {jupasProgrammes[1].duration && (() => {
                                            const durationNumber = getDurationNumber(jupasProgrammes[1].duration);
                                            const durationRef = React.createRef();
                                            return durationNumber && (
                                                <span
                                                    ref={durationRef}
                                                    className="text-xs px-2 py-1 rounded border bg-pink-100 text-pink-800 border-pink-200 cursor-help"
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
                                            const interviewInfo = getInterviewInfo(jupasProgrammes[1]);
                                            if (!interviewInfo) return null;

                                            const interviewRef = React.createRef();
                                            return (
                                                <span
                                                    ref={interviewRef}
                                                    className="text-xs px-2 py-1 rounded border bg-pink-100 text-pink-800 border-pink-200 cursor-help"
                                                    onMouseEnter={() => interviewInfo.showTooltip && onBadgeTooltipShow(interviewInfo.details, interviewRef)}
                                                    onMouseLeave={onBadgeTooltipHide}
                                                    onFocus={() => interviewInfo.showTooltip && onBadgeTooltipShow(interviewInfo.details, interviewRef)}
                                                    onBlur={onBadgeTooltipHide}
                                                >
                                                    {t('jupa.interview')}
                                                </span>
                                            );
                                        })()}
                                        {/* New Programme Badge */}
                                        {Array.isArray(jupasProgrammes[1].stats_offer) && jupasProgrammes[1].stats_offer.length === 0 && (() => {
                                            const badgeRef = React.createRef();
                                            const tooltipContent = t('jupa.newProgrammeTooltip', {
                                                lower:
                                                    jupasProgrammes[1].new_prog === 'No Estimation' ? t('jupa.newProgrammeLowerNoEstimation') :
                                                        jupasProgrammes[1].new_prog === 'By Restructure' ? t('jupa.newProgrammeLowerByRestructure') :
                                                            jupasProgrammes[1].new_prog === 'By Expected Score' ? t('jupa.newProgrammeLowerByExpectedScore') :
                                                                jupasProgrammes[1].new_prog === 'By Similar Programme' ? t('jupa.newProgrammeLowerBySimilarProgramme') :
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
                                                    {t('jupa.newProgrammeBadge') || 'New'}
                                                </span>
                                            );
                                        })()}
                                        {/* Classification Badge */}
                                        {(() => {
                                            const classificationData = programmeClassifications[jupasProgrammes[1].code];
                                            const classification = classificationData?.classification ?? -1;
                                            const classificationText = isLoadingClassifications ? t('common.loading') : getClassificationBadgeText(classification);
                                            return (
                                                <div
                                                    className="relative group flex items-center z-50"
                                                    ref={el => classificationRefs.current[jupasProgrammes[1].code] = el}
                                                    onMouseEnter={() => handleClassificationTooltipShow(jupasProgrammes[1].code)}
                                                    onMouseLeave={handleClassificationTooltipHide}
                                                    onFocus={() => handleClassificationTooltipShow(jupasProgrammes[1].code)}
                                                    onBlur={handleClassificationTooltipHide}
                                                >
                                                    <span className={`px-2 py-1 rounded text-xs font-medium cursor-help border ${getClassificationColor(classification)}`}>
                                                        {classificationText}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Programme Titles */}
                                    <div className="text-sm text-gray-800 break-words">
                                        {jupasProgrammes[1].full_title_en}
                                    </div>
                                    {jupasProgrammes[1].full_title_cn && (
                                        <div className="text-sm text-gray-600 break-words mt-1">
                                            {jupasProgrammes[1].full_title_cn}
                                        </div>
                                    )}

                                    {/* Institution */}
                                    <div className="text-xs text-gray-500 break-words mt-2">
                                        {t(`jupa.institutions.${getInstitutionKey(jupasProgrammes[1].institution)}`, { defaultValue: jupasProgrammes[1].institution })}
                                    </div>
                                </div>
                            )}

                            {/* JUPASelect Button */}
                            <JupasSelectButton />
                        </div>
                    </div>
                </div>
            )}
            {/* Placeholder when no JUPAS programmes are shown */}
            {jupasProgrammes.length === 0 && (
                <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-500 mb-2">{t('userDashboard.noSummaryData')}</h3>
                    <p className="text-sm text-gray-400">{t('userDashboard.noSummaryDataDesc')}</p>
                </div>
            )}

            {/* Badge Tooltip Portal */}
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

            {/* Classification Tooltip Portal */}
            {classificationTooltip.visible && classificationTooltip.code && createPortal(
                <div
                    ref={classificationTooltipRef}
                    className="fixed px-3 py-2 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap z-[9999] min-w-max transition-opacity duration-200 pointer-events-none"
                    style={{
                        left: classificationTooltip.left,
                        top: classificationTooltip.direction === 'below'
                            ? classificationTooltip.top + 8
                            : classificationTooltip.top - classificationTooltipHeight - 8,
                        transform: 'translateX(-50%)',
                        opacity: 1
                    }}
                >
                    <div className="font-semibold mb-1">{t('jupa.tooltipTitle', { code: classificationTooltip.code })}</div>
                    <div className="space-y-1">
                        {/* Classification Section */}
                        {(() => {
                            const programme = jupasProgrammes.find(p => p.code === classificationTooltip.code);
                            const classificationData = programmeClassifications[classificationTooltip.code];
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
        </div>
    );
};

export default JupasProgrammesSection; 