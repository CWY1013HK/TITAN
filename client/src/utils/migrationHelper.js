/**
 * Migration Helper for replacing fetch calls with apiClient
 * This script helps identify and replace fetch calls systematically
 */

import apiClient from './apiClient.js';

/**
 * Migration status tracker
 */
export const migrationStatus = {
    completed: [],
    pending: [],
    errors: []
};

/**
 * Common fetch patterns and their apiClient equivalents
 */
export const fetchPatterns = {
    // GET requests
    'fetch(url, { headers: { Authorization: token } })': 'apiClient.get(url)',
    'fetch(url, { headers: { Authorization: `Bearer ${token}` } })': 'apiClient.get(url)',

    // POST requests
    'fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })': 'apiClient.post(url, data)',
    'fetch(url, { method: "POST", headers: { Authorization: token, "Content-Type": "application/json" }, body: JSON.stringify(data) })': 'apiClient.post(url, data)',

    // PUT requests
    'fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })': 'apiClient.put(url, data)',

    // PATCH requests
    'fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })': 'apiClient.patch(url, data)',

    // DELETE requests
    'fetch(url, { method: "DELETE", headers: { Authorization: token } })': 'apiClient.delete(url)'
};

/**
 * Files that still need migration
 */
export const pendingFiles = [
    'client/src/pages/JUPASelect.js',
    'client/src/pages/ViewReport.js',
    'client/src/pages/TrajectoryMap.js',
    'client/src/pages/Register.js',
    'client/src/pages/Presentation.js',
    'client/src/components/displays/UserDashboard.js',
    'client/src/components/widgets/DSEScoreInputer.js',
    'client/src/components/widgets/TestResultsSection.js',
    'client/src/components/blocks/ContactForm.js',
    'client/src/services/programmeService.js'
];

/**
 * Migration checklist
 */
export const migrationChecklist = {
    'AuthContext.js': '✅ Completed',
    'ChatbotHandler.js': '✅ Completed',
    'DatabaseHandler.js': '✅ Completed',
    'ReportHandler.js': '✅ Completed',
    'RecommendationHandler.js': '✅ Completed',
    'ChatBot.js': '✅ Completed',
    'JUPASelect.js': '⏳ Pending',
    'ViewReport.js': '⏳ Pending',
    'TrajectoryMap.js': '⏳ Pending',
    'Register.js': '⏳ Pending',
    'Presentation.js': '⏳ Pending',
    'UserDashboard.js': '⏳ Pending',
    'DSEScoreInputer.js': '⏳ Pending',
    'TestResultsSection.js': '⏳ Pending',
    'ContactForm.js': '⏳ Pending',
    'programmeService.js': '⏳ Pending'
};

/**
 * Common fetch call patterns to replace
 */
export const commonPatterns = [
    // Simple GET requests
    {
        pattern: /fetch\(['"`]([^'"`]+)['"`],\s*\{\s*headers:\s*\{\s*['"`]Authorization['"`]:\s*[^}]+\s*\}\s*\}\)/g,
        replacement: 'apiClient.get(\'$1\')'
    },

    // POST requests with JSON body
    {
        pattern: /fetch\(['"`]([^'"`]+)['"`],\s*\{\s*method:\s*['"`]POST['"`],\s*headers:\s*\{[^}]+\},\s*body:\s*JSON\.stringify\(([^)]+)\)\s*\}\)/g,
        replacement: 'apiClient.post(\'$1\', $2)'
    },

    // PATCH requests
    {
        pattern: /fetch\(['"`]([^'"`]+)['"`],\s*\{\s*method:\s*['"`]PATCH['"`],\s*headers:\s*\{[^}]+\},\s*body:\s*JSON\.stringify\(([^)]+)\)\s*\}\)/g,
        replacement: 'apiClient.patch(\'$1\', $2)'
    },

    // PUT requests
    {
        pattern: /fetch\(['"`]([^'"`]+)['"`],\s*\{\s*method:\s*['"`]PUT['"`],\s*headers:\s*\{[^}]+\},\s*body:\s*JSON\.stringify\(([^)]+)\)\s*\}\)/g,
        replacement: 'apiClient.put(\'$1\', $2)'
    },

    // DELETE requests
    {
        pattern: /fetch\(['"`]([^'"`]+)['"`],\s*\{\s*method:\s*['"`]DELETE['"`],\s*headers:\s*\{[^}]+\}\s*\}\)/g,
        replacement: 'apiClient.delete(\'$1\')'
    }
];

/**
 * Validate migration
 */
export const validateMigration = (filePath) => {
    const issues = [];

    // Check if apiClient is imported
    if (!filePath.includes('import apiClient')) {
        issues.push('Missing apiClient import');
    }

    // Check for remaining fetch calls
    if (filePath.includes('fetch(')) {
        issues.push('Found remaining fetch calls');
    }

    return issues;
};

/**
 * Get migration progress
 */
export const getMigrationProgress = () => {
    const total = Object.keys(migrationChecklist).length;
    const completed = Object.values(migrationChecklist).filter(status => status.includes('✅')).length;
    const pending = Object.values(migrationChecklist).filter(status => status.includes('⏳')).length;

    return {
        total,
        completed,
        pending,
        percentage: Math.round((completed / total) * 100)
    };
};

/**
 * Generate migration report
 */
export const generateMigrationReport = () => {
    const progress = getMigrationProgress();

    return {
        summary: {
            totalFiles: progress.total,
            completedFiles: progress.completed,
            pendingFiles: progress.pending,
            completionPercentage: progress.percentage
        },
        completed: Object.entries(migrationChecklist)
            .filter(([_, status]) => status.includes('✅'))
            .map(([file, status]) => ({ file, status })),
        pending: Object.entries(migrationChecklist)
            .filter(([_, status]) => status.includes('⏳'))
            .map(([file, status]) => ({ file, status }))
    };
}; 