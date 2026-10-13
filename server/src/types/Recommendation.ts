import { Field, ID, Int, ObjectType } from 'type-graphql';
import { AppUser } from './User';
import { Content } from './Content';

@ObjectType()
export class ContentRecommendation {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  contentId!: string;

  @Field(() => String)
  recipientUserId!: string;

  @Field(() => String)
  recommenderUserId!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date, { nullable: true })
  thankedAt?: Date | null;

  @Field(() => Content)
  content!: Content;

  @Field(() => AppUser)
  recommender!: AppUser;

  @Field(() => AppUser, { nullable: true })
  recipient?: AppUser | null;
}


