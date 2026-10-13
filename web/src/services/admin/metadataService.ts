/**
 * Metadata Service
 * Handles CRUD operations for metadata types (Genres, Languages, Game Modes, etc.)
 */

import { createCrudOperations } from '@/lib/graphqlHelpers';
import {
  LIST_GENRES,
  CREATE_GENRE,
  UPDATE_GENRE,
  DELETE_GENRE,
  LIST_LANGUAGES,
  CREATE_LANGUAGE,
  UPDATE_LANGUAGE,
  DELETE_LANGUAGE,
  LIST_GAME_MODES,
  CREATE_GAME_MODE,
  UPDATE_GAME_MODE,
  DELETE_GAME_MODE,
  LIST_GAME_ENGINES,
  CREATE_GAME_ENGINE,
  UPDATE_GAME_ENGINE,
  DELETE_GAME_ENGINE,
  LIST_PERSPECTIVES,
  CREATE_PERSPECTIVE,
  UPDATE_PERSPECTIVE,
  DELETE_PERSPECTIVE,
  LIST_PLATFORMS,
  CREATE_PLATFORM,
  UPDATE_PLATFORM,
  DELETE_PLATFORM,
  LIST_THEMES,
  CREATE_THEME,
  UPDATE_THEME,
  DELETE_THEME,
  LIST_MOODS,
  CREATE_MOOD,
  UPDATE_MOOD,
  DELETE_MOOD,
  LIST_AGE_RATINGS,
  CREATE_AGE_RATING,
  UPDATE_AGE_RATING,
  DELETE_AGE_RATING,
  LIST_PERSON_ROLES,
  CREATE_PERSON_ROLE,
  UPDATE_PERSON_ROLE,
  DELETE_PERSON_ROLE,
  LIST_SERIES,
  CREATE_SERIES,
  UPDATE_SERIES,
  DELETE_SERIES,
  LIST_COMPANY_ROLES,
  CREATE_COMPANY_ROLE,
  UPDATE_COMPANY_ROLE,
  DELETE_COMPANY_ROLE,
  type Language,
  type LanguageInput,
  type GameModeType,
  type GameModeInput,
  type GameEngineType,
  type GameEngineInput,
  type PerspectiveType,
  type PerspectiveInput,
  type PlatformType,
  type PlatformInput,
  type ThemeType,
  type ThemeInput,
  type MoodType,
  type MoodInput,
  type AgeRatingType,
  type AgeRatingInput,
  type PersonRole,
  type PersonRoleInput,
  type ContentSeries,
  type SeriesInput,
  type CompanyRoleType,
  type CompanyRoleInput,
  LIST_COMPANIES,
  CREATE_COMPANY,
  UPDATE_COMPANY,
  DELETE_COMPANY,
  CATEGORY_COUNT,
  type CompanyType,
  type CompanyInput,
} from '../graphql/admin';
import { graphqlQuery } from '@/lib/graphqlHelpers';

// --- CATEGORY COUNT ---
export async function getCategoryCount(
  type: string,
  search?: string
): Promise<{ data: number; error?: any }> {
  console.log(`📊 [getCategoryCount] type=${type}, search=${search || 'none'}`);
  return graphqlQuery<number>(CATEGORY_COUNT, { type, search }, 'categoryCount');
}

// --- GENRES ---
const genreOps = createCrudOperations<any, { name: string; contentTypeId?: number }>({
  entityName: 'genre',
  emoji: '📚',
  queries: { list: LIST_GENRES, create: CREATE_GENRE, update: UPDATE_GENRE, delete: DELETE_GENRE },
  dataKeys: {
    list: 'listGenres',
    create: 'createGenre',
    update: 'updateGenre',
    delete: 'deleteGenre',
  },
});
export const listGenres = genreOps.list;
export const createGenre = genreOps.create;
export const updateGenre = genreOps.update;
export const deleteGenre = genreOps.delete;

// --- LANGUAGES ---
const languageOps = createCrudOperations<Language, { name: string; isoCode?: string }>({
  entityName: 'language',
  emoji: '🗣️',
  queries: {
    list: LIST_LANGUAGES,
    create: CREATE_LANGUAGE,
    update: UPDATE_LANGUAGE,
    delete: DELETE_LANGUAGE,
  },
  dataKeys: {
    list: 'listLanguages',
    create: 'createLanguage',
    update: 'updateLanguage',
    delete: 'deleteLanguage',
  },
  defaultLimit: 250,
});
export const listLanguages = languageOps.list;
export const createLanguage = languageOps.create;
export const updateLanguage = languageOps.update;
export const deleteLanguage = languageOps.delete;

// --- GAME MODES ---
const gameModeOps = createCrudOperations<GameModeType, GameModeInput>({
  entityName: 'game mode',
  emoji: '🎮',
  queries: {
    list: LIST_GAME_MODES,
    create: CREATE_GAME_MODE,
    update: UPDATE_GAME_MODE,
    delete: DELETE_GAME_MODE,
  },
  dataKeys: {
    list: 'listGameModes',
    create: 'createGameMode',
    update: 'updateGameMode',
    delete: 'deleteGameMode',
  },
});
export const listGameModes = gameModeOps.list;
export const createGameMode = gameModeOps.create;
export const updateGameMode = gameModeOps.update;
export const deleteGameMode = gameModeOps.delete;

// --- GAME ENGINES ---
const gameEngineOps = createCrudOperations<GameEngineType, GameEngineInput>({
  entityName: 'game engine',
  emoji: '⚙️',
  queries: {
    list: LIST_GAME_ENGINES,
    create: CREATE_GAME_ENGINE,
    update: UPDATE_GAME_ENGINE,
    delete: DELETE_GAME_ENGINE,
  },
  dataKeys: {
    list: 'listGameEngines',
    create: 'createGameEngine',
    update: 'updateGameEngine',
    delete: 'deleteGameEngine',
  },
});
export const listGameEngines = gameEngineOps.list;
export const createGameEngine = gameEngineOps.create;
export const updateGameEngine = gameEngineOps.update;
export const deleteGameEngine = gameEngineOps.delete;

// --- PERSPECTIVES ---
const perspectiveOps = createCrudOperations<PerspectiveType, PerspectiveInput>({
  entityName: 'perspective',
  emoji: '👁️',
  queries: {
    list: LIST_PERSPECTIVES,
    create: CREATE_PERSPECTIVE,
    update: UPDATE_PERSPECTIVE,
    delete: DELETE_PERSPECTIVE,
  },
  dataKeys: {
    list: 'listPerspectives',
    create: 'createPerspective',
    update: 'updatePerspective',
    delete: 'deletePerspective',
  },
});
export const listPerspectives = perspectiveOps.list;
export const createPerspective = perspectiveOps.create;
export const updatePerspective = perspectiveOps.update;
export const deletePerspective = perspectiveOps.delete;

// --- PLATFORMS ---
const platformOps = createCrudOperations<PlatformType, PlatformInput>({
  entityName: 'platform',
  emoji: '🖥️',
  queries: {
    list: LIST_PLATFORMS,
    create: CREATE_PLATFORM,
    update: UPDATE_PLATFORM,
    delete: DELETE_PLATFORM,
  },
  dataKeys: {
    list: 'listPlatforms',
    create: 'createPlatform',
    update: 'updatePlatform',
    delete: 'deletePlatform',
  },
});
export const listPlatforms = platformOps.list;
export const createPlatform = platformOps.create;
export const updatePlatform = platformOps.update;
export const deletePlatform = platformOps.delete;

// --- THEMES ---
const themeOps = createCrudOperations<ThemeType, ThemeInput>({
  entityName: 'theme',
  emoji: '🎨',
  queries: { list: LIST_THEMES, create: CREATE_THEME, update: UPDATE_THEME, delete: DELETE_THEME },
  dataKeys: {
    list: 'listThemes',
    create: 'createTheme',
    update: 'updateTheme',
    delete: 'deleteTheme',
  },
});
export const listThemes = themeOps.list;
export const createTheme = themeOps.create;
export const updateTheme = themeOps.update;
export const deleteTheme = themeOps.delete;

// --- MOODS ---
const moodOps = createCrudOperations<MoodType, MoodInput>({
  entityName: 'mood',
  emoji: '😊',
  queries: { list: LIST_MOODS, create: CREATE_MOOD, update: UPDATE_MOOD, delete: DELETE_MOOD },
  dataKeys: { list: 'listMoods', create: 'createMood', update: 'updateMood', delete: 'deleteMood' },
});
export const listMoods = moodOps.list;
export const createMood = moodOps.create;
export const updateMood = moodOps.update;
export const deleteMood = moodOps.delete;

// --- AGE RATINGS ---
const ageRatingOps = createCrudOperations<AgeRatingType, AgeRatingInput>({
  entityName: 'age rating',
  emoji: '🔞',
  queries: {
    list: LIST_AGE_RATINGS,
    create: CREATE_AGE_RATING,
    update: UPDATE_AGE_RATING,
    delete: DELETE_AGE_RATING,
  },
  dataKeys: {
    list: 'listAgeRatings',
    create: 'createAgeRating',
    update: 'updateAgeRating',
    delete: 'deleteAgeRating',
  },
});
export const listAgeRatings = ageRatingOps.list;
export const createAgeRating = ageRatingOps.create;
export const updateAgeRating = ageRatingOps.update;
export const deleteAgeRating = ageRatingOps.delete;

// --- PERSON ROLES ---
const personRoleOps = createCrudOperations<PersonRole, PersonRoleInput>({
  entityName: 'person role',
  emoji: '🎭',
  queries: {
    list: LIST_PERSON_ROLES,
    create: CREATE_PERSON_ROLE,
    update: UPDATE_PERSON_ROLE,
    delete: DELETE_PERSON_ROLE,
  },
  dataKeys: {
    list: 'listPersonRoles',
    create: 'createPersonRole',
    update: 'updatePersonRole',
    delete: 'deletePersonRole',
  },
  nameKey: 'label',
});
export const listPersonRoles = personRoleOps.list;
export const createPersonRole = personRoleOps.create;
export const updatePersonRole = personRoleOps.update;
export const deletePersonRole = personRoleOps.delete;

// --- SERIES ---
const seriesOps = createCrudOperations<ContentSeries, SeriesInput>({
  entityName: 'series',
  emoji: '📺',
  queries: {
    list: LIST_SERIES,
    create: CREATE_SERIES,
    update: UPDATE_SERIES,
    delete: DELETE_SERIES,
  },
  dataKeys: {
    list: 'listSeries',
    create: 'createSeries',
    update: 'updateSeries',
    delete: 'deleteSeries',
  },
});
export const listSeries = seriesOps.list;
export const createSeries = seriesOps.create;
export const updateSeries = seriesOps.update;
export const deleteSeries = seriesOps.delete;

// --- COMPANY ROLES ---
const companyRoleOps = createCrudOperations<CompanyRoleType, CompanyRoleInput>({
  entityName: 'company role',
  emoji: '🏷️',
  queries: {
    list: LIST_COMPANY_ROLES,
    create: CREATE_COMPANY_ROLE,
    update: UPDATE_COMPANY_ROLE,
    delete: DELETE_COMPANY_ROLE,
  },
  dataKeys: {
    list: 'listCompanyRoles',
    create: 'createCompanyRole',
    update: 'updateCompanyRole',
    delete: 'deleteCompanyRole',
  },
});
export const listCompanyRoles = companyRoleOps.list;
export const createCompanyRole = companyRoleOps.create;
export const updateCompanyRole = companyRoleOps.update;
export const deleteCompanyRole = companyRoleOps.delete;

// --- COMPANIES ---
const companyOps = createCrudOperations<CompanyType, CompanyInput>({
  entityName: 'company',
  emoji: '🏢',
  queries: {
    list: LIST_COMPANIES,
    create: CREATE_COMPANY,
    update: UPDATE_COMPANY,
    delete: DELETE_COMPANY,
  },
  dataKeys: {
    list: 'listCompanies',
    create: 'createCompany',
    update: 'updateCompany',
    delete: 'deleteCompany',
  },
});
export const listCompanies = companyOps.list;
export const createCompany = companyOps.create;
export const updateCompany = companyOps.update;
export const deleteCompany = companyOps.delete;
