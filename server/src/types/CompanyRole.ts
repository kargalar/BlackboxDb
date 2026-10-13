import { ObjectType, Field, Int } from 'type-graphql';

@ObjectType()
export class CompanyRoleType {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  name: string;

  @Field(() => Int, { nullable: true })
  contentTypeId?: number;

  @Field(() => Int, { nullable: true })
  contentCount?: number;
}


