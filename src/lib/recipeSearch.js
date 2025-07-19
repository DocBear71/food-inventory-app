// file: /src/lib/recipeSearch.js v1 - Advanced recipe search and discovery utilities

export class RecipeSearchEngine {
    constructor() {
        this.searchHistory = this.loadSearchHistory();
        this.preferences = this.loadUserPreferences();
    }

    // Advanced search with multiple criteria
    searchRecipes(recipes, criteria) {
        if (!Array.isArray(recipes)) return [];

        let filtered = [...recipes];

        // Text search (title, description, ingredients)
        if (criteria.query?.trim()) {
            const query = criteria.query.toLowerCase().trim();
            filtered = filtered.filter(recipe => {
                const titleMatch = recipe.title?.toLowerCase().includes(query);
                const descMatch = recipe.description?.toLowerCase().includes(query);
                const ingredientMatch = this.searchInIngredients(recipe, query);
                return titleMatch || descMatch || ingredientMatch;
            });
        }

        // Category filter
        if (criteria.category) {
            filtered = filtered.filter(recipe => recipe.category === criteria.category);
        }

        // Tags filter (multiple tags)
        if (criteria.tags?.length > 0) {
            filtered = filtered.filter(recipe =>
                Array.isArray(recipe.tags) &&
                criteria.tags.some(tag => recipe.tags.includes(tag))
            );
        }

        // Difficulty filter
        if (criteria.difficulty) {
            filtered = filtered.filter(recipe => recipe.difficulty === criteria.difficulty);
        }

        // Time filters
        if (criteria.maxCookTime) {
            filtered = filtered.filter(recipe => {
                const totalTime = (recipe.cookTime || 0) + (recipe.prepTime || 0);
                return totalTime <= criteria.maxCookTime;
            });
        }

        if (criteria.maxPrepTime) {
            filtered = filtered.filter(recipe =>
                (recipe.prepTime || 0) <= criteria.maxPrepTime
            );
        }

        // Servings filter
        if (criteria.servings) {
            const targetServings = parseInt(criteria.servings);
            filtered = filtered.filter(recipe => {
                const recipeServings = recipe.servings || 4;
                return Math.abs(recipeServings - targetServings) <= 2;
            });
        }

        // Nutrition filters
        if (criteria.nutrition) {
            filtered = this.applyNutritionFilters(filtered, criteria.nutrition);
        }

        // Rating filter
        if (criteria.minRating) {
            filtered = filtered.filter(recipe =>
                (recipe.ratingStats?.averageRating || 0) >= criteria.minRating
            );
        }

        // Ingredient inclusion/exclusion
        if (criteria.includeIngredients?.length > 0) {
            filtered = filtered.filter(recipe =>
                criteria.includeIngredients.every(ingredient =>
                    this.searchInIngredients(recipe, ingredient)
                )
            );
        }

        if (criteria.excludeIngredients?.length > 0) {
            filtered = filtered.filter(recipe =>
                !criteria.excludeIngredients.some(ingredient =>
                    this.searchInIngredients(recipe, ingredient)
                )
            );
        }

        // Dietary restrictions
        if (criteria.dietaryRestrictions?.length > 0) {
            filtered = this.applyDietaryFilters(filtered, criteria.dietaryRestrictions);
        }

        // Sort results
        return this.sortRecipes(filtered, criteria.sortBy || 'relevance', criteria.query);
    }

    // Enhanced ingredient search
    searchInIngredients(recipe, searchTerm) {
        if (!recipe?.ingredients || !searchTerm) return false;

        const normalizedSearch = searchTerm.toLowerCase().trim();

        return recipe.ingredients.some(ingredient => {
            if (!ingredient) return false;

            const ingredientText = typeof ingredient === 'string'
                ? ingredient
                : `${ingredient.amount || ''} ${ingredient.unit || ''} ${ingredient.name || ingredient.ingredient || ''}`.trim();

            return ingredientText.toLowerCase().includes(normalizedSearch);
        });
    }

    // Apply nutrition filters
    applyNutritionFilters(recipes, nutritionCriteria) {
        return recipes.filter(recipe => {
            if (!recipe.nutrition) return true; // If no nutrition data, include by default

            const nutrition = recipe.nutrition;

            // Calorie range
            if (nutritionCriteria.maxCalories && nutrition.calories?.value > nutritionCriteria.maxCalories) {
                return false;
            }
            if (nutritionCriteria.minCalories && nutrition.calories?.value < nutritionCriteria.minCalories) {
                return false;
            }

            // Protein requirements
            if (nutritionCriteria.minProtein && nutrition.protein?.value < nutritionCriteria.minProtein) {
                return false;
            }

            // Low carb filter
            if (nutritionCriteria.lowCarb && nutrition.carbs?.value > 20) {
                return false;
            }

            // High protein filter
            if (nutritionCriteria.highProtein && nutrition.protein?.value < 20) {
                return false;
            }

            return true;
        });
    }

    // Apply dietary restriction filters
    applyDietaryFilters(recipes, restrictions) {
        return recipes.filter(recipe => {
            if (!recipe.ingredients) return true;

            return restrictions.every(restriction => {
                switch (restriction) {
                    case 'vegetarian':
                        return !this.containsMeat(recipe);
                    case 'vegan':
                        return !this.containsAnimalProducts(recipe);
                    case 'gluten-free':
                        return !this.containsGluten(recipe);
                    case 'dairy-free':
                        return !this.containsDairy(recipe);
                    case 'nut-free':
                        return !this.containsNuts(recipe);
                    default:
                        return true;
                }
            });
        });
    }

    // Dietary restriction helpers
    containsMeat(recipe) {
        const meatKeywords = ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'fish', 'salmon', 'tuna', 'meat', 'bacon', 'ham'];
        return this.containsAnyKeyword(recipe, meatKeywords);
    }

    containsAnimalProducts(recipe) {
        const animalKeywords = ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'fish', 'salmon', 'tuna', 'meat', 'bacon', 'ham',
            'milk', 'cheese', 'butter', 'cream', 'yogurt', 'egg', 'honey'];
        return this.containsAnyKeyword(recipe, animalKeywords);
    }

    containsGluten(recipe) {
        const glutenKeywords = ['flour', 'wheat', 'bread', 'pasta', 'noodles', 'soy sauce', 'beer'];
        return this.containsAnyKeyword(recipe, glutenKeywords);
    }

    containsDairy(recipe) {
        const dairyKeywords = ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'sour cream'];
        return this.containsAnyKeyword(recipe, dairyKeywords);
    }

    containsNuts(recipe) {
        const nutKeywords = ['almond', 'walnut', 'pecan', 'cashew', 'peanut', 'hazelnut', 'pistachio', 'macadamia'];
        return this.containsAnyKeyword(recipe, nutKeywords);
    }

    containsAnyKeyword(recipe, keywords) {
        if (!recipe.ingredients) return false;

        return recipe.ingredients.some(ingredient => {
            const ingredientText = typeof ingredient === 'string'
                ? ingredient
                : `${ingredient.name || ingredient.ingredient || ''}`.toLowerCase();

            return keywords.some(keyword => ingredientText.includes(keyword.toLowerCase()));
        });
    }

    // Advanced sorting
    sortRecipes(recipes, sortBy, searchQuery = null) {
        return recipes.sort((a, b) => {
            switch (sortBy) {
                case 'relevance':
                    if (searchQuery) {
                        const aScore = this.calculateRelevanceScore(a, searchQuery);
                        const bScore = this.calculateRelevanceScore(b, searchQuery);
                        if (aScore !== bScore) return bScore - aScore;
                    }
                    // Fall back to rating for relevance
                    return (b.ratingStats?.averageRating || 0) - (a.ratingStats?.averageRating || 0);

                case 'rating':
                    const aRating = a.ratingStats?.averageRating || 0;
                    const bRating = b.ratingStats?.averageRating || 0;
                    if (bRating !== aRating) return bRating - aRating;
                    return (b.ratingStats?.totalRatings || 0) - (a.ratingStats?.totalRatings || 0);

                case 'popular':
                    const aViews = a.metrics?.viewCount || 0;
                    const bViews = b.metrics?.viewCount || 0;
                    if (bViews !== aViews) return bViews - aViews;
                    return (b.ratingStats?.averageRating || 0) - (a.ratingStats?.averageRating || 0);

                case 'newest':
                    const aDate = new Date(a.createdAt || 0);
                    const bDate = new Date(b.createdAt || 0);
                    return bDate - aDate;

                case 'quickest':
                    const aTotalTime = (a.cookTime || 0) + (a.prepTime || 0);
                    const bTotalTime = (b.cookTime || 0) + (b.prepTime || 0);
                    return aTotalTime - bTotalTime;

                case 'easiest':
                    const difficultyOrder = { easy: 0, medium: 1, hard: 2 };
                    const aDiff = difficultyOrder[a.difficulty] ?? 1;
                    const bDiff = difficultyOrder[b.difficulty] ?? 1;
                    return aDiff - bDiff;

                case 'title':
                    return (a.title || '').localeCompare(b.title || '');

                default:
                    return 0;
            }
        });
    }

    // Calculate relevance score for search ranking
    calculateRelevanceScore(recipe, searchQuery) {
        if (!searchQuery) return 0;

        let score = 0;
        const query = searchQuery.toLowerCase();

        // Title matches (highest weight)
        if (recipe.title?.toLowerCase().includes(query)) {
            score += 10;
            if (recipe.title?.toLowerCase().startsWith(query)) {
                score += 5; // Bonus for starting with query
            }
        }

        // Description matches
        if (recipe.description?.toLowerCase().includes(query)) {
            score += 5;
        }

        // Ingredient matches
        if (this.searchInIngredients(recipe, query)) {
            score += 3;
        }

        // Tag matches
        if (Array.isArray(recipe.tags) && recipe.tags.some(tag => tag.toLowerCase().includes(query))) {
            score += 7;
        }

        // Boost for higher rated recipes
        score += (recipe.ratingStats?.averageRating || 0) * 0.5;

        return score;
    }

    // Recipe discovery suggestions
    getDiscoveryCollections(recipes) {
        if (!Array.isArray(recipes)) return {};

        return {
            quickMeals: this.getQuickMeals(recipes),
            highlyRated: this.getHighlyRated(recipes),
            recentlyAdded: this.getRecentlyAdded(recipes),
            comfortFood: this.getComfortFood(recipes),
            healthy: this.getHealthyRecipes(recipes),
            beginner: this.getBeginnerFriendly(recipes),
            trending: this.getTrending(recipes)
        };
    }

    getQuickMeals(recipes) {
        return recipes
            .filter(recipe => {
                const totalTime = (recipe.cookTime || 0) + (recipe.prepTime || 0);
                return totalTime <= 30;
            })
            .sort((a, b) => {
                const aTotalTime = (a.cookTime || 0) + (a.prepTime || 0);
                const bTotalTime = (b.cookTime || 0) + (b.prepTime || 0);
                return aTotalTime - bTotalTime;
            })
            .slice(0, 12);
    }

    getHighlyRated(recipes) {
        return recipes
            .filter(recipe =>
                (recipe.ratingStats?.averageRating || 0) >= 4.0 &&
                (recipe.ratingStats?.totalRatings || 0) >= 3
            )
            .sort((a, b) => (b.ratingStats?.averageRating || 0) - (a.ratingStats?.averageRating || 0))
            .slice(0, 12);
    }

    getRecentlyAdded(recipes) {
        return recipes
            .filter(recipe => recipe.createdAt)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 12);
    }

    getComfortFood(recipes) {
        const comfortKeywords = ['comfort', 'hearty', 'warm', 'cozy', 'classic', 'traditional', 'homestyle'];
        return recipes
            .filter(recipe => {
                const text = `${recipe.title} ${recipe.description} ${(recipe.tags || []).join(' ')}`.toLowerCase();
                return comfortKeywords.some(keyword => text.includes(keyword));
            })
            .slice(0, 12);
    }

    getHealthyRecipes(recipes) {
        return recipes
            .filter(recipe => {
                if (!recipe.nutrition) return false;
                const calories = recipe.nutrition.calories?.value || 0;
                const protein = recipe.nutrition.protein?.value || 0;
                return calories < 500 && protein > 15;
            })
            .sort((a, b) => (b.nutrition?.protein?.value || 0) - (a.nutrition?.protein?.value || 0))
            .slice(0, 12);
    }

    getBeginnerFriendly(recipes) {
        return recipes
            .filter(recipe => recipe.difficulty === 'easy')
            .sort((a, b) => {
                const aTotalTime = (a.cookTime || 0) + (a.prepTime || 0);
                const bTotalTime = (b.cookTime || 0) + (b.prepTime || 0);
                return aTotalTime - bTotalTime;
            })
            .slice(0, 12);
    }

    getTrending(recipes) {
        // Simple trending algorithm based on recent views and ratings
        return recipes
            .filter(recipe => recipe.metrics?.viewCount > 0)
            .sort((a, b) => {
                const aScore = (a.metrics?.viewCount || 0) * 0.7 + (a.ratingStats?.averageRating || 0) * 0.3;
                const bScore = (b.metrics?.viewCount || 0) * 0.7 + (b.ratingStats?.averageRating || 0) * 0.3;
                return bScore - aScore;
            })
            .slice(0, 12);
    }

    // Search history management
    addToSearchHistory(query) {
        if (!query || query.trim().length < 2) return;

        const trimmedQuery = query.trim();
        this.searchHistory = this.searchHistory.filter(item => item.query !== trimmedQuery);
        this.searchHistory.unshift({
            query: trimmedQuery,
            timestamp: Date.now()
        });

        // Keep only last 10 searches
        this.searchHistory = this.searchHistory.slice(0, 10);
        this.saveSearchHistory();
    }

    getSearchSuggestions(query) {
        if (!query || query.length < 2) return this.getPopularSearches();

        const suggestions = this.searchHistory
            .filter(item => item.query.toLowerCase().includes(query.toLowerCase()))
            .map(item => item.query)
            .slice(0, 5);

        return suggestions;
    }

    getPopularSearches() {
        return ['chicken', 'pasta', 'soup', 'salad', 'dessert', 'quick meals', 'comfort food'];
    }

    // Storage methods
    loadSearchHistory() {
        try {
            const saved = localStorage.getItem('recipe-search-history');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading search history:', error);
            return [];
        }
    }

    saveSearchHistory() {
        try {
            localStorage.setItem('recipe-search-history', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.error('Error saving search history:', error);
        }
    }

    loadUserPreferences() {
        try {
            const saved = localStorage.getItem('recipe-search-preferences');
            return saved ? JSON.parse(saved) : {
                defaultSort: 'relevance',
                resultsPerPage: 20,
                showNutrition: true,
                dietaryRestrictions: []
            };
        } catch (error) {
            console.error('Error loading user preferences:', error);
            return {};
        }
    }

    saveUserPreferences(preferences) {
        try {
            this.preferences = { ...this.preferences, ...preferences };
            localStorage.setItem('recipe-search-preferences', JSON.stringify(this.preferences));
        } catch (error) {
            console.error('Error saving user preferences:', error);
        }
    }
}
