import { ObjectType, Field, ID, Int, InputType } from "type-graphql";

// ======================================
// Content Screenshot Type
// ======================================
@ObjectType()
export class ContentScreenshot {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  contentId: string;

  @Field(() => String)
  imageUrl: string; // CDN URL

  @Field(() => Int)
  difficulty: number;

  @Field(() => Int)
  order: number;

  @Field(() => Int, { nullable: true })
  seasonNumber?: number;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Boolean)
  isEnabledForQuiz: boolean;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  isSpoiler?: boolean;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  isSensitive?: boolean;

  @Field(() => Int, { defaultValue: 0 })
  upvoteCount: number;

  @Field(() => Int, { defaultValue: 0 })
  downvoteCount: number;

  @Field(() => Int, { nullable: true })
  userVote?: number | null;
}

// ======================================
// Quiz Settings Type
// ======================================
@ObjectType()
export class QuizSettings {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  contentTypeId: number;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Int)
  timePerQuestion: number;

  @Field(() => Int)
  questionsCount: number;

  @Field(() => Int)
  pointsLevel1: number;

  @Field(() => Int)
  pointsLevel2: number;

  @Field(() => Int)
  pointsLevel3: number;

  @Field(() => Int)
  pointsLevel4: number;

  @Field(() => Int)
  pointsLevel5: number;
}

// ======================================
// Quiz Result Type
// ======================================
@ObjectType()
export class QuizResult {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  userId: string;

  @Field(() => Int)
  contentTypeId: number;

  @Field(() => Int)
  score: number;

  @Field(() => Int)
  correctAnswers: number;

  @Field(() => Int)
  totalQuestions: number;

  @Field(() => Int)
  timeTaken: number;

  @Field(() => Date)
  createdAt: Date;
}

// ======================================
// Leaderboard Entry Type
// ======================================
@ObjectType()
export class LeaderboardEntry {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  userId: string;

  @Field(() => String)
  username: string;

  @Field(() => String, { nullable: true })
  picturePath?: string;

  @Field(() => Int)
  contentTypeId: number;

  @Field(() => Int)
  totalScore: number;

  @Field(() => Int)
  totalQuizzes: number;

  @Field(() => Int)
  correctAnswers: number;

  @Field(() => Int)
  totalQuestions: number;

  @Field(() => Int)
  bestScore: number;

  @Field(() => Int)
  rank: number;
}

// ======================================
// Quiz Question Type (for frontend)
// ======================================
@ObjectType()
export class QuizQuestion {
  @Field(() => Int)
  screenshotId: number;

  @Field(() => String)
  imageUrl: string;

  @Field(() => Int)
  difficulty: number;

  @Field(() => [QuizOption])
  options: QuizOption[];

  @Field(() => String)
  correctContentId: string;
}

@ObjectType()
export class QuizOption {
  @Field(() => String)
  contentId: string;

  @Field(() => String)
  title: string;

  @Field(() => String, { nullable: true })
  posterUrl?: string;
}

// ======================================
// Quiz Session Type (Legacy - kept for compatibility)
// ======================================
@ObjectType()
export class QuizSession {
  @Field(() => [QuizQuestion])
  questions: QuizQuestion[];

  @Field(() => Int)
  timePerQuestion: number;

  @Field(() => Int)
  contentTypeId: number;

  @Field(() => String)
  contentTypeName: string;
}

// ======================================
// New Quiz Types - Content-based (V2)
// ======================================
@ObjectType()
export class QuizScreenshotInfo {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  imageUrl: string;

  @Field(() => Int)
  difficulty: number;
}

@ObjectType()
export class QuizPerson {
  @Field(() => String)
  personId: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  role?: string;

  @Field(() => String, { nullable: true })
  job?: string;

  @Field(() => String, { nullable: true })
  character?: string;

  @Field(() => String, { nullable: true })
  profileUrl?: string;
}

@ObjectType()
export class QuizContentItem {
  @Field(() => String)
  contentId: string;

  @Field(() => String)
  title: string;

  @Field(() => String, { nullable: true })
  posterUrl?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  releaseDate?: string;

  @Field(() => Int, { nullable: true })
  runtime?: number;

  @Field(() => [String], { nullable: true })
  authors?: string[];

  @Field(() => [QuizPerson], { nullable: true })
  persons?: QuizPerson[];

  @Field(() => [QuizScreenshotInfo])
  screenshots: QuizScreenshotInfo[];
}

@ObjectType()
export class QuizSessionV2 {
  @Field(() => [QuizContentItem])
  contentItems: QuizContentItem[];

  @Field(() => Int)
  contentTypeId: number;

  @Field(() => String)
  contentTypeName: string;

  @Field(() => Int)
  pointsLevel1: number;

  @Field(() => Int)
  pointsLevel2: number;

  @Field(() => Int)
  pointsLevel3: number;

  @Field(() => Int)
  pointsLevel4: number;

  @Field(() => Int)
  pointsLevel5: number;
}

// ======================================
// Input Types
// ======================================
@InputType()
export class AddScreenshotInput {
  @Field(() => String)
  contentId: string;

  @Field(() => String)
  imageUrl: string;

  @Field(() => Int, { nullable: true })
  difficulty?: number;

  @Field(() => Int, { nullable: true })
  order?: number;

  @Field(() => Int, { nullable: true })
  seasonNumber?: number;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Boolean, { nullable: true })
  isEnabledForQuiz?: boolean;

  @Field(() => Boolean, { nullable: true })
  isSpoiler?: boolean;

  @Field(() => Boolean, { nullable: true })
  isSensitive?: boolean;
}

@InputType()
export class UpdateScreenshotInput {
  @Field(() => Int)
  id: number;

  @Field(() => Int, { nullable: true })
  difficulty?: number;

  @Field(() => Int, { nullable: true })
  order?: number;

  @Field(() => Int, { nullable: true })
  seasonNumber?: number;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Boolean, { nullable: true })
  isEnabledForQuiz?: boolean;

  @Field(() => Boolean, { nullable: true })
  isSpoiler?: boolean;

  @Field(() => Boolean, { nullable: true })
  isSensitive?: boolean;
}

@InputType()
export class UpdateQuizSettingsInput {
  @Field(() => Int)
  contentTypeId: number;

  @Field(() => Boolean, { nullable: true })
  isActive?: boolean;

  @Field(() => Int, { nullable: true })
  timePerQuestion?: number;

  @Field(() => Int, { nullable: true })
  questionsCount?: number;

  @Field(() => Int, { nullable: true })
  pointsLevel1?: number;

  @Field(() => Int, { nullable: true })
  pointsLevel2?: number;

  @Field(() => Int, { nullable: true })
  pointsLevel3?: number;

  @Field(() => Int, { nullable: true })
  pointsLevel4?: number;

  @Field(() => Int, { nullable: true })
  pointsLevel5?: number;
}

@InputType()
export class SubmitQuizAnswerInput {
  @Field(() => Int)
  screenshotId: number;

  @Field(() => String)
  selectedContentId: string;

  @Field(() => Int)
  timeTaken: number;
}

@InputType()
export class SubmitQuizInput {
  @Field(() => Int)
  contentTypeId: number;

  @Field(() => [SubmitQuizAnswerInput])
  answers: SubmitQuizAnswerInput[];

  @Field(() => Int)
  totalTimeTaken: number;
}

// ======================================
// Quiz Submit Result Type
// ======================================
@ObjectType()
export class QuizSubmitResult {
  @Field(() => Int)
  score: number;

  @Field(() => Int)
  correctAnswers: number;

  @Field(() => Int)
  totalQuestions: number;

  @Field(() => Int)
  timeTaken: number;

  @Field(() => [QuizAnswerResult])
  answerResults: QuizAnswerResult[];

  @Field(() => Int, { nullable: true })
  newRank?: number;

  @Field(() => Boolean)
  isNewBestScore: boolean;
}

@ObjectType()
export class QuizAnswerResult {
  @Field(() => Int)
  screenshotId: number;

  @Field(() => Boolean)
  isCorrect: boolean;

  @Field(() => String)
  correctContentId: string;

  @Field(() => String)
  correctTitle: string;

  @Field(() => Int)
  pointsEarned: number;
}


