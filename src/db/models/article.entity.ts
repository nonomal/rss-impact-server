import { Entity, Column, Index, ManyToOne } from 'typeorm'
import { Item, Enclosure } from 'rss-parser'
import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsDateString, IsNotEmpty, IsNumber, IsObject, IsUrl, Length, Max, Min, ValidateIf, ValidateNested } from 'class-validator'
import dayjs from 'dayjs'
import { Type } from 'class-transformer'
import { AclBase } from './acl-base.entity'
import { Feed } from './feed.entity'
import { IsId } from '@/decorators/is-id.decorator'
import { JsonStringLengthRange } from '@/decorators/json-string-length-range.decorator'

class EnclosureImpl implements Enclosure {
    @IsUrl()
    @Length(0, 2048)
    url: string

    @IsNumber()
    @Min(0)
    @Max(Number.MAX_SAFE_INTEGER)
    @ValidateIf((o) => typeof o.length !== 'undefined')
    length?: number

    @Length(0, 128)
    @ValidateIf((o) => typeof o.type !== 'undefined')
    type?: string
}

/**
 * 文章
 *
 * @author CaoMeiYouRen
 * @date 2024-03-21
 * @export
 * @class Article
 */
@Entity()
export class Article extends AclBase implements Item {

    /** guid/id */
    @ApiProperty({ title: '全局索引', example: '499d4cee' })
    @IsNotEmpty()
    @Index({
        // unique: true,
    })
    @Column({
        length: 2048,
        // unique: true,
    })
    guid: string

    @ApiProperty({ title: '链接', example: 'https://blog.cmyr.ltd/archives/499d4cee.html' })
    @IsUrl()
    @Length(0, 2048)
    @ValidateIf((o) => typeof o.link !== 'undefined')
    @Column({
        length: 2048,
        nullable: true,
    })
    link?: string

    @ApiProperty({ title: '标题', example: '这是一个标题' })
    @Length(0, 256)
    @ValidateIf((o) => typeof o.title !== 'undefined')
    @Column({
        length: 256,
        nullable: true,
    })
    title?: string

    /** 正文 content/content:encoded */
    @ApiProperty({ title: '正文', example: '这是一段正文' })
    @Length(0, 2 ** 20)
    @ValidateIf((o) => typeof o.content !== 'undefined')
    @Column({
        length: 2 ** 20, // 1048576
        nullable: true,
    })
    content?: string

    /**
     *发布日期 pubDate/isoDate
     */
    @ApiProperty({ title: '发布日期', example: dayjs().toDate() })
    @IsDateString()
    @ValidateIf((o) => typeof o.publishDate !== 'undefined')
    @Column({
        nullable: true,
    })
    publishDate?: Date

    /** 作者 creator/author/dc:creator */
    @ApiProperty({ title: '作者', example: 'CaoMeiYouRen' })
    @Length(0, 128)
    @ValidateIf((o) => typeof o.author !== 'undefined')
    @Column({
        length: 128,
        nullable: true,
    })
    author?: string

    // contentSnippet/content:encodedSnippet
    @ApiProperty({ title: '摘要', example: '这是一段内容摘要' })
    @Length(0, 65536)
    @ValidateIf((o) => typeof o.summary !== 'undefined')
    @Column({
        length: 65536,
        nullable: true,
    })
    contentSnippet?: string

    /**
     * 总结 summary
     */
    @ApiProperty({ title: '总结', example: '这是一段总结' })
    @Length(0, 1024)
    @ValidateIf((o) => typeof o.summary !== 'undefined')
    @Column({
        length: 1024,
        nullable: true,
    })
    summary?: string

    /**
     * 分类列表，和 RSS 的分组不是同一个
     */
    @ApiProperty({ title: '分类列表', example: ['tag1', 'tag2'] })
    @JsonStringLengthRange(0, 512, { each: true })
    @IsArray()
    @ValidateIf((o) => typeof o.categories !== 'undefined')
    @Column({
        type: 'simple-json', // 用 json 来避免逗号问题
        length: 512,
        nullable: true,
    })
    categories?: string[]

    /** 附件 */
    @ApiProperty({ title: '附件', example: { url: '', length: '', type: '' }, type: () => EnclosureImpl })
    @Type(() => EnclosureImpl)
    @JsonStringLengthRange(0, 1024, { each: true })
    @ValidateNested()
    @IsObject()
    @ValidateIf((o) => typeof o.enclosure !== 'undefined')
    @Column({
        type: 'simple-json',
        length: 1024,
        nullable: true,
    })
    enclosure?: EnclosureImpl

    @ApiProperty({ title: '订阅源ID', example: 1 })
    @IsId()
    @Column({ nullable: true })
    feedId: number

    @ApiProperty({ title: '订阅源', example: {}, type: () => Feed })
    @ManyToOne(() => Feed, (feed) => feed.articles)
    feed: Feed
}
