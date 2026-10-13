import { ObjectType, Field, Int } from 'type-graphql';

@ObjectType('ThemeType')
export class Theme {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  name: string;

  @Field(() => String)
  createdAt: string;

  @Field(() => Int, { nullable: true })
  contentCount?: number;
}

