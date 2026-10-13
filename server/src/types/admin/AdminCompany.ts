import { ObjectType, Field, Int } from 'type-graphql';

@ObjectType()
export class AdminCompanyDetails {
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
}

@ObjectType()
export class AdminCompany {
    @Field(() => Int)
    id: number;

    @Field(() => String)
    contentId: string;

    @Field(() => String)
    companyId: string;

    @Field(() => Int)
    companyRoleId: number;

    @Field(() => AdminCompanyDetails, { nullable: true })
    company?: AdminCompanyDetails;
}


