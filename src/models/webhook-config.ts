import { Method, AxiosRequestHeaders, ResponseType } from 'axios'
import { ApiProperty } from '@nestjs/swagger'
import { IsIn, IsObject, IsUrl, Length, ValidateIf } from 'class-validator'
import { AjaxConfig } from '@/utils/ajax'
import { IsSafeNaturalNumber } from '@/decorators/is-safe-integer.decorator'
import { SetAclCrudField } from '@/decorators/set-acl-crud-field.decorator'
import { JsonStringLength } from '@/decorators/json-string-length.decorator'

const methodOptions: { label: string, value: Method }[] = [
    { label: 'GET', value: 'GET' },
    { label: 'DELETE', value: 'DELETE' },
    { label: 'HEAD', value: 'HEAD' },
    { label: 'OPTIONS', value: 'OPTIONS' },
    { label: 'POST', value: 'POST' },
    { label: 'PUT', value: 'PUT' },
    { label: 'PATCH', value: 'PATCH' },
    { label: 'PURGE', value: 'PURGE' },
    { label: 'LINK', value: 'LINK' },
    { label: 'UNLINK', value: 'UNLINK' },
]

const responseTypeOptions: { label: string, value: ResponseType }[] = [
    { label: 'Text', value: 'text' },
    { label: 'ArrayBuffer', value: 'arraybuffer' },
    { label: 'Blob', value: 'blob' },
    { label: 'Document', value: 'document' },
    { label: 'JSON', value: 'json' },
    { label: 'Stream', value: 'stream' },
]

export class WebhookConfig implements AjaxConfig {

    @ApiProperty({ title: '请求链接', example: 'http://127.0.0.1:3000' })
    @IsUrl()
    @Length(0, 1024)
    url: string

    @ApiProperty({ title: '查询字符串', example: { key: '114514' } })
    @IsObject()
    @JsonStringLength(0, 1024)
    @ValidateIf((o) => typeof o.query !== 'undefined')
    query?: Record<string, unknown>

    @ApiProperty({ title: '请求体', example: {} })
    @IsObject()
    @JsonStringLength(0, 2048)
    @ValidateIf((o) => typeof o.data !== 'undefined')
    data?: Record<string | number | symbol, unknown> | Record<string | number | symbol, unknown>[]

    @SetAclCrudField({
        dicData: methodOptions,
        value: 'GET',
    })
    @ApiProperty({ title: '请求方法', example: {} })
    @IsIn(methodOptions.map((e) => e.value))
    @ValidateIf((o) => typeof o.method !== 'undefined')
    method?: Method

    @ApiProperty({ title: '请求头', example: {} })
    @JsonStringLength(0, 2048)
    @IsObject()
    @ValidateIf((o) => typeof o.headers !== 'undefined')
    headers?: AxiosRequestHeaders

    @SetAclCrudField({
        labelWidth: 105,
    })
    @ApiProperty({ title: '超时时间(秒)', description: '默认 60 秒。', example: 60 })
    @IsSafeNaturalNumber()
    @ValidateIf((o) => typeof o.timeout !== 'undefined')
    timeout?: number

    // baseURL?: string

    // @SetAclCrudField({
    //     dicData: responseTypeOptions,
    //     value: 'json',
    // })
    // @IsIn(responseTypeOptions.map((e) => e.value))
    // @ValidateIf((o) => typeof o.responseType !== 'undefined')
    // responseType?: ResponseType
}