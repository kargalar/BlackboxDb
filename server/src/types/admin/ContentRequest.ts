import { ObjectType, Field, Int } from 'type-graphql';
import { GraphQLJSONObject } from 'graphql-scalars';

@ObjectType()
export class ContentRequest {
    @Field(() => Int)
    id: number;

    @Field(() => String)
    requesterUserId: string;

    @Field(() => String)
    title: string;

    @Field(() => Int)
    contentTypeId: number;

    @Field(() => String, { nullable: true })
    releaseDate?: string;

    @Field(() => String, { nullable: true })
    description?: string;

    @Field(() => String, { nullable: true })
    reason?: string;

    @Field(() => GraphQLJSONObject, { nullable: true })
    payload?: Record<string, unknown>;

    @Field(() => String)
    status: string; // 'pending', 'approved', 'rejected'

    @Field(() => String, { nullable: true })
    reviewedBy?: string;

    @Field(() => Date, { nullable: true })
    reviewedAt?: Date;

    @Field(() => Date)
    createdAt: Date;
}


