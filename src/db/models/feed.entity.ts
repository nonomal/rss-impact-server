import { Column, Entity, Index, JoinTable, ManyToMany, ManyToOne, OneToMany } from 'typeorm'
import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'
import { IsArray, IsBoolean, IsIn, IsNotEmpty, IsUrl, Length, ValidateIf } from 'class-validator'
import { Type } from 'class-transformer'
import { AclBase } from './acl-base.entity'
import { Category } from './category.entity'
import { Article } from './article.entity'
import { Hook } from './hook.entity'
import { ProxyConfig } from './proxy-config.entity'
import { IsId } from '@/decorators/is-id.decorator'
import { SetAclCrudField } from '@/decorators/set-acl-crud-field.decorator'
import { RssLabelList } from '@/constant/rss-cron'
import { FindPlaceholderDto } from '@/models/find-placeholder.dto'
import { __DEV__ } from '@/app.config'

/**
 * RSS 订阅表
 *
 * @author CaoMeiYouRen
 * @date 2024-03-19
 * @export
 * @class Feed
 */
@Entity()
export class Feed extends AclBase {

    @SetAclCrudField({
        search: true,
    })
    @ApiProperty({ title: 'URL', example: 'https://blog.cmyr.ltd/atom.xml' })
    @IsNotEmpty({ message: '$property 不能为空' })
    @IsUrl({
        require_tld: !__DEV__, // 是否要顶级域名
    }, { message: '$property 必须为标准URL格式' })
    @Length(0, 2048, { message: '$property 的长度必须在 $constraint1 到 $constraint2 个字符！' })
    @Index({
        // unique: true,
    })
    @Column({
        length: 2048,
        // unique: true,
    })
    url: string

    @SetAclCrudField({
        search: true,
    })
    @ApiProperty({ title: '标题', example: '这是一个标题' })
    @IsNotEmpty({ message: '标题不能为空' })
    @Length(0, 256, { message: '标题最大不能超过 $constraint2 个字符' })
    @Column({
        length: 256,
    })
    title: string

    @SetAclCrudField({
        search: true,
    })
    @ApiProperty({ title: '简介', example: '这是一段简介' })
    @Length(0, 4096, { message: '简介最大不能超过 $constraint2 个字符' })
    @ValidateIf((o) => typeof o.description !== 'undefined')
    @Column({
        length: 4096,
        nullable: true,
    })
    description?: string

    @SetAclCrudField({
        type: 'input',
        value: '',
    })
    @ApiProperty({ title: '封面 URL', example: 'https://blog.cmyr.ltd/images/logo.svg' })
    @IsUrl({
        require_tld: !__DEV__, // 是否要顶级域名
    }, { message: '封面Url必须为标准URL格式' })
    @Length(0, 2048, { message: '封面Url最大不能超过 $constraint2 个字符！' })
    @ValidateIf((o) => Boolean(o.imageUrl))
    @Column({
        length: 2048,
        nullable: true,
    })
    imageUrl?: string

    @SetAclCrudField({
        type: 'select',
        dicData: RssLabelList,
        search: true,
    })
    @ApiProperty({ title: 'Cron', example: 'EVERY_10_MINUTES' })
    // @Length(0, 256, { message: 'Cron最大不能超过256个字符' })
    @IsNotEmpty()
    @IsIn(RssLabelList.map((e) => e.value))
    @Column({
        length: 256,
        default: 'EVERY_10_MINUTES',
    })
    cron: string

    // @ApiProperty({ title: '是否活跃', example: true })
    // @IsBoolean({ message: '是否活跃必须为 Boolean' })
    // @Column({
    //     default: true,
    // })
    // isActive: boolean

    @SetAclCrudField({
        search: true,
    })
    @ApiProperty({ title: '是否启用', example: true })
    @IsBoolean({ message: '是否启用必须为 Boolean' })
    @Column({
        default: true,
    })
    isEnabled: boolean

    @SetAclCrudField({
        search: true,
        dicUrl: '/category/dicData',
        props: {
            label: 'name',
            value: 'id',
        },
    })
    @ApiProperty({ title: '分组', example: 1 })
    @IsId()
    @IsNotEmpty()
    @Column({ nullable: true })
    categoryId: number

    @SetAclCrudField({
        hide: true,
    })
    @ApiProperty({ title: '分组', type: () => Category })
    @ManyToOne(() => Category, (category) => category.feeds)
    category: Category

    // @SetAclCrudField({
    //     labelWidth: 120,
    // })
    // @ApiProperty({ title: '是否启用代理', example: false })
    // @IsBoolean({ message: '是否启用代理必须为 Boolean' })
    // @Column({
    //     default: false,
    // })
    // isEnableProxy: boolean

    @SetAclCrudField({
        search: true,
        dicUrl: '/proxy-config/dicData',
        props: {
            label: 'name',
            value: 'id',
        },
        value: null,
    })
    @ApiProperty({ title: '代理配置', description: '选择不代理后保存即可禁用代理', example: 1 })
    @IsId()
    @ValidateIf((o) => Boolean(o.proxyConfigId))
    @Column({ nullable: true })
    proxyConfigId?: number

    @SetAclCrudField({
        hide: true,
    })
    @ApiProperty({ title: '代理配置', type: () => ProxyConfig })
    @ManyToOne(() => ProxyConfig)
    proxyConfig?: ProxyConfig

    @SetAclCrudField({
        hide: true,
    })
    @ApiProperty({ title: '文章列表', example: [], type: () => [Article] })
    // @Type(() => Article)
    // @IsArray()
    @OneToMany(() => Article, (article) => article.feed)
    articles: Article[]

    @SetAclCrudField({
        type: 'select',
        multiple: true,
        dicUrl: '/hook/dicData',
        props: {
            label: 'name',
            value: 'id',
        },
    })
    @ApiProperty({ title: 'Hook列表', example: [], type: () => [Hook] })
    @Type(() => Hook)
    @IsArray()
    @ManyToMany(() => Hook, (hook) => hook.feeds)
    @JoinTable()
    hooks: Hook[]

}

export class CreateFeed extends OmitType(Feed, ['id', 'createdAt', 'updatedAt'] as const) { }

export class UpdateFeed extends PartialType(OmitType(Feed, ['createdAt', 'updatedAt'] as const)) { }

export class FindFeed extends FindPlaceholderDto<Feed> {
    @ApiProperty({ type: () => [Feed] })
    declare data: Feed[]
}

export class QuickCreateFeed extends PickType(Feed, ['url', 'cron', 'isEnabled', 'categoryId', 'hooks'] as const) { }
