import crypto from 'crypto'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import _ from 'lodash'
import fs, { ReadStream } from 'fs-extra'
import FileType from 'file-type'
import Turndown from 'turndown'
import { Equal, Like, ILike, Between, In } from 'typeorm'
import { ValidationError } from 'class-validator'
import { CQImage } from 'go-cqwebsocket/out/tags'
import { ajax } from './ajax'
import { TZ } from '@/app.config'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault(TZ)

/**
 * 延时一段时间
 *
 * @author CaoMeiYouRen
 * @date 2019-08-26
 * @export
 * @param {number} time
 * @returns
 */
export async function sleep(time: number) {
    return new Promise((resolve) => setTimeout(resolve, time))
}

/**
 * 随机延时一段时间
 *
 * @author CaoMeiYouRen
 * @date 2022-06-04
 * @export
 * @param [min=1000] 延时最小值
 * @param [max=10000] 延时最大值
 */
export async function randomSleep(min = 1000, max = 10000) {
    const time = _.random(min, max, false)
    await sleep(time)
}

/**
 * 格式化时间
 *
 * @author CaoMeiYouRen
 * @export
 * @param {(number | string | Date)} [date=Date.now()]
 * @param {string} [pattern='YYYY-MM-DD HH:mm:ss.SSS']
 * @returns
 */
export function timeFormat(date: number | string | Date = Date.now(), pattern: string = 'YYYY-MM-DD HH:mm:ss.SSS') {
    if (typeof date === 'number' && date.toString().length === 10) {
        if (date < 1e10) {
            date *= 1000
        }
    }
    return dayjs(date).tz().format(pattern)
}

export function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : r & 0x3 | 0x8
        return v.toString(16)
    })
}

export function getAccessToken() {
    return `rss-impact:${uuid()}`
}

export function isImageUrl(img: string) {
    return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(img)
}

/**
 * 递归删除对象中指定的属性
 * @author CaoMeiYouRen
 * @date 2022-09-27
 * @export
 * @param obj 原始对象
 * @param props 需要删除的属性名称列表
 */
export function deepOmit(obj: any, props: string[]) {
    if (typeof obj !== 'object' || obj === null) { // 类型不为object的或类型为null的都直接返回
        return obj
    }
    props.forEach((key) => { // 排除当前层级的 props
        delete obj[key]
    })
    const keys = Object.keys(obj) // 数组或对象
    for (let i = 0; i < keys.length; i++) { // 遍历所有key
        const key = keys[i]
        obj[key] = deepOmit(obj[key], props)// 递归
    }
    return obj
}

/**
 * 深度处理冗余的空白字符串
 *
 * @author CaoMeiYouRen
 * @date 2024-03-21
 * @export
 * @param obj
 */
export function deepTrim(obj: any) {
    if (typeof obj !== 'object' || obj === null) { // 类型不为object的或类型为null的都直接返回
        return obj
    }
    const keys = Object.keys(obj) // 数组或对象
    for (let i = 0; i < keys.length; i++) { // 遍历所有key
        const key = keys[i]
        if (typeof obj[key] === 'string') {
            obj[key] = obj[key].trim() // 移除空白字符串
        } else {
            obj[key] = deepTrim(obj[key]) // 递归
        }
    }
    return obj
}

type DownloadFileType = {
    size: number
    type: string
    hash: string
}

export async function download(url: string, filepath: string, timeout = 60 * 1000): Promise<DownloadFileType> {
    // TODO 处理跨域/防盗链问题
    const resp = await ajax({
        url,
        timeout,
        headers: {} as any,
        responseType: 'stream',
    })
    const stream = resp.data as ReadStream
    // const { mime } = await FileType.fromStream(stream)
    const writer = fs.createWriteStream(filepath)
    stream.pipe(writer)
    return new Promise<DownloadFileType>((resolve, reject) => {
        writer.on('finish', async () => {
            const stat = await fs.stat(filepath)
            const mime = (await FileType.fromFile(filepath))?.mime
            const hash = await getMd5ByStream(filepath)
            resolve({
                size: stat.size,
                type: mime,
                hash,
            })
        })
        writer.on('error', reject)
    })
}

/**
 * 提取所有 src 中的 URL
 *
 * @author CaoMeiYouRen
 * @date 2024-03-24
 * @export
 * @param content
 */
export function getAllUrls(content: string): string[] {
    const res = content.matchAll(/src="(.*?)"/g) || []
    return [...res].map((e) => e?.[1])
}

/**
 * 流式求 md5，避免占用内存过高
 *
 * @author CaoMeiYouRen
 * @date 2024-03-24
 * @export
 * @param filePath
 */
export function getMd5ByStream(filePath: string) {
    return new Promise<string>((resolve, reject) => {
        const hash = crypto.createHash('md5')

        const stream = fs.createReadStream(filePath)

        stream.on('error', (err) => reject(err))

        stream.on('data', (chunk) => hash.update(chunk))

        stream.on('end', () => {
            resolve(hash.digest('hex'))
        })
    })
}

export function htmlToMarkdown(html: string): string {
    const turndownService = new Turndown({
        headingStyle: 'atx',
        bulletListMarker: '-',
    })
    const markdown = turndownService.turndown(html)
    return markdown
}

/**
 * 获取磁力链接
 *
 * @author CaoMeiYouRen
 * @date 2024-04-03
 * @export
 * @param hash
 * @param [tracker]
 */
export function getMagnetUri(hash: string, tracker?: string) {
    if (tracker) {
        const search = new URLSearchParams({})
        search.append('tr', tracker)
        return `magnet:?urn:btih:${hash}&${search.toString()}`
    }
    return `magnet:?urn:btih:${hash}`
}

// 支持 传入的操作符
const QUERY_MAP = {
    Equal, Like, ILike, Between, In,
}

/**
 * 转换 query 为真实的操作符
 *
 * @author CaoMeiYouRen
 * @date 2024-04-08
 * @export
 * @param [where]
 */
export function transformQueryOperator(where?: Record<string, any>) {
    return Object.fromEntries(Object.entries(where)
        .map(([key, value]) => {
            if (['string', 'number', 'boolean'].includes(typeof value)) { // 如果是基础类型，则原样返回
                return [key, value]
            }
            if (value?.$op && QUERY_MAP[value.$op]) { // 转换为真实的操作符
                if (value.$op === 'Between') {
                    return [key, QUERY_MAP[value.$op](value.value?.[0], value.value?.[1])]
                }
                return [key, QUERY_MAP[value.$op](value.value)]
            }
            return [key, value]
        }),
    )
}

export function getDateTransformer() {
    const transformer = {
        from(value: string): Date { // 数据库到实体类
            if (!value) {
                return null
            }
            if (/^\d\d\d\d-\d\d-\d\d \d\d:\d\d/.test(value)) { // 非 ISO 格式的改为 ISO
                value = value.replace(' ', 'T')
            }
            if (
                /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d\d\d)?)?$/.test(
                    value,
                )
            ) {
                value += 'Z'
            }
            return new Date(value)
        },
        to(value: Date): string { // 实体类到数据库
            if (!value) {
                return null
            }
            return value.toISOString()
        },
    }
    return {
        type: 'text',
        transformer,
    }
}

export function flattenValidationErrors(
    validationErrors: ValidationError[],
): string[] {
    return _.flattenDeep(
        _.flattenDeep(validationErrors
            .map((error) => mapChildrenToValidationErrors(error)),
        )
            .filter((item) => !!item.constraints)
            .map((item) => Object.values(item.constraints)),
    )

}

function mapChildrenToValidationErrors(
    error: ValidationError,
    parentPath?: string,
): ValidationError[] {
    if (!(error.children && error.children.length)) {
        return [error]
    }
    const validationErrors = []
    parentPath = parentPath
        ? `${parentPath}.${error.property}`
        : error.property
    for (const item of error.children) {
        if (item.children && item.children.length) {
            validationErrors.push(
                ...mapChildrenToValidationErrors(item, parentPath),
            )
        }
        validationErrors.push(
            prependConstraintsWithParentProp(parentPath, item),
        )
    }
    return validationErrors
}

function prependConstraintsWithParentProp(
    parentPath: string,
    error: ValidationError,
): ValidationError {
    const constraints = {}
    for (const key in error.constraints) {
        constraints[key] = `${parentPath}.${error.constraints[key]}`
    }
    return {
        ...error,
        constraints,
    }
}

const imageRegex = /!\[(.*?)\]\((.*?)\)/g

export function mdToCqcode(md: string) {
    const result = md.replace(imageRegex, (match, altText, imageUrl) => new CQImage('image', { file: imageUrl }).toString())
    return result
}

/**
 * 格式化流量数据
 *
 * @author CaoMeiYouRen
 * @date 2024-04-12
 * @export
 * @param data 单位B
 */
export function dataFormat(data: number | bigint): string {
    const arr = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
    let i = 0
    let value: number | bigint

    if (typeof data === 'bigint' || data > Number.MAX_SAFE_INTEGER) {
        value = BigInt(data)
        while (value >= 1024n && i < arr.length - 1) {
            value /= 1024n
            i++
        }
        return `${value} ${arr[i]}`
    }
    value = data
    while (value >= 1024 && i < arr.length - 1) {
        value /= 1024
        i++
    }
    if (i === 0) {
        return `${value} ${arr[i]}`
    }
    return `${value.toFixed(2)} ${arr[i]}`
}
