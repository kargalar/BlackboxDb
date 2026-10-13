import { ObjectType, Field, Int } from 'type-graphql';

@ObjectType()
export class AdminScreenshot {
    @Field(() => Int)
    id: number;

    @Field(() => String)
    imageUrl: string;

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

    @Field(() => Boolean, { nullable: true })
    isSpoiler?: boolean;

    @Field(() => Boolean, { nullable: true })
    isSensitive?: boolean;

    @Field(() => Int, { defaultValue: 0 })
    upvoteCount?: number;

    @Field(() => Int, { defaultValue: 0 })
    downvoteCount?: number;

    @Field(() => Int, { nullable: true })
    userVote?: number | null;
}

