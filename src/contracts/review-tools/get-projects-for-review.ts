import { z } from 'zod';
import { ReviewProjectSummarySchema } from './shared/review-project.js';

/**
 * Input schema for get_projects_for_review tool.
 *
 * Queries projects that are due for periodic GTD review.
 *
 * ## Filter Logic
 *
 * **Default behavior** (no parameters): Returns projects where `nextReviewDate <= today`.
 * This matches OmniFocus's built-in "Review" perspective behavior.
 *
 * ## Filter Options
 *
 * - `includeUpcoming`: When true, also includes projects with `nextReviewDate` within 7 days
 * - `folderId/folderName`: Restricts to projects within a specific folder (recursive)
 * - `limit`: Maximum results (default 100, max 1000)
 *
 * ## Project Inclusion Rules
 *
 * A project is included if ALL of these are true:
 * 1. Project has a reviewInterval configured (null reviewInterval = never reviewed)
 * 2. Project has a nextReviewDate (may be null transiently)
 * 3. nextReviewDate meets the date criteria (due or upcoming)
 * 4. Project matches folder filter (if provided)
 *
 * ## Edge Cases
 *
 * - **Dropped/Done projects**: Excluded by default (they have no active review need)
 * - **Projects without reviewInterval**: Always excluded (reviews are disabled)
 * - **Null nextReviewDate with reviewInterval**: Excluded (transient state)
 *
 * ## Performance
 *
 * Server-side OmniJS filtering ensures <500ms response for databases with 500+ projects.
 * All filtering happens in OmniFocus, not post-retrieval.
 */
export const GetProjectsForReviewInputSchema = z.object({
  // Review status filter
  includeUpcoming: z
    .boolean()
    .default(false)
    .describe(
      'Include projects due within 7 days (default: false = only overdue/due today). When true, returns both overdue AND upcoming projects.'
    ),

  // Container filter (ID takes precedence over Name if both provided)
  folderId: z
    .string()
    .optional()
    .describe('Filter by folder ID (includes all nested subfolders recursively)'),
  folderName: z
    .string()
    .optional()
    .describe('Filter by folder name (exact match, includes nested subfolders)'),

  // Result options
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(100)
    .describe('Max results (default: 100, max: 1000). Applied post-filter. Values > 1000 clamped.')
});

export type GetProjectsForReviewInput = z.infer<typeof GetProjectsForReviewInputSchema>;

/**
 * Success response schema for get_projects_for_review tool.
 *
 * Returns projects matching the review criteria, sorted by nextReviewDate ascending
 * (most overdue first).
 */
export const GetProjectsForReviewSuccessSchema = z.object({
  success: z.literal(true),
  projects: z.array(ReviewProjectSummarySchema).describe('Projects due/upcoming for review'),
  count: z.number().int().min(0).describe('Total number of matching projects'),
  dueCount: z.number().int().min(0).describe('Count of projects overdue or due today'),
  upcomingCount: z
    .number()
    .int()
    .min(0)
    .describe('Count of projects due within 7 days (only populated when includeUpcoming=true)')
});

export type GetProjectsForReviewSuccess = z.infer<typeof GetProjectsForReviewSuccessSchema>;

/**
 * Error response schema for get_projects_for_review tool.
 */
export const GetProjectsForReviewErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message'),
  code: z.string().optional().describe('Error code: NOT_FOUND (folder lookup failed)')
});

export type GetProjectsForReviewError = z.infer<typeof GetProjectsForReviewErrorSchema>;

/**
 * Complete response schema for get_projects_for_review tool (discriminated union).
 */
export const GetProjectsForReviewResponseSchema = z.discriminatedUnion('success', [
  GetProjectsForReviewSuccessSchema,
  GetProjectsForReviewErrorSchema
]);

export type GetProjectsForReviewResponse = z.infer<typeof GetProjectsForReviewResponseSchema>;
