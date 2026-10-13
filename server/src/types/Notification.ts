import { Field, ID, ObjectType, Int } from 'type-graphql';

@ObjectType()
export class NotificationActor {
  @Field(() => String)
  username!: string;

  @Field(() => String, { nullable: true })
  picturePath?: string | null;
}

@ObjectType()
export class NotificationContent {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  title!: string;

  @Field(() => Int)
  contentTypeId!: number;

  @Field(() => String, { nullable: true })
  posterUrl?: string | null;
}

@ObjectType()
export class Notification {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  recipientUserId!: string;

  @Field(() => String, { nullable: true })
  actorUserId?: string | null;

  @Field(() => Int)
  typeId!: number;

  @Field(() => String, { nullable: true })
  message?: string | null;

  @Field(() => String, { nullable: true })
  contentId?: string | null;

  @Field(() => Int, { nullable: true })
  replyId?: number | null;

  @Field(() => Int, { nullable: true })
  discussionCommentId?: number | null;

  @Field(() => String, { nullable: true })
  commentText?: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date, { nullable: true })
  readAt?: Date | null;

  // Relations
  @Field(() => NotificationActor, { nullable: true })
  actor?: NotificationActor;

  @Field(() => NotificationContent, { nullable: true })
  content?: NotificationContent;
}


