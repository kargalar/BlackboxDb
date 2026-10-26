import { ObjectType, Field, Int } from 'type-graphql';

@ObjectType()
export class CompanyType {
    @Field(() => String)
    id: string;

    @Field(() => String)
    name: string;

    @Field(() => String, { nullable: true })
    description?: string;

    @Field(() => String, { nullable: true })
    headquarters?: string;

    @Field(() => String, { nullable: true })
    logoUrl?: string;

    @Field(() => String, { nullable: true })
    website?: string;

    @Field(() => Int, { nullable: true })
    foundingYear?: number;

    @Field(() => Int)
    contentCount: number;

    @Field(() => [Int], { nullable: true })
    defaultRoleIds?: number[];

    @Field(() => String, { nullable: true })
    createdAt?: string;
}

@ObjectType()
export class CompanyUserStatus {
    @Field(() => Boolean)
    isConsumed: boolean;

    @Field(() => Boolean)
    isFavorite: boolean;

    @Field(() => Boolean)
    isConsumeLater: boolean;

    @Field(() => Boolean)
    isContinuing: boolean;

    @Field(() => Number, { nullable: true })
    rating: number | null;

    @Field(() => String, { nullable: true })
    consumedDate?: string;

    @Field(() => String, { nullable: true })
    consumeLaterDate?: string;
}

@ObjectType()
export class CompanyContentType {
    @Field(() => String)
    contentId: string;

    @Field(() => String)
    contentTitle: string;

    @Field(() => String, { nullable: true })
    contentType?: string;

    @Field(() => String, { nullable: true })
    posterUrl?: string;

    @Field(() => [Int], { nullable: true })
    ratingDistribution?: number[];

    @Field(() => Number, { nullable: true })
    tmdbRating?: number;

    @Field(() => String, { nullable: true })
    releaseDate?: string;

    @Field(() => Int, { nullable: true })
    companyRoleId?: number; // 1=developer, 2=publisher

    @Field(() => Number, { nullable: true })
    popularity?: number;

    @Field(() => CompanyUserStatus, { nullable: true })
    userStatus?: CompanyUserStatus;
}


