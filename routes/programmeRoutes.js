import express from 'express';
const router = express.Router();
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Import shared usage tracking
import { Usage, trackRouteUsage } from '../models/usage.js';

// In-memory programme data cache
let programmeDataCache = null;
let cacheLastModified = null;

// Classification mapping constant
const CLASSIFICATION_MAPPING = {
    '-1': 'Error',
    '0': 'Mission Impossible',
    '1': 'Dangerous',
    '2': 'Very Risky',
    '3': 'Risky',
    '4': 'Moderate',
    '5': 'Safe',
    '6': 'Very Safe',
    '7': 'Secure',
    '8': 'Golden Ticket'
};

// Shared classification algorithm function
const classifyProgramme = (scores, data, scoreCallback, enableLogging = true) => {
    if (enableLogging) {
        console.log('--- classifyProgramme() called ---');
        console.log('User scores:', scores);
        console.log('Programme requirements:', {
            requirement_compulsory: data.requirement_compulsory,
            requirement_optional_1: data.requirement_optional_1,
            requirement_optional_2: data.requirement_optional_2,
            level_5_bonus: data.level_5_bonus,
            subject_compulsory: data.subject_compulsory,
            subject_optional_1: data.subject_optional_1,
            subject_optional_2: data.subject_optional_2,
            subject_free_number: data.subject_free_number,
            subject_free_weight: data.subject_free_weight,
            subject_weight_limit: data.subject_weight_limit,
            score_uq: data.score_uq,
            score_md: data.score_md,
            score_lq: data.score_lq
        });
    }

    // Convert string scores to numbers and build maps
    const numericScores = {};
    const userScores3Numeric = {};
    for (const key in scores) {
        const scoreValue = scores[key] === "5**" ? 7 :
            scores[key] === "5*" ? 6 :
                scores[key] === "5" ? 5 :
                    scores[key] === "4" ? 4 :
                        scores[key] === "3" ? 3 :
                            scores[key] === "2" ? 2 :
                                scores[key] === "1" ? 1 : 0;
        // Map to first 3 characters for programme compatibility
        const shortKey = key.slice(0, 3);
        numericScores[shortKey] = scoreValue;
        userScores3Numeric[shortKey] = scoreValue;
    }

    // Helper: build a map of user scores by first 3 chars of subject code (for string comparisons)
    const userScores3 = {};
    for (const key in scores) {
        userScores3[key.slice(0, 3)] = scores[key];
    }

    // Compulsory Requirements
    const req_comp = data.requirement_compulsory;
    if (!req_comp || typeof req_comp !== 'object' || Object.keys(req_comp).length === 0) {
        // No compulsory requirements, treat as fulfilled
    } else {
        for (const req in req_comp) {
            const req3 = req.slice(0, 3);
            if (!(req3 in userScores3Numeric)) {
                if (enableLogging) console.log(`FAIL: Missing compulsory subject ${req3}`);
                if (scoreCallback) scoreCallback(0);
                return 0;
            }
            if (userScores3Numeric[req3] < req_comp[req]) {
                if (enableLogging) console.log(`FAIL: Compulsory subject ${req3} score ${userScores3Numeric[req3]} < required ${req_comp[req]}`);
                if (scoreCallback) scoreCallback(0);
                return 0;
            }
        }
    }

    // First Optional Requirement
    let fulfill = false;
    let elective_used = '';
    let req_opt1 = data.requirement_optional_1;
    if (!req_opt1 || typeof req_opt1 !== 'object' || Object.keys(req_opt1).length === 0) {
        fulfill = true;
    } else {
        for (const req in req_opt1) {
            const req3 = req.slice(0, 3);
            if (req3 === 'ELE') {
                for (const ele in userScores3Numeric) {
                    if (!['ENG', 'CHI', 'MAT'].includes(ele)) { // LS is now allowed
                        if (userScores3Numeric[ele] >= req_opt1[req]) {
                            fulfill = true;
                            elective_used = ele;
                            break;
                        }
                    }
                }
            } else {
                if (req3 in userScores3Numeric) {
                    if (userScores3Numeric[req3] >= req_opt1[req]) {
                        fulfill = true;
                        if (req3 !== 'MAT') {
                            elective_used = req3;
                            break;
                        }
                    }
                }
            }
        }
        // If MAT is used to fulfill 1st optional requirement, any one more elective must reach level 3
        if (elective_used === '' && fulfill) {
            fulfill = false;
            for (const ele in userScores3Numeric) {
                if (!['ENG', 'CHI', 'MAT'].includes(ele)) { // LS is now allowed
                    if (userScores3Numeric[ele] >= 3) {
                        elective_used = ele;
                        fulfill = true;
                        break;
                    }
                }
            }
        }
    }
    if (!fulfill) {
        if (enableLogging) console.log('FAIL: First optional requirement not fulfilled. Elective used:', elective_used);
        if (scoreCallback) scoreCallback(0);
        return 0;
    }

    // Second Optional Requirement
    fulfill = false;
    let req_opt2 = data.requirement_optional_2;
    if (!req_opt2 || typeof req_opt2 !== 'object' || Object.keys(req_opt2).length === 0) {
        fulfill = true;
    } else {
        for (const req in req_opt2) {
            const req3 = req.slice(0, 3);
            if (req3 === 'ELE') {
                // For ELE requirements, we need to find a different elective than the one already used
                for (const ele in userScores3Numeric) {
                    if (!['ENG', 'CHI', 'MAT'].includes(ele) && ele !== elective_used) { // LS is now allowed
                        if (userScores3Numeric[ele] >= req_opt2[req]) {
                            fulfill = true;
                            elective_used = ele;
                            break;
                        }
                    }
                }
            } else {
                // For specific subject requirements, we can use the same subject if it meets the requirement
                if (req3 in userScores3Numeric) {
                    if (userScores3Numeric[req3] >= req_opt2[req]) {
                        fulfill = true;
                        break;
                    }
                }
            }
        }
    }
    if (!fulfill) {
        if (enableLogging) console.log('FAIL: Second optional requirement not fulfilled. Elective used:', elective_used);
        if (scoreCallback) scoreCallback(0);
        return 0;
    }

    // Level 5 bonus conversion
    const level_5_bonus = data.level_5_bonus;
    if (level_5_bonus) {
        for (const sub in numericScores) {
            if (numericScores[sub] === 5) {
                numericScores[sub] = 5.5;
            } else if (numericScores[sub] === 6) {
                numericScores[sub] = 7;
            } else if (numericScores[sub] === 7) {
                numericScores[sub] = 8.5;
            }
        }
    }

    // Score Calculation
    let total_score = 0;
    const sub_used = new Set();
    const sub_comp = data.subject_compulsory;
    const sub_opt1 = data.subject_optional_1;
    const sub_opt2 = data.subject_optional_2;
    const sub_free = data.subject_free_number;
    const sub_fwei = data.subject_free_weight;
    const sub_wlim = data.subject_weight_limit;

    // Compulsory subjects
    if (sub_comp && typeof sub_comp === 'object' && Object.keys(sub_comp).length > 0) {
        for (const sub in sub_comp) {
            if (sub in numericScores) {
                total_score += numericScores[sub] * sub_comp[sub];
                sub_used.add(sub);
            } else {
                if (enableLogging) console.log(`FAIL: Missing compulsory score for ${sub}`);
                if (scoreCallback) scoreCallback(0);
                return -1;
            }
        }
    }

    // First Optional subject
    let max_score = 0;
    let max_subject = '';
    if (sub_opt1 && typeof sub_opt1 === 'object' && Object.keys(sub_opt1).length > 0) {
        for (const sub in sub_opt1) {
            if (sub_used.has(sub)) {
                continue;
            }
            if (sub in numericScores) {
                const weighted_score = numericScores[sub] * sub_opt1[sub];
                if (weighted_score > max_score) {
                    max_score = weighted_score;
                    max_subject = sub;
                }
            }
        }
        if (max_score === 0) {
            if (enableLogging) console.log('FAIL: No valid first optional subject found');
            if (scoreCallback) scoreCallback(0);
            return -1;
        }
        total_score += max_score;
        sub_used.add(max_subject);
    }

    // Second Optional subject
    max_score = 0;
    max_subject = '';
    if (sub_opt2 && typeof sub_opt2 === 'object' && Object.keys(sub_opt2).length > 0) {
        for (const sub in sub_opt2) {
            if (sub_used.has(sub)) {
                continue;
            }
            if (sub in numericScores) {
                const weighted_score = numericScores[sub] * sub_opt2[sub];
                if (weighted_score > max_score) {
                    max_score = weighted_score;
                    max_subject = sub;
                }
            }
        }
        if (max_score === 0) {
            if (enableLogging) console.log('FAIL: No valid second optional subject found');
            if (scoreCallback) scoreCallback(0);
            return -1;
        }
        total_score += max_score;
        sub_used.add(max_subject);
    }

    // Free subjects pre-processing
    let scores_free = {};
    const scores_free_unweighted = {};
    const scores_free_extra = {};
    if (sub_fwei && 'MBO' in sub_fwei) {
        let mat_score = 0;
        let mep_score = 0;
        if ('MAT' in numericScores) {
            mat_score = numericScores['MAT'] * sub_fwei['MBO'];
        } else {
            mat_score = 0;
        }
        if ('MEP' in numericScores) {
            mep_score = numericScores['MEP'] * sub_fwei['MEP'];
        } else {
            mep_score = 0;
        }
        scores_free['MBO'] = Math.max(mat_score, mep_score);
        sub_used.add('MAT');
        sub_used.add('MEP');
    }

    for (const sub in numericScores) {
        if (sub_used.has(sub)) {
            continue;
        }
        const weighted_score = sub_fwei && sub in sub_fwei ? numericScores[sub] * sub_fwei[sub] : numericScores[sub];
        scores_free[sub] = weighted_score;
        if (typeof sub_wlim === 'number') {
            scores_free_unweighted[sub] = numericScores[sub];
            scores_free_extra[sub] = weighted_score - numericScores[sub];
        }
    }

    let topn = Math.min(Math.floor(sub_free), Object.keys(scores_free).length);
    if (typeof sub_wlim === 'number') {
        const sortedEntries = Object.entries(scores_free_extra)
            .sort((a, b) => b[1] - a[1])
            .slice(0, sub_wlim);
        for (const [key] of sortedEntries) {
            total_score += scores_free[key];
            delete scores_free[key];
            delete scores_free_unweighted[key];
        }
        scores_free = scores_free_unweighted;
        topn -= sub_wlim;
    }

    const scores_sort = Object.values(scores_free).sort((a, b) => b - a);

    // Special treatment for HKUST Bonus
    const institution = data.institution;
    if (institution == "The Hong Kong University of Science and Technology") {
        let full_score = 0;
        let max_score = 0;
        let opt_score = 0;
        for (const sub in sub_comp) {
            full_score += sub_comp[sub];
        }
        for (const sub in sub_opt1) {
            opt_score = sub_opt1[sub];
            if (opt_score > max_score) {
                max_score = opt_score;
            }
        }
        full_score += max_score;
        max_score = 0;
        for (const sub in sub_opt2) {
            opt_score = sub_opt2[sub];
            if (opt_score > max_score) {
                max_score = opt_score;
            }
        }
        full_score += max_score;
        const values = Object.values(sub_fwei || {});
        values.sort((a, b) => b - a);
        const topValues = values.slice(0, sub_wlim);
        for (const val of topValues) {
            full_score += val;
        }
        full_score += sub_free - sub_wlim;
        full_score *= 8.5;
        const scores_topn_ust = scores_sort.slice(0, topn + 1);
        const sum_scores = scores_topn_ust.reduce((sum, score) => sum + score, 0);
        const bonus_map = {
            8.5: 0.05,
            7: 0.0412,
            5.5: 0.0324,
            4: 0.0235,
            3: 0.0176
        };
        max_score = 0;
        for (const score of scores_topn_ust) {
            let test_score = sum_scores - score;
            const bonus = bonus_map[Number(score.toFixed(1))] || 0;
            test_score += Math.floor(full_score * bonus);
            if (test_score > max_score) {
                max_score = test_score;
            }
        }
        total_score += max_score;
    } else {
        // Free subjects
        const scores_topn = scores_sort.slice(0, topn);
        total_score += scores_topn.reduce((sum, score) => sum + score, 0);
        // Extra subject bonus
        const bonus_rate = sub_free - Math.floor(sub_free);
        if (bonus_rate > 0 && scores_sort.length > topn) {
            if (institution != "The Hong Kong Polytechnic University" || scores_sort[topn] >= 3) {
                total_score += scores_sort[topn] * bonus_rate;
            }
        }
    }

    total_score = Number(total_score.toFixed(2));
    if (enableLogging) {
        console.log('Calculated total_score:', total_score);
        console.log('Quartiles: UQ:', data.score_uq, 'MD:', data.score_md, 'LQ:', data.score_lq);
    }

    // Determine classification based on quartile rules
    const uq = data.score_uq;
    const md = data.score_md;
    const lq = data.score_lq;
    const is_uq = typeof uq === 'number';
    const is_md = typeof md === 'number';
    const is_lq = typeof lq === 'number';
    let finalClass = 0;

    if (is_uq && total_score >= uq + 2) finalClass = 8;
    else if (is_md && total_score >= md + 8) finalClass = 8;
    else if (is_lq && total_score >= lq + 16) finalClass = 8;
    else if (is_uq && total_score >= uq) finalClass = 7;
    else if (is_md && total_score >= md + 6) finalClass = 7;
    else if (is_lq && total_score >= lq + 12) finalClass = 7;
    else if (is_md && total_score >= md + 2 && is_lq && total_score >= lq + 4) finalClass = 6;
    else if (is_md && total_score >= md + 4) finalClass = 6;
    else if (is_lq && total_score >= lq + 8) finalClass = 6;
    else if (is_md && total_score >= md && is_lq && total_score >= lq + 2) finalClass = 5;
    else if (is_md && total_score >= md + 2) finalClass = 5;
    else if (is_lq && total_score >= lq + 4) finalClass = 5;
    else if (is_md && total_score >= md - 1 && is_lq && total_score >= lq + 1) finalClass = 4;
    else if (is_md && total_score >= md) finalClass = 4;
    else if (is_lq && total_score >= lq + 2) finalClass = 4;
    else if (is_md && total_score >= md - 2 && is_lq && total_score >= lq) finalClass = 3;
    else if (is_md && total_score >= md - 1) finalClass = 3;
    else if (is_lq && total_score >= lq + 1) finalClass = 3;
    else if (is_md && total_score >= md - 2) finalClass = 2;
    else if (is_lq && total_score >= lq) finalClass = 2;
    else if (is_md && total_score >= md - 4) finalClass = 1;
    else if (is_lq && total_score >= lq - 2) finalClass = 1;
    else finalClass = 0;

    if (enableLogging) console.log('Final classification:', finalClass);
    if (scoreCallback) scoreCallback(total_score);
    return finalClass;
};

// Prestige order for sorting
const PRESTIGE_ORDER = [
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

// In-memory map from JUPAS prefix digit to institution
let prefixToInstitutionMap = null;

// Helper to build prefix-to-institution map from full_data_amended.json
function buildPrefixToInstitutionMap() {
    const jsonPath = path.join(process.cwd(), 'Algorithm', 'full_data_amended.json');
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const map = {};
    for (const prog of data) {
        if (prog.code && prog.institution && prog.code.startsWith('JS') && prog.code.length >= 4) {
            const prefix = prog.code[2]; // first digit after 'JS'
            if (!map[prefix]) {
                map[prefix] = prog.institution;
            }
        }
    }
    return map;
}

// Function to load programme data from JSON file
const loadProgrammeData = () => {
    try {
        const jsonPath = path.join(process.cwd(), 'Algorithm', 'full_data_amended.json');
        const stats = fs.statSync(jsonPath);

        // Check if cache needs updating
        if (programmeDataCache && cacheLastModified && stats.mtime <= cacheLastModified) {
            return programmeDataCache;
        }

        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        programmeDataCache = data;
        cacheLastModified = stats.mtime;

        // Build prefix-to-institution map
        prefixToInstitutionMap = buildPrefixToInstitutionMap();

        console.log(`Loaded ${data.length} programmes into memory cache`);
        return data;
    } catch (error) {
        console.error('Error loading programme data:', error);
        return [];
    }
};

// Get in-memory programme data
const getProgrammeData = () => {
    if (!programmeDataCache) {
        loadProgrammeData();
    }
    return programmeDataCache || [];
};

// Dynamic Programme Schema that can work with any year collection
const createProgrammeSchema = (collectionName) => {
    return new mongoose.Schema({
        active: { type: Boolean, default: true },
        url: { type: String },
        code: { type: String, required: true },
        short_name: { type: String },
        full_title_en: { type: String, required: true },
        full_title_cn: { type: String },
        institution: { type: String, required: true },
        funding: { type: String },
        duration: { type: String },
        intake: { type: String },
        interview: { type: String },
        stats_apply: { type: [[Number]] }, // Array of arrays: [year, bandA, bandB, bandC, bandD, bandE, total]
        stats_offer: { type: [[Number]] }, // Array of arrays: [year, bandA, bandB, bandC, bandD, bandE, total]
        // Additional fields that might be present
        category: { type: String },
        faculty: { type: String },
        department: { type: String },
        min_requirements: {
            chinese: { type: String },
            english: { type: String },
            mathematics: { type: String },
            elective_requirements: { type: String },
            additional_requirements: { type: String }
        },
        weightings: {
            chinese: { type: Number, default: 1 },
            english: { type: Number, default: 1 },
            mathematics: { type: Number, default: 1 },
            elective1: { type: Number, default: 1 },
            elective2: { type: Number, default: 1 },
            elective3: { type: Number, default: 1 }
        },
        calculation_method: { type: String },
        median_score: { type: Number },
        lower_quartile: { type: Number },
        upper_quartile: { type: Number },
        admission_rate: { type: Number },
        employment_rate: { type: Number },
        average_salary: { type: Number },
        description: { type: String },
        career_prospects: { type: String },
        special_requirements: { type: String },
        contact_info: { type: String },
        year: { type: Number },
        created_at: { type: Date, default: Date.now },
        updated_at: { type: Date, default: Date.now }
    }, { collection: collectionName });
};

// Cache for models to avoid recreating them
const modelCache = new Map();

// Helper function to get or create model for a specific collection
const getProgrammeModel = (collectionName) => {
    if (!modelCache.has(collectionName)) {
        const schema = createProgrammeSchema(collectionName);
        const model = mongoose.model(collectionName, schema);
        modelCache.set(collectionName, model);
    }
    return modelCache.get(collectionName);
};

// Get all programmes from a specific collection
router.get('/programmes/:collection', trackRouteUsage, async (req, res) => {
    try {
        const { collection } = req.params;
        console.log(`Fetching all programmes from ${collection} collection`);

        const Programme = getProgrammeModel(collection);
        const programmes = await Programme.find({ active: true }).exec();

        console.log(`Found ${programmes.length} active programmes in ${collection}`);
        return res.status(200).json({
            success: true,
            count: programmes.length,
            collection: collection,
            data: programmes
        });
    } catch (err) {
        console.error('Error fetching programmes:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
});

// Get programmes by category from a specific collection
router.get('/programmes/:collection/category/:category', trackRouteUsage, async (req, res) => {
    try {
        const { collection, category } = req.params;
        console.log(`Fetching programmes for category: ${category} from ${collection}`);

        const Programme = getProgrammeModel(collection);
        const programmes = await Programme.find({
            category: { $regex: category, $options: 'i' },
            active: true
        }).exec();

        console.log(`Found ${programmes.length} programmes in category: ${category} from ${collection}`);
        return res.status(200).json({
            success: true,
            count: programmes.length,
            collection: collection,
            category: category,
            data: programmes
        });
    } catch (err) {
        console.error('Error fetching programmes by category:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
});

// Get programmes by institution from a specific collection
router.get('/programmes/:collection/institution/:institution', trackRouteUsage, async (req, res) => {
    try {
        const { collection, institution } = req.params;
        console.log(`Fetching programmes for institution: ${institution} from ${collection}`);

        const Programme = getProgrammeModel(collection);
        const programmes = await Programme.find({
            institution: { $regex: institution, $options: 'i' },
            active: true
        }).exec();

        console.log(`Found ${programmes.length} programmes for institution: ${institution} from ${collection}`);
        return res.status(200).json({
            success: true,
            count: programmes.length,
            collection: collection,
            institution: institution,
            data: programmes
        });
    } catch (err) {
        console.error('Error fetching programmes by institution:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
});

// Get programme by code from a specific collection
router.get('/programmes/:collection/code/:code', trackRouteUsage, async (req, res) => {
    try {
        const { collection, code } = req.params;
        console.log(`Fetching programme with code: ${code} from ${collection}`);

        const Programme = getProgrammeModel(collection);
        const programme = await Programme.findOne({
            code: code,
            active: true
        }).exec();

        if (!programme) {
            return res.status(404).json({
                success: false,
                message: `Programme with code ${code} not found in ${collection}`
            });
        }

        console.log(`Found programme: ${programme.full_title_en} from ${collection}`);
        return res.status(200).json({
            success: true,
            collection: collection,
            data: programme
        });
    } catch (err) {
        console.error('Error fetching programme by code:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
});

// Get multiple programmes by codes from a specific collection
router.post('/programmes/:collection/codes', trackRouteUsage, async (req, res) => {
    try {
        const { collection } = req.params;
        const { codes } = req.body;

        if (!codes || !Array.isArray(codes) || codes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Codes array is required and must not be empty'
            });
        }

        console.log(`Fetching programmes with codes: ${codes.join(', ')} from ${collection}`);

        const Programme = getProgrammeModel(collection);
        const programmes = await Programme.find({
            code: { $in: codes },
            active: true
        }).exec();

        console.log(`Found ${programmes.length} programmes out of ${codes.length} requested codes from ${collection}`);

        // Create a map of found programmes by code for easy lookup
        const programmesMap = {};
        programmes.forEach(programme => {
            programmesMap[programme.code] = programme;
        });

        // Create response with found programmes and missing codes
        const foundCodes = programmes.map(p => p.code);
        const missingCodes = codes.filter(code => !foundCodes.includes(code));

        return res.status(200).json({
            success: true,
            collection: collection,
            requested_codes: codes,
            found_codes: foundCodes,
            missing_codes: missingCodes,
            count: programmes.length,
            data: programmes,
            programmes_by_code: programmesMap // For easy frontend lookup
        });
    } catch (err) {
        console.error('Error fetching programmes by codes:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
});

// Search programmes by name or description from a specific collection
router.get('/programmes/:collection/search', trackRouteUsage, async (req, res) => {
    try {
        const { collection } = req.params;
        const { q, institutions } = req.query;

        console.log(`Searching programmes with query: ${q} and institutions: ${institutions} in ${collection}`);

        const Programme = getProgrammeModel(collection);

        // Build search query
        let searchQuery = { active: true };

        // Add search text filter if query provided
        if (q && q.trim()) {
            searchQuery.$or = [
                { code: { $regex: q, $options: 'i' } },
                { full_title_en: { $regex: q, $options: 'i' } },
                { short_name: { $regex: q, $options: 'i' } },
                { full_title_cn: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } },
                { category: { $regex: q, $options: 'i' } }
            ];
        }

        // Add institution filter if institutions provided
        if (institutions && institutions.trim()) {
            const institutionList = institutions.split(',').map(inst => inst.trim());
            searchQuery.institution = { $in: institutionList };
        }

        const programmes = await Programme.find(searchQuery)
            .sort({ code: 1 }) // Sort by code ascending
            .limit(20) // Limit results for performance
            .exec();

        console.log(`Found ${programmes.length} programmes matching criteria in ${collection}`);
        return res.status(200).json({
            success: true,
            count: programmes.length,
            collection: collection,
            query: q || '',
            institutions: institutions || '',
            data: programmes
        });
    } catch (err) {
        console.error('Error searching programmes:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
});

// Get programme statistics from a specific collection
router.get('/programmes/:collection/stats', trackRouteUsage, async (req, res) => {
    try {
        const { collection } = req.params;
        console.log(`Fetching programme statistics from ${collection}`);

        const Programme = getProgrammeModel(collection);
        const totalProgrammes = await Programme.countDocuments({ active: true });
        const institutions = await Programme.distinct('institution');
        const categories = await Programme.distinct('category');

        const stats = {
            total_programmes: totalProgrammes,
            total_institutions: institutions.length,
            total_categories: categories.length,
            institutions: institutions,
            categories: categories
        };

        console.log('Programme statistics:', stats);
        return res.status(200).json({
            success: true,
            collection: collection,
            data: stats
        });
    } catch (err) {
        console.error('Error fetching programme statistics:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
});

// Get available collections (programme years)
router.get('/programmes/collections/available', trackRouteUsage, async (req, res) => {
    try {
        console.log('Fetching available programme collections');

        // Get all collections that start with 'programmes_' or 'Programmes_'
        const collections = await mongoose.connection.db.listCollections().toArray();
        const programmeCollections = collections
            .map(col => col.name)
            .filter(name => /^[Pp]rogrammes_\d{4}$/.test(name))
            .sort((a, b) => {
                const yearA = parseInt(a.match(/\d{4}$/)[0]);
                const yearB = parseInt(b.match(/\d{4}$/)[0]);
                return yearB - yearA; // Sort by year descending (newest first)
            });

        console.log('Available programme collections:', programmeCollections);
        return res.status(200).json({
            success: true,
            collections: programmeCollections
        });
    } catch (err) {
        console.error('Error fetching available collections:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
});

// Get current/active programme year (determined by backend)
router.get('/programmes/year/current', trackRouteUsage, async (req, res) => {
    try {
        console.log('Determining current programme year');

        // Get all available programme collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        const programmeCollections = collections
            .map(col => col.name)
            .filter(name => /^[Pp]rogrammes_\d{4}$/.test(name))
            .sort((a, b) => {
                const yearA = parseInt(a.match(/\d{4}$/)[0]);
                const yearB = parseInt(b.match(/\d{4}$/)[0]);
                return yearB - yearA; // Sort by year descending (newest first)
            });

        console.log('Available programme collections:', programmeCollections);

        if (programmeCollections.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No programme collections found'
            });
        }

        // Determine current year based on business logic
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // January is 0

        // Business logic: If we're in the second half of the year (July onwards),
        // use next year's programmes, otherwise use current year's programmes
        let targetYear = currentYear;
        if (currentMonth >= 7) {
            targetYear = currentYear + 1;
        }

        // Find the closest available year (prefer exact match, then closest)
        let selectedCollection = null;

        // First, try to find exact year match
        const exactMatch = programmeCollections.find(col => {
            const year = parseInt(col.match(/\d{4}$/)[0]);
            return year === targetYear;
        });

        if (exactMatch) {
            selectedCollection = exactMatch;
        } else {
            // If no exact match, use the most recent available year
            selectedCollection = programmeCollections[0];
        }

        const selectedYear = parseInt(selectedCollection.match(/\d{4}$/)[0]);

        console.log(`Current date: ${currentDate.toISOString()}, Target year: ${targetYear}, Selected collection: ${selectedCollection}`);

        const response = {
            success: true,
            current_year: selectedYear,
            collection: selectedCollection,
            available_collections: programmeCollections,
            logic: {
                current_date: currentDate.toISOString(),
                target_year: targetYear,
                selection_reason: exactMatch ? 'exact_year_match' : 'most_recent_available'
            }
        };

        return res.status(200).json(response);
    } catch (err) {
        console.error('Error determining current programme year:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
});

// Get available institutions from a specific collection
router.get('/programmes/:collection/institutions', trackRouteUsage, async (req, res) => {
    try {
        const { collection } = req.params;
        console.log(`Fetching available institutions from ${collection}`);

        const Programme = getProgrammeModel(collection);
        const institutions = await Programme.distinct('institution', { active: true })
            .sort() // Sort alphabetically
            .exec();

        console.log(`Found ${institutions.length} institutions in ${collection}`);
        return res.status(200).json({
            success: true,
            collection: collection,
            count: institutions.length,
            data: institutions
        });
    } catch (err) {
        console.error('Error fetching institutions:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
});

// Classify programme based on user scores
router.post('/programmes/:collection/classify', trackRouteUsage, async (req, res) => {
    try {
        const { collection } = req.params;
        const { programmeCode, userScores } = req.body;

        if (!programmeCode || !userScores) {
            return res.status(400).json({
                success: false,
                message: 'Programme code and user scores are required'
            });
        }

        console.log(`Classifying programme ${programmeCode} with scores:`, userScores);

        // Try to find programme in database first
        const Programme = getProgrammeModel(collection);
        let programme = await Programme.findOne({
            code: programmeCode,
            active: true
        }).exec();

        // If not found in database, try in-memory data as fallback
        if (!programme) {
            console.log(`Programme ${programmeCode} not found in database collection ${collection}, trying in-memory data`);
            const inMemoryProgrammes = getProgrammeData();
            programme = inMemoryProgrammes.find(p => p.code === programmeCode && p.active);
        }

        if (!programme) {
            return res.status(404).json({
                success: false,
                message: 'Programme not found in database or in-memory data'
            });
        }

        // Perform classification
        const { classificationResult, total_score } = (() => {
            let total_score = 0;
            const result = classifyProgramme(userScores, programme.toObject(), (score) => { total_score = score; });
            return { classificationResult: result, total_score };
        })();
        const classificationText = CLASSIFICATION_MAPPING[String(classificationResult)];

        console.log(`Classification result for ${programmeCode}: ${classificationResult} (${classificationText}), Score: ${total_score}`);

        return res.status(200).json({
            success: true,
            collection: collection,
            programme_code: programmeCode,
            classification: classificationResult,
            classification_text: classificationText,
            user_score: total_score
        });

    } catch (err) {
        console.error('Error classifying programme:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
});

// Get top 6 programmes within "Basically Safe" range (classification 5) - for backward compatibility
router.post('/programmes/:collection/recommendations/basically-safe', trackRouteUsage, async (req, res) => {
    // Redirect to the dynamic endpoint with classification level 5
    req.params.classificationLevel = '5';
    // Call the dynamic endpoint handler
    return router.handle(req, res, () => { });
});

// Get top programmes within a specific classification range
router.post('/programmes/:collection/recommendations/:classificationLevel', trackRouteUsage, async (req, res) => {
    try {
        const { collection, classificationLevel } = req.params;
        const { userScores, selectedProgrammeCodes = [], institutions = null, numberOfRecommendations = 6 } = req.body;

        if (!userScores) {
            return res.status(400).json({
                success: false,
                message: 'User scores are required'
            });
        }

        console.log(`Finding top ${numberOfRecommendations} programmes starting from classification level ${classificationLevel} and scores:`, userScores);

        // Load in-memory programme data for filtering
        const inMemoryProgrammes = getProgrammeData();
        console.log(`Loaded ${inMemoryProgrammes.length} programmes from memory for filtering`);

        // Filter programmes with classification data from in-memory data
        const programmesWithData = inMemoryProgrammes.filter(programme =>
            programme.active && (
                programme.score_md !== null && programme.score_md !== undefined ||
                programme.score_uq !== null && programme.score_uq !== undefined ||
                programme.score_lq !== null && programme.score_lq !== undefined
            )
        );

        console.log(`Found ${programmesWithData.length} programmes with classification data in memory`);

        if (!programmesWithData || programmesWithData.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No programmes with classification data found'
            });
        }

        console.log(`Found ${programmesWithData.length} programmes with classification data`);

        // Parse classification level to number
        const targetClassification = parseInt(classificationLevel);
        if (isNaN(targetClassification) || targetClassification < 0 || targetClassification > 8) {
            return res.status(400).json({
                success: false,
                message: 'Invalid classification level. Must be between 0 and 8.'
            });
        }

        // Parse and validate number of recommendations
        const numRecommendations = parseInt(numberOfRecommendations);
        if (isNaN(numRecommendations) || numRecommendations < 1 || numRecommendations > 100) {
            return res.status(400).json({
                success: false,
                message: 'Invalid number of recommendations. Must be between 1 and 100.'
            });
        }

        // Get database model for cross-referencing
        const Programme = getProgrammeModel(collection);

        // Filter programmes by institutions if specified
        let filteredProgrammes = programmesWithData;
        if (institutions && institutions.length > 0) {
            filteredProgrammes = programmesWithData.filter(programme =>
                institutions.some(institution =>
                    programme.institution && programme.institution.toLowerCase().includes(institution.toLowerCase())
                )
            );
            console.log(`Filtered programmes by institutions: ${institutions.join(', ')}. Found ${filteredProgrammes.length} programmes out of ${programmesWithData.length}`);
        }

        // Process programmes and find recommendations from multiple classification levels
        const allRecommendedProgrammes = [];
        let processedCount = 0;

        // Adjust processing limit based on whether institutions are filtered
        // If no institutions selected, process more programmes to find recommendations
        const baseLimit = institutions && institutions.length > 0 ? 100 : 500;
        const maxToProcess = Math.min(filteredProgrammes.length, baseLimit);

        // Batch database queries for better performance
        const programmeCodes = filteredProgrammes.slice(0, maxToProcess).map(p => p.code);
        const dbProgrammes = await Programme.find({
            code: { $in: programmeCodes },
            active: true
        }).exec();

        const dbProgrammesMap = {};
        dbProgrammes.forEach(p => {
            dbProgrammesMap[p.code] = p;
        });

        // Track programmes by classification level for better organization
        const programmesByClassification = {};

        for (const programme of filteredProgrammes) {
            // Skip if programme is already selected
            if (selectedProgrammeCodes.includes(programme.code)) {
                continue;
            }

            processedCount++;

            if (processedCount > maxToProcess) {
                console.log(`Stopping after processing ${maxToProcess} programmes for performance`);
                break;
            }

            try {
                // Use the shared classification function with reduced logging for performance
                const classificationResult = classifyProgramme(userScores, programme, null, false);

                // Skip programmes that can't be classified (classification -1)
                if (classificationResult === -1) {
                    continue;
                }

                // Use database programme data if available, otherwise use memory data
                const finalProgramme = dbProgrammesMap[programme.code] || programme;

                const programmeWithClassification = {
                    ...(dbProgrammesMap[programme.code] ? finalProgramme.toObject() : finalProgramme),
                    classification: classificationResult,
                    classification_text: CLASSIFICATION_MAPPING[classificationResult.toString()]
                };

                // Group programmes by classification level
                if (!programmesByClassification[classificationResult]) {
                    programmesByClassification[classificationResult] = [];
                }
                programmesByClassification[classificationResult].push(programmeWithClassification);

            } catch (error) {
                console.error(`Error classifying programme ${programme.code}:`, error);
                // Continue with other programmes
            }
        }

        // Collect programmes starting from target classification level and going up
        // Sort by classification level in ascending order (4, 5, 6, etc.)
        const classificationLevels = Object.keys(programmesByClassification)
            .map(Number)
            .sort((a, b) => a - b); // Sort by classification level (ascending)

        console.log(`Found programmes in classification levels: ${classificationLevels.join(', ')}`);

        // If no programmes found in any classification level, return empty result
        if (classificationLevels.length === 0) {
            console.log('No programmes found in any classification level');
            return res.status(200).json({
                success: true,
                data: [],
                total_programmes_found: 0,
                total_programmes_checked: processedCount,
                total_programmes_available: filteredProgrammes.length,
                total_programmes_before_filter: programmesWithData.length,
                classification_levels_found: [],
                classification_levels_checked: [],
                institutions_filter: institutions,
                data_source: 'memory_filtered_with_db_cross_reference'
            });
        }

        // Start from the target classification level and go up in ascending order
        const targetLevel = parseInt(classificationLevel);
        const levelsToCheck = [];

        // Add target level first
        if (classificationLevels.includes(targetLevel)) {
            levelsToCheck.push(targetLevel);
        }

        // Add higher classification levels (easier programmes) in ascending order
        // DO NOT add lower levels (harder programmes)
        for (const level of classificationLevels) {
            if (level > targetLevel && !levelsToCheck.includes(level)) {
                levelsToCheck.push(level);
            }
        }

        // Sort the levels to ensure ascending order (5, 6, 7, etc.)
        levelsToCheck.sort((a, b) => a - b);

        console.log(`Checking classification levels in ascending order (target ${targetLevel} and higher): ${levelsToCheck.join(', ')}`);

        // Collect programmes from each classification level until we have enough
        for (const classificationLevel of levelsToCheck) {
            if (allRecommendedProgrammes.length >= numRecommendations) {
                console.log(`Reached quota of ${numRecommendations} programmes, stopping collection`);
                break;
            }

            const programmesInLevel = programmesByClassification[classificationLevel];
            console.log(`Adding ${programmesInLevel.length} programmes from classification level ${classificationLevel} (${CLASSIFICATION_MAPPING[classificationLevel.toString()]})`);

            // Sort programmes within this classification level by JUPAS code
            programmesInLevel.sort((a, b) => a.code.localeCompare(b.code));

            // Add programmes from this level until we reach the quota
            for (const programme of programmesInLevel) {
                if (allRecommendedProgrammes.length >= numRecommendations) {
                    break;
                }
                allRecommendedProgrammes.push(programme);
            }
        }

        // Take the top programmes and sort by classification, prestige, then code
        const topProgrammes = allRecommendedProgrammes
            .sort((a, b) => {
                // 1. Classification level (ascending)
                if (a.classification !== b.classification) {
                    return a.classification - b.classification;
                }
                // 2. Prestige order by prefix
                function getInstitutionByPrefix(code) {
                    if (code && code.startsWith('JS') && code.length >= 4 && prefixToInstitutionMap) {
                        return prefixToInstitutionMap[code[2]] || '';
                    }
                    return '';
                }
                const instA = getInstitutionByPrefix(a.code) || a.institution || '';
                const instB = getInstitutionByPrefix(b.code) || b.institution || '';
                const idxA = PRESTIGE_ORDER.indexOf(instA);
                const idxB = PRESTIGE_ORDER.indexOf(instB);
                if (idxA !== idxB) {
                    if (idxA === -1) return 1;
                    if (idxB === -1) return -1;
                    return idxA - idxB;
                }
                // 3. JUPAS code (alphabetical)
                return a.code.localeCompare(b.code);
            })
            .slice(0, numRecommendations);

        console.log(`Found ${topProgrammes.length} programmes across ${levelsToCheck.length} classification levels (${levelsToCheck.join(', ')}) out of ${Object.values(programmesByClassification).flat().length} total (processed ${processedCount} programmes)`);

        return res.status(200).json({
            success: true,
            data: topProgrammes,
            total_programmes_found: Object.values(programmesByClassification).flat().length,
            total_programmes_checked: processedCount,
            total_programmes_available: filteredProgrammes.length,
            total_programmes_before_filter: programmesWithData.length,
            classification_levels_found: classificationLevels,
            classification_levels_checked: levelsToCheck,
            institutions_filter: institutions,
            data_source: 'memory_filtered_with_db_cross_reference'
        });

    } catch (error) {
        console.error('Error finding basically safe programmes:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Preload programme data cache
router.post('/programmes/cache/preload', trackRouteUsage, async (req, res) => {
    try {
        const data = loadProgrammeData();

        // Count programmes with classification data
        const withUQ = data.filter(p => p.score_uq !== null && p.score_uq !== undefined).length;
        const withMD = data.filter(p => p.score_md !== null && p.score_md !== undefined).length;
        const withLQ = data.filter(p => p.score_lq !== null && p.score_lq !== undefined).length;

        return res.status(200).json({
            success: true,
            message: 'Programme data cache loaded successfully',
            cache_info: {
                total_programmes: data.length,
                programmes_with_uq: withUQ,
                programmes_with_md: withMD,
                programmes_with_lq: withLQ,
                cache_last_modified: cacheLastModified
            }
        });
    } catch (error) {
        console.error('Error preloading cache:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to preload cache',
            error: error.message
        });
    }
});

// Get cache status
router.get('/programmes/cache/status', trackRouteUsage, async (req, res) => {
    try {
        const data = getProgrammeData();
        const withUQ = data.filter(p => p.score_uq !== null && p.score_uq !== undefined).length;
        const withMD = data.filter(p => p.score_md !== null && p.score_md !== undefined).length;
        const withLQ = data.filter(p => p.score_lq !== null && p.score_lq !== undefined).length;

        return res.status(200).json({
            success: true,
            cache_loaded: programmeDataCache !== null,
            cache_info: {
                total_programmes: data.length,
                programmes_with_uq: withUQ,
                programmes_with_md: withMD,
                programmes_with_lq: withLQ,
                cache_last_modified: cacheLastModified
            }
        });
    } catch (error) {
        console.error('Error getting cache status:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get cache status',
            error: error.message
        });
    }
});

export default router;