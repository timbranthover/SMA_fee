import { MORRISON_WEALTH_DATASET, buildMorrisonWealthHistory } from "./wealth-source.js";
import { createWealthClientService } from "./wealth-service.js";

export const DEFAULT_HOUSEHOLD_ID = "household-morrison";
export const wealthClientService = createWealthClientService(MORRISON_WEALTH_DATASET);

const defaultWorkspace = wealthClientService.getHouseholdWorkspace(DEFAULT_HOUSEHOLD_ID);
if (!defaultWorkspace) throw new Error(`Default household ${DEFAULT_HOUSEHOLD_ID} is unavailable`);

export const HOUSEHOLD = defaultWorkspace.household;
export const WEALTH_ALLOCATION = defaultWorkspace.allocation;
export const HOUSEHOLD_ACCOUNTS = defaultWorkspace.accounts;
export const HOUSEHOLD_HOLDINGS = defaultWorkspace.holdings;
export const HOUSEHOLD_GOALS = defaultWorkspace.goals;
export const HOUSEHOLD_INSIGHTS = defaultWorkspace.insights;
export const CONCENTRATION_REVIEW = defaultWorkspace.concentrationReview;
export const WEALTH_HISTORY = defaultWorkspace.history;
export const wealthHistory = buildMorrisonWealthHistory;
