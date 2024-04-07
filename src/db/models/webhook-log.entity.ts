import { Column, Entity, ManyToOne } from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'
import { IsInt, IsNotEmpty, IsObject, Length, Max, Min, ValidateIf } from 'class-validator'
import { AxiosResponseHeaders, RawAxiosResponseHeaders } from 'axios'
import { AclBase } from './acl-base.entity'
import { Hook } from './hook.entity'
import { Feed } from './feed.entity'
import { IsId } from '@/decorators/is-id.decorator'
import { JsonStringLength } from '@/decorators/json-string-length.decorator'
import { FindPlaceholderDto } from '@/models/find-placeholder.dto'
import { SetAclCrudField } from '@/decorators/set-acl-crud-field.decorator'
import { HookList, StatusList } from '@/constant/hook'

/**
 * webhook 执行结果
 *
 * @author CaoMeiYouRen
 * @date 2024-03-25
 * @export
 * @class WebhookLog
 */
@Entity()
export class WebhookLog extends AclBase {

    @ApiProperty({ title: '响应体', example: { message: 'OK' } })
    @JsonStringLength(0, 2048)
    @ValidateIf((o) => typeof o.data !== 'undefined')
    @Column({
        type: 'simple-json',
        length: 2048,
        nullable: true,
    })
    data?: any

    @ApiProperty({ title: '状态码', example: 200 })
    @IsNotEmpty()
    @IsInt()
    @Min(100)
    @Max(600)
    @Column({})
    statusCode: number

    @SetAclCrudField({
        dicData: HookList,
    })
    @ApiProperty({ title: '类型', description: 'webhook 或 notification', example: 'webhook' })
    @IsNotEmpty()
    @Length(0, 16)
    @Column({
        length: 16,
    })
    type: 'webhook' | 'notification'

    @SetAclCrudField({
        dicData: StatusList,
    })
    @ApiProperty({ title: '状态', example: 'success' })
    @IsNotEmpty()
    @Length(0, 16)
    @Column({
        length: 16,
    })
    status: 'success' | 'fail' | 'unknown'

    @ApiProperty({ title: '状态码名称', example: 'OK' })
    @IsNotEmpty()
    @Length(0, 128)
    @Column({
        length: 128,
    })
    statusText: string

    @ApiProperty({ title: '响应头', example: {} })
    @JsonStringLength(0, 2048)
    @IsObject()
    @ValidateIf((o) => typeof o.headers !== 'undefined')
    @Column({
        type: 'simple-json',
        length: 2048,
        nullable: true,
    })
    headers?: RawAxiosResponseHeaders | AxiosResponseHeaders

    @SetAclCrudField({
        dicUrl: '/feed/dicData',
        props: {
            label: 'title',
            value: 'id',
        },
    })
    @ApiProperty({ title: '订阅源', example: 1 })
    @IsId()
    @Column({ nullable: true })
    feedId: number

    @SetAclCrudField({
        hide: true,
        addDisplay: false,
        editDisabled: true,
        editDisplay: false,
        readonly: true,
    })
    @ApiProperty({ title: '订阅源', type: () => Feed })
    @ManyToOne(() => Feed)
    feed: Feed

    @SetAclCrudField({
        dicUrl: '/hook/dicData',
        props: {
            label: 'name',
            value: 'id',
        },
    })
    @ApiProperty({ title: 'Hook', example: 1 })
    @IsId()
    @Column({ nullable: true })
    hookId: number

    @SetAclCrudField({
        hide: true,
        addDisplay: false,
        editDisabled: true,
        editDisplay: false,
        readonly: true,
    })
    @ApiProperty({ title: 'Hook', type: () => Hook })
    @ManyToOne(() => Hook)
    hook: Hook
}

export class FindWebhookLog extends FindPlaceholderDto<WebhookLog> {
    @ApiProperty({ type: () => [WebhookLog] })
    declare data: WebhookLog[]
}
