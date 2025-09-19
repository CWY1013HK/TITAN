import React, { useState, useEffect } from 'react';
import { useAuth, isNotPresenter } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Bar, Line } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement
} from 'chart.js';
import LoadingSpinner from '../components/blocks/LoadingSpinner';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const TIME_RANGES = [
    { label: '7 days', value: 7 },
    { label: '30 days', value: 30 },
    { label: '90 days', value: 90 },
    { label: '365 days', value: 365 },
    { label: 'All', value: 'all' }
];

const PresentationAnalytics = () => {
    const { currentUser } = useAuth();
    const { t } = useTranslation();

    // Helper function to handle plurality for user count
    const getUserText = (count) => {
        return count === 1 ? t('analytics.user') : t('analytics.users');
    };

    const TOP_X_OPTIONS = [
        { label: t('analytics.topX4'), value: 4 },
        { label: t('analytics.topX8'), value: 8 },
        { label: t('analytics.topX16'), value: 16 },
        { label: t('analytics.topAll'), value: 'all' }
    ];
    const [dseScoreDistribution, setDseScoreDistribution] = useState({});
    const [userCreationRaw, setUserCreationRaw] = useState({});
    const [usageDateRaw, setUsageDateRaw] = useState({});
    const [userCreationData, setUserCreationData] = useState({ labels: [], data: [] });
    const [usageDateData, setUsageDateData] = useState({ labels: [], data: [] });
    const [uniqueUsersDateData, setUniqueUsersDateData] = useState({ labels: [], data: [] });
    const [userTimeRange, setUserTimeRange] = useState(30);
    const [usageTimeRange, setUsageTimeRange] = useState(30);
    const [uniqueUsersTimeRange, setUniqueUsersTimeRange] = useState(30);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [usageByDayByRoute, setUsageByDayByRoute] = useState({});
    const [uniqueUsersByDayByRoute, setUniqueUsersByDayByRoute] = useState({});
    const [topXRoutes, setTopXRoutes] = useState(8);
    const [dseDisplayMode, setDseDisplayMode] = useState('subjectOrder'); // 'subjectOrder' or 'totalCount'
    const [routeTotalRequests, setRouteTotalRequests] = useState([]);
    const [enhancedAnalytics, setEnhancedAnalytics] = useState([]);
    const [showEnhancedAnalytics, setShowEnhancedAnalytics] = useState(false);

    // Helper to get date string YYYY-MM-DD
    const getDateString = (date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    // Fetch analytics data from new endpoints
    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            setError('');
            try {
                const token = localStorage.getItem('token');
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

                // Fetch user stats (DSE + signups)
                const userStatsRes = await fetch('/api/analytics/user-stats', { headers });
                if (!userStatsRes.ok) throw new Error('Failed to fetch user stats');
                const userStats = await userStatsRes.json();
                console.log('[frontend] /api/analytics/user-stats response:', userStats);
                setDseScoreDistribution(userStats.dseScoreDistribution || {});

                // Build signupsByDay ONLY from userStats.users[].createdAt
                const signupsByDay = {};
                if (userStats.users) {
                    userStats.users.forEach(user => {
                        if (user.createdAt) {
                            const d = new Date(user.createdAt);
                            const key = getDateString(d);
                            signupsByDay[key] = (signupsByDay[key] || 0) + 1;
                        }
                    });
                }
                setUserCreationRaw(signupsByDay);

                // Fetch enhanced usage data from new daily analytics endpoint
                const dailyAnalyticsRes = await fetch('/api/usage/daily-analytics', { headers });
                if (!dailyAnalyticsRes.ok) throw new Error('Failed to fetch daily analytics');
                const dailyAnalytics = await dailyAnalyticsRes.json();
                console.log('[frontend] /api/usage/daily-analytics response:', dailyAnalytics);

                // Process daily analytics data for usage graphs
                const processedUsageByDay = {};
                const processedUsageByDayByRoute = {};
                const processedUniqueUsersByDay = {};
                const processedUniqueUsersByDayByRoute = {};

                if (dailyAnalytics.data && dailyAnalytics.data.length > 0) {
                    dailyAnalytics.data.forEach(routeData => {
                        const routeKey = `${routeData.route_method} ${routeData.route_path}`;
                        processedUsageByDayByRoute[routeKey] = {};
                        processedUniqueUsersByDayByRoute[routeKey] = {};

                        routeData.daily_tallies.forEach(tally => {
                            // Aggregate total usage by day
                            processedUsageByDay[tally.date] = (processedUsageByDay[tally.date] || 0) + tally.total_requests;
                            processedUniqueUsersByDay[tally.date] = (processedUniqueUsersByDay[tally.date] || 0) + tally.unique_users;

                            // Aggregate usage by route by day
                            processedUsageByDayByRoute[routeKey][tally.date] = tally.total_requests;
                            processedUniqueUsersByDayByRoute[routeKey][tally.date] = tally.unique_users;
                        });
                    });
                }

                setUsageDateRaw(processedUsageByDay);
                setUsageByDayByRoute(processedUsageByDayByRoute);
                setUniqueUsersByDayByRoute(processedUniqueUsersByDayByRoute);
                console.log('[frontend] Processed usageByDay:', processedUsageByDay);
                console.log('[frontend] Processed usageByDayByRoute:', processedUsageByDayByRoute);
                console.log('[frontend] Processed uniqueUsersByDayByRoute:', processedUniqueUsersByDayByRoute);

                // Fetch route total requests from aggregated stats endpoint
                const aggregatedStatsRes = await fetch('/api/usage/aggregated-stats', { headers });
                if (!aggregatedStatsRes.ok) throw new Error('Failed to fetch aggregated stats');
                const aggregatedStats = await aggregatedStatsRes.json();
                console.log('[frontend] /api/usage/aggregated-stats response:', aggregatedStats);
                setRouteTotalRequests(aggregatedStats.data || []);

                // Store enhanced analytics data for detailed view
                setEnhancedAnalytics(dailyAnalytics.data || []);
            } catch (err) {
                setError(t('analytics.errorLoadingData'));
                console.error('[frontend] Error in fetchAnalytics:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [t]);

    // Helper to filter and fill missing days for a time range
    const getTimeRangeData = (raw, days) => {
        const today = new Date();
        let startDate;
        if (days === 'all') {
            const allDates = Object.keys(raw);
            if (allDates.length === 0) return { labels: [], data: [] };
            startDate = new Date(allDates[0]);
        } else {
            startDate = new Date(today);
            startDate.setDate(today.getDate() - days + 1);
        }
        const resultLabels = [];
        const resultData = [];
        for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
            const key = getDateString(d);
            resultLabels.push(key);
            resultData.push(raw[key] || 0);
        }
        return { labels: resultLabels, data: resultData };
    };

    // Update chart data when raw data or time range changes
    useEffect(() => {
        setUserCreationData(getTimeRangeData(userCreationRaw, userTimeRange));
    }, [userCreationRaw, userTimeRange]);
    useEffect(() => {
        setUsageDateData(getTimeRangeData(usageDateRaw, usageTimeRange));
    }, [usageDateRaw, usageTimeRange]);
    useEffect(() => {
        setUniqueUsersDateData(getTimeRangeData(uniqueUsersByDayByRoute, uniqueUsersTimeRange));
    }, [uniqueUsersByDayByRoute, uniqueUsersTimeRange]);

    // Dropdown component for time range (with translation for label)
    const TimeRangeDropdown = ({ value, onChange }) => (
        <select
            className="absolute top-6 right-8 bg-white border border-gray-300 rounded px-2 py-1 text-sm shadow focus:outline-none"
            value={value}
            aria-label={t('analytics.selectTimeRange')}
            onChange={e => onChange(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            style={{ zIndex: 2 }}
        >
            {TIME_RANGES.map(opt => (
                <option key={opt.value} value={opt.value}>{t(`analytics.timeRange.${opt.value}`)}</option>
            ))}
        </select>
    );

    // Dropdown component for top X routes
    const TopXDropdown = ({ value, onChange }) => (
        <select
            className="absolute top-6 right-29 bg-white border border-gray-300 rounded px-2 py-1 text-sm shadow focus:outline-none"
            value={value}
            onChange={e => onChange(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            style={{ zIndex: 2 }}
        >
            {TOP_X_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    );

    // --- Render Table for DSE Score Distribution ---
    const renderDseScoreTable = () => {
        // List of subject codes in the order from dseSubjects in en.json
        const subjectCodes = [
            'CHI', 'ENG', 'MAT', 'CSD', 'LS', 'BIO', 'CHE', 'PHY', 'CHL', 'LIE', 'CHH', 'ECO', 'ERS', 'GEO', 'HIS', 'THS',
            'BAF', 'BAF_ACC', 'BAF_BUS', 'DAT', 'HSC', 'ICT', 'FST', 'FCT', 'MUS', 'VSA', 'PHE', 'MEP_M1', 'MEP_M2'
        ];
        // Table columns in descending order
        const scoreColumns = ['5**', '5*', '5', '4', '3', '2', '1', t('dse.attained'), t('dse.failed')];
        const totalHeader = t('common.total');

        // Helper function to translate CSD scores to current language for display
        const translateCSDScoreForDisplay = (score) => {
            if (!score) return score;

            // If it's already in the current language, return as is
            if (score === t('dse.attained') || score === t('dse.failed')) {
                return score;
            }

            // First, normalize to English (in case backend sends Chinese values)
            let englishScore = score;
            if (score === '達標' || score === '达标') {
                englishScore = 'Attained';
            } else if (score === '不達標' || score === '不达标') {
                englishScore = 'Failed';
            }

            // Then translate from English to current language
            if (englishScore === 'Attained') return t('dse.attained');
            if (englishScore === 'Failed') return t('dse.failed');

            // Return original if not recognized
            return score;
        };

        // Map backend DSE score keys to subject codes for proper aggregation
        const mapBackendScoresToSubjectCodes = (backendDistribution) => {
            const mappedDistribution = {};

            Object.entries(backendDistribution).forEach(([subjectKey, scoreValue]) => {
                let subjectCode = subjectKey;

                // Map old format keys to subject codes
                switch (subjectKey) {
                    case 'Chinese Language':
                        subjectCode = 'CHI';
                        break;
                    case 'English Language':
                        subjectCode = 'ENG';
                        break;
                    case 'Mathematics Compulsory Part':
                        subjectCode = 'MAT';
                        break;
                    case 'Core Subject Code':
                    case 'Core Score':
                        // Skip these as they should be handled by the backend
                        return;
                    default:
                        // For other subjects, assume the key is already a subject code
                        subjectCode = subjectKey;
                }

                console.log('[DSE Analytics] Mapping', subjectKey, 'to', subjectCode, 'with score value:', scoreValue);

                // Initialize the mapped subject if it doesn't exist
                if (!mappedDistribution[subjectCode]) {
                    mappedDistribution[subjectCode] = {};
                }

                // Handle different data formats
                if (typeof scoreValue === 'object' && scoreValue !== null) {
                    // This is a score counts object (like { "5": 3, "4": 2 })
                    Object.entries(scoreValue).forEach(([score, count]) => {
                        // Translate CSD scores for proper matching with column headers
                        const translatedScore = subjectCode === 'CSD' ? translateCSDScoreForDisplay(score) : score;
                        mappedDistribution[subjectCode][translatedScore] = (mappedDistribution[subjectCode][translatedScore] || 0) + count;
                    });
                } else if (typeof scoreValue === 'string' && scoreValue) {
                    // This is a single score value (like "Attained", "4", etc.)
                    // Translate CSD scores for proper matching with column headers
                    const translatedScore = subjectCode === 'CSD' ? translateCSDScoreForDisplay(scoreValue) : scoreValue;
                    mappedDistribution[subjectCode][translatedScore] = (mappedDistribution[subjectCode][translatedScore] || 0) + 1;
                }
            });

            console.log('[DSE Analytics] Final mapped distribution:', mappedDistribution);
            return mappedDistribution;
        };

        // Apply the mapping to the backend data
        const mappedDseScoreDistribution = mapBackendScoresToSubjectCodes(dseScoreDistribution);

        // Sort subjects by total count if in 'totalCount' mode
        const sortedSubjects = Object.keys(mappedDseScoreDistribution)
            .filter(code => subjectCodes.includes(code)) // Only include valid subject codes
            .sort((a, b) => {
                const totalA = Object.values(mappedDseScoreDistribution[a] || {}).reduce((sum, v) => sum + v, 0);
                const totalB = Object.values(mappedDseScoreDistribution[b] || {}).reduce((sum, v) => sum + v, 0);
                return totalB - totalA;
            });

        return (
            <div className="overflow-x-auto bg-white rounded-lg shadow-sm p-6 mb-8 relative">
                <h2 className="text-2xl font-semibold mb-4">{t('analytics.dseScoreDistribution')}</h2>
                <div className="flex justify-end mb-4">
                    <select
                        className="bg-white border border-gray-300 rounded px-2 py-1 text-sm shadow focus:outline-none"
                        value={dseDisplayMode}
                        onChange={e => setDseDisplayMode(e.target.value)}
                        aria-label={t('analytics.displayMode')}
                        style={{ zIndex: 2 }}
                    >
                        <option value="subjectOrder">{t('analytics.bySubjectOrder')}</option>
                        <option value="totalCount">{t('analytics.byTotalCount')}</option>
                    </select>
                </div>
                <table className="min-w-full border text-center">
                    <thead>
                        <tr>
                            <th className="border px-2 py-1 text-left">{t('analytics.subject')}</th>
                            {scoreColumns.map(score => (
                                <th key={score} className="border px-2 py-1 text-right">{score}</th>
                            ))}
                            <th className="border px-2 py-1 text-right">{totalHeader}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dseDisplayMode === 'subjectOrder' ? (
                            subjectCodes.map(code => {
                                const total = scoreColumns.reduce((sum, score) => sum + (mappedDseScoreDistribution[code]?.[score] || 0), 0);
                                return (
                                    <tr key={code}>
                                        <td className="border px-2 py-1 font-bold text-left">{t(`dseSubjects.${code}`)}</td>
                                        {scoreColumns.map(score => (
                                            <td key={score} className="border px-2 py-1 text-right">
                                                {mappedDseScoreDistribution[code]?.[score] || 0}
                                            </td>
                                        ))}
                                        <td className="border px-2 py-1 font-bold text-right">{total}</td>
                                    </tr>
                                );
                            })
                        ) : (
                            sortedSubjects.map(code => {
                                const total = scoreColumns.reduce((sum, score) => sum + (mappedDseScoreDistribution[code]?.[score] || 0), 0);
                                return (
                                    <tr key={code}>
                                        <td className="border px-2 py-1 font-bold text-left">{t(`dseSubjects.${code}`)}</td>
                                        {scoreColumns.map(score => (
                                            <td key={score} className="border px-2 py-1 text-right">
                                                {mappedDseScoreDistribution[code]?.[score] || 0}
                                            </td>
                                        ))}
                                        <td className="border px-2 py-1 font-bold text-right">{total}</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    // --- Render User Creation Graph ---
    const renderUserCreationGraph = () => {
        if (!userCreationData.labels.length) return null;
        const data = {
            labels: userCreationData.labels,
            datasets: [
                {
                    label: t('analytics.userSignups'),
                    data: userCreationData.data,
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 2,
                    fill: true
                }
            ]
        };
        const options = {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: t('analytics.userSignupsOverTime') }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: t('analytics.count') } }
            }
        };
        return (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8 min-h-[400px] relative">
                {/* Translated day-selection dropdown, styled and positioned like route-access timeline */}
                <TimeRangeDropdown value={userTimeRange} onChange={setUserTimeRange} />
                <Line data={data} options={options} />
            </div>
        );
    };

    // --- Render Usage Route Call Dates Graph ---
    const renderUsageGraph = () => {
        if (!usageDateData.labels.length) return null;
        // Prepare datasets for each route
        const allRoutes = Object.keys(usageByDayByRoute);
        // Sort routes by total count, descending
        const sortedRoutes = allRoutes.sort((a, b) => {
            const sumA = Object.values(usageByDayByRoute[a] || {}).reduce((acc, v) => acc + v, 0);
            const sumB = Object.values(usageByDayByRoute[b] || {}).reduce((acc, v) => acc + v, 0);
            return sumB - sumA;
        });
        // Determine how many main routes to show
        let mainCount = topXRoutes === 'all' ? sortedRoutes.length : topXRoutes;
        const mainRoutes = sortedRoutes.slice(0, mainCount);
        const otherRoutes = sortedRoutes.slice(mainCount);
        // Color palette
        const colors = [
            'rgb(59, 130, 246)', // blue
            'rgb(16, 185, 129)', // green
            'rgb(245, 158, 11)', // yellow
            'rgb(239, 68, 68)', // red
            'rgb(139, 92, 246)', // purple
            'rgb(236, 72, 153)', // pink
            'rgb(20, 184, 166)', // teal
            'rgb(249, 115, 22)', // orange
            'rgb(120, 120, 120)', // gray
            'rgb(0, 0, 0)' // black (for extra routes if needed)
        ];
        const datasets = mainRoutes.map((route, i) => ({
            label: route,
            data: usageDateData.labels.map(day => usageByDayByRoute[route]?.[day] || 0),
            borderColor: colors[i % colors.length],
            backgroundColor: colors[i % colors.length].replace('rgb', 'rgba').replace(')', ', 0.3)'),
            borderWidth: 2,
            fill: false
        }));
        if (otherRoutes.length > 0) {
            // Sum all other routes per day
            const otherData = usageDateData.labels.map(day =>
                otherRoutes.reduce((sum, route) => sum + (usageByDayByRoute[route]?.[day] || 0), 0)
            );
            datasets.push({
                label: t('analytics.endpointOther'),
                data: otherData,
                borderColor: 'rgb(120,120,120)',
                backgroundColor: 'rgba(120,120,120,0.3)',
                borderWidth: 2,
                fill: false
            });
        }
        // Add total line
        const totalData = usageDateData.labels.map(day =>
            allRoutes.reduce((sum, route) => sum + (usageByDayByRoute[route]?.[day] || 0), 0)
        );
        datasets.unshift({
            label: t('analytics.routeCalls'),
            data: totalData,
            borderColor: 'black',
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderWidth: 3,
            fill: false,
            pointRadius: 2,
            pointBackgroundColor: 'black',
            pointBorderColor: 'black',
            order: 0
        });
        const data = {
            labels: usageDateData.labels,
            datasets
        };
        const options = {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: t('analytics.routeCallsOverTime') }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: t('analytics.count') } }
            }
        };
        return (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8 min-h-[400px] relative">
                <TimeRangeDropdown value={usageTimeRange} onChange={setUsageTimeRange} />
                <TopXDropdown value={topXRoutes} onChange={setTopXRoutes} />
                <Line data={data} options={options} />
            </div>
        );
    };

    // --- Render Unique Users Route Call Dates Graph ---
    const renderUniqueUsersGraph = () => {
        if (!uniqueUsersDateData.labels.length) return null;
        // Prepare datasets for each route
        const allRoutes = Object.keys(uniqueUsersByDayByRoute);
        // Sort routes by total unique users, descending
        const sortedRoutes = allRoutes.sort((a, b) => {
            const sumA = Object.values(uniqueUsersByDayByRoute[a] || {}).reduce((acc, v) => acc + v, 0);
            const sumB = Object.values(uniqueUsersByDayByRoute[b] || {}).reduce((acc, v) => acc + v, 0);
            return sumB - sumA;
        });
        // Determine how many main routes to show
        let mainCount = topXRoutes === 'all' ? sortedRoutes.length : topXRoutes;
        const mainRoutes = sortedRoutes.slice(0, mainCount);
        const otherRoutes = sortedRoutes.slice(mainCount);
        // Color palette
        const colors = [
            'rgb(59, 130, 246)', // blue
            'rgb(16, 185, 129)', // green
            'rgb(245, 158, 11)', // yellow
            'rgb(239, 68, 68)', // red
            'rgb(139, 92, 246)', // purple
            'rgb(236, 72, 153)', // pink
            'rgb(20, 184, 166)', // teal
            'rgb(249, 115, 22)', // orange
            'rgb(120, 120, 120)', // gray
            'rgb(0, 0, 0)' // black (for extra routes if needed)
        ];
        const datasets = mainRoutes.map((route, i) => ({
            label: route,
            data: uniqueUsersDateData.labels.map(day => uniqueUsersByDayByRoute[route]?.[day] || 0),
            borderColor: colors[i % colors.length],
            backgroundColor: colors[i % colors.length].replace('rgb', 'rgba').replace(')', ', 0.3)'),
            borderWidth: 2,
            fill: false
        }));
        if (otherRoutes.length > 0) {
            // Sum all other routes per day
            const otherData = uniqueUsersDateData.labels.map(day =>
                otherRoutes.reduce((sum, route) => sum + (uniqueUsersByDayByRoute[route]?.[day] || 0), 0)
            );
            datasets.push({
                label: t('analytics.endpointOther'),
                data: otherData,
                borderColor: 'rgb(120,120,120)',
                backgroundColor: 'rgba(120,120,120,0.3)',
                borderWidth: 2,
                fill: false
            });
        }
        // Add total line
        const totalData = uniqueUsersDateData.labels.map(day =>
            allRoutes.reduce((sum, route) => sum + (uniqueUsersByDayByRoute[route]?.[day] || 0), 0)
        );
        datasets.unshift({
            label: t('analytics.uniqueUsers'),
            data: totalData,
            borderColor: 'black',
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderWidth: 3,
            fill: false,
            pointRadius: 2,
            pointBackgroundColor: 'black',
            pointBorderColor: 'black',
            order: 0
        });
        const data = {
            labels: uniqueUsersDateData.labels,
            datasets
        };
        const options = {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: t('analytics.uniqueUsersOverTime') }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: t('analytics.count') } }
            }
        };
        return (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8 min-h-[400px] relative">
                <TimeRangeDropdown value={uniqueUsersTimeRange} onChange={setUniqueUsersTimeRange} />
                <TopXDropdown value={topXRoutes} onChange={setTopXRoutes} />
                <Line data={data} options={options} />
            </div>
        );
    };

    // --- Render Route Total Requests Table ---
    const renderRouteTotalRequestsTable = () => {
        if (!routeTotalRequests || routeTotalRequests.length === 0) return null;

        // Sort by total requests in descending order
        const sortedRouteTotals = [...routeTotalRequests].sort((a, b) => b.total_requests - a.total_requests);

        return (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                <h2 className="text-2xl font-semibold mb-4">{t('analytics.routeTotalRequests')}</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full border text-center">
                        <thead>
                            <tr>
                                <th className="border px-4 py-2 text-left">{t('analytics.route')}</th>
                                <th className="border px-4 py-2 text-right">{t('analytics.totalRequests')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedRouteTotals.map(({ route_path, total_requests }, index) => (
                                <tr key={route_path} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                                    <td className="border px-4 py-2 text-left font-mono text-sm">{route_path}</td>
                                    <td className="border px-4 py-2 text-right font-bold">{total_requests.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // --- Render Enhanced Analytics Details ---
    const renderEnhancedAnalytics = () => {
        if (!enhancedAnalytics || enhancedAnalytics.length === 0) return null;

        return (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                <div className={`flex justify-between items-center ${showEnhancedAnalytics ? 'mb-4' : ''}`}>
                    <h2 className="text-2xl font-semibold">{t('analytics.enhancedAnalytics')}</h2>
                    <button
                        onClick={() => setShowEnhancedAnalytics(!showEnhancedAnalytics)}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                        {showEnhancedAnalytics ? t('analytics.hideDetails') : t('analytics.showDetails')}
                    </button>
                </div>

                {showEnhancedAnalytics && (
                    <div className="space-y-6">
                        {enhancedAnalytics.map((routeData, index) => {
                            // Calculate aggregated metrics
                            const totalRequests = routeData.daily_tallies.reduce((sum, tally) => sum + tally.total_requests, 0);
                            const totalUniqueUsers = routeData.daily_tallies.reduce((sum, tally) => sum + tally.unique_users, 0);
                            const avgResponseTime = routeData.daily_tallies.reduce((sum, tally) => sum + tally.avg_response_time, 0) / routeData.daily_tallies.length;

                            // Aggregate status codes
                            const statusCodeCounts = {};
                            routeData.daily_tallies.forEach(tally => {
                                Object.entries(tally.status_codes).forEach(([code, count]) => {
                                    statusCodeCounts[code] = (statusCodeCounts[code] || 0) + count;
                                });
                            });

                            return (
                                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                                    <h3 className="text-lg font-semibold mb-3">
                                        {routeData.route_method} {routeData.route_path}
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                        <div className="bg-white p-3 rounded border">
                                            <div className="text-sm text-gray-600">{t('analytics.totalRequests')}</div>
                                            <div className="text-2xl font-bold text-blue-600">{totalRequests.toLocaleString()}</div>
                                        </div>
                                        <div className="bg-white p-3 rounded border">
                                            <div className="text-sm text-gray-600">{t('analytics.uniqueUsers')}</div>
                                            <div className="text-2xl font-bold text-green-600">{totalUniqueUsers.toLocaleString()}</div>
                                        </div>
                                        <div className="bg-white p-3 rounded border">
                                            <div className="text-sm text-gray-600">{t('analytics.avgResponseTime')}</div>
                                            <div className="text-2xl font-bold text-orange-600">{Math.round(avgResponseTime)}ms</div>
                                        </div>
                                        <div className="bg-white p-3 rounded border">
                                            <div className="text-sm text-gray-600">{t('analytics.daysTracked')}</div>
                                            <div className="text-2xl font-bold text-purple-600">{routeData.daily_tallies.length}</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="font-semibold mb-2">{t('analytics.statusCodeDistribution')}</h4>
                                            <div className="bg-white p-3 rounded border">
                                                {Object.entries(statusCodeCounts)
                                                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                                    .map(([code, count]) => (
                                                        <div key={code} className="flex justify-between py-1">
                                                            <span className="font-mono">{code}</span>
                                                            <span className="font-bold">{count.toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-semibold mb-2">{t('analytics.recentActivity')}</h4>
                                            <div className="bg-white p-3 rounded border max-h-40 overflow-y-auto">
                                                {routeData.daily_tallies
                                                    .sort((a, b) => b.date.localeCompare(a.date))
                                                    .slice(0, 5)
                                                    .map((tally, idx) => (
                                                        <div key={idx} className="border-b py-2 last:border-b-0">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-semibold">{tally.date}</span>
                                                                <span className="text-sm text-gray-600">
                                                                    {tally.total_requests} {t('analytics.requests')}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {tally.unique_users} {getUserText(tally.unique_users)} • {Math.round(tally.avg_response_time)}ms {t('analytics.avg')}
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <LoadingSpinner size="large" text={t('analytics.loading')} />
                </div>
            </div>
        );
    }
    if (error) {
        return <div className="flex items-center justify-center min-h-screen bg-gray-50 text-red-600">{error}</div>;
    }

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('analytics.analyticsDashboard')}</h1>
                {renderDseScoreTable()}
                {renderUserCreationGraph()}
                {renderUsageGraph()}
                {renderUniqueUsersGraph()}
                {renderRouteTotalRequestsTable()}
                {renderEnhancedAnalytics()}
            </div>
        </div>
    );
};

export default PresentationAnalytics; 