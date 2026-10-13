import { ObjectType, Field, Int } from 'type-graphql';
import { Content } from './Content';

@ObjectType()
export class ContentCitation {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  citingContentId!: string;

  @Field(() => String)
  citedContentId!: string;

  @Field(() => String, { nullable: true })
  note?: string | null;

  @Field(() => String, { nullable: true })
  imageUrl?: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => Content, { nullable: true })
  citingContent?: Content | null;

  @Field(() => Content, { nullable: true })
  citedContent?: Content | null;
}
