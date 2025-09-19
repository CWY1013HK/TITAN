// Programme Service for handling API calls to the backend
class ProgrammeService {
    constructor() {
        this.baseURL = '/api';
        this.currentCollection = null; // Will be set by backend
    }

    // Initialize the service by getting the current year from backend
    async initialize() {
        try {
            const result = await this.getCurrentYear();
            if (result.success) {
                this.currentCollection = result.collection;
                // console.log('Programme service initialized with collection:', this.currentCollection);

                // Preload the programme data cache for better performance
                await this.preloadCache();
            } else {
                throw new Error('Failed to get current year from backend');
            }
        } catch (error) {
            console.error('Error initializing programme service:', error);
            throw error;
        }
    }

    // Get current/active programme year from backend
    async getCurrentYear() {
        try {
            const response = await fetch(`${this.baseURL}/programmes/year/current`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching current year:', error);
            throw error;
        }
    }

    // Set the current collection to use (for manual override)
    setCollection(collectionName) {
        this.currentCollection = collectionName;
    }

    // Get available collections
    async getAvailableCollections() {
        try {
            const response = await fetch(`${this.baseURL}/programmes/collections/available`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching available collections:', error);
            throw error;
        }
    }

    // Get all programmes from current collection
    async getAllProgrammes(collectionName = null) {
        try {
            const collection = collectionName || this.currentCollection;
            if (!collection) {
                throw new Error('No collection specified. Please initialize the service first.');
            }

            const response = await fetch(`${this.baseURL}/programmes/${encodeURIComponent(collection)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching all programmes:', error);
            throw error;
        }
    }

    // Get programmes by category from current collection
    async getProgrammesByCategory(category, collectionName = null) {
        try {
            const collection = collectionName || this.currentCollection;
            if (!collection) {
                throw new Error('No collection specified. Please initialize the service first.');
            }

            const response = await fetch(`${this.baseURL}/programmes/${encodeURIComponent(collection)}/category/${encodeURIComponent(category)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching programmes by category:', error);
            throw error;
        }
    }

    // Get programmes by institution from current collection
    async getProgrammesByInstitution(institution, collectionName = null) {
        try {
            const collection = collectionName || this.currentCollection;
            if (!collection) {
                throw new Error('No collection specified. Please initialize the service first.');
            }

            const response = await fetch(`${this.baseURL}/programmes/${encodeURIComponent(collection)}/institution/${encodeURIComponent(institution)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching programmes by institution:', error);
            throw error;
        }
    }

    // Get programme by code from current collection
    async getProgrammeByCode(code, collectionName = null) {
        try {
            const collection = collectionName || this.currentCollection;
            if (!collection) {
                throw new Error('No collection specified. Please initialize the service first.');
            }

            const response = await fetch(`${this.baseURL}/programmes/${encodeURIComponent(collection)}/code/${encodeURIComponent(code)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching programme by code:', error);
            throw error;
        }
    }

    // Search programmes from current collection
    async searchProgrammes(query, institutions = null, collectionName = null) {
        try {
            const collection = collectionName || this.currentCollection;
            if (!collection) {
                throw new Error('No collection specified. Please initialize the service first.');
            }

            let url = `${this.baseURL}/programmes/${encodeURIComponent(collection)}/search?`;
            const params = new URLSearchParams();

            if (query && query.trim()) {
                params.append('q', query.trim());
            }

            if (institutions && institutions.length > 0) {
                params.append('institutions', institutions.join(','));
            }

            const response = await fetch(`${url}${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error searching programmes:', error);
            throw error;
        }
    }

    // Get programme statistics from current collection
    async getProgrammeStats(collectionName = null) {
        try {
            const collection = collectionName || this.currentCollection;
            if (!collection) {
                throw new Error('No collection specified. Please initialize the service first.');
            }

            const response = await fetch(`${this.baseURL}/programmes/${encodeURIComponent(collection)}/stats`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching programme statistics:', error);
            throw error;
        }
    }

    // Calculate admission rate from stats_apply and stats_offer
    calculateAdmissionRate(programme) {
        if (!programme.stats_apply || !programme.stats_offer) {
            return null;
        }

        // Get the most recent year's data (first element in each array)
        const latestApply = programme.stats_apply[0];
        const latestOffer = programme.stats_offer[0];

        if (!latestApply || !latestOffer || latestApply.length < 7 || latestOffer.length < 7) {
            return null;
        }

        // Total applications and offers (last element in each array)
        const totalApplications = latestApply[6];
        const totalOffers = latestOffer[6];

        if (totalApplications === 0) {
            return 0;
        }

        return Math.round((totalOffers / totalApplications) * 100);
    }

    // Get recommended programmes based on DSE scores
    async getRecommendedProgrammes(dseScores, collectionName = null) {
        try {
            const collection = collectionName || this.currentCollection;
            if (!collection) {
                throw new Error('No collection specified. Please initialize the service first.');
            }

            // Calculate total score and best scores
            const totalScore = dseScores.reduce((total, score) => {
                const scoreValue = score.score === "5**" ? 7 :
                    score.score === "5*" ? 6 :
                        score.score === "5" ? 5 :
                            score.score === "4" ? 4 :
                                score.score === "3" ? 3 :
                                    score.score === "2" ? 2 :
                                        score.score === "1" ? 1 : 0;
                return total + scoreValue;
            }, 0);

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

            const best6Score = dseScores
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
                .slice(0, 6)
                .reduce((sum, score) => sum + score, 0);

            // Get all programmes and filter based on scores
            const allProgrammes = await this.getAllProgrammes(collection);

            if (!allProgrammes.success) {
                throw new Error('Failed to fetch programmes');
            }

            // Filter programmes based on score requirements and calculate admission rates
            const recommendedProgrammes = allProgrammes.data
                .filter(programme => {
                    // Check if programme has median score data
                    if (programme.median_score) {
                        // For programmes using Best 5 calculation
                        if (programme.calculation_method === 'Best 5' && best5Score >= programme.median_score) {
                            return true;
                        }
                        // For programmes using Best 6 calculation
                        if (programme.calculation_method === 'Best 6' && best6Score >= programme.median_score) {
                            return true;
                        }
                        // Default to Best 5 if no calculation method specified
                        if (!programme.calculation_method && best5Score >= programme.median_score) {
                            return true;
                        }
                    }
                    return false;
                })
                .map(programme => ({
                    ...programme,
                    admission_rate: programme.admission_rate || this.calculateAdmissionRate(programme)
                }));

            // Sort by admission rate (higher is better) and then by median score
            recommendedProgrammes.sort((a, b) => {
                if (a.admission_rate && b.admission_rate) {
                    return b.admission_rate - a.admission_rate;
                }
                if (a.median_score && b.median_score) {
                    return a.median_score - b.median_score;
                }
                return 0;
            });

            return {
                success: true,
                count: recommendedProgrammes.length,
                collection: collection,
                data: recommendedProgrammes,
                userScores: {
                    totalScore,
                    best5Score,
                    best6Score
                }
            };
        } catch (error) {
            console.error('Error getting recommended programmes:', error);
            throw error;
        }
    }

    // Preload programme data cache
    async preloadCache() {
        try {
            const response = await fetch(`${this.baseURL}/programmes/cache/preload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                console.warn('Failed to preload cache, continuing without cache');
                return;
            }

            const data = await response.json();
            // console.log('Programme data cache preloaded:', data.cache_info);
        } catch (error) {
            console.warn('Error preloading cache, continuing without cache:', error);
        }
    }

    // Get cache status
    async getCacheStatus() {
        try {
            const response = await fetch(`${this.baseURL}/programmes/cache/status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error getting cache status:', error);
            throw error;
        }
    }

    // Get available institutions from current collection
    async getAvailableInstitutions(collectionName = null) {
        try {
            const collection = collectionName || this.currentCollection;
            if (!collection) {
                throw new Error('No collection specified. Please initialize the service first.');
            }

            const response = await fetch(`${this.baseURL}/programmes/${encodeURIComponent(collection)}/institutions`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching available institutions:', error);
            throw error;
        }
    }

    // Get programme recommendations by classification level
    async getRecommendationsByClassification(dseScores, selectedProgrammes = [], collectionName = null, institutions = null, classificationLevel = 5, numberOfRecommendations = 6) {
        try {
            const collection = collectionName || this.currentCollection;
            if (!collection) {
                throw new Error('No collection specified. Please initialize the service first.');
            }

            // Convert DSE scores to the format expected by the backend
            const scoresObject = {};
            dseScores.forEach(score => {
                if (score.subjectCode && score.score) {
                    scoresObject[score.subjectCode] = score.score;
                }
            });

            // Extract selected programme codes
            const selectedProgrammeCodes = selectedProgrammes.map(programme => programme.code);

            const response = await fetch(`${this.baseURL}/programmes/${encodeURIComponent(collection)}/recommendations/${classificationLevel}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userScores: scoresObject,
                    selectedProgrammeCodes: selectedProgrammeCodes,
                    institutions: institutions,
                    numberOfRecommendations: numberOfRecommendations
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error getting recommendations by classification:', error);
            throw error;
        }
    }

    // Get basically safe programme recommendations (top 6 by UQ score) - for backward compatibility
    async getBasicallySafeRecommendations(dseScores, selectedProgrammes = [], collectionName = null, institutions = null) {
        return this.getRecommendationsByClassification(dseScores, selectedProgrammes, collectionName, institutions, 5, 6);
    }
}

// Create and export a singleton instance
const programmeService = new ProgrammeService();
export default programmeService; 